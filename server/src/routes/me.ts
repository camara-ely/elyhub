// /me — current user, library, and simple social-graph reads.
//
// Everything here is authed — the client must send the session JWT
// in Authorization: Bearer. The router wires `requireAuth()` once
// so every handler in this file can assume `c.var.session` is set.

import { Hono } from 'hono';
import type { AppContext, Env, PublicUser } from '../types';
import { requireAuth, optionalAuth, userId, userIdOptional, avatarUrl, getLiveBalance } from '../auth';
import { db, exec, now, queryAll, queryOne } from '../db';
import { adminListLicenses, adminResetDevices, type Actor } from '../lib/kassa-licensing';

export const meRoutes = new Hono<{ Bindings: Env }>();
// NOTE: do NOT put requireAuth() here as a global — /poll uses optionalAuth()
// to serve public data (members, feed) without a JWT. Each route that needs
// auth applies requireAuth() individually via the handler signature below.

// GET /me — canonical "who am I"; also bumps last_seen_at.
meRoutes.get('/', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const client = db(c.env);
  await exec(client, 'UPDATE users SET last_seen_at = ? WHERE id = ?', [now(), uid]);

  const row = await queryOne<{
    id: string; username: string; global_name: string | null;
    avatar_hash: string | null;
  }>(
    client,
    'SELECT id, username, global_name, avatar_hash FROM users WHERE id = ?',
    [uid],
  );
  if (!row) return c.json({ error: 'user_not_found' }, 404);

  // Aura/level come live from the bot's xp table minus marketplace spend
  // — the users.aura/level columns are legacy placeholders.
  const { aura, level } = await getLiveBalance(client, uid);
  const user: PublicUser = {
    id: row.id,
    username: row.username,
    global_name: row.global_name,
    avatar_url: avatarUrl(row.id, row.avatar_hash),
    aura,
    level,
  };
  return c.json(user);
});

// GET /me/library — listings the current user owns. Returns id +
// acquired_at + license_key (for Kassa products). Keeps this endpoint
// cheap: one indexed join against listings just to know whether each
// row is a Kassa product (for license_pending flag).
//
// license_pending = true when the listing IS a Kassa product but the
// license_key hasn't been written yet (the Supabase call was retrying
// in the background). Client should show "emitindo…" and poll.
meRoutes.get("/library", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{
    listing_id: string;
    acquired_at: number;
    license_key: string | null;
    kassa_product_id: string | null;
    current_version: string | null;
    current_version_url: string | null;
    current_version_published_at: number | null;
    github_repo: string | null;
  }>(
    db(c.env),
    `SELECT ul.listing_id, ul.acquired_at, ul.license_key,
            l.kassa_product_id,
            l.current_version, l.current_version_url,
            l.current_version_published_at, l.github_repo
     FROM user_library ul
     JOIN listings l ON l.id = ul.listing_id
     WHERE ul.user_id = ?
     ORDER BY ul.acquired_at DESC`,
    [uid],
  );
  const items = rows.map((r) => ({
    listing_id: r.listing_id,
    acquired_at: r.acquired_at,
    license_key: r.license_key,
    license_pending: !!r.kassa_product_id && !r.license_key,
    // Auto-update fields. The client compares current_version against its
    // localStorage `installed_version[listing_id]` to decide whether to
    // surface the Update button. URL is GitHub's release asset CDN.
    current_version: r.current_version,
    current_version_url: r.current_version_url,
    current_version_published_at: r.current_version_published_at,
    has_updates: !!r.github_repo,
  }));
  return c.json({ items });
});

// GET /me/wishlist
meRoutes.get("/wishlist", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{ listing_id: string; added_at: number }>(
    db(c.env),
    'SELECT listing_id, added_at FROM wishlist WHERE user_id = ? ORDER BY added_at DESC',
    [uid],
  );
  return c.json({ items: rows });
});

// POST /me/wishlist/:listing_id — idempotent add
meRoutes.post("/wishlist/:listing_id", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('listing_id')!;
  await exec(
    db(c.env),
    'INSERT OR IGNORE INTO wishlist (user_id, listing_id, added_at) VALUES (?, ?, ?)',
    [uid, lid, now()],
  );
  return c.json({ ok: true });
});

// DELETE /me/wishlist/:listing_id
meRoutes.delete("/wishlist/:listing_id", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('listing_id')!;
  await exec(db(c.env), 'DELETE FROM wishlist WHERE user_id = ? AND listing_id = ?', [uid, lid]);
  return c.json({ ok: true });
});

// GET /me/follows — users I follow
meRoutes.get("/follows", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{ followee_id: string; created_at: number }>(
    db(c.env),
    'SELECT followee_id, created_at FROM follows WHERE follower_id = ? ORDER BY created_at DESC',
    [uid],
  );
  return c.json({ items: rows });
});

meRoutes.post("/follows/:user_id", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const target = c.req.param('user_id')!;
  if (target === uid) return c.json({ error: 'cannot_follow_self' }, 400);
  await exec(
    db(c.env),
    'INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)',
    [uid, target, now()],
  );
  return c.json({ ok: true });
});

meRoutes.delete("/follows/:user_id", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const target = c.req.param('user_id')!;
  await exec(db(c.env), 'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [uid, target]);
  return c.json({ ok: true });
});

// ───────── My Licenses (Sprint 4) ───────────────────────────────────────────
//
// Self-service license management. Reuses the admin Supabase functions with a
// trusted server-side actor (role='owner') but FORCES user_id = session.uid
// so the user can only see/mutate their own licenses. Since user_id is
// controlled by the session (not client input), this is safe even though the
// underlying Supabase fn is owner-capable.

// GET /me/licenses — list the caller's own Kassa licenses.
//
// Each license is enriched with `license_key` (plaintext) when we can match
// it to a `user_library` row. The plaintext lives in Turso — written there
// at purchase time by the Kassa purchase handler. We match by key_preview
// prefix/suffix: previews look like "KC-FC96-…-B983", so a plaintext key
// starting with "KC-FC96-" and ending with "-B983" is a safe match (collision
// would require two keys sharing a 7-char prefix AND 5-char suffix, which is
// astronomically unlikely with random keys).
meRoutes.get("/licenses", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  // Internal trust: Worker has the HMAC secret, so we can mint a server-side
  // actor. The Supabase fn verifies the HMAC and honors the role — we're NOT
  // leaking admin powers to the client, just using the same code path with
  // a forced user_id filter.
  const actor: Actor = { id: uid, role: 'owner' };
  try {
    const res = await adminListLicenses(c.env, actor, {
      user_id: uid,
      status: 'all',
      limit: 100,
    });

    // Pull the user's stored plaintext keys from BOTH durable stores:
    //  - user_license_keys: canonical, keyed by license_id (exact match).
    //  - user_library: legacy path for marketplace purchases, keyed by listing.
    // We prefer the exact license_id match and fall back to preview prefix/
    // suffix matching against user_library for older rows. Safe to ignore
    // failure — worst case the UI shows key_preview with no reveal.
    let licenseKeyMap = new Map<string, string>(); // license_id -> plaintext
    let libraryKeys: Array<{ license_key: string }> = [];
    try {
      const rows = await queryAll<{ license_id: string; license_key: string }>(
        db(c.env),
        'SELECT license_id, license_key FROM user_license_keys WHERE user_id = ?',
        [uid],
      );
      for (const r of rows) licenseKeyMap.set(r.license_id, r.license_key);
    } catch (err) {
      console.warn('[me/licenses] license_keys lookup failed:', (err as Error).message);
    }
    try {
      libraryKeys = await queryAll<{ license_key: string }>(
        db(c.env),
        'SELECT license_key FROM user_library WHERE user_id = ? AND license_key IS NOT NULL',
        [uid],
      );
    } catch (err) {
      console.warn('[me/licenses] library keys lookup failed:', (err as Error).message);
    }

    const items = (res as { items?: Array<Record<string, unknown>> })?.items ?? [];
    const enriched = items.map((lic) => {
      // 1. Exact match by license_id (new, reliable path).
      const licId = lic.id ? String(lic.id) : '';
      const exact = licId && licenseKeyMap.get(licId);
      if (exact) return { ...lic, license_key: exact };

      // 2. Fallback: preview prefix/suffix match against user_library. Keeps
      //    older marketplace purchases working without a backfill.
      const preview = String(lic.key_preview ?? '');
      const [prefix, suffix] = preview.split(/…|\.\.\./);
      if (!prefix || !suffix) return lic;
      const match = libraryKeys.find(
        (k) => k.license_key.startsWith(prefix) && k.license_key.endsWith(suffix),
      );
      return match ? { ...lic, license_key: match.license_key } : lic;
    });

    return c.json({ ...(res as object), items: enriched });
  } catch (err) {
    console.error('[me/licenses] list failed:', (err as Error).message);
    return c.json({ error: 'list_failed' }, 500);
  }
});

// POST /me/licenses/:id/reset-devices — let the user clear their own HWID
// bindings. Rate-limited: 1 reset per license per 24h. Enforces ownership
// server-side (the Supabase fn sees user_id implicitly via license_id but we
// double-check here so a forged license_id from another user is rejected
// BEFORE we hit Supabase).
meRoutes.post("/licenses/:id/reset-devices", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const licenseId = c.req.param('id')!;

  // Ensure the license belongs to the caller. We use adminListLicenses with
  // user_id filter — cheaper than a separate endpoint and the Kassa library
  // already handles pagination.
  const actor: Actor = { id: uid, role: 'owner' };
  let owns = false;
  try {
    const list = await adminListLicenses(c.env, actor, { user_id: uid, status: 'all', limit: 100 });
    const items = (list as { items?: Array<{ id: string }> }).items ?? [];
    owns = items.some((it) => it.id === licenseId);
  } catch (err) {
    console.error('[me/licenses/reset] ownership check failed:', (err as Error).message);
    return c.json({ error: 'check_failed' }, 500);
  }
  if (!owns) return c.json({ error: 'not_found' }, 404);

  // Rate limit via Turso. Tiny table, idempotent create. 24h window.
  const client = db(c.env);
  await exec(
    client,
    `CREATE TABLE IF NOT EXISTS user_license_resets (
       user_id TEXT NOT NULL,
       license_id TEXT NOT NULL,
       reset_at INTEGER NOT NULL,
       PRIMARY KEY (user_id, license_id)
     )`,
  );
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const last = await queryOne<{ reset_at: number }>(
    client,
    'SELECT reset_at FROM user_license_resets WHERE user_id = ? AND license_id = ?',
    [uid, licenseId],
  );
  const nowMs = Date.now();
  if (last && nowMs - last.reset_at < WINDOW_MS) {
    const retryInSec = Math.ceil((WINDOW_MS - (nowMs - last.reset_at)) / 1000);
    return c.json({ error: 'rate_limited', retry_after_sec: retryInSec }, 429);
  }

  // Proceed with reset.
  try {
    const res = await adminResetDevices(c.env, actor, {
      license_id: licenseId,
      reason: 'self-service reset',
    });
    // Upsert rate-limit stamp only on success.
    await exec(
      client,
      `INSERT INTO user_license_resets (user_id, license_id, reset_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, license_id) DO UPDATE SET reset_at = excluded.reset_at`,
      [uid, licenseId, nowMs],
    );
    return c.json(res);
  } catch (err) {
    console.error('[me/licenses/reset] failed:', (err as Error).message);
    return c.json({ error: 'reset_failed' }, 500);
  }
});

// ──── POST /me/enqueue-op ────
// Server-side proxy for inserting into pending_ops. Replaces the previous
// pattern where the client wrote to Turso directly using the bundled token.
// Locking writes behind this endpoint lets us:
//   • enforce from_user_id === authed user (no spoofing)
//   • whitelist `kind` values (no arbitrary inserts)
//   • range-check amount per kind (no million-aura gifts)
//   • drop the read-write Turso token from dist/config.js
const ENQUEUE_KINDS = new Set([
  'gift', 'daily_tag', 'daily_booster', 'redeem',
]);
meRoutes.post("/enqueue-op", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }

  const kind = String(body?.kind || '').trim();
  if (!ENQUEUE_KINDS.has(kind)) return c.json({ error: 'invalid_kind' }, 400);

  // from_user_id is ALWAYS the authed user — clients cannot spoof.
  const fromUid = uid;
  const toUid = body?.toUserId ? String(body.toUserId).slice(0, 32) : null;
  const amountRaw = body?.amount;
  const amount = (amountRaw == null || amountRaw === '') ? null : Number(amountRaw);
  const note = body?.note ? String(body.note).slice(0, 280) : null;

  // Per-kind validation. Numbers must be sane positive integers within
  // the operation's expected band — bot rejects out-of-band ops anyway,
  // but we fail fast here so the queue stays clean.
  if (kind === 'gift') {
    if (!toUid) return c.json({ error: 'to_user_required' }, 400);
    if (toUid === fromUid) return c.json({ error: 'self_gift' }, 400);
    if (!Number.isInteger(amount) || amount! < 1 || amount! > 1_000_000) {
      return c.json({ error: 'invalid_amount' }, 400);
    }
  } else if (kind === 'redeem') {
    if (!Number.isInteger(amount) || amount! < 1 || amount! > 10_000_000) {
      return c.json({ error: 'invalid_amount' }, 400);
    }
  } else if (kind === 'daily_tag' || kind === 'daily_booster') {
    // Bot computes the amount; client doesn't pass one for these.
    if (amount != null) return c.json({ error: 'amount_not_allowed' }, 400);
  }

  const id = crypto.randomUUID();
  const client = db(c.env);
  try {
    await exec(client,
      `INSERT INTO pending_ops
         (id, kind, from_user_id, to_user_id, amount, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, kind, fromUid, toUid, amount, note, Math.floor(Date.now() / 1000)],
    );
  } catch (err) {
    console.error('[me/enqueue-op] insert failed:', (err as Error).message);
    return c.json({ error: 'enqueue_failed' }, 500);
  }
  return c.json({ id });
});

// ──── GET /me/op-result/:id ────
// Polls pending_ops for the result row. Lets the client wait for the bot's
// worker to apply (or reject) without needing direct Turso read access.
meRoutes.get("/op-result/:id", requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const id = c.req.param('id')!;
  const client = db(c.env);
  // Scope to the authed user so a malicious client can't probe other
  // users' op outcomes.
  const row = await queryOne<{
    id: string; kind: string; status: string | null;
    error: string | null; applied_at: number | null;
  }>(
    client,
    `SELECT id, kind, status, error, applied_at
     FROM pending_ops
     WHERE id = ? AND from_user_id = ?`,
    [id, uid],
  );
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({
    id: row.id, kind: row.kind,
    status: row.status, error: row.error,
    applied_at: row.applied_at,
  });
});

// ──── GET /me/poll ────
// Consolidated snapshot the client polls every ~5s.
//
// Public data (members, feed, server) is always returned — no JWT needed.
// Personal data (me.spend, trophies, claim state) is only populated when
// the request carries a valid Bearer token. This lets unauthenticated
// users (or those whose JWT has expired) still see the live leaderboard
// and aura feed without having to sign in first.
//
// Returns:
//   members  — top 50 leaderboard rows (always public)
//   me       — personal snapshot (zeros when not authed)
//   feed     — last 30 aura events (always public)
//   server   — { iconUrl, name } (always public)
meRoutes.get('/poll', optionalAuth(), async (c: AppContext) => {
  const uid = userIdOptional(c); // null when not authenticated
  const client = db(c.env);

  // 1) Leaderboard (xp top 50) — public, no auth needed.
  // Subtract marketplace purchases so every surface (home ranking, leaderboard,
  // profile) shows the same net balance as ME.aura (getLiveBalance).
  const members = await queryAll<{
    user_id: string; display_name: string | null; avatar_url: string | null;
    xp: number; level: number; voice_seconds: number;
    gym_posts: number; gym_streak_current: number; gym_streak_best: number;
    last_daily_claim_day: string | null; last_booster_claim_day: string | null;
    roles: string | null;
  }>(
    client,
    `SELECT x.user_id, x.display_name, x.avatar_url,
            MAX(0, x.xp - COALESCE(p.spent, 0)) AS xp,
            x.level, x.voice_seconds,
            x.gym_posts, x.gym_streak_current, x.gym_streak_best,
            x.last_daily_claim_day, x.last_booster_claim_day, x.roles
     FROM xp x
     LEFT JOIN (
       SELECT user_id, SUM(aura_amount) AS spent
       FROM purchases GROUP BY user_id
     ) p ON p.user_id = x.user_id
     ORDER BY xp DESC LIMIT 50`,
  );

  // 2) Marketplace spend — personal, only when authed.
  let spend = 0;
  if (uid) {
    try {
      const spendRow = await queryOne<{ spent: number }>(
        client,
        'SELECT COALESCE(SUM(aura_amount), 0) AS spent FROM purchases WHERE user_id = ?',
        [uid],
      );
      spend = Number(spendRow?.spent || 0);
    } catch { /* purchases table may not exist yet */ }
  }

  // 3) Aura feed (last 30 events) — public.
  let feed: any[] = [];
  try {
    const rows = await queryAll<{
      id: number; kind: string; from_user_id: string | null; to_user_id: string;
      amount: number; note: string | null; at: number;
      from_name: string | null; from_avatar: string | null;
      to_name: string | null; to_avatar: string | null;
    }>(
      client,
      `SELECT l.id, l.kind, l.from_user_id, l.to_user_id, l.amount, l.note, l.at,
              src.display_name AS from_name, src.avatar_url AS from_avatar,
              dst.display_name AS to_name,   dst.avatar_url AS to_avatar
       FROM aura_log l
       LEFT JOIN xp src ON src.user_id = l.from_user_id
       LEFT JOIN xp dst ON dst.user_id = l.to_user_id
       ORDER BY l.at DESC
       LIMIT 30`,
    );
    feed = rows;
  } catch { /* aura_log table may not exist yet */ }

  // 4) Trophy aggregates — personal, only when authed.
  let trophies = {
    gifts_sent: 0, gifts_received: 0, postjob_count: 0, founder_redeems: 0,
  };
  if (uid) {
    try {
      const row = await queryOne<typeof trophies>(
        client,
        `SELECT
           COALESCE(SUM(CASE WHEN kind='gift'    AND from_user_id = ? THEN amount END), 0) AS gifts_sent,
           COALESCE(SUM(CASE WHEN kind='gift'    AND to_user_id   = ? THEN amount END), 0) AS gifts_received,
           COALESCE(SUM(CASE WHEN kind='postjob' AND to_user_id   = ? THEN 1       END), 0) AS postjob_count,
           COALESCE(SUM(CASE WHEN kind='redeem'  AND to_user_id   = ? AND note LIKE 'r5:%' THEN 1 END), 0) AS founder_redeems
         FROM aura_log`,
        [uid, uid, uid, uid],
      );
      if (row) trophies = row;
    } catch { /* aura_log not ready */ }
  }

  // 5) Server identity — public.
  let serverMeta: { iconUrl: string | null; name: string } = { iconUrl: null, name: 'ElyHub' };
  try {
    const rows = await queryAll<{ key: string; value: string }>(
      client,
      `SELECT key, value FROM server_meta WHERE key IN ('icon_url', 'name')`,
    );
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value || '';
    serverMeta = { iconUrl: map.icon_url || null, name: map.name || 'ElyHub' };
  } catch { /* server_meta optional */ }

  return c.json({
    members,
    me: {
      spend,
      totalGiftsSent:     Number(trophies.gifts_sent)     || 0,
      totalGiftsReceived: Number(trophies.gifts_received) || 0,
      postjobCount:       Number(trophies.postjob_count)  || 0,
      founderRedeemed:    Number(trophies.founder_redeems || 0) > 0,
    },
    feed,
    server: serverMeta,
  });
});

// ──── POST /me/subscriptions/gleipnir/reset ────
// Owner-only dev helper: wipes all local purchase/library/license records
// for the Hugin ("gleipnir") product so the caller appears unsubscribed.
// Aura is implicitly refunded because live balance = xp minus SUM(purchases).
// Gated to KASSA_OWNER_IDS; returns 403 for everyone else.
meRoutes.post('/subscriptions/gleipnir/reset', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const ownerIds = (c.env.KASSA_OWNER_IDS || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (!ownerIds.includes(uid)) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const client = db(c.env);

  // 1. Find all listing IDs for product gleipnir.
  const gleipnirListings = await queryAll<{ id: string }>(
    client,
    `SELECT id FROM listings WHERE kassa_product_id = 'gleipnir'`,
  );
  const listingIds = gleipnirListings.map((r) => r.id);

  if (listingIds.length > 0) {
    const placeholders = listingIds.map(() => '?').join(',');

    // 2. Delete purchases (restores live aura balance).
    try {
      await exec(client,
        `DELETE FROM purchases WHERE user_id = ? AND listing_id IN (${placeholders})`,
        [uid, ...listingIds],
      );
    } catch { /* table may not exist */ }

    // 3. Delete user_library rows.
    try {
      await exec(client,
        `DELETE FROM user_library WHERE user_id = ? AND listing_id IN (${placeholders})`,
        [uid, ...listingIds],
      );
    } catch { /* table may not exist */ }

    // 4. Delete user_license_keys rows (by listing_id OR product_id).
    try {
      await exec(client,
        `DELETE FROM user_license_keys WHERE user_id = ? AND (listing_id IN (${placeholders}) OR product_id = 'gleipnir')`,
        [uid, ...listingIds],
      );
    } catch { /* table may not exist */ }
  } else {
    // No listings found — still try to clean up by product_id alone.
    try {
      await exec(client,
        `DELETE FROM user_license_keys WHERE user_id = ? AND product_id = 'gleipnir'`,
        [uid],
      );
    } catch { /* table may not exist */ }
  }

  return c.json({ ok: true });
});
