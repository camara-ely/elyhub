// Session JWT + Discord OAuth helpers.
//
// Discord flow (called from routes/auth.ts):
//   1. Client sends Discord access_token (obtained via OAuth in the desktop app)
//   2. We call Discord /users/@me to get the profile — validates the token
//      AND gets us the canonical username / avatar
//   3. Upsert into our users table
//   4. Mint a JWT signed with JWT_SECRET (HMAC-SHA256)
//   5. Return { token, user } to the client
//
// Every subsequent request carries `Authorization: Bearer <jwt>`; the
// `requireAuth` middleware below verifies + attaches the session to
// `c.var.session`.

import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Context, Next } from 'hono';
import type { AppContext, Env, PublicUser, Session } from './types';
import type { Client } from '@libsql/client/web';
import { db, exec, now, queryOne } from './db';

// ─── Live aura/level ──────────────────────────────────────────────────
// The Discord bot owns the `xp` table — voice minutes, messages, boosts,
// etc. That's the authoritative source for how much aura a user has
// earned. Marketplace purchases debit by INSERTing into `purchases`;
// we compute the live balance as (xp.xp - SUM(purchases.aura_amount)).
//
// Pros:
//   - Zero writes back to xp — no race with the bot's XP ticker.
//   - users.aura / users.level columns become display-only caches; we
//     never trust them for reads.
//   - One SELECT gives us the whole picture.
// Cons:
//   - Concurrent double-buys inside the same millisecond could both
//     pass the `aura >= price` check. Window is tiny; revisit if it
//     bites in practice (a row-level lock on xp would fix it).
export async function getLiveBalance(
  client: Client, userId: string,
): Promise<{ aura: number; level: number }> {
  const row = await queryOne<{ xp: number | null; xp_level: number | null; spent: number | null }>(
    client,
    `SELECT
       (SELECT xp    FROM xp WHERE user_id = ?) AS xp,
       (SELECT level FROM xp WHERE user_id = ?) AS xp_level,
       COALESCE((SELECT SUM(aura_amount) FROM purchases WHERE user_id = ?), 0) AS spent`,
    [userId, userId, userId],
  );
  const earned = Number(row?.xp ?? 0);
  const spent = Number(row?.spent ?? 0);
  const level = Number(row?.xp_level ?? 1);
  return { aura: Math.max(0, earned - spent), level };
}

// 7 days — matches the Discord implicit-grant token lifetime. Users
// re-sign in once a week.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function avatarUrl(userId: string, hash: string | null, size = 128): string {
  if (!hash) {
    // Discord default avatar — (id >> 22) % 6 for the new username system.
    // Guard: only real Discord snowflakes are all-digits. Seeded/demo ids
    // (e.g. `demo-seller-0001`) would blow up BigInt() with SyntaxError, so
    // fall back to avatar 0 for any non-numeric id.
    let idx = 0;
    if (/^\d+$/.test(userId)) {
      try { idx = Number((BigInt(userId) >> 22n) % 6n); } catch { idx = 0; }
    }
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=${size}`;
}

// Hit Discord /users/@me with a bearer token. Returns the raw profile
// or throws a labelled Error so routes can surface a 401 vs 502.
export async function fetchDiscordProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}> {
  const r = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (r.status === 401 || r.status === 403) {
    throw new Error('discord_token_invalid');
  }
  if (!r.ok) {
    throw new Error(`discord_api_${r.status}`);
  }
  return r.json();
}

// Create or update the local users row. Idempotent on (id). Returns
// the final row as a PublicUser (aura/level included so we can send it
// back in the auth response without a second query).
export async function upsertUser(
  env: Env,
  profile: { id: string; username: string; global_name: string | null; avatar: string | null },
): Promise<PublicUser> {
  const client = db(env);
  const t = now();
  await exec(
    client,
    `INSERT INTO users (id, username, global_name, avatar_hash, aura, level, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, 0, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username     = excluded.username,
       global_name  = excluded.global_name,
       avatar_hash  = excluded.avatar_hash,
       last_seen_at = excluded.last_seen_at`,
    [profile.id, profile.username, profile.global_name, profile.avatar, t, t],
  );
  const row = await queryOne<{
    id: string; username: string; global_name: string | null;
    avatar_hash: string | null;
  }>(client, 'SELECT id, username, global_name, avatar_hash FROM users WHERE id = ?', [profile.id]);
  if (!row) throw new Error('upsert_failed');

  // Sync the xp table's display identity so the leaderboard / members view
  // always shows the current Discord name + avatar immediately on sign-in.
  // The Discord bot updates xp.display_name via guildMemberUpdate events,
  // but that fires asynchronously — without this patch the leaderboard shows
  // the old name until the bot next processes an event for this user.
  const freshDisplayName = profile.global_name || profile.username;
  const freshAvatarUrl   = avatarUrl(profile.id, profile.avatar);
  try {
    await exec(
      client,
      `UPDATE xp SET display_name = ?, avatar_url = ?, updated_at = ?
       WHERE user_id = ?`,
      [freshDisplayName, freshAvatarUrl, Math.floor(Date.now() / 1000), profile.id],
    );
  } catch {
    // xp row may not exist yet for brand-new users; the bot creates it on
    // first XP grant or guild join. Non-fatal — leaderboard just shows bot
    // data until the row appears.
  }

  const { aura, level } = await getLiveBalance(client, profile.id);
  return {
    id: row.id,
    username: row.username,
    global_name: row.global_name,
    avatar_url: avatarUrl(row.id, row.avatar_hash),
    aura,
    level,
  };
}

export async function signSession(env: Env, userId: string): Promise<{ token: string; expires_at: number }> {
  const expires_at = Date.now() + SESSION_TTL_MS;
  const payload: Session = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires_at / 1000),
  };
  const token = await jwt.sign(payload, env.JWT_SECRET);
  return { token, expires_at };
}

export async function verifySession(env: Env, token: string): Promise<Session | null> {
  try {
    const ok = await jwt.verify(token, env.JWT_SECRET);
    if (!ok) return null;
    const { payload } = jwt.decode<Session>(token);
    if (!payload || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Middleware: extracts Bearer token from Authorization header, verifies,
// attaches session to context. 401 if missing/invalid.
export function requireAuth() {
  return async (c: AppContext, next: Next) => {
    const header = c.req.header('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return c.json({ error: 'missing_bearer' }, 401);
    const session = await verifySession(c.env, match[1]);
    if (!session) return c.json({ error: 'invalid_token' }, 401);
    c.set('session', session);
    await next();
  };
}

// Like requireAuth but never 401s — attaches the session if valid,
// leaves it null if the header is absent or the token is expired.
// Use on public endpoints that return richer data when authenticated.
export function optionalAuth() {
  return async (c: AppContext, next: Next) => {
    const header = c.req.header('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const session = await verifySession(c.env, match[1]);
      if (session) c.set('session', session);
    }
    await next();
  };
}

// Convenience for inside authed handlers — asserts session is present
// (which `requireAuth` just guaranteed) and returns the user id.
export function userId(c: AppContext): string {
  const s = c.var.session;
  if (!s) throw new Error('userId() called on unauthed request');
  return s.sub;
}

// Nullable version for handlers that accept optional auth.
export function userIdOptional(c: AppContext): string | null {
  return c.var.session?.sub ?? null;
}
