# Bot ↔ ElyHub members sync spec

The Discord bot is the source of truth for guild membership. ElyHub mirrors
it into the `discord_members` table so the app can render a Members view
without hitting Discord's API directly.

## Setup (one-time)

1. **Set the shared secret** on the Worker:

   ```bash
   cd server
   wrangler secret put BOT_INGEST_SECRET --env production
   # paste a 32+ character random string when prompted
   ```

   Save the same value in the bot's env as `ELYHUB_BOT_INGEST_SECRET` (or
   whatever the bot project calls it).

2. **Confirm the endpoint** the bot will hit:
   `https://elyhub-api-prod.riseytg1.workers.dev/members/...`

## Three calls the bot makes

### 1. `POST /members/sync` — periodic full snapshot

Fire on bot startup and every ~5 minutes. Catches missed gateway events.

```http
POST /members/sync
Authorization: Bearer <ELYHUB_BOT_INGEST_SECRET>
Content-Type: application/json

{
  "full": true,
  "members": [
    {
      "id": "264327419027128320",
      "username": "elycamara",
      "global_name": "Camara",
      "avatar_hash": "a_1234abcd...",
      "joined_at": 1697040000000,
      "aura": 12500,
      "level": 3,
      "roles": ["zephyro_mod", "verified"]
    },
    ...
  ]
}
```

- `full: true` reconciles: any member NOT in the payload gets
  `is_member = 0` (handles missed `guildMemberRemove` events).
- `joined_at` must be milliseconds (Discord gives `joinedTimestamp`
  in ms; just pass that).
- `aura` and `level` are optional; if omitted, existing values stay
  (we use `COALESCE`). Send when you have them, skip when you don't.
- `roles` should be the human-readable list the user has earned for
  display chips (e.g. `["maker", "zephyro_mod"]`). Up to 8.
- Cap each call at **1000 members**. Chunk for larger guilds.

Response:
```json
{ "ok": true, "accepted": 642, "full": true }
```

### 2. `POST /members/sync` — incremental upsert (no `full`)

Fire on `guildMemberAdd` (single member) and on `guildMemberUpdate`
(changes to nickname/roles/avatar). Same shape, just `members: [one]` and
omit `full`:

```json
{
  "members": [
    {
      "id": "...",
      "username": "...",
      "joined_at": 1730000000000
    }
  ]
}
```

You can also use this to push aura updates whenever you mutate XP — the
field overrides previous values.

### 3. `POST /members/leave` — soft-delete on guildMemberRemove

```http
POST /members/leave
Authorization: Bearer <ELYHUB_BOT_INGEST_SECRET>
Content-Type: application/json

{ "user_id": "264327419027128320" }
```

We don't hard-delete — keeps purchase history attributable.

## Failure modes

- **Bot offline / bot crashes** — gateway events queue up in Discord, the
  bot replays on reconnect. The 5-minute full snapshot is the safety net.
- **Worker 503** — bot should retry with exponential backoff (e.g. 5s,
  30s, 5m). The route is idempotent so retries are safe.
- **Bad payload** — Worker returns 400 with a hint (`missing_members`,
  `invalid_body`, etc.). Log and drop; the next snapshot fixes it.

## What the app expects

`discord_members` rows produce the `/members` GET response, which the
MembersView in `dist/views.jsx` polls every 30s. So:

- A guildMemberAdd → 1 incremental sync → up to 30s for the new member to
  appear in any open ElyHub client. Realistic latency: **30-90s**.
- An aura change in the bot → if the bot pushes the new value, ElyHub
  shows it within 30s. If the bot doesn't push, the cached value stays.
- A leave → 1 leave call → up to 30s for the row to disappear from the
  list (the row stays in the table with `is_member=0`).

## Reference: minimal Node bot snippet

```js
const ELYHUB_URL = 'https://elyhub-api-prod.riseytg1.workers.dev';
const SECRET = process.env.ELYHUB_BOT_INGEST_SECRET;

async function pushMembers(members, full = false) {
  const r = await fetch(`${ELYHUB_URL}/members/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ full, members }),
  });
  if (!r.ok) console.error('[elyhub] sync failed:', r.status, await r.text());
}

// On guildMemberAdd:
client.on('guildMemberAdd', async (m) => {
  await pushMembers([toElyMember(m)]);
});

// On guildMemberRemove:
client.on('guildMemberRemove', async (m) => {
  await fetch(`${ELYHUB_URL}/members/leave`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: m.id }),
  });
});

// Every 5 minutes:
setInterval(async () => {
  const all = guild.members.cache.map(toElyMember);
  // Chunk by 1000:
  for (let i = 0; i < all.length; i += 1000) {
    await pushMembers(all.slice(i, i + 1000), i === 0);
  }
}, 5 * 60 * 1000);

function toElyMember(m) {
  return {
    id: m.id,
    username: m.user.username,
    global_name: m.user.globalName ?? null,
    avatar_hash: m.user.avatar ?? null,
    joined_at: m.joinedTimestamp ?? Date.now(),
    aura: getAuraFromXpStore(m.id), // your XP source
    level: getLevelFromXpStore(m.id),
    roles: m.roles.cache
      .filter((r) => r.name !== '@everyone')
      .map((r) => r.name)
      .slice(0, 8),
  };
}
```

That's the whole integration. Once the bot is wired up, the app's
Members view starts populating itself.
