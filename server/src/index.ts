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

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors({
  // Explicit allowlist — wildcards don't mix with credentials. Extend as
  // new plugin hosts are added.
  origin: (origin) => {
    if (!origin) return origin;
    const allow = [
      'tauri://localhost',
      'http://tauri.localhost',           // Windows Tauri
      'https://tauri.localhost',
      'http://localhost:1420',            // Tauri dev server
      'http://localhost:8787',            // wrangler dev
      // TODO: Adobe CEP panels use file:// or adobe://; add once known.
    ];
    return allow.includes(origin) ? origin : null;
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
app.route('/uploads', uploadRoutes);
app.route('/downloads', downloadRoutes);
app.route('/pairing', pairingRoutes);

// Default 404 — keeps the JSON shape consistent across all paths.
app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

// Top-level error handler — surfaces any uncaught throw as a 500 with
// a short label. Workers logs the full stack via console.error, which
// lands in the CF dashboard under "Logs".
app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  return c.json({ error: 'internal', detail: err.message }, 500);
});

export default app;
