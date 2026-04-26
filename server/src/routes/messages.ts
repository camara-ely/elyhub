// /messages/* — direct messaging between users.
//
// Storage model (see schema/005_messages.sql):
//   message_threads(id, user_a, user_b, last_message_at, last_preview,
//                   last_from, read_at_a, read_at_b)
//   messages(id, thread_id, from_user, body, attachment_key, ...)
//
// Convention: user_a < user_b lexicographically. Insertion always sorts
// the two participant ids first so a single thread row represents the
// pair regardless of who initiated.
//
// Endpoints:
//   GET  /messages/threads
//        → { items: Thread[] } — current user's threads, ordered by
//          last_message_at DESC, with unread count and other-user id.
//   GET  /messages/threads/:otherId
//        → { thread, messages: Message[] } — full message history for
//          the conversation between current user and otherId.
//   POST /messages/send
//        body: { to: userId, body?: string, attachment_key?: string,
//                attachment_kind?: 'image'|'file' }
//        → { thread_id, message }
//   POST /messages/threads/:otherId/read
//        → { ok, read_at }
//
// All endpoints require auth. There is no concept of "blocked DMs" yet —
// add that to users (or a `message_blocks` table) before public release
// if abuse becomes a concern.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId } from '../auth';
import { db, exec, queryAll, queryOne, now } from '../db';

export const messageRoutes = new Hono<{ Bindings: Env }>();
messageRoutes.use('*', requireAuth());

// Sort two user ids so user_a < user_b. Used everywhere a thread is
// looked up or created.
function pair(uid: string, other: string): { a: string; b: string; meIsA: boolean } {
  if (uid < other) return { a: uid, b: other, meIsA: true };
  return { a: other, b: uid, meIsA: false };
}

// Truncate body to a sensible preview size for the thread list. Strips
// newlines so the list shows a single-line excerpt.
function preview(body: string | null | undefined): string | null {
  if (!body) return null;
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= 120 ? flat : flat.slice(0, 117) + '…';
}

// GET /messages/threads — list every thread involving the current user.
// Returns: items ordered by last_message_at DESC, each with the other
// participant's user_id + unread count for the current user.
messageRoutes.get('/threads', async (c: AppContext) => {
  const uid = userId(c);
  const client = db(c.env);
  // The unread count subselect uses a correlated subquery rather than a
  // GROUP BY join because we want per-thread unread (specific to the
  // current user) and the dataset is small (one row per conversation).
  const rows = await queryAll<{
    id: string;
    user_a: string;
    user_b: string;
    last_message_at: number | null;
    last_preview: string | null;
    last_from: string | null;
    created_at: number;
    unread: number;
  }>(
    client,
    `SELECT
       t.id, t.user_a, t.user_b,
       t.last_message_at, t.last_preview, t.last_from, t.created_at,
       (SELECT COUNT(*) FROM messages m
          WHERE m.thread_id = t.id
            AND m.from_user != ?
            AND m.created_at > CASE WHEN t.user_a = ? THEN t.read_at_a ELSE t.read_at_b END
       ) AS unread
     FROM message_threads t
     WHERE (t.user_a = ? OR t.user_b = ?)
       AND t.last_message_at IS NOT NULL
     ORDER BY t.last_message_at DESC
     LIMIT 200`,
    [uid, uid, uid, uid],
  );
  const items = rows.map((r) => ({
    id: r.id,
    other_user_id: r.user_a === uid ? r.user_b : r.user_a,
    last_message_at: r.last_message_at,
    last_preview: r.last_preview,
    last_from_me: r.last_from === uid,
    unread: Number(r.unread || 0),
    created_at: r.created_at,
  }));
  return c.json({ items });
});

// GET /messages/threads/:otherId — full conversation between current
// user and otherId. Creates the thread row lazily so a "first chat" GET
// works without a prior send (useful for rendering the empty-state UI).
messageRoutes.get('/threads/:otherId', async (c: AppContext) => {
  const uid = userId(c);
  const otherId = c.req.param('otherId')!;
  if (otherId === uid) return c.json({ error: 'cannot_message_self' }, 400);
  const { a, b } = pair(uid, otherId);
  const client = db(c.env);
  const thread = await queryOne<{
    id: string; last_message_at: number | null; last_preview: string | null;
    last_from: string | null; read_at_a: number; read_at_b: number;
  }>(
    client,
    `SELECT id, last_message_at, last_preview, last_from, read_at_a, read_at_b
     FROM message_threads WHERE user_a = ? AND user_b = ?`,
    [a, b],
  );
  if (!thread) {
    // No thread yet — return empty payload, don't create eagerly. Clients
    // can render the empty composer; the thread row gets inserted on the
    // first /send call.
    return c.json({
      thread: null,
      messages: [],
    });
  }
  const messages = await queryAll<{
    id: string; thread_id: string; from_user: string;
    body: string | null; attachment_key: string | null; attachment_kind: string | null;
    created_at: number; read_at: number | null;
  }>(
    client,
    `SELECT id, thread_id, from_user, body, attachment_key, attachment_kind,
            created_at, read_at
     FROM messages
     WHERE thread_id = ?
     ORDER BY created_at ASC
     LIMIT 500`,
    [thread.id],
  );
  return c.json({
    thread: {
      id: thread.id,
      other_user_id: otherId,
      last_message_at: thread.last_message_at,
      last_preview: thread.last_preview,
      last_from_me: thread.last_from === uid,
    },
    messages: messages.map((m) => ({
      id: m.id,
      from_me: m.from_user === uid,
      body: m.body,
      attachment_key: m.attachment_key,
      attachment_kind: m.attachment_kind,
      created_at: m.created_at,
      read_at: m.read_at,
    })),
  });
});

// POST /messages/send — body { to, body?, attachment_key?, attachment_kind? }.
// Creates the thread on first send (UPSERT) and inserts the message in a
// single batch so the row counts and last_* fields stay consistent.
messageRoutes.post('/send', async (c: AppContext) => {
  const uid = userId(c);
  let body: { to?: string; body?: string; attachment_key?: string; attachment_kind?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }
  const to = (body.to || '').trim();
  const text = (body.body || '').trim();
  const attKey = body.attachment_key ? String(body.attachment_key).trim() : null;
  const attKind = body.attachment_kind ? String(body.attachment_kind).trim() : null;
  if (!to) return c.json({ error: 'missing_to' }, 400);
  if (to === uid) return c.json({ error: 'cannot_message_self' }, 400);
  if (!text && !attKey) return c.json({ error: 'empty_message' }, 400);
  if (text.length > 4000) return c.json({ error: 'message_too_long', max: 4000 }, 400);
  // 'listing' is an embedded-card attachment: attachment_key holds the
  // listing id (not an R2 key). Renderer in views.jsx detects kind='listing'
  // and looks up the listing to render the card. 'image'/'file' use
  // attachment_key as the R2 object key (not yet wired).
  if (attKind && !['image', 'file', 'listing'].includes(attKind)) {
    return c.json({ error: 'invalid_attachment_kind' }, 400);
  }

  // Validate the recipient exists. Without this we'd silently create
  // threads to nonexistent ids (FK on message_threads.user_a/b is
  // declared but SQLite doesn't enforce FKs unless PRAGMA foreign_keys=ON,
  // which Turso doesn't toggle for us here).
  const client = db(c.env);
  const exists = await queryOne<{ id: string }>(
    client, 'SELECT id FROM users WHERE id = ?', [to],
  );
  if (!exists) return c.json({ error: 'recipient_not_found' }, 404);

  const { a, b } = pair(uid, to);
  const t = now();
  const msgId = crypto.randomUUID();
  const prevText = preview(
    text
    || (attKind === 'image' ? '📷 Image'
      : attKind === 'file' ? '📎 File'
      : attKind === 'listing' ? '🛒 Shared a listing'
      : null),
  );

  // Find or create the thread. Using INSERT … ON CONFLICT lets us avoid
  // a separate SELECT round-trip; the UPDATE branch refreshes last_*
  // even when the thread already existed.
  const threadId = crypto.randomUUID();
  await client.batch([
    {
      sql: `INSERT INTO message_threads
              (id, user_a, user_b, last_message_at, last_preview, last_from, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_a, user_b) DO UPDATE SET
              last_message_at = excluded.last_message_at,
              last_preview    = excluded.last_preview,
              last_from       = excluded.last_from`,
      args: [threadId, a, b, t, prevText, uid, t],
    },
  ], 'write');
  // After the upsert, fetch the canonical thread id (the row that
  // actually won the conflict — may be the pre-existing one, not threadId).
  const tRow = await queryOne<{ id: string }>(
    client, 'SELECT id FROM message_threads WHERE user_a = ? AND user_b = ?', [a, b],
  );
  if (!tRow) return c.json({ error: 'thread_failed' }, 500);

  // Sender automatically "reads" their own message — bump the watermark
  // for whichever side they are so unread counts stay accurate.
  const senderIsA = a === uid;
  await client.batch([
    {
      sql: `INSERT INTO messages
              (id, thread_id, from_user, body, attachment_key, attachment_kind, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [msgId, tRow.id, uid, text || null, attKey, attKind, t],
    },
    {
      sql: senderIsA
        ? 'UPDATE message_threads SET read_at_a = ? WHERE id = ?'
        : 'UPDATE message_threads SET read_at_b = ? WHERE id = ?',
      args: [t, tRow.id],
    },
  ], 'write');

  return c.json({
    thread_id: tRow.id,
    message: {
      id: msgId,
      from_me: true,
      body: text || null,
      attachment_key: attKey,
      attachment_kind: attKind,
      created_at: t,
      read_at: null,
    },
  });
});

// POST /messages/threads/:otherId/read — bump the read watermark for
// the current user up to "now". Idempotent.
messageRoutes.post('/threads/:otherId/read', async (c: AppContext) => {
  const uid = userId(c);
  const otherId = c.req.param('otherId')!;
  if (otherId === uid) return c.json({ error: 'cannot_message_self' }, 400);
  const { a } = pair(uid, otherId);
  const t = now();
  const client = db(c.env);
  // No-op if the thread doesn't exist yet (user marking an empty thread
  // as read is meaningless but shouldn't error).
  await exec(
    client,
    a === uid
      ? 'UPDATE message_threads SET read_at_a = ? WHERE user_a = ? AND user_b = ?'
      : 'UPDATE message_threads SET read_at_b = ? WHERE user_a = ? AND user_b = ?',
    [t, a, a === uid ? otherId : uid],
  );
  return c.json({ ok: true, read_at: t });
});
