// /pairing/* — device pairing for the plugin.
//
// The plugin lives inside a DAW/editor with no easy OAuth surface. So
// we use the same pattern smart TVs use:
//
//   Plugin                                  User's desktop app
//   ──────                                  ──────────────────
//   POST /pairing/start              ◄──
//        ↓ returns { code: "A3K9F2", expires_at }
//   (shows code to user)                    (user opens app, sees
//                                            "Connect a plugin" flow)
//   GET /pairing/A3K9F2/status       ──►    POST /pairing/A3K9F2/confirm
//        ↓ polls every 2s                         (app holds a JWT;
//        ↓ eventually returns { token }            sends it up)
//   (stores token, forgets code)
//
// Codes expire in 5 minutes. Pending codes live in KV; once confirmed
// the token is ALSO written to KV (not the DB) so the plugin's polling
// is cheap — KV has <10ms reads from Workers.

import { Hono } from 'hono';
import type { AppContext, Env, Session } from '../types';
import { requireAuth, signSession, userId } from '../auth';

export const pairingRoutes = new Hono<{ Bindings: Env }>();

const CODE_TTL_SEC = 5 * 60;
const CODE_LENGTH = 6;

// Human-friendly alphabet — no 0/O, no 1/I/L, all uppercase. 32 chars.
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const buf = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => ALPHA[b % ALPHA.length]).join('');
}

interface PairingRecord {
  device_name: string;
  created_at: number;
  confirmed_token?: string;     // set once user confirms
  confirmed_user_id?: string;
}

// POST /pairing/start — plugin calls this first, gets back a code to
// show to the user. Rate-limited by device_name via the KV TTL; no
// need for a separate rate limiter because abusing this just fills KV
// with junk that expires in 5 min.
pairingRoutes.post('/start', async (c: AppContext) => {
  let body: { device_name?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_body' }, 400); }
  const device = (body.device_name || 'Unknown device').slice(0, 60);

  // Retry on collision. 32^6 = ~1B combinations, collision odds are
  // negligible at small N, but cheap to handle anyway.
  let code = '';
  for (let i = 0; i < 5; i++) {
    code = generateCode();
    const existing = await c.env.PAIRING.get(`code:${code}`);
    if (!existing) break;
    code = '';
  }
  if (!code) return c.json({ error: 'code_generation_failed' }, 500);

  const record: PairingRecord = { device_name: device, created_at: Date.now() };
  await c.env.PAIRING.put(`code:${code}`, JSON.stringify(record), { expirationTtl: CODE_TTL_SEC });

  return c.json({ code, expires_in: CODE_TTL_SEC });
});

// GET /pairing/:code/status — plugin polls this. While pending, returns
// { status: 'pending' }. Once confirmed, returns { status: 'confirmed',
// token } and INVALIDATES the code (one-time use — plugin must save
// the token now or never).
pairingRoutes.get('/:code/status', async (c: AppContext) => {
  const code = c.req.param('code')!.toUpperCase();
  const raw = await c.env.PAIRING.get(`code:${code}`);
  if (!raw) return c.json({ status: 'expired' }, 410);

  const rec: PairingRecord = JSON.parse(raw);
  if (!rec.confirmed_token) {
    return c.json({ status: 'pending', device_name: rec.device_name });
  }

  // Confirmed — consume the code and hand off the token. Delete is
  // best-effort; even if it fails, the KV TTL will clean up eventually.
  await c.env.PAIRING.delete(`code:${code}`);
  return c.json({ status: 'confirmed', token: rec.confirmed_token, user_id: rec.confirmed_user_id });
});

// POST /pairing/:code/confirm — called by the desktop app when the
// user types in the code. We mint a fresh session JWT for the PLUGIN
// (not reusing the app's — separate token so revoking one doesn't
// log out the other) and attach it to the pending record.
pairingRoutes.post('/:code/confirm', requireAuth(), async (c: AppContext) => {
  const code = c.req.param('code')!.toUpperCase();
  const uid = userId(c);

  const raw = await c.env.PAIRING.get(`code:${code}`);
  if (!raw) return c.json({ error: 'code_not_found_or_expired' }, 410);

  const rec: PairingRecord = JSON.parse(raw);
  if (rec.confirmed_token) return c.json({ error: 'already_confirmed' }, 409);

  const { token } = await signSession(c.env, uid);
  rec.confirmed_token = token;
  rec.confirmed_user_id = uid;

  // Keep the original TTL — once the plugin polls, it'll be cleaned up.
  // If the plugin never polls (crashed, etc.) the record expires on its own.
  const elapsed = Math.floor((Date.now() - rec.created_at) / 1000);
  const remaining = Math.max(30, CODE_TTL_SEC - elapsed);
  await c.env.PAIRING.put(`code:${code}`, JSON.stringify(rec), { expirationTtl: remaining });

  return c.json({ ok: true, device_name: rec.device_name });
});
