// /members — Discord guild directory.
//
// Source of truth: the `xp` table, which the Discord bot keeps in sync via
// gateway events (see Elyzinho Bot's utils/turso.js — syncMemberRoles is
// called on guildMemberAdd, guildMemberUpdate, and on every XP grant).
//
// Why xp? Because the bot already mirrors:
//   - user_id, display_name, avatar_url, roles  (identity)
//   - xp, level                                  (the "aura" we display)
//   - joined_at                                  (Discord member.joinedTimestamp)
//   - updated_at                                 (last activity)
//
// Adding a parallel `discord_members` table would duplicate this. Instead
// we read straight from `xp` and the bot needs no extra HTTP push.
//
// Caveat: bots that use commands but never earned XP still get a row (the
// bot's ensureUserRegistered creates one). Real bots (member.user.bot) are
// skipped on the bot side, so they never appear here.
//
// Endpoint:
//   GET /members
//     Query: ?sort=joined|aura|name|oldest|active
//            ?search=<prefix>          (case-insensitive)
//            ?limit=<n>                (default 60, max 200)
//            ?offset=<n>               (default 0)
//     → { items: Member[], total, limit, offset, sort }

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth } from '../auth';
import { db, queryAll, queryOne } from '../db';

export const memberRoutes = new Hono<{ Bindings: Env }>();

memberRoutes.get('/', requireAuth(), async (c: AppContext) => {
  const url = new URL(c.req.url);
  const sort = (url.searchParams.get('sort') || 'joined').toLowerCase();
  const search = (url.searchParams.get('search') || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 60));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  // ORDER BY whitelist — never inline user-supplied SQL.
  // joined_at can be NULL for rows that predate the bot adding it; we COALESCE
  // to updated_at so newest-sort still produces a sensible order until the bot
  // backfills (which it does on next ready/syncAllMemberRoles).
  let orderClause: string;
  switch (sort) {
    case 'aura':
      orderClause = 'MAX(0, x.xp - COALESCE(p.spent, 0)) DESC, COALESCE(x.joined_at, x.updated_at * 1000) DESC';
      break;
    case 'name':
      orderClause = 'COALESCE(x.display_name, x.user_id) COLLATE NOCASE ASC';
      break;
    case 'oldest':
      orderClause = 'COALESCE(x.joined_at, x.updated_at * 1000) ASC';
      break;
    case 'active':
      orderClause = 'x.updated_at DESC';
      break;
    case 'joined':
    default:
      orderClause = 'COALESCE(x.joined_at, x.updated_at * 1000) DESC';
      break;
  }

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (search) {
    where.push('(LOWER(x.display_name) LIKE ? OR x.user_id LIKE ?)');
    args.push(`${search}%`, `${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const client = db(c.env);
  const items = await queryAll<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    xp: number;
    level: number;
    roles: string | null;
    joined_at: number | null;
    updated_at: number;
  }>(
    client,
    `SELECT x.user_id, x.display_name, x.avatar_url,
            MAX(0, x.xp - COALESCE(p.spent, 0)) AS xp,
            x.level, x.roles, x.joined_at, x.updated_at
     FROM xp x
     LEFT JOIN (
       SELECT user_id, SUM(aura_amount) AS spent
       FROM purchases
       GROUP BY user_id
     ) p ON p.user_id = x.user_id
     ${whereSql}
     ORDER BY ${orderClause}
     LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  );

  const totalRow = await queryOne<{ total: number }>(
    client,
    `SELECT COUNT(*) AS total FROM xp x LEFT JOIN (SELECT user_id, SUM(aura_amount) AS spent FROM purchases GROUP BY user_id) p ON p.user_id = x.user_id ${whereSql}`,
    args,
  );

  return c.json({
    items: items.map((r) => ({
      id: r.user_id,
      name: r.display_name || r.user_id,
      // Bot stores fully-formed Discord CDN URL, no need to reconstruct.
      avatar_url: r.avatar_url,
      aura: r.xp,
      level: r.level,
      // joined_at can be null until the bot backfills via syncAllMemberRoles
      // (runs on bot ready). UI falls back to updated_at if missing.
      joined_at: r.joined_at,
      // updated_at is in seconds (legacy bot convention); convert to ms for
      // consistency with the rest of the app, which uses ms everywhere.
      last_active_at: r.updated_at * 1000,
      roles: parseRoles(r.roles),
    })),
    total: totalRow?.total ?? 0,
    limit,
    offset,
    sort,
  });
});

// Bot stores roles as JSON: [{ id, name, color, position }, ...]. The
// MembersView only needs names for chips; downstream UI can pull more if
// needed. Tolerates the legacy plain-string-array format too.
function parseRoles(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => (typeof x === 'string' ? x : x?.name))
      .filter((n) => typeof n === 'string' && n.length > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}
