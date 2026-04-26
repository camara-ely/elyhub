// ElyHub — Zodiac/Celestial variation
// Aesthetic: vintage occult almanac. Inky black night skies, aged parchment,
// brass/gold leaf foil, ornate cartouche frames, hand-engraved serif type.

const Z = {
  // Cosmos
  ink:       '#0A0908',     // deepest void
  ink2:      '#13110D',     // panel ground
  ink3:      '#1B1812',     // raised surface
  ink4:      '#252118',     // inset
  veil:      'rgba(10,9,8,0.78)',

  // Parchment
  parch:     '#E8DCC0',     // primary parchment
  parch2:    '#D4C29A',     // aged parchment
  parch3:    '#B89F6E',     // tea-stained
  parchFog:  'rgba(232,220,192,0.06)',

  // Foil — gold leaf gradient endpoints
  gold:      '#C9A24E',     // brass body
  goldHi:    '#F2D896',     // highlight
  goldLo:    '#7A5A22',     // shadow
  goldGlow:  'rgba(201,162,78,0.45)',
  copper:    '#B8743A',     // copper accent
  copperHi:  '#E0A368',

  // Text on cosmos
  text:      'rgba(232,220,192,0.95)',
  text2:     'rgba(232,220,192,0.65)',
  text3:     'rgba(232,220,192,0.42)',
  text4:     'rgba(232,220,192,0.22)',

  // Text on parchment
  inkText:   '#1A1408',
  inkText2:  '#3F3220',
  inkText3:  '#6B5635',

  // Status
  good:      '#7FA858',     // verdigris green
  bad:       '#A14735',     // sealing wax red

  // Borders
  hair:      'rgba(201,162,78,0.18)',
  hair2:     'rgba(201,162,78,0.32)',
  hair3:     'rgba(201,162,78,0.55)',

  // Type
  fontDisp:  '"Cormorant Garamond", "EB Garamond", "Cormorant", Georgia, serif',
  fontSerif: '"EB Garamond", "Cormorant Garamond", Georgia, serif',
  fontSans:  '"Cormorant Garamond", "EB Garamond", Georgia, serif',
  fontMono:  '"Cormorant SC", "EB Garamond", Georgia, serif',
  fontUI:    '"EB Garamond", Georgia, serif',
  fontCaps:  '"Cormorant SC", "EB Garamond", Georgia, serif',  // small caps

  r: { sm: 2, md: 3, lg: 4, xl: 6, pill: 9999 },
};

const ZTY = {
  // Display
  display: { fontFamily: Z.fontDisp, fontSize: 84, lineHeight: 0.95, fontWeight: 400, letterSpacing: '0.005em', fontStyle: 'italic' },
  h1:      { fontFamily: Z.fontDisp, fontSize: 52, lineHeight: 1.05, fontWeight: 400, letterSpacing: '0.005em', fontStyle: 'italic' },
  h2:      { fontFamily: Z.fontDisp, fontSize: 30, lineHeight: 1.2, fontWeight: 500, letterSpacing: '0.01em' },
  h3:      { fontFamily: Z.fontDisp, fontSize: 21, lineHeight: 1.3, fontWeight: 500, letterSpacing: '0.015em' },
  // Body
  body:    { fontFamily: Z.fontSerif, fontSize: 16, lineHeight: 1.55, fontWeight: 400 },
  small:   { fontFamily: Z.fontSerif, fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
  // Caps
  caps:    { fontFamily: Z.fontCaps, fontSize: 12, lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase' },
  capsSm:  { fontFamily: Z.fontCaps, fontSize: 10, lineHeight: 1.3, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase' },
  capsLg:  { fontFamily: Z.fontCaps, fontSize: 15, lineHeight: 1.3, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' },
  // Numerals — keep elegant, oldstyle
  num:     { fontFamily: Z.fontDisp, fontWeight: 400, fontVariantNumeric: 'oldstyle-nums tabular-nums', fontStyle: 'italic' },
};

// Gold-foil text gradient — apply via background-clip
const goldFill = {
  background: `linear-gradient(180deg, ${Z.goldHi} 0%, ${Z.gold} 45%, ${Z.goldLo} 100%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
  textShadow: 'none',
};

// ─── Personal sign override ───
// Persists the user's chosen sign so the profile + topbar respect it instead
// of the deterministic name-hash fallback. `getMySign()` reads the override
// (or falls back to signOf(name)). `setMySign(s|null)` writes/clears + fires
// 'elyhub:zodiac-sign-changed' so subscribers re-render without a reload.
const ZODIAC_SIGN_KEY = 'elyhub.zodiac.mySign';
function getMySign(name) {
  try {
    const stored = localStorage.getItem(ZODIAC_SIGN_KEY);
    if (stored) return stored;
  } catch {}
  return null;
}
function setMySign(sign) {
  try {
    if (sign) localStorage.setItem(ZODIAC_SIGN_KEY, sign);
    else localStorage.removeItem(ZODIAC_SIGN_KEY);
  } catch {}
  try { window.dispatchEvent(new CustomEvent('elyhub:zodiac-sign-changed', { detail: { sign } })); } catch {}
}
function useMySign(name) {
  const [tick, setTick] = (typeof React !== 'undefined') ? React.useState(0) : [0, () => {}];
  if (typeof React !== 'undefined') {
    React.useEffect(() => {
      const onChange = () => setTick((t) => t + 1);
      window.addEventListener('elyhub:zodiac-sign-changed', onChange);
      return () => window.removeEventListener('elyhub:zodiac-sign-changed', onChange);
    }, []);
  }
  return getMySign(name) || (name ? null : null);
}

// Re-export same mock data (we reach into tokens.jsx if it loaded; otherwise we redefine here)
const MEMBERS_Z = (typeof MEMBERS !== 'undefined') ? MEMBERS : [
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

const ME_Z = (typeof ME !== 'undefined') ? ME : { id: 'me', name: 'Alexandre Ely', tag: 'ely', aura: 29840, level: 32, rank: 6, streak: 14, nextLevelAura: 32000, prevLevelAura: 28000, roles: ['Booster', 'Gym Club', 'Dealmaker'] };

const REWARDS_Z = (typeof REWARDS !== 'undefined' && REWARDS.length) ? REWARDS : [
  { id: 'r1', title: 'Notion Plus · 1yr',     sub: 'Personal Pro plan, redeemed monthly',     price: 24000, level: 30, stock: 12, category: 'Software' },
  { id: 'r2', title: 'Linear Standard · 6mo', sub: 'Linear seat for half a year',             price: 18000, level: 28, stock: 8,  category: 'Software' },
  { id: 'r3', title: 'Figma Pro · 1yr',       sub: 'Full pro tier, instant invite',           price: 28000, level: 32, stock: 6,  category: 'Software' },
  { id: 'r4', title: 'Gym Club · Quarterly',  sub: 'Three months at any partner gym',         price: 15000, level: 25, stock: 20, category: 'Club' },
  { id: 'r5', title: 'Founder Dinner',        sub: 'Private supper with the inner circle',    price: 50000, level: 38, stock: 4,  category: 'Events' },
  { id: 'r6', title: 'ElyHub Hoodie',         sub: 'Charcoal heavyweight, drop III',          price: 12000, level: 20, stock: 3,  category: 'Merch' },
  { id: 'r7', title: 'Steam Wallet · €25',    sub: 'Digital code via Discord DM',             price: 8000,  level: 15, stock: 50, category: 'Cards' },
  { id: 'r8', title: 'Amazon · €50',          sub: 'Gift card, region-locked',                price: 16000, level: 22, stock: 24, category: 'Cards' },
  { id: 'r9', title: 'Cursor Pro · 6mo',      sub: 'Half-year of premium AI codegen',         price: 22000, level: 28, stock: 10, category: 'Software' },
  { id: 'r10', title: 'Concert Tickets',      sub: 'Two tickets to a curated show',           price: 35000, level: 33, stock: 2,  category: 'Events' },
  { id: 'r11', title: 'ElyHub Cap',           sub: 'Embroidered logo, one-size',              price: 6000,  level: 12, stock: 18, category: 'Merch' },
  { id: 'r12', title: 'Spotify Premium · 1yr',sub: 'Individual plan, redeemed annually',      price: 14000, level: 22, stock: 30, category: 'Cards' },
];

const TROPHIES_Z = (typeof TROPHIES !== 'undefined' && TROPHIES.length) ? TROPHIES : [
  { id: 't1', name: 'First Light',         desc: 'Earn your first 1,000 aura',             progress: 1000,  total: 1000,  unlocked: true },
  { id: 't2', name: 'Two Week Streak',     desc: 'Hit a 14-day streak',                    progress: 14,    total: 14,    unlocked: true },
  { id: 't3', name: 'Inner Circle',        desc: 'Get voted into the inner circle',        progress: 1,     total: 1,     unlocked: true },
  { id: 't4', name: 'Recruiter',           desc: 'Bring 10 new members in',                progress: 7,     total: 10,    unlocked: false },
  { id: 't5', name: 'Aura Sender',         desc: 'Send 50,000 aura to others',             progress: 32500, total: 50000, unlocked: false },
  { id: 't6', name: 'Iron Pact',           desc: '100 days in the Gym Club',               progress: 64,    total: 100,   unlocked: false },
  { id: 't7', name: 'Closer',              desc: 'Close 10 verified deals',                progress: 6,     total: 10,    unlocked: false },
  { id: 't8', name: 'Level 50',            desc: 'Reach level 50',                         progress: 32,    total: 50,    unlocked: false },
  { id: 't9', name: 'The Voice',           desc: '200 hours in voice chat',                progress: 142,   total: 200,   unlocked: false },
];

const FEED_Z = (typeof FEED !== 'undefined' && FEED.length) ? FEED : [
  { who: 'Mariana Silva', to: 'Alexandre Ely', amount: 500,  note: 'For the deal in Porto', time: '2m' },
  { who: 'Rui Almeida',   to: 'Inês Pereira',  amount: 250,  note: 'Lift well, friend',     time: '14m' },
  { who: 'Diogo Marques', to: 'Pedro Sousa',   amount: 1000, note: 'Welcome to the order',  time: '1h' },
  { who: 'Tiago Costa',   to: 'Ana Ribeiro',   amount: 200,  note: '',                      time: '2h' },
  { who: 'Carolina Dias', to: 'Sofia Moreira', amount: 150,  note: 'Your first one!',       time: '3h' },
  { who: 'João Teixeira', to: 'Alexandre Ely', amount: 400,  note: 'Iron pact honored',     time: '4h' },
  { who: 'Inês Pereira',  to: 'Mariana Silva', amount: 300,  note: '',                      time: '5h' },
];

const NOTIF_Z = (typeof NOTIFICATIONS !== 'undefined' && NOTIFICATIONS.length) ? NOTIFICATIONS : [
  { id: 'n1', title: 'Mariana Silva sent you 500 aura',             time: '2 minutes',  unread: true },
  { id: 'n2', title: 'You moved into the top 10',                   time: '1 hour',     unread: true },
  { id: 'n3', title: 'New reward in the store: Cursor Pro',         time: '3 hours',    unread: true },
  { id: 'n4', title: '14-day streak unbroken',                      time: '8 hours',    unread: false },
  { id: 'n5', title: 'Trophy unlocked: Inner Circle',               time: '1 day',      unread: false },
  { id: 'n6', title: 'João Teixeira sent you 400 aura',             time: '1 day',      unread: false },
  { id: 'n7', title: 'Leaderboard updated — you are now #6',        time: '2 days',     unread: false },
];

const fmtZ = (n) => {
  // Roman-ish: keep arabic numerals but old-style
  return Number(n).toLocaleString('en-US');
};

// Zodiac sign for a member (deterministic, fun)
const ZODIACS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const ZODIAC_GLYPHS = { Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋', Leo:'♌', Virgo:'♍', Libra:'♎', Scorpio:'♏', Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓' };
const signOf = (name) => {
  const seed = [...(name||'')].reduce((a,c) => a + c.charCodeAt(0), 0);
  return ZODIACS[seed % 12];
};

Object.assign(window, {
  Z, ZTY, goldFill, ZODIACS, ZODIAC_GLYPHS, signOf,
  getMySign, setMySign, useMySign,
  MEMBERS_Z, ME_Z, REWARDS_Z, TROPHIES_Z, FEED_Z, NOTIF_Z, fmtZ,
});
