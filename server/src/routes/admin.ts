// /admin/* — Kassa admin panel endpoints.
//
// All handlers require a valid session AND a non-null role from
// resolveRole(). Role is determined by:
//   • owner: Discord id listed in env.KASSA_OWNER_IDS (full access, sees PII
//     from all sales channels including external Gumroad/Stripe).
//   • admin: Discord user has the maker-mod role in the bot guild (looked up
//     via Turso `xp.roles`). Sees canal=elyhub with PII; external canals
//     are redacted server-side (Supabase does the redaction, gated by
//     _actor.role).
//   • null: rejected with 403.
//
// The role lives inside the HMAC-signed body via adminCall() → Supabase
// cannot be tricked by a forged client header.

import { Hono } from 'hono';
import type { AppContext, Env } from '../types';
import { requireAuth, userId } from '../auth';
import { db, exec, now, queryOne } from '../db';
import {
  resolveRole,
  adminGrantLicense,
  adminModifyLicense,
  adminSetActive,
  adminResetDevices,
  adminListLicenses,
  adminListClients,
  adminGetClient,
  type Actor,
} from '../lib/kassa-licensing';

export const adminRoutes = new Hono<{ Bindings: Env }>();
adminRoutes.use('*', requireAuth());

// ───────── Role lookup ──────────────────────────────────────────────────────

/**
 * Check whether a Discord user has the maker-mod role. The bot's
 * `xp.roles` column stores a JSON array of { id, name, color, position }
 * snapshotted on every guildMemberUpdate — this is a fast, cacheable
 * read that doesn't require hitting Discord's API.
 *
 * Returns false (not throws) on missing env / missing row / parse error,
 * so a misconfigured MAKER_MOD_ROLE_ID just means no one is admin. Owners
 * (via KASSA_OWNER_IDS) still work regardless.
 */
async function isKassaMod(env: Env, discordId: string): Promise<boolean> {
  const roleId = env.MAKER_MOD_ROLE_ID;
  if (!roleId) return false;
  const row = await queryOne<{ roles: string | null }>(
    db(env),
    'SELECT roles FROM xp WHERE user_id = ?',
    [discordId],
  );
  if (!row?.roles) return false;
  try {
    const parsed = JSON.parse(row.roles) as Array<{ id?: string }>;
    return Array.isArray(parsed) && parsed.some((r) => r?.id === roleId);
  } catch {
    return false;
  }
}

/**
 * Shared gate: extract session uid, resolve role, return 403 if null.
 * Returns the Actor on success; handlers use it as the second arg to
 * the admin* client functions.
 */
async function requireAdminActor(c: AppContext): Promise<Actor | Response> {
  const uid = userId(c);
  const isMod = await isKassaMod(c.env, uid);
  const role = resolveRole(uid, c.env, isMod);
  if (!role) return c.json({ error: 'forbidden' }, 403);
  return { id: uid, role };
}

// ───────── Whoami — lets the UI decide whether to render the Admin tab ─────

// GET /admin/whoami — returns the caller's resolved role or 403. Cheap,
// cache-friendly; the app can hit this once on mount.
adminRoutes.get('/whoami', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  return c.json({ ok: true, role: actor.role, id: actor.id });
});

// ───────── License operations ───────────────────────────────────────────────

// POST /admin/licenses/list — paginated listing. Body: ListLicensesInput.
adminRoutes.post('/licenses/list', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c);
  const res = await adminListLicenses(c.env, actor, body);
  return c.json(res);
});

// POST /admin/licenses/grant — manual license emission.
// Admins can only issue to Discord users (channel = admin/gift). Externals
// (gumroad/stripe/direct/pix) are owner-only; Supabase also enforces this,
// but we 403 early here for a better error message.
adminRoutes.post('/licenses/grant', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c);
  const channel = (body as { sales_channel?: string }).sales_channel;
  const externals = new Set(['gumroad', 'stripe', 'direct', 'pix']);
  if (actor.role === 'admin' && channel && externals.has(channel)) {
    return c.json({ error: 'forbidden', detail: 'external channels are owner-only' }, 403);
  }
  const input = body as Parameters<typeof adminGrantLicense>[2];
  const res = await adminGrantLicense(c.env, actor, input);

  // Best-effort: emit a marketplace_events row so the bot can DM the user the
  // plaintext key once. Only fires when:
  //   - Supabase reports ok
  //   - we got the plaintext back (it's only returned once, at creation)
  //   - the license was attached to a Discord user_id (DMs need a snowflake)
  // The bot worker picks this up and sends the key; if the DM fails the key
  // is lost from DMs (admin can re-share via /admin UI, which still shows it
  // on screen right after grant).
  const granted = res as { ok?: boolean; license_key?: string; key_preview?: string; license_id?: string; expires_at?: string | null };
  if (granted?.ok && granted.license_key && input.user_id) {
    const client = db(c.env);

    // Persist the plaintext key. Two destinations:
    //  1. user_license_keys (canonical, always) — keyed by Supabase license_id,
    //     decoupled from listings. This is what /me/licenses uses for Reveal.
    //  2. user_library (opportunistic) — only if there's a marketplace listing
    //     matching kassa_product_id. Keeps /me/library backwards compatible.
    const t = Date.now();
    if (granted.license_id) {
      try {
        await exec(
          client,
          `INSERT INTO user_license_keys (license_id, user_id, license_key, product_id, source, created_at)
           VALUES (?, ?, ?, ?, 'manual_grant', ?)
           ON CONFLICT(license_id) DO UPDATE SET license_key = excluded.license_key`,
          [granted.license_id, input.user_id, granted.license_key, input.product_id ?? null, t],
        );
      } catch (err) {
        console.warn('[admin] user_license_keys upsert failed:', (err as Error).message);
      }
    }
    try {
      const listing = await queryOne<{ id: string }>(
        client,
        'SELECT id FROM listings WHERE kassa_product_id = ? LIMIT 1',
        [input.product_id],
      );
      if (listing) {
        await exec(
          client,
          `INSERT INTO user_library (user_id, listing_id, acquired_at, license_key)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, listing_id) DO UPDATE SET
             license_key = excluded.license_key`,
          [input.user_id, listing.id, t, granted.license_key],
        );
      }
    } catch (err) {
      console.warn('[admin] user_library upsert failed:', (err as Error).message);
    }

    try {
      const eventId = crypto.randomUUID();
      const data = JSON.stringify({
        productId: input.product_id,
        tier: input.tier,
        salesChannel: input.sales_channel,
        licenseId: granted.license_id,
        licenseKey: granted.license_key,
        keyPreview: granted.key_preview,
        expiresAt: granted.expires_at,
        maxDevices: input.max_devices,
        note: input.note,
      });
      await exec(
        db(c.env),
        `INSERT INTO marketplace_events (id, kind, actor_id, data, created_at) VALUES (?, ?, ?, ?, ?)`,
        [eventId, 'license_granted_manual', input.user_id, data, Date.now()],
      );
    } catch (err) {
      console.warn('[admin] license_granted_manual event emit failed:', (err as Error).message);
    }
  }

  return c.json(res);
});

// POST /admin/licenses/modify — change tier, expires_at, max_devices, etc.
adminRoutes.post('/licenses/modify', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c);
  const res = await adminModifyLicense(c.env, actor, body as Parameters<typeof adminModifyLicense>[2]);
  return c.json(res);
});

// POST /admin/licenses/set-active — enable/disable. Supabase trigger keeps
// is_active ↔ revoked_at in sync (compat with Zephyro kc_validate).
//
// Supabase emits a `license_revoked` event on disable but nothing on re-enable
// — so when active=true succeeds, we insert a `license_reactivated` row into
// Turso `marketplace_events` ourselves. Display fields (product_id, tier,
// key_preview) come from the client body as `_display` hints; the UI already
// has the license row loaded, so resending them avoids a round-trip lookup.
// These are render-only — actor identity comes from the verified session.
adminRoutes.post('/licenses/set-active', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c) as {
    license_id: string;
    active: boolean;
    reason?: string;
    _display?: {
      product_id?: string;
      product_name?: string;
      tier?: string;
      key_preview?: string;
      user_id?: string;
    };
  };
  const { _display, ...forwarded } = body;
  const res = await adminSetActive(c.env, actor, forwarded as Parameters<typeof adminSetActive>[2]);

  // Best-effort event emit — never block the response on this.
  if (body.active === true && (res as { ok?: boolean })?.ok !== false) {
    try {
      const eventId = crypto.randomUUID();
      const data = JSON.stringify({
        productId: _display?.product_id,
        productName: _display?.product_name,
        tier: _display?.tier,
        keyPreview: _display?.key_preview,
        reason: body.reason,
      });
      await exec(
        db(c.env),
        `INSERT INTO marketplace_events (id, kind, actor_id, data, created_at) VALUES (?, ?, ?, ?, ?)`,
        [eventId, 'license_reactivated', _display?.user_id ?? null, data, Date.now()],
      );
    } catch (err) {
      console.warn('[admin] license_reactivated event emit failed:', (err as Error).message);
    }
  }
  return c.json(res);
});

// POST /admin/licenses/reset-devices — clear HWID bindings. Used when
// a customer gets a new machine or reports lost HWID slot.
adminRoutes.post('/licenses/reset-devices', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c);
  const res = await adminResetDevices(c.env, actor, body as Parameters<typeof adminResetDevices>[2]);
  return c.json(res);
});

// ───────── Client operations ────────────────────────────────────────────────

// POST /admin/clients/list — rollup by customer. Admin sees scope='elyhub'
// only (Supabase enforces); owner can pass scope='all'.
adminRoutes.post('/clients/list', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  const body = await safeBody(c);
  const res = await adminListClients(c.env, actor, body as Parameters<typeof adminListClients>[2]);
  return c.json(res);
});

// POST /admin/clients/get — detail view. Owner-only per SETUP.md
// (external canals carry PII). Supabase also enforces.
adminRoutes.post('/clients/get', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  if (actor.role !== 'owner') return c.json({ error: 'forbidden' }, 403);
  const body = await safeBody(c);
  const res = await adminGetClient(c.env, actor, body as Parameters<typeof adminGetClient>[2]);
  return c.json(res);
});

// ───────── Listing metadata (Kassa flag) ────────────────────────────────────

// PATCH /admin/listings/:id/kassa — mark a listing as a Kassa product so
// purchase handler starts issuing licenses. Sprint 2 convenience — saves
// manual SQL. Owner-only (admins shouldn't decide what's Kassa-gated).
adminRoutes.post('/listings/:id/kassa', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  if (actor.role !== 'owner') return c.json({ error: 'forbidden' }, 403);

  const lid = c.req.param('id')!;
  const body = (await safeBody(c)) as { kassa_product_id?: string | null; kassa_tier?: string | null };
  const pid = body.kassa_product_id ?? null;
  const tier = body.kassa_tier ?? null;

  // Validate product_id against a known allowlist. Keep the list loose —
  // Luan might add products on the Supabase side before we know about them.
  const allowed = new Set(['gleipnir', 'star', null]);
  if (pid !== null && !allowed.has(pid)) {
    // Soft warning: accept but log. Supabase is the source of truth.
    console.warn(`[admin] unknown kassa_product_id "${pid}" — accepting anyway`);
  }

  await exec(
    db(c.env),
    `UPDATE listings SET kassa_product_id = ?, kassa_tier = ?, updated_at = ?
     WHERE id = ?`,
    [pid, tier, Date.now(), lid],
  );
  return c.json({ ok: true, listing_id: lid, kassa_product_id: pid, kassa_tier: tier });
});

// ───────── Aura inject / deduct ─────────────────────────────────────────────

// POST /admin/aura — owner-only aura injection or deduction.
// Body: { userId: string, delta: number, note?: string }
// delta > 0: inject. delta < 0: deduct. delta === 0: error.
adminRoutes.post('/aura', async (c: AppContext) => {
  const actor = await requireAdminActor(c);
  if (actor instanceof Response) return actor;
  if (actor.role !== 'owner') return c.json({ error: 'forbidden' }, 403);

  const body = (await safeBody(c)) as { userId?: unknown; delta?: unknown; note?: unknown };
  const targetUserId = body.userId ? String(body.userId).trim() : '';
  const delta = Number(body.delta);
  const note = body.note ? String(body.note).slice(0, 280) : null;

  if (!targetUserId) return c.json({ error: 'userId_required' }, 400);
  if (!Number.isFinite(delta) || delta === 0) return c.json({ error: 'delta_must_be_nonzero' }, 400);

  const client = db(c.env);
  try {
    await exec(
      client,
      'UPDATE xp SET xp = MAX(0, xp + ?) WHERE user_id = ?',
      [delta, targetUserId],
    );
    await exec(
      client,
      `INSERT INTO aura_log (kind, from_user_id, to_user_id, amount, note, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'admin',
        actor.id,
        targetUserId,
        Math.abs(delta),
        note ?? (delta > 0 ? 'admin inject' : 'admin deduct'),
        now(),
      ],
    );
  } catch (err) {
    console.error('[admin/aura] failed:', (err as Error).message);
    return c.json({ error: 'aura_op_failed' }, 500);
  }

  return c.json({ ok: true, delta, userId: targetUserId });
});

// ───────── Helpers ──────────────────────────────────────────────────────────

async function safeBody(c: AppContext): Promise<object> {
  try {
    const b = await c.req.json();
    return typeof b === 'object' && b !== null ? b : {};
  } catch {
    return {};
  }
}
