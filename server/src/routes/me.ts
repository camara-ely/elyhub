// /me — current user, library, and simple social-graph reads.
//
// Everything here is authed — the client must send the session JWT
// in Authorization: Bearer. The router wires `requireAuth()` once
// so every handler in this file can assume `c.var.session` is set.

import { Hono } from 'hono';
import type { AppContext, Env, PublicUser } from '../types';
import { requireAuth, userId, avatarUrl, getLiveBalance } from '../auth';
import { db, exec, now, queryAll, queryOne } from '../db';

export const meRoutes = new Hono<{ Bindings: Env }>();
meRoutes.use('*', requireAuth());

// GET /me — canonical "who am I"; also bumps last_seen_at.
meRoutes.get('/', async (c: AppContext) => {
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
// acquired_at; the client fetches full listing metadata via /listings/:id
// if it needs it. Keeps this endpoint cheap + cache-friendly.
meRoutes.get('/library', async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{ listing_id: string; acquired_at: number }>(
    db(c.env),
    'SELECT listing_id, acquired_at FROM user_library WHERE user_id = ? ORDER BY acquired_at DESC',
    [uid],
  );
  return c.json({ items: rows });
});

// GET /me/wishlist
meRoutes.get('/wishlist', async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{ listing_id: string; added_at: number }>(
    db(c.env),
    'SELECT listing_id, added_at FROM wishlist WHERE user_id = ? ORDER BY added_at DESC',
    [uid],
  );
  return c.json({ items: rows });
});

// POST /me/wishlist/:listing_id — idempotent add
meRoutes.post('/wishlist/:listing_id', async (c: AppContext) => {
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
meRoutes.delete('/wishlist/:listing_id', async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('listing_id')!;
  await exec(db(c.env), 'DELETE FROM wishlist WHERE user_id = ? AND listing_id = ?', [uid, lid]);
  return c.json({ ok: true });
});

// GET /me/follows — users I follow
meRoutes.get('/follows', async (c: AppContext) => {
  const uid = userId(c);
  const rows = await queryAll<{ followee_id: string; created_at: number }>(
    db(c.env),
    'SELECT followee_id, created_at FROM follows WHERE follower_id = ? ORDER BY created_at DESC',
    [uid],
  );
  return c.json({ items: rows });
});

meRoutes.post('/follows/:user_id', async (c: AppContext) => {
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

meRoutes.delete('/follows/:user_id', async (c: AppContext) => {
  const uid = userId(c);
  const target = c.req.param('user_id')!;
  await exec(db(c.env), 'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [uid, target]);
  return c.json({ ok: true });
});
