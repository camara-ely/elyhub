// Scheduled Worker tick — runs once per minute (see wrangler.toml).
//
// Two jobs:
//   1. Drain Supabase `marketplace_events_queue` → Turso `marketplace_events`.
//      The Discord bot reads from Turso and posts the Discord embed,
//      so once the row is in Turso the event is "delivered" from our POV.
//   2. Retry pending rows in `license_issuance_queue` (outbox pattern).
//      If issueLicense() succeeds now, mark completed and write license_key
//      into user_library.
//
// Both jobs are idempotent:
//   • Events: INSERT OR IGNORE on a PK that Supabase provides.
//   • Licenses: Supabase's kc_issue_license uses purchase_id as idempotency
//     key (UNIQUE partial index on source_ref), so retrying a successful
//     call returns the same license row instead of creating a duplicate.
//
// Both are capped per tick to bound runtime — the next tick picks up
// whatever's left.

import type { Env } from '../types';
import { db, exec, queryAll } from '../db';
import { issueLicense } from './kassa-licensing';
import { pollGithubReleases } from './github-releases';

const EVENTS_BATCH = 50;
const ISSUANCE_BATCH = 20;
const ISSUANCE_MAX_ATTEMPTS = 10;  // after this, row stays but cron skips it

export async function kassaCronTick(env: Env): Promise<void> {
  // Run jobs in parallel — they touch disjoint tables.
  const [eventsResult, issuanceResult, expiryResult, githubResult] = await Promise.allSettled([
    drainEventsQueue(env),
    retryPendingIssuances(env),
    notifyExpiringLicenses(env),
    pollGithubReleases(env),
  ]);
  if (eventsResult.status === 'rejected') {
    console.error('[kassa-cron] events drain failed:', eventsResult.reason);
  }
  if (issuanceResult.status === 'rejected') {
    console.error('[kassa-cron] issuance retry failed:', issuanceResult.reason);
  }
  if (expiryResult.status === 'rejected') {
    console.error('[kassa-cron] expiry notify failed:', expiryResult.reason);
  }
  if (githubResult.status === 'rejected') {
    console.error('[kassa-cron] github poll failed:', githubResult.reason);
  }
}

// ───────── Job 1: Events queue drain ────────────────────────────────────────

interface SupabaseEvent {
  id: string;
  kind: string;
  user_id: string | null;
  license_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

async function drainEventsQueue(env: Env): Promise<void> {
  // Pull pending rows via PostgREST. `drained_at=is.null` + a server-side
  // limit keeps this cheap. We sign with the anon key — the Edge Functions
  // and Supabase policies don't gate this table from reads, but only our
  // Worker has the anon key in practice.
  const base = env.KC_SUPABASE_URL.replace(/\/$/, '');
  const res = await fetch(
    `${base}/rest/v1/marketplace_events_queue` +
      `?drained_at=is.null&order=created_at.asc&limit=${EVENTS_BATCH}` +
      `&select=id,kind,user_id,license_id,data,created_at`,
    {
      headers: {
        apikey: env.KC_SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.KC_SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) {
    console.error('[kassa-cron] fetch events failed', res.status, await res.text());
    return;
  }
  const rows = (await res.json()) as SupabaseEvent[];
  if (rows.length === 0) return;

  // Insert into Turso. INSERT OR IGNORE guards against the (rare) case
  // where we marked drained_at on Supabase but the Turso write failed —
  // next tick will re-fetch and this INSERT becomes a no-op.
  const client = db(env);
  const stmts = rows.map((ev) => ({
    sql: `INSERT OR IGNORE INTO marketplace_events (id, kind, actor_id, data, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      ev.id,
      ev.kind,
      ev.user_id,
      JSON.stringify(ev.data ?? {}),
      Date.parse(ev.created_at) || Date.now(),
    ],
  }));
  await client.batch(stmts, 'write');

  // Mark drained on Supabase. One PATCH with an `in` filter over the ids
  // we just ingested.
  const ids = rows.map((r) => `"${r.id}"`).join(',');
  const mark = await fetch(
    `${base}/rest/v1/marketplace_events_queue?id=in.(${ids})`,
    {
      method: 'PATCH',
      headers: {
        apikey: env.KC_SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.KC_SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ drained_at: new Date().toISOString() }),
    },
  );
  if (!mark.ok) {
    console.error('[kassa-cron] mark drained failed', mark.status, await mark.text());
    // Next tick will re-fetch these ids; Turso INSERT OR IGNORE absorbs
    // the duplicate. Self-healing.
  }
}

// ───────── Job 2: License issuance retry (outbox) ───────────────────────────

interface QueueRow {
  id: string;
  purchase_id: string;
  user_id: string;
  listing_id: string;
  kassa_product_id: string;
  kassa_tier: string | null;
  product_name: string | null;
  amount_aura: number | null;
  attempts: number;
}

async function retryPendingIssuances(env: Env): Promise<void> {
  const client = db(env);
  const pending = await queryAll<QueueRow>(
    client,
    `SELECT id, purchase_id, user_id, listing_id, kassa_product_id,
            kassa_tier, product_name, amount_aura, attempts
     FROM license_issuance_queue
     WHERE completed_at IS NULL AND attempts < ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [ISSUANCE_MAX_ATTEMPTS, ISSUANCE_BATCH],
  );
  if (pending.length === 0) return;

  const t = Date.now();
  // Retry sequentially — parallel would hammer Supabase during recovery
  // after an outage, and this batch is small (≤20).
  for (const row of pending) {
    try {
      const res = await issueLicense(env, {
        user_id: row.user_id,
        product_id: row.kassa_product_id,
        tier: row.kassa_tier,
        purchase_id: row.purchase_id,  // idempotency key on Supabase side
        product_name: row.product_name ?? undefined,
        amount_cents: row.amount_aura ?? undefined,
        currency: 'AURA',
      });
      if (res.ok && res.license_key) {
        await client.batch(
          [
            { sql: 'UPDATE user_library SET license_key = ? WHERE user_id = ? AND listing_id = ?',
              args: [res.license_key, row.user_id, row.listing_id] },
            { sql: `UPDATE license_issuance_queue
                    SET completed_at = ?, attempts = attempts + 1,
                        last_attempt_at = ?, last_error = NULL
                    WHERE id = ?`,
              args: [t, t, row.id] },
          ],
          'write',
        );
      } else {
        await exec(
          client,
          `UPDATE license_issuance_queue
             SET attempts = attempts + 1, last_attempt_at = ?, last_error = ?
             WHERE id = ?`,
          [t, res.error ?? 'unknown', row.id],
        );
      }
    } catch (err) {
      await exec(
        client,
        `UPDATE license_issuance_queue
           SET attempts = attempts + 1, last_attempt_at = ?, last_error = ?
           WHERE id = ?`,
        [t, err instanceof Error ? err.message : String(err), row.id],
      );
    }
  }
}

// ───────── Job 3: License expiry reminders ──────────────────────────────────
//
// Once per day (during UTC hour 12), scan Supabase `licenses` for any row
// expiring in ~7d or ~1d and emit a `license_expiring` marketplace event so
// the bot DMs the user. Dedup via `license_expiry_notifications` — each
// (license_id, window_kind) pair fires at most once ever.
//
// The hour check is the "run once a day" trigger: cron fires every minute
// but this branch only executes during the target hour. Within that hour,
// the dedup table prevents duplicate sends if the cron fires 60 times.

interface SupabaseLicense {
  id: string;
  user_id: string | null;
  product_id: string | null;
  tier: string | null;
  key_preview: string | null;
  expires_at: string | null;
  is_active: boolean;
}

const EXPIRY_HOUR_UTC = 12;                 // run at ~noon UTC = 9am BRT
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOWS: Array<{ kind: 'd7' | 'd1'; days: number }> = [
  { kind: 'd7', days: 7 },
  { kind: 'd1', days: 1 },
];

async function notifyExpiringLicenses(env: Env): Promise<void> {
  // Cheap hour-gate — skip 95% of cron ticks instantly.
  if (new Date().getUTCHours() !== EXPIRY_HOUR_UTC) return;

  const base = env.KC_SUPABASE_URL.replace(/\/$/, '');
  const now = Date.now();
  const client = db(env);

  for (const window of EXPIRY_WINDOWS) {
    // Target range: licenses whose expires_at falls within [days-0.5, days+0.5]
    // from now. The ±12h half-window is wider than needed but cheap, and
    // tolerates small drifts in the daily cadence.
    const lo = new Date(now + (window.days - 0.5) * DAY_MS).toISOString();
    const hi = new Date(now + (window.days + 0.5) * DAY_MS).toISOString();
    const url =
      `${base}/rest/v1/licenses` +
      `?is_active=eq.true&user_id=not.is.null` +
      `&expires_at=gte.${encodeURIComponent(lo)}` +
      `&expires_at=lt.${encodeURIComponent(hi)}` +
      `&select=id,user_id,product_id,tier,key_preview,expires_at,is_active` +
      `&limit=500`;
    const res = await fetch(url, {
      headers: {
        apikey: env.KC_SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.KC_SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.error('[kassa-cron] expiry fetch failed', window.kind, res.status, await res.text());
      continue;
    }
    const rows = (await res.json()) as SupabaseLicense[];
    if (!rows.length) continue;

    // Filter out already-notified by checking the dedup table in bulk.
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const already = await queryAll<{ license_id: string }>(
      client,
      `SELECT license_id FROM license_expiry_notifications
       WHERE window_kind = ? AND license_id IN (${placeholders})`,
      [window.kind, ...ids],
    );
    const skip = new Set(already.map((a) => a.license_id));

    for (const lic of rows) {
      if (skip.has(lic.id) || !lic.user_id) continue;
      try {
        const eventId = crypto.randomUUID();
        const data = JSON.stringify({
          licenseId: lic.id,
          productId: lic.product_id,
          tier: lic.tier,
          keyPreview: lic.key_preview,
          expiresAt: lic.expires_at,
          windowDays: window.days,
        });
        await client.batch(
          [
            { sql: `INSERT INTO marketplace_events (id, kind, actor_id, data, created_at)
                    VALUES (?, ?, ?, ?, ?)`,
              args: [eventId, 'license_expiring', lic.user_id, data, Date.now()] },
            { sql: `INSERT OR IGNORE INTO license_expiry_notifications
                    (license_id, window_kind, sent_at) VALUES (?, ?, ?)`,
              args: [lic.id, window.kind, Date.now()] },
          ],
          'write',
        );
      } catch (err) {
        console.error('[kassa-cron] expiry emit failed', lic.id, window.kind,
          err instanceof Error ? err.message : err);
      }
    }
  }
}
