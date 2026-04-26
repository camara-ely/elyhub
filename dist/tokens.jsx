// ElyHub — Glassmorphism desktop. Ambient gradient BG, frosted cards.
const T = {
  // Ambient bg is drawn with orbs in HTML; these are card/text tokens
  bg:         '#05060A',
  // Glass backgrounds — layered: a dark base tint so content behind actually
  // gets darkened (not just blurred), plus a subtle white overlay for the
  // frosted-highlight feel. Apple's "liquid glass" look needs BOTH layers;
  // pure white-alpha over bright content bleeds too much.
  glassBg:    'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), rgba(8,10,18,0.62)',
  glassBg2:   'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05)), rgba(8,10,18,0.72)',
  glassHi:    'rgba(255,255,255,0.16)',
  glassBorder:'rgba(255,255,255,0.12)',
  glassBorder2:'rgba(255,255,255,0.22)',

  text:   'rgba(255,255,255,0.96)',
  text2:  'rgba(255,255,255,0.68)',
  text3:  'rgba(255,255,255,0.45)',
  text4:  'rgba(255,255,255,0.22)',

  accent:    '#3D7BFF',
  accentHi:  '#6FA0FF',
  accentGlow:'rgba(61,123,255,0.50)',

  green: '#5FD99A',
  red:   '#FF6B5B',
  blue:  '#7FB0FF',
  lilac: '#C89DFF',

  fontSans:  '"Inter Tight", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontSerif: '"Instrument Serif", "Times New Roman", serif',
  fontMono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',

  r: { sm: 8, md: 14, lg: 20, xl: 28, xxl: 36, pill: 9999 },
};

const TY = {
  display:  { fontSize: 84, lineHeight: 0.95, fontWeight: 400, letterSpacing: '-0.035em', fontFamily: T.fontSerif, fontStyle: 'italic' },
  h1:       { fontSize: 48, lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.03em', fontFamily: T.fontSans },
  h2:       { fontSize: 30, lineHeight: 1.15, fontWeight: 500, letterSpacing: '-0.02em', fontFamily: T.fontSans },
  h3:       { fontSize: 20, lineHeight: 1.25, fontWeight: 500, letterSpacing: '-0.015em', fontFamily: T.fontSans },
  body:     { fontSize: 15, lineHeight: 1.5, fontWeight: 400, fontFamily: T.fontSans },
  small:    { fontSize: 13, lineHeight: 1.45, fontWeight: 400, fontFamily: T.fontSans },
  micro:    { fontSize: 11, lineHeight: 1.3, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.fontSans },
  mono:     { fontSize: 12, lineHeight: 1.4, fontWeight: 400, fontFamily: T.fontMono, letterSpacing: '-0.01em' },
  numLarge: { fontSize: 88, lineHeight: 0.95, fontWeight: 300, letterSpacing: '-0.04em', fontFamily: T.fontSans, fontVariantNumeric: 'tabular-nums' },
  numMed:   { fontSize: 32, lineHeight: 1, fontWeight: 500, letterSpacing: '-0.02em', fontFamily: T.fontSans, fontVariantNumeric: 'tabular-nums' },
  numSm:    { fontSize: 15, lineHeight: 1, fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontFamily: T.fontSans },
};

// Glass surface helper — applied as style prop. The backdropFilter combo
// (blur + saturate + brightness<1) is what gives it the slightly-darkened
// liquid-glass feel without looking washed out. brightness(0.85) is key —
// pure blur+saturate on bright backgrounds still reads as a bright panel.
const glass = (level = 1, extra = {}) => {
  // Zodiac mode: panels are clean ruled rectangles — single thin gold
  // hairline border on transparent ink, square-ish corners, no shadow,
  // no inner highlight, no grain. Information hierarchy comes from the
  // dividers/banners INSIDE the panel, not from the panel's own visual
  // weight. This matches the "Your Majesty" / Lovers tarot aesthetic
  // where the frame is a single deliberate line, not a pillow surface.
  if (T.zodiac) {
    // Solid ink gradient — was rgba(10,6,18,0.55) which left dropdowns
    // (search, profile menu, NotifDrawer) see-through and unreadable over
    // the Hugin/zodiac art beneath. Ink2 → ink linear gradient is fully
    // opaque and matches the rest of the zodiac panel language.
    return {
      background: 'linear-gradient(180deg, #13110D, #0A0908)',
      border: '1px solid rgba(201,162,74,0.55)',
      borderRadius: 4,
      boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(201,162,78,0.18)',
      ...extra,
    };
  }
  return {
    background: level === 2 ? T.glassBg2 : T.glassBg,
    backdropFilter: 'blur(36px) saturate(180%) brightness(0.85)',
    WebkitBackdropFilter: 'blur(36px) saturate(180%) brightness(0.85)',
    border: `0.5px solid ${T.glassBorder}`,
    borderRadius: T.r.lg,
    boxShadow: `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02), 0 12px 50px rgba(0,0,0,0.45)`,
    ...extra,
  };
};

// MEMBERS — populated by data.jsx (leaderboard poll) and lazily via
// /users/:id hydration when a listing references a seller we haven't
// met yet. Starts empty; the app no longer ships demo people.
const MEMBERS = [];

const ME = { id: 'me', name: 'Alexandre Ely', tag: 'ely', aura: 29840, level: 32, rank: 6, streak: 14, nextLevelAura: 32000, prevLevelAura: 28000, roles: ['Booster', 'Gym Club', 'Dealmaker'] };

const REWARDS = [
  { id: 'r1', title: 'Adobe CC',              sub: '1 month · Full suite',   price: 180000, stock: 4,  level: 25, category: 'Software', image: 'assets/adobe.jpg', featured: true },
  { id: 'r2', title: 'Spotify Premium',       sub: '1 month · Individual',   price: 48000,  stock: 18, level: 10, category: 'Software', image: 'assets/spotify.jpg' },
  { id: 'r3', title: 'Discord Nitro',         sub: '1 month · Full',         price: 60000,  stock: 12, level: 15, category: 'Software', image: 'assets/discord.jpg' },
  { id: 'r4', title: 'Custom server role',    sub: 'Name, color & icon',     price: 120000, stock: 99, level: 20, category: 'Club', image: 'assets/tag.jpg' },
  { id: 'r5', title: '1:1 with camara',       sub: '30 min call',            price: 300000, stock: 1,  level: 35, category: 'Club', image: 'assets/11.jpg' },
  { id: 'r7', title: 'Riot $10',              sub: 'Digital code',           price: 88000,  stock: 10, level: 12, category: 'Cards', image: 'assets/riot.jpg' },
  { id: 'r8', title: 'Steam $10',             sub: 'Digital code',           price: 88000,  stock: 14, level: 12, category: 'Cards', image: 'assets/steam.jpg' },
];

const TROPHIES = [
  { id: 't1', name: 'First Deal',       desc: 'Post a job in #hiring',     unlocked: true,  progress: 1, total: 1 },
  { id: 't2', name: 'Iron Streak',      desc: '30 daily claims in a row',  unlocked: true,  progress: 30, total: 30 },
  { id: 't3', name: 'Gym Royalty',      desc: 'Top 3 in gym leaderboard',  unlocked: true,  progress: 1, total: 1 },
  { id: 't4', name: 'Philanthropist',   desc: 'Gift 50,000 aura total',    unlocked: false, progress: 32500, total: 50000 },
  { id: 't5', name: 'Voice Veteran',    desc: '100h in voice channels',    unlocked: false, progress: 72, total: 100 },
  { id: 't6', name: "Founder's Table",  desc: '1:1 with Diogo',            unlocked: false, progress: 0, total: 1 },
];

const FEED = [
  { who: 'Mariana Silva', to: 'Alexandre Ely', amount: 500, note: 'For the assist', time: '14m' },
  { who: 'Rui Almeida',   to: 'Pedro Sousa',   amount: 1000, note: 'Congrats on the raise', time: '32m' },
  { who: 'Inês Pereira',  to: 'Ana Ribeiro',   amount: 250, note: null, time: '1h' },
  { who: 'Tiago Costa',   to: 'João Teixeira', amount: 750, note: 'Gym challenge won', time: '2h' },
  { who: 'Carolina Dias', to: 'Sofia Moreira', amount: 300, note: null, time: '3h' },
];

const NOTIFICATIONS = [
  { id: 'n1', type: 'levelup', title: 'Level 32 unlocked',               time: '2m', unread: true },
  { id: 'n2', type: 'gift',    title: 'Mariana gifted you 500 aura',     time: '14m', unread: true },
  { id: 'n3', type: 'drop',    title: 'New drop · ElyHub Hoodie',        time: '1h', unread: true },
  { id: 'n4', type: 'rank',    title: 'You moved up to #6',              time: '3h', unread: false },
];

const fmt = (n) => n.toLocaleString('en-US');

// Collapse tier-alias rows: when multiple listings share kassa_product_id
// (e.g. Hugin 1key + Hugin 2key), only the canonical (cheapest) row should
// surface in any listing-grid context — marketplace cards, seller profile,
// search. The higher-priced tier rows still exist in window.LISTINGS so
// ZephyroView can build its tier selector; they just don't render as their
// own card. Listings without kassa_product_id pass through untouched.
function dedupTieredListings(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr || [];
  const canonical = new Map(); // kpid -> cheapest listing
  for (const l of arr) {
    const kpid = l && (l.kassa_product_id || l.kassaProductId);
    if (!kpid) continue;
    const prev = canonical.get(kpid);
    if (!prev || (l.price || 0) < (prev.price || 0)) canonical.set(kpid, l);
  }
  return arr.filter((l) => {
    const kpid = l && (l.kassa_product_id || l.kassaProductId);
    if (!kpid) return true;
    return canonical.get(kpid) === l;
  });
}
window.dedupTieredListings = dedupTieredListings;

// ──────────────── LISTINGS ────────────────
// Marketplace items. Type-driven schema — every listing has the same shape;
// `type` switches its category icon, badge label, and detail-page render.
// Populated at runtime by data.jsx's /listings poll — tokens.jsx no longer
// ships a demo catalog. Shape reference (what the backend mapper emits):
//
//   id, type, sellerId, title, tagline, description,
//   price (aura), billing ('one-time' | 'monthly'), level,
//   tags[], cover, screenshots[], downloads, sales, rating, reviewCount,
//   publishedAt, updatedAt, featured, payload
//
// Keep the array mutable (not frozen) — data.jsx mutates in place so React
// refs stay stable.
const LISTINGS = [];

// Listing types — single source of truth for icons, labels, tints used across
// the marketplace UI. Order here drives the category-tile order on MarketHome.
const LISTING_TYPES = [
  { id: 'plugin',     label: 'Plugins',      hue: '#7FB0FF' },
  { id: 'theme',      label: 'Themes',       hue: '#C89DFF' },
  { id: 'background', label: 'Backgrounds',  hue: '#E89DCC' },
  { id: 'sfx',        label: 'Sound packs',  hue: '#5FD99A' },
  { id: 'preset',     label: 'Presets',      hue: '#FFD166' },
  { id: 'rig',        label: '3D rigs',      hue: '#FF8A64' },
  { id: 'template',   label: 'Templates',    hue: '#7FE3D9' },
];

// Editorial collections — curated groupings that cut across `type`. Each
// collection is either a *handpicked* list of ids (authoritative order) OR a
// *tag-rule* set (tags[] => OR-match; autoFill: true). Tag-rule collections
// stay self-updating as creators publish new items with those tags, which is
// perfect for evergreen buckets like "For Editors". Handpicked wins when both
// are provided.
//
// Rendered as a horizontal strip on MarketHome; clicking a tile opens a
// dedicated view (setView({ id: 'collection', collectionId })) with the full
// grid. The blurb is a single short sentence — anything longer looks like
// marketing copy and readers skip it.
const LISTING_COLLECTIONS = [
  {
    id: 'for-editors',
    name: 'For editors',
    blurb: 'Cut faster, render cleaner.',
    accent: '#7FB0FF',
    tags: ['editor', 'productivity', 'ai'],
    autoFill: true,
  },
  {
    id: 'dark-themes',
    name: 'Dark mode done right',
    blurb: 'Themes tuned for late nights.',
    accent: '#C89DFF',
    tags: ['dark', 'minimal', 'blue'],
    autoFill: true,
  },
  {
    id: 'weekend-builds',
    name: 'Weekend builds',
    blurb: 'Drops from the community, under 3 days old.',
    accent: '#5FD99A',
    // Special rule: newest ≤ 21 days. Resolved at read-time in getCollectionItems.
    ruleId: 'recentDrops',
  },
  {
    id: 'pocket-friendly',
    name: 'Pocket-friendly',
    blurb: 'Quality under 15k aura.',
    accent: '#FFD166',
    ruleId: 'budget',
  },
  {
    id: 'top-rated',
    name: 'Top rated',
    blurb: '4.5★ and up, across the whole catalog.',
    accent: '#FF8A64',
    ruleId: 'topRated',
  },
];

// Resolve a collection to its listings. Kept as a function so rule-driven
// collections stay fresh as data changes and handpicked ones stay stable.
function getCollectionItems(col) {
  if (!col) return [];
  if (Array.isArray(col.listingIds) && col.listingIds.length) {
    const byId = new Map(LISTINGS.map((l) => [l.id, l]));
    return col.listingIds.map((id) => byId.get(id)).filter(Boolean);
  }
  if (col.ruleId === 'recentDrops') {
    const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
    return LISTINGS
      .filter((l) => (l.createdAt || new Date(l.publishedAt || 0).getTime()) >= cutoff)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  if (col.ruleId === 'budget') {
    return LISTINGS.filter((l) => (l.price || 0) <= 15000).sort((a, b) => (a.price || 0) - (b.price || 0));
  }
  if (col.ruleId === 'topRated') {
    return LISTINGS
      .filter((l) => (l.rating || 0) >= 4.5 && (l.reviewCount || 0) >= 5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  if (Array.isArray(col.tags) && col.tags.length) {
    const set = new Set(col.tags);
    return LISTINGS.filter((l) => (l.tags || []).some((t) => set.has(t)));
  }
  return [];
}

// Derived per-creator stats. Consumed by MarketHome's "top creators" row and
// by the seller card on listing detail. Kept as a function so a future swap
// to live data is one-line.
function getCreatorStats(sellerId) {
  // Dedup tier-alias rows so a creator with one tiered product (e.g. Hugin
  // 1key + 2key) shows up as 1 listing, not 2. Mirrors what listing grids do.
  const raw = LISTINGS.filter((l) => l.sellerId === sellerId);
  const items = (typeof window !== 'undefined' && window.dedupTieredListings)
    ? window.dedupTieredListings(raw) : raw;
  if (!items.length) return { listings: 0, sales: 0, downloads: 0, avgRating: 0 };
  const sales = items.reduce((a, l) => a + (l.sales || 0), 0);
  const downloads = items.reduce((a, l) => a + (l.downloads || 0), 0);
  const ratedItems = items.filter((l) => l.rating > 0);
  const avgRating = ratedItems.length
    ? ratedItems.reduce((a, l) => a + l.rating, 0) / ratedItems.length
    : 0;
  return { listings: items.length, sales, downloads, avgRating };
}

Object.assign(window, { T, TY, glass, MEMBERS, ME, REWARDS, LISTINGS, LISTING_TYPES, LISTING_COLLECTIONS, getCollectionItems, getCreatorStats, TROPHIES, FEED, NOTIFICATIONS, fmt });
