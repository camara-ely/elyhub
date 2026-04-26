// /listings/* — marketplace reads, purchases, and create/publish.
//
// Public reads (GET /listings, GET /listings/:id) don't need auth —
// the marketplace is browsable without signing in. Everything else
// (purchase, create, update) is gated.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId, getLiveBalance } from '../auth';
import { db, exec, now, queryAll, queryOne } from '../db';
import { signCoverUrl } from '../r2';
import { issueLicense } from '../lib/kassa-licensing';

// Resolve cover_key → cover_url (presigned GET, 1h TTL). Done at response
// time so the URL is always fresh. We sign in parallel across the feed
// to avoid serializing N round-trips.
async function attachCoverUrls<T extends { cover_key?: string | null }>(
  env: Env, rows: T[],
): Promise<(T & { cover_url: string | null })[]> {
  return Promise.all(
    rows.map(async (row) => {
      const key = row.cover_key;
      if (!key) return { ...row, cover_url: null };
      try {
        const cover_url = await signCoverUrl(env, key);
        return { ...row, cover_url };
      } catch {
        // Signing shouldn't fail unless env is broken; degrade gracefully.
        return { ...row, cover_url: null };
      }
    }),
  );
}

export const listingRoutes = new Hono<{ Bindings: Env }>();

// GET /listings — public feed. Supports ?type= and ?limit=.
// Returns published listings only.
listingRoutes.get('/', async (c: AppContext) => {
  const type = c.req.query('type');
  const limit = Math.min(Number(c.req.query('limit') || 50), 200);

  let sql = `SELECT id, seller_id, type, title, tagline, price_aura, billing,
                    level_req, tags, cover_key, featured, downloads, created_at,
                    kassa_product_id, kassa_tier,
                    github_repo, current_version, current_version_url
             FROM listings
             WHERE status = 'published'`;
  const args: (string | number)[] = [];
  if (type) {
    sql += ' AND type = ?';
    args.push(type);
  }
  sql += ' ORDER BY featured DESC, downloads DESC, created_at DESC LIMIT ?';
  args.push(limit);

  const rows = await queryAll<{ cover_key: string | null }>(db(c.env), sql, args);
  const items = await attachCoverUrls(c.env, rows);
  return c.json({ items });
});

// GET /listings/:id — full detail including assets list. Public too, so
// unauthenticated browsers can see the marketplace before signing in.
listingRoutes.get('/:id', async (c: AppContext) => {
  const id = c.req.param('id')!;
  const client = db(c.env);

  const listing = await queryOne(
    client,
    `SELECT id, seller_id, type, title, tagline, description, price_aura, billing,
            level_req, tags, cover_key, featured, status, downloads, created_at, updated_at,
            kassa_product_id, kassa_tier,
            github_repo, current_version, current_version_url,
            current_version_notes, current_version_published_at
     FROM listings WHERE id = ?`,
    [id],
  );
  if (!listing) return c.json({ error: 'not_found' }, 404);

  // Resolve cover → presigned URL (1h TTL) for direct <img> consumption.
  const coverKey = (listing as { cover_key?: string | null }).cover_key;
  let cover_url: string | null = null;
  if (coverKey) {
    try { cover_url = await signCoverUrl(c.env, coverKey); } catch { cover_url = null; }
  }

  // Assets list — we return the metadata but NOT the R2 keys; the
  // client must go through /downloads/:asset_id to get a signed URL,
  // which enforces entitlement.
  const assets = await queryAll(
    client,
    'SELECT id, kind, filename, size_bytes, content_type, sha256, created_at FROM assets WHERE listing_id = ?',
    [id],
  );

  return c.json({ ...listing, cover_url, assets });
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
    queryOne<{
      id: string; seller_id: string; price_aura: number; status: string; level_req: number;
      title: string; kassa_product_id: string | null; kassa_tier: string | null;
    }>(
      client,
      `SELECT id, seller_id, price_aura, status, level_req, title,
              kassa_product_id, kassa_tier
       FROM listings WHERE id = ?`,
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
  const already = await queryOne<{ acquired_at: number; license_key: string | null }>(
    client,
    'SELECT acquired_at, license_key FROM user_library WHERE user_id = ? AND listing_id = ?',
    [uid, lid],
  );
  if (already) {
    return c.json({
      ok: true,
      already_owned: true,
      acquired_at: already.acquired_at,
      license_key: already.license_key,
    });
  }

  // Transaction — libsql `batch` runs the statements atomically. No
  // UPDATE on users.aura: live balance is derived from SUM(purchases)
  // at read time, so the INSERT INTO purchases IS the debit.
  //
  // If the listing is a Kassa product, the license_issuance_queue row
  // is INSERTed in the SAME batch. This is the outbox pattern: even if
  // the Supabase call below fails or times out, the queue row exists
  // and the cron worker will retry. The aura debit and the license
  // obligation move together atomically.
  const purchaseId = crypto.randomUUID();
  const t = now();
  const isKassa = !!listing.kassa_product_id;
  const queueId = isKassa ? crypto.randomUUID() : null;

  const batch: { sql: string; args: (string | number | null)[] }[] = [
    { sql: 'INSERT INTO purchases (id, user_id, listing_id, aura_amount, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [purchaseId, uid, lid, listing.price_aura, t] },
    { sql: 'INSERT INTO user_library (user_id, listing_id, acquired_at) VALUES (?, ?, ?)',
      args: [uid, lid, t] },
    { sql: 'UPDATE listings SET downloads = downloads + 1, updated_at = ? WHERE id = ?',
      args: [t, lid] },
  ];
  if (isKassa) {
    batch.push({
      sql: `INSERT INTO license_issuance_queue
              (id, purchase_id, user_id, listing_id, kassa_product_id,
               kassa_tier, product_name, amount_aura, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        queueId!, purchaseId, uid, lid,
        listing.kassa_product_id!, listing.kassa_tier,
        listing.title, listing.price_aura, t,
      ],
    });
  }
  await client.batch(batch, 'write');

  // Best-effort synchronous emission — if it succeeds, the user sees
  // the license_key immediately. If it fails, the queue row stays put
  // and the cron worker drains it. We never fail the purchase here;
  // the aura was already debited atomically.
  let license_key: string | null = null;
  let license_pending = false;
  if (isKassa) {
    license_pending = true;
    try {
      const res = await issueLicense(c.env, {
        user_id: uid,
        product_id: listing.kassa_product_id!,
        tier: listing.kassa_tier,
        purchase_id: purchaseId,
        product_name: listing.title,
        amount_cents: listing.price_aura,
        currency: 'AURA',
      });
      if (res.ok && res.license_key) {
        license_key = res.license_key;
        license_pending = false;
        const writes: { sql: string; args: (string | number | null)[] }[] = [
          { sql: 'UPDATE user_library SET license_key = ? WHERE user_id = ? AND listing_id = ?',
            args: [license_key, uid, lid] },
          { sql: `UPDATE license_issuance_queue
                  SET completed_at = ?, attempts = attempts + 1,
                      last_attempt_at = ?
                  WHERE id = ?`,
            args: [t, t, queueId!] },
        ];
        // Persist the plaintext key in user_license_keys (canonical store,
        // decoupled from listings — see /me/licenses Reveal flow). Also emit
        // a marketplace_event so the bot DMs the buyer with the full key
        // and posts a masked audit row to the events channel.
        if (res.license_id) {
          writes.push({
            sql: `INSERT INTO user_license_keys
                    (license_id, user_id, license_key, product_id, source, created_at)
                  VALUES (?, ?, ?, ?, 'purchase', ?)
                  ON CONFLICT(license_id) DO UPDATE SET license_key = excluded.license_key`,
            args: [res.license_id, uid, license_key, listing.kassa_product_id!, t],
          });
        }
        const eventId = crypto.randomUUID();
        const eventData = JSON.stringify({
          productId: listing.kassa_product_id,
          tier: listing.kassa_tier,
          listingTitle: listing.title,
          purchaseId,
          licenseId: res.license_id,
          licenseKey: license_key,
          keyPreview: res.key_preview,
          expiresAt: res.expires_at,
          amountAura: listing.price_aura,
        });
        writes.push({
          sql: `INSERT INTO marketplace_events
                  (id, kind, actor_id, data, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [eventId, 'license_purchased', uid, eventData, t],
        });
        await client.batch(writes, 'write');
      } else {
        await exec(
          client,
          `UPDATE license_issuance_queue
             SET attempts = attempts + 1, last_attempt_at = ?, last_error = ?
             WHERE id = ?`,
          [now(), res.error ?? 'unknown', queueId!],
        );
      }
    } catch (err) {
      console.error('[kassa] issueLicense threw — queue will retry', err);
      await exec(
        client,
        `UPDATE license_issuance_queue
           SET attempts = attempts + 1, last_attempt_at = ?, last_error = ?
           WHERE id = ?`,
        [now(), err instanceof Error ? err.message : String(err), queueId!],
      );
    }
  }

  return c.json({
    ok: true,
    purchase_id: purchaseId,
    acquired_at: t,
    license_key,
    license_pending,
  });
});

// POST /listings — create a draft. The actual files are uploaded via
// /uploads/* before the listing is published.
listingRoutes.post('/', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  let body: {
    type?: string; title?: string; tagline?: string; description?: string;
    price_aura?: number; billing?: string; level_req?: number; tags?: string[];
    // Kassa-backed listing: when present, buying this listing issues a license
    // via kc_issue_license. kassa_product_id is a unique string identifier
    // (e.g. "gleipnir", "my-plugin"); kassa_tier is optional ("basic"/"pro").
    kassa_product_id?: string;
    kassa_tier?: string;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  if (!body.type || !body.title) return c.json({ error: 'missing_fields' }, 400);
  if (typeof body.price_aura !== 'number' || body.price_aura < 0) {
    return c.json({ error: 'invalid_price' }, 400);
  }

  // Kassa fields: only validated if provided. product_id must be URL-safe
  // (kebab-case), unique across all listings, and non-trivial length. Tier is
  // free-form but bounded. We don't require both together — tier without
  // product_id is nonsense and rejected; product_id alone is fine (single-tier
  // product).
  const client = db(c.env);
  let kassaProductId: string | null = null;
  let kassaTier: string | null = null;
  if (body.kassa_tier && !body.kassa_product_id) {
    return c.json({ error: 'kassa_tier_requires_product_id' }, 400);
  }
  if (body.kassa_product_id) {
    const pid = String(body.kassa_product_id).trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(pid)) {
      return c.json({ error: 'invalid_product_id', detail: 'kebab-case, 2-40 chars' }, 400);
    }
    const clash = await queryOne<{ id: string; seller_id: string }>(
      client,
      'SELECT id, seller_id FROM listings WHERE kassa_product_id = ? LIMIT 1',
      [pid],
    );
    if (clash && clash.seller_id !== uid) {
      return c.json({ error: 'product_id_taken' }, 409);
    }
    kassaProductId = pid;
    if (body.kassa_tier) {
      const tier = String(body.kassa_tier).trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{0,23}$/.test(tier)) {
        return c.json({ error: 'invalid_tier', detail: 'lowercase alnum/dash, 1-24 chars' }, 400);
      }
      kassaTier = tier;
    }
  }

  const id = crypto.randomUUID();
  const t = now();
  await exec(
    client,
    `INSERT INTO listings
       (id, seller_id, type, title, tagline, description, price_aura, billing,
        level_req, tags, status, kassa_product_id, kassa_tier, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    [
      id, uid, body.type, body.title, body.tagline ?? null, body.description ?? null,
      body.price_aura, body.billing ?? 'one-time', body.level_req ?? 1,
      body.tags ? JSON.stringify(body.tags) : null,
      kassaProductId, kassaTier, t, t,
    ],
  );
  return c.json({ id, status: 'draft', kassa_product_id: kassaProductId, kassa_tier: kassaTier });
});

// POST /listings/:id/github — seller attaches (or clears) a GitHub repo to
// a listing for auto-update. Validated as "owner/name" (alnum/dash/dot/_).
// Token is optional — only needed for private repos. Storing the token in
// plaintext is a temporary tradeoff; encryption-at-rest is a follow-up.
// Polling happens via the cron worker (see lib/github-releases.ts).
listingRoutes.post('/:id/github', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  let body: { github_repo?: string | null; github_token?: string | null };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }

  const client = db(c.env);
  const owned = await queryOne<{ seller_id: string }>(
    client, 'SELECT seller_id FROM listings WHERE id = ?', [lid],
  );
  if (!owned) return c.json({ error: 'not_found' }, 404);
  if (owned.seller_id !== uid) return c.json({ error: 'forbidden' }, 403);

  const repoRaw = body.github_repo;
  let repo: string | null = null;
  if (repoRaw != null && repoRaw !== '') {
    const trimmed = String(repoRaw).trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
      return c.json({ error: 'invalid_repo', detail: 'expected "owner/name"' }, 400);
    }
    repo = trimmed;
  }
  // If repo cleared, also reset the cached version + token. Empty string
  // for token means "keep existing"; null/undefined means "clear".
  const token = body.github_token === undefined ? undefined : (body.github_token ?? null);
  const t = Date.now();
  if (repo === null) {
    await exec(
      client,
      `UPDATE listings
          SET github_repo = NULL,
              github_token = NULL,
              current_version = NULL,
              current_version_url = NULL,
              current_version_notes = NULL,
              current_version_published_at = NULL,
              github_last_polled_at = NULL,
              github_last_error = NULL,
              updated_at = ?
        WHERE id = ?`,
      [t, lid],
    );
  } else if (token === undefined) {
    // Repo set, token unchanged.
    await exec(
      client,
      `UPDATE listings
          SET github_repo = ?, github_last_polled_at = NULL, github_last_error = NULL, updated_at = ?
        WHERE id = ?`,
      [repo, t, lid],
    );
  } else {
    await exec(
      client,
      `UPDATE listings
          SET github_repo = ?, github_token = ?, github_last_polled_at = NULL, github_last_error = NULL, updated_at = ?
        WHERE id = ?`,
      [repo, token, t, lid],
    );
  }
  return c.json({ ok: true, github_repo: repo });
});

// GET /listings/:id/release/download — proxy a release-asset download through
// the Worker. Needed because:
//   • Private GitHub repos return 404 on the public release-asset URL — only
//     authenticated GET to /repos/:owner/:repo/releases/assets/:id with
//     Accept: application/octet-stream returns the binary (302 → S3).
//   • Even for public repos, the browser blocks the cross-origin redirect to
//     codeload.githubusercontent.com / objects.githubusercontent.com via CORS.
// We auth the user, verify entitlement (user_library row), then fetch with the
// listing's github_token (or the global GITHUB_TOKEN fallback) and stream the
// bytes straight back. No buffering — release zips can be hundreds of MB.
listingRoutes.get('/:id/release/download', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  const client = db(c.env);

  const row = await queryOne<{
    current_version: string | null;
    current_version_url: string | null;
    github_repo: string | null;
    github_token: string | null;
    title: string;
  }>(
    client,
    `SELECT current_version, current_version_url, github_repo, github_token, title
       FROM listings WHERE id = ?`,
    [lid],
  );
  if (!row) return c.json({ error: 'listing_not_found' }, 404);
  if (!row.current_version_url || !row.github_repo) {
    return c.json({ error: 'no_release_yet' }, 404);
  }

  // Entitlement: must own the listing (user_library row exists).
  const owned = await queryOne<{ user_id: string }>(
    client,
    `SELECT user_id FROM user_library WHERE user_id = ? AND listing_id = ?`,
    [uid, lid],
  );
  if (!owned) return c.json({ error: 'not_owned' }, 403);

  const token = row.github_token || c.env.GITHUB_TOKEN;
  // We bundle every asset attached to the release (.dmg, .zip, etc.) into a
  // single STORE-mode zip and stream it back to the client. STORE (no deflate)
  // is fine because the assets are already compressed (.dmg, .zip), and it
  // lets us stream without buffering hundreds of MB in memory.
  //
  // Source archives (zipball_url/tarball_url) live OUTSIDE assets[], so they
  // are excluded automatically — we ship only what the seller uploaded.
  //
  // Per asset:
  //   1. resolve to signed S3 URL via API:
  //      GET api.github.com/repos/:o/:r/releases/assets/:id
  //      Accept: octet-stream  → 302 to objects.githubusercontent.com.
  //      The S3 host rejects requests carrying our GH Authorization header,
  //      so we hop1 with redirect:'manual', then hop2 plain.
  //   2. stream bytes through CRC32 → ZIP local-file-header + data + data
  //      descriptor. Build central directory entries on the side.
  //   3. after all assets, write the central directory + EOCD.
  const apiHeaders: Record<string, string> = {
    'User-Agent': 'ElyHub-API',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) apiHeaders['Authorization'] = `Bearer ${token}`;

  const m = row.current_version_url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/,
  );
  if (!m) {
    console.log(`[release-dl] cannot parse url=${row.current_version_url}`);
    return c.json({ error: 'bad_url' }, 502);
  }
  const [, owner, name, tag] = m;
  console.log(`[release-dl] listing=${lid} owner=${owner} name=${name} tag=${tag} hasToken=${!!token}`);

  const relRes = await fetch(
    `https://api.github.com/repos/${owner}/${name}/releases/tags/${encodeURIComponent(tag)}`,
    { headers: apiHeaders },
  );
  console.log(`[release-dl] release-lookup status=${relRes.status}`);
  if (!relRes.ok) {
    const detail = await relRes.text().catch(() => '');
    return c.json({ error: 'release_lookup_failed', status: relRes.status, detail: detail.slice(0, 200) }, 502);
  }
  const relJson = await relRes.json() as { assets?: { id: number; name: string; size?: number }[] };
  const assets = relJson.assets ?? [];
  if (!assets.length) {
    return c.json({ error: 'no_assets' }, 404);
  }

  const dlHeaders: Record<string, string> = {
    'User-Agent': 'ElyHub-API',
    'Accept': 'application/octet-stream',
  };
  if (token) dlHeaders['Authorization'] = `Bearer ${token}`;

  // Resolve each asset to a streamable Response BEFORE we open the response
  // stream — that way if any one 4xx's we can fail fast with a JSON error
  // instead of a half-written zip.
  const sources: { name: string; res: Response }[] = [];
  for (const a of assets) {
    const assetApi = `https://api.github.com/repos/${owner}/${name}/releases/assets/${a.id}`;
    const hop1 = await fetch(assetApi, { headers: dlHeaders, redirect: 'manual' });
    let res: Response;
    if (hop1.status >= 300 && hop1.status < 400) {
      const loc = hop1.headers.get('location');
      if (!loc) {
        return c.json({ error: 'upstream_failed', asset: a.name, detail: 'redirect missing Location' }, 502);
      }
      res = await fetch(loc, { headers: { 'User-Agent': 'ElyHub-API' }, redirect: 'follow' });
    } else {
      res = hop1;
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      console.log(`[release-dl] asset ${a.name} FAILED status=${res.status} detail=${detail.slice(0,200)}`);
      return c.json({ error: 'upstream_failed', asset: a.name, status: res.status }, 502);
    }
    sources.push({ name: a.name, res });
  }
  console.log(`[release-dl] zipping ${sources.length} assets: ${sources.map((s) => s.name).join(', ')}`);

  // CRC32 table — IEEE polynomial 0xEDB88320 (zip, gzip, png).
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c2 = i;
    for (let j = 0; j < 8; j++) c2 = (c2 & 1) ? (0xEDB88320 ^ (c2 >>> 1)) : (c2 >>> 1);
    crcTable[i] = c2 >>> 0;
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Run the producer detached — the response stream returns immediately and
  // bytes flow as they're fetched. ctx.waitUntil so the Worker stays alive
  // until the zip finishes even after the response object is "returned".
  const produce = (async () => {
    try {
      let offset = 0;
      const central: { entry: Uint8Array }[] = [];

      for (const s of sources) {
        const nameBytes = encoder.encode(s.name);
        const localOffset = offset;
        // Local file header — we use GP-flag bit 3 (data descriptor) so we
        // can write CRC + sizes AFTER the data, computed on the fly.
        const lh = new Uint8Array(30 + nameBytes.length);
        const dv = new DataView(lh.buffer);
        dv.setUint32(0, 0x04034b50, true);
        dv.setUint16(4, 20, true);     // version needed
        dv.setUint16(6, 0x0008, true); // GP flag (bit 3 = streaming sizes)
        dv.setUint16(8, 0, true);      // method = STORE
        dv.setUint16(10, 0, true);     // mtime
        dv.setUint16(12, 0x21, true);  // mdate (1980-01-01)
        dv.setUint32(14, 0, true);     // crc (placeholder)
        dv.setUint32(18, 0, true);     // compressed size (placeholder)
        dv.setUint32(22, 0, true);     // uncompressed size (placeholder)
        dv.setUint16(26, nameBytes.length, true);
        dv.setUint16(28, 0, true);
        lh.set(nameBytes, 30);
        await writer.write(lh);
        offset += lh.length;

        let crc = 0xffffffff;
        let size = 0;
        const reader = s.res.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (let i = 0; i < value.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ value[i]) & 0xff];
          }
          size += value.length;
          await writer.write(value);
          offset += value.length;
        }
        crc = (crc ^ 0xffffffff) >>> 0;

        // Data descriptor (with signature, 16 bytes total).
        const dd = new Uint8Array(16);
        const ddv = new DataView(dd.buffer);
        ddv.setUint32(0, 0x08074b50, true);
        ddv.setUint32(4, crc, true);
        ddv.setUint32(8, size, true);
        ddv.setUint32(12, size, true);
        await writer.write(dd);
        offset += dd.length;

        // Build central directory record (written at end).
        const cd = new Uint8Array(46 + nameBytes.length);
        const cdv = new DataView(cd.buffer);
        cdv.setUint32(0, 0x02014b50, true);
        cdv.setUint16(4, 20, true);     // version made by
        cdv.setUint16(6, 20, true);     // version needed
        cdv.setUint16(8, 0x0008, true); // GP flag
        cdv.setUint16(10, 0, true);     // method
        cdv.setUint16(12, 0, true);     // mtime
        cdv.setUint16(14, 0x21, true);  // mdate
        cdv.setUint32(16, crc, true);
        cdv.setUint32(20, size, true);
        cdv.setUint32(24, size, true);
        cdv.setUint16(28, nameBytes.length, true);
        cdv.setUint16(30, 0, true);     // extra
        cdv.setUint16(32, 0, true);     // comment
        cdv.setUint16(34, 0, true);     // disk #
        cdv.setUint16(36, 0, true);     // internal attrs
        cdv.setUint32(38, 0, true);     // external attrs
        cdv.setUint32(42, localOffset, true);
        cd.set(nameBytes, 46);
        central.push({ entry: cd });
      }

      const cdStart = offset;
      let cdSize = 0;
      for (const cd of central) {
        await writer.write(cd.entry);
        cdSize += cd.entry.length;
      }

      // End of Central Directory record.
      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(4, 0, true);
      ev.setUint16(6, 0, true);
      ev.setUint16(8, central.length, true);
      ev.setUint16(10, central.length, true);
      ev.setUint32(12, cdSize, true);
      ev.setUint32(16, cdStart, true);
      ev.setUint16(20, 0, true);
      await writer.write(eocd);

      await writer.close();
    } catch (e) {
      console.log(`[release-dl] zip stream errored: ${(e as Error).message}`);
      try { await writer.abort(e); } catch {}
    }
  })();
  c.executionCtx.waitUntil(produce);

  const safeTitle = (row.title || 'release').replace(/[^\w.-]+/g, '-').slice(0, 60);
  const filename = `${safeTitle}-${row.current_version || 'latest'}.zip`;
  const respHeaders = new Headers();
  respHeaders.set('Content-Type', 'application/zip');
  respHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
  respHeaders.set('Cache-Control', 'private, max-age=0');
  return new Response(readable, { status: 200, headers: respHeaders });
});

// GET /listings/:id/release/latest — return the current cached release info
// for a listing. Public read (anyone can see what version is current); the
// download URL is the asset's GitHub URL (public on GitHub for public repos;
// for private repos, the token-bearing API call will need a different flow).
listingRoutes.get('/:id/release/latest', async (c: AppContext) => {
  const lid = c.req.param('id')!;
  const row = await queryOne<{
    current_version: string | null;
    current_version_url: string | null;
    current_version_notes: string | null;
    current_version_published_at: number | null;
    github_repo: string | null;
  }>(
    db(c.env),
    `SELECT current_version, current_version_url, current_version_notes,
            current_version_published_at, github_repo
       FROM listings WHERE id = ?`,
    [lid],
  );
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({
    version: row.current_version,
    url: row.current_version_url,
    notes: row.current_version_notes,
    published_at: row.current_version_published_at,
    github_repo: row.github_repo,
  });
});

// DELETE /listings/:id — seller unpublish. Soft-delete: flips status to
// 'removed'. We don't hard-delete because purchases + user_library rows
// still reference this id, and existing owners should keep being able to
// download what they bought. The public feed filters on status='published'
// so it disappears from browse naturally. Idempotent — deleting a listing
// that's already 'removed' still returns ok.
listingRoutes.delete('/:id', requireAuth(), async (c: AppContext) => {
  const uid = userId(c);
  const lid = c.req.param('id')!;
  const client = db(c.env);
  const l = await queryOne<{ seller_id: string; status: string }>(
    client, 'SELECT seller_id, status FROM listings WHERE id = ?', [lid],
  );
  if (!l) return c.json({ error: 'not_found' }, 404);
  if (l.seller_id !== uid) return c.json({ error: 'forbidden' }, 403);
  if (l.status !== 'removed') {
    await exec(
      client,
      "UPDATE listings SET status = 'removed', updated_at = ? WHERE id = ?",
      [now(), lid],
    );
  }
  return c.json({ ok: true });
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
