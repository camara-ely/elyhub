-- Direct messages between users. Two-table model:
--
--   message_threads  — one row per (user_a, user_b) pair, with denormalized
--                       last-message preview + timestamp for cheap thread-list
--                       reads (no aggregate over messages on every poll).
--   messages         — append-only message log keyed to a thread.
--
-- Convention: user_a < user_b lexicographically. Inserting a thread means
-- sorting the two user ids first so a single row represents the conversation
-- regardless of who initiated it. The (user_a, user_b) UNIQUE constraint
-- prevents duplicates.
--
-- Reads/unread tracking is per-side: each thread row tracks the timestamp
-- the OTHER user last read up to. The unread count is derived at read time
-- from messages.created_at vs. that watermark.

CREATE TABLE IF NOT EXISTS message_threads (
  id              TEXT PRIMARY KEY,           -- uuid
  user_a          TEXT NOT NULL REFERENCES users(id),
  user_b          TEXT NOT NULL REFERENCES users(id),
  -- Denormalized for cheap thread-list rendering. last_preview is the
  -- truncated body (≤ 120 chars) of the most recent message; clients
  -- render this directly without joining messages.
  last_message_at INTEGER,
  last_preview    TEXT,
  last_from       TEXT,                       -- user_id of last sender
  -- Read watermarks: read_at_a is the latest message.created_at user_a
  -- has acknowledged seeing (and vice versa). Unread count for user_a is
  -- COUNT(messages WHERE thread_id = ? AND from_user != user_a AND created_at > read_at_a).
  read_at_a       INTEGER NOT NULL DEFAULT 0,
  read_at_b       INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  UNIQUE(user_a, user_b),
  CHECK(user_a < user_b)
);

CREATE INDEX IF NOT EXISTS idx_threads_user_a
  ON message_threads(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_user_b
  ON message_threads(user_b, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,             -- uuid
  thread_id     TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  from_user     TEXT NOT NULL REFERENCES users(id),
  body          TEXT,                         -- nullable when attachment-only
  attachment_key TEXT,                        -- R2 key for inline image/file
  attachment_kind TEXT,                       -- 'image' | 'file' (null = text)
  created_at    INTEGER NOT NULL,
  -- Per-message read flag, mirrored in thread.read_at_X for fast unread
  -- counts but kept here for full audit (and future "delivered" states).
  read_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id, created_at DESC);
