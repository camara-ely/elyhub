-- Kassa marketplace integration — licenses issued on purchase.
--
-- Idempotent: safe to re-run. Adds Kassa product metadata to listings,
-- stores the returned license_key in user_library, and introduces a
-- retry queue for the Supabase call (outbox pattern — if the Edge
-- Function times out AFTER the aura was debited, the license MUST
-- still get issued eventually).

-- listings: mark which products are Kassa-emitting. NULL for regular
-- marketplace items (sfx, themes, generic plugins). When
-- kassa_product_id is set, the purchase handler calls issueLicense().
ALTER TABLE listings ADD COLUMN kassa_product_id TEXT;
ALTER TABLE listings ADD COLUMN kassa_tier TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_kassa
  ON listings(kassa_product_id) WHERE kassa_product_id IS NOT NULL;

-- user_library: store the license key returned by Supabase. NULL until
-- issueLicense() succeeds — the library UI should show "pending..." for
-- rows still in the queue.
ALTER TABLE user_library ADD COLUMN license_key TEXT;

-- license_issuance_queue: outbox pattern. Row inserted atomically with
-- the purchase. Cron worker drains this — on success, writes license_key
-- to user_library and sets completed_at. On failure, increments attempts
-- and sets last_error; next cron tick retries.
CREATE TABLE IF NOT EXISTS license_issuance_queue (
  id                TEXT PRIMARY KEY,                -- uuid
  purchase_id       TEXT NOT NULL,                   -- idempotency key for Supabase
  user_id           TEXT NOT NULL REFERENCES users(id),
  listing_id        TEXT NOT NULL REFERENCES listings(id),
  kassa_product_id  TEXT NOT NULL,
  kassa_tier        TEXT,
  product_name      TEXT,                            -- listing.title snapshot
  amount_aura       INTEGER,
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  last_attempt_at   INTEGER,
  created_at        INTEGER NOT NULL,
  completed_at      INTEGER,                          -- null = pending
  UNIQUE (purchase_id)                                -- one queue row per purchase
);

CREATE INDEX IF NOT EXISTS idx_issuance_pending
  ON license_issuance_queue(created_at)
  WHERE completed_at IS NULL;

-- marketplace_events: the Discord bot already reads from this table
-- (see bot's marketplace-events-worker.js). The cron drain pulls
-- Supabase's marketplace_events_queue and INSERTs here, then the bot
-- posts to Discord. Kept simple — the bot owns its own cursor via
-- the `posted_at` column.
--
-- NOTE: if you already have this table from the bot schema, this is
-- a no-op. Check with: SELECT sql FROM sqlite_master WHERE name =
-- 'marketplace_events';
CREATE TABLE IF NOT EXISTS marketplace_events (
  id          TEXT PRIMARY KEY,                    -- uuid from Supabase (dedup)
  kind        TEXT NOT NULL,                       -- 'license_issued' | 'license_revoked' | ...
  actor_id    TEXT,                                -- Discord id of user (if applicable)
  data        TEXT NOT NULL DEFAULT '{}',          -- JSON payload
  created_at  INTEGER NOT NULL,                    -- from Supabase
  posted_at   INTEGER                               -- null until bot posts to Discord
);

CREATE INDEX IF NOT EXISTS idx_events_unposted
  ON marketplace_events(created_at) WHERE posted_at IS NULL;
