// /listings/:id/reviews — per-listing review CRUD.
//
// Mounted as a sub-router under listingRoutes. We expose three endpoints:
//   GET    /listings/:id/reviews         — public; returns reviews joined
//                                          with the author's display fields.
//   POST   /listings/:id/reviews         — auth required; upserts a review
//                                          from the current user. Must own
//                                          the listing (user_library entry).
//   DELETE /listings/:id/reviews         — auth required; deletes the
//                                          current user's review.
//
// The `reviews` table has a composite PK on (user_id, listing_id), which
// enforces "one review per user per listing" at the DB level. POST uses
// INSERT … ON CONFLICT(user_id, listing_id) DO UPDATE to handle the upsert
// atomically — a second POST from the same user edits their prior review
// rather than erroring.
//
// Ownership gate: a user may only review listings they own (i.e. have a
// row in user_library). This mirrors the Steam/Itch convention and keeps
// drive-by 1-star spam off the board. Sellers can't review their own
// listings — the purchase route already blocks self-purchase, so they
// can't reach user_library in the first place.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId, avatarUrl } from '../auth';
import { db, exec, now, queryAll, queryOne } from '../db';

export const reviewRoutes = new Hono<{ Bindings: Env }>();

// GET /listings/:id/reviews — public.
//
// JOINs users so the client gets author name + avatar without another
// round-trip. `name` follows the /me convention (global_name || username).
reviewRoutes.get('/:id/reviews', async (c: AppContext) => {
  const lid = c.req.param('id')!;
  const rows = await queryAll<{
    user_id: string; stars: number; body: string | null;
    created_at: number; updated_at: number;
    username: string; global_name: string | null; avatar_hash: string | null;
  }>(
    db(c.env),
    `SELECT r.user_id, r.stars, r.body, r.created_at, r.updated_at,
            u.username, u.global_name, u.avatar_hash
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC`,
    [lid],
  );
  const items = rows.map((r) => ({
    // Review id is (listing_id, user_id) — we surface it as a synthetic id
    // so the client can target a specific review for delete without needing
    // to know the composite. Opaque string.
    id: `${lid}:${r.user_id}`,
    listing_id: lid,
    author_id: r.user_id,
    author_name: r.global_name || r.username,
    author_avatar: avatarUrl(r.user_id, r.avatar_hash),
    stars: r.stars,
    body: r.body,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return c.json({ items });
});

// POST /listings/:id/reviews — auth required. Body: { stars, body? }.
// Upserts the current user's review on this listing.
reviewRoutes.post('/:id/reviews', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  let payload: { stars?: number; body?: string };
  try { payload = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  const stars = Math.floor(Number(payload.stars) || 0);
  if (stars < 1 || stars > 5) return c.json({ error: 'invalid_stars' }, 400);
  const body = typeof payload.body === 'string'
    ? payload.body.trim().slice(0, 2000) || null
    : null;

  const client = db(c.env);
  // Ownership gate — user_library row must exist. Seller of the listing
  // can't review either (they never end up in user_library since the
  // purchase route blocks cannot_buy_own_listing).
  const owns = await queryOne(
    client,
    'SELECT 1 FROM user_library WHERE user_id = ? AND listing_id = ?',
    [uid, lid],
  );
  if (!owns) return c.json({ error: 'not_owned' }, 403);

  const t = now();
  // ON CONFLICT DO UPDATE — second POST edits the row. created_at stays
  // from the original insert; updated_at bumps.
  await exec(
    client,
    `INSERT INTO reviews (user_id, listing_id, stars, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, listing_id) DO UPDATE SET
       stars = excluded.stars,
       body = excluded.body,
       updated_at = excluded.updated_at`,
    [uid, lid, stars, body, t, t],
  );
  return c.json({ ok: true, id: `${lid}:${uid}` });
});

// DELETE /listings/:id/reviews — auth required. Removes the current user's
// review on this listing. Idempotent: 404 → still returns ok so the client
// doesn't have to special-case a race.
reviewRoutes.delete('/:id/reviews', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  await exec(
    db(c.env),
    'DELETE FROM reviews WHERE user_id = ? AND listing_id = ?',
    [uid, lid],
  );
  return c.json({ ok: true });
});
