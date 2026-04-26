// GitHub Releases polling — auto-update infrastructure.
//
// Sellers attach a `github_repo` ("owner/name") to their listing, optionally
// with a personal-access token for private repos. Every 15 minutes the cron
// hits /repos/:owner/:repo/releases/latest. When `tag_name` changes:
//   • Update listing.current_version + URL + notes + published_at
//   • Insert marketplace_events row (kind=listing_updated) → bot DMs owners
//
// We intentionally use /releases/latest (not /releases?per_page=1) — it
// follows GitHub's "latest" semantics (excludes prereleases/drafts) which
// matches what end-users expect.

import type { Env } from '../types';
import { db, queryAll, exec } from '../db';

const POLL_BATCH = 30;                  // listings per tick
const POLL_INTERVAL_MS = 15 * 60_000;   // re-poll any one listing at most every 15min
const NOTES_MAX_LEN = 800;              // truncate release body before storing

interface ListingRow {
  id: string;
  title: string;
  github_repo: string;
  github_token: string | null;
  current_version: string | null;
  github_last_polled_at: number | null;
}

interface GithubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  published_at?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets?: Array<{ name: string; browser_download_url: string; content_type?: string; size?: number }>;
  zipball_url?: string;
}

// Pick the asset to serve as the "download" link. Heuristic:
//  1. First .zip asset (most common shape: foo-v0.1.0.zip)
//  2. First .dmg/.exe/.tar.gz asset
//  3. Fallback to GitHub's auto-generated zipball (whole repo at the tag)
function pickAsset(rel: GithubRelease): string | null {
  const assets = rel.assets ?? [];
  const zip = assets.find((a) => a.name.toLowerCase().endsWith('.zip'));
  if (zip) return zip.browser_download_url;
  const installer = assets.find((a) =>
    /\.(dmg|exe|tar\.gz|tgz|app)$/i.test(a.name),
  );
  if (installer) return installer.browser_download_url;
  return rel.zipball_url ?? null;
}

export async function pollGithubReleases(env: Env): Promise<void> {
  const client = db(env);
  const cutoff = Date.now() - POLL_INTERVAL_MS;
  // Pick listings we haven't polled in 15min, oldest first. Null means "never
  // polled" so they jump to the front via COALESCE.
  const rows = await queryAll<ListingRow>(
    client,
    `SELECT id, title, github_repo, github_token, current_version, github_last_polled_at
       FROM listings
      WHERE github_repo IS NOT NULL
        AND status != 'removed'
        AND COALESCE(github_last_polled_at, 0) < ?
      ORDER BY COALESCE(github_last_polled_at, 0) ASC
      LIMIT ?`,
    [cutoff, POLL_BATCH],
  );
  if (!rows.length) return;

  await Promise.allSettled(rows.map((row) => pollOne(env, row)));
}

async function pollOne(env: Env, row: ListingRow): Promise<void> {
  const t = Date.now();
  const repo = row.github_repo!;
  // Owner/name validation — defense in depth, the POST endpoint also validates.
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    await markPolled(env, row.id, t, 'invalid github_repo format');
    return;
  }
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'ElyHub-API',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    // Per-listing token wins (needed for private repos). Otherwise fall back to
    // the global GITHUB_TOKEN secret — bumps anonymous-pool rate limit (60 req/h
    // shared with every other Worker on the same egress IP) up to 5000 req/h
    // for any *public* repo. Without a token, even healthy polling can 403.
    const auth = row.github_token || env.GITHUB_TOKEN;
    if (auth) headers['Authorization'] = `Bearer ${auth}`;
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
    if (res.status === 404) {
      // Repo exists but no published releases yet, OR repo is private and
      // the token is missing/invalid. Either way: not actionable, just note it.
      await markPolled(env, row.id, t, 'no releases (404)');
      return;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      await markPolled(env, row.id, t, `http ${res.status}: ${txt.slice(0, 200)}`);
      return;
    }
    const rel = await res.json() as GithubRelease;
    if (rel.draft) {
      await markPolled(env, row.id, t, 'latest is draft');
      return;
    }

    const tag = rel.tag_name;
    if (!tag) {
      await markPolled(env, row.id, t, 'release missing tag_name');
      return;
    }

    // Already at this version — just refresh poll timestamp.
    if (tag === row.current_version) {
      await markPolled(env, row.id, t, null);
      return;
    }

    const url = pickAsset(rel);
    const notes = (rel.body ?? '').slice(0, NOTES_MAX_LEN);
    const publishedAt = rel.published_at ? Date.parse(rel.published_at) : t;

    // Atomic: update listing + emit event so bot DMs owners.
    const eventId = crypto.randomUUID();
    const eventData = JSON.stringify({
      listingId: row.id,
      listingTitle: row.title,
      previousVersion: row.current_version,
      version: tag,
      url,
      notes,
      githubRepo: repo,
    });
    await db(env).batch(
      [
        {
          sql: `UPDATE listings
                   SET current_version = ?,
                       current_version_url = ?,
                       current_version_notes = ?,
                       current_version_published_at = ?,
                       github_last_polled_at = ?,
                       github_last_error = NULL,
                       updated_at = ?
                 WHERE id = ?`,
          args: [tag, url, notes, publishedAt, t, t, row.id],
        },
        {
          sql: `INSERT INTO marketplace_events
                  (id, kind, actor_id, data, created_at)
                VALUES (?, 'listing_updated', NULL, ?, ?)`,
          args: [eventId, eventData, t],
        },
      ],
      'write',
    );
    console.log(`[github-poll] ${repo}: ${row.current_version ?? '(none)'} → ${tag}`);
  } catch (err) {
    await markPolled(env, row.id, t, (err as Error).message?.slice(0, 200) ?? 'unknown');
  }
}

async function markPolled(env: Env, id: string, t: number, error: string | null) {
  await exec(
    db(env),
    `UPDATE listings
        SET github_last_polled_at = ?, github_last_error = ?
      WHERE id = ?`,
    [t, error, id],
  );
}
