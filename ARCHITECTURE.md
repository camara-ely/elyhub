# ElyHub — Arquitetura Completa

Documento de referência técnica cobrindo 100% do sistema: autenticação, backend,
banco de dados, storage, marketplace, aura points, bot Discord, app desktop,
integrações cross-system e quirks conhecidos.

> Última revisão: abril/2026. Valida contra o código em `server/`, `src-tauri/`,
> `dist/` e `../Elyzinho Bot/`.

---

## 0. Visão de 10.000 pés

O ElyHub é um marketplace integrado a uma comunidade Discord. Três processos
autônomos trocam estado via **Turso** (libsql hospedado):

```
  ┌─────────────────────┐    grava xp/identidade    ┌──────────────┐
  │ Discord Bot (Node)  │ ─────────────────────────▶│              │
  │ Squarecloud         │◀──────────────────────────│   Turso DB   │
  │ better-sqlite3 local│    lê pending_ops          │  (libsql)    │
  └─────────────────────┘                            │              │
          ▲                                          │              │
          │ eventos Discord                          │              │
          │ (msg, voice, /slash)                     │              │
                                                     │              │
  ┌─────────────────────┐    lê xp/aura_log          │              │
  │ ElyHub App (Tauri)  │◀──────────────────────────│              │
  │ React + JSX in-     │──────────────────────────▶│              │
  │ browser (Babel)     │    insere pending_ops      │              │
  └─────────────────────┘                            │              │
          │                                          │              │
          │ HTTPS (JWT Bearer)                       │              │
          ▼                                          │              │
  ┌─────────────────────┐    lê/grava app tables     │              │
  │ Cloudflare Workers  │◀──────────────────────────▶│              │
  │ (Hono API)          │                            └──────────────┘
  │ JWT auth            │          ┌─────────────────┐
  └─────────────────────┘ presigna │     R2          │
          │              ─────────▶│  covers, packs, │
          │                        │  previews       │
          └───────────────────────▶│                 │
                                   └─────────────────┘
```

**Separação de responsabilidades:**
- **Bot** é dono autoritativo do XP. SQLite local é source-of-truth.
- **Turso** é barramento de sincronização — mirror do XP, inbox de ops do app,
  feed de eventos para UI.
- **Workers API** é dono autoritativo do marketplace (listings, purchases,
  library). Lê XP do Turso pra calcular saldo vivo.
- **R2** guarda arquivos grandes. Nem o Worker nem o Bot proxiam bytes.
- **App (Tauri)** é cliente puro — nunca escreve direto no Turso exceto
  `pending_ops`.

---

## 1. Autenticação Discord OAuth

### 1.1 Por que Implicit Grant

- Discord ainda exige `client_secret` no fluxo Authorization Code + PKCE
- Binário desktop não pode embutir secret com segurança
- Implicit Grant devolve `access_token` direto no fragmento da URL
- Token dura 7 dias — suficiente pra desktop app, usuário re-autentica semanal

### 1.2 Sequência completa (6 passos)

```
1. User clica "Sign in with Discord" no LoginGate (app.jsx)
   │
   ▼
2. ElyAuth.signIn() invoca Tauri command `discord_oauth_listen`
   │  (src-tauri/src/lib.rs)
   │  ┌─ Spawna TCP listener em 127.0.0.1:53134 em thread separada
   │  ├─ Timeout 300s (usuário pode abandonar o fluxo)
   │  └─ Retorna via mpsc channel quando token chega
   ▼
3. ElyAuth invoca comando `open_url` com Discord OAuth authorize URL
   https://discord.com/oauth2/authorize?
     client_id=...&
     response_type=token&
     scope=identify&
     redirect_uri=http://127.0.0.1:53134/callback
   │
   ▼
4. Usuário aprova no browser → Discord redireciona pra
   http://127.0.0.1:53134/callback#access_token=XXX&token_type=Bearer
   │
   │ O Rust serve HTML inline na rota /callback com JS que:
   │   - Extrai o fragment via window.location.hash
   │   - Faz fetch('/token?access_token=...')
   │   - Mostra "Signed in! Closing..." por 1.2s
   │   - Fecha a aba (window.close())
   ▼
5. Rust captura o token na rota /token, manda pelo mpsc,
   devolve pra JS via invoke resolve.
   │
   ▼
6. ElyAuth chama POST /auth/discord/exchange
   { "access_token": "XXX" }
   │
   │ Backend (server/src/routes/auth.ts):
   │   - fetchDiscordProfile() → GET https://discord.com/api/users/@me
   │     com Authorization: Bearer XXX (valida que o token é real)
   │   - upsertUser() → INSERT OR UPDATE na tabela `users`
   │   - signSession() → HMAC-SHA256 via @tsndr/cloudflare-worker-jwt,
   │     assinado com env.JWT_SECRET, expira em 7 dias
   │   - getLiveBalance() → calcula aura = xp.xp - SUM(purchases.aura_amount)
   │
   ▼
   Resposta:
   {
     "token": "eyJ...",
     "user": { id, username, global_name, avatar_url, aura, level },
     "expires_at": 1713888000000
   }

7. Frontend (api.jsx) grava em localStorage:
   - elyhub.api.session.v1 → { token, expires_at }

   Toda chamada autenticada daqui pra frente manda:
   Authorization: Bearer eyJ...
```

### 1.3 Porta fixa 53134

Hardcoded em `src-tauri/src/lib.rs`. Precisa estar pre-registrada no Discord
Developer Portal como Redirect URI. Se outro processo estiver ocupando a porta,
o `TcpListener::bind` falha e o signIn aborta com erro.

### 1.4 Verificação em cada request

`server/src/auth.ts` → `requireAuth()` middleware:
1. Extrai `Authorization: Bearer <token>` do header
2. `jwt.verify(token, env.JWT_SECRET, { algorithm: 'HS256' })`
3. Se válido, popula `c.set('session', { userId, issuedAt })`
4. Se inválido/expirado, retorna 401 `{ error: 'unauthorized' }`

Helpers expostos:
- `userId(c)` — extrai `session.userId` do contexto Hono
- `avatarUrl(userId, hash)` — constrói CDN URL do Discord, com fallback pra
  embed avatar (0-5) quando hash é null. Protegido contra `BigInt` syntax
  error: valida com `/^\d+$/` antes de calcular o index.

---

## 2. Backend API (Cloudflare Workers + Hono)

### 2.1 Estrutura

**Arquivo:** `server/src/index.ts`

```ts
const app = new Hono<{ Bindings: Env }>();
app.use('*', logger());
app.use('*', cors({ ... }));            // whitelist explícita

app.get('/', health);                   // { ok, service, env }
app.get('/healthz', (c) => c.json({ ok: true }));

app.route('/auth', authRoutes);
app.route('/me', meRoutes);
app.route('/listings', listingRoutes);
app.route('/listings', reviewRoutes);   // composto sob mesmo prefixo
app.route('/uploads', uploadRoutes);
app.route('/downloads', downloadRoutes);
app.route('/pairing', pairingRoutes);
app.route('/users', userRoutes);
```

### 2.2 CORS

Bindings permitidos:
- `tauri://localhost` (macOS/Linux)
- `http://tauri.localhost`, `https://tauri.localhost` (Windows)
- `http://localhost:*`, `http://127.0.0.1:*` (dev — qualquer porta)

`credentials: true`, `allowMethods: [GET, POST, DELETE, OPTIONS]`,
`allowHeaders: [Content-Type, Authorization]`, `maxAge: 86400`.

### 2.3 Tabela de rotas completa

| Método | Rota | Auth | Função |
|--------|------|------|--------|
| POST | `/auth/discord/exchange` | Não | Troca access_token por session JWT |
| GET  | `/me` | Sim | Perfil + saldo live + level |
| GET  | `/me/library` | Sim | Listings comprados pelo usuário |
| GET  | `/me/wishlist` | Sim | Saved/wishlist |
| POST | `/me/wishlist/:listing_id` | Sim | Adiciona ao wishlist |
| DELETE | `/me/wishlist/:listing_id` | Sim | Remove do wishlist |
| GET  | `/me/follows` | Sim | Lista de seguidos |
| POST | `/me/follows/:user_id` | Sim | Follow (bloqueia self-follow) |
| DELETE | `/me/follows/:user_id` | Sim | Unfollow |
| GET  | `/listings` | Não | Feed público, filtros `?type=`, `?limit=`, cover_url presigned |
| GET  | `/listings/:id` | Não | Detalhe + assets |
| POST | `/listings` | Sim | Cria draft |
| POST | `/listings/:id/publish` | Sim | draft → published (só seller) |
| DELETE | `/listings/:id` | Sim | Soft-delete (status='removed', só seller) |
| POST | `/listings/:id/purchase` | Sim | Debita aura, adiciona ao library (atômico) |
| GET  | `/listings/:id/reviews` | Não | Reviews + author profile |
| POST | `/listings/:id/reviews` | Sim | Upsert review (gate: user_library) |
| DELETE | `/listings/:id/reviews` | Sim | Remove review do usuário |
| POST | `/uploads/request` | Sim | Presigned PUT URL (15 min TTL) |
| POST | `/uploads/complete` | Sim | Marca upload ok, grava sha256, promove cover |
| GET  | `/downloads/public/:id` | Não | Presigned GET 302 redirect (cover/preview/screenshot) |
| GET  | `/downloads/:id` | Sim | Presigned GET 302 redirect (pack, com entitlement check) |
| GET  | `/downloads/:id/url` | Sim | Igual acima mas retorna JSON `{url, expires_in}` |
| POST | `/pairing/start` | Não | Cria código 6 chars, KV TTL 5 min |
| GET  | `/pairing/:code/status` | Não | Plugin polla; retorna 'pending' ou 'confirmed' + token |
| POST | `/pairing/:code/confirm` | Sim | App confirma código, minta JWT pro plugin |
| GET  | `/users/:id` | Não | Perfil público, Cache-Control 60s |

### 2.4 Fluxo de compra atômico

`POST /listings/:id/purchase` (server/src/routes/listings.ts):

```
1. requireAuth() → session.userId
2. Paralelo: queryOne(listing) + getLiveBalance(uid)
3. Valida:
   - listing.status === 'published' → senão 410 'listing_not_available'
   - listing.seller_id !== uid       → senão 403 'cannot_buy_own_listing'
   - balance.level >= level_req      → senão 403 'level_too_low'
   - balance.aura >= price_aura      → senão 402 'insufficient_aura'
4. Checa ownership prévia:
   SELECT acquired_at FROM user_library WHERE user_id=? AND listing_id=?
   Se existe → retorna 200 { already_owned: true, acquired_at }
5. Transação atômica (batch libsql write):
   a) INSERT INTO purchases (id, user_id, listing_id, aura_amount, created_at)
      aura_amount = price_aura (positivo; saldo = earned - SUM(aura_amount))
   b) INSERT INTO user_library (user_id, listing_id, acquired_at)
   c) UPDATE listings SET downloads = downloads + 1, updated_at = now
6. Retorna { ok: true, purchase_id, acquired_at }
```

Refund seria um `INSERT INTO purchases` com `aura_amount` negativo e
`refund_of = <purchase_id>`. Nunca DELETE.

### 2.5 Reviews — composite PK + upsert

`reviews` tem PK `(user_id, listing_id)`. POST usa:

```sql
INSERT INTO reviews (user_id, listing_id, stars, body, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(user_id, listing_id) DO UPDATE SET
  stars = excluded.stars,
  body = excluded.body,
  updated_at = excluded.updated_at
```

Gate de ownership: `SELECT 1 FROM user_library WHERE user_id=? AND listing_id=?`.
Sem row = 403 `not_owned`. O id sintético `${listingId}:${userId}` vai pro
cliente como identificador opaco.

---

## 3. Banco de Dados (Turso libsql)

Duas "metades" do schema:

### 3.1 Tabelas do app (criadas pelo backend)

**Arquivo:** `server/schema/001_initial.sql`

#### `users`
```sql
id            TEXT PRIMARY KEY        -- Discord snowflake
username      TEXT NOT NULL
global_name   TEXT
avatar_hash   TEXT                    -- só hash; avatarUrl() constrói URL
aura          INTEGER DEFAULT 0       -- LEGACY CACHE; nunca confiar
level         INTEGER DEFAULT 1       -- LEGACY CACHE; nunca confiar
created_at    INTEGER NOT NULL        -- unix ms
last_seen_at  INTEGER NOT NULL        -- bumpado a cada /me
banned_at     INTEGER                 -- soft-ban
```

**Atenção:** `aura`/`level` são legado. Fonte de verdade é `xp.xp` (tabela do
bot) menos `SUM(purchases.aura_amount)`. `getLiveBalance()` computa na hora.

#### `listings`
```sql
id            TEXT PRIMARY KEY        -- UUID
seller_id     TEXT NOT NULL FK users(id)
type          TEXT NOT NULL           -- sfx | plugin | theme | preset | pack
title         TEXT NOT NULL
tagline       TEXT
description   TEXT
price_aura    INTEGER NOT NULL        -- 0 = free
billing       TEXT DEFAULT 'one-time' -- one-time | monthly
level_req     INTEGER DEFAULT 1
tags          TEXT                    -- JSON array
cover_key     TEXT                    -- R2 key do cover ativo
featured      INTEGER DEFAULT 0
status        TEXT DEFAULT 'draft'    -- draft | published | removed
downloads     INTEGER DEFAULT 0
created_at    INTEGER NOT NULL
updated_at    INTEGER NOT NULL
```

#### `assets`
```sql
id            TEXT PRIMARY KEY        -- UUID
listing_id    TEXT NOT NULL FK listings(id) ON DELETE CASCADE
kind          TEXT NOT NULL           -- cover | preview | pack | screenshot
filename      TEXT NOT NULL
r2_key        TEXT NOT NULL UNIQUE
size_bytes    INTEGER NOT NULL
content_type  TEXT NOT NULL
sha256        TEXT                    -- null até /uploads/complete
created_at    INTEGER NOT NULL
```

#### `purchases` (append-only)
```sql
id            TEXT PRIMARY KEY
user_id       TEXT NOT NULL FK
listing_id    TEXT NOT NULL FK
aura_amount   INTEGER NOT NULL        -- positivo = debit; negativo = refund
refund_of     TEXT FK purchases(id)   -- só em refunds
created_at    INTEGER NOT NULL
```

#### `user_library` (desnormalizado)
```sql
user_id       TEXT NOT NULL FK
listing_id    TEXT NOT NULL FK
acquired_at   INTEGER NOT NULL
PRIMARY KEY (user_id, listing_id)
```

#### `reviews`, `wishlist`, `follows`, `blocks`, `device_pairings`
Composite PKs, constraints anti-self (`follower_id <> followee_id`), ver
arquivo de schema pra detalhes.

### 3.2 Tabelas do bot (criadas por `initTurso()`)

**Arquivo:** `../Elyzinho Bot/src/utils/turso.js`

#### `xp` (mirror do bot)
```sql
user_id                 TEXT PRIMARY KEY
xp                      INTEGER NOT NULL DEFAULT 0
level                   INTEGER NOT NULL DEFAULT 0
voice_seconds           INTEGER NOT NULL DEFAULT 0
gym_posts               INTEGER NOT NULL DEFAULT 0
gym_streak_current      INTEGER NOT NULL DEFAULT 0
gym_streak_best         INTEGER NOT NULL DEFAULT 0
gym_last_day            TEXT                    -- YYYY-MM-DD
last_daily_claim_day    TEXT                    -- tag bonus
last_booster_claim_day  TEXT                    -- booster bonus
display_name            TEXT                    -- identity cache
avatar_url              TEXT
roles                   TEXT                    -- JSON [{id,name,color,position}]
updated_at              INTEGER NOT NULL
```

Backend só **lê**. Bot é o único que escreve (via `mirrorUser()`).

#### `pending_ops` (inbox app→bot)
```sql
id            TEXT PRIMARY KEY        -- UUID gerado pelo app
kind          TEXT NOT NULL           -- gift | daily_tag | daily_booster | redeem
from_user_id  TEXT NOT NULL
to_user_id    TEXT                    -- null em self-actions
amount        INTEGER
note          TEXT
created_at    INTEGER NOT NULL        -- unix ms
applied_at    INTEGER                 -- null = pendente; unix s quando processado
result        TEXT                    -- 'ok' | 'failed:reason' | 'invalid:reason'
```

Index: `idx_pending_ops_unapplied` em `(created_at) WHERE applied_at IS NULL`.

#### `aura_log` (feed de eventos)
Append-only, lido pela Home do app pra renderizar "aura activity feed".
Exclui XP de mensagem/voz (alta frequência, poluiria o feed).

#### `server_meta`
KV de 2 chaves: `icon_url` e `name`. Bot atualiza no `ready` e no
`GuildUpdate` pra app seguir o ícone do servidor quando o Diogo troca.

### 3.3 Cálculo do saldo vivo

**`server/src/auth.ts` → `getLiveBalance(client, userId)`:**

```sql
SELECT
  (SELECT xp FROM xp WHERE user_id = ?)                                 AS xp,
  (SELECT level FROM xp WHERE user_id = ?)                              AS xp_level,
  COALESCE((SELECT SUM(aura_amount) FROM purchases WHERE user_id = ?), 0) AS spent
```

**Resultado:** `aura = max(0, xp - spent)`, `level = xp_level`.

**Por que não cacheamos em `users.aura`:**
- Bot e app nunca disputam uma escrita
- Refund é só mais uma row em `purchases` com sinal invertido
- Consistência garantida sem locks cross-system

**Race teórica:** duas compras no mesmo ms podem ambas ver saldo ok. Janela
é pequena demais pra virar problema prático (nunca aconteceu).

---

## 4. R2 (Object Storage)

### 4.1 Estrutura de keys

```
listings/{listing_id}/{asset_id}/{safe_filename}
```

Exemplo:
```
listings/550e8400-.../6ba7b810-.../drums-kit-v2.zip
```

`safe_filename`: `/[^a-zA-Z0-9._-]/g → '_'`, cap 120 chars. Previne path
traversal e mantém URLs legíveis.

### 4.2 Presigned URLs

**Arquivo:** `server/src/r2.ts`

Usa AWS4 signature (S3-compatible):
```
https://{account_id}.r2.cloudflarestorage.com/{bucket}
```

| Função | TTL | Uso |
|--------|-----|-----|
| `signPutUrl(env, key, contentType)` | 15 min | Upload direto do cliente (bypass Worker 100MB) |
| `signGetUrl(env, key, ttlSec=300)` | 5 min | Download de pack entitled |
| `signCoverUrl(env, key)` | 1 h | Thumbnails do feed (browser cacheia) |

`assetKey(listingId, assetId, filename)` centraliza o formato.

### 4.3 Upload flow

```
1. Creator → POST /uploads/request
   { listing_id, kind: 'cover'|'pack'|..., filename, content_type, size_bytes }

2. Backend valida:
   - seller_id do listing === uid
   - listing.status === 'draft'
   - size_bytes <= 2GB
   - kind ∈ {cover, preview, pack, screenshot}

3. Backend gera asset_id (UUID), computa r2_key, INSERT INTO assets
   (com sha256=NULL), assina PUT URL 15 min TTL
   Retorna { asset_id, put_url, r2_key }

4. Cliente PUT direto no R2 (não passa pelo Worker).

5. Cliente → POST /uploads/complete { asset_id, sha256 }

6. Backend UPDATE assets SET sha256 = ?.
   Se kind='cover', também UPDATE listings SET cover_key = assets.r2_key.
```

### 4.4 Download flow (entitlement)

```
GET /downloads/:asset_id  (requer auth pra kind='pack')

SELECT a.r2_key, a.kind, l.seller_id
FROM assets a
JOIN listings l ON l.id = a.listing_id
LEFT JOIN user_library ul ON ul.listing_id = a.listing_id AND ul.user_id = ?
WHERE a.id = ?
  AND (a.kind IN ('cover','preview','screenshot')  -- públicos
       OR ul.user_id IS NOT NULL                    -- dono
       OR l.seller_id = ?)                          -- seller (QA)
```

Se passou: assina GET URL (5 min), retorna 302 redirect. Cliente segue,
R2 serve o arquivo direto.

Pra clientes que precisam do URL em JSON (plugins headless, por exemplo):
`GET /downloads/:id/url` retorna `{ url, expires_in }` sem redirect.

---

## 5. Aura Points (XP) — Sistema Completo

### 5.1 Onde é ganho (só no bot)

**Arquivo:** `../Elyzinho Bot/src/utils/xp.js`

| Fonte | Quantidade | Cooldown | Kind log |
|-------|-----------|----------|----------|
| Mensagem em canal | 15–25 random | 60s por user | (não loga — alta freq) |
| Voice channel | 10 XP/min | contínuo | (não loga) |
| Gym post | 300 + streak bonus | 1x/dia UTC | `gym_post` |
| Daily tag (ELY role) | 300 | 1x/dia UTC | `daily_tag` |
| Daily booster | 500 | 1x/dia UTC | `daily_booster` |
| /postjob | 50 | — | `postjob` |
| /available | 20 | 1x/dia UTC | `available` |
| Gift transfer | negociado | — | `gift` |

**Streak milestones (gym):** 7 dias → 500 bonus; 30 → 2000; 100 → 10000.
Tolerância: gap de 1–2 dias mantém streak; gap > 2 reseta.

**Fórmula de level (MEE6-style):**
```js
xpForLevel(n) = 5n² + 50n + 100
totalXpForLevel(n) = sum(xpForLevel(i), i=0..n-1)
```

### 5.2 Onde é gasto (só no app)

Única via: `POST /listings/:id/purchase`. Inserta row em `purchases` com
`aura_amount = listing.price_aura`. `getLiveBalance` subtrai dessa coluna.

Não existe "reembolso via UI" ainda, mas a primitiva está no schema
(`purchases.refund_of`).

### 5.3 Bridge bot ↔ app (pending_ops)

App não pode mutar XP direto — o bot é dono. Quando usuário clica
"Gift 100 aura for @Bob", o app faz:

```sql
INSERT INTO pending_ops (id, kind, from_user_id, to_user_id, amount, note, created_at)
VALUES (uuid, 'gift', 'alice_id', 'bob_id', 100, 'bday', now_ms)
-- applied_at fica NULL
```

Bot roda worker que polla a cada 5s:

**Arquivo:** `../Elyzinho Bot/src/utils/pending-ops-worker.js`

```
loop (5s):
  ops = fetchPendingOps(limit=20)   -- SELECT WHERE applied_at IS NULL
  for op in ops:
    switch op.kind:
      case 'gift':
        result = transferXp(op.from_user_id, op.to_user_id, op.amount,
                            { note: op.note })
      case 'daily_tag':
        // Checa se user ainda tem o ELY tag role no guild
        if not memberHasELYTag:
          result = 'invalid:no_tag'
        else:
          result = grantTagBonus(op.from_user_id)
      case 'daily_booster':
        if not member.premiumSince:
          result = 'invalid:not_booster'
        else:
          result = grantBoosterBonus(op.from_user_id)
      case 'redeem':
        // Desconta aura, loga admin channel, DM user
        result = redeemReward(op.from_user_id, op.note)

    markOpApplied(op.id, result)
```

Todo `addXp` chama `queueMirror(userId)` que debounca 400ms e flusha
pro Turso. App no próximo poll já vê o saldo atualizado.

### 5.4 Debouncing do mirror

**Arquivo:** `../Elyzinho Bot/src/utils/turso.js`

```js
const pending = new Set();
let flushTimer = null;

export function queueMirror(userId) {
  if (!client || !userId) return;
  pending.add(userId);
  if (flushTimer) return;
  flushTimer = setTimeout(flushPending, 400);
}
```

Colapsa múltiplos `addXp` em 400ms em 1 round-trip por user. Ex:
user manda 3 mensagens em 200ms → 1 `mirrorUser` no fim da janela.

### 5.5 Identity cache

Name/avatar/roles só ficam conhecidos quando o bot vê o user interagir.
`touchIdentity(user, member?)` atualiza cache em memória:

```js
identityCache.set(user.id, {
  displayName: user.globalName || user.username,
  avatarUrl: user.displayAvatarURL({ size: 128, extension: 'png' }),
  roles: member ? serializeRoles(member) : prev.roles,
});
```

`serializeRoles` filtra: `@everyone` (id === guild.id), roles managed (bots),
roles sem cor abaixo da posição 1 (filler). Ordena por position desc, serializa
JSON.

Mirror usa `COALESCE(excluded.x, xp.x)` pra preservar identity quando um flush
não tem valor novo (ex: voice tick sem interaction prévia).

### 5.6 Boot: hydrate + bulk sync

**Arquivo:** `../Elyzinho Bot/src/events/ready.js`

Problema: Squarecloud tem volume efêmero — cada deploy limpa `data/ely.db`.
Sem defesa, ao boot:
1. SQLite vazio
2. Users ganham XP novo do zero
3. `queueMirror` sobrescreve Turso (alto) com zeros (baixo)
4. Meses de XP perdidos

**Solução (3 camadas):**

1. **`hydrateFromTurso()`** — se heurística dispara (turso >10 rows E local
   parece limpo), puxa snapshot do Turso → SQLite local ANTES de qualquer
   mirror rodar.

   ```
   Heurística:
   - turso.count > 10
   - local.count == 0  OR  local.max_xp < turso.max_xp / 4
   ```

2. **`mirrorAllNow()`** — push-sync idempotente; cobre o caso inverso
   (Turso empty, local populated).

3. **`syncAllMemberRoles(guild)`** — fetch todos os membros do guild,
   chama `syncMemberRoles(m)` pra cada, que agora também chama
   `ensureUserRegistered(userId)` pra criar linha zero-XP se faltar.
   Importante após abrir pro público — evita usuários "invisíveis" no app
   por não terem mandado mensagem ainda.

### 5.7 Registro automático de novo membro

**Arquivo:** `../Elyzinho Bot/src/events/memberAdd.js`

Quando alguém entra no guild:

```js
if (!member.user?.bot && isTursoEnabled()) {
  syncMemberRoles(member);   // ensureUserRegistered + touchIdentity + queueMirror
}
// ...continua com embed de log no canal
```

Bots são filtrados (não poluem leaderboard/marketplace).

---

## 6. Marketplace — Jornada Completa

### 6.1 Criador publica

```
1. POST /listings
   { type: 'sfx', title, tagline, description, price_aura, billing,
     level_req, tags }
   → { id: uuid, status: 'draft' }

2. POST /uploads/request × N  (1 cover + 1+ pack + previews/screenshots)
   → { asset_id, put_url, r2_key }

3. Cliente PUT direto no R2 pra cada.

4. POST /uploads/complete × N
   → marca sha256; se kind='cover', seta listings.cover_key

5. POST /listings/:id/publish
   → status 'draft' → 'published'; aparece no feed.
```

### 6.2 Buyer descobre

```
GET /listings?type=sfx&limit=50
→ { items: [{ id, seller_id, title, price_aura, cover_url (presigned 1h) }, ...] }

GET /listings/:id
→ detalhe completo + assets[]

GET /listings/:id/reviews
→ reviews com author_name/avatar (join em users)
```

### 6.3 Buyer compra

Descrito em §2.4. Resumo:
- Valida status/ownership/level/aura
- Transação atômica: INSERT purchases + INSERT user_library + UPDATE downloads
- Retorna `{ ok, purchase_id, acquired_at }`

### 6.4 Buyer baixa

```
GET /downloads/:pack_asset_id
→ 302 redirect pra URL R2 presigned (5 min)
```

Plugin (ou app) segue redirect, R2 serve bytes direto.

### 6.5 Buyer review

```
POST /listings/:id/reviews
{ stars: 5, body: 'fogo' }

Gate: user_library tem row → senão 403 'not_owned'.
ON CONFLICT DO UPDATE — segundo POST edita.

DELETE /listings/:id/reviews
→ idempotente (404 vira ok)
```

Frontend (state.jsx `useReviews`) faz optimistic UI com rollback em erro.

### 6.6 Unpublish (soft-delete)

```
DELETE /listings/:id
→ status = 'removed', updated_at bumpado
```

Só seller. Listings removed:
- Não aparecem no feed
- user_library/purchases preservados (FK continua válida)
- Download permanece funcional pro dono (l.seller_id ou user_library match)
- No MessagesView, se alguém tinha compartilhado via DM, o card vira
  "Listing unavailable" em vez de quebrar

---

## 7. Device Pairing (plugin ↔ app)

### 7.1 Por que pairing

Plugins de DAW (FL, Ableton, etc.) não podem embutir OAuth Discord — não
podem abrir listener TCP, não têm webview confiável, e embutir secret é
proibido. Solução: **pareamento estilo smart TV**.

### 7.2 Fluxo completo

```
Plugin:
1. POST /pairing/start { device_name: 'FL Studio' }
   → { code: 'A3K9F2', expires_in: 300 }

2. Mostra "A3K9F2" na UI do plugin pro usuário.

3. Loop GET /pairing/A3K9F2/status a cada 2s:
   → { status: 'pending', device_name: 'FL Studio' }
   ... (até)
   → { status: 'confirmed', token: 'eyJ...', user_id: '...' }

App desktop (paralelo):
4. Usuário digita o código no app.
5. POST /pairing/A3K9F2/confirm  (com App's session JWT)
   → backend minta JWT novo pro plugin (signSession com plugin_device = true)
   → backend grava token no KV record sob code
   → { ok: true }

Plugin:
6. Próximo poll retorna { confirmed, token }, guarda em disco.
7. Daí em diante manda Authorization: Bearer <plugin_token> pra downloads.
```

### 7.3 Gerador de código

Alfabeto: 32 chars (A-Z 2-9, SEM 0/O/1/I/L). Comprimento 6 → 32⁶ ≈ 1 bilhão
de combinações. Retry em colisão (máx 5). TTL 5 min armazenado em Workers KV.

### 7.4 Backup em DB

Tabela `device_pairings` mantém cópia pro caso de KV estar down. KV é source-of-truth
primário por ser mais rápido que DB.

---

## 8. Desktop App (Tauri + React)

### 8.1 Estrutura de arquivos

```
src-tauri/
  src/lib.rs              -- Tauri commands (discord_oauth_listen, open_url)
  src/main.rs             -- entry point
  tauri.conf.json         -- janela, titleBarStyle=Overlay

dist/
  index.html              -- entry, carrega scripts em ordem
  config.js               -- window.ELYHUB_CONFIG (apiUrl, tursoUrl, ...)
  tokens.jsx              -- design tokens (T.accent, T.r, TY.h1, ...)
  theme.jsx               -- themes (dark/blue/purple/...)
  vendor/babel.js         -- Babel 7 standalone (JSX in-browser)
  vendor/react.development.js
  vendor/react-dom.development.js
  api.jsx                 -- ElyAPI (fetch wrapper, session localStorage)
  auth.jsx                -- ElyAuth (orchestra Discord OAuth)
  data.jsx                -- Turso poll loop, window.ME/MEMBERS/LISTINGS
  state.jsx               -- hooks: useLibrary, useWishlist, useReviews, useMessages, ...
  shell.jsx               -- sidebar + main layout
  app.jsx                 -- React root, router (view.id)
  marketplace.jsx         -- MarketHome, ListingDetail, ShareTrigger, DMPickerModal
  profile.jsx             -- Profile, CreatorProfile, My Listings
  publishing.jsx          -- New Listing / Edit Listing modal
  views.jsx               -- MessagesView, PluginPanelView, DiscoverView, ...
  modals.jsx              -- Quick actions, redeem, etc.
  ui.jsx                  -- Avatar, Btn, Glass primitives
  downloads.jsx           -- Download manager (Tauri FS writes)
```

### 8.2 Bootstrap

`index.html` carrega os scripts em ordem estrita. Cada `.jsx` é um IIFE que
expõe um global no `window`. Sem bundler, sem tree-shake — edita, reload,
roda. Babel standalone intercepta `<script type="text/babel">` e transpila
JSX → `React.createElement` em runtime.

**Custo:** Babel ~1MB gzipped, parse inicial lento. **Ganho:** iteração
instantânea, zero build toolchain. Aceitável pro escopo atual.

### 8.3 Globais do window

| Global | Fonte | Consumidores |
|--------|-------|-------------|
| `window.ElyAPI` | api.jsx | todas as chamadas autenticadas |
| `window.ElyAuth` | auth.jsx | LoginGate, shell header |
| `window.ME` | data.jsx | perfil próprio, gates de auth |
| `window.MEMBERS` | data.jsx (do Turso xp) | leaderboard, DM picker, seller lookup |
| `window.LISTINGS` | data.jsx (do /listings) | marketplace, library, feed |
| `window.__initialDataReady` | data.jsx | `await` no app.jsx antes de montar |
| `window.__liveStatus` | data.jsx | OfflineBanner |
| `window.__REMOTE_REVIEWS` | state.jsx | reviews hydration cache |
| `window.ElyNotify` | ui.jsx | `ElyNotify.toast({ text, kind })` |

### 8.4 Padrão subscribe push

`window.MEMBERS`/`LISTINGS` são arrays mutados in-place em vez de reassinalados
(senão os `const MEMBERS = [...]` legados apontariam pro array antigo):

```js
if (Array.isArray(window.MEMBERS)) {
  window.MEMBERS.length = 0;
  window.MEMBERS.push(...fresh);
}
```

Componentes se subscrevem via `window.__subscribeLive(fn)` e chamam
`setState({})` pra forçar re-render.

### 8.5 Hooks de estado (state.jsx)

- `useLibrary()` — compras/subscriptions persistentes em localStorage +
  sync com backend `/me/library`
- `useWishlist()` — sync com `/me/wishlist`
- `useFollows()` — sync com `/me/follows`
- `useReviews()` — local+remote híbrido, optimistic com rollback
- `useMessages()` — DMs in-app (localStorage, agora com attachments
  `{type:'listing', id}`)
- `useCoupons()` — códigos promocionais criador-emitidos
- `useReports()`, `useBlocks()` — moderação
- `useOnboarding()` — tour de primeira vez
- `useRecentlyViewed()` — MRU de listings abertos

### 8.6 Cleanup de dados legacy

**Arquivo:** `dist/data.jsx` (boot)

Drop em cada boot de:
- `ely.mockSpent:*` (cache antigo de debit per-user)
- Entries em `elyhub.library.v1` com `listingId.startsWith('l-')`
- Entries em `elyhub.wishlist.v1` matching mock ids
- Follows com `userId` matching `^(u\d+|me|seed-.*)$`
- Recently viewed com mock ids
- Cupons com `seed: true` ou referência a seller/listing mock

Backend usa UUIDs — padrão regex nunca dá falso positivo. Idempotente.

### 8.7 Portal pattern (modais/popovers)

WebKit/WebView2 criam stacking context por `backdrop-filter`. Modais
filhos de um card com backdrop-filter ficam presos atrás de cards irmãos
mesmo com z-index alto. **Solução:** `ReactDOM.createPortal(node, document.body)`.

Usado em:
- `DMPickerModal` — overlay full-screen
- `ShareMenu` — popover (com posicionamento via `getBoundingClientRect`
  do anchor, recalculado no scroll/resize)
- `WelcomeModal`, `PublishModal`, etc.

---

## 9. Tauri Shell

### 9.1 Janela

- `titleBarStyle: 'Overlay'` — sem titlebar nativa; JS desenha própria
- Strip invisível top=0, height=28 chama `plugin:window|start_dragging`
  no mousedown pra arrastar
- `--webkit-app-region: drag` não é confiável no Tauri 2 WKWebView

### 9.2 Comandos Rust expostos

| Comando | Arquivo | Função |
|---------|---------|--------|
| `discord_oauth_listen` | lib.rs | TCP listener 53134, capta access_token |
| `open_url` | lib.rs | `open` (mac) / `xdg-open` (linux) / `cmd /C start` (win) |

### 9.3 Plugins Tauri

```rust
.plugin(tauri_plugin_shell::init())
.plugin(tauri_plugin_notification::init())
```

- **shell** — execução de comandos sistema (legacy, maior parte não usamos)
- **notification** — toast nativo OS (macOS banner, Windows action center)

### 9.4 Limitações conhecidas

- `window.confirm()` é **no-op** em WKWebView (macOS). Substituído por
  arm+commit (dois cliques com armed state de 3s)
- `window.prompt()` idem
- `window.open(url, '_blank')` abre **dentro do webview** em vez do browser
  nativo — use `open_url` via invoke
- CORS: webview manda `Origin: tauri://localhost` (ou `http://tauri.localhost`
  no Windows). Backend precisa whitelisting explícito; wildcard não combina
  com `credentials: true`

---

## 10. Padrões e quirks importantes

### 10.1 Soft-delete em todos os lugares
- Listings: `status='removed'` (preserva FK de purchases/library)
- Users: `banned_at IS NOT NULL` (audit trail)
- Nunca DELETE quando há referências

### 10.2 Composite PK pra unicidade
- `reviews (user_id, listing_id)` — 1 review por par
- `wishlist`, `user_library`, `follows` idem
- ON CONFLICT DO UPDATE = upsert atômico

### 10.3 Immutable transaction log
- `purchases` nunca atualiza; refund é nova row com `aura_amount < 0` e
  `refund_of`
- `aura_log` append-only

### 10.4 Presigned URLs > proxy
- Workers têm limite 100MB body — impossível streamar pack de 500MB
- R2 é CDN-globally-cached — servir direto reduz latência
- TTLs curtos (5 min pack, 15 min upload) limitam exposição se URL vaza

### 10.5 Gates de entitlement
- Download pack: `user_library` row OU seller ownership
- Review: `user_library` row
- Delete listing: seller ownership
- Publish: seller ownership

### 10.6 Saldo vivo > cache
- Nunca confiar em `users.aura` (legacy)
- Sempre calcular `xp.xp - SUM(purchases.aura_amount)` sob demanda
- Evita race cross-system bot↔app

### 10.7 Debounced mirror
- 400ms no bot pra colapsar múltiplos addXp
- App poll 5s pra minimizar custo HTTP do Turso

### 10.8 Registro automático
- `memberAdd` chama `syncMemberRoles(m)` → `ensureUserRegistered` +
  `touchIdentity` + `queueMirror`
- Bulk scan no boot faz o mesmo pra todo guild (backfill de lurkers)
- Bots filtrados

### 10.9 Portal pra escapar stacking context
- `backdrop-filter` cria novo stacking context no WebKit
- `position: fixed + z-index` não vaza
- `createPortal(node, document.body)` é o único escape confiável

### 10.10 BigInt guard em avatarUrl
- Discord CDN embed avatars usam `(snowflake >> 22) % 6`
- Ids fake (dev data) quebram BigInt() com SyntaxError
- Guard: `/^\d+$/.test(userId)` antes de BigInt; catch → idx=0

---

## 11. Ordem de boot (fresh start)

```
1. Bot boot (Squarecloud container):
   a. initTurso()         — cria tabelas Turso se faltam
   b. hydrateFromTurso()  — restaura SQLite local se wiped
   c. mirrorAllNow()      — push idempotente de tudo local → Turso
   d. startPendingOpsWorker — loop 5s de fetch/apply/mark
   e. syncGuildIdentity   — grava icon_url/name no server_meta
   f. syncAllMemberRoles  — ensureUserRegistered + identity cache pra todos
   g. scanAllGuilds       — retoma voice XP pra quem já tá em call
   h. status rotator      — muda presença a cada 5 min

2. Cloudflare Worker:
   - Deploy via `wrangler deploy --env production`
   - Nenhum boot lógico; stateless por request

3. Desktop App:
   a. Tauri abre janela, carrega dist/index.html
   b. config.js seta window.ELYHUB_CONFIG
   c. scripts em ordem, cada um IIFE
   d. data.jsx lê localStorage (legacy cleanup), abre Turso client,
      resolve __initialDataReady quando 1º poll chega
   e. app.jsx monta React root em #root
   f. LoginGate checa ElyAPI.isSignedIn(); se sim, entra na app,
      senão mostra botão Sign in
```

---

## 12. Checklist de deploy (novo ambiente)

### Backend (Cloudflare)
1. Provisionar Turso database, rodar `schema/001_initial.sql`
2. Criar R2 bucket, configurar CORS (`r2-cors.json`)
3. Criar Workers KV namespace pra pairing
4. `wrangler.toml` com bindings: `TURSO_URL`, `TURSO_TOKEN`, `R2_*`,
   `JWT_SECRET`, `DISCORD_CLIENT_ID/SECRET`, `PAIRING` (KV), `ASSETS` (R2)
5. `wrangler secret put JWT_SECRET` etc.
6. `wrangler deploy --env production`
7. Testar `curl https://api.example.com/healthz`

### Bot (Squarecloud)
1. `.env`: `DISCORD_TOKEN`, `GUILD_ID`, `TURSO_URL`, `TURSO_AUTH_TOKEN`,
   `CHANNEL_LOGS`, etc.
2. `npm run deploy-commands` (registra /slash globais)
3. Zip → Squarecloud → deploy
4. Verificar logs: `[turso] schema ready`, `✅ Elyzinho online`,
   `🪞 Turso mirror enabled`, `🛟 Turso hydrate` (se aplicável),
   `🪪 Turso roles boot-sync: N member(s)`

### App (Tauri)
1. `config.js` com URL do Worker + creds do Turso (read-only token pra app)
2. Atualizar client_id do Discord no OAuth URL se for ambiente novo
3. `cargo tauri build` → gera `.dmg` / `.msi` / `.AppImage`
4. Code sign + notarize (macOS), cert CA (Windows)
5. Distribuir

### Discord OAuth app
1. Criar application no Discord Developer Portal
2. OAuth2 Redirect: `http://127.0.0.1:53134/callback`
3. Scopes necessários: `identify`
4. Client ID no `config.js` do app

---

## 13. Arquivos de referência

### Backend
- `server/src/index.ts` — entry, CORS, routing
- `server/src/auth.ts` — JWT, Discord profile fetch, live balance
- `server/src/db.ts` — Turso client, query/exec helpers
- `server/src/r2.ts` — AWS4 signing, key format
- `server/src/types.ts` — Env, Session, PublicUser
- `server/src/routes/{auth,me,listings,reviews,uploads,downloads,pairing,users}.ts`
- `server/schema/001_initial.sql` — tabelas app

### Bot
- `../Elyzinho Bot/src/index.js` — entry, event loader
- `../Elyzinho Bot/src/utils/turso.js` — mirror, pending_ops, identity
- `../Elyzinho Bot/src/utils/xp.js` — grant/transfer XP, level formula
- `../Elyzinho Bot/src/utils/pending-ops-worker.js` — apply loop
- `../Elyzinho Bot/src/events/ready.js` — boot, hydrate, bulk sync
- `../Elyzinho Bot/src/events/memberAdd.js` — auto-registro
- `../Elyzinho Bot/src/events/xpOn{Message,Voice,Gym}.js` — grantMessage/Voice/Gym

### App
- `src-tauri/src/lib.rs` — discord_oauth_listen, open_url
- `dist/app.jsx` — React root, router, purchaseListing bridge
- `dist/api.jsx`, `dist/auth.jsx`, `dist/data.jsx` — integrações
- `dist/state.jsx` — hooks de estado persistente
- `dist/marketplace.jsx`, `dist/profile.jsx`, `dist/publishing.jsx`,
  `dist/views.jsx` — telas

---

## 14. Diagrama resumo — data flow

```
 ╔══════════════════════════════════════════════════════════════════╗
 ║                        DISCORD                                    ║
 ║  (evento msg/voice/interaction)                                   ║
 ╚═══════╤══════════════════════════════════════════════════════════╝
         │
         ▼
 ┌──────────────────┐
 │ Bot (Node)       │
 │ SQLite local     │──addXp──▶ queueMirror (400ms debounce)
 │ (source of truth)│                           │
 │                  │                           ▼
 │ pending-ops      │                 ┌──────────────┐
 │ worker (5s)      │◀──fetch unapplied│  Turso (libsql) │
 │                  │   apply, mark    │  xp            │
 └──────────────────┘                  │  pending_ops   │
                                       │  aura_log      │
                                       │  server_meta   │
                                       │  [app tables]  │
                                       └──────┬───────┘
                                              │
                  ┌───────────────────────────┼────────────────┐
                  │                           │                │
                  │ polls xp, aura_log        │ /me/library    │
                  │ every 5-10s               │ /listings      │
                  ▼                           ▼                │
         ┌──────────────┐           ┌────────────────────┐    │
         │  App (Tauri) │           │ Workers API        │    │
         │  React       │ POST /*   │ Hono + JWT         │    │
         │              │──────────▶│ Reads xp (live     │    │
         │              │           │ balance = xp-spent)│    │
         └──────┬───────┘           └────────┬───────────┘    │
                │                            │                │
                │ INSERT                     │ INSERT         │
                │ pending_ops                │ purchases,     │
                │                            │ library,       │
                └────────────────────────────┴────────────────┘
                                             │
                                             │ presigned PUT/GET
                                             ▼
                                    ┌────────────────┐
                                    │  R2            │
                                    │ listings/      │
                                    │   :id/:asset/  │
                                    │   filename     │
                                    └────────────────┘
```

---

**Fim do documento.** Qualquer mudança significativa na arquitetura deve
atualizar esta referência pra não virar lixo defasado.
