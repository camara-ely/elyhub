// Shared type declarations. Kept small on purpose — each route file
// declares its own local shapes; this file is for things that cross
// route boundaries (Env bindings, the user session payload).

import type { Context } from 'hono';

// Cloudflare Workers bindings + vars. Matches wrangler.toml. The Env
// object is what every route handler receives on `c.env`.
export interface Env {
  // [vars]
  ENVIRONMENT: 'dev' | 'prod';
  DISCORD_CLIENT_ID: string;
  DISCORD_REDIRECT_URI: string;
  TURSO_URL: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET: string;
  R2_PUBLIC_BASE: string;
  KC_SUPABASE_URL: string;        // https://<project>.supabase.co — Kassa license API
  KASSA_OWNER_IDS?: string;       // comma-separated Discord ids with owner admin tier
  MAKER_MOD_ROLE_ID?: string;     // Discord role id for maker-mod (admin tier)

  // Secrets (wrangler secret put ...)
  DISCORD_CLIENT_SECRET: string;
  TURSO_TOKEN: string;
  JWT_SECRET: string;             // HMAC key for session tokens
  R2_ACCESS_KEY_ID: string;       // S3 API keys from CF dashboard → R2
  R2_SECRET_ACCESS_KEY: string;
  KC_SUPABASE_ANON_KEY: string;   // anon JWT for Supabase Edge Functions
  KC_MARKETPLACE_HMAC_SECRET: string; // shared with Supabase — signs every call
  BOT_INGEST_SECRET?: string;     // Shared secret used by the Discord bot to authenticate
                                  // server→server pushes (member sync, XP snapshots).
                                  // Plain Bearer auth on the Worker side; bot sends
                                  // `Authorization: Bearer <secret>` on POST /members/sync
                                  // and friends. Rotate via `wrangler secret put`.
  GITHUB_TOKEN?: string;          // Optional global PAT used as fallback when a listing
                                  // has no `github_token` of its own. Solves the GitHub
                                  // rate-limit (60 req/h anonymous → 5000/h authenticated)
                                  // for *public* repos without forcing every seller to
                                  // generate their own PAT. Per-listing tokens still take
                                  // precedence (sellers with private repos must set their own).

  // Bindings
  ASSETS: R2Bucket;
  PAIRING: KVNamespace;
}

// What a verified JWT carries. Kept minimal — fetch anything else from
// the users table on demand, don't bake it into the token.
export interface Session {
  sub: string;          // Discord user id
  iat: number;
  exp: number;
}

// Hono context shortcut — lets routes do `c: AppContext` instead of
// the longer generic form.
export type AppContext = Context<{ Bindings: Env; Variables: { session?: Session } }>;

// What we return from /auth/discord/exchange (and embed in the client).
export interface AuthResponse {
  token: string;        // JWT to send in Authorization: Bearer ...
  user: PublicUser;
  expires_at: number;   // unix ms
}

export interface PublicUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar_url: string;
  aura: number;
  level: number;
}
