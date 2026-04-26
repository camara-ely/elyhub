// /maker/* — seller-scoped analytics for marketplace listings with
// licensing. Every endpoint is gated by `requireAuth` and scoped to the
// caller's own listings (seller_id = session.uid). Safe to expose to any
// authenticated user — results are always their own data.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId } from '../auth';
import { db, queryAll, queryOne } from '../db';

export const makerRoutes = new Hono<{ Bindings: Env }>();
makerRoutes.use('*', requireAuth());

interface ListingRow {
  id: string;
  title: string;
  cover_key: string | null;
  price_aura: number;
  status: string;
  kassa_product_id: string;
  kassa_tier: string | null;
  created_at: number;
}

// GET /maker/overview — one-stop dashboard payload.
//
// Aggregates:
//   • All my listings that have a kassa_product_id (Kassa-backed products)
//   • Per-product license counts (active / revoked) via Supabase PostgREST
//   • Per-product revenue: SUM(purchases.aura_amount) joined on listing_id
//   • Grand totals across all products
//
// Returns { products: [...], totals: {...} }. The Supabase query runs in
// parallel with the Turso revenue query. Both failures degrade gracefully:
// if Supabase errors, license counts come back as null rather than failing
// the whole response — the rest of the card still renders.
makerRoutes.get('/overview', async (c: AppContext) => {
  const uid = userId(c);
  const client = db(c.env);

  const products = await queryAll<ListingRow>(
    client,
    `SELECT id, title, cover_key, price_aura, status,
            kassa_product_id, kassa_tier, created_at
     FROM listings
     WHERE seller_id = ? AND kassa_product_id IS NOT NULL AND status != 'removed'
     ORDER BY created_at DESC`,
    [uid],
  );

  if (products.length === 0) {
    return c.json({
      products: [],
      totals: { products: 0, licenses_active: 0, licenses_total: 0, revenue_aura: 0 },
    });
  }

  // ── Revenue per listing (Turso) ──────────────────────────────────────────
  const listingIds = products.map((p) => p.id);
  const revenueRows = await queryAll<{ listing_id: string; revenue: number; sales: number }>(
    client,
    `SELECT listing_id, COALESCE(SUM(aura_amount), 0) AS revenue, COUNT(*) AS sales
     FROM purchases
     WHERE listing_id IN (${listingIds.map(() => '?').join(',')})
     GROUP BY listing_id`,
    listingIds,
  );
  const revByListing = new Map<string, { revenue: number; sales: number }>();
  for (const r of revenueRows) revByListing.set(r.listing_id, { revenue: r.revenue, sales: r.sales });

  // ── License counts per product (Supabase) ────────────────────────────────
  // Query kc_licenses directly via PostgREST — lighter than paginating
  // kc_admin_list_licenses for each product. We filter by product_id in a
  // single `in.(...)` request and count client-side.
  interface LicenseRow { product_id: string; revoked_at: string | null }
  const base = c.env.KC_SUPABASE_URL.replace(/\/$/, '');
  const productIds = products.map((p) => p.kassa_product_id);
  const inList = productIds.map((p) => `"${p.replace(/"/g, '')}"`).join(',');

  const countsByProduct = new Map<string, { active: number; total: number }>();
  try {
    const url =
      `${base}/rest/v1/kc_licenses` +
      `?product_id=in.(${inList})` +
      `&select=product_id,revoked_at` +
      `&limit=10000`;
    const res = await fetch(url, {
      headers: {
        apikey: c.env.KC_SUPABASE_ANON_KEY,
        authorization: `Bearer ${c.env.KC_SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const rows = (await res.json()) as LicenseRow[];
      for (const pid of productIds) countsByProduct.set(pid, { active: 0, total: 0 });
      for (const lic of rows) {
        const c2 = countsByProduct.get(lic.product_id);
        if (!c2) continue;
        c2.total += 1;
        if (!lic.revoked_at) c2.active += 1;
      }
    } else {
      console.warn('[maker] kc_licenses fetch failed', res.status);
    }
  } catch (err) {
    console.warn('[maker] kc_licenses fetch threw:', (err as Error).message);
  }

  // ── Assemble per-product cards ───────────────────────────────────────────
  let totalActive = 0, totalLicenses = 0, totalRevenue = 0;
  const out = products.map((p) => {
    const rev = revByListing.get(p.id);
    const counts = countsByProduct.get(p.kassa_product_id);
    const active = counts?.active ?? null;
    const total = counts?.total ?? null;
    const revenue = rev?.revenue ?? 0;
    if (active != null) totalActive += active;
    if (total != null) totalLicenses += total;
    totalRevenue += revenue;
    return {
      listing_id: p.id,
      product_id: p.kassa_product_id,
      tier: p.kassa_tier,
      title: p.title,
      cover_key: p.cover_key,
      price_aura: p.price_aura,
      status: p.status,
      created_at: p.created_at,
      sales: rev?.sales ?? 0,
      revenue_aura: revenue,
      licenses_active: active,
      licenses_total: total,
    };
  });

  return c.json({
    products: out,
    totals: {
      products: products.length,
      licenses_active: totalActive,
      licenses_total: totalLicenses,
      revenue_aura: totalRevenue,
    },
  });
});

// GET /maker/licenses — recent licenses issued for this maker's products.
// Paginated (limit/offset). Used by the dashboard "recent activity" feed.
// Never returns plaintext keys — only preview + metadata.
makerRoutes.get('/licenses', async (c: AppContext) => {
  const uid = userId(c);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 25)));
  const offset = Math.max(0, Number(c.req.query('offset') || 0));
  const productFilter = c.req.query('product_id') || null;

  const client = db(c.env);
  // First: figure out which product_ids belong to me.
  const myRows = await queryAll<{ kassa_product_id: string }>(
    client,
    `SELECT DISTINCT kassa_product_id FROM listings
     WHERE seller_id = ? AND kassa_product_id IS NOT NULL`,
    [uid],
  );
  let myProducts = myRows.map((r) => r.kassa_product_id);
  if (productFilter) {
    // Intersect with the requested filter — stops a client from poking at
    // someone else's product_id by setting it in the query string.
    myProducts = myProducts.filter((p) => p === productFilter);
  }
  if (myProducts.length === 0) return c.json({ items: [], total: 0 });

  // Query Supabase for recent licenses in those products.
  const base = c.env.KC_SUPABASE_URL.replace(/\/$/, '');
  const inList = myProducts.map((p) => `"${p.replace(/"/g, '')}"`).join(',');
  const url =
    `${base}/rest/v1/kc_licenses` +
    `?product_id=in.(${inList})` +
    `&select=id,user_id,product_id,tier,key_preview,issued_at,expires_at,revoked_at,source` +
    `&order=issued_at.desc` +
    `&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: {
      apikey: c.env.KC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${c.env.KC_SUPABASE_ANON_KEY}`,
      prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    console.warn('[maker] licenses fetch failed', res.status);
    return c.json({ error: 'fetch_failed' }, 502);
  }
  const total = Number((res.headers.get('content-range') || '').split('/')[1] || '0');
  const items = await res.json();
  return c.json({ items, total, limit, offset });
});
