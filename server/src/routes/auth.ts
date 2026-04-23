// /auth/* — Discord OAuth exchange.
//
// The desktop app does the OAuth dance client-side (its own 127.0.0.1
// listener receives the token) and then hands us the Discord access
// token at /auth/discord/exchange. We validate it with Discord, upsert
// our user row, and mint our own session JWT. From that point on the
// app uses our JWT; the Discord token can be discarded.
//
// Later: we can move the OAuth callback ITSELF to the Worker
// (https://api/auth/discord/callback), which kills the localhost
// listener in Rust entirely. That's a client-side refactor; the
// /exchange endpoint stays either way.

import { Hono } from 'hono';
import type { AppContext, AuthResponse, Env } from '../types';
import { fetchDiscordProfile, signSession, upsertUser } from '../auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/discord/exchange', async (c: AppContext) => {
  let body: { access_token?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_body' }, 400);
  }
  if (!body.access_token || typeof body.access_token !== 'string') {
    return c.json({ error: 'missing_access_token' }, 400);
  }

  let profile;
  try {
    profile = await fetchDiscordProfile(body.access_token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'discord_token_invalid') {
      return c.json({ error: 'discord_token_invalid' }, 401);
    }
    return c.json({ error: 'discord_unreachable', detail: msg }, 502);
  }

  const user = await upsertUser(c.env, profile);
  const { token, expires_at } = await signSession(c.env, user.id);

  const res: AuthResponse = { token, user, expires_at };
  return c.json(res);
});
