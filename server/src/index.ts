// ElyHub API — Cloudflare Workers entry point.
//
// Every request lands here. We delegate to a Hono app that mounts each
// route module at its prefix. The router is stateless; DB / R2 /
// Discord calls happen on demand inside handlers.
//
// CORS: we allow the Tauri app origin (tauri://localhost) + the plugin
// hosts (varies by platform, so we allow-list broadly for now) + the
// local dev origin. Tighten once we know the exact plugin hosts.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { listingRoutes } from './routes/listings';
import { uploadRoutes } from './routes/uploads';
import { downloadRoutes } from './routes/downloads';
import { pairingRoutes } from './routes/pairing';
import { userRoutes } from './routes/users';
import { reviewRoutes } from './routes/reviews';
import { adminRoutes } from './routes/admin';
import { makerRoutes } from './routes/maker';
import { messageRoutes } from './routes/messages';
import { memberRoutes } from './routes/members';
import { kassaCronTick } from './lib/kassa-cron';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors({
  // Explicit allowlist — wildcards don't mix with credentials. Extend as
  // new plugin hosts are added.
  origin: (origin) => {
    if (!origin) return origin;
    // Fixed production origins — exact match.
    const exact = new Set([
      'tauri://localhost',
      'http://tauri.localhost',           // Windows Tauri
      'https://tauri.localhost',
    ]);
    if (exact.has(origin)) return origin;
    // Dev: Tauri's webview picks a random port on each boot and serves on
    // either 127.0.0.1 or localhost. Allow the whole loopback range rather
    // than chasing ports. Safe — a dev origin can only reach us if the
    // user's own machine opened it.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    // TODO: Adobe CEP panels use file:// or adobe://; add once known.
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Health check — for uptime monitors and `curl` sanity checks.
app.get('/', (c) => c.json({ ok: true, service: 'elyhub-api', env: c.env.ENVIRONMENT }));
app.get('/healthz', (c) => c.json({ ok: true }));

app.route('/auth', authRoutes);
app.route('/me', meRoutes);
app.route('/listings', listingRoutes);
// Reviews share the /listings prefix — mounted separately so the route file
// stays focused. Hono composes multiple .route() calls at the same prefix.
app.route('/listings', reviewRoutes);
app.route('/uploads', uploadRoutes);
app.route('/downloads', downloadRoutes);
app.route('/pairing', pairingRoutes);
app.route('/users', userRoutes);
app.route('/admin', adminRoutes);
app.route('/maker', makerRoutes);
app.route('/messages', messageRoutes);
app.route('/members', memberRoutes);

// Default 404 — keeps the JSON shape consistent across all paths.
app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

// Top-level error handler — surfaces any uncaught throw as a 500 with
// a short label. Workers logs the full stack via console.error, which
// lands in the CF dashboard under "Logs".
app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  return c.json({ error: 'internal', detail: err.message }, 500);
});

// Workers expects a single default export. Hono exposes `fetch` directly
// via the app; we wrap it here so we can ALSO export `scheduled` for the
// cron trigger (kassa events drain + license issuance retry).
export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(kassaCronTick(env));
  },
};
