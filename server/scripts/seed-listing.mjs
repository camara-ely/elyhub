#!/usr/bin/env node
// Seed a couple of demo listings with a fake seller so we can exercise
// the marketplace end-to-end (GET /listings, purchase, library).
//
// Usage:
//   TURSO_URL=... TURSO_TOKEN=... node scripts/seed-listing.mjs
//
// Idempotent — re-running is a no-op (INSERT OR IGNORE on fixed ids).

const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Missing TURSO_URL / TURSO_TOKEN env vars');
  process.exit(1);
}
const httpBase = TURSO_URL.replace(/^libsql:\/\//, 'https://').replace(/\/$/, '');

async function exec(sql, args = []) {
  const res = await fetch(`${httpBase}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: args.map((v) =>
              v === null || v === undefined
                ? { type: 'null' }
                : typeof v === 'number' && Number.isInteger(v)
                  ? { type: 'integer', value: String(v) }
                  : { type: 'text', value: String(v) },
            ),
          },
        },
        { type: 'close' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`turso http ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const r = body.results?.[0];
  if (r?.type === 'error') throw new Error(`SQL error: ${r.error?.message}`);
  return r?.response?.result;
}

const t = Date.now();

// Fake seller — distinguishable ID so it can't collide with a real Discord
// snowflake (those are >= 17 digits and numeric).
const SELLER = {
  id: 'demo-seller-0001',
  username: 'demo_seller',
  global_name: 'Demo Seller',
};

// Two listings: one cheap (so the 656k-aura user can actually buy it),
// one pricey (so we can test insufficient-aura failure modes later).
const LISTINGS = [
  {
    id: 'demo-pack-sfx-0001',
    seller_id: SELLER.id,
    type: 'sfx',
    title: 'Demo SFX Pack',
    tagline: 'Ten clean UI sounds for your prototypes.',
    description: 'A tiny pack we seeded to smoke-test the marketplace flow. Not for distribution.',
    price_aura: 100,
    billing: 'one-time',
    level_req: 1,
    tags: JSON.stringify(['demo', 'sfx', 'ui']),
    status: 'published',
  },
  {
    id: 'demo-pack-pro-0002',
    seller_id: SELLER.id,
    type: 'plugin',
    title: 'Pro Demo Plugin',
    tagline: 'Expensive test listing for the insufficient-aura path.',
    description: 'Priced high on purpose — you should not be able to buy this.',
    price_aura: 10_000_000,
    billing: 'one-time',
    level_req: 1,
    tags: JSON.stringify(['demo', 'plugin']),
    status: 'published',
  },
];

async function main() {
  console.log('→ upserting demo seller');
  await exec(
    `INSERT OR IGNORE INTO users
       (id, username, global_name, avatar_hash, aura, level, created_at, last_seen_at)
     VALUES (?, ?, ?, NULL, 0, 1, ?, ?)`,
    [SELLER.id, SELLER.username, SELLER.global_name, t, t],
  );

  for (const l of LISTINGS) {
    console.log(`→ upserting listing ${l.id}`);
    await exec(
      `INSERT OR IGNORE INTO listings
         (id, seller_id, type, title, tagline, description, price_aura, billing,
          level_req, tags, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.id, l.seller_id, l.type, l.title, l.tagline, l.description,
        l.price_aura, l.billing, l.level_req, l.tags, l.status, t, t,
      ],
    );
  }

  console.log('\n✓ Done. Try from the app console:');
  console.log('    await ElyAPI.get("/listings")');
  console.log(`    await ElyAPI.post("/listings/${LISTINGS[0].id}/purchase")`);
  console.log('    await ElyAPI.get("/me/library")');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
