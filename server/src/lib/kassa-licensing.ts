// Drop-in client for the ElyHub Worker to call Supabase Edge Functions.
// Place this somewhere under server/src/lib/ and import from handlers.
//
// Required env (via `wrangler secret put`):
//   KC_SUPABASE_URL       = https://<project>.supabase.co
//   KC_SUPABASE_ANON_KEY  = anon publishable key (for Authorization header)
//   KC_MARKETPLACE_HMAC_SECRET        = 32-byte hex, same on Supabase
//   KASSA_OWNER_IDS       = comma-separated Discord snowflakes (owner role)
//
// Every admin call goes through `adminCall` which:
//   1. Determines the actor's role (owner / admin / null) via Discord id
//   2. Rejects if role is null
//   3. Injects `_actor: { id, role }` into the body BEFORE signing
//   4. Signs & sends
//
// The role lives INSIDE the HMAC-signed body, so it can't be spoofed by
// anyone without KC_MARKETPLACE_HMAC_SECRET.

export type ActorRole = 'owner' | 'admin' | 'system';
export interface Actor { id: string; role: ActorRole }

export interface KcEnv {
  KC_SUPABASE_URL: string;
  KC_SUPABASE_ANON_KEY: string;
  KC_MARKETPLACE_HMAC_SECRET: string;
  KASSA_OWNER_IDS?: string;
}

// ───────── Role resolution ──────────────────────────────────────────────────

/**
 * Decide which role a Discord user has for Kassa admin operations.
 *
 * - owner:  listed in KASSA_OWNER_IDS env
 * - admin:  has zephyro_mod Discord role (caller must verify against Turso)
 * - null:   neither — reject
 *
 * Caller is responsible for verifying the Discord id came from a valid JWT
 * (e.g. req.session.userId) and for checking `isKassaMod(discordId)` via
 * Turso `zephyro_members` lookup.
 */
export function resolveRole(
  discordId: string,
  env: KcEnv,
  isKassaMod: boolean,
): ActorRole | null {
  const owners = (env.KASSA_OWNER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (owners.includes(discordId)) return 'owner';
  if (isKassaMod) return 'admin';
  return null;
}

// ───────── Signing helpers ──────────────────────────────────────────────────

function hexEncode(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return hexEncode(digest);
}

async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return hexEncode(sig);
}

async function signedFetch(
  env: KcEnv,
  fnName: string,
  body: unknown,
): Promise<Response> {
  const url = `${env.KC_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${fnName}`;
  const raw = JSON.stringify(body ?? {});
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  // Canonical uses just the function slug — Supabase gateway strips
  // `/functions/v1` before the Edge Function sees the request.
  const bodyHash = await sha256Hex(raw);
  const canonical = `${timestamp}.${nonce}.POST ${fnName}.${bodyHash}`;
  const hmac = await hmacSha256Hex(env.KC_MARKETPLACE_HMAC_SECRET, canonical);

  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${env.KC_SUPABASE_ANON_KEY}`,
      'x-request-hmac': hmac,
      'x-timestamp': timestamp,
      'x-nonce': nonce,
    },
    body: raw,
  });
}

/** Injects `_actor` into the body and signs. Used by all admin endpoints. */
async function adminCall<T = unknown>(
  env: KcEnv,
  fnName: string,
  actor: Actor,
  body: object,
): Promise<T> {
  const enriched = { ...body, _actor: { id: actor.id, role: actor.role } };
  const res = await signedFetch(env, fnName, enriched);
  return res.json().catch(() => ({ ok: false, error: 'bad json' })) as Promise<T>;
}

// ───────── Marketplace flow (purchase handler) ──────────────────────────────

export interface IssueLicenseInput {
  user_id: string;
  product_id: string;
  tier?: string | null;
  purchase_id: string;
  product_name?: string;
  expires_at?: string | null;
  max_devices?: number;
  amount_cents?: number | null;
  currency?: 'BRL' | 'USD' | 'AURA' | null;
}

export interface IssueLicenseResult {
  ok: boolean;
  license_key?: string;
  key_preview?: string;
  license_id?: string;
  expires_at?: string | null;
  error?: string;
}

export async function issueLicense(
  env: KcEnv,
  input: IssueLicenseInput,
): Promise<IssueLicenseResult> {
  const res = await signedFetch(env, 'kc_issue_license', input);
  return res.json().catch(() => ({ ok: false, error: 'bad json' })) as Promise<IssueLicenseResult>;
}

export interface RevokeLicenseInput {
  license_id?: string;
  user_id?: string;
  product_id?: string;
  reason?: string;
}

export async function revokeLicense(
  env: KcEnv,
  input: RevokeLicenseInput,
): Promise<{ ok: boolean; revoked_count?: number; error?: string }> {
  const res = await signedFetch(env, 'kc_revoke_license', input);
  return res.json().catch(() => ({ ok: false, error: 'bad json' })) as Promise<{ ok: boolean; revoked_count?: number; error?: string }>;
}

// ───────── Admin endpoints (role-aware) ─────────────────────────────────────

export interface GrantLicenseInput {
  product_id: string;
  sales_channel: 'gift' | 'admin' | 'direct' | 'gumroad' | 'stripe' | 'pix';
  tier?: string;
  expires_at?: string;
  max_devices?: number;
  user_id?: string;
  customer_email?: string;
  customer_name?: string;
  external_ref?: string;
  external_platform?: string;
  amount_cents?: number;
  currency?: string;
  note?: string;
}

export const adminGrantLicense = (env: KcEnv, actor: Actor, input: GrantLicenseInput) =>
  adminCall<IssueLicenseResult>(env, 'kc_admin_grant_license', actor, input);

export interface ModifyLicenseInput {
  license_id: string;
  changes: Partial<{
    tier: string;
    max_devices: number;
    expires_at: string | null;
    user_id: string;
    customer_email: string | null;
    customer_name: string | null;
    amount_cents: number | null;
    currency: string | null;
    external_ref: string | null;
    external_platform: string | null;
  }>;
  note?: string;
}

export const adminModifyLicense = (env: KcEnv, actor: Actor, input: ModifyLicenseInput) =>
  adminCall(env, 'kc_admin_modify_license', actor, input);

export interface SetActiveInput {
  license_id: string;
  active: boolean;
  reason?: string;
}

export const adminSetActive = (env: KcEnv, actor: Actor, input: SetActiveInput) =>
  adminCall(env, 'kc_admin_set_active', actor, input);

export interface ResetDevicesInput {
  license_id: string;
  reason?: string;
}

export const adminResetDevices = (env: KcEnv, actor: Actor, input: ResetDevicesInput) =>
  adminCall(env, 'kc_admin_reset_devices', actor, input);

export interface ListLicensesInput {
  user_id?: string;
  customer_key?: string;
  product_id?: string;
  sales_channel?: string;
  status?: 'active' | 'revoked' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminListLicenses = (env: KcEnv, actor: Actor, input: ListLicensesInput = {}) =>
  adminCall(env, 'kc_admin_list_licenses', actor, input);

export interface ListClientsInput {
  scope?: 'elyhub' | 'all';
  q?: string;
  limit?: number;
  offset?: number;
}

export const adminListClients = (env: KcEnv, actor: Actor, input: ListClientsInput = {}) =>
  adminCall(env, 'kc_admin_list_clients', actor, input);

export interface GetClientInput { customer_key: string }

export const adminGetClient = (env: KcEnv, actor: Actor, input: GetClientInput) =>
  adminCall(env, 'kc_admin_get_client', actor, input);

// ───────── Example usage in purchase handler ────────────────────────────────
//
// export async function handlePurchase(c: Context<{ Bindings: Env }>) {
//   const body = await c.req.json();
//   const { listing_id, buyer_id } = body;
//
//   // ... existing purchase: debit aura, INSERT purchases, INSERT user_library ...
//   const purchase = await createPurchase(c.env, listing_id, buyer_id);
//
//   if (purchase.product_type === 'kassa_plugin') {
//     const license = await issueLicense(c.env, {
//       user_id: buyer_id,
//       product_id: purchase.product_id,
//       tier: purchase.tier ?? 'basic',
//       purchase_id: purchase.id,
//       product_name: purchase.listing_title,
//       amount_cents: purchase.price_aura,
//       currency: 'AURA',
//     });
//
//     if (license.ok && license.license_key) {
//       await c.env.DB.prepare(
//         `UPDATE user_library SET metadata = json_set(coalesce(metadata,'{}'), '$.license_key', ?) WHERE purchase_id = ?`
//       ).bind(license.license_key, purchase.id).run();
//     } else {
//       console.error('[kassa] issueLicense failed', license.error);
//       // TODO: outbox pattern — push to retry queue instead of failing the purchase
//     }
//   }
//
//   return c.json({ ok: true, purchase_id: purchase.id });
// }
//
// ───────── Example usage in admin handler ───────────────────────────────────
//
// export async function handleAdminList(c: Context<{ Bindings: Env }>) {
//   const discordId = c.get('session').userId;
//   const isMod    = await turso.isKassaMod(discordId);     // your impl
//   const role     = resolveRole(discordId, c.env, isMod);
//   if (!role) return c.json({ error: 'forbidden' }, 403);
//
//   const actor = { id: discordId, role };
//   const body  = await c.req.json();
//   const result = await adminListLicenses(c.env, actor, body);
//   return c.json(result);
// }
