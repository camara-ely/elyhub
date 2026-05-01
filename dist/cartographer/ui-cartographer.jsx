// ElyHub — Cartographer UI primitives.
//
// Visual atoms used by the Cartographer hero panel and (later) leaderboard
// variant. All SVG, no external assets. Mirrors zodiac/ui-zodiac.jsx pattern.

// ─── MCompass ────────────────────────────────────────────────────────────
// The signature icon — analogous to ZStarburst. Detailed engraving-style
// rosa-dos-ventos with 32 ticks, 8 alternating petals (4 cardinal +
// 4 diagonal), red-wax north pointer, gold center hub.
//
// `size` is the rendered dimension. `wax` toggles the red north pointer
// (false renders a sepia north for theme-tile previews where red is too
// loud). `tilt` rotates the whole rose for subtle "the world spins" feel.
const MCompass = ({ size = 240, wax = true, tilt = 0, style }) => {
  const id = React.useMemo(() => `m-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" style={{ ...(style || {}), transform: `rotate(${tilt}deg)` }}>
      <defs>
        <radialGradient id={`${id}-rose`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#EFE3C8"/>
          <stop offset="1" stopColor="#C9B791"/>
        </radialGradient>
        <pattern id={`${id}-hatch`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#3B2616" strokeWidth="0.4"/>
        </pattern>
      </defs>

      {/* Decorative outer rings */}
      <circle cx="120" cy="120" r="112" fill="none" stroke="#3B2616" strokeWidth="0.7"/>
      <circle cx="120" cy="120" r="108" fill="none" stroke="#3B2616" strokeWidth="0.4"/>

      {/* 32-point ticks (cardinal long, intermediate short) */}
      <g stroke="#3B2616" strokeWidth="0.4" opacity="0.6">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={`maj-${a}`} x1="120" y1="8" x2="120" y2="16" transform={`rotate(${a} 120 120)`}/>
        ))}
        {[
          11.25, 22.5, 33.75, 56.25, 67.5, 78.75,
          101.25, 112.5, 123.75, 146.25, 157.5, 168.75,
          191.25, 202.5, 213.75, 236.25, 247.5, 258.75,
          281.25, 292.5, 303.75, 326.25, 337.5, 348.75,
        ].map((a) => (
          <line key={`min-${a}`} x1="120" y1="8" x2="120" y2="14" transform={`rotate(${a} 120 120)`}/>
        ))}
      </g>

      {/* Inner ring + parchment fill */}
      <circle cx="120" cy="120" r="92" fill={`url(#${id}-rose)`} stroke="#3B2616" strokeWidth="0.6"/>

      {/* Diagonal (NE/SE/SW/NW) petals — alternating clean + hatched halves */}
      <g>
        <path d="M 120 120 L 70 70 L 80 120 Z"  fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 70 70 L 120 80 Z"  fill={`url(#${id}-hatch)`} stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 170 70 L 160 120 Z" fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 170 70 L 120 80 Z"  fill={`url(#${id}-hatch)`} stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 170 170 L 160 120 Z" fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 170 170 L 120 160 Z" fill={`url(#${id}-hatch)`} stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 70 170 L 80 120 Z"  fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.5"/>
        <path d="M 120 120 L 70 170 L 120 160 Z" fill={`url(#${id}-hatch)`} stroke="#3B2616" strokeWidth="0.5"/>
      </g>

      {/* Cardinal long petals — N is wax red (or sepia when wax=false) */}
      <path d="M 120 120 L 110 50 L 120 28 L 130 50 Z" fill={wax ? '#8B2418' : '#3B2616'} stroke="#3B2616" strokeWidth="0.6"/>
      <path d="M 120 120 L 110 50 L 120 70 Z" fill="#3B2616" opacity="0.4"/>

      <path d="M 120 120 L 130 190 L 120 212 L 110 190 Z" fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.6"/>
      <path d="M 120 120 L 110 190 L 120 170 Z" fill="#3B2616" opacity="0.3"/>

      <path d="M 120 120 L 190 110 L 212 120 L 190 130 Z" fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.6"/>
      <path d="M 120 120 L 190 130 L 170 120 Z" fill="#3B2616" opacity="0.3"/>

      <path d="M 120 120 L 50 130 L 28 120 L 50 110 Z" fill="#EFE3C8" stroke="#3B2616" strokeWidth="0.6"/>
      <path d="M 120 120 L 50 110 L 70 120 Z" fill="#3B2616" opacity="0.3"/>

      {/* Gold center hub with sigil star */}
      <circle cx="120" cy="120" r="14" fill="#C8A24E" stroke="#3B2616" strokeWidth="0.6"/>
      <path d="M 120 110 L 122 118 L 130 120 L 122 122 L 120 130 L 118 122 L 110 120 L 118 118 Z" fill="#3B2616"/>

      {/* Cardinal letters — Cinzel-style, PT-BR uses N/S/L/O */}
      <g fontFamily='"Cinzel",serif' fontSize="14" fontWeight="700" fill="#3B2616" textAnchor="middle">
        <text x="120" y="22">N</text>
        <text x="222" y="126">L</text>
        <text x="120" y="232">S</text>
        <text x="18" y="126">O</text>
      </g>

      {/* Intercardinal labels */}
      <g fill="#3B2616" opacity="0.7">
        <text x="184" y="62"  fontFamily='"Cinzel",serif' fontSize="9" textAnchor="middle">NE</text>
        <text x="184" y="186" fontFamily='"Cinzel",serif' fontSize="9" textAnchor="middle">SE</text>
        <text x="56"  y="186" fontFamily='"Cinzel",serif' fontSize="9" textAnchor="middle">SO</text>
        <text x="56"  y="62"  fontFamily='"Cinzel",serif' fontSize="9" textAnchor="middle">NO</text>
      </g>
    </svg>
  );
};

// ─── WaxSeal ─────────────────────────────────────────────────────────────
// Avatar emoldurado por anel de cera vermelho. The avatar (Discord URL or
// an `inner` letter) sits inside; the ring is a radial gradient + dashed
// inner border that reads as pressed wax. Used for top-1 and member rows.
//
// This is the user's chosen variant: framed avatar (not full replacement).
// Falls back to initial letter if `src` is null.
const WaxSeal = ({ src, name, size = 56, ring = 6 }) => {
  const inner = size - ring * 2;
  const fontSize = Math.max(11, Math.round(inner * 0.42));
  return (
    <div style={{
      width: size, height: size, position: 'relative', flexShrink: 0,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
      boxShadow: 'inset -4px -6px 10px rgba(0,0,0,0.35), inset 3px 4px 8px rgba(255,255,255,0.18), 2px 3px 6px rgba(59,38,22,0.4)',
    }}>
      {/* dashed inner ring — looks like pressed-in seal stamp */}
      <div style={{
        position: 'absolute', inset: 3, borderRadius: '50%',
        border: '1px dashed rgba(232,200,170,0.4)', pointerEvents: 'none',
      }}/>
      {/* avatar slot */}
      <div style={{
        position: 'absolute', inset: ring, borderRadius: '50%',
        overflow: 'hidden',
        background: src ? '#1a1408' : 'radial-gradient(circle at 35% 35%, #B89767, #876344 70%, #5C4128)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
      }}>
        {src ? (
          <img src={src} alt={name || ''} draggable="false" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'sepia(0.45) saturate(0.9) contrast(1.05)',
          }}/>
        ) : (
          <span style={{
            fontFamily: '"Cinzel",serif', fontSize, fontWeight: 700,
            color: '#E8DCC0', letterSpacing: '0.02em',
          }}>{(window.initialOf ? window.initialOf(name) : (name || '?')[0]).toUpperCase()}</span>
        )}
      </div>
    </div>
  );
};

// ─── OrnateCorner ────────────────────────────────────────────────────────
// SVG decorative corner medallion for hero/leaderboard frames. Renders one
// "top-left" canonical glyph; transform via CSS to mirror to other corners.
const OrnateCorner = ({ size = 48, color = '#3B2616', opacity = 0.55, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
       stroke={color} strokeWidth="0.8" opacity={opacity} style={style}>
    <path d="M 8 8 L 56 8 M 8 8 L 8 56"/>
    <path d="M 8 8 Q 24 24 8 56" opacity="0.5"/>
    <path d="M 8 8 Q 24 24 56 8" opacity="0.5"/>
    <circle cx="8" cy="8" r="3" fill={color} stroke="none"/>
    <circle cx="20" cy="20" r="2"/>
    <path d="M 14 14 L 26 14 L 14 26 Z" fill="#C8A24E" opacity="0.4" stroke="none"/>
    <path d="M 8 38 Q 14 32 18 38 Q 22 44 16 48"/>
    <path d="M 38 8 Q 32 14 38 18 Q 44 22 48 16"/>
  </svg>
);

// ─── CartographerBG ──────────────────────────────────────────────────────
// Fixed-position parchment background. SVG turbulence creates the aged
// fiber/grain noise; a stains layer adds blotchy patina; radial gradients
// give the page warm corners. Z-index 0, pointer-events none.
//
// This is the equivalent of CosmicBG in Zodiac. Mounted at the app root
// when T.cartographer is true.
const CartographerBG = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(135, 99, 68, 0.18) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 80%, rgba(139, 36, 24, 0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(59, 38, 22, 0.12) 100%),
      #E8DCC0
    `,
  }}>
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4, mixBlendMode: 'multiply' }}
         viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="m-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7"/>
          <feColorMatrix values="0 0 0 0 0.23  0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0.6 0"/>
        </filter>
        <filter id="m-stains">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="11"/>
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0.18 0"/>
        </filter>
      </defs>
      <rect width="1280" height="800" filter="url(#m-noise)"/>
      <rect width="1280" height="800" filter="url(#m-stains)" opacity="0.6"/>
    </svg>
  </div>
);

// ─── PaperPanel ──────────────────────────────────────────────────────────
// Reusable surface — parchment card with optional ornate corners + double
// inner border. Used for hero, leaderboard, and other major surfaces.
const PaperPanel = ({ children, corners = true, style, innerStyle, ...rest }) => (
  <div style={{
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(232,220,192,0.4), rgba(220,207,174,0.6)), #EFE3C8',
    border: '1px solid rgba(59,38,22,0.4)',
    boxShadow: '4px 6px 20px rgba(59,38,22,0.15)',
    ...(style || {}),
  }} {...rest}>
    {corners && (
      <>
        <OrnateCorner size={48} style={{ position: 'absolute', top: 8,    left: 8 }}/>
        <OrnateCorner size={48} style={{ position: 'absolute', top: 8,    right: 8, transform: 'scaleX(-1)' }}/>
        <OrnateCorner size={48} style={{ position: 'absolute', bottom: 8, left: 8,  transform: 'scaleY(-1)' }}/>
        <OrnateCorner size={48} style={{ position: 'absolute', bottom: 8, right: 8, transform: 'scale(-1,-1)' }}/>
      </>
    )}
    {/* double inner border */}
    <div style={{ position: 'absolute', inset: 14, border: '1px solid #3B2616', opacity: 0.35, pointerEvents: 'none' }}/>
    <div style={{ position: 'absolute', inset: 18, border: '0.5px solid #3B2616', opacity: 0.18, pointerEvents: 'none' }}/>
    <div style={{ position: 'relative', zIndex: 2, ...(innerStyle || {}) }}>{children}</div>
  </div>
);

// ─── PaperButton ─────────────────────────────────────────────────────────
// Three variants matching the mockup: primary (wax-red filled), secondary
// (double-line ink border), ghost (text + arrow).
const PaperButton = ({ variant = 'primary', children, onClick, style, ...rest }) => {
  const base = {
    padding: '12px 22px',
    fontFamily: '"Cinzel",serif',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'inline-flex', alignItems: 'center', gap: 10,
    border: '1px solid transparent',
  };
  const v = variant === 'primary' ? {
    background: '#8B2418', color: '#E8DCC0', borderColor: '#8B2418',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 2px 3px 6px rgba(139,36,24,0.3)',
  } : variant === 'secondary' ? {
    background: 'transparent', color: '#3B2616',
    border: '3px double #3B2616',
  } : {
    background: 'transparent', color: '#5C4128', border: 'none', padding: '12px 4px',
  };
  return (
    <button onClick={onClick} style={{ ...base, ...v, ...(style || {}) }} {...rest}>
      {children}{variant === 'ghost' && <span style={{ marginLeft: 6 }}>→</span>}
    </button>
  );
};

// ─── CartographerThemeTransition ─────────────────────────────────────────
// Parchment-unroll curtain. Subscribes to 'ely:theme-transition' fired by
// applyResolvedTheme when crossing the cartographer boundary. Renders null
// when no transition involving cartographer is active.
//
// Visual: a parchment scroll drops from the top, with the MCompass faintly
// visible in the center. Stays fully covered for ~700ms (which is when
// applyResolvedTheme is deferred-mutating tokens), then unrolls back up.
function CartographerThemeTransition() {
  const [active, setActive] = React.useState(false);
  const [phase, setPhase] = React.useState('idle'); // idle | in | hold | out

  React.useEffect(() => {
    const onChange = (e) => {
      // The dispatcher in theme.jsx picks a single `winner` per transition
      // so dual-premium crosses (e.g. cartographer → zodiac) don't overlay
      // two curtains. We only fire when our key wins.
      const winner = e.detail?.winner;
      if (winner !== 'cartographer') return;
      setActive(true);
      setPhase('in');
      setTimeout(() => setPhase('hold'),  800);
      setTimeout(() => setPhase('out'),  1300);
      setTimeout(() => { setPhase('idle'); setActive(false); }, 2000);
    };
    window.addEventListener('ely:theme-transition', onChange);
    return () => window.removeEventListener('ely:theme-transition', onChange);
  }, []);

  if (!active) return null;

  // The curtain is a single fixed div that drops in (translateY: -100% → 0)
  // and retracts (0 → -100%). transform-only animations stay on the GPU
  // compositor and don't trigger layout/paint on every frame.
  const transform = phase === 'out' ? 'translateY(-100%)' : 'translateY(0)';
  const transition =
    phase === 'in'  ? 'transform 800ms cubic-bezier(0.65, 0, 0.35, 1)'
  : phase === 'out' ? 'transform 700ms cubic-bezier(0.65, 0, 0.35, 1)'
  :                   'none';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
      transform, transition,
      willChange: 'transform',
      // Pre-rendered parchment — no SVG turbulence (too expensive on every
      // frame). The radial gradients alone read as warm vellum.
      background: `
        radial-gradient(ellipse at 30% 20%, rgba(135, 99, 68, 0.22) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 80%, rgba(139, 36, 24, 0.10) 0%, transparent 50%),
        linear-gradient(180deg, #C9B791 0%, #DECFAE 14%, #E8DCC0 28%, #E8DCC0 72%, #DECFAE 86%, #C9B791 100%)
      `,
      boxShadow: 'inset 0 12px 32px rgba(59,38,22,0.32), inset 0 -12px 32px rgba(59,38,22,0.32)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Compass spins continuously while the curtain is mounted — no
          start/stop snap between phases. Opacity fades in over the drop
          so it doesn't pop. */}
      <div style={{
        opacity: phase === 'in' ? 0.55 : phase === 'hold' ? 0.55 : 0.15,
        transition: 'opacity 500ms ease',
        animation: 'mCurtainSpin 8s linear infinite',
        willChange: 'transform',
      }}>
        <MCompass size={280} wax={true}/>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 18,
        background: 'linear-gradient(180deg, transparent, rgba(59,38,22,0.30))',
      }}/>

      <style>{`@keyframes mCurtainSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }`}</style>
    </div>
  );
}

Object.assign(window, { MCompass, WaxSeal, OrnateCorner, CartographerBG, PaperPanel, PaperButton, CartographerThemeTransition });
