// state.jsx — client-side persistence hooks + onboarding overlay.
//
// Everything here is state that lives in localStorage and is read/written via
// React hooks, plus the onboarding tour overlay (which is state-driven too).
// Extracted from app.jsx in the modularization pass — the app's global-script
// loading pattern is preserved: these declarations live at the top level and
// app.jsx consumes them by name.
//
// What's here (roughly in the order they appear):
//   • useLibrary        — purchased / subscribed listings
//   • useReviews        — ratings + replies + helpful votes
//   • useWishlist       — saved listings
//   • useFollows        — followed creators
//   • useRecentlyViewed — last-N listing history
//   • useMessages       — 1:1 DM threads
//   • useCoupons        — creator-issued promo codes
//   • useReports        — moderation reports submitted by the user
//   • useBlocks         — per-user block list
//   • useOnboarding     — first-run product tour state machine
//   • OnboardingTour    — the spotlight overlay that reads it

// ──────────────── Library (purchased / subscribed listings) ────────────────
// Lives entirely client-side for now (localStorage). When a user subscribes
// or buys a listing, an entry like
//   { listingId, type: 'subscription'|'one-time', purchasedAt, expiresAt?, status }
// is added. Plugin entries with status === 'active' show up as dynamic
// sidebar nav items. Subscription entries auto-flip to 'expired' when
// expiresAt passes.
//
// Aura is debited optimistically (state.aura -= price) — the real backend
// will be the source of truth later, but for the MVP the local state is
// enough to feel like a real economy.
const LIBRARY_KEY = 'elyhub.library.v1';
const PLUGIN_PERIOD_DAYS = 30;
const PLUGIN_PERIOD_MS = PLUGIN_PERIOD_DAYS * 24 * 60 * 60 * 1000;

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLibrary(items) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items)); } catch {}
}

// Reconcile expirations on every read — flips status to 'expired' for any
// subscription whose expiresAt is in the past. Cheap; runs O(n).
function reconcileLibrary(items) {
  const now = Date.now();
  let changed = false;
  const next = items.map((it) => {
    if (it.type === 'subscription' && it.expiresAt && it.expiresAt < now && it.status !== 'expired') {
      changed = true;
      return { ...it, status: 'expired' };
    }
    return it;
  });
  return { items: next, changed };
}

function useLibrary() {
  const [items, setItems] = React.useState(() => {
    const { items: r, changed } = reconcileLibrary(loadLibrary());
    if (changed) saveLibrary(r);
    return r;
  });

  // Re-reconcile every 60s so the UI flips expired plugins out of the
  // sidebar without needing a page refresh.
  React.useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => {
        const { items: r, changed } = reconcileLibrary(prev);
        if (changed) { saveLibrary(r); return r; }
        return prev;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Cross-tab sync — if another tab subscribes/cancels we pick it up.
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LIBRARY_KEY) setItems(loadLibrary());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = (next) => { setItems(next); saveLibrary(next); };

  // Add or renew. For subscriptions, renewing pushes expiresAt by 30 days
  // from whichever is later (now or current expiresAt). New subs default to
  // autoRenew: true — canceling flips it off (see cancel() below).
  const purchase = (listing) => {
    const now = Date.now();
    const isSub = listing.billing === 'monthly';
    const existing = items.find((it) => it.listingId === listing.id);
    if (existing && isSub && existing.status !== 'expired') {
      // Renewal — extend from current expiry.
      // EXCEPTION: if the previous status was 'cancelled', the user broke
      // the auto-renew chain. Treat the new purchase as a fresh start
      // (now + 30d), not as a stack on top of the remaining grace period —
      // otherwise paying once after a cancel would give them up to 59d.
      const base = existing.status === 'cancelled'
        ? now
        : Math.max(now, existing.expiresAt || now);
      const next = items.map((it) => it.listingId === listing.id
        ? { ...it, status: 'active', autoRenew: true, expiresAt: base + PLUGIN_PERIOD_MS, lastRenewedAt: now }
        : it);
      persist(next);
      return next.find((it) => it.listingId === listing.id);
    }
    if (existing && !isSub) {
      // Already owned, no-op.
      return existing;
    }
    const entry = isSub
      ? { listingId: listing.id, type: 'subscription', purchasedAt: now, expiresAt: now + PLUGIN_PERIOD_MS, status: 'active', autoRenew: true }
      : { listingId: listing.id, type: 'one-time', purchasedAt: now, status: 'active' };
    persist([...(existing ? items.filter((it) => it.listingId !== listing.id) : items), entry]);
    return entry;
  };

  const cancel = (listingId) => {
    const next = items.map((it) => it.listingId === listingId
      ? { ...it, status: 'cancelled', autoRenew: false }
      : it);
    persist(next);
  };

  // Flip just the autoRenew flag without changing status. Used by the
  // "Auto-renew" switch on each subscription row.
  const setAutoRenew = (listingId, on) => {
    const next = items.map((it) => it.listingId === listingId
      ? { ...it, autoRenew: !!on }
      : it);
    persist(next);
  };

  const has = (listingId) => {
    const it = items.find((x) => x.listingId === listingId);
    return !!it && it.status === 'active';
  };

  return { items, purchase, cancel, setAutoRenew, has };
}

// Helper used by sidebar — returns active plugin listings (joined with the
// LIBRARY entry so we can show countdowns).
function getActivePlugins(libItems) {
  const all = window.LISTINGS || [];
  const joined = libItems
    .filter((it) => it.status === 'active')
    .map((it) => ({ entry: it, listing: all.find((l) => l.id === it.listingId) }))
    .filter((x) => x.listing && x.listing.type === 'plugin');
  // Dedup tiered listings: when a user owns multiple tiers of the same Kassa
  // product (e.g. Hugin 1key + 2key), they share kassa_product_id. Show one
  // sidebar entry — prefer the higher-priced tier so the badge reflects the
  // bigger purchase. Listings without a kassa_product_id stay as-is.
  const seen = new Map();
  for (const x of joined) {
    const kpid = x.listing.kassa_product_id || x.listing.kassaProductId;
    if (!kpid) { seen.set(x.listing.id, x); continue; }
    const prev = seen.get(`kpid:${kpid}`);
    if (!prev || (x.listing.price || 0) > (prev.listing.price || 0)) {
      seen.set(`kpid:${kpid}`, x);
    }
  }
  return [...seen.values()];
}

// Pretty-print "expires in 17d" / "expires in 4h" / "expired".
function expiryLabel(expiresAt) {
  if (!expiresAt) return '';
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'expired';
  const d = Math.floor(ms / 86_400_000);
  if (d >= 2) return `${d}d left`;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}h left`;
  return 'expires soon';
}

// ──── Reviews — community feedback on listings ────
// Two sources feed the review pool:
//   1. Seed reviews — deterministic, generated once at boot from listing +
//      member data so the UI never looks empty. Not persisted, not editable.
//   2. User reviews — written by the current user against listings they own,
//      persisted under elyhub.reviews.v1. These can be removed.
// Both are merged into window.REVIEWS so downstream code reads a single array.
const REVIEWS_KEY = 'elyhub.reviews.v1';
// Side-tables — decoupled from the review record so they can attach to both
// seed and user reviews without copying the seed blob into storage. Replies
// are keyed by reviewId → { text, createdAt, authorId }. Helpful counts are
// split: a global tally `{ [reviewId]: n }` and a per-browser set of review
// ids this user has voted on (prevents double-counting).
const REVIEW_REPLIES_KEY = 'elyhub.reviews.replies.v1';
const REVIEW_HELPFUL_COUNT_KEY = 'elyhub.reviews.helpfulCount.v1';
const REVIEW_HELPFUL_MINE_KEY = 'elyhub.reviews.helpfulMine.v1';

function loadUserReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveUserReviews(items) {
  try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(items)); } catch {}
}
function loadReviewReplies() {
  try { return JSON.parse(localStorage.getItem(REVIEW_REPLIES_KEY) || '{}') || {}; }
  catch { return {}; }
}
function saveReviewReplies(map) {
  try { localStorage.setItem(REVIEW_REPLIES_KEY, JSON.stringify(map)); } catch {}
}
function loadHelpfulCounts() {
  try { return JSON.parse(localStorage.getItem(REVIEW_HELPFUL_COUNT_KEY) || '{}') || {}; }
  catch { return {}; }
}
function saveHelpfulCounts(map) {
  try { localStorage.setItem(REVIEW_HELPFUL_COUNT_KEY, JSON.stringify(map)); } catch {}
}
function loadMyHelpful() {
  try {
    const raw = localStorage.getItem(REVIEW_HELPFUL_MINE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveMyHelpful(ids) {
  try { localStorage.setItem(REVIEW_HELPFUL_MINE_KEY, JSON.stringify(ids)); } catch {}
}

// Deterministic seed so the same listing always shows the same reviews across
// reloads. Uses a tiny string hash fed with the listing id as salt.
function seedHash(str, salt = 0) {
  let h = salt | 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const REVIEW_BODIES = [
  'Exactly what I was looking for. Clean, no weird tweaks needed.',
  'Works. Been running it for a couple weeks without issues.',
  'Solid pick. A few rough edges but the creator pushed an update fast.',
  'Honestly better than paid alternatives. Worth every drop.',
  'Does what it says. Simple, fast, no bloat.',
  'Small learning curve, but once you get it, it stays out of your way.',
  'Love the attention to detail. Little touches everywhere.',
  "Not for everyone but if it clicks with your setup, it's perfect.",
  "Kinda niche, but that's exactly why I needed it.",
  'Huge upgrade over the default. Can\'t go back now.',
  "Quality over quantity — this one's polished.",
  'Instant install, zero friction. Already recommending to friends.',
];
function buildSeedReviews() {
  // Seed reviews were a placeholder while the catalog was mock-only. With
  // LISTINGS + MEMBERS now both empty until backend hydrates, there's
  // nothing to seed against — and the real review data comes from
  // /listings/:id/reviews (fetched lazily per-listing via hydrateReviews).
  return [];
  // eslint-disable-next-line no-unreachable
  const listings = Array.isArray(window.LISTINGS) ? window.LISTINGS : [];
  const members  = Array.isArray(window.MEMBERS) ? window.MEMBERS : [];
  const me = window.ME || {};
  if (!listings.length || !members.length) return [];
  const out = [];
  for (const l of listings) {
    // Skip user-published listings — they start fresh with 0 reviews.
    if (String(l.id).startsWith('user-')) continue;
    const base = seedHash(l.id);
    // 3–7 reviews per seed listing, depending on the hash.
    const count = 3 + (base % 5);
    for (let i = 0; i < count; i++) {
      const h = seedHash(l.id, i + 1);
      // Skip reviews from the listing's own seller (self-reviews aren't a thing)
      // and skip the current user so "write a review" flow is possible.
      let author;
      for (let tries = 0; tries < 6; tries++) {
        const pick = members[(h + tries * 7) % members.length];
        if (pick.id !== l.sellerId && pick.id !== me.id) { author = pick; break; }
      }
      if (!author) continue;
      // Weight ratings toward 4-5 stars — realistic distribution for a
      // community store where bad listings die quickly.
      const r = (h % 10);
      const rating = r < 5 ? 5 : r < 8 ? 4 : r < 9 ? 3 : 2;
      const body = REVIEW_BODIES[(h >> 3) % REVIEW_BODIES.length];
      // Spread createdAt over the last 90 days.
      const daysAgo = (h % 90) + 1;
      out.push({
        id: `seed-${l.id}-${i}`,
        listingId: l.id,
        authorId: author.id,
        rating,
        text: body,
        createdAt: Date.now() - daysAgo * 86_400_000,
        seed: true,
      });
    }
  }
  return out;
}

// Remote reviews cache, keyed by listingId → array of review rows in the
// shape emitted by GET /listings/:id/reviews. Populated lazily: the first
// time a detail page calls reviewsForListing(id) we kick off a fetch, and
// subsequent renders see the hydrated rows. Stored on window so that every
// useReviews() instance (and every listing detail render) shares the cache.
if (!window.__REMOTE_REVIEWS) window.__REMOTE_REVIEWS = {};
// Per-listing in-flight fetch promises so concurrent callers share one
// request. Cleared on resolve.
if (!window.__REMOTE_REVIEWS_PENDING) window.__REMOTE_REVIEWS_PENDING = new Map();
// Subscriber list — so useReviews() components re-render when a lazy fetch
// completes (push-based; no polling). Each subscription is a bump fn.
if (!window.__REMOTE_REVIEWS_SUBS) window.__REMOTE_REVIEWS_SUBS = new Set();
function notifyReviewsChanged() {
  for (const fn of window.__REMOTE_REVIEWS_SUBS) { try { fn(); } catch {} }
}

// Backend review rows come in a richer shape than local user reviews — we
// normalize them into the same record shape the UI expects.
function mapRemoteReview(r, listingId) {
  return {
    id: r.id,                        // synthetic '<listingId>:<userId>'
    listingId,
    authorId: r.author_id,
    authorName: r.author_name,       // precomputed from the join
    authorAvatar: r.author_avatar,
    rating: r.stars,
    text: r.body || '',
    createdAt: r.created_at,
    editedAt: r.updated_at !== r.created_at ? r.updated_at : undefined,
    remote: true,                    // marker — lets mutations know this is
                                     // server-owned vs. a local user row.
  };
}

// Kick off a fetch for a listing's reviews if we don't already have them
// cached (or an in-flight request). Returns the promise so callers that
// want to await can, but we don't require it — the subscribe path picks up
// results on re-render automatically.
function hydrateReviews(listingId) {
  if (!listingId) return Promise.resolve();
  if (!window.ElyAPI?.get) return Promise.resolve();
  // `user-…` ids are local-only — no remote reviews to fetch.
  if (String(listingId).startsWith('user-')) return Promise.resolve();
  if (window.__REMOTE_REVIEWS[listingId]) return Promise.resolve();
  if (window.__REMOTE_REVIEWS_PENDING.has(listingId)) {
    return window.__REMOTE_REVIEWS_PENDING.get(listingId);
  }
  const p = (async () => {
    try {
      const res = await window.ElyAPI.get(`/listings/${encodeURIComponent(listingId)}/reviews`);
      const items = Array.isArray(res?.items) ? res.items : [];
      window.__REMOTE_REVIEWS[listingId] = items.map((r) => mapRemoteReview(r, listingId));
      rebuildReviewsIndex();
      notifyReviewsChanged();
    } catch (err) {
      // Non-fatal — empty cache entry so we don't refetch every render.
      window.__REMOTE_REVIEWS[listingId] = [];
      rebuildReviewsIndex();
      notifyReviewsChanged();
    } finally {
      window.__REMOTE_REVIEWS_PENDING.delete(listingId);
    }
  })();
  window.__REMOTE_REVIEWS_PENDING.set(listingId, p);
  return p;
}

// Materialize window.REVIEWS = [ ...remote, ...user ]. Idempotent.
// Remote rows come from the per-listing cache (populated on detail-page
// open). User rows are the localStorage-backed reviews for `user-…`
// listings that never hit the backend. Reply/helpful side-tables still
// attach (they stay local-only for now — next pass).
function rebuildReviewsIndex() {
  const user = loadUserReviews();
  const replies = loadReviewReplies();
  const counts = loadHelpfulCounts();
  const attach = (r) => ({
    ...r,
    reply: replies[r.id] || null,
    helpfulCount: counts[r.id] || 0,
  });
  // Flatten all cached remote listings into one array.
  const remote = [];
  for (const list of Object.values(window.__REMOTE_REVIEWS)) {
    if (Array.isArray(list)) remote.push(...list);
  }
  window.REVIEWS = [...remote.map(attach), ...user.map(attach)];
}

// Public helpers consumed by views.
function reviewsForListing(listingId) {
  // Side-effect: first access for a listing kicks off a background fetch.
  // Subsequent renders see the hydrated cache automatically via the
  // useReviews subscription. No-op on repeat calls (dedupe in hydrate).
  if (listingId) hydrateReviews(listingId);
  const all = Array.isArray(window.REVIEWS) ? window.REVIEWS : [];
  return all.filter((r) => r.listingId === listingId)
            .sort((a, b) => b.createdAt - a.createdAt);
}
function reviewStatsForListing(listingId) {
  const rs = reviewsForListing(listingId);
  if (!rs.length) return { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] };
  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of rs) { dist[r.rating - 1]++; sum += r.rating; }
  return { avg: sum / rs.length, count: rs.length, dist };
}
function reviewsForSeller(sellerId) {
  const listingIds = new Set((window.LISTINGS || [])
    .filter((l) => l.sellerId === sellerId)
    .map((l) => l.id));
  const all = Array.isArray(window.REVIEWS) ? window.REVIEWS : [];
  return all.filter((r) => listingIds.has(r.listingId))
            .sort((a, b) => b.createdAt - a.createdAt);
}

function useReviews() {
  const [version, bump] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    rebuildReviewsIndex();
    bump();
    // Subscribe to remote-review hydration so late-arriving fetch results
    // trigger a re-render here automatically (no polling).
    window.__REMOTE_REVIEWS_SUBS.add(bump);
    return () => { window.__REMOTE_REVIEWS_SUBS.delete(bump); };
  }, []);

  // Classify a listing id — backend-owned (uuid) vs local-only (user-…).
  // Mutations route differently based on this.
  const isBackend = (listingId) => !String(listingId || '').startsWith('user-');

  const add = ({ listingId, rating, text }) => {
    const me = window.ME || {};
    if (!me.id) return null;
    const stars = Math.max(1, Math.min(5, Math.floor(Number(rating) || 0)));
    const body = String(text || '').trim().slice(0, 2000);

    // Backend listing: optimistic insert into remote cache, then POST. On
    // success we reconcile with the server response; on failure we rollback.
    if (isBackend(listingId) && window.ElyAPI?.isSignedIn?.() && window.ElyAPI?.post) {
      const syntheticId = `${listingId}:${me.id}`;
      const optimistic = {
        id: syntheticId,
        listingId,
        authorId: me.id,
        authorName: me.name || me.tag || 'You',
        authorAvatar: me.avatar || '',
        rating: stars,
        text: body,
        createdAt: Date.now(),
        remote: true,
      };
      const list = window.__REMOTE_REVIEWS[listingId] || [];
      // Replace prior if any; otherwise prepend.
      const filtered = list.filter((r) => r.authorId !== me.id);
      window.__REMOTE_REVIEWS[listingId] = [optimistic, ...filtered];
      rebuildReviewsIndex();
      bump();

      window.ElyAPI.post(`/listings/${encodeURIComponent(listingId)}/reviews`, {
        stars, body: body || null,
      }).catch((err) => {
        // Rollback — drop the optimistic row, put back what was there.
        window.__REMOTE_REVIEWS[listingId] = list;
        rebuildReviewsIndex();
        bump();
        console.warn('[reviews] POST failed:', err?.message || err);
        try {
          const label = /not_owned/i.test(err?.message || '')
            ? 'You need to own this listing to review it'
            : `Review failed: ${err?.message || 'error'}`;
          window.ElyNotify?.toast?.({ text: label, kind: 'error' });
        } catch {}
      });
      return optimistic;
    }

    // Local path — unchanged shape for `user-…` listings.
    const review = {
      id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      listingId,
      authorId: me.id,
      rating: stars,
      text: body.slice(0, 500),
      createdAt: Date.now(),
    };
    const existing = loadUserReviews();
    const filtered = existing.filter((r) => !(r.listingId === listingId && r.authorId === me.id));
    filtered.unshift(review);
    saveUserReviews(filtered);
    rebuildReviewsIndex();
    bump();
    return review;
  };

  const remove = (reviewId) => {
    const me = window.ME || {};
    // Synthetic ids for remote reviews are `<listingId>:<userId>`. Split
    // on the last colon — listingIds never contain colons, so this is safe.
    if (String(reviewId).includes(':') && me.id) {
      const [listingId, authorId] = String(reviewId).split(':');
      if (authorId !== me.id) return; // defensive — can only delete own
      const list = window.__REMOTE_REVIEWS[listingId] || [];
      const prior = list;
      window.__REMOTE_REVIEWS[listingId] = list.filter((r) => r.authorId !== me.id);
      rebuildReviewsIndex();
      bump();
      if (window.ElyAPI?.del) {
        window.ElyAPI.del(`/listings/${encodeURIComponent(listingId)}/reviews`).catch((err) => {
          // Rollback.
          window.__REMOTE_REVIEWS[listingId] = prior;
          rebuildReviewsIndex();
          bump();
          console.warn('[reviews] DELETE failed:', err?.message || err);
        });
      }
      return;
    }
    // Local path.
    const next = loadUserReviews().filter((r) => r.id !== reviewId);
    saveUserReviews(next);
    rebuildReviewsIndex();
    bump();
  };

  const hasReviewed = (listingId) => {
    const me = window.ME || {};
    if (!me.id) return false;
    if (isBackend(listingId)) {
      const list = window.__REMOTE_REVIEWS[listingId] || [];
      return list.some((r) => r.authorId === me.id);
    }
    return loadUserReviews().some((r) => r.listingId === listingId && r.authorId === me.id);
  };

  // Edit = POST again (upsert on backend; local replace for `user-…`).
  // Reuses add()'s plumbing for the backend path since the DB does
  // ON CONFLICT DO UPDATE.
  const update = (reviewId, { rating, text }) => {
    const me = window.ME || {};
    if (!me.id) return false;
    if (String(reviewId).includes(':')) {
      const [listingId, authorId] = String(reviewId).split(':');
      if (authorId !== me.id) return false;
      const prev = (window.__REMOTE_REVIEWS[listingId] || []).find((r) => r.authorId === me.id);
      add({
        listingId,
        rating: rating ?? prev?.rating ?? 5,
        text: text ?? prev?.text ?? '',
      });
      return true;
    }
    // Local path.
    const cur = loadUserReviews();
    const idx = cur.findIndex((r) => r.id === reviewId && r.authorId === me.id);
    if (idx < 0) return false;
    cur[idx] = {
      ...cur[idx],
      rating: Math.max(1, Math.min(5, Math.floor(Number(rating) || cur[idx].rating))),
      text: String(text ?? cur[idx].text).trim().slice(0, 500),
      editedAt: Date.now(),
    };
    saveUserReviews(cur);
    rebuildReviewsIndex();
    bump();
    return true;
  };

  // Seller reply. One reply per review — second call overwrites. The caller
  // is responsible for confirming the current user is the listing's seller;
  // we re-check here defensively by resolving listingId → sellerId.
  const addReply = (reviewId, text) => {
    const me = window.ME || {};
    if (!me.id) return false;
    const all = Array.isArray(window.REVIEWS) ? window.REVIEWS : [];
    const target = all.find((r) => r.id === reviewId);
    if (!target) return false;
    const listing = (window.LISTINGS || []).find((l) => l.id === target.listingId);
    if (!listing || listing.sellerId !== me.id) return false;
    const trimmed = String(text || '').trim().slice(0, 500);
    const replies = loadReviewReplies();
    if (!trimmed) delete replies[reviewId];
    else replies[reviewId] = { text: trimmed, createdAt: Date.now(), authorId: me.id };
    saveReviewReplies(replies);
    rebuildReviewsIndex();
    bump();
    return true;
  };

  const removeReply = (reviewId) => {
    const me = window.ME || {};
    const replies = loadReviewReplies();
    const r = replies[reviewId];
    if (!r || r.authorId !== me.id) return false;
    delete replies[reviewId];
    saveReviewReplies(replies);
    rebuildReviewsIndex();
    bump();
    return true;
  };

  // Helpful toggle — per-browser vote set gates the global count to prevent
  // the same user clicking twice. Not a real anti-abuse story (a clear of
  // localStorage resets it), but good enough for a community hub.
  const toggleHelpful = (reviewId) => {
    const mine = loadMyHelpful();
    const counts = loadHelpfulCounts();
    const has = mine.includes(reviewId);
    if (has) {
      saveMyHelpful(mine.filter((x) => x !== reviewId));
      counts[reviewId] = Math.max(0, (counts[reviewId] || 0) - 1);
    } else {
      saveMyHelpful([reviewId, ...mine]);
      counts[reviewId] = (counts[reviewId] || 0) + 1;
    }
    saveHelpfulCounts(counts);
    rebuildReviewsIndex();
    bump();
    return !has;
  };
  const isHelpful = (reviewId) => loadMyHelpful().includes(reviewId);

  return { version, add, remove, hasReviewed, update, addReply, removeReply, toggleHelpful, isHelpful };
}

// ──── Wishlist — "save for later" on marketplace listings ────
// Tiny hook: stores a Set of listingIds in localStorage. Cross-tab sync via
// storage event so a toggle in the detail page reflects on any open market
// grid instantly.
const WISHLIST_KEY = 'elyhub.wishlist.v1';
function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveWishlist(ids) {
  try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)); } catch {}
}
function useWishlist() {
  const [items, setItems] = React.useState(() => loadWishlist());
  // Keep in sync if another view writes to localStorage (cross-tab, rare, but
  // harmless to support).
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === WISHLIST_KEY) setItems(loadWishlist());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const has = (id) => items.includes(id);
  const toggle = (id) => {
    setItems((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
      saveWishlist(next);
      return next;
    });
  };
  const remove = (id) => {
    setItems((cur) => {
      const next = cur.filter((x) => x !== id);
      saveWishlist(next);
      return next;
    });
  };
  return { items, has, toggle, remove };
}

// ──── Follow creators ────
// localStorage set of creator (member) ids the user has followed. Used by the
// FeedView to surface new listings from just those creators, and by the
// FollowButton on CreatorProfileView / seller cards. `lastSeen` tracks when
// the Feed was last viewed, so we can show a "N new" pip when unseen listings
// pile up.
const FOLLOWS_KEY = 'elyhub.follows.v1';
const FEED_SEEN_KEY = 'elyhub.feed.lastSeen';
function loadFollows() {
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveFollows(ids) {
  try { localStorage.setItem(FOLLOWS_KEY, JSON.stringify(ids)); } catch {}
}
function useFollows() {
  const [items, setItems] = React.useState(() => loadFollows());
  const [lastSeen, setLastSeen] = React.useState(() => {
    try { return Number(localStorage.getItem(FEED_SEEN_KEY) || 0); } catch { return 0; }
  });
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FOLLOWS_KEY) setItems(loadFollows());
      if (e.key === FEED_SEEN_KEY) {
        try { setLastSeen(Number(localStorage.getItem(FEED_SEEN_KEY) || 0)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const has = (id) => items.includes(id);
  const toggle = (id) => {
    setItems((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
      saveFollows(next);
      return next;
    });
  };
  const markSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    try { localStorage.setItem(FEED_SEEN_KEY, String(now)); } catch {}
  };
  return { items, has, toggle, lastSeen, markSeen };
}

// ──── Recently viewed ────
// Thin localStorage FIFO of the last N listing ids the user opened. Trimmed
// to RECENT_CAP so it never balloons. Duplicate views bubble the id to the
// front instead of being appended, so the strip ordering tracks "most recent
// first" intuitively. Cross-tab sync via the storage event.
const RECENT_KEY = 'elyhub.recent.v1';
const RECENT_CAP = 20;
function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveRecent(ids) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); } catch {}
}
function useRecentlyViewed() {
  const [items, setItems] = React.useState(() => loadRecent());
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key === RECENT_KEY) setItems(loadRecent()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const push = (id) => {
    if (!id) return;
    setItems((cur) => {
      const next = [id, ...cur.filter((x) => x !== id)].slice(0, RECENT_CAP);
      saveRecent(next);
      return next;
    });
  };
  const clear = () => { saveRecent([]); setItems([]); };
  return { items, push, clear };
}

// ──── Messaging — lightweight 1:1 conversations ────
// Local-first: threads persist under elyhub.messages.v1. Each thread pairs the
// current user with one other member (sellers, creators, friends) and holds a
// time-ordered list of messages. No server yet — the other side is inert, but
// a small seed library boots the inbox with a handful of realistic-looking
// conversations so the feature has presence before the user has messaged
// anyone themselves.
//
// Thread id format: sorted([meId, otherId]).join(':') — deterministic and
// commutative, so opening a thread from either direction finds the same row.
//
// messages: [{ id, fromId, text, ts, read }]
//   fromId === meId → outgoing, others → incoming
//   read: true once the current user has opened the thread OR sent a reply
const MESSAGES_KEY = 'elyhub.messages.v1';

function loadThreads() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return null;
}
function saveThreads(map) {
  try { localStorage.setItem(MESSAGES_KEY, JSON.stringify(map)); } catch {}
}
function threadIdFor(meId, otherId) {
  return [meId, otherId].sort().join(':');
}
// Seed a few plausible conversations so the inbox isn't a ghost town on first
// visit. Only fires when storage is empty — once the user has any real
// message history, we never overwrite it. Uses deterministic timestamps
// relative to "now" so relative-time labels feel fresh each session.
function seedThreads(meId) {
  const members = (window.MEMBERS || []).filter((m) => m.id !== meId).slice(0, 3);
  const now = Date.now();
  const out = {};
  const seeds = [
    {
      minsAgo: 35,
      msgs: [
        { fromOther: true, text: 'Hey! Saw you wishlisted Noctua — dropping a 15% creator code if you want it. Ping me.' },
      ],
      unreadOther: true,
    },
    {
      minsAgo: 60 * 26, // ~26h ago
      msgs: [
        { fromOther: true, text: 'Thanks for picking up the sound pack 🙏' },
        { fromMe: true, text: 'np! the low-end layer is insane btw' },
        { fromOther: true, text: 'appreciate that. next version has 12 more hits' },
      ],
    },
    {
      minsAgo: 60 * 24 * 3 + 40, // 3d ago
      msgs: [
        { fromMe: true, text: 'Any plans to support DaVinci Resolve in Zephyro?' },
        { fromOther: true, text: "It's on the roadmap — probably Q3. Honestly depends on how the Premiere side stabilizes." },
      ],
    },
  ];
  members.forEach((m, i) => {
    const seed = seeds[i];
    if (!seed) return;
    const baseTs = now - seed.minsAgo * 60_000;
    const messages = seed.msgs.map((msg, j) => ({
      id: `seed-${m.id}-${j}`,
      fromId: msg.fromMe ? meId : m.id,
      text: msg.text,
      ts: baseTs + j * 90_000, // each follow-up ~90s later
      read: !seed.unreadOther || !!msg.fromMe || j < seed.msgs.length - 1,
    }));
    const id = threadIdFor(meId, m.id);
    out[id] = {
      id, otherId: m.id,
      messages,
      updatedAt: messages[messages.length - 1].ts,
    };
  });
  return out;
}

// Maps a server-shaped attachment into the client shape used by views.
// Kind 'listing' encodes the listing id in attachment_key (see messages.ts
// route comment). Image/file are reserved for future R2-backed embeds.
function mapServerAttachment(att) {
  if (!att || !att.attachment_key) return null;
  const k = att.attachment_kind;
  if (k === 'listing') return { type: 'listing', id: att.attachment_key };
  if (k === 'image' || k === 'file') return { type: k, key: att.attachment_key };
  return null;
}

// Server message → client message shape ({ id, fromId, text, ts, read, attachment? }).
function mapServerMessage(m, meId, otherId) {
  const att = mapServerAttachment(m);
  return {
    id: m.id,
    fromId: m.from_me ? meId : otherId,
    text: m.body || '',
    ts: m.created_at,
    read: m.from_me || !!m.read_at,
    ...(att ? { attachment: att } : {}),
  };
}

// Backed by /messages/* routes. Polls thread list every 10s while the tab
// is visible. Per-thread message history is hydrated on first selection
// (markRead triggers it) and re-fetched on each poll for the active thread.
//
// State shape preserved from the legacy localStorage version so existing
// consumers (MessagesView, ProfileView, ShareTrigger) need no changes:
//   threads:        { [clientId]: { id, otherId, messages: [], updatedAt, unread, _hydrated } }
//   list:           threads sorted by updatedAt DESC
//   meId, startThread, send, markRead, unreadForThread, unreadCount
function useMessages() {
  const meId = window.ME?.id || 'me';
  const [threads, setThreads] = React.useState({});
  const activeOtherRef = React.useRef(null); // current open thread, for poll

  const buildEmpty = (otherId) => ({
    id: threadIdFor(meId, otherId),
    otherId,
    messages: [],
    updatedAt: 0,
    unread: 0,
    _hydrated: false,
  });

  // Hydrate per-thread messages. Called when the user opens a thread, and
  // on each poll tick for the currently-active thread so new messages
  // from the other side appear without manual refresh.
  const loadThread = React.useCallback(async (otherId) => {
    if (!otherId || otherId === meId) return;
    if (!window.ElyAPI?.isSignedIn?.()) return;
    try {
      const res = await window.ElyAPI.get(`/messages/threads/${encodeURIComponent(otherId)}`);
      const id = threadIdFor(meId, otherId);
      const msgs = (res.messages || []).map((m) => mapServerMessage(m, meId, otherId));
      setThreads((prev) => {
        const t = prev[id] || buildEmpty(otherId);
        return {
          ...prev,
          [id]: {
            ...t,
            messages: msgs,
            updatedAt: res.thread?.last_message_at || msgs[msgs.length - 1]?.ts || t.updatedAt,
            _hydrated: true,
          },
        };
      });
    } catch (err) {
      console.warn('[messages] loadThread failed:', err.message);
    }
  }, [meId]);

  // Pull the thread summaries (one-line previews + unread counts). Light
  // payload; safe to poll. Preserves any already-hydrated message arrays.
  const loadThreadList = React.useCallback(async () => {
    if (!window.ElyAPI?.isSignedIn?.()) return;
    try {
      const res = await window.ElyAPI.get('/messages/threads');
      setThreads((prev) => {
        const next = {};
        for (const t of res.items || []) {
          const id = threadIdFor(meId, t.other_user_id);
          const existing = prev[id];
          next[id] = {
            id,
            otherId: t.other_user_id,
            messages: existing?.messages || [],
            updatedAt: t.last_message_at || 0,
            unread: t.unread || 0,
            _hydrated: existing?._hydrated || false,
          };
        }
        // Preserve any thread the user just started but that has no messages
        // yet (server omits them from the list since last_message_at is null).
        for (const id of Object.keys(prev)) {
          if (!next[id] && prev[id].messages.length === 0) next[id] = prev[id];
        }
        return next;
      });
    } catch (err) {
      console.warn('[messages] loadThreadList failed:', err.message);
    }
  }, [meId]);

  // Initial load + polling. Suppresses ticks when the tab is hidden so we
  // don't burn CF Workers requests on background tabs.
  React.useEffect(() => {
    loadThreadList();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadThreadList();
      // Also re-hydrate the active thread so incoming messages appear.
      if (activeOtherRef.current) loadThread(activeOtherRef.current);
    }, 10_000);
    return () => clearInterval(id);
  }, [loadThreadList, loadThread]);

  // Ensure a (possibly empty) thread row exists locally so the UI can
  // route to it before the first message lands. The server creates the
  // real row lazily on first send. Triggers a hydrate so any prior
  // history (if the thread already exists server-side) shows up.
  const startThread = (otherId) => {
    if (!otherId || otherId === meId) return null;
    const id = threadIdFor(meId, otherId);
    setThreads((prev) => prev[id] ? prev : { ...prev, [id]: buildEmpty(otherId) });
    loadThread(otherId);
    return id;
  };

  // Optimistic send: append a temp message immediately, then reconcile
  // with the server response. On failure, drop the temp and toast.
  const send = async (otherId, text, attachment) => {
    const clean = String(text || '').trim().slice(0, 4000);
    if (!clean && !attachment) return;
    const id = threadIdFor(meId, otherId);
    const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic = {
      id: tempId,
      fromId: meId,
      text: clean,
      ts: Date.now(),
      read: true,
      _pending: true,
      ...(attachment ? { attachment } : {}),
    };
    setThreads((prev) => {
      const t = prev[id] || buildEmpty(otherId);
      return { ...prev, [id]: { ...t, messages: [...t.messages, optimistic], updatedAt: optimistic.ts } };
    });
    try {
      const payload = { to: otherId, body: clean };
      // Translate client attachment shape to server fields. Only listing
      // embeds are wired today; image/file would need an R2 upload first.
      if (attachment && attachment.type === 'listing' && attachment.id) {
        payload.attachment_kind = 'listing';
        payload.attachment_key = attachment.id;
      }
      const res = await window.ElyAPI.post('/messages/send', payload);
      const m = res.message;
      const real = mapServerMessage({ ...m, from_me: true }, meId, otherId);
      setThreads((prev) => {
        const t = prev[id];
        if (!t) return prev;
        const replaced = t.messages.map((x) => x.id === tempId ? real : x);
        return { ...prev, [id]: { ...t, messages: replaced, updatedAt: real.ts } };
      });
    } catch (err) {
      console.warn('[messages] send failed:', err.message);
      setThreads((prev) => {
        const t = prev[id];
        if (!t) return prev;
        return { ...prev, [id]: { ...t, messages: t.messages.filter((x) => x.id !== tempId) } };
      });
      try { ElyNotify?.toast?.({ text: `Couldn't send: ${err.message || 'unknown'}`, kind: 'warn' }); } catch {}
    }
  };

  // Bumps the server-side read watermark for the calling user and zeroes
  // the local unread count. Idempotent. Also hydrates the thread on first
  // open so the message history is fetched once the user lands on it.
  const markRead = async (clientThreadId) => {
    const t = threads[clientThreadId];
    if (!t) return;
    activeOtherRef.current = t.otherId;
    if (!t._hydrated) loadThread(t.otherId);
    if ((t.unread || 0) === 0) return;
    setThreads((prev) => ({ ...prev, [clientThreadId]: { ...prev[clientThreadId], unread: 0 } }));
    try {
      await window.ElyAPI.post(`/messages/threads/${encodeURIComponent(t.otherId)}/read`);
    } catch (err) {
      console.warn('[messages] markRead failed:', err.message);
    }
  };

  // Server already gives unread per thread; fall back to scanning messages
  // for legacy/unhydrated threads.
  const unreadForThread = (t) => {
    if (typeof t.unread === 'number') return t.unread;
    return t.messages.filter((m) => m.fromId !== meId && !m.read).length;
  };
  const list = Object.values(threads).sort((a, b) => b.updatedAt - a.updatedAt);
  const unreadCount = list.reduce((a, t) => a + unreadForThread(t), 0);

  return { threads, list, meId, startThread, send, markRead, unreadForThread, unreadCount, loadThread };
}

// ──── Coupons / promo codes — creator-issued discount codes ────
// Creators mint codes on the dashboard; buyers redeem them at checkout. Each
// coupon is scoped to its seller (so only that seller's listings are eligible)
// and optionally to a specific listing. Uses + expiry are enforced at apply
// time. Persists in localStorage; also seeds a couple of demo codes for seed
// sellers so the feature doesn't look empty on first visit.
const COUPONS_KEY = 'elyhub.coupons.v1';
function loadCoupons() {
  try {
    const raw = localStorage.getItem(COUPONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveCoupons(map) {
  try { localStorage.setItem(COUPONS_KEY, JSON.stringify(map)); } catch {}
}
// Normalize to uppercase alphanum — spaces/hyphens stripped so "ELY-25" and
// "ely 25" both resolve to "ELY25".
function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
// Seed a handful of plausible codes against the first few seed sellers so
// the redeem input has something real to validate against out of the box.
function seedCoupons() {
  const members = (window.MEMBERS || []);
  const listings = (window.LISTINGS || []);
  const me = window.ME?.id || 'me';
  const out = {};
  const pick = (sellerId) => listings.find((l) => l.sellerId === sellerId);
  const addSeed = (sellerId, code, percent, listingId, notes) => {
    if (!sellerId || sellerId === me) return;
    const k = normalizeCode(code);
    if (!k || out[k]) return;
    out[k] = {
      code: k, sellerId, percentOff: percent,
      listingId: listingId || null,
      maxUses: null, uses: 0,
      expiresAt: null, createdAt: Date.now(),
      disabled: false, notes: notes || '',
      seed: true,
    };
  };
  // First three non-me sellers who actually have listings get a code each.
  const sellers = [];
  for (const m of members) {
    if (m.id === me) continue;
    const l = pick(m.id);
    if (l) sellers.push({ m, l });
    if (sellers.length >= 3) break;
  }
  if (sellers[0]) addSeed(sellers[0].m.id, 'WELCOME15', 15, null, 'Creator welcome · 15% off');
  if (sellers[1]) addSeed(sellers[1].m.id, 'LAUNCH25',  25, sellers[1].l.id, 'Launch week · specific listing');
  if (sellers[2]) addSeed(sellers[2].m.id, 'FRIEND10',  10, null, 'Friends & fam');
  return out;
}
function useCoupons() {
  const [coupons, setCoupons] = React.useState(() => {
    const loaded = loadCoupons();
    if (loaded) return loaded;
    const seed = seedCoupons();
    saveCoupons(seed);
    return seed;
  });

  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === COUPONS_KEY) setCoupons(loadCoupons() || {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = (next) => { saveCoupons(next); setCoupons(next); };

  // Validation — returns { ok, coupon, reason, discount }.
  //   listing.price × percentOff is the discount, floored to integer aura.
  //   reason is a short code the UI can map to a toast.
  const validate = (rawCode, listing) => {
    const code = normalizeCode(rawCode);
    if (!code) return { ok: false, reason: 'empty' };
    const c = coupons[code];
    if (!c || c.disabled) return { ok: false, reason: 'invalid' };
    if (c.expiresAt && Date.now() > c.expiresAt) return { ok: false, reason: 'expired' };
    if (c.maxUses != null && c.uses >= c.maxUses) return { ok: false, reason: 'used-up' };
    if (!listing) return { ok: true, coupon: c, discount: 0 };
    if (listing.sellerId !== c.sellerId) return { ok: false, reason: 'wrong-seller' };
    if (c.listingId && c.listingId !== listing.id) return { ok: false, reason: 'wrong-listing' };
    const pct = Math.max(0, Math.min(90, Number(c.percentOff) || 0));
    const discount = Math.floor(((listing.price || 0) * pct) / 100);
    return { ok: true, coupon: c, discount };
  };

  // Mint a new coupon. sellerId defaults to current user. Returns the stored
  // entry or { error }. Auto-generates a short code if none provided.
  const create = ({ code, percentOff, listingId = null, maxUses = null, expiresAt = null, notes = '' }) => {
    const sellerId = window.ME?.id || 'me';
    let key = normalizeCode(code);
    if (!key) {
      // Short readable code: 6 alphanum chars.
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      do {
        key = Array.from({ length: 6 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
      } while (coupons[key]);
    }
    if (coupons[key]) return { error: 'exists' };
    const pct = Math.max(1, Math.min(90, Number(percentOff) || 0));
    if (!pct) return { error: 'percent' };
    const entry = {
      code: key, sellerId, percentOff: pct,
      listingId: listingId || null,
      maxUses: maxUses != null && maxUses !== '' ? Math.max(1, parseInt(maxUses, 10)) : null,
      uses: 0,
      expiresAt: expiresAt || null,
      notes: String(notes || '').slice(0, 80),
      createdAt: Date.now(),
      disabled: false,
    };
    persist({ ...coupons, [key]: entry });
    return { ok: true, entry };
  };

  // Increment usage — called by purchaseListing on a successful redeem.
  const recordUse = (code) => {
    const k = normalizeCode(code);
    if (!coupons[k]) return;
    persist({ ...coupons, [k]: { ...coupons[k], uses: (coupons[k].uses || 0) + 1 } });
  };

  const setDisabled = (code, disabled) => {
    const k = normalizeCode(code);
    if (!coupons[k]) return;
    persist({ ...coupons, [k]: { ...coupons[k], disabled: !!disabled } });
  };

  const remove = (code) => {
    const k = normalizeCode(code);
    if (!coupons[k]) return;
    const { [k]: _gone, ...rest } = coupons;
    persist(rest);
  };

  const forSeller = (sellerId) => Object.values(coupons).filter((c) => c.sellerId === sellerId);
  const mine = () => forSeller(window.ME?.id || 'me');

  return { coupons, validate, create, recordUse, setDisabled, remove, forSeller, mine };
}

// ──── Moderation — user reports + blocks ────
// Reports capture user-flagged listings, reviews, or profiles. We persist
// them locally so the reporter has a record; in a real deploy the hook would
// POST to a backend. Blocks are purely local — a blocked creator's listings,
// reviews, and DMs all get filtered out of the UI. Both hooks expose simple
// predicates (isBlocked, reportedTargets) so components can hide reported
// items without re-resolving the list.
const REPORTS_KEY = 'elyhub.reports.v1';
const BLOCKS_KEY  = 'elyhub.blocks.v1';
function loadReports() {
  try { const raw = localStorage.getItem(REPORTS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveReports(list) { try { localStorage.setItem(REPORTS_KEY, JSON.stringify(list)); } catch {} }
function loadBlocks() {
  try { const raw = localStorage.getItem(BLOCKS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveBlocks(list) { try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(list)); } catch {} }

function useReports() {
  const [list, setList] = React.useState(() => loadReports());
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key === REPORTS_KEY) setList(loadReports()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const persist = (next) => { saveReports(next); setList(next); };
  // Submit a new report. `kind` is 'listing' | 'review' | 'user'.
  const submit = ({ kind, targetId, reason, note = '' }) => {
    if (!kind || !targetId || !reason) return { ok: false };
    const entry = {
      id: `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind, targetId, reason,
      note: String(note || '').slice(0, 500),
      reporterId: window.ME?.id || 'me',
      ts: Date.now(),
      status: 'open',
    };
    persist([entry, ...list]);
    return { ok: true, entry };
  };
  const withdraw = (id) => persist(list.filter((r) => r.id !== id));
  // Has the current user already reported this target?
  const has = (kind, targetId) => list.some((r) => r.kind === kind && r.targetId === targetId);
  const mine = list.filter((r) => r.reporterId === (window.ME?.id || 'me'));
  return { list, mine, submit, withdraw, has };
}

function useBlocks() {
  const [ids, setIds] = React.useState(() => new Set(loadBlocks()));
  React.useEffect(() => {
    const onStorage = (e) => { if (e.key === BLOCKS_KEY) setIds(new Set(loadBlocks())); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const persist = (set) => { saveBlocks([...set]); setIds(new Set(set)); };
  const block = (userId) => {
    if (!userId || userId === (window.ME?.id || 'me')) return;
    const next = new Set(ids); next.add(userId); persist(next);
  };
  const unblock = (userId) => {
    const next = new Set(ids); next.delete(userId); persist(next);
  };
  const toggle = (userId) => { ids.has(userId) ? unblock(userId) : block(userId); };
  const has = (userId) => ids.has(userId);
  return { ids, block, unblock, toggle, has, size: ids.size };
}

// ──── Onboarding — first-run product tour ────
// Records completion in localStorage so we only auto-fire on the very first
// visit. Users can replay the tour any time from the topbar menu via
// `onQuick.tour` which calls `start()`. Steps are keyed by a data-tour attr
// on a live DOM element; the tour polls for the target to exist (so nav
// items that render only after hydration still get highlighted).
const ONBOARDING_KEY = 'elyhub.onboarded.v1';
function useOnboarding() {
  const [step, setStep] = React.useState(-1); // -1 = inactive
  const active = step >= 0;
  const start = () => setStep(0);
  const next  = () => setStep((s) => s + 1);
  const prev  = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => {
    setStep(-1);
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
  };
  const skip = finish;
  // Auto-fire once — wait a beat so the shell has mounted and data-tour
  // targets exist before the first step tries to measure.
  React.useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(ONBOARDING_KEY) === '1'; } catch {}
    if (seen) return;
    const t = setTimeout(() => setStep(0), 900);
    return () => clearTimeout(t);
  }, []);
  return { active, step, start, next, prev, finish, skip };
}

// ──── OnboardingTour — spotlight overlay + tooltip ────
// Steps reference a `data-tour` selector. We poll for the element (up to ~2s)
// so sidebar items that render after the first paint still anchor correctly.
// The spotlight is a ring drawn with box-shadow around the target's rect,
// plus a soft backdrop. Tooltip auto-flips when the target is near the edge.
const TOUR_STEPS = [
  { key: null, title: 'Welcome to ElyHub', body: "Let's take 30 seconds to show you around. You can skip anytime." },
  { key: 'search',       title: 'Instant search', body: 'Type anywhere to find listings, members, and rewards. ⌘K works from any screen.' },
  { key: 'nav-store',    title: 'Marketplace',    body: 'Browse plugins, themes, sound packs, and subscriptions — all priced in aura.' },
  { key: 'nav-messages', title: 'Direct messages',body: 'Chat with creators and buyers directly. Coupons, support, the works.' },
  { key: 'aura',         title: 'Your aura',      body: "This is your balance. You earn aura from community activity — leveling up unlocks new things." },
  { key: 'nav-profile',  title: 'Your profile',   body: 'Your stats, trophies, and a shortcut to the Creator Dashboard if you publish.' },
  // Theme picker step — shows theme chips you can hover to live-preview the
  // app under each one. Includes Zodiac (a celestial reskin unlocked by Hugin).
  { key: null, kind: 'themes', title: 'Make it yours',
    body: 'ElyHub ships with several looks. Hover one to preview — Zodiac is the showcase, unlocked by buying the Hugin plugin.' },
  { key: null, title: "You're set", body: 'Everything else is explore-and-discover. Welcome to the community.' },
];
function OnboardingTour({ tour }) {
  const stepDef = TOUR_STEPS[tour.step];
  const [rect, setRect] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  // Find the anchor element for the current step — polling briefly since the
  // sidebar/shell may not be on screen at step start.
  React.useEffect(() => {
    if (!tour.active) return;
    setReady(false);
    setRect(null);
    if (!stepDef?.key) { setReady(true); return; }
    let tries = 0;
    let cancelled = false;
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${stepDef.key}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
        setReady(true);
      } else if (tries++ < 20) {
        setTimeout(find, 100);
      } else {
        // Give up — render centered tooltip without spotlight.
        setReady(true);
      }
    };
    find();
    // Reflow on resize so a window resize doesn't desync the ring.
    const onResize = () => {
      const el = document.querySelector(`[data-tour="${stepDef.key}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [tour.active, tour.step]);

  // Esc closes the tour.
  React.useEffect(() => {
    if (!tour.active) return;
    const onKey = (e) => { if (e.key === 'Escape') tour.skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour.active]);

  if (!tour.active || !stepDef || !ready) return null;

  // Tooltip placement — prefer below the target, flip to above if near
  // bottom, or center if no target.
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const tipW = 360;
  let tipX = vpW / 2 - tipW / 2;
  let tipY = vpH / 2 - 80;
  if (rect) {
    tipX = Math.min(vpW - tipW - 20, Math.max(20, rect.x + rect.w + 18));
    tipY = Math.min(vpH - 200, Math.max(20, rect.y));
    // If there isn't enough room to the right, try below.
    if (rect.x + rect.w + tipW + 40 > vpW) {
      tipX = Math.min(vpW - tipW - 20, Math.max(20, rect.x));
      tipY = rect.y + rect.h + 16;
    }
  }

  const isLast = tour.step === TOUR_STEPS.length - 1;
  const isFirst = tour.step === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,6,10,0.62)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: 'fadeIn .25s',
        pointerEvents: 'auto',
      }} onClick={tour.skip}/>
      {/* Spotlight ring */}
      {rect && (
        <div style={{
          position: 'absolute',
          left: rect.x - 6, top: rect.y - 6,
          width: rect.w + 12, height: rect.h + 12,
          borderRadius: 14,
          boxShadow: `0 0 0 2px ${T.accentHi}, 0 0 0 9999px rgba(5,6,10,0.55), 0 0 30px ${T.accentGlow}`,
          pointerEvents: 'none',
          transition: 'all .3s cubic-bezier(.2,.9,.3,1.15)',
        }}/>
      )}
      {/* Tooltip */}
      <div style={{
        position: 'absolute', left: tipX, top: tipY, width: tipW, maxWidth: '92vw',
        ...glass(2, { padding: 20, borderRadius: T.r.lg }),
        animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.15)',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ ...TY.micro, color: T.text3 }}>STEP {tour.step + 1} / {TOUR_STEPS.length}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TOUR_STEPS.map((_, i) => (
              <span key={i} style={{
                width: i === tour.step ? 16 : 6, height: 6, borderRadius: 3,
                background: i === tour.step ? T.accentHi : (i < tour.step ? T.accent : 'rgba(255,255,255,0.12)'),
                transition: 'all .2s',
              }}/>
            ))}
          </div>
        </div>
        <h3 style={{ ...TY.h3, margin: 0, fontSize: 18 }}>{stepDef.title}</h3>
        <div style={{ ...TY.body, color: T.text2, marginTop: 8, lineHeight: 1.5, fontSize: 13 }}>
          {stepDef.body}
        </div>
        {stepDef.kind === 'themes' && <OnboardingThemePicker/>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 10 }}>
          <button onClick={tour.skip} style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: T.text3, fontFamily: T.fontSans, fontSize: 12,
          }}>Skip tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={tour.prev} style={{
                padding: '7px 14px', borderRadius: T.r.pill,
                background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                color: T.text2, cursor: 'pointer',
                fontFamily: T.fontSans, fontSize: 12,
              }}>Back</button>
            )}
            <button
              onClick={() => (isLast ? tour.finish() : tour.next())}
              style={{
                padding: '7px 18px', borderRadius: T.r.pill,
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                border: 'none', color: '#fff', cursor: 'pointer',
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                boxShadow: `0 3px 14px ${T.accent}55`,
              }}
            >{isLast ? 'Get started' : 'Next →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding theme picker ───
// Static row of theme thumbnails inside the tour tooltip. Just shows what's
// available — no live preview. Zodiac is the showcase chip (gold accent).
function OnboardingThemePicker() {
  const chips = [
    { k: 'blue',    name: 'Nocturne', a: '#0159E7', b: '#6FACFF' },
    { k: 'ember',   name: 'Ember',    a: '#E25C3A', b: '#FF8A64' },
    { k: 'violet',  name: 'Violet',   a: '#8B5CF6', b: '#C89DFF' },
    { k: 'zodiac',  name: 'Zodiac',   a: '#0A0908', b: '#C9A24E', special: true },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {chips.map((c) => (
          <div key={c.k} style={{
            position: 'relative', height: 56,
            background: c.special
              ? `radial-gradient(ellipse at 70% 30%, ${c.b}33, ${c.a})`
              : `linear-gradient(135deg, ${c.a}, ${c.b})`,
            border: `1px solid ${c.special ? c.b + '66' : 'rgba(255,255,255,0.18)'}`,
            borderRadius: c.special ? 4 : 8,
            boxShadow: c.special ? `0 0 14px ${c.b}33` : 'none',
          }}>
            {c.special && (
              <span style={{
                position: 'absolute', top: 4, right: 6,
                color: c.b, fontSize: 11, lineHeight: 1,
                filter: `drop-shadow(0 0 4px ${c.b}88)`,
              }}>✦</span>
            )}
            <span style={{
              position: 'absolute', bottom: 4, left: 6,
              fontFamily: c.special
                ? '"Cormorant Garamond","EB Garamond",Georgia,serif'
                : T.fontSans,
              fontStyle: c.special ? 'italic' : 'normal',
              fontSize: 11, fontWeight: 600,
              color: c.special ? c.b : '#fff',
              letterSpacing: c.special ? '0.02em' : 0,
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}>{c.name}</span>
          </div>
        ))}
      </div>
      <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 8 }}>
        Switch themes anytime in Settings → Appearance.
      </div>
    </div>
  );
}

// Expose plugin helpers for the Zodiac sidebar (dist/zodiac/views.jsx).
Object.assign(window, { getActivePlugins, expiryLabel });
