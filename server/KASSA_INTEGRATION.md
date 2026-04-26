# Kassa Integration — Worker Setup

Passos pra ativar a integração Kassa/ElyHub no Worker depois de puxar
esse branch. **Ordem importa** — migration antes de deploy, secrets
antes do primeiro purchase.

---

## 1. Migration Turso

Aplica `schema/002_kassa.sql` na Turso prod:

```bash
turso db shell elyhub-camara-ely < schema/002_kassa.sql
```

Idempotente. Adiciona:
- 2 colunas em `listings` (`kassa_product_id`, `kassa_tier`)
- 1 coluna em `user_library` (`license_key`)
- Tabela `license_issuance_queue` (outbox pattern)
- Tabela `marketplace_events` (se ainda não existir — o bot já consome dela)

Verificação:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN
  ('license_issuance_queue', 'marketplace_events');
-- deve retornar 2 linhas
```

---

## 2. Secrets (wrangler)

O `wrangler.toml` já tem os vars públicos (`KC_SUPABASE_URL`,
`KASSA_OWNER_IDS`, `MAKER_MOD_ROLE_ID`). Os 2 secrets vão via CLI:

```bash
cd server/

wrangler secret put KC_SUPABASE_ANON_KEY
# cola o anon JWT (eyJhbGciOi...)

wrangler secret put KC_MARKETPLACE_HMAC_SECRET
# cola o hex de 32 bytes que o Luan mandou
```

Repete com `--env production` pra prod:
```bash
wrangler secret put KC_SUPABASE_ANON_KEY --env production
wrangler secret put KC_MARKETPLACE_HMAC_SECRET --env production
```

**Setar `MAKER_MOD_ROLE_ID`** no `wrangler.toml` antes de fazer deploy
(copia o mesmo valor do `.env` do bot). Vai ser usado quando as rotas
admin forem escritas (Sprint 2).

---

## 3. Deploy

```bash
cd server/
wrangler deploy --env production
```

O cron (`*/1 * * * *`) passa a rodar automaticamente após o deploy.
Nada mais pra configurar no dashboard CF.

---

## 4. Smoke tests

### 4.1 Purchase de um listing Kassa

Primeiro, marca um listing existente como Kassa manualmente:
```sql
UPDATE listings
SET kassa_product_id = 'gleipnir', kassa_tier = 'basic'
WHERE id = '<listing_uuid>';
```

Faz purchase pela UI (ou curl). Espera:
- Resposta tem `license_key: "KC-XXXX-..."` OU `license_pending: true`
- `SELECT * FROM user_library WHERE user_id = '<uid>'` → row com `license_key` populado
- `SELECT * FROM license_issuance_queue` → 1 row com `completed_at != null`

Se deu `license_pending: true`:
- Esperar 1min → cron retenta → `completed_at` populado

### 4.2 Events drain

```sql
-- Supabase:
SELECT * FROM marketplace_events_queue WHERE drained_at IS NULL;
-- depois de 1min:
SELECT * FROM marketplace_events_queue WHERE drained_at IS NULL;
-- deve ter diminuído / zerado
```

Turso:
```sql
SELECT * FROM marketplace_events ORDER BY created_at DESC LIMIT 5;
-- rows novos com kind='license_issued'
```

O bot vai postar no canal configurado (já testado end-to-end).

---

## 5. Rollback

Se der merda:
```bash
wrangler rollback --env production
```

Pra reverter schema (destrutivo — só em dev):
```sql
DROP TABLE license_issuance_queue;
ALTER TABLE listings DROP COLUMN kassa_product_id;
ALTER TABLE listings DROP COLUMN kassa_tier;
ALTER TABLE user_library DROP COLUMN license_key;
```

Licenças já emitidas ficam no Supabase intactas — Zephyro continua
validando normal.

---

## Rotas Admin (Sprint 2)

Todas em `/admin/*`, gated por `resolveRole()`:

| Método | Path | Acesso | O que faz |
|---|---|---|---|
| GET  | `/admin/whoami` | admin+owner | Retorna role atual (pra UI decidir render) |
| POST | `/admin/licenses/list` | admin+owner | Listagem paginada (admin redacted em externos) |
| POST | `/admin/licenses/grant` | admin+owner† | Emissão manual |
| POST | `/admin/licenses/modify` | admin+owner | Altera tier/expires/max_devices |
| POST | `/admin/licenses/set-active` | admin+owner | Enable/disable (triggera sync `is_active`) |
| POST | `/admin/licenses/reset-devices` | admin+owner | Clear HWID bindings |
| POST | `/admin/clients/list` | admin+owner | Rollup por cliente (admin scope=elyhub only) |
| POST | `/admin/clients/get` | owner-only | Detalhe com PII |
| POST | `/admin/listings/:id/kassa` | owner-only | Marca listing como Kassa product |

† grant com `sales_channel` externo (gumroad/stripe/direct/pix) é owner-only.

**isKassaMod** lê `xp.roles` (JSON do bot) — se user tem `MAKER_MOD_ROLE_ID`,
é admin. Sem hit no Discord API.

---

## Pendente (Sprint 3 — UI)

- Tab Admin no app (4 sub-tabs: Licenses / Clients / Grant / Audit)
- Formulário "marcar como Kassa" no fluxo de publish/edit de listing
