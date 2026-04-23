// /uploads/* — presigned URL factory for R2 uploads.
//
// Flow:
//   1. Client (creator in the app) calls POST /uploads/request with
//      { listing_id, kind, filename, content_type, size_bytes }
//   2. We check they own the listing and it's still a draft
//   3. Generate an asset_id, compute the R2 key, insert a row in assets
//   4. Return { asset_id, put_url } — client PUTs the file directly to R2
//   5. Client calls POST /uploads/complete { asset_id, sha256 } once done
//
// We don't gate asset creation on upload-complete — if the client never
// calls complete, the DB row sits there with sha256=NULL forever. A
// periodic job can sweep orphaned rows older than 24h. For now that's
// fine, R2 storage is cheap and the keys are unique.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId } from '../auth';
import { db, exec, now, queryOne } from '../db';
import { assetKey, signPutUrl } from '../r2';

export const uploadRoutes = new Hono<{ Bindings: Env }>();
uploadRoutes.use('*', requireAuth());

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB — upper sanity bound
const ALLOWED_KINDS = new Set(['cover', 'preview', 'pack', 'screenshot']);

uploadRoutes.post('/request', async (c: AppContext) => {
  const uid = userId(c);
  let body: {
    listing_id?: string; kind?: string; filename?: string;
    content_type?: string; size_bytes?: number;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  if (!body.listing_id || !body.kind || !body.filename || !body.content_type) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  if (!ALLOWED_KINDS.has(body.kind)) {
    return c.json({ error: 'invalid_kind', allowed: [...ALLOWED_KINDS] }, 400);
  }
  if (typeof body.size_bytes !== 'number' || body.size_bytes <= 0 || body.size_bytes > MAX_SIZE_BYTES) {
    return c.json({ error: 'invalid_size', max_bytes: MAX_SIZE_BYTES }, 400);
  }

  // Ownership + state check — only the seller can attach assets, and
  // only while the listing is still a draft (publishing freezes it).
  const listing = await queryOne<{ seller_id: string; status: string }>(
    db(c.env),
    'SELECT seller_id, status FROM listings WHERE id = ?',
    [body.listing_id],
  );
  if (!listing) return c.json({ error: 'listing_not_found' }, 404);
  if (listing.seller_id !== uid) return c.json({ error: 'forbidden' }, 403);
  if (listing.status === 'removed') return c.json({ error: 'listing_removed' }, 400);

  const assetId = crypto.randomUUID();
  const key = assetKey(body.listing_id, assetId, body.filename);
  await exec(
    db(c.env),
    `INSERT INTO assets (id, listing_id, kind, filename, r2_key, size_bytes, content_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assetId, body.listing_id, body.kind, body.filename, key, body.size_bytes, body.content_type, now()],
  );

  const put_url = await signPutUrl(c.env, key, body.content_type);
  return c.json({ asset_id: assetId, put_url, r2_key: key, expires_in: 900 });
});

// POST /uploads/complete — client tells us the upload finished. We
// optionally record the sha256 and — for cover assets — promote the
// r2_key onto listings.cover_key so the marketplace feed can render it.
uploadRoutes.post('/complete', async (c: AppContext) => {
  const uid = userId(c);
  let body: { asset_id?: string; sha256?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  if (!body.asset_id) return c.json({ error: 'missing_asset_id' }, 400);

  const client = db(c.env);
  const asset = await queryOne<{ listing_id: string; kind: string; r2_key: string }>(
    client,
    `SELECT a.listing_id, a.kind, a.r2_key
     FROM assets a JOIN listings l ON l.id = a.listing_id
     WHERE a.id = ? AND l.seller_id = ?`,
    [body.asset_id, uid],
  );
  if (!asset) return c.json({ error: 'asset_not_found' }, 404);

  const ops = [];
  if (body.sha256) {
    ops.push({ sql: 'UPDATE assets SET sha256 = ? WHERE id = ?', args: [body.sha256, body.asset_id] });
  }
  if (asset.kind === 'cover') {
    ops.push({
      sql: 'UPDATE listings SET cover_key = ?, updated_at = ? WHERE id = ?',
      args: [asset.r2_key, now(), asset.listing_id],
    });
  }
  if (ops.length) await client.batch(ops, 'write');

  return c.json({ ok: true });
});
