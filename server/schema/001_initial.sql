-- ElyHub backend schema — runs against the existing Turso database that
-- the Discord bot already writes to. Everything here is ADD-ONLY; never
-- modify or drop tables the bot touches. Safe to re-run (IF NOT EXISTS).
--
-- Applied via `npm run db:push` (scripts/apply-schema.mjs). New migrations
-- go in sibling files numbered 002_*.sql, 003_*.sql, etc. — the applier
-- runs them in filename order and records what's been applied in the
-- _migrations table below.

-- Migration bookkeeping. Keeps `npm run db:push` idempotent.
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

-- ──────────────────────────────────────────────────────────────────────
-- users: one row per Discord-authenticated ElyHub user.
-- discord_id is the canonical identity; the bot's existing "members"
-- table likely also keys on discord_id so the two can JOIN without
-- another indirection.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                 -- Discord snowflake
  username      TEXT NOT NULL,
  global_name   TEXT,
  avatar_hash   TEXT,                             -- Discord's avatar hash, NOT a URL
  aura          INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,                 -- unix ms
  last_seen_at  INTEGER NOT NULL,                 -- unix ms; touched on every /me hit
  banned_at     INTEGER                           -- null = active; non-null = soft-banned
);

CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);

-- ──────────────────────────────────────────────────────────────────────
-- listings: marketplace items. Mirrors the shape used in dist/tokens.jsx
-- but authoritative — the desktop app reads these instead of the mock
-- LISTINGS array in production.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,                 -- app-generated uuid
  seller_id     TEXT NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,                    -- 'sfx' | 'plugin' | 'theme' | etc.
  title         TEXT NOT NULL,
  tagline       TEXT,
  description   TEXT,
  price_aura    INTEGER NOT NULL,                 -- 0 = free
  billing       TEXT NOT NULL DEFAULT 'one-time', -- 'one-time' | 'monthly'
  level_req     INTEGER NOT NULL DEFAULT 1,
  tags          TEXT,                             -- JSON array of strings
  cover_key     TEXT,                             -- R2 key for cover image
  featured      INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',    -- 'draft' | 'published' | 'removed'
  downloads     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_seller   ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status   ON listings(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured) WHERE featured = 1;

-- ──────────────────────────────────────────────────────────────────────
-- assets: actual files attached to a listing. One listing can have
-- multiple assets (e.g. a pack with 12 sound files + a preview mp3 +
-- a cover jpg). r2_key is the S3-compatible object key.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                    -- 'cover' | 'preview' | 'pack' | 'screenshot'
  filename      TEXT NOT NULL,                    -- original upload filename
  r2_key        TEXT NOT NULL UNIQUE,             -- path inside the bucket
  size_bytes    INTEGER NOT NULL,
  content_type  TEXT NOT NULL,
  sha256        TEXT,                             -- nullable; set on upload complete
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_listing ON assets(listing_id);

-- ──────────────────────────────────────────────────────────────────────
-- purchases: immutable log of aura → listing transactions.
-- Never delete; refunds create a new negative-amount row with
-- refund_of pointing at the original purchase id.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  listing_id    TEXT NOT NULL REFERENCES listings(id),
  aura_amount   INTEGER NOT NULL,                 -- positive = debit; negative = refund
  refund_of     TEXT REFERENCES purchases(id),
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_user    ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_listing ON purchases(listing_id);

-- ──────────────────────────────────────────────────────────────────────
-- user_library: denormalized "what does user X own right now".
-- Rebuilding this from purchases on every /me/library call would work
-- but is O(n) per read; a dedicated table keeps that O(1) via the
-- covering index. Refunds DELETE the row; purchases INSERT.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_library (
  user_id     TEXT NOT NULL REFERENCES users(id),
  listing_id  TEXT NOT NULL REFERENCES listings(id),
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_library_user ON user_library(user_id, acquired_at DESC);

-- ──────────────────────────────────────────────────────────────────────
-- reviews: one per (user, listing). Body is optional; stars are required.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  user_id     TEXT NOT NULL REFERENCES users(id),
  listing_id  TEXT NOT NULL REFERENCES listings(id),
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  body        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────
-- wishlist, follows, blocks: simple social graphs. All (user_id, other_id)
-- pairs, composite PK to enforce uniqueness.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  user_id    TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  added_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  followee_id TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ──────────────────────────────────────────────────────────────────────
-- device_pairings: ephemeral 6-digit codes for plugin OAuth pairing.
-- Not long-lived (TTL 5 min) — stored here only as a backup if KV is
-- rate-limited; the primary store is the Workers KV binding PAIRING.
-- In practice you may never read from this table at all. Kept so the
-- flow can degrade gracefully if KV is unavailable.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_pairings (
  code        TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),         -- null until user confirms
  device_name TEXT,                               -- 'FL Studio', 'After Effects', etc.
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  confirmed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pairings_expires ON device_pairings(expires_at);
