// ElyHub — Glassmorphism desktop. Ambient gradient BG, frosted cards.
const T = {
  // Ambient bg is drawn with orbs in HTML; these are card/text tokens
  bg:         '#05060A',
  glassBg:    'rgba(255,255,255,0.06)',
  glassBg2:   'rgba(255,255,255,0.09)',
  glassHi:    'rgba(255,255,255,0.14)',
  glassBorder:'rgba(255,255,255,0.14)',
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

// Glass surface helper — applied as style prop
const glass = (level = 1, extra = {}) => ({
  background: level === 2 ? T.glassBg2 : T.glassBg,
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: `0.5px solid ${T.glassBorder}`,
  borderRadius: T.r.lg,
  boxShadow: `inset 0 1px 0 ${T.glassHi}, 0 10px 40px rgba(0,0,0,0.35)`,
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
  { id: 'r1', title: 'Adobe CC',              sub: '1 month · Full suite',   price: 45000, stock: 4,  level: 25, category: 'Software' },
  { id: 'r2', title: 'Spotify Premium',       sub: '1 month · Individual',   price: 12000, stock: 18, level: 10, category: 'Software' },
  { id: 'r3', title: 'Discord Nitro',         sub: '1 month · Full',         price: 15000, stock: 12, level: 15, category: 'Software' },
  { id: 'r4', title: 'Custom server role',    sub: 'Name, color & icon',     price: 30000, stock: 99, level: 20, category: 'Club' },
  { id: 'r5', title: '1:1 with Diogo',        sub: '30 min call',            price: 75000, stock: 1,  level: 35, category: 'Club' },
  { id: 'r6', title: 'ElyHub Hoodie',         sub: 'Drop 03 · Charcoal',     price: 25000, stock: 6,  level: 18, category: 'Merch' },
  { id: 'r7', title: 'Amazon €25',            sub: 'Digital code',           price: 28000, stock: 10, level: 12, category: 'Cards' },
  { id: 'r8', title: 'Steam €20',             sub: 'Digital code',           price: 22000, stock: 14, level: 12, category: 'Cards' },
  { id: 'r9', title: 'Ely Summit Early',      sub: 'Lisboa, Sep 2026',       price: 60000, stock: 25, level: 30, category: 'Events' },
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

Object.assign(window, { T, TY, glass, MEMBERS, ME, REWARDS, TROPHIES, FEED, NOTIFICATIONS, fmt });
