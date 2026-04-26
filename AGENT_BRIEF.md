# ElyHub — Agent Onboarding Brief

> Hand this to a fresh Claude/agent so it can pick up parallel work with full context.
> Last updated: 2026-04-25.

---

## 1. What is ElyHub?

ElyHub is a **Tauri 2 desktop app** (macOS/Windows/Linux) that acts as a **marketplace + plugin launcher** for products tied to a Discord economy ("Aura" currency) and to a Supabase-backed licensing system called **Kassa**.

The flagship plugin is **Hugin** (internal Kassa product id: `gleipnir`) — distributed as a private GitHub release that users download via a server-side zip-bundling proxy.

### Stack at a glance

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 (Rust) → `src-tauri/src/lib.rs` |
| Frontend | **Plain `<script>` JSX** (NO bundler at runtime) — `dist/*.jsx` files transpiled by `build.mjs` to `dist-prod/*.js` |
| UI framework | React 18 via CDN, no JSX runtime — uses classic transform |
| Backend | Cloudflare Workers + **Hono** — `server/src/**` |
| Database | **Turso** (libSQL) — db name: `elyhub` |
| Object storage | Cloudflare **R2** for cover images and pack uploads |
| Licensing/Auth | **Supabase** (Kassa project) — HMAC-signed RPC calls from Worker |
| Bot integration | Discord bot reads `marketplace_events` and DMs license keys |

---

## 2. Repo layout

```
ElyHub-app/
├── ARCHITECTURE.md         ← read this for deeper architectural notes
├── build.mjs               ← JSX → JS, no bundling, just transform
├── package.json            ← scripts: dev, build:prod
├── dist/                   ← SOURCE OF TRUTH for frontend (edit these)
│   ├── app.jsx             ← root, view router, view registry
│   ├── api.jsx             ← window.ElyAPI (get/post/put/del wrapper, auth header)
│   ├── auth.jsx            ← Discord OAuth via pairing flow
│   ├── data.jsx            ← polls /listings every ~30s, populates window.LISTINGS
│   ├── state.jsx           ← global hooks: useLibrary, useWishlist, useMessages, etc
│   ├── shell.jsx           ← sidebar, nav chrome, My Library list
│   ├── views.jsx           ← ZephyroView (Hugin), PluginPanelView, etc
│   ├── marketplace.jsx     ← MarketHomeView (storefront feed, filters)
│   ├── modals.jsx          ← Settings modal incl. Downloads pane
│   ├── publishing.jsx      ← usePublishing hook + PublishListingModal
│   ├── downloads.jsx       ← download stack, install flag tracking
│   ├── ui.jsx              ← icon set, primitives
│   ├── tokens.jsx          ← LISTING tokens, derived stats
│   └── ...
├── dist-prod/              ← BUILT artifacts — do not edit by hand
├── src-tauri/
│   ├── Cargo.toml          ← rfd, tauri, etc
│   └── src/lib.rs          ← invoke commands (download, file dialog, launch_app)
└── server/
    ├── wrangler.toml
    └── src/
        ├── index.ts        ← Hono app, route mounting
        ├── db.ts           ← Turso client helpers (queryAll, queryOne, exec, batch)
        ├── auth.ts         ← Discord OAuth, requireAuth() middleware
        ├── r2.ts           ← signed URL helpers
        ├── lib/
        │   ├── kassa-licensing.ts  ← issueLicense, revokeLicense, admin grants
        │   └── kassa-cron.ts       ← drains license_issuance_queue
        └── routes/
            ├── listings.ts          ← marketplace CRUD, purchase, GitHub release proxy
            ├── me.ts                ← /me/licenses (Reveal flow)
            ├── downloads.ts         ← R2 download ticketing for non-GitHub packs
            ├── reviews.ts, uploads.ts, admin.ts, maker.ts, pairing.ts, users.ts, auth.ts
```

**Critical convention:** `dist/*.jsx` files are NOT modules. They're loaded as `<script type="text/babel">` style after build. No imports — everything lives on `window.*`. When adding a function/component, expose it via `window.X = ...` if other files need it.

---

## 3. Build & run

```bash
# Frontend rebuild (JSX → JS)
npm run build:prod

# Tauri dev (live reload)
npm run dev

# Full release DMG (~58s on M-series)
npm run build:prod && cd src-tauri && cargo tauri build
# → src-tauri/target/release/bundle/macos/ElyHub.app
# → src-tauri/target/release/bundle/dmg/ElyHub_0.1.0_aarch64.dmg
```

The Worker is deployed via `wrangler deploy` from `server/`. Production URL is in `dist/config.js` (`window.ELY_API_BASE`).

---

## 4. Key data flows

### 4.1 Listings poll
`data.jsx` polls `GET /listings` every ~30s. The handler in `server/src/routes/listings.ts` returns rows from the `listings` table (with `cover_url` presigned). The poll **mutates `window.LISTINGS` in place** (`.length = 0` then push) so React refs stay stable.

### 4.2 Purchase + license issuance (most important flow)
`POST /listings/:id/purchase` — gated by `requireAuth()`:

1. Validates aura balance (live = bot xp − SUM(purchases)).
2. Checks `user_library` for already-owned.
3. Atomic `client.batch()`:
   - `INSERT INTO purchases` (this IS the debit)
   - `INSERT INTO user_library`
   - `UPDATE listings SET downloads = downloads + 1`
   - If `kassa_product_id IS NOT NULL`: `INSERT INTO license_issuance_queue`
4. Best-effort sync: `issueLicense()` → Supabase RPC `kc_issue_license` (HMAC-signed via `signedFetch`).
5. On success:
   - `UPDATE user_library SET license_key = ?`
   - `INSERT INTO user_license_keys` (canonical key store, used by `/me/licenses` Reveal)
   - `INSERT INTO marketplace_events kind='license_purchased'` → **bot reads this and DMs the buyer the full key + posts masked audit row**
6. Returns `{ ok, purchase_id, license_key, license_pending }`.

**If sync issuance fails:** purchase still succeeds (aura already debited). Queue row stays, cron worker (`kassa-cron.ts`) drains on retry. Client gets `license_pending: true`.

### 4.3 GitHub release download (Hugin)
`GET /listings/:id/release/download` — gated by `requireAuth()` + library check:

- Parses `current_version_url` of the listing (e.g. `https://github.com/owner/repo/releases/tag/v0.1.0`)
- Fetches release-by-tag with GitHub PAT
- For EACH asset:
  - Hop 1: `GET /repos/:o/:r/releases/assets/:id` with `Accept: application/octet-stream` + auth → 302 to S3
  - Hop 2: plain GET (no auth) for the signed S3 URL
- Streams everything through a `TransformStream`, framing each asset as a **STORE-format ZIP entry** (no compression, CRC32 IEEE poly `0xEDB88320`, GP flag bit 3 set so size/CRC go in the data descriptor — required for streaming).
- Final central directory + EOCD written after last entry.
- `Content-Disposition: attachment; filename="${safeTitle}-${current_version}.zip"`.
- The `produce` async function is detached via `c.executionCtx.waitUntil(...)` so the response starts streaming immediately.

### 4.4 Tauri invoke surface (src-tauri/src/lib.rs)
Commands registered in `invoke_handler`:

| Command | Purpose |
|---|---|
| `reveal_in_finder(path)` | `open -R` (mac) / `explorer /select` / `xdg-open <parent>` |
| `open_path(path)` | `open` / `xdg-open` / `cmd /C start` |
| `default_download_dir()` | `$HOME/Downloads` |
| `pick_directory(default_path)` | `rfd::AsyncFileDialog` native folder picker |
| `launch_app(name_or_path)` | `open -a Hugin` etc — starts an installed `.app` |

Called from JSX via `window.__TAURI__.core.invoke('cmd', { args })`.

### 4.5 Install tracking
- localStorage key: `elyhub:installed:${listingId}` (value = version string).
- After download save, `downloads.jsx` writes the flag and dispatches `elyhub:installed-changed`.
- `window.useInstalled(listingId)` React hook subscribes to that event for live UI updates.
- Library count in `shell.jsx` filters `library.items` against `LISTINGS` ids to avoid stale-entry drift.

---

## 5. Important schema notes (Turso `elyhub` db)

```
listings(id, type, title, tagline, description, price_aura, billing,
         level_req, tags, cover_key, featured, status, downloads,
         created_at, updated_at,
         kassa_product_id, kassa_tier,           ← NULL for non-Kassa items
         current_version, current_version_url,
         author_user_id, ...)

purchases(id, user_id, listing_id, aura_amount, created_at)

user_library(user_id, listing_id, acquired_at, license_key)
  PRIMARY KEY(user_id, listing_id)

license_issuance_queue(id, purchase_id, user_id, listing_id,
                       kassa_product_id, kassa_tier, product_name,
                       amount_aura, attempts, last_attempt_at,
                       last_error, completed_at, created_at)

user_license_keys(license_id PK, user_id, license_key, product_id,
                  source, created_at)

marketplace_events(id, kind, actor_id, data JSON, created_at)
  ← Discord bot polls/reads kind='license_purchased' to DM keys
```

**One listing = one tier.** No `listing_tiers` table exists. Tiered pricing today is modeled by **multiple listings sharing `kassa_product_id`** (e.g. `hugin-001` with `kassa_tier='1key'` and `hugin-002` with `kassa_tier='2key'`).

---

## 6. Auth model

- Login is **Discord OAuth via pairing**: user runs `/pair` in Discord → bot writes a pairing code → app exchanges code for a session token.
- All mutations go through `requireAuth()` middleware which validates the bearer token against the `sessions` table.
- Frontend stores the token in localStorage (`elyhub.token`) and `window.ElyAPI` injects `Authorization: Bearer ...` automatically.

---

## 7. What's been done in recent sessions (summary)

✅ Streaming multi-asset zip bundler for GitHub releases (STORE format)
✅ Filename customization (`Hugin-v0.1.0.zip` instead of source repo name)
✅ Native folder picker for downloads dir (rfd crate)
✅ Post-install popup with "Show in Finder" / "Open Folder" buttons
✅ Settings → Downloads pane (pick dir, reset)
✅ Install flag + `useInstalled` hook with live event sync
✅ Library count fix (filter against live LISTINGS)
✅ 3-state CTA logic in plugin panels: Inactive / Download / Launch
✅ `launch_app` Tauri command (e.g. `open -a Hugin`)
✅ Sidebar dedup: Hugin entry redirects to `ZephyroView` (its main page)
✅ First-party plugins filtered out of marketplace feed
✅ IDownload icon (was sharing ICheck with About tab)
✅ Hugin pricing fixed in DB: `price_aura=30000, kassa_tier='1key'`

---

## 8. Active/known pending issues

### 🔴 Messages are entirely placeholder
`useMessages()` in `dist/state.jsx` (lines ~825-899) is **pure localStorage**. No backend integration. No `/messages` route exists in `server/src/routes/`. Sending a DM to another user does nothing across machines.

**Fix outline:**
1. Add `messages_threads(id, user_a, user_b, last_message_at)` and `messages(id, thread_id, from_user, body, attachment, created_at, read_at)` tables in Turso.
2. Add `server/src/routes/messages.ts` with: `GET /messages/threads`, `GET /messages/threads/:id`, `POST /messages/send`, `POST /messages/threads/:id/read`.
3. Refactor `useMessages` to call API + poll every ~10s (or use Durable Object for realtime later).

### 🔴 Marketplace publishing fails for non-author user (Kassa account reported it)
`usePublishing.publish()` in `dist/publishing.jsx` (line 145) does call `window.ElyAPI.post('/listings', payload)` correctly. So the bug is server-side or auth-side. **Not yet investigated.** Probable causes:
- Author check / role gating in `POST /listings` rejects non-maker accounts
- Kassa user wasn't a "maker" yet (needs role grant in `users` table)
- Cover upload to R2 failing silently → row created but cover_key NULL → invisible

Need to: read `server/src/routes/listings.ts` create handler + reproduce on staging.

### 🟡 2-tier pricing for Hugin (decided: option A)
Going to duplicate the listing instead of building `listing_tiers`. See §9.

### 🟡 Direct-to-disk save
Today the save still uses `<a download>` after the streaming response, which means the user-picked download dir from settings isn't actually used by the browser shim. Need a Rust path that writes Blob bytes to chosen dir.

---

## 9. Decided next step (option A): duplicate Hugin listing

User chose option A over a `listing_tiers` schema. Plan:

1. **DB:** insert `hugin-002` row, same `kassa_product_id='gleipnir'`, `kassa_tier='2key'`, `price_aura=50000`, same `current_version_url`, same `cover_key`.
2. **Library dedup:** in `shell.jsx` Library list and count, group by `kassa_product_id` so a user who owns both tiers only sees Hugin once (showing the higher tier).
3. **Marketplace:** both cards show — that's the desired UX.
4. **No backend changes needed** — purchase already passes `kassa_tier` to `issueLicense()`.

---

## 10. Conventions / gotchas (read before editing)

- **No bundler:** `dist/*.jsx` cannot use `import`. Add to `window.*`.
- **`window.LISTINGS` is mutated in place** — never reassign, push/splice or do `.length = 0` then push.
- **Tauri invoke from plain script:** `window.__TAURI__.core.invoke(...)` — note `core`, not just `__TAURI__.invoke`.
- **localStorage key conventions:** colon style for namespaced events (`elyhub:installed:${id}`), dot style for plain prefs (`elyhub.token`, `elyhub.downloadDir`). Don't mix.
- **CORS:** Worker has open CORS but **only with `Access-Control-Allow-Credentials: false`** — auth is bearer-token, never cookies.
- **Streaming responses in CF Workers:** must detach the producer with `c.executionCtx.waitUntil(...)`, otherwise the runtime cancels writes after the response object is returned.
- **HMAC for Kassa:** `signedFetch` uses `KC_MARKETPLACE_HMAC_SECRET` (32-byte hex) — same secret on Supabase side. Don't log it.
- **Discord bot is a separate repo** — it reacts to `marketplace_events` rows. Don't try to call Discord directly from the Worker.
- **Cover images:** `cover_key` is the R2 object key, presigned at read time via `signCoverUrl(env, key)`. Never store full URLs in DB.
- **Reviews are lazy-hydrated:** `state.jsx` calls `GET /listings/:id/reviews` on first view, cached in memory.

---

## 11. Useful one-liners for orientation

```bash
# Find where a hook/component lives
grep -rn "useMessages\|MarketHomeView\|PluginPanelView" dist/

# Inspect Turso row for Hugin
turso db shell elyhub "SELECT id,title,price_aura,kassa_product_id,kassa_tier,current_version FROM listings WHERE kassa_product_id='gleipnir';"

# Check Worker logs
cd server && wrangler tail

# Rebuild only frontend (skip Tauri)
npm run build:prod
```

---

## 12. What you (new agent) should ask the user before starting

If you were handed a vague task ("fix messages", "polish UI"), confirm scope first:

- For messages: realtime polling vs Durable Object? Attachments scope? Read receipts?
- For publishing failure: do you have a Kassa-account session token to repro, or should I just read the code path?
- For UI work: which views? screenshot expected.

Don't start large refactors without confirming. The codebase ships to real users.

---

**End of brief. Read `ARCHITECTURE.md` for deeper notes if needed.**
