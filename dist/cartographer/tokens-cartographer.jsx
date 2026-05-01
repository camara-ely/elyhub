// ElyHub — Cartographer (vintage) theme tokens.
//
// Aesthetic: aged parchment + sepia ink + wax seal red + gold leaf.
// Mirrors the dist/zodiac/tokens-zodiac.jsx pattern: a global `M` palette
// (M for Mapa/Map), `MTY` typography, and a few flavor helpers exposed
// via Object.assign(window, ...). Inert until T.cartographer is true.

const M = {
  // Parchment — primary surfaces
  paper:     '#E8DCC0',     // primary parchment
  paper2:    '#DECFAE',     // aged parchment
  paper3:    '#C9B791',     // tea-stained
  surface:   '#EFE3C8',     // raised card
  surface2:  '#DECFAE',     // sunken inset
  paperFog:  'rgba(232,220,192,0.55)',

  // Ink — sepia text + lines
  ink:       '#3B2616',     // primary ink
  ink2:      '#5C4128',     // softer ink
  ink3:      '#876344',     // washed ink
  ink4:      '#A89072',     // ghost ink

  // Wax — sealing wax accents
  wax:       '#8B2418',     // sealing wax red
  waxHi:     '#B33524',     // wax highlight
  waxLo:     '#6A1810',     // wax shadow
  waxGlow:   'rgba(139,36,24,0.42)',

  // Gold — leaf accent (frames, hubs, dividers)
  gold:      '#C8A24E',     // gold leaf
  goldHi:    '#E2C16C',
  goldLo:    '#8E6E2F',
  goldGlow:  'rgba(200,162,78,0.40)',

  // Text shortcuts (text on paper)
  text:      '#3B2616',
  text2:     '#5C4128',
  text3:     '#876344',
  text4:     '#A89072',

  // Borders — sepia hairlines
  hair:      'rgba(59,38,22,0.18)',
  hair2:     'rgba(59,38,22,0.32)',
  hair3:     'rgba(59,38,22,0.55)',

  // Fonts — Cormorant body, Cinzel display, IM Fell handwritten
  fontDisp:  '"Cinzel","Cormorant Garamond",Georgia,serif',
  fontBody:  '"Cormorant Garamond","EB Garamond",Georgia,serif',
  fontHand:  '"IM Fell English","Cormorant Garamond",Georgia,serif',
  fontCaps:  '"Cinzel","Cormorant SC",Georgia,serif',

  r: { sm: 0, md: 2, lg: 3, xl: 4, pill: 9999 },
};

// Typography scale — tuned for parchment readability (slightly larger
// body sizes, italic only for flavor/captions, never for paragraph text).
const MTY = {
  display: { fontFamily: M.fontDisp, fontSize: 60, lineHeight: 1.05, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
  h1:      { fontFamily: M.fontDisp, fontSize: 38, lineHeight: 1.1,  fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
  h2:      { fontFamily: M.fontDisp, fontSize: 24, lineHeight: 1.2,  fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' },
  h3:      { fontFamily: M.fontDisp, fontSize: 18, lineHeight: 1.3,  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' },
  body:    { fontFamily: M.fontBody, fontSize: 16, lineHeight: 1.55, fontWeight: 400 },
  small:   { fontFamily: M.fontBody, fontSize: 14, lineHeight: 1.5,  fontWeight: 400 },
  hand:    { fontFamily: M.fontHand, fontSize: 14, lineHeight: 1.5,  fontWeight: 400, fontStyle: 'italic' },
  caps:    { fontFamily: M.fontCaps, fontSize: 11, lineHeight: 1.3,  fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase' },
  capsSm:  { fontFamily: M.fontCaps, fontSize: 9,  lineHeight: 1.3,  fontWeight: 600, letterSpacing: '0.30em', textTransform: 'uppercase' },
  num:     { fontFamily: M.fontDisp, fontWeight: 500, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' },
};

// PT-BR formatter for aura ("424.396" with dots, like the mockup).
const fmtM = (n) => Number(n || 0).toLocaleString('pt-BR');

// Deterministic bearing (rumo 0–359°) per member name. Used as flavor
// metadata next to ranks ("Rumo 273°"). Same name → same bearing every time.
const bearingOf = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return seed % 360;
};

// Deterministic latitude/longitude pair, also from name. Just for flavor —
// "47.21°N · 8.54°E" style coordinates next to top-1 entries.
const coordsOf = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0) * 7, 0);
  const lat = ((seed % 7000) / 100) + 12;          // 12.00–82.00°N
  const lon = (((seed * 13) % 9000) / 100) - 30;   // -30.00 to 60.00°E
  return {
    lat: lat.toFixed(2),
    lon: Math.abs(lon).toFixed(2),
    latDir: 'N',
    lonDir: lon >= 0 ? 'E' : 'O',
  };
};

// Deterministic "elevation" (mock altitude in meters) for period rankings.
// Maps to "↑ 47m hoje" badges — the Modern mockup's elevation idea ported
// to vintage flavor.
const elevationOf = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 11) % 90) + 10;  // 10–99m
};

// Roman numeral converter for ranks (1 → I, 2 → II, …). Falls back to
// arabic above XII because deeper podium positions look better as plain
// numbers (XXIV is hard to scan at a glance).
const romanOf = (n) => {
  const map = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const i = Math.max(0, Math.floor(n));
  return map[i] || String(n);
};

// Initial letter for the wax seal avatar fallback. Uses first non-space
// glyph of the display name, uppercased.
const initialOf = (name) => {
  const s = String(name || '').trim();
  if (!s) return '?';
  const first = s[0];
  return first.toUpperCase();
};

Object.assign(window, {
  M, MTY, fmtM,
  bearingOf, coordsOf, elevationOf, romanOf, initialOf,
});
