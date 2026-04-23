// Live data bridge — polls the Turso DB that the Discord bot mirrors into,
// and swaps window.MEMBERS / window.ME with real values. A subscription hook
// lets the React App re-render whenever fresh data arrives.
//
// If config.js isn't loaded (missing Turso creds), we fall through silently
// and the app keeps showing the mock data defined in tokens.jsx.

(() => {
  const cfg = window.ELYHUB_CONFIG;
  if (!cfg || !cfg.tursoUrl || !cfg.tursoToken || cfg.tursoUrl.includes('YOUR-DB-NAME')) {
    console.warn('[data] ELYHUB_CONFIG missing or placeholder — running with mock data. Copy config.example.js to config.js and fill in real values.');
    window.__liveStatus = { ready: false, error: 'no-config' };
    return;
  }

  // Subscription plumbing — React components call subscribe(forceUpdate) in an
  // effect; we call all subscribers whenever MEMBERS/ME change.
  const subscribers = new Set();
  window.__subscribeLive = (fn) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };
  const notify = () => {
    for (const fn of subscribers) {
      try { fn(); } catch (e) { console.error('[data] subscriber error', e); }
    }
  };

  // First-paint gate — app.jsx awaits this before mounting so the initial
  // render already has live data (no mock-flash).
  let resolveInitial;
  window.__initialDataReady = new Promise((res) => { resolveInitial = res; });

  // Talk to Turso's HTTP pipeline API directly — avoids pulling in the
  // @libsql/client npm package (which uses `require` internally and blows
  // up in the Tauri webview). Spec:
  //   https://github.com/tursodatabase/libsql/blob/main/docs/HTTP_V2_SPEC.md
  const httpBase = cfg.tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/$/, '');

  // Encode a JS value into the pipeline's typed arg shape.
  function encodeArg(v) {
    if (v === null || v === undefined) return { type: 'null' };
    if (typeof v === 'number') {
      return Number.isInteger(v)
        ? { type: 'integer', value: String(v) }
        : { type: 'float', value: v };
    }
    return { type: 'text', value: String(v) };
  }

  // Retry wrapper — Turso occasionally returns 5xx / network errors on free
  // tier. Exponential backoff with jitter: 300ms, 600ms, 1200ms. 4xx errors
  // (auth, bad SQL) are NOT retried — they won't get better. Transient =
  // network errors (no res) + 5xx + 429.
  async function withRetry(fn, { attempts = 3 } = {}) {
    let last;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        last = err;
        const msg = err?.message || '';
        const transient = /http 5\d\d|http 429|network|fetch|ECONN|timeout/i.test(msg) || !msg.includes('http');
        if (!transient || i === attempts - 1) throw err;
        const wait = 300 * Math.pow(2, i) * (0.75 + Math.random() * 0.5);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw last;
  }

  // One function to rule them all. Accepts either a raw SQL string OR
  // { sql, args }. Returns { rows } where each row is a plain object keyed by
  // column name (cells are unwrapped to JS values; integers stay strings to
  // avoid precision loss — callers Number() them explicitly).
  async function tursoExecute(stmt) {
    const { sql, args = null } =
      typeof stmt === 'string' ? { sql: stmt, args: null } : stmt;
    const payload = args ? { sql, args: args.map(encodeArg) } : { sql };
    return withRetry(async () => {
      const res = await fetch(`${httpBase}/v2/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.tursoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: payload },
            { type: 'close' },
          ],
        }),
      });
      if (!res.ok) throw new Error(`turso http ${res.status}: ${await res.text()}`);
      const body = await res.json();
      const result = body.results?.[0];
      if (!result || result.type === 'error') {
        throw new Error(result?.error?.message || 'turso pipeline error');
      }
      const r = result.response?.result;
      if (!r) throw new Error('turso: malformed response');
      // Each cell is { type: 'integer'|'float'|'text'|'null'|'blob', value }.
      const colNames = r.cols.map((c) => c.name);
      const unwrap = (cell) => {
        if (!cell || cell.type === 'null') return null;
        return cell.value;
      };
      return {
        rows: r.rows.map((row) => {
          const obj = {};
          row.forEach((cell, i) => { obj[colNames[i]] = unwrap(cell); });
          return obj;
        }),
      };
    });
  }

  function deriveTag(name, id) {
    if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) || id.slice(-6);
    return id.slice(-6);
  }

  function uuid() {
    // Good enough for op ids — they're short-lived and scoped to this DB.
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Poll a specific op's result column. Used to surface bot-side errors
  // (e.g. "failed:not_boosting") back in the UI instead of the action
  // silently no-op'ing.
  async function waitForOpResult(id, { timeoutMs = 15000, pollMs = 1500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, pollMs));
      try {
        const r = await tursoExecute({
          sql: `SELECT result FROM pending_ops WHERE id = ? AND applied_at IS NOT NULL`,
          args: [id],
        });
        const row = r?.rows?.[0];
        if (row) return row.result ?? null;
      } catch (err) {
        console.warn('[data] waitForOpResult poll failed:', err.message);
      }
    }
    return null; // timeout — assume pending
  }

  // Low-level: insert an op, optionally await its processed result. Returns
  // { id, result }. `result` is null if we didn't wait or timed out.
  async function enqueueOp(row, { await: awaitResult = false } = {}) {
    await ensureSchema();
    const id = uuid();
    await tursoExecute({
      sql: `INSERT INTO pending_ops
              (id, kind, from_user_id, to_user_id, amount, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        row.kind,
        row.fromUserId,
        row.toUserId || null,
        row.amount == null ? null : row.amount,
        row.note || null,
        Math.floor(Date.now() / 1000),
      ],
    });
    // Kick a refresh so MEMBERS/ME update once the bot applies.
    setTimeout(fetchOnce, 6000);
    setTimeout(fetchOnce, 12000);
    let result = null;
    if (awaitResult) result = await waitForOpResult(id);
    return { id, result };
  }

  // Optimistic patch helper — nudges window.ME immediately after a successful
  // op (gift/claim/redeem) so the UI doesn't sit at the stale balance for the
  // 5s until the next poll. The next fetchOnce reconciles with authoritative
  // bot state. Patch is { auraDelta, flags? } — flags get merged as booleans
  // (e.g. { tagClaimedToday: true }). We re-derive level/thresholds from the
  // new aura so the progress bar updates in sync.
  function applyOptimistic(patch) {
    if (!window.ME || typeof window.ME !== 'object') return;
    const me = window.ME;
    if (typeof patch.auraDelta === 'number' && patch.auraDelta !== 0) {
      me.aura = Math.max(0, (me.aura || 0) + patch.auraDelta);
      // Re-derive level / thresholds from the new aura. Same MEE6 formula as
      // the main fetch path — keeps the progress bar honest.
      const xpForLevel = (n) => 5 * n * n + 50 * n + 100;
      let level = 0, need = xpForLevel(0), acc = 0;
      while (me.aura >= acc + need) {
        acc += need;
        level++;
        need = xpForLevel(level);
      }
      me.level = level;
      me.prevLevelAura = acc;
      me.nextLevelAura = acc + need;
    }
    if (patch.flags && typeof patch.flags === 'object') {
      Object.assign(me, patch.flags);
    }
    notify();
  }

  window.ElyOps = {
    /**
     * Queue a gift. Resolves once the row is written to Turso. The bot
     * picks it up within ~5s and applies via transferXp (atomic, checks
     * balance). Waits up to 15s for the bot's result so we can surface
     * errors like "failed:insufficient" back in the UI.
     */
    async sendGift(toUserId, amount, note) {
      const authed = window.ElyAuth?.getCurrentUser?.();
      if (!authed?.id) throw new Error('not signed in');
      if (!toUserId || !Number.isInteger(amount) || amount <= 0) {
        throw new Error('invalid gift params');
      }
      const { id, result } = await enqueueOp(
        { kind: 'gift', fromUserId: authed.id, toUserId: String(toUserId), amount, note },
        { await: true },
      );
      if (result && result !== 'ok') throw new Error(result);
      // Optimistic: sender loses the amount immediately. Next poll reconciles.
      applyOptimistic({ auraDelta: -amount });
      return { id, result };
    },

    /**
     * Claim one of the daily bonuses. `kind` is 'tag' (requires wearing the
     * ELY server tag → +300) or 'booster' (requires boosting the server →
     * +500). The bot validates the gate using discord.js, so a user can't
     * unlock a claim they wouldn't qualify for in the Discord command.
     */
    async claimDaily(kind) {
      const authed = window.ElyAuth?.getCurrentUser?.();
      if (!authed?.id) throw new Error('not signed in');
      const opKind = kind === 'tag' ? 'daily_tag'
        : kind === 'booster' ? 'daily_booster'
        : null;
      if (!opKind) throw new Error(`unknown claim kind: ${kind}`);
      const { id, result } = await enqueueOp(
        { kind: opKind, fromUserId: authed.id },
        { await: true },
      );
      if (result && result !== 'ok') throw new Error(result);
      // Optimistic: credit the reward + flip today's claim flag so the card
      // immediately switches to "Claimed" without a 5s delay. Amounts match
      // the bot's xp.js constants (tag +300, booster +500).
      const auraDelta = kind === 'tag' ? 300 : 500;
      const flags = kind === 'tag'
        ? { tagClaimedToday: true }
        : { boosterClaimedToday: true };
      applyOptimistic({ auraDelta, flags });
      return { id, result };
    },

    /**
     * Redeem a store reward. The bot validates balance and notifies an admin
     * channel for fulfillment (delivering codes / assigning roles is manual).
     * rewardId + title are encoded in the op's note field so the log + admin
     * notification are readable. Throws on insufficient balance, bad params, etc.
     */
    async redeemReward(rewardId, price, title) {
      const authed = window.ElyAuth?.getCurrentUser?.();
      if (!authed?.id) throw new Error('not signed in');
      if (!rewardId || !Number.isInteger(price) || price <= 0) {
        throw new Error('invalid redeem params');
      }
      const { id, result } = await enqueueOp(
        {
          kind: 'redeem',
          fromUserId: authed.id,
          toUserId: authed.id, // schema requires a toUserId; self-reference OK
          amount: price,
          note: `${rewardId}:${title || rewardId}`,
        },
        { await: true },
      );
      if (result && result !== 'ok') throw new Error(result);
      // Optimistic: debit the price immediately so the topbar balance drops
      // before the next 5s poll. The bot's worker is still authoritative — if
      // it later rejects (shouldn't happen since we already awaited result),
      // the poll will reconcile back to the real value.
      applyOptimistic({ auraDelta: -price });
      return { id, result };
    },
  };

  // Ensure the pending_ops table exists before we try to write to it. The
  // bot's initTurso() creates this too, but when we've shipped app changes
  // ahead of a bot redeploy the app would fail with "no such table" — so we
  // run the CREATE defensively. Safe to do every boot (IF NOT EXISTS).
  let schemaReady = null;
  function ensureSchema() {
    if (!schemaReady) {
      schemaReady = tursoExecute(`
        CREATE TABLE IF NOT EXISTS pending_ops (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          from_user_id TEXT NOT NULL,
          to_user_id TEXT,
          amount INTEGER,
          note TEXT,
          created_at INTEGER NOT NULL,
          applied_at INTEGER,
          result TEXT
        )
      `).catch((err) => {
        console.warn('[data] ensureSchema failed (non-fatal):', err.message);
        schemaReady = null; // retry next call
      });
    }
    return schemaReady;
  }
  ensureSchema();

  async function fetchOnce() {
    try {
      const res = await tursoExecute(`
        SELECT user_id, display_name, avatar_url, xp, level,
               voice_seconds,
               gym_posts, gym_streak_current, gym_streak_best,
               last_daily_claim_day, last_booster_claim_day,
               roles,
               updated_at
        FROM xp
        ORDER BY xp DESC
        LIMIT 50
      `);

      const members = res.rows.map((r, i) => {
        const name = r.display_name || `User ${String(r.user_id).slice(-4)}`;
        // Discord roles come down as a JSON string (see bot/turso.js
        // serializeRoles). Parse defensively — a malformed row shouldn't
        // take down the whole leaderboard render.
        let discordRoles = [];
        if (r.roles) {
          try {
            const parsed = JSON.parse(r.roles);
            if (Array.isArray(parsed)) discordRoles = parsed;
          } catch {}
        }
        return {
          id: String(r.user_id),
          name,
          tag: deriveTag(r.display_name, String(r.user_id)),
          avatar: r.avatar_url || null,
          aura: Number(r.xp) || 0,
          level: Number(r.level) || 0,
          delta: 0, // no history tracking yet — could diff against previous fetch later
          role: null,
          discordRoles,
          voiceSeconds: Number(r.voice_seconds) || 0,
          gymPosts: Number(r.gym_posts) || 0,
          gymStreakCurrent: Number(r.gym_streak_current) || 0,
          gymStreakBest: Number(r.gym_streak_best) || 0,
          // Claim tracking — YYYY-MM-DD strings. Compare with today (UTC) to
          // decide whether the daily claim buttons should be enabled.
          lastDailyClaimDay: r.last_daily_claim_day || null,
          lastBoosterClaimDay: r.last_booster_claim_day || null,
        };
      });

      if (members.length > 0) {
        // IMPORTANT — tokens.jsx declares `const MEMBERS = [...]` / `const ME = {...}`
        // and does `Object.assign(window, { MEMBERS, ME })`. That binds window.MEMBERS
        // to the SAME array as the const initially, but reassigning `window.MEMBERS = ...`
        // would break that link — the consts would still point to the old mocks array.
        // So we mutate in place: clear + push for arrays, delete keys + Object.assign
        // for objects. Any code reading the const sees the updated contents.
        if (Array.isArray(window.MEMBERS)) {
          window.MEMBERS.length = 0;
          window.MEMBERS.push(...members);
        } else {
          window.MEMBERS = members;
        }
        // Stamp a sync timestamp so the OfflineBanner can detect soft-offline
        // (poll hasn't landed in >90s) even when navigator.onLine still reads true.
        window.__lastDataSync = Date.now();

        // Pin "me" — priority:
        //   1. Signed-in Discord user (via ElyAuth.getCurrentUser)
        //   2. meUserId from config.js (legacy/explicit pin)
        //   3. Top of the leaderboard (so the app looks alive even pre-auth)
        const authedUser = window.ElyAuth?.getCurrentUser?.();
        const pinId = authedUser?.id || cfg.meUserId || null;
        const meIdx = pinId
          ? members.findIndex((m) => m.id === String(pinId))
          : -1;
        // Pre-auth preview: show the #1 member's numbers so the home screen
        // doesn't look dead, but we DON'T want to badge that person as "You"
        // in the leaderboard. Flag it so we can scrub identity further down.
        const isPreview = meIdx < 0 && !authedUser;
        const base = meIdx >= 0 ? members[meIdx] : members[0];
        const rank = meIdx >= 0 ? meIdx + 1 : 1;

        // Rank-change notification. First poll just records — only subsequent
        // deltas fire. Guarded by meIdx >= 0 so we don't ping for users who
        // aren't on the leaderboard yet.
        if (meIdx >= 0) {
          const prev = window.__lastRank;
          if (typeof prev === 'number' && prev !== rank) {
            const better = rank < prev;
            window.ElyNotify?.dispatch({
              kind: 'rank',
              title: better ? 'Moved up' : 'Moved down',
              body: `You're now rank #${rank} (was #${prev})`,
            });
          }
          window.__lastRank = rank;
        }

        // If the signed-in user isn't in the leaderboard yet (no XP), build the
        // "me" row from the Discord profile so name/avatar still show.
        const meRow = authedUser && meIdx < 0
          ? {
              id: authedUser.id,
              name: authedUser.globalName || authedUser.username,
              tag: (authedUser.username || '').toLowerCase().slice(0, 14),
              avatar: authedUser.avatarUrl,
              aura: 0,
              level: 0,
              gymPosts: 0,
              gymStreakCurrent: 0,
              gymStreakBest: 0,
            }
          : base;

        // Derive level + thresholds from total aura using the bot's exact MEE6
        // formula (xp.js: xpForLevel, levelFromXp). We do it from aura rather
        // than trusting meRow.level so the progress bar can never show >100%
        // if the two ever drift.
        const xpForLevel = (n) => 5 * n * n + 50 * n + 100;
        let level = 0;
        let need = xpForLevel(0);
        let acc = 0;
        while (meRow.aura >= acc + need) {
          acc += need;
          level++;
          need = xpForLevel(level);
        }
        const prevLevelAura = acc;
        const nextLevelAura = acc + need;

        // Level-up detection. The bot's aura_log doesn't emit a dedicated
        // level_up event (levels are derived from xp), so we detect the
        // transition client-side: compare against the last observed level for
        // this signed-in user, persisted per-user in localStorage so reloads
        // don't re-fire the toast. Guarded by meRow.id so pre-auth previews
        // don't trigger anything.
        if (meRow && meRow.id && !isPreview) {
          const levelKey = `ely:lastLevel:${meRow.id}`;
          let prevLevel = null;
          try {
            const raw = localStorage.getItem(levelKey);
            prevLevel = raw == null ? null : Number(raw);
          } catch {}
          if (typeof prevLevel === 'number' && Number.isFinite(prevLevel) && level > prevLevel) {
            // Emit one synthetic event per level crossed so a jump of 2+ levels
            // (e.g. after a big gift) isn't collapsed into a single ping.
            for (let L = prevLevel + 1; L <= level; L++) {
              window.ElyNotify?.pushEvent({
                id: `levelup:${meRow.id}:${L}`,
                kind: 'levelup',
                title: `Level ${L} unlocked`,
                data: { level: L },
              });
            }
            window.ElyNotify?.dispatch({
              kind: 'rank', // reuse the 'rank' pref channel — levelups feel the same
              title: `Level ${level} unlocked`,
              body: `You leveled up from ${prevLevel} to ${level}`,
            });
            // Stash the newest level for the App to consume and trigger the
            // full-screen takeover. App reads and clears this on the next
            // render pass (via __subscribeLive). We intentionally only flash
            // the takeover for the HIGHEST new level — chaining 3 takeovers in
            // a row for a multi-level jump would be obnoxious.
            window.__pendingLevelUp = level;
          }
          if (prevLevel !== level) {
            try { localStorage.setItem(levelKey, String(level)); } catch {}
          }
        }

        // Today in UTC — matches the bot's todayUtc() (xp.js).
        const todayUtc = new Date().toISOString().slice(0, 10);

        // Gym rank — we computed `rank` above from the xp-sorted list, but the
        // Gym Royalty trophy needs rank within the gym-post leaderboard. Sort
        // a copy of MEMBERS by gym_posts desc and find this user's index.
        const gymSorted = [...members].sort((a, b) => b.gymPosts - a.gymPosts);
        const gymIdx = gymSorted.findIndex((m) => m.id === meRow.id);
        const gymRank = gymIdx >= 0 ? gymIdx + 1 : null;

        const newMe = {
          // Sentinel id when we're just previewing pre-auth — nothing in the
          // leaderboard will match, so no row gets the "You" highlight and
          // nobody's avatar gets ringed as if it were the signed-in user.
          id: isPreview ? '__preview__' : meRow.id,
          name: isPreview ? 'Guest' : meRow.name,
          tag: isPreview ? 'guest' : meRow.tag,
          avatar: isPreview ? null : meRow.avatar,
          aura: isPreview ? 0 : meRow.aura,
          level: isPreview ? 0 : level,
          rank: isPreview ? null : rank,
          streak: isPreview ? 0 : meRow.gymStreakCurrent,
          nextLevelAura: isPreview ? 100 : nextLevelAura,
          prevLevelAura: isPreview ? 0 : prevLevelAura,
          roles: ['Member'],
          // Real Discord roles pulled from the bot's role sync (see
          // bot/turso.js syncMemberRoles). Array of { id, name, color,
          // position } — the ProfileView consumes this to render the
          // server role strip. Falls back to [] pre-auth or if the column
          // is empty (user hasn't been synced yet).
          discordRoles: isPreview ? [] : (meRow.discordRoles || []),
          isPreview,
          // Trophy stats — raw counters the TrophiesView uses to compute
          // progress. Some come from the xp row (voice, gym), others require
          // the aggregate aura_log query below (gifts, postjobs, founder
          // redeems). The trophy view only cares about the signed-in user so
          // we only populate these on ME, not on MEMBERS.
          voiceSeconds: meRow.voiceSeconds || 0,
          gymPosts: meRow.gymPosts || 0,
          gymStreakBest: meRow.gymStreakBest || 0,
          gymRank,
          // Populated asynchronously after the aura_log aggregate completes —
          // reads read 0 during the first poll and update on the next. Good
          // enough for a trophy page.
          totalGiftsSent:     (window.ME && window.ME.totalGiftsSent)     || 0,
          totalGiftsReceived: (window.ME && window.ME.totalGiftsReceived) || 0,
          postjobCount:       (window.ME && window.ME.postjobCount)       || 0,
          founderRedeemed:    (window.ME && window.ME.founderRedeemed)    || false,
          // Claim status — the UI uses these to decide if the claim cards are
          // actionable. Exposed as booleans keyed to today's UTC date string.
          tagClaimedToday: meRow.lastDailyClaimDay === todayUtc,
          boosterClaimedToday: meRow.lastBoosterClaimDay === todayUtc,
        };

        // Mutate window.ME in place (same reasoning as MEMBERS above).
        if (window.ME && typeof window.ME === 'object') {
          for (const k of Object.keys(window.ME)) delete window.ME[k];
          Object.assign(window.ME, newMe);
        } else {
          window.ME = newMe;
        }
      }

      // Aura feed — append-only log of notable events (gifts, daily claims,
      // gym posts). We join on xp to get display_name for both sides of a
      // gift so the feed renders standalone without another round-trip.
      try {
        const feedRes = await tursoExecute(`
          SELECT
            l.id, l.kind, l.from_user_id, l.to_user_id, l.amount, l.note, l.at,
            src.display_name AS from_name, src.avatar_url AS from_avatar,
            dst.display_name AS to_name,   dst.avatar_url AS to_avatar
          FROM aura_log l
          LEFT JOIN xp src ON src.user_id = l.from_user_id
          LEFT JOIN xp dst ON dst.user_id = l.to_user_id
          ORDER BY l.at DESC
          LIMIT 30
        `);
        const feed = feedRes.rows.map((r) => ({
          id: Number(r.id),
          kind: String(r.kind),
          fromId: r.from_user_id ? String(r.from_user_id) : null,
          toId: String(r.to_user_id),
          amount: Number(r.amount) || 0,
          note: r.note || null,
          at: Number(r.at) * 1000, // store as ms for Date math
          fromName: r.from_name || null,
          fromAvatar: r.from_avatar || null,
          toName: r.to_name || null,
          toAvatar: r.to_avatar || null,
        }));
        // Diff against last seen to detect new incoming events. On the very
        // first poll __lastAuraFeedId is undefined — we record the current max
        // and return without notifying, otherwise every historical gift would
        // fire a toast the moment the user opens the app.
        const meId = window.ME?.id;
        if (meId && typeof window.__lastAuraFeedId === 'number') {
          const lastSeen = window.__lastAuraFeedId;
          // feed is DESC by id; iterate until we hit something we've seen.
          for (const row of feed) {
            if (row.id <= lastSeen) break;
            // Only notify for events targeting *me* that someone else caused.
            // Self-initiated actions (my own gifts, my own redeems) are boring.
            if (row.toId !== meId) continue;
            if (row.fromId && row.fromId === meId) continue;
            if (row.kind === 'gift') {
              window.ElyNotify?.dispatch({
                kind: 'gift',
                title: 'Aura received',
                body: `${row.fromName || 'Someone'} sent you ${row.amount} aura`,
              });
            }
          }
        }
        if (feed.length > 0) {
          window.__lastAuraFeedId = feed[0].id;
        } else if (window.__lastAuraFeedId === undefined) {
          window.__lastAuraFeedId = 0;
        }

        // Mutate in place — same reasoning as MEMBERS. tokens.jsx may have
        // Object.assign'd window.AURA_FEED onto the page already, or this may
        // be the first poll (assign fresh).
        if (Array.isArray(window.AURA_FEED)) {
          window.AURA_FEED.length = 0;
          window.AURA_FEED.push(...feed);
        } else {
          window.AURA_FEED = feed;
        }
      } catch (err) {
        // Non-fatal — the aura_log table may not exist yet (pre-deploy) or
        // the JOIN may fail transiently. The feed just stays empty.
        console.warn('[data] aura_log fetch failed:', err.message);
      }

      // Trophy aggregate stats — lifetime counters that aren't on the xp row.
      // Only run when we have a signed-in user to attribute them to. Results
      // get stitched onto window.ME so the trophy view can read them directly.
      //
      // We do this with a single grouped query instead of three round-trips:
      // GROUP BY kind gets us gifts-sent total, postjob count (received), and
      // founder-redeem existence in one pipeline call.
      try {
        const meId = window.ME?.id;
        if (meId) {
          const aggRes = await tursoExecute({
            sql: `
              SELECT
                -- gifts sent BY me (sum of amounts)
                COALESCE(SUM(CASE WHEN kind='gift'    AND from_user_id = ? THEN amount END), 0) AS gifts_sent,
                -- gifts received BY me (sum of amounts from OTHER people's gifts)
                COALESCE(SUM(CASE WHEN kind='gift'    AND to_user_id   = ? THEN amount END), 0) AS gifts_received,
                -- postjob grants FOR me (count of rows)
                COALESCE(SUM(CASE WHEN kind='postjob' AND to_user_id   = ? THEN 1       END), 0) AS postjob_count,
                -- founder 1:1 redemption — reward id is "r5" per tokens.jsx
                COALESCE(SUM(CASE WHEN kind='redeem'  AND to_user_id   = ? AND note LIKE 'r5:%' THEN 1 END), 0) AS founder_redeems
              FROM aura_log
            `,
            args: [meId, meId, meId, meId],
          });
          const row = aggRes.rows?.[0] || {};
          const patch = {
            totalGiftsSent:     Number(row.gifts_sent) || 0,
            totalGiftsReceived: Number(row.gifts_received) || 0,
            postjobCount:       Number(row.postjob_count) || 0,
            founderRedeemed:    (Number(row.founder_redeems) || 0) > 0,
          };
          // Patch window.ME in place so we don't break the const-binding.
          if (window.ME && typeof window.ME === 'object') {
            Object.assign(window.ME, patch);
          }
        }
      } catch (err) {
        console.warn('[data] trophy stats failed:', err.message);
      }

      // Guild identity — tiny KV the bot writes on ready + GuildUpdate. Lets
      // the sidebar render the real server icon/name instead of a hardcoded
      // placeholder. Cheap query (2 rows), safe to run on every poll.
      try {
        const metaRes = await tursoExecute(`SELECT key, value FROM server_meta WHERE key IN ('icon_url', 'name')`);
        const meta = {};
        for (const row of metaRes.rows || []) {
          meta[String(row.key)] = String(row.value || '');
        }
        const next = {
          iconUrl: meta.icon_url || null,
          name: meta.name || 'ElyHub',
        };
        if (window.SERVER && typeof window.SERVER === 'object') {
          Object.assign(window.SERVER, next);
        } else {
          window.SERVER = next;
        }
      } catch (err) {
        // Non-fatal — table may not exist yet on the first deploy that adds it.
        console.warn('[data] server_meta fetch failed:', err.message);
      }

      window.__liveStatus = {
        ready: true,
        count: members.length,
        at: Date.now(),
      };
    } catch (err) {
      console.error('[data] fetch failed', err);
      window.__liveStatus = { ready: false, error: err.message, at: Date.now() };
    } finally {
      if (resolveInitial) { resolveInitial(); resolveInitial = null; }
      notify();
    }
  }

  // Kick off immediately, then poll.
  fetchOnce();
  const interval = Math.max(1500, cfg.pollInterval || 5000);
  setInterval(fetchOnce, interval);

  // When the user signs in or out, re-run the "me" computation immediately
  // instead of waiting for the next poll tick.
  if (window.ElyAuth?.subscribe) {
    window.ElyAuth.subscribe(() => fetchOnce());
  }
})();
