// Live data bridge — polls the Turso DB that the Discord bot mirrors into,
// and swaps window.MEMBERS / window.ME with real values. A subscription hook
// lets the React App re-render whenever fresh data arrives.
//
// If config.js isn't loaded (missing Turso creds), we fall through silently
// and the app keeps showing the mock data defined in tokens.jsx.

(() => {
  const cfg = window.ELYHUB_CONFIG || {};
  // Live data now flows through the Worker (`ElyAPI`). The legacy direct-
  // Turso path required `tursoUrl` + `tursoToken` in client config; both
  // are no-ops now. We keep `cfg` around for the small set of *display*
  // settings still read here (meUserId pin, pollInterval).
  // The poll loop below also needs an authenticated user — pre-auth users
  // get the empty snapshot path (early return inside fetchOnce).

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

  // One-shot legacy-state cleanup — `ely.mockSpent:*` was a per-user aura
  // debit counter used while the catalog was seed-only. Now that purchases
  // hit the backend exclusively, any lingering counter would double-debit.
  // Drop them on boot. Safe to run every load; keys re-created by nothing.
  try {
    const kill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ely.mockSpent:')) kill.push(k);
    }
    for (const k of kill) localStorage.removeItem(k);
  } catch {}

  // Legacy mock-catalog residue cleanup.
  //
  // Early testers bought/saved/followed against the 16 seed listings + 11
  // fake members. When we dropped the seeds (task I), the backing listings
  // disappeared but localStorage still held references — so "My Library"
  // showed 9 purchased mocks that don't exist anymore, the wishlist had
  // dead ids, follows pointed to fake users, etc.
  //
  // We detect mock references by id shape:
  //   • mock listing ids → `l-*` prefix (e.g. l-zephyro)
  //   • mock user ids    → `u\d+` or `me` or `seed-*`
  // Backend ids are UUIDs — they can't match either pattern, so this is safe
  // to run every boot. Idempotent: once purged, the filters find nothing.
  try {
    // Dev-stub IDs (e.g. `l-hugin-dev` for the Zodiac unlock test) start with
     // `l-` but are intentional — exempt them from the cleanup so they survive
     // reloads. Production listings are UUIDs anyway, so this only carves out
     // the explicit dev-test ids.
     const DEV_STUB_LID = (id) => id === 'l-hugin-dev';
     const MOCK_LID = (id) => typeof id === 'string' && id.startsWith('l-') && !DEV_STUB_LID(id);
    const MOCK_UID = (id) => typeof id === 'string' && /^(u\d+|me|seed-.*)$/.test(id);

    // library: array of { listingId, ... }
    const lib = JSON.parse(localStorage.getItem('elyhub.library.v1') || 'null');
    if (Array.isArray(lib)) {
      const clean = lib.filter((it) => !MOCK_LID(it?.listingId));
      if (clean.length !== lib.length) {
        localStorage.setItem('elyhub.library.v1', JSON.stringify(clean));
        console.log(`[data] cleanup: dropped ${lib.length - clean.length} mock library entr(ies)`);
      }
    }

    // wishlist: array of listing ids (strings)
    const wish = JSON.parse(localStorage.getItem('elyhub.wishlist.v1') || 'null');
    if (Array.isArray(wish)) {
      const clean = wish.filter((id) => !MOCK_LID(id));
      if (clean.length !== wish.length) {
        localStorage.setItem('elyhub.wishlist.v1', JSON.stringify(clean));
        console.log(`[data] cleanup: dropped ${wish.length - clean.length} mock wishlist entr(ies)`);
      }
    }

    // follows: array of user ids (strings)
    const follows = JSON.parse(localStorage.getItem('elyhub.follows.v1') || 'null');
    if (Array.isArray(follows)) {
      const clean = follows.filter((id) => !MOCK_UID(id));
      if (clean.length !== follows.length) {
        localStorage.setItem('elyhub.follows.v1', JSON.stringify(clean));
        console.log(`[data] cleanup: dropped ${follows.length - clean.length} mock follow(s)`);
      }
    }

    // recently viewed: array of { id, ts }
    const recent = JSON.parse(localStorage.getItem('elyhub.recent.v1') || 'null');
    if (Array.isArray(recent)) {
      const clean = recent.filter((r) => !MOCK_LID(r?.id));
      if (clean.length !== recent.length) {
        localStorage.setItem('elyhub.recent.v1', JSON.stringify(clean));
        console.log(`[data] cleanup: dropped ${recent.length - clean.length} mock recent entr(ies)`);
      }
    }

    // coupons: object keyed by code, each has { sellerId, listingId, seed }.
    // Drop any whose sellerId or listingId is mock, or that was seeded.
    const coupons = JSON.parse(localStorage.getItem('elyhub.coupons.v1') || 'null');
    if (coupons && typeof coupons === 'object') {
      let dropped = 0;
      const clean = {};
      for (const [code, c] of Object.entries(coupons)) {
        if (c?.seed || MOCK_UID(c?.sellerId) || MOCK_LID(c?.listingId)) { dropped++; continue; }
        clean[code] = c;
      }
      if (dropped > 0) {
        localStorage.setItem('elyhub.coupons.v1', JSON.stringify(clean));
        console.log(`[data] cleanup: dropped ${dropped} mock coupon(s)`);
      }
    }
  } catch (err) {
    console.warn('[data] legacy cleanup failed:', err?.message || err);
  }

  // (The direct Turso pipeline call lived here. Removed in the security
  // refactor — all reads/writes now go through the Worker. The functions
  // below are kept as no-op stubs so any leftover callers fail loudly via
  // the explicit throw rather than the IIFE crashing on boot.)
  const httpBase = null;

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
  async function tursoExecute() {
    throw new Error('tursoExecute removed — call ElyAPI instead');
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
  // Polls the Worker (which scopes the lookup to the authed user — the
  // client can't probe other users' op outcomes). Returns the bot's result
  // string, or null on timeout.
  async function waitForOpResult(id, { timeoutMs = 15000, pollMs = 1500 } = {}) {
    if (!window.ElyAPI?.get) return null;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, pollMs));
      try {
        const r = await window.ElyAPI.get(`/me/op-result/${encodeURIComponent(id)}`);
        if (r && r.applied_at) {
          // Bot's worker writes status='ok' or 'error' + error text. Mirror
          // the previous shape: return the error string on failure, null on ok.
          if (r.status === 'error') return r.error ? `failed:${r.error}` : 'failed';
          return null;
        }
      } catch (err) {
        // 404 = op not found yet (race); keep polling.
        if (!String(err?.message || '').includes('404')) {
          console.warn('[data] waitForOpResult poll failed:', err.message);
        }
      }
    }
    return null;
  }

  // Low-level: insert an op, optionally await its processed result. Returns
  // { id, result }. `result` is null if we didn't wait or timed out.
  //
  // Routed through the Worker (POST /me/enqueue-op) so writes are JWT-gated
  // and validated server-side. The previous direct-Turso path used the
  // bundled read-write token, which any installed user could extract from
  // the bundle and use to forge ops as anyone. Now the server enforces
  // from_user_id === authed user.
  async function enqueueOp(row, { await: awaitResult = false } = {}) {
    if (!window.ElyAPI?.isSignedIn?.() || !window.ElyAPI?.post) {
      throw new Error('not_signed_in');
    }
    const res = await window.ElyAPI.post('/me/enqueue-op', {
      kind: row.kind,
      // from_user_id is set by the server from the JWT — body field ignored.
      toUserId: row.toUserId || null,
      amount: row.amount == null ? null : row.amount,
      note: row.note || null,
    });
    const id = res?.id;
    if (!id) throw new Error('enqueue_failed');
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

  // (Schema is now owned by the server — bot's initTurso() + Worker schema
  // migrations cover pending_ops creation. Client no longer DDLs.)
  function ensureSchema() { return Promise.resolve(); }

  async function fetchOnce() {
    try {
      // Server-side consolidated poll. Replaces five separate Turso queries
      // (xp leaderboard, purchases spend, aura_log feed, trophy aggregates,
      // server_meta) with a single JWT-gated round trip. Pre-auth users get
      // an empty snapshot — handled by the early return below.
      if (!window.ElyAPI?.isSignedIn?.() || !window.ElyAPI?.get) {
        return;
      }
      const snap = await window.ElyAPI.get('/me/poll');
      const memberRows = snap?.members || [];
      const meSnap     = snap?.me      || {};
      const feedRows   = snap?.feed    || [];
      const srvSnap    = snap?.server  || { iconUrl: null, name: 'ElyHub' };

      const members = memberRows.map((r, i) => {
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

        // Marketplace debit — server-computed. `meRow.aura` above is raw xp,
        // so subtract the user's marketplace spend (returned in snap.me.spend)
        // to get the live aura the topbar/home should show.
        if (!isPreview && meRow.id && meSnap.spend > 0) {
          newMe.aura = Math.max(0, newMe.aura - meSnap.spend);
        }

        // Mutate window.ME in place (same reasoning as MEMBERS above).
        if (window.ME && typeof window.ME === 'object') {
          for (const k of Object.keys(window.ME)) delete window.ME[k];
          Object.assign(window.ME, newMe);
        } else {
          window.ME = newMe;
        }
      }

      // Aura feed — already fetched in the consolidated /me/poll snapshot
      // above. Just map to the client shape and run the new-event diff.
      try {
        const feed = feedRows.map((r) => ({
          id: Number(r.id),
          kind: String(r.kind),
          fromId: r.from_user_id ? String(r.from_user_id) : null,
          toId: String(r.to_user_id),
          amount: Number(r.amount) || 0,
          note: r.note || null,
          at: Number(r.at) * 1000,
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

      // Trophy aggregate stats — already in snap.me. Stitch onto window.ME
      // so the trophy view reads them directly.
      try {
        if (window.ME && typeof window.ME === 'object') {
          Object.assign(window.ME, {
            totalGiftsSent:     meSnap.totalGiftsSent     || 0,
            totalGiftsReceived: meSnap.totalGiftsReceived || 0,
            postjobCount:       meSnap.postjobCount       || 0,
            founderRedeemed:    !!meSnap.founderRedeemed,
          });
        }
      } catch (err) {
        console.warn('[data] trophy stats merge failed:', err.message);
      }

      // Guild identity — already in snap.server.
      try {
        const next = { iconUrl: srvSnap.iconUrl || null, name: srvSnap.name || 'ElyHub' };
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

  // ─── Marketplace feed ──────────────────────────────────────────────────
  // Pulls published listings from the backend API and merges them into
  // window.LISTINGS. Runs independently of the xp poll — the feed doesn't
  // change every 5s, so a slower cadence is fine (and reduces API load).
  //
  // We merge by id rather than replacing the whole array: the mock seed
  // from tokens.jsx stays in place for now, and backend rows get upserted
  // on top. When publishing.jsx is migrated and there's no more mock, we
  // can drop the mock entirely.
  function mapBackendListing(row) {
    // Backend shape → UI shape. Backend uses snake_case + price_aura; the
    // UI expects camelCase + `price`. Tags arrive as a JSON string or array
    // depending on driver — normalize to array.
    let tags = [];
    if (Array.isArray(row.tags)) tags = row.tags;
    else if (typeof row.tags === 'string') {
      try { const parsed = JSON.parse(row.tags); if (Array.isArray(parsed)) tags = parsed; } catch {}
    }
    const category = row.type ? row.type.charAt(0).toUpperCase() + row.type.slice(1) : '';
    return {
      id: row.id,
      type: row.type,
      sellerId: row.seller_id,
      title: row.title,
      tagline: row.tagline || '',
      description: row.description || '',
      price: Number(row.price_aura) || 0,
      billing: row.billing || 'one-time',
      category,
      tags,
      // Backend pre-signs cover_key → cover_url (1h TTL) at response time.
      // Null for listings without a cover (seeded demos, link-only listings).
      // First-party Hugin (kassa_product_id='gleipnir') falls back to its
      // local parchment-raven asset so the marketplace card never shows the
      // generic plugin glyph for our flagship product.
      cover: row.cover_url
        || (row.kassa_product_id === 'gleipnir' ? 'assets/hugin-logo.png' : null),
      screenshots: [],
      level: Number(row.level_req) || 1,
      downloads: Number(row.downloads) || 0,
      sales: 0,
      rating: 0,
      reviewCount: 0,
      // createdAt is a unix-ms timestamp used by sort-by-newest and the "NEW"
      // badge / relative-time stamp. Backend stores seconds-or-ms — coerce to
      // Number and pass through. Seed demos don't have this so their strip
      // entries stay dateless.
      createdAt: Number(row.created_at) || 0,
      publishedAt: row.created_at ? new Date(Number(row.created_at)).toISOString().slice(0, 10) : null,
      updatedAt: row.created_at ? new Date(Number(row.created_at)).toISOString().slice(0, 10) : null,
      featured: !!row.featured,
      // Kassa license gating — used by Hugin view, theme unlock, etc.
      kassa_product_id: row.kassa_product_id || null,
      kassaProductId: row.kassa_product_id || null,
      kassa_tier: row.kassa_tier || null,
      // GitHub auto-update — populated by server cron from /releases/latest.
      // Download/Update buttons in My Library prefer current_version_url
      // over the R2 pack-asset flow whenever it's set.
      github_repo: row.github_repo || null,
      current_version: row.current_version || null,
      current_version_url: row.current_version_url || null,
    };
  }

  // Hydrate unknown sellers lazily. When a listing arrives with a sellerId
  // that isn't in window.MEMBERS, fetch /users/:id and splice a minimal row
  // into MEMBERS so the "by <Name>" line resolves instead of falling back
  // to "Unknown". We dedupe per-id across the session so a flaky backend
  // can't cause a fetch storm, and we only kick off one request per id
  // even if multiple listings share a seller.
  const hydrated = new Set();    // sellerIds we've already hydrated
  const pending = new Map();     // sellerId → Promise (so concurrent calls share)
  // Seed / mock seller ids that only exist in tokens.jsx — never hit the
  // backend for these, they 404 by design. `me` leaks in from local-
  // fallback publishes that saved the literal string as sellerId.
  const MOCK_SELLER = /^(u\d+|me|seed-.*)$/;
  async function hydrateSeller(sellerId) {
    if (!sellerId || hydrated.has(sellerId)) return;
    if (MOCK_SELLER.test(sellerId)) { hydrated.add(sellerId); return; }
    if (!window.ElyAPI?.get) return;
    if (pending.has(sellerId)) return pending.get(sellerId);
    const p = (async () => {
      try {
        const u = await window.ElyAPI.get(`/users/${encodeURIComponent(sellerId)}`);
        if (!u || !u.id) return;
        if (!Array.isArray(window.MEMBERS)) window.MEMBERS = [];
        // Check again under the promise in case something else raced us.
        const exists = window.MEMBERS.some((m) => m.id === u.id);
        if (!exists) {
          window.MEMBERS.push({
            id: u.id,
            name: u.name || u.username || 'Creator',
            tag: u.username || u.id,
            avatar: u.avatar_url || '',
            level: 1,
            aura: 0,
            streak: 0,
            bio: '',
          });
        }
        hydrated.add(sellerId);
        notify();
      } catch (err) {
        // 404 is fine (user was deleted); swallow and mark hydrated so we
        // don't re-fetch every poll. Network errors don't mark — we'll
        // retry on the next listings poll.
        if (/404|not_found/i.test(err?.message || '')) hydrated.add(sellerId);
      } finally {
        pending.delete(sellerId);
      }
    })();
    pending.set(sellerId, p);
    return p;
  }

  async function fetchListingsOnce() {
    if (!window.ElyAPI?.get) return; // api.jsx hasn't loaded yet
    try {
      const res = await window.ElyAPI.get('/listings');
      const items = Array.isArray(res?.items) ? res.items : [];
      if (!Array.isArray(window.LISTINGS)) window.LISTINGS = [];
      const byId = new Map(window.LISTINGS.map((l) => [l.id, l]));
      for (const raw of items) {
        const mapped = mapBackendListing(raw);
        byId.set(mapped.id, mapped); // upsert — overrides mock if same id
      }
      // Mutate in place so views that hold a reference to window.LISTINGS
      // (there's a const binding in app.jsx) still see the update.
      window.LISTINGS.length = 0;
      window.LISTINGS.push(...byId.values());
      // notify() re-renders everything subscribed via __subscribeLive —
      // app.jsx subscribes at the root so every view that reads
      // window.LISTINGS picks up the upserted rows on the next paint.
      notify();
      // Fan-out hydration for any sellerIds we haven't resolved yet.
      const members = window.MEMBERS || [];
      const known = new Set(members.map((m) => m.id));
      const missing = new Set();
      for (const l of window.LISTINGS) {
        if (l.sellerId && !known.has(l.sellerId)) missing.add(l.sellerId);
      }
      for (const sid of missing) hydrateSeller(sid);
    } catch (err) {
      console.warn('[data] /listings fetch failed:', err.message);
    }
  }
  // First fetch soon after boot, then every 30s.
  setTimeout(fetchListingsOnce, 800);
  setInterval(fetchListingsOnce, 30_000);
  // Also refetch right after sign-in — a fresh session might unlock private
  // listings eventually, and it's a cheap way to feel snappy.
  if (window.ElyAuth?.subscribe) {
    window.ElyAuth.subscribe(() => fetchListingsOnce());
  }
})();
