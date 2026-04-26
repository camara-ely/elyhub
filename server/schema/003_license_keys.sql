-- Dedicated plaintext-key storage for licenses, decoupled from listings.
--
-- Until now, manual license grants piggy-backed on user_library.license_key —
-- which only works when the Kassa product has a matching listing on the
-- marketplace (listings.kassa_product_id = product_id). That's fine for our
-- own plugins, but third-party products (future: other makers selling plugins
-- with their own Kassa products) may not have a marketplace listing.
--
-- This table is keyed by license_id (exact, unique identifier from Supabase)
-- so enrichment in /me/licenses is a direct lookup — no preview prefix/suffix
-- matching required. user_library.license_key stays too (redundant but cheap)
-- so existing /me/library responses keep working.

CREATE TABLE IF NOT EXISTS user_license_keys (
  license_id  TEXT PRIMARY KEY,           -- Supabase license UUID
  user_id     TEXT NOT NULL REFERENCES users(id),
  license_key TEXT NOT NULL,              -- plaintext — only stored once at creation
  product_id  TEXT,                       -- kassa product id, informational
  source      TEXT NOT NULL,              -- 'purchase' | 'manual_grant'
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_license_keys_user
  ON user_license_keys(user_id, created_at DESC);

-- Dedup table for expiry reminder DMs. Each license can fire each reminder
-- window (7d, 1d) at most once — PK ensures idempotency across cron ticks.
CREATE TABLE IF NOT EXISTS license_expiry_notifications (
  license_id  TEXT NOT NULL,
  window_kind TEXT NOT NULL,     -- 'd7' | 'd1'
  sent_at     INTEGER NOT NULL,
  PRIMARY KEY (license_id, window_kind)
);
