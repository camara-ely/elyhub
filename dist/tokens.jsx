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
const glass = (level = 1, extra = {}) => ({
  background: level === 2 ? T.glassBg2 : T.glassBg,
  backdropFilter: 'blur(36px) saturate(180%) brightness(0.85)',
  WebkitBackdropFilter: 'blur(36px) saturate(180%) brightness(0.85)',
  border: `0.5px solid ${T.glassBorder}`,
  borderRadius: T.r.lg,
  // Outer shadow anchors the card in space; inset highlight is the thin
  // lit edge along the top that sells the "thick glass" material.
  boxShadow: `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02), 0 12px 50px rgba(0,0,0,0.45)`,
  ...extra,
});

// ──── Mock data ────
const MEMBERS = [
  { id: 'u1', name: 'Diogo Marques',  tag: 'diogom',   aura: 48240, level: 42, delta: 2,  role: 'Founder' },
  { id: 'u2', name: 'Mariana Silva',  tag: 'mari',     aura: 41180, level: 39, delta: 1,  role: 'Booster' },
  { id: 'u3', name: 'Rui Almeida',    tag: 'ruia',     aura: 39950, level: 38, delta: -1, role: 'Recruiter' },
  { id: 'u4', name: 'Inês Pereira',   tag: 'inesp',    aura: 34220, level: 35, delta: 3,  role: 'Dealmaker' },
  { id: 'u5', name: 'Tiago Costa',    tag: 'tgc',      aura: 31010, level: 33, delta: 0,  role: 'Booster' },
  { id: 'me', name: 'Alexandre Ely',  tag: 'ely',      aura: 29840, level: 32, delta: 3,  role: 'Dealmaker' },
  { id: 'u6', name: 'Ana Ribeiro',    tag: 'anar',     aura: 28470, level: 31, delta: -2, role: 'Gym Club' },
  { id: 'u7', name: 'Pedro Sousa',    tag: 'peds',     aura: 26120, level: 29, delta: 5,  role: 'VC' },
  { id: 'u8', name: 'Carolina Dias',  tag: 'carold',   aura: 24880, level: 28, delta: 1,  role: 'Chatter' },
  { id: 'u9', name: 'João Teixeira',  tag: 'jteix',    aura: 22390, level: 27, delta: -1, role: 'Gym Club' },
  { id: 'u10', name: 'Sofia Moreira', tag: 'sofm',     aura: 20110, level: 25, delta: 0,  role: 'Newcomer' },
];

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

// ──────────────── LISTINGS ────────────────
// Marketplace items. Type-driven schema — every listing has the same shape;
// `type` switches its category icon, badge label, and detail-page render.
//
//   plugin     — installs an in-app sidebar tab (KassaHub, etc). billing=monthly.
//   theme      — visual theme for ElyHub itself (applies via theme picker).
//   background — wallpaper/orb config for ElyHub.
//   sfx        — sound-effect pack (download, use in any DAW/NLE).
//   preset     — Premiere/AE/Resolve/Lightroom presets.
//   rig        — 3D character/asset rigs (Blender/Cinema4D).
//   template   — project templates (After Effects, Figma, etc).
//
//   billing    — 'one-time' (pay once, own forever) | 'monthly' (subscription).
//   sellerId   — MEMBERS.id; resolves to creator card on detail page.
//   downloads  — lifetime install count (used for "trending" sort).
//   rating     — 0–5, two decimals.
//   featured   — opt-in flag for the hero slot on MarketHome.
const LISTINGS = [
  // ── Plugins ──
  {
    id: 'l-kassahub',
    type: 'plugin', sellerId: 'u3',
    title: 'KassaHub', tagline: 'All-in-one editor sidekick',
    description: 'Streamlined panel for editors — clip notes, render queue tracker, asset bin sync, and a quick-access library that lives next to your timeline. Built for Premiere & DaVinci.',
    price: 50000, billing: 'monthly',
    category: 'Plugin', tags: ['editor', 'productivity', 'tauri'],
    cover: 'assets/listing-kassahub-cover.png',
    screenshots: ['assets/listing-kassahub-1.png', 'assets/listing-kassahub-2.png'],
    level: 15,
    downloads: 1240, sales: 184, rating: 4.82, reviewCount: 73,
    publishedAt: '2025-12-08', updatedAt: '2026-04-02',
    featured: true,
    payload: { entry: 'kassahub://main' },
  },
  {
    id: 'l-frametrap',
    type: 'plugin', sellerId: 'u7',
    title: 'FrameTrap', tagline: 'Catch every cut',
    description: 'AI scene-change detector that scrubs your raw footage and drops markers at every meaningful cut. Trained on 10k hours of edited content.',
    price: 35000, billing: 'monthly',
    category: 'Plugin', tags: ['ai', 'editor'],
    cover: 'assets/listing-frametrap-cover.png',
    screenshots: [],
    level: 20,
    downloads: 412, sales: 58, rating: 4.6, reviewCount: 21,
    publishedAt: '2026-02-14', updatedAt: '2026-04-10',
  },

  // ── Themes (in-app) ──
  {
    id: 'l-theme-noctua',
    type: 'theme', sellerId: 'u4',
    title: 'Noctua', tagline: 'Owl-quiet midnight blues',
    description: 'A theme tuned for late-night sessions. Deeper blues, warmer accents, glass that swallows the light.',
    price: 12000, billing: 'one-time',
    category: 'Theme', tags: ['dark', 'blue', 'minimal'],
    cover: 'assets/listing-noctua-cover.png',
    screenshots: ['assets/listing-noctua-1.png'],
    level: 5,
    downloads: 2841, sales: 920, rating: 4.91, reviewCount: 312,
    publishedAt: '2026-01-22', updatedAt: '2026-03-30',
    featured: true,
    payload: { themeKey: 'custom-noctua' },
  },
  {
    id: 'l-theme-glassine',
    type: 'theme', sellerId: 'me',
    title: 'Glassine', tagline: 'High-clarity frosted set',
    description: 'A 4-variant pack: Clear, Smoke, Amber, Rose. All with hand-tuned hue-aware text contrast.',
    price: 18000, billing: 'one-time',
    category: 'Theme', tags: ['pack', 'glass', 'pastel'],
    cover: 'assets/listing-glassine-cover.png',
    screenshots: [],
    level: 10,
    downloads: 690, sales: 210, rating: 4.7, reviewCount: 88,
    publishedAt: '2026-03-01', updatedAt: '2026-04-15',
  },

  // ── Backgrounds (in-app wallpapers) ──
  {
    id: 'l-bg-aurora',
    type: 'background', sellerId: 'u2',
    title: 'Aurora 6-pack', tagline: 'Northern-light gradients',
    description: 'Six layered wallpapers, each tuned for a different mood. Includes the editable .png + ElyHub theme JSON.',
    price: 8000, billing: 'one-time',
    category: 'Background', tags: ['wallpaper', 'gradient', 'pack'],
    cover: 'assets/listing-aurora-cover.png',
    screenshots: ['assets/listing-aurora-1.png', 'assets/listing-aurora-2.png'],
    level: 5,
    downloads: 1820, sales: 540, rating: 4.85, reviewCount: 197,
    publishedAt: '2026-02-08', updatedAt: '2026-03-22',
  },
  {
    id: 'l-bg-dunes-pro',
    type: 'background', sellerId: 'u9',
    title: 'Dunes Pro', tagline: 'Higher-res sequel to Dunes',
    description: 'Same vibe as the stock Dunes wallpaper — bumped to 4K and re-graded for warmer mids.',
    price: 5000, billing: 'one-time',
    category: 'Background', tags: ['wallpaper', '4k'],
    cover: 'assets/listing-dunes-pro-cover.png',
    screenshots: [],
    level: 1,
    downloads: 3120, sales: 1102, rating: 4.6, reviewCount: 240,
    publishedAt: '2026-01-04', updatedAt: '2026-04-18',
  },

  // ── SFX packs ──
  {
    id: 'l-sfx-tactile',
    type: 'sfx', sellerId: 'u1',
    title: 'Tactile UI Pack', tagline: '120 hand-crafted UI clicks',
    description: 'Every click, hover, swoosh, and swipe a montage editor needs. Recorded on analogue gear, processed in Pro Tools.',
    price: 22000, billing: 'one-time',
    category: 'Sound', tags: ['sfx', 'ui', 'foley'],
    cover: 'assets/listing-tactile-cover.png',
    screenshots: [],
    level: 10,
    downloads: 980, sales: 312, rating: 4.88, reviewCount: 142,
    publishedAt: '2026-01-30', updatedAt: '2026-04-05',
    featured: true,
  },
  {
    id: 'l-sfx-cinematic-impacts',
    type: 'sfx', sellerId: 'u5',
    title: 'Cinematic Impacts Vol. 2', tagline: '40 trailer hits + risers',
    description: 'Forty stems engineered for trailer cuts. Stems split into Boom / Tail / Riser so you can mix to your edit.',
    price: 28000, billing: 'one-time',
    category: 'Sound', tags: ['sfx', 'trailer', 'cinematic'],
    cover: 'assets/listing-impacts-cover.png',
    screenshots: [],
    level: 15,
    downloads: 540, sales: 170, rating: 4.74, reviewCount: 64,
    publishedAt: '2026-03-12', updatedAt: '2026-04-19',
  },

  // ── Presets ──
  {
    id: 'l-preset-grade-warm',
    type: 'preset', sellerId: 'u8',
    title: 'Warm Grade · Resolve', tagline: 'Sun-soaked color science',
    description: 'A LUT + node tree for DaVinci that pushes neutrals toward warm amber. Tested on Sony, Canon, Lumix footage.',
    price: 9000, billing: 'one-time',
    category: 'Preset', tags: ['color', 'davinci', 'lut'],
    cover: 'assets/listing-warmgrade-cover.png',
    screenshots: [],
    level: 5,
    downloads: 2200, sales: 870, rating: 4.79, reviewCount: 281,
    publishedAt: '2026-02-20', updatedAt: '2026-04-12',
  },
  {
    id: 'l-preset-mogrt',
    type: 'preset', sellerId: 'u6',
    title: 'Motion Title Kit', tagline: '24 .mogrt animated titles',
    description: 'Drag-and-drop title presets for Premiere. Editable in Essential Graphics. Variable fonts included.',
    price: 14000, billing: 'one-time',
    category: 'Preset', tags: ['premiere', 'titles', 'mogrt'],
    cover: 'assets/listing-mogrt-cover.png',
    screenshots: [],
    level: 8,
    downloads: 1340, sales: 420, rating: 4.65, reviewCount: 130,
    publishedAt: '2026-01-15', updatedAt: '2026-03-28',
  },

  // ── 3D rigs ──
  {
    id: 'l-rig-stickfella',
    type: 'rig', sellerId: 'u10',
    title: 'StickFella Rig', tagline: 'Cartoony stick character',
    description: 'A fully rigged Blender character with IK arms/legs, facial morph targets, and 6 walk-cycle starter clips.',
    price: 24000, billing: 'one-time',
    category: '3D', tags: ['blender', 'rig', 'character'],
    cover: 'assets/listing-stickfella-cover.png',
    screenshots: [],
    level: 12,
    downloads: 380, sales: 96, rating: 4.92, reviewCount: 52,
    publishedAt: '2026-02-26', updatedAt: '2026-04-08',
    featured: true,
  },
  {
    id: 'l-rig-product',
    type: 'rig', sellerId: 'u3',
    title: 'Product Studio', tagline: 'Plug-and-render product set',
    description: 'A Cinema4D scene with HDRi, area lights, turntable cam rig, and 6 material presets. Drop your model, hit render.',
    price: 32000, billing: 'one-time',
    category: '3D', tags: ['c4d', 'product', 'render'],
    cover: 'assets/listing-product-cover.png',
    screenshots: [],
    level: 18,
    downloads: 210, sales: 71, rating: 4.8, reviewCount: 28,
    publishedAt: '2026-03-18', updatedAt: '2026-04-19',
  },

  // ── Templates ──
  {
    id: 'l-tpl-aenkit',
    type: 'template', sellerId: 'u4',
    title: 'AE Intro Kit', tagline: 'Logo-reveal pack',
    description: 'Ten After Effects intro projects, all editable in CC 2024+. Includes audio cues and color-coded comp tree.',
    price: 16000, billing: 'one-time',
    category: 'Template', tags: ['ae', 'intro', 'logo'],
    cover: 'assets/listing-aekit-cover.png',
    screenshots: [],
    level: 8,
    downloads: 1120, sales: 360, rating: 4.7, reviewCount: 142,
    publishedAt: '2026-01-08', updatedAt: '2026-03-15',
  },
  {
    id: 'l-tpl-pitchdeck',
    type: 'template', sellerId: 'me',
    title: 'Pitch Deck · Figma', tagline: '32-slide investor template',
    description: 'A polished pitch deck in Figma — variants for SaaS, marketplace, and consumer. Auto-layout everywhere.',
    price: 11000, billing: 'one-time',
    category: 'Template', tags: ['figma', 'pitch', 'design'],
    cover: 'assets/listing-pitch-cover.png',
    screenshots: [],
    level: 5,
    downloads: 760, sales: 234, rating: 4.55, reviewCount: 88,
    publishedAt: '2026-02-02', updatedAt: '2026-04-01',
  },
  {
    id: 'l-tpl-thumb',
    type: 'template', sellerId: 'u7',
    title: 'YT Thumbnail Pack', tagline: '40 layered .psd thumbnails',
    description: 'A library of high-CTR thumbnail layouts. Smart objects make swapping your hero shot a single click.',
    price: 7500, billing: 'one-time',
    category: 'Template', tags: ['youtube', 'thumbnail', 'psd'],
    cover: 'assets/listing-thumb-cover.png',
    screenshots: [],
    level: 1,
    downloads: 3450, sales: 980, rating: 4.62, reviewCount: 320,
    publishedAt: '2025-12-12', updatedAt: '2026-04-20',
  },

  // ── More plugins ──
  {
    id: 'l-plugin-aurasync',
    type: 'plugin', sellerId: 'u2',
    title: 'AuraSync', tagline: 'Discord ↔ Premiere project sync',
    description: 'Push your Premiere chapter markers to a Discord channel as a polished embed. Notifies the team on every render.',
    price: 25000, billing: 'monthly',
    category: 'Plugin', tags: ['discord', 'premiere', 'collab'],
    cover: 'assets/listing-aurasync-cover.png',
    screenshots: [],
    level: 18,
    downloads: 290, sales: 41, rating: 4.5, reviewCount: 14,
    publishedAt: '2026-03-25', updatedAt: '2026-04-21',
  },
];

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
  const items = LISTINGS.filter((l) => l.sellerId === sellerId);
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
