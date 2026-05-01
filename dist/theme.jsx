// theme.jsx — theme palettes, color math, and atmospheric background layers.
//
// Extracted from app.jsx in the modularization pass. This holds:
//   • THEMES table           — named palette presets
//   • loadThemeState / save  — localStorage persistence of user tweaks
//   • parseHex / rgbToHex    — color math primitives
//   • sampleBgColor          — pulls a dominant color from a bg image
//   • deriveOnBgTokens       — derives readable foreground tokens given bg
//   • resolveTheme           — collapses user tweaks + preset into final tokens
//   • applyResolvedTheme     — pokes tokens.jsx globals so rest of app sees them
//   • HoverOrbs / AmbientBG  — ambient render layers used by the shell
//   • CardSpotlight          — re-usable glow layer for cards
//
// Everything here runs at top level or as a React component; consumers call
// them by name from app.jsx / state.jsx etc. thanks to the global-script loader.

// ────────────── Theme palettes ──────────────
// Each theme is a complete atmosphere: accent + highlight + 3 orbs + bg gradient
const THEMES = {
  blue: {
    name: 'Nocturne',
    accent: '#3D7BFF', accentHi: '#6FA0FF',
    bg: 'linear-gradient(180deg, #030813 0%, #05091A 50%, #030712 100%)',
    orb1: '#3D7BFF', orb2: '#0EA5E9', orb3: '#1E3A8A',
  },
  ember: {
    name: 'Ember',
    accent: '#E25C3A', accentHi: '#FF8A64',
    bg: 'linear-gradient(180deg, #120703 0%, #1A0905 50%, #0A0402 100%)',
    orb1: '#E25C3A', orb2: '#C9361A', orb3: '#6B1D0C',
  },
  cyber: {
    name: 'Cyber',
    accent: '#06B6D4', accentHi: '#22D3EE',
    bg: 'linear-gradient(180deg, #030E12 0%, #051418 50%, #020A0D 100%)',
    orb1: '#06B6D4', orb2: '#0891B2', orb3: '#164E63',
  },
  violet: {
    name: 'Violet',
    accent: '#8B5CF6', accentHi: '#A78BFA',
    bg: 'linear-gradient(180deg, #0B0414 0%, #130A1F 50%, #0A0311 100%)',
    orb1: '#8B5CF6', orb2: '#EC4899', orb3: '#5B21B6',
  },
  forest: {
    name: 'Forest',
    accent: '#10B981', accentHi: '#34D399',
    bg: 'linear-gradient(180deg, #020A07 0%, #051410 50%, #020805 100%)',
    orb1: '#10B981', orb2: '#0EA5E9', orb3: '#064E3B',
  },
  mono: {
    name: 'Mono',
    accent: '#E5E5E5', accentHi: '#FFFFFF',
    bg: 'linear-gradient(180deg, #050505 0%, #0A0A0A 50%, #030303 100%)',
    orb1: '#FFFFFF', orb2: '#A3A3A3', orb3: '#404040',
  },
};

// ────────────── Theme engine ──────────────
// Full customization system. A "resolved theme" is a config object the
// AmbientBG consumes directly:
//   { accent, accentHi, base, bgImage, points[] }
// where each point is { id, x%, y%, size vw, color, alpha, blur, factor, blend }.
// Built-in presets live in THEME_PRESETS. Users can also pick 'custom' and
// edit their own copy — multiple named custom slots, all persisted to
// localStorage. Auto-contrast reads perceived luminance of the composed bg
// and flips text tokens to dark when the background goes bright.

// Curated presets — user asked for 3. Each has explicit light-point config
// so the editor can diff against them and users can "reset to preset" cleanly.
// Wallpaper presets — same shape as color presets but with a bgImage set and
// points:[] (the image takes over the background, so light-point orbs are
// unused). Accent is picked from the image so cards + CTA glow match the
// wallpaper's palette. Users pick them from the same preset row as colors.
const WALLPAPER_PRESETS = {
  ribbon: {
    name: 'Ribbon',
    accent: '#7FA8E0', accentHi: '#FFB49A',
    base: 'radial-gradient(ellipse at 30% 0%, #1A2742 0%, #0A1222 60%, #050811 100%)',
    bgImage: 'assets/wp-ribbon.jpg',
    bgOpacity: 0.88, bgBlur: 0,
    points: [],
  },
  dunes: {
    name: 'Dunes',
    accent: '#E8A15E', accentHi: '#F5C88D',
    base: 'radial-gradient(ellipse at 30% 0%, #2C1E12 0%, #140D08 60%, #070503 100%)',
    bgImage: 'assets/wp-dunes.jpg',
    bgOpacity: 0.88, bgBlur: 0,
    points: [],
  },
  fluffy: {
    name: 'Fluffy',
    accent: '#E89DCC', accentHi: '#F4C5E0',
    base: 'radial-gradient(ellipse at 30% 0%, #2A1E38 0%, #140B1E 60%, #07040E 100%)',
    bgImage: 'assets/wp-fluffy.jpg',
    bgOpacity: 0.88, bgBlur: 0,
    points: [],
  },
  torus: {
    name: 'Torus',
    accent: '#E97A5A', accentHi: '#FFB18A',
    base: 'radial-gradient(ellipse at 30% 0%, #3A1E14 0%, #1C0D08 60%, #0A0403 100%)',
    bgImage: 'assets/wp-torus.jpg',
    bgOpacity: 0.88, bgBlur: 0,
    points: [],
  },
};

const THEME_PRESETS = {
  nocturne: {
    name: 'Nocturne',
    accent: '#0159E7', accentHi: '#6FACFF',
    base: 'radial-gradient(ellipse at 30% 0%, #0A1B4E 0%, #03082A 38%, #010414 72%, #00020A 100%)',
    points: [
      { id: 'p1', x: -18, y: -28, size: 72, color: '#0159E7', alpha: 0.86, blur: 90, factor: 0.18, blend: 'normal' },
      { id: 'p2', x: 60,  y: 70,  size: 82, color: '#2E7BFF', alpha: 0.80, blur: 120, factor: 0.32, blend: 'screen' },
      { id: 'p3', x: 25,  y: 30,  size: 55, color: '#0159E7', alpha: 0.60, blur: 120, factor: 0.12, blend: 'normal' },
      { id: 'p4', x: 70,  y: 6,   size: 26, color: '#2FD3F5', alpha: 0.73, blur: 70,  factor: 0.40, blend: 'screen' },
      { id: 'p5', x: 12,  y: 22,  size: 14, color: '#6FACFF', alpha: 0.80, blur: 60,  factor: 0.50, blend: 'screen' },
      { id: 'p6', x: 48,  y: 12,  size: 6,  color: '#CFE4FF', alpha: 0.73, blur: 30,  factor: 0.60, blend: 'screen' },
    ],
  },
  ember: {
    name: 'Ember',
    accent: '#E25C3A', accentHi: '#FF8A64',
    base: 'radial-gradient(ellipse at 30% 0%, #3A1208 0%, #1A0905 38%, #0A0402 72%, #030100 100%)',
    points: [
      { id: 'p1', x: -18, y: -28, size: 72, color: '#E25C3A', alpha: 0.86, blur: 90, factor: 0.18, blend: 'normal' },
      { id: 'p2', x: 60,  y: 70,  size: 82, color: '#FF8A64', alpha: 0.80, blur: 120, factor: 0.32, blend: 'screen' },
      { id: 'p3', x: 25,  y: 30,  size: 55, color: '#C9361A', alpha: 0.60, blur: 120, factor: 0.12, blend: 'normal' },
      { id: 'p4', x: 70,  y: 6,   size: 26, color: '#FFB366', alpha: 0.73, blur: 70,  factor: 0.40, blend: 'screen' },
      { id: 'p5', x: 12,  y: 22,  size: 14, color: '#FFDFAF', alpha: 0.80, blur: 60,  factor: 0.50, blend: 'screen' },
      { id: 'p6', x: 48,  y: 12,  size: 6,  color: '#FFEFD8', alpha: 0.73, blur: 30,  factor: 0.60, blend: 'screen' },
    ],
  },
  violet: {
    name: 'Violet',
    accent: '#8B5CF6', accentHi: '#C89DFF',
    base: 'radial-gradient(ellipse at 30% 0%, #2B1058 0%, #150832 38%, #0A0418 72%, #03010A 100%)',
    points: [
      { id: 'p1', x: -18, y: -28, size: 72, color: '#8B5CF6', alpha: 0.86, blur: 90, factor: 0.18, blend: 'normal' },
      { id: 'p2', x: 60,  y: 70,  size: 82, color: '#C89DFF', alpha: 0.80, blur: 120, factor: 0.32, blend: 'screen' },
      { id: 'p3', x: 25,  y: 30,  size: 55, color: '#5B21B6', alpha: 0.60, blur: 120, factor: 0.12, blend: 'normal' },
      { id: 'p4', x: 70,  y: 6,   size: 26, color: '#EC4899', alpha: 0.73, blur: 70,  factor: 0.40, blend: 'screen' },
      { id: 'p5', x: 12,  y: 22,  size: 14, color: '#DDBEFF', alpha: 0.80, blur: 60,  factor: 0.50, blend: 'screen' },
      { id: 'p6', x: 48,  y: 12,  size: 6,  color: '#F5E6FF', alpha: 0.73, blur: 30,  factor: 0.60, blend: 'screen' },
    ],
  },
  // ────── Zodiac — celestial almanac ──────
  // Premium theme unlocked by buying Hugin (Kassa product_id = 'gleipnir').
  // The visual is a complete reskin (sidebar/topbar/home variants) handled
  // in dist/zodiac/views.jsx — not a glass colour swap. The base/points
  // below are still required so AmbientBG has something benign to paint
  // underneath (the zodiac variants overlay their own CosmicBG on top).
  zodiac: {
    name: 'Zodiac',
    accent: '#C9A24E', accentHi: '#F2D896',
    base: 'radial-gradient(ellipse at 30% 0%, #1B1812 0%, #13110D 38%, #0A0908 72%, #050403 100%)',
    // No ambient orbs — Zodiac BG is pure ink. The AmbientBG light-point
    // layer is skipped when points is empty, keeping the parchment feel clean.
    points: [],
    unlock: { kassa: 'gleipnir' },
  },
  // ────── Cartographer — vintage map / diário de bordo ──────
  // Premium theme: aged parchment + sepia ink + wax-red seals + gold leaf.
  // Unlock channel mirrors Zodiac (Kassa product). Visual takeover via
  // dist/cartographer/views.jsx — the host hero/leaderboard delegate to
  // CartographerHomeView when T.cartographer is true. The base/points
  // here only matter for the brief moment before the AmbientBG is hidden;
  // we use a warm parchment tone so the swap doesn't flash blue.
  cartographer: {
    name: 'Cartographer',
    accent: '#8B2418', accentHi: '#B33524',
    base: 'radial-gradient(ellipse at 50% 50%, #EFE3C8 0%, #DECFAE 60%, #C9B791 100%)',
    bgImage: 'cartographer/wallpaper.png',
    bgOpacity: 0.92,
    bgOverlay: 'linear-gradient(180deg, rgba(232,220,192,0.10), rgba(220,207,174,0.18))',
    points: [],
  },
  // ────── Cartographer Modern — topographic dashboard ──────
  // Same "map" DNA as Cartographer but inverted: dark slate, fairway green,
  // cyan water, GPS/dashboard aesthetic. Visual takeover via dist/
  // cartographer-modern/views.jsx. No wallpaper — the topographic isolines
  // BG is rendered by TopoBG mounted in Shell.
  cartographerModern: {
    name: 'Cartographer Modern',
    accent: '#9BD66B', accentHi: '#B7E68B',
    base: 'radial-gradient(ellipse at 30% 20%, #1A2A24 0%, #0E1614 60%, #0E1614 100%)',
    points: [],
  },
};

// localStorage keys. One for the active theme selection + one for the saved
// custom slots (user can have many named customs, only one is active).
const THEME_STORAGE_KEY = 'ely:theme:v1';

function loadThemeState() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch { return null; }
}

function saveThemeState(state) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Parse a hex (#rrggbb) into {r, g, b} 0–255. Returns null on garbage.
function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([\da-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function rgbToHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Apply an alpha to a hex color. Used by card spotlights so they track
// T.accent instead of being hardcoded blue. Falls back to the original
// string if parsing fails (e.g. if a caller passes an `rgb(...)`).
function withA(hex, alpha) {
  const c = parseHex(hex);
  if (!c) return hex;
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}
// Darker variant for the deep core of card spotlights — 30% toward black so
// it still reads as the accent family but contributes shadow depth.
function withAShade(hex, alpha, shade = 0.35) {
  const c = parseHex(hex);
  if (!c) return hex;
  const r = Math.round(c.r * (1 - shade));
  const g = Math.round(c.g * (1 - shade));
  const b = Math.round(c.b * (1 - shade));
  return `rgba(${r},${g},${b},${alpha})`;
}

// RGB ↔ HSL. We derive text colors by preserving the bg hue and flipping
// lightness to the opposite pole — that's what makes tinted white/black
// feel "part of" the wallpaper palette instead of a foreign chip.
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}
// (hslToRgb is defined further down — (h, s, l) positional args.)

// Canvas-based image sampler. Returns average {r,g,b} of the wallpaper image,
// cached by URL. First call schedules the load and returns null; when the
// image decodes we store the result and fire 'ely:bg-sampled' so the theme
// can re-apply with the real color.
const _bgSampleCache = new Map();
const _bgSamplePending = new Set();
function sampleBgColor(url) {
  try {
    if (!url) return null;
    if (_bgSampleCache.has(url)) return _bgSampleCache.get(url);
    if (_bgSamplePending.has(url)) return null;
    if (typeof Image === 'undefined' || typeof document === 'undefined') return null;
    _bgSamplePending.add(url);
    const img = new Image();
    img.onload = () => {
      try {
        const w = 32, h = 32;
        const cnv = document.createElement('canvas');
        cnv.width = w; cnv.height = h;
        const ctx = cnv.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 16) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        const avg = n ? { r: r / n, g: g / n, b: b / n } : null;
        if (avg) {
          _bgSampleCache.set(url, avg);
          window.dispatchEvent(new CustomEvent('ely:bg-sampled', { detail: { url, avg } }));
        } else {
          // Tainted canvas — cache a null so we don't retry every apply.
          _bgSampleCache.set(url, null);
        }
      } catch (e) {
        _bgSampleCache.set(url, null);
      } finally {
        _bgSamplePending.delete(url);
      }
    };
    img.onerror = () => {
      _bgSampleCache.set(url, null);
      _bgSamplePending.delete(url);
    };
    img.src = url;
    return null;
  } catch (e) {
    return null;
  }
}

// Derive a tinted-foreground color palette from a bg RGB. Preserves the hue
// of the bg, pushes lightness to the opposite pole, keeps saturation modest
// so it reads as "off-white" or "off-black" rather than a neon chip.
function deriveOnBgTokens(rgb) {
  const { h, s } = rgbToHsl(rgb);
  const lum = relLum(rgb);
  // Threshold is high on purpose (0.72): only genuinely bright wallpapers
  // (cream/pastel-white/snow) get dark text. Everything else — including
  // medium pastels, sunset skies, mountain scenes — keeps light tinted text,
  // because a soft hue-tinted white reads cleanly over mixed-lum imagery
  // while dark text on anything short of white looks muddy.
  const dark = lum < 0.72;
  // Saturation: weaker for light text (keep it clearly "white-ish"), stronger
  // for dark text (a tinted charcoal feels more intentional than pure black).
  const foreS = dark
    ? Math.min(0.22, Math.max(0.06, s * 0.30))
    : Math.min(0.45, Math.max(0.15, s * 0.60));
  // Light text sits at L=0.94 (tinted white). Dark text at L=0.14 (tinted ink).
  const foreL = dark ? 0.94 : 0.14;
  const base = hslToRgb(((h % 360) + 360) % 360, foreS, foreL);
  const toStr = (alpha) => `rgba(${base.r},${base.g},${base.b},${alpha})`;
  return {
    text:  toStr(0.96),
    text2: toStr(0.70),
    text3: toStr(0.48),
    dark,
  };
}

// Relative luminance per WCAG — used for auto-contrast decisions.
function relLum({ r, g, b }) {
  const n = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * n(r) + 0.7152 * n(g) + 0.0722 * n(b);
}

// Extract a representative color from a `base` value. For plain hex it's
// trivial; for CSS gradients we grab the first hex we can find (close enough
// for contrast purposes since dark-vignette bases are dominated by that stop).
function baseToRgb(base) {
  if (!base) return { r: 5, g: 6, b: 10 };
  const direct = parseHex(base);
  if (direct) return direct;
  const m = base.match(/#[\da-f]{6}/i);
  return m ? parseHex(m[0]) : { r: 5, g: 6, b: 10 };
}

// Compose an estimated average bg luminance: base color + each light point
// weighted by (area × alpha). Reasonable approximation of what the eye sees.
function composedLuminance(resolved) {
  const baseRgb = baseToRgb(resolved.base);
  let rSum = baseRgb.r, gSum = baseRgb.g, bSum = baseRgb.b, wSum = 1;
  for (const p of resolved.points || []) {
    const c = parseHex(p.color);
    if (!c) continue;
    const w = (p.size || 1) * (p.alpha || 0) * 0.004;
    rSum += c.r * w;
    gSum += c.g * w;
    bSum += c.b * w;
    wSum += w;
  }
  return relLum({ r: rSum / wSum, g: gSum / wSum, b: bSum / wSum });
}

// Resolve the tweaks object to a concrete theme config the UI can consume.
// Handles both presets and 'custom'; falls back to nocturne if anything's off.
function resolveTheme(tweaks) {
  const key = tweaks?.theme || 'nocturne';
  if (key === 'custom' && tweaks?.custom) {
    const c = tweaks.custom;
    return {
      key: 'custom',
      accent: c.accent || '#0159E7',
      accentHi: c.accentHi || c.accent || '#6FACFF',
      base: c.base || THEME_PRESETS.nocturne.base,
      bgImage: c.bgImage || null,
      bgOpacity: typeof c.bgOpacity === 'number' ? c.bgOpacity : 0.75,
      bgBlur: typeof c.bgBlur === 'number' ? c.bgBlur : 0,
      points: Array.isArray(c.points) ? c.points : [],
      autoContrast: c.autoContrast !== false,
    };
  }
  const wp = WALLPAPER_PRESETS[key];
  if (wp) {
    // Preset overrides — users can tweak opacity/blur on a wallpaper preset
    // without forking it into a custom slot. Stored in tweaks.presetOverrides.
    const ov = tweaks?.presetOverrides?.[key] || {};
    return {
      key,
      ...wp,
      bgOpacity: typeof ov.bgOpacity === 'number' ? ov.bgOpacity : wp.bgOpacity,
      bgBlur: typeof ov.bgBlur === 'number' ? ov.bgBlur : wp.bgBlur,
      autoContrast: true,
    };
  }
  const p = THEME_PRESETS[key] || THEME_PRESETS.nocturne;
  // Defaults FIRST, preset spread last — otherwise a preset's bgImage gets
  // wiped to null. Cartographer is the first non-wallpaper preset to set
  // bgImage; before that the bug was invisible.
  return { key, bgImage: null, bgOpacity: 0.75, bgBlur: 0, autoContrast: true, ...p };
}

// Write the resolved theme into the global T token object + re-flow
// auto-contrast. Called from useTweaks whenever theme changes.
function applyResolvedTheme(r) {
  T.theme = r.key;
  T.accent = r.accent;
  T.accentHi = r.accentHi;
  T.accentGlow = r.accent + '80';
  // Auto-contrast strategy: text stays white always (cards are dark glass
  // panels, never raw bg). Instead we dynamically darken the glass base
  // layer so bright backgrounds can't blow through and wash out text. This
  // preserves the liquid-glass look AND guarantees legibility regardless of
  // how loud the wallpaper is.
  if (r.autoContrast !== false) {
    const lum = composedLuminance(r);
    const a1 = Math.min(0.92, 0.62 + lum * 0.60);
    const a2 = Math.min(0.96, 0.72 + lum * 0.55);
    T.glassBg  = `linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), rgba(8,10,18,${a1.toFixed(3)})`;
    T.glassBg2 = `linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05)), rgba(8,10,18,${a2.toFixed(3)})`;
  } else {
    T.glassBg  = 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), rgba(8,10,18,0.62)';
    T.glassBg2 = 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05)), rgba(8,10,18,0.72)';
  }
  // Card text stays white always (cards are dark glass).
  T.text  = 'rgba(255,255,255,0.96)';
  T.text2 = 'rgba(255,255,255,0.68)';
  T.text3 = 'rgba(255,255,255,0.45)';
  T.text4 = 'rgba(255,255,255,0.22)';
  T.glassBorder  = 'rgba(255,255,255,0.12)';
  T.glassBorder2 = 'rgba(255,255,255,0.22)';
  T.glassHi = 'rgba(255,255,255,0.16)';
  // Auto text-on-bg color. Pipeline:
  //  1. If theme has a bgImage, sample its average color via canvas.
  //     First call returns null + kicks off async load; 'ely:bg-sampled'
  //     fires when ready and we re-apply below.
  //  2. If no image (plain gradient theme), use the base color's dominant hex.
  //  3. Feed that RGB into deriveOnBgTokens which preserves the hue, flips
  //     lightness to the opposite pole, and returns text/text2/text3.
  //
  // Result: Fluffy's pink wallpaper → pinkish-white text; Ember's orange base
  // → cream text; a bright custom bg → tinted charcoal text. Automatic, no
  // per-theme config needed.
  let bgRgb = null;
  if (r.bgImage) bgRgb = sampleBgColor(r.bgImage);
  if (!bgRgb) bgRgb = baseToRgb(r.base);
  const tokens = deriveOnBgTokens(bgRgb);
  T.isLight = !tokens.dark;
  T.textOnBg  = tokens.text;
  T.textOnBg2 = tokens.text2;
  T.textOnBg3 = tokens.text3;
  // Soft halo that works in both directions: dark halo for light text,
  // subtle light halo for dark text. Stops bright image regions from
  // eating contrast even further.
  T.textOnBgShadow = tokens.dark
    ? '0 1px 2px rgba(0,0,0,0.40), 0 0 10px rgba(0,0,0,0.20)'
    : '0 1px 2px rgba(255,255,255,0.55), 0 0 10px rgba(255,255,255,0.30)';

  // ────── Zodiac flag ──────
  // Single boolean read by the Sidebar/Topbar/HomeView gates in shell.jsx +
  // home.jsx — when true, those components delegate to the Zodiac variants
  // in dist/zodiac/views.jsx. The token mutations stay scoped here so non-
  // zodiac themes keep their full liquid-glass palette untouched.
  // Detect theme change involving zodiac so the transition overlay can fire.
  // We compare against the previous T.theme value (set above) — if either
  // direction crosses the zodiac boundary, dispatch an event that the
  // ThemeTransition component subscribes to. Skips first apply so the
  // overlay never shows on initial page load.
  const prevKey = T.__prevAppliedKey;
  const skip = !!T.__skipNextTransition;
  if (skip) T.__skipNextTransition = false;
  // Crossing the zodiac boundary triggers the ceremony AND delays the actual
  // token mutation by ~650ms so the overlay reaches full opacity BEFORE the
  // theme visibly flips. Without this delay the user sees the new theme for
  // a flash before the curtain falls.
  const PREMIUM_KEYS = ['zodiac', 'cartographer', 'cartographerModern'];
  const crossing = !skip
    && typeof prevKey === 'string' && prevKey !== r.key
    && (PREMIUM_KEYS.includes(r.key) || PREMIUM_KEYS.includes(prevKey));
  if (crossing && !T.__inDeferredApply) {
    // 'in' = entering a premium theme. 'out' = leaving one. The detail
    // includes the actual to/from keys so each premium variant's curtain
    // component can decide whether the event is for it.
    //
    // CRITICAL: when a transition involves TWO premium themes (e.g. zodiac
    // → cartographer), both curtains would normally fire and overlay each
    // other. We pick a single `winner` here — the destination's curtain
    // wins when going INTO a premium theme, otherwise the source's
    // curtain wins (it's the one being "left"). Each curtain component
    // checks `e.detail.winner === MY_KEY` and bails if not the winner.
    const enteringPremium = PREMIUM_KEYS.includes(r.key);
    const winner = enteringPremium ? r.key : prevKey;
    try {
      window.dispatchEvent(new CustomEvent('ely:theme-transition', {
        detail: {
          from: prevKey, to: r.key,
          direction: enteringPremium ? 'in' : 'out',
          winner,
        },
      }));
    } catch {}
    T.__inDeferredApply = true;
    // Going INTO zodiac: wait long enough for the curtain to fully cover
    // (fade-in is 700ms ease, plus the radial bloom needs another ~150ms
    // to look like it's finished growing) before mutating tokens. Going
    // OUT to a normal theme: shorter delay is fine — the parchment overlay
    // covers the screen quickly and the user expects the new theme to
    // appear "behind" it. The flash issue only happens on 'in'.
    // Curtain fades in over ~700ms (60ms stagger + 700ms opacity transition).
    // Mutate tokens at 800ms — exactly when the curtain hits opacity 1, so
    // the swap is invisible. Curtain holds for ~700ms more then fades out.
    const delay = 800;
    setTimeout(() => {
      T.__inDeferredApply = false;
      T.__skipNextTransition = true; // suppress duplicate event
      applyResolvedTheme(r);
      try { window.dispatchEvent(new CustomEvent('ely:theme-deferred-applied', { detail: { key: r.key } })); } catch {}
    }, delay);
    return;
  }
  T.__prevAppliedKey = r.key;

  T.zodiac = r.key === 'zodiac';
  // Snapshot the original radius scale ONCE so we can flip every rounded
  // surface to 2px under zodiac and restore on switch back.
  if (!T.__sansR && T.r) T.__sansR = { ...T.r };
  if (T.zodiac && typeof window !== 'undefined' && window.Z) {
    // Squared-off radius scale — every host component using T.r.* gets
    // ink+gold angular geometry without per-component edits.
    if (T.r) Object.assign(T.r, { sm: 2, md: 2, lg: 3, xl: 4, xxl: 4, pill: 2 });
  } else if (T.__sansR && T.r) {
    Object.assign(T.r, T.__sansR);
  }
  if (T.zodiac && typeof window !== 'undefined' && window.Z) {
    // Mirror just enough of Z onto T so any vanilla Glass card that *does*
    // render under zodiac (e.g. an unported view) reads ink+gold instead of
    // glass+blue. The zodiac variants paint their own surfaces directly
    // from window.Z so they don't depend on these.
    const Zg = window.Z;
    T.accent       = Zg.gold;
    T.accentHi     = Zg.goldHi;
    T.accentGlow   = Zg.goldGlow;
    T.glassBg      = `linear-gradient(180deg, ${Zg.ink2}, ${Zg.ink})`;
    T.glassBg2     = `linear-gradient(180deg, ${Zg.ink3}, ${Zg.ink2})`;
    T.glassBorder  = Zg.hair2;
    T.glassBorder2 = Zg.hair3;
    T.glassHi      = Zg.hair;
    T.text         = 'rgba(232,220,192,0.96)';
    T.text2        = 'rgba(232,220,192,0.78)';
    T.text3        = 'rgba(232,220,192,0.58)';
    T.text4        = 'rgba(232,220,192,0.36)';
    T.textOnBg     = T.text;
    T.textOnBg2    = T.text2;
    T.textOnBg3    = T.text3;
    T.textOnBgShadow = `0 1px 2px rgba(0,0,0,0.6), 0 0 12px ${Zg.goldGlow}`;
    T.isLight      = false;

    // Snapshot the original sans typography on first apply so we can restore
    // when the user switches away from Zodiac. Without this a non-zodiac
    // theme would inherit Cormorant italic forever after a single zodiac
    // visit (TY.* gets mutated by reference).
    if (!TY.__sansSnapshot) {
      TY.__sansSnapshot = {
        display: { ...TY.display }, h1: { ...TY.h1 },
        h2: { ...TY.h2 }, h3: { ...TY.h3 },
        numLarge: TY.numLarge ? { ...TY.numLarge } : null,
        numMed: TY.numMed ? { ...TY.numMed } : null,
        micro: TY.micro ? { ...TY.micro } : null,
      };
    }
    // Heading typography → Cormorant italic. Affects host panes (Settings →
    // Notifications/Appearance/Downloads etc.) that use TY.h2/h3 directly.
    const headingFont = '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif';
    Object.assign(TY.display, { fontFamily: headingFont, fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.005em' });
    Object.assign(TY.h1,      { fontFamily: headingFont, fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.005em' });
    Object.assign(TY.h2,      { fontFamily: headingFont, fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.005em' });
    Object.assign(TY.h3,      { fontFamily: headingFont, fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.01em' });
    if (TY.numLarge) Object.assign(TY.numLarge, { fontFamily: headingFont, fontStyle: 'italic' });
    if (TY.numMed)   Object.assign(TY.numMed,   { fontFamily: headingFont, fontStyle: 'italic' });
    if (TY.micro)    Object.assign(TY.micro,    {
      fontFamily: '"Cinzel","Cormorant SC","Cormorant Garamond",serif',
      letterSpacing: '0.22em',
    });
  } else if (TY.__sansSnapshot) {
    // Restore sans typography when switching away from Zodiac.
    // Object.assign only ADDS keys — keys we set under zodiac (fontStyle:
    // italic, fontWeight: 500, letterSpacing) would persist if absent from
    // the snapshot. Explicitly null them via 'normal'/undefined defaults
    // first, then overlay the snapshot.
    const reset = { fontStyle: 'normal', fontWeight: undefined, letterSpacing: undefined };
    Object.assign(TY.display, reset, TY.__sansSnapshot.display);
    Object.assign(TY.h1,      reset, TY.__sansSnapshot.h1);
    Object.assign(TY.h2,      reset, TY.__sansSnapshot.h2);
    Object.assign(TY.h3,      reset, TY.__sansSnapshot.h3);
    if (TY.__sansSnapshot.numLarge && TY.numLarge) Object.assign(TY.numLarge, reset, TY.__sansSnapshot.numLarge);
    if (TY.__sansSnapshot.numMed && TY.numMed)     Object.assign(TY.numMed,   reset, TY.__sansSnapshot.numMed);
    if (TY.__sansSnapshot.micro && TY.micro)       Object.assign(TY.micro,    reset, TY.__sansSnapshot.micro);
  }

  // ────── Cartographer Modern flag + token swap ──────
  // Dashboard topographic palette. Stays dark like default themes but with
  // fairway-green accent and JetBrains Mono for numbers.
  T.cartographerModern = r.key === 'cartographerModern';
  if (T.cartographerModern && typeof window !== 'undefined' && window.Mm) {
    const Mg = window.Mm;
    if (T.r) Object.assign(T.r, { sm: 4, md: 6, lg: 8, xl: 10, xxl: 12, pill: 9999 });
    T.accent       = Mg.accent;
    T.accentHi     = Mg.accentHi;
    T.accentGlow   = Mg.accentGlow;
    T.glassBg      = `linear-gradient(135deg, rgba(20,38,32,0.55), rgba(15,24,22,0.75))`;
    T.glassBg2     = `linear-gradient(135deg, rgba(26,42,36,0.55), rgba(20,32,28,0.75))`;
    T.glassBorder  = Mg.hair2;
    T.glassBorder2 = Mg.hair3;
    T.glassHi      = Mg.hair;
    T.text         = Mg.text;
    T.text2        = Mg.text2;
    T.text3        = Mg.text3;
    T.text4        = Mg.text4;
    T.textOnBg     = Mg.text;
    T.textOnBg2    = Mg.text2;
    T.textOnBg3    = Mg.text3;
    T.textOnBgShadow = '0 1px 2px rgba(0,0,0,0.45), 0 0 10px rgba(0,0,0,0.25)';
    T.isLight      = false;
  }

  // ────── Cartographer flag + token swap ──────
  // Mirrors the zodiac path above but with parchment palette. Single
  // boolean read by home.jsx (and later sidebar/topbar) to delegate to
  // CartographerHomeView. Sepia text, wax-red accent, parchment glass.
  T.cartographer = r.key === 'cartographer';
  if (T.cartographer && typeof window !== 'undefined' && window.M) {
    const Mg = window.M;
    if (T.r) Object.assign(T.r, { sm: 0, md: 2, lg: 3, xl: 4, xxl: 4, pill: 9999 });
    T.accent       = Mg.wax;
    T.accentHi     = Mg.waxHi;
    T.accentGlow   = Mg.waxGlow;
    T.glassBg      = `linear-gradient(180deg, ${Mg.surface}, ${Mg.paper})`;
    T.glassBg2     = `linear-gradient(180deg, ${Mg.paper}, ${Mg.paper2})`;
    T.glassBorder  = Mg.hair2;
    T.glassBorder2 = Mg.hair3;
    T.glassHi      = Mg.hair;
    T.text         = Mg.ink;
    T.text2        = Mg.ink2;
    T.text3        = Mg.ink3;
    T.text4        = Mg.ink4;
    T.textOnBg     = Mg.ink;
    T.textOnBg2    = Mg.ink2;
    T.textOnBg3    = Mg.ink3;
    T.textOnBgShadow = '0 1px 2px rgba(255,235,200,0.55), 0 0 10px rgba(255,235,200,0.30)';
    T.isLight      = true;

    // Snapshot sans typography on first apply so we can restore on exit.
    // Reuses the same __sansSnapshot slot as Zodiac since the source-of-truth
    // sans values are identical — whichever theme switches first claims it.
    if (!TY.__sansSnapshot) {
      TY.__sansSnapshot = {
        display: { ...TY.display }, h1: { ...TY.h1 },
        h2: { ...TY.h2 }, h3: { ...TY.h3 },
        numLarge: TY.numLarge ? { ...TY.numLarge } : null,
        numMed: TY.numMed ? { ...TY.numMed } : null,
        micro: TY.micro ? { ...TY.micro } : null,
      };
    }
    // Cartographer uses Cinzel for display (all-caps, geometric serif) +
    // Cormorant Garamond for body. Different from Zodiac's italic-Cormorant
    // headings so the two premium themes feel distinct.
    const dispFont = '"Cinzel","Cormorant Garamond",Georgia,serif';
    const bodyFont = '"Cormorant Garamond","EB Garamond",Georgia,serif';
    Object.assign(TY.display, { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' });
    Object.assign(TY.h1,      { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' });
    Object.assign(TY.h2,      { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' });
    Object.assign(TY.h3,      { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' });
    if (TY.numLarge) Object.assign(TY.numLarge, { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 500 });
    if (TY.numMed)   Object.assign(TY.numMed,   { fontFamily: dispFont, fontStyle: 'normal', fontWeight: 500 });
    if (TY.micro)    Object.assign(TY.micro, {
      fontFamily: '"Cinzel","Cormorant SC",serif',
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
    });
  }
}

// ────────────── HoverOrbs ──────────────
// Drop-in glass-sphere spotlight that follows the cursor. Anchors to its
// parent via walking up from a ref (parent must be position:relative +
// overflow:hidden). When the cursor is inside the parent, both orbs track
// it smoothly, clamped so their centers never leave the card. On leave,
// they ease back to a configurable "rest" position (% of card).
//
// Gradient stops use a long-tail fade (4 stops out to 100%) so the edges
// blend into the card instead of cutting off.
function HoverOrbs({ restX = 50, restY = 50, size = 380, color, colorHi }) {
  const ref = React.useRef(null);
  const orb1Ref = React.useRef(null);
  const orb2Ref = React.useRef(null);
  // We drive orb position via rAF-lerp written straight to DOM style — no
  // React state, no CSS transitions. That gives a 60fps spring-like follow
  // instead of CSS transitions restarting every frame (which reads as jerky).
  React.useEffect(() => {
    let raf = 0;
    const target = { x: restX, y: restY };
    const current = { x: restX, y: restY };
    // Target opacity — 1 when mouse is inside the card, 0 otherwise. We lerp
    // current opacity toward target every frame so the orb fades in/out
    // smoothly instead of popping.
    let targetOpacity = 0;
    let currentOpacity = 0;
    const onMove = (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;
      targetOpacity = inside ? 1 : 0;
      if (inside) {
        // Only chase mouse while inside. Outside, leave position wherever it
        // was — the orb is invisible anyway, and when you re-enter it'll
        // catch up from the first new mouse position.
        target.x = ((e.clientX - rect.left) / rect.width) * 100;
        target.y = ((e.clientY - rect.top)  / rect.height) * 100;
      }
    };
    const tick = () => {
      const k = 0.14;
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      // Faster fade-in (k=0.18) than fade-out (k=0.08) so it responds when
      // you enter but lingers a moment when you leave — feels like a real
      // light with a bit of inertia instead of a flashlight toggle.
      const kO = targetOpacity > currentOpacity ? 0.18 : 0.08;
      currentOpacity += (targetOpacity - currentOpacity) * kO;
      if (orb1Ref.current) {
        orb1Ref.current.style.left = current.x + '%';
        orb1Ref.current.style.top  = current.y + '%';
        orb1Ref.current.style.opacity = currentOpacity;
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.left = current.x + '%';
        orb2Ref.current.style.top  = current.y + '%';
        orb2Ref.current.style.opacity = currentOpacity;
      }
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [restX, restY]);
  const c = color || T.accent;
  const ch = colorHi || T.accentHi;
  // Banding fix — WKWebView radial gradients with few stops show hard rings
  // on low-alpha transitions. Two-pronged fix:
  //   1. Many-stop gaussian-ish falloff so there's no single big alpha jump.
  //   2. `filter: blur()` on the orb itself — the wrapper has overflow:hidden
  //      + borderRadius:inherit, which contains the blur leak that normally
  //      plagues WKWebView, so we can blur heavily with no leak.
  // The blur also hides any residual stepping from the gradient stops entirely.
  const stops = (col, peak) => (
    `${withA(col, peak)} 0%, ` +
    `${withA(col, peak * 0.82)} 9%, ` +
    `${withA(col, peak * 0.62)} 20%, ` +
    `${withA(col, peak * 0.44)} 32%, ` +
    `${withA(col, peak * 0.28)} 45%, ` +
    `${withA(col, peak * 0.16)} 58%, ` +
    `${withA(col, peak * 0.08)} 72%, ` +
    `${withA(col, peak * 0.03)} 86%, ` +
    `transparent 100%`
  );
  const bg1 = `radial-gradient(circle, ${stops(c, 0.28)})`;
  const bg2 = `radial-gradient(circle, ${stops(ch, 0.22)})`;
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', borderRadius: 'inherit' }}>
      <div ref={orb1Ref} style={{
        position: 'absolute', left: `${restX}%`, top: `${restY}%`,
        width: size * 1.35, height: size * 1.35, borderRadius: '50%',
        transform: 'translate3d(-50%, -50%, 0)',
        background: bg1,
        filter: 'blur(56px)',
        opacity: 0,
        willChange: 'left, top, opacity',
      }}/>
      <div ref={orb2Ref} style={{
        position: 'absolute', left: `${restX}%`, top: `${restY}%`,
        width: size * 0.95, height: size * 0.95, borderRadius: '50%',
        transform: 'translate3d(-40%, -60%, 0)',
        background: bg2,
        filter: 'blur(42px)',
        mixBlendMode: 'screen',
        opacity: 0,
        willChange: 'left, top, opacity',
      }}/>
    </div>
  );
}

// ────────────── Ambient gradient background ──────────────
// Config-driven: takes a resolved theme (base + points array + optional bg
// image) and renders each point as a scroll-parallax orb. Users can add,
// remove and edit points from Settings → Appearance → Custom.
function AmbientBG({ resolved }) {
  const refs = React.useRef({});
  const points = resolved?.points || [];
  React.useEffect(() => {
    let raf = 0, pending = false;
    const apply = () => {
      pending = false;
      const y = window.scrollY || 0;
      for (const p of points) {
        const el = refs.current[p.id];
        if (el) el.style.transform = `translate3d(0, ${-y * (p.factor || 0.25)}px, 0)`;
      }
    };
    const onScroll = () => { if (!pending) { pending = true; raf = requestAnimationFrame(apply); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [points]);
  const base = resolved?.base || 'radial-gradient(ellipse at 30% 0%, #0A1B4E 0%, #03082A 38%, #010414 72%, #00020A 100%)';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {resolved?.bgImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${resolved.bgImage}")`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: typeof resolved.bgOpacity === 'number' ? resolved.bgOpacity : 0.75,
          filter: resolved.bgBlur ? `blur(${resolved.bgBlur}px)` : 'none',
          transform: resolved.bgBlur ? 'scale(1.05)' : 'none', // avoid hard edge from blur
        }}/>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        // Themes can specify a custom `bgOverlay` to tone the wallpaper —
        // the default dark gradient is fine for night-mode wallpapers but
        // wrong for warm/light ones (e.g. Cartographer's parchment map).
        background: resolved?.bgImage
          ? (resolved?.bgOverlay || 'linear-gradient(180deg, rgba(3,6,14,0.25), rgba(3,6,14,0.45))')
          : base,
        transition: 'background 0.8s',
      }}/>
      {/* Skip the light-point orbs when a wallpaper is set — user picked an
          image background and wants it clean, no color blobs on top. */}
      {!resolved?.bgImage && points.map((p) => {
        const col = p.color || '#0159E7';
        const a = typeof p.alpha === 'number' ? p.alpha : 0.7;
        return (
          <div
            key={p.id}
            ref={(el) => { refs.current[p.id] = el; }}
            style={{
              position: 'absolute',
              top: `${p.y}%`, left: `${p.x}%`,
              width: `${p.size}vw`, height: `${p.size}vw`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${withA(col, a)} 0%, ${withA(col, a * 0.4)} 35%, ${withA(col, a * 0.14)} 60%, transparent 92%)`,
              filter: `blur(${p.blur || 60}px)`,
              mixBlendMode: p.blend || 'normal',
              willChange: 'transform',
              pointerEvents: 'none',
            }}
          />
        );
      })}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.10, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.8'/></svg>")`,
      }}/>
    </div>
  );
}
// Legacy AmbientBG body below — kept to avoid breaking anything until all
// call sites use `resolved`. Dead code; the export above shadows it.
function __AmbientBGLegacy({ theme }) {
  const t = THEMES[theme] || THEMES.blue;
  const layers = React.useRef([]).current;
  const addLayer = (factor) => {
    const obj = { ref: React.createRef(), factor };
    if (!layers.some((l) => l.factor === factor)) layers.push(obj);
    return obj.ref;
  };
  const l1 = addLayer(0.18);
  const l2 = addLayer(0.32);
  const l3 = addLayer(0.12);
  const l4 = addLayer(0.50);
  const l5 = addLayer(0.40);
  const l6 = addLayer(0.25);
  const l7 = addLayer(0.60);

  React.useEffect(() => {
    let raf = 0;
    let pending = false;
    const apply = () => {
      pending = false;
      const y = window.scrollY || 0;
      for (const { ref, factor } of layers) {
        if (ref.current) ref.current.style.transform = `translate3d(0, ${-y * factor}px, 0)`;
      }
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Saturated blue palette — brighter cores, deeper shadows. Non-blue themes
  // fall back to their original hues so the theme picker still works.
  const isBlue = theme === 'blue';
  const palette = isBlue
    ? {
        // Pure royal-blue family — strictly no red/purple undertone. Anchored
        // on #0159E7 as the signature mid tone per the reference wallpaper.
        deep:   '#021A52',   // deep navy — pure blue shadow, zero indigo
        mid:    '#0159E7',   // signature royal blue — main body, per reference
        hi:     '#2E7BFF',   // vivid cobalt highlight
        bright: '#6FACFF',   // clean sky-blue rim (no lavender)
        cyan:   '#2FD3F5',   // cool cyan pop
        ice:    '#CFE4FF',   // icy near-white with blue tint, no pink
      }
    : { deep: t.orb3, mid: t.orb1, hi: t.orb2, bright: t.orb1, cyan: t.orb2, ice: '#FFFFFF' };

  // Base vignette — pure navy to near-black, no purple. The arc-style
  // reference reads as "bright blue curve over ink", so the base has to be
  // deep and neutral enough for the mid/hi orbs to sing.
  const darkBase = isBlue
    ? 'radial-gradient(ellipse at 30% 0%, #0A1B4E 0%, #03082A 38%, #010414 72%, #00020A 100%)'
    : t.bg;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Base — deeper radial vignette, pulled slightly upward-left so the
          top of the page reads as "lit from above" and the bottom falls off
          to near-black. Wider tonal range than the old flat linear gradient. */}
      <div style={{ position: 'absolute', inset: 0, background: darkBase, transition: 'background 0.8s' }}/>

      {/* Orb 1 — deep indigo "shadow bloom" — no blend, so it also slightly
          fills in the top-left transition instead of purely brightening. Slow
          scroll factor (0.18) so it feels like distant sky. */}
      <div ref={l1} style={{
        position: 'absolute', top: '-28%', left: '-18%',
        width: '72vw', height: '72vw', borderRadius: '50%',
        background: `radial-gradient(circle at 55% 50%, ${palette.mid}dd 0%, ${palette.mid}55 32%, ${palette.deep}22 60%, transparent 95%)`,
        filter: 'blur(90px)', animation: 'orb1 24s ease-in-out infinite',
        willChange: 'transform',
      }}/>

      {/* Orb 2 — the main saturated highlight. Bumped alpha from 88 → cc and
          tightened the falloff so the electric-blue core reads bright
          instead of washed out. Screen blend. */}
      <div ref={l2} style={{
        position: 'absolute', bottom: '-30%', right: '-20%',
        width: '82vw', height: '82vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.hi}cc 0%, ${palette.hi}44 35%, ${palette.hi}14 60%, transparent 95%)`,
        filter: 'blur(120px)', animation: 'orb2 30s ease-in-out infinite',
        mixBlendMode: 'screen', willChange: 'transform',
      }}/>

      {/* Orb 3 — cobalt midrange filler. Gives the gradient a fuller body in
          the middle of the page without blowing out highlights. Slowest drift
          (0.12) — deepest background layer. */}
      <div ref={l3} style={{
        position: 'absolute', top: '30%', left: '25%',
        width: '55vw', height: '55vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.mid}99 0%, ${palette.deep}33 40%, transparent 90%)`,
        filter: 'blur(120px)', animation: 'orb3 20s ease-in-out infinite',
        willChange: 'transform',
      }}/>

      {/* Cyan highlight — tighter, brighter, higher alpha than before.
          Medium-fast parallax (0.40) so it reads as foreground glow. */}
      <div ref={l5} style={{
        position: 'absolute', top: '6%', right: '8%',
        width: '26vw', height: '26vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.cyan}bb 0%, ${palette.cyan}33 35%, transparent 85%)`,
        filter: 'blur(70px)', mixBlendMode: 'screen',
        animation: 'orb2 36s ease-in-out infinite reverse',
        willChange: 'transform',
      }}/>

      {/* Bright rim — small, very bright, very tight. The high-contrast
          "pop" that sells the liquid-glass reference. */}
      <div ref={l4} style={{
        position: 'absolute', top: '22%', left: '12%',
        width: '14vw', height: '14vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.bright}cc 0%, ${palette.bright}33 35%, transparent 90%)`,
        filter: 'blur(60px)', mixBlendMode: 'screen',
        willChange: 'transform',
      }}/>

      {/* Specular glint — tiny near-white, high contrast, top area. Adds a
          genuine "highlight point" the eye locks onto — the reference
          wallpapers always have one of these. */}
      <div ref={l7} style={{
        position: 'absolute', top: '12%', left: '48%',
        width: '6vw', height: '6vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${palette.ice}bb 0%, ${palette.ice}22 45%, transparent 90%)`,
        filter: 'blur(30px)', mixBlendMode: 'screen',
        willChange: 'transform',
      }}/>

      {/* Light arc — large off-screen curved highlight. Wide, diffuse rim so
          it reads as a soft halo instead of a visible line. Previous 5%-wide
          band created a hard crescent; now the falloff spans ~18% of the
          radius and we lean on heavy blur to dissolve any residual edge. */}
      <div ref={l6} style={{
        position: 'absolute', top: '5%', left: '-42%',
        width: '150vw', height: '150vw', borderRadius: '50%',
        background: `radial-gradient(circle at 72% 50%, transparent 42%, ${palette.bright}08 46%, ${palette.bright}18 50%, ${palette.bright}08 54%, transparent 60%)`,
        opacity: 0.75, mixBlendMode: 'screen',
        filter: 'blur(60px)',
        willChange: 'transform',
      }}/>

      {/* Grain — slight opacity bump to 0.10 for a bit more visible texture
          that helps the gradient stop banding on dark stretches. */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.10, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.8'/></svg>")`,
      }}/>
    </div>
  );
}

// Reusable card-spotlight — renders the two-layer "glass sphere" ambient that
// replaced the old bright accent splash. Deep core behind + bright crescent
// rim on screen-blend = real depth instead of a wash. Pass an anchor string
// (e.g. 'tr' for top-right) plus an optional size. Returns a Fragment of two
// absolutely-positioned divs, so the parent must have position:relative +
// overflow:hidden. Inline so any Glass card can drop it in.
function CardSpotlight({ anchor = 'tr', size = 320, opacity = 1 }) {
  // Anchor → { top, left, right, bottom } offsets. Pushed further off-card
  // than before so only a soft wash is visible — no harsh blob at the corner.
  const pos = {
    tr: { top: -size * 0.70, right: -size * 0.55 },
    tl: { top: -size * 0.70, left: -size * 0.55 },
    br: { bottom: -size * 0.70, right: -size * 0.55 },
    bl: { bottom: -size * 0.70, left: -size * 0.55 },
  }[anchor] || { top: -size * 0.70, right: -size * 0.55 };

  return (
    <>
      {/* Deep core — gentle tint, no `filter: blur()` because WKWebView leaks
          the blur box past the parent's overflow:hidden when positioned
          off-card. Gradient stops alone handle the softness. */}
      <div style={{
        position: 'absolute', width: size * 1.8, height: size * 1.8, borderRadius: '50%',
        background: `radial-gradient(circle at 40% 42%, ${withA(T.accent, 0.20)} 0%, ${withAShade(T.accent, 0.10)} 40%, transparent 78%)`,
        pointerEvents: 'none', opacity,
        ...pos,
      }}/>
      {/* Bright rim — hint of highlight, no blend/blur for same reason. */}
      <div style={{
        position: 'absolute', width: size * 1.6, height: size * 1.6, borderRadius: '50%',
        background: `radial-gradient(circle at 70% 38%, ${withA(T.accentHi, 0.12)} 0%, ${withA(T.accent, 0.05)} 35%, transparent 70%)`,
        pointerEvents: 'none', opacity,
        ...pos,
      }}/>
    </>
  );
}

// ────────────── Zodiac stubs ──────────────
// shell.jsx mounts these unconditionally. They render nothing today; when we
// wire up the Zodiac theme properly they'll fill in. Keeping them as no-ops
// here so the app boots regardless of theme.
function ZodiacStarfield()   { return null; }
function ZodiacFrame()       { return null; }
function ZodiacGlobalStyle() {
  // Toggle a body attribute so the scoped sheet matches; no-op when zodiac
  // is off. We strip the attribute on cleanup so other themes don't inherit.
  React.useEffect(() => {
    if (T.zodiac) document.body.setAttribute('data-theme', 'zodiac');
    else if (document.body.getAttribute('data-theme') === 'zodiac') document.body.removeAttribute('data-theme');
    return () => {
      if (document.body.getAttribute('data-theme') === 'zodiac') document.body.removeAttribute('data-theme');
    };
  }, [T.zodiac]);
  if (!T.zodiac) return null;
  // Kill round shapes on host components rendered under zodiac. The toggle
  // pills, role="switch" elements and other rounded chrome would otherwise
  // clash with the angular ink+gold language.
  const css = `
    body[data-theme="zodiac"] [role="switch"] { border-radius: 2px !important; }
    body[data-theme="zodiac"] [role="switch"] > * { border-radius: 1px !important; }
    body[data-theme="zodiac"] button[style*="border-radius: 9999px"],
    body[data-theme="zodiac"] [style*="border-radius: 9999px"] {
      border-radius: 2px !important;
    }
    body[data-theme="zodiac"] input[type="checkbox"] { accent-color: #C9A24E; }
  `;
  return <style data-zodiac-global="">{css}</style>;
}
