// /listings/* — marketplace reads, purchases, and create/publish.
//
// Public reads (GET /listings, GET /listings/:id) don't need auth —
// the marketplace is browsable without signing in. Everything else
// (purchase, create, update) is gated.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId, getLiveBalance } from '../auth';
import { db, exec, now, queryAll, queryOne } from '../db';

export const listingRoutes = new Hono<{ Bindings: Env }>();

// GET /listings — public feed. Supports ?type= and ?limit=.
// Returns published listings only.
listingRoutes.get('/', async (c: AppContext) => {
  const type = c.req.query('type');
  const limit = Math.min(Number(c.req.query('limit') || 50), 200);

  let sql = `SELECT id, seller_id, type, title, tagline, price_aura, billing,
                    level_req, tags, cover_key, featured, downloads, created_at
             FROM listings
             WHERE status = 'published'`;
  const args: (string | number)[] = [];
  if (type) {
    sql += ' AND type = ?';
    args.push(type);
  }
  sql += ' ORDER BY featured DESC, downloads DESC, created_at DESC LIMIT ?';
  args.push(limit);

  const rows = await queryAll(db(c.env), sql, args);
  return c.json({ items: rows });
});

// GET /listings/:id — full detail including assets list. Public too, so
// unauthenticated browsers can see the marketplace before signing in.
listingRoutes.get('/:id', async (c: AppContext) => {
  const id = c.req.param('id')!;
  const client = db(c.env);

  const listing = await queryOne(
    client,
    `SELECT id, seller_id, type, title, tagline, description, price_aura, billing,
            level_req, tags, cover_key, featured, status, downloads, created_at, updated_at
     FROM listings WHERE id = ?`,
    [id],
  );
  if (!listing) return c.json({ error: 'not_found' }, 404);

  // Assets list — we return the metadata but NOT the R2 keys; the
  // client must go through /downloads/:asset_id to get a signed URL,
  // which enforces entitlement.
  const assets = await queryAll(
    client,
    'SELECT id, kind, filename, size_bytes, content_type, sha256, created_at FROM assets WHERE listing_id = ?',
    [id],
  );

  return c.json({ ...listing, assets });
});

// POST /listings/:id/purchase — debit aura, insert purchase, add to library.
// All in a single transaction so the three rows move together or not at all.
listingRoutes.post('/:id/purchase', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  const client = db(c.env);

  // Load listing + live balance in parallel. Balance is computed from the
  // bot-owned xp table minus prior purchases — see auth.ts → getLiveBalance.
  const [listing, balance] = await Promise.all([
    queryOne<{ id: string; seller_id: string; price_aura: number; status: string; level_req: number }>(
      client,
      'SELECT id, seller_id, price_aura, status, level_req FROM listings WHERE id = ?',
      [lid],
    ),
    getLiveBalance(client, uid),
  ]);
  if (!listing) return c.json({ error: 'listing_not_found' }, 404);
  if (listing.status !== 'published') return c.json({ error: 'listing_not_available' }, 400);
  if (listing.seller_id === uid) return c.json({ error: 'cannot_buy_own_listing' }, 400);
  if (balance.level < listing.level_req) return c.json({ error: 'level_too_low', required: listing.level_req }, 403);
  if (balance.aura < listing.price_aura) return c.json({ error: 'insufficient_aura' }, 402);

  // Check for existing ownership. Re-purchasing is a no-op (returns the
  // existing row) — avoids double-charging on a retry.
  const already = await queryOne<{ acquired_at: number }>(
    client,
    'SELECT acquired_at FROM user_library WHERE user_id = ? AND listing_id = ?',
    [uid, lid],
  );
  if (already) {
    return c.json({ ok: true, already_owned: true, acquired_at: already.acquired_at });
  }

  // Transaction — libsql `batch` runs the statements atomically. No
  // UPDATE on users.aura: live balance is derived from SUM(purchases)
  // at read time, so the INSERT INTO purchases IS the debit.
  const purchaseId = crypto.randomUUID();
  const t = now();
  await client.batch(
    [
      { sql: 'INSERT INTO purchases (id, user_id, listing_id, aura_amount, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [purchaseId, uid, lid, listing.price_aura, t] },
      { sql: 'INSERT INTO user_library (user_id, listing_id, acquired_at) VALUES (?, ?, ?)',
        args: [uid, lid, t] },
      { sql: 'UPDATE listings SET downloads = downloads + 1, updated_at = ? WHERE id = ?',
        args: [t, lid] },
    ],
    'write',
  );

  return c.json({ ok: true, purchase_id: purchaseId, acquired_at: t });
});

// POST /listings — create a draft. The actual files are uploaded via
// /uploads/* before the listing is published.
listingRoutes.post('/', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  let body: {
    type?: string; title?: string; tagline?: string; description?: string;
    price_aura?: number; billing?: string; level_req?: number; tags?: string[];
  };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  if (!body.type || !body.title) return c.json({ error: 'missing_fields' }, 400);
  if (typeof body.price_aura !== 'number' || body.price_aura < 0) {
    return c.json({ error: 'invalid_price' }, 400);
  }

  const id = crypto.randomUUID();
  const t = now();
  await exec(
    db(c.env),
    `INSERT INTO listings
       (id, seller_id, type, title, tagline, description, price_aura, billing,
        level_req, tags, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [
      id, uid, body.type, body.title, body.tagline ?? null, body.description ?? null,
      body.price_aura, body.billing ?? 'one-time', body.level_req ?? 1,
      body.tags ? JSON.stringify(body.tags) : null, t, t,
    ],
  );
  return c.json({ id, status: 'draft' });
});

// POST /listings/:id/publish — flip status from draft to published.
// Only the seller can publish their own listing. No validation of
// whether assets exist yet — it's valid to publish a "link-only" or
// free-price listing with just a cover.
listingRoutes.post('/:id/publish', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  const client = db(c.env);
  const l = await queryOne<{ seller_id: string; status: string }>(
    client, 'SELECT seller_id, status FROM listings WHERE id = ?', [lid],
  );
  if (!l) return c.json({ error: 'not_found' }, 404);
  if (l.seller_id !== uid) return c.json({ error: 'forbidden' }, 403);
  if (l.status === 'removed') return c.json({ error: 'listing_removed' }, 400);
  await exec(
    client,
    "UPDATE listings SET status = 'published', updated_at = ? WHERE id = ?",
    [now(), lid],
  );
  return c.json({ ok: true });
});
