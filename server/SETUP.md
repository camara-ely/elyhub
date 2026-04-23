# ElyHub backend — setup checklist

Everything in `server/` is a Cloudflare Workers backend. The code is
scaffolded and ready to deploy, but there are credentials and cloud
resources that have to come from you. This file is the step-by-step.

Treat it as a one-time setup. After these steps, `npm run deploy` from
`server/` is all you need for subsequent releases.

---

## 0 · Before you start

You'll need:

- [ ] A Cloudflare account (free tier is fine) — https://dash.cloudflare.com/sign-up
- [ ] Your existing Turso database URL + token
- [ ] The Discord application you're already using for OAuth
  (if you don't have one yet: https://discord.com/developers/applications)

Install the two CLI tools once (globally):

```sh
npm i -g wrangler       # Cloudflare Workers CLI
# Turso CLI is optional — only needed if you want to run schema
# migrations from your laptop. The apply-schema.mjs script works over HTTP.
```

Authenticate wrangler with your Cloudflare account:

```sh
wrangler login
```

---

## 1 · Install server dependencies

From the repo root:

```sh
cd server
npm install
```

This is isolated from the desktop app's `node_modules`. `server/` is
its own npm workspace.

---

## 2 · Create the R2 bucket

R2 is Cloudflare's S3-compatible object storage. This is where the
actual pack files live.

```sh
cd server
wrangler r2 bucket create elyhub-assets
```

Then generate S3 API credentials for it:

1. Go to **Cloudflare Dashboard → R2 → Manage R2 API Tokens**
2. Click **Create API Token**
3. Name it `elyhub-api`, permissions: **Object Read & Write**, bucket: `elyhub-assets`
4. TTL: **forever** (or rotate later)
5. Copy the Access Key ID + Secret Access Key — you'll paste them into
   wrangler secrets in step 5

Also note your **Cloudflare Account ID** (shown on the right sidebar of
the R2 page, and in the URL). You'll put it in `wrangler.toml`.

### CORS on the bucket

The desktop app and plugin upload **directly** to R2 via presigned URLs,
so R2 needs to allow the Tauri origin + the plugin hosts. Create
`server/r2-cors.json`:

```json
[
  {
    "AllowedOrigins": [
      "tauri://localhost",
      "http://tauri.localhost",
      "https://tauri.localhost",
      "http://localhost:1420"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply it:

```sh
wrangler r2 bucket cors put elyhub-assets --rules r2-cors.json
```

Once the plugin lands, add its origin(s) to `AllowedOrigins` and re-apply.

---

## 3 · Create the KV namespace (for pairing codes)

```sh
cd server
wrangler kv namespace create PAIRING
wrangler kv namespace create PAIRING --preview
```

Both commands print an `id = "..."` line. Paste them into
`server/wrangler.toml` — replace the empty strings in
`[[kv_namespaces]]` (id + preview_id).

---

## 4 · Fill in `wrangler.toml`

Open `server/wrangler.toml` and set:

- `DISCORD_CLIENT_ID` — your Discord app's Application ID (public, not the secret)
- `DISCORD_REDIRECT_URI` — leave the dev value for local, set the prod
  `workers.dev` URL (you'll know it after the first `wrangler deploy`)
- `TURSO_URL` — `libsql://your-db-name.turso.io`
- `R2_ACCOUNT_ID` — the Cloudflare Account ID from step 2
- `R2_BUCKET` — `elyhub-assets` (already the default)
- `R2_PUBLIC_BASE` — leave empty for now (only used if you expose
  public-read files like listing covers via a public R2 URL)

Don't set the SECRETS here — that's step 5.

---

## 5 · Set Workers secrets

These are values Cloudflare encrypts and never shows again. Run each
command; wrangler will prompt for the value.

```sh
cd server

# Discord — the "Client Secret" from the OAuth2 tab in your Discord app
wrangler secret put DISCORD_CLIENT_SECRET

# Turso — same token you already use locally
wrangler secret put TURSO_TOKEN

# JWT signing — generate a strong random string:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
wrangler secret put JWT_SECRET

# R2 S3 API keys from step 2
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

For production deploys, add `--env production` to each command so the
secret is scoped to the prod Worker:

```sh
wrangler secret put DISCORD_CLIENT_SECRET --env production
# ... repeat for all five
```

---

## 6 · Apply the database schema

Runs every file in `server/schema/*.sql` against your Turso DB, tracks
what's been applied in a `_migrations` table, and skips already-applied
files on re-run.

```sh
cd server
TURSO_URL="libsql://your-db.turso.io" \
TURSO_TOKEN="your-token" \
npm run db:push
```

Only ADD-type SQL is in `schema/001_initial.sql` — nothing drops or
modifies tables the Discord bot already writes to.

---

## 7 · Test locally

```sh
cd server
npm run dev
```

Wrangler serves at `http://localhost:8787`. Sanity-check:

```sh
curl http://localhost:8787/healthz
# → {"ok":true}

curl http://localhost:8787/listings
# → {"items":[]}  (or real listings if the bot has populated some)
```

For routes that need auth, first get a session token via
`/auth/discord/exchange` — either sign in through the desktop app (once
it's wired to the API) or `curl` with a Discord access_token you've
obtained out-of-band.

---

## 8 · Deploy

```sh
cd server

# Deploys to the `dev` environment — the Worker named `elyhub-api`
wrangler deploy

# Or for production:
wrangler deploy --env production
```

First deploy prints the Worker URL, e.g.
`https://elyhub-api.YOUR-SUBDOMAIN.workers.dev`. Copy it — you'll need
it in the next step.

---

## 9 · Point the desktop app at the API

Open `dist/config.js` (the local, gitignored one) and add:

```js
window.ELYHUB_CONFIG = {
  // ... existing values ...
  apiUrl: 'https://elyhub-api.YOUR-SUBDOMAIN.workers.dev',
};
```

The desktop-app refactor to actually USE this URL (replacing the direct
Turso calls in `dist/data.jsx`) is a separate task — see
[client migration notes](#migrating-the-desktop-client) below.

---

## 10 · Update the Discord OAuth redirect

In the **Discord Developer Portal → your app → OAuth2**, add both:

- `http://127.0.0.1:53134/callback` (keep this — desktop app still uses it for now)
- `https://elyhub-api.YOUR-SUBDOMAIN.workers.dev/auth/discord/callback` (for later, when we move the callback to the Worker)

---

## Migrating the desktop client

Not covered by this scaffold — it's a follow-up PR. In short:

1. Add an `ElyAPI` module (`dist/api.jsx`) that wraps `fetch` with the
   saved JWT and handles 401 → force re-login.
2. Replace each call in `dist/data.jsx` that talks to Turso directly
   with the equivalent `ElyAPI.get(...)` call.
3. Move wishlist/reviews/follows from `localStorage` to the API —
   local cache still OK, but source of truth is the server.
4. Drop `tursoToken` from `dist/config.js` when done; the token stays
   only in Workers where it can't be extracted from the bundle.

Do this AFTER deploying the backend and confirming each endpoint works
end-to-end with `curl`.

---

## Troubleshooting

**`wrangler deploy` fails with "no account selected"**
Run `wrangler login` first, then `wrangler whoami` to confirm.

**`/auth/discord/exchange` returns 502 `discord_unreachable`**
Discord API is probably fine — check the Worker has outbound network
access (Workers allow outbound fetch by default; no egress config
needed). Most likely the access_token itself is invalid.

**`/downloads/:id` returns 404 for a file you can see in R2**
The entitlement check failed. Verify in Turso:

```sql
SELECT * FROM user_library WHERE user_id = 'YOUR_DISCORD_ID';
```

If empty, the purchase flow didn't actually insert. Check the
`purchases` table too.

**R2 PUT returns 403 from the client**
CORS rules aren't applied, or the presigned URL is stale (TTL is
15 min). Re-request via `/uploads/request`.
