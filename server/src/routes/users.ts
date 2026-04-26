// /users/:id — minimal public profile lookup.
//
// Unauthenticated: anyone can see a user's display name + avatar when
// browsing a listing, the same way the marketplace feed is public. We
// never return email, session tokens, or anything sensitive — just the
// surface needed to render "by <Name>" on a listing card.
//
// Caching: marked public with a modest max-age so the client and any
// intermediate CDN can reuse the response. A name change takes up to a
// minute to propagate, which is fine for a marketplace byline.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { avatarUrl } from '../auth';
import { db, queryOne } from '../db';

export const userRoutes = new Hono<{ Bindings: Env }>();

userRoutes.get('/:id', async (c: AppContext) => {
  const id = c.req.param('id')!;
  const row = await queryOne<{
    id: string; username: string; global_name: string | null;
    avatar_hash: string | null;
  }>(
    db(c.env),
    'SELECT id, username, global_name, avatar_hash FROM users WHERE id = ?',
    [id],
  );
  if (!row) return c.json({ error: 'not_found' }, 404);

  c.header('Cache-Control', 'public, max-age=60');
  return c.json({
    id: row.id,
    username: row.username,
    // `name` is the client-friendly display field: global_name wins, else
    // the Discord username. Matches the convention used by /me.
    name: row.global_name || row.username,
    avatar_url: avatarUrl(row.id, row.avatar_hash),
  });
});
