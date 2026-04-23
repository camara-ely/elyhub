// /downloads/* — entitlement-gated signed GET URLs for R2 assets.
//
// This is THE hot path for the plugin: user drags a pack onto their
// timeline, plugin needs the file, plugin hits this endpoint, we check
// "does user X own listing Y" in one SQL query, return a short-lived
// signed R2 URL, plugin downloads + caches locally.
//
// Previews (the low-quality watermarked sample) are NOT gated — anyone
// browsing the marketplace should be able to hear them. Cover images
// are also ungated for the same reason. Only `kind = 'pack'` goes
// through ownership check.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId } from '../auth';
import { db, queryOne } from '../db';
import { signGetUrl } from '../r2';

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// Public (cover + preview): no auth needed. Still signs a URL with a
// short TTL so the R2 key isn't guessable / archivable.
downloadRoutes.get('/public/:asset_id', async (c: AppContext) => {
  const aid = c.req.param('asset_id')!;
  const asset = await queryOne<{ kind: string; r2_key: string }>(
    db(c.env),
    'SELECT kind, r2_key FROM assets WHERE id = ?',
    [aid],
  );
  if (!asset) return c.json({ error: 'not_found' }, 404);
  if (asset.kind !== 'cover' && asset.kind !== 'preview' && asset.kind !== 'screenshot') {
    return c.json({ error: 'private_asset', hint: 'use /downloads/:asset_id with auth' }, 403);
  }
  const url = await signGetUrl(c.env, asset.r2_key);
  return c.redirect(url, 302);
});

// Entitled (pack): auth required. SQL joins user_library to enforce
// ownership in one round-trip — if the user doesn't own it, the
// SELECT returns zero rows and we 403.
downloadRoutes.get('/:asset_id', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const aid = c.req.param('asset_id')!;

  const asset = await queryOne<{ kind: string; r2_key: string; listing_id: string }>(
    db(c.env),
    `SELECT a.kind, a.r2_key, a.listing_id
     FROM assets a
     LEFT JOIN user_library ul
       ON ul.listing_id = a.listing_id AND ul.user_id = ?
     WHERE a.id = ?
       AND (a.kind IN ('cover', 'preview', 'screenshot') OR ul.user_id IS NOT NULL)`,
    [uid, aid],
  );
  if (!asset) {
    // Either the asset doesn't exist, OR the user doesn't own the
    // containing listing. We intentionally don't distinguish the two —
    // leaking "this asset exists but you can't have it" is an info leak.
    return c.json({ error: 'not_found_or_forbidden' }, 404);
  }

  const url = await signGetUrl(c.env, asset.r2_key);
  return c.redirect(url, 302);
});

// Variant that returns the URL in JSON instead of a 302. Useful when
// the client needs to show a progress bar or pre-flight the HEAD.
downloadRoutes.get('/:asset_id/url', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const aid = c.req.param('asset_id')!;
  const asset = await queryOne<{ r2_key: string }>(
    db(c.env),
    `SELECT a.r2_key
     FROM assets a
     LEFT JOIN user_library ul
       ON ul.listing_id = a.listing_id AND ul.user_id = ?
     WHERE a.id = ?
       AND (a.kind IN ('cover', 'preview', 'screenshot') OR ul.user_id IS NOT NULL)`,
    [uid, aid],
  );
  if (!asset) return c.json({ error: 'not_found_or_forbidden' }, 404);
  const url = await signGetUrl(c.env, asset.r2_key);
  return c.json({ url, expires_in: 300 });
});
