// ElyHub — Cartographer Modern theme tokens.
//
// Aesthetic: aerial topographic dashboard. Dark slate + fairway green +
// cyan water. Inter UI, JetBrains Mono for numbers/coordinates. No
// parchment, no wax — this is "GPS de campo, dados ao vivo".
//
// Inert until T.cartographerModern is true. Mirrors the dist/cartographer
// pattern: a global Mm palette, MmTY typography, and helpers exposed via
// Object.assign(window, ...).

const Mm = {
  // Slate base
  bg:        '#0E1614',
  bg2:       '#131F1C',
  bg3:       '#1A2A24',
  surface:   'rgba(15,30,25,0.55)',
  surface2:  'rgba(20,38,32,0.85)',

  // Fairway accent
  accent:    '#9BD66B',
  accentHi:  '#B7E68B',
  accentLo:  '#6BA147',
  accentGlow:'rgba(155,214,107,0.42)',

  // Water cyan
  cyan:      '#5DD3C4',
  cyanHi:    '#8BE3D6',

  // Status
  warn:      '#E8B14C',
  danger:    '#E07A5F',

  // Text
  text:      '#ECF2EE',
  text2:     '#9CB0A6',
  text3:     '#5C7068',
  text4:     '#3B4A44',

  // Topographic contour lines
  contour:   '#3B5A40',
  contourHi: 'rgba(155,214,107,0.18)',

  // Borders / hairlines
  hair:      'rgba(155,214,107,0.10)',
  hair2:     'rgba(155,214,107,0.20)',
  hair3:     'rgba(155,214,107,0.38)',
  grid:      'rgba(155,214,107,0.04)',

  // Fonts
  fontUI:    '"Inter","SF Pro Text",system-ui,sans-serif',
  fontMono:  '"JetBrains Mono","SF Mono",ui-monospace,monospace',
  fontDisp:  '"Inter","SF Pro Display",system-ui,sans-serif',

  r: { sm: 4, md: 6, lg: 8, xl: 10, pill: 9999 },
};

const MmTY = {
  display: { fontFamily: Mm.fontDisp, fontSize: 56, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-0.025em' },
  h1:      { fontFamily: Mm.fontDisp, fontSize: 36, lineHeight: 1.1,  fontWeight: 600, letterSpacing: '-0.02em' },
  h2:      { fontFamily: Mm.fontDisp, fontSize: 22, lineHeight: 1.2,  fontWeight: 600, letterSpacing: '-0.015em' },
  h3:      { fontFamily: Mm.fontDisp, fontSize: 16, lineHeight: 1.3,  fontWeight: 600, letterSpacing: '-0.01em' },
  body:    { fontFamily: Mm.fontUI,   fontSize: 14, lineHeight: 1.5,  fontWeight: 400 },
  small:   { fontFamily: Mm.fontUI,   fontSize: 12, lineHeight: 1.4,  fontWeight: 400 },
  caps:    { fontFamily: Mm.fontMono, fontSize: 11, lineHeight: 1.3,  fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' },
  capsSm:  { fontFamily: Mm.fontMono, fontSize: 10, lineHeight: 1.3,  fontWeight: 500, letterSpacing: '0.20em', textTransform: 'uppercase' },
  num:     { fontFamily: Mm.fontMono, fontWeight: 500, letterSpacing: '-0.02em' },
  numTab:  { fontFamily: Mm.fontMono, fontWeight: 500, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' },
  coord:   { fontFamily: Mm.fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase' },
};

// Format: 424 396 (en-US grouping with non-breaking space) — mockup showed
// space-grouped numerics for the "GPS reading" feel.
const fmtMm = (n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');

// Coordinate string like "47.21°N · 8.54°E" — deterministic per name. Reused
// from vintage so the same person has the same coords across both variants.
const coordsModern = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0) * 7, 0);
  const lat = ((seed % 7000) / 100) + 12;
  const lon = (((seed * 13) % 9000) / 100) - 30;
  return {
    lat: lat.toFixed(2),
    lon: Math.abs(lon).toFixed(2),
    latDir: 'N',
    lonDir: lon >= 0 ? 'E' : 'W',
  };
};

const elevationModern = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 11) % 90) + 10;
};

const bearingModern = (name) => {
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return seed % 360;
};

Object.assign(window, {
  Mm, MmTY, fmtMm,
  coordsModern, elevationModern, bearingModern,
});
