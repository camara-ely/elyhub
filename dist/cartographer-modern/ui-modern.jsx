// ElyHub — Cartographer Modern UI primitives.
//
// Visual atoms: MTopo (geometric compass + crosshair), MPin (numbered
// teardrop pin marker — the signature), TopoBG (isolines + grid), GlassCard,
// CoordBadge.

// ─── MTopo ────────────────────────────────────────────────────────────────
// Geometric compass icon — analogous to vintage MCompass but minimalist /
// engineered. Used in hero and theme tile preview.
const MTopo = ({ size = 240, style }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" style={style}>
    <defs>
      <linearGradient id="mt-needle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0"   stopColor="#B7E68B"/>
        <stop offset="0.5" stopColor="#9BD66B"/>
        <stop offset="1"   stopColor="#6BA147"/>
      </linearGradient>
      <radialGradient id="mt-hub" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#9BD66B" stopOpacity="0.5"/>
        <stop offset="1" stopColor="#9BD66B" stopOpacity="0"/>
      </radialGradient>
    </defs>

    {/* Outer rings */}
    <circle cx="120" cy="120" r="112" fill="none" stroke="#9BD66B" strokeWidth="0.6" opacity="0.6"/>
    <circle cx="120" cy="120" r="100" fill="none" stroke="#9BD66B" strokeWidth="0.4" opacity="0.4"/>

    {/* Major ticks (cardinals, 45s) */}
    <g stroke="#9BD66B" strokeWidth="0.7" opacity="0.6">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="120" y1="8" x2="120" y2="20" transform={`rotate(${a} 120 120)`}/>
      ))}
    </g>
    {/* Minor ticks (every 15°) */}
    <g stroke="#9BD66B" strokeWidth="0.4" opacity="0.35">
      {[15, 30, 60, 75, 105, 120, 150, 165, 195, 210, 240, 255, 285, 300, 330, 345].map((a) => (
        <line key={a} x1="120" y1="14" x2="120" y2="20" transform={`rotate(${a} 120 120)`}/>
      ))}
    </g>

    {/* Cardinal labels — JetBrains Mono */}
    <g fontFamily='"JetBrains Mono",monospace' fontWeight="600" fill="#9BD66B" textAnchor="middle">
      <text x="120" y="32"  fontSize="13">N</text>
      <text x="208" y="125" fontSize="13">E</text>
      <text x="120" y="218" fontSize="13">S</text>
      <text x="32"  y="125" fontSize="13">W</text>
    </g>
    {/* Intercardinal — smaller, dim */}
    <g fontFamily='"JetBrains Mono",monospace' fill="#5C7068" textAnchor="middle">
      <text x="184" y="62"  fontSize="9">NE</text>
      <text x="184" y="190" fontSize="9">SE</text>
      <text x="56"  y="190" fontSize="9">SW</text>
      <text x="56"  y="62"  fontSize="9">NW</text>
    </g>

    {/* Inner ring */}
    <circle cx="120" cy="120" r="68" fill="none" stroke="#9BD66B" strokeWidth="0.4" opacity="0.4"/>

    {/* Needle — slightly tilted to suggest "live bearing" */}
    <g transform="rotate(-12 120 120)">
      <path d="M 120 40 L 132 120 L 120 132 L 108 120 Z" fill="url(#mt-needle)"/>
      <path d="M 120 200 L 132 120 L 120 108 L 108 120 Z" fill="#1A2A24" stroke="#9BD66B" strokeWidth="0.8"/>
    </g>

    {/* Hub */}
    <circle cx="120" cy="120" r="22" fill="url(#mt-hub)"/>
    <circle cx="120" cy="120" r="8"  fill="#9BD66B"/>
    <circle cx="120" cy="120" r="3"  fill="#0E1614"/>

    {/* Crosshair extension — distinctive from vintage */}
    <g stroke="#5DD3C4" strokeWidth="0.6" opacity="0.7" strokeDasharray="2 3">
      <line x1="0"   y1="120" x2="20"  y2="120"/>
      <line x1="220" y1="120" x2="240" y2="120"/>
      <line x1="120" y1="0"   x2="120" y2="20"/>
      <line x1="120" y1="220" x2="120" y2="240"/>
    </g>
  </svg>
);

// ─── MPin ─────────────────────────────────────────────────────────────────
// Teardrop pin marker — the signature element of Modern. Shows a number
// (rank) inside. Used in podium, leaderboard rows, member markers.
//
// `tone` = 'accent' | 'cyan' | 'mute' — different colors per context.
const MPin = ({ value = 1, size = 48, tone = 'accent' }) => {
  const colorMap = {
    accent: { bg: '#9BD66B', text: '#0E1614', glow: 'rgba(155,214,107,0.55)' },
    cyan:   { bg: '#5DD3C4', text: '#0E1614', glow: 'rgba(93,211,196,0.55)' },
    mute:   { bg: '#1A2A24', text: '#9BD66B', glow: 'rgba(0,0,0,0)' },
  };
  const c = colorMap[tone] || colorMap.accent;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: '50% 50% 50% 0',
      transform: 'rotate(-45deg)',
      background: c.bg,
      border: tone === 'mute' ? `1px solid #9BD66B` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: tone !== 'mute' ? `0 0 ${size / 2}px ${c.glow}` : 'none',
    }}>
      <span style={{
        transform: 'rotate(45deg)',
        fontFamily: '"JetBrains Mono",monospace',
        fontSize: Math.round(size * 0.40), fontWeight: 700,
        color: c.text, lineHeight: 1, letterSpacing: '-0.04em',
      }}>{value}</span>
    </div>
  );
};

// ─── TopoBG ───────────────────────────────────────────────────────────────
// Fixed-position background with isolines + grid. Replaces the default
// AmbientBG for modern theme. Uses CSS for grid (cheap) and a single SVG
// for the contour curves (computed once, GPU-composited).
const TopoBG = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: `
      radial-gradient(ellipse at 30% 20%, #1A2A24 0%, transparent 55%),
      radial-gradient(ellipse at 80% 70%, #16241F 0%, transparent 60%),
      #0E1614
    `,
  }}>
    {/* Isolines layer */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}
         viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="#3B5A40" strokeWidth="0.6" opacity="0.55">
        <path d="M-50,180 Q200,140 380,200 T780,180 T1100,220 T1330,200"/>
        <path d="M-50,260 Q220,220 400,280 T800,260 T1120,300 T1330,280"/>
        <path d="M-50,340 Q240,300 420,360 T820,340 T1140,380 T1330,360"/>
        <path d="M-50,420 Q260,380 440,440 T840,420 T1160,460 T1330,440"/>
        <path d="M-50,500 Q280,460 460,520 T860,500 T1180,540 T1330,520"/>
        <path d="M-50,580 Q300,540 480,600 T880,580 T1200,620 T1330,600"/>
        <path d="M-50,660 Q320,620 500,680 T900,660 T1220,700 T1330,680"/>
        <path d="M-50,100 Q180,60 360,120 T760,100 T1080,140 T1330,120"/>
        <path d="M-50,740 Q340,700 520,760 T920,740 T1240,780 T1330,760"/>
      </g>
      <g fill="none" stroke="#3B5A40" strokeWidth="0.4" opacity="0.32">
        <path d="M-50,140 Q190,100 370,160 T770,140 T1090,180 T1330,160"/>
        <path d="M-50,220 Q210,180 390,240 T790,220 T1110,260 T1330,240"/>
        <path d="M-50,300 Q230,260 410,320 T810,300 T1130,340 T1330,320"/>
        <path d="M-50,380 Q250,340 430,400 T830,380 T1150,420 T1330,400"/>
        <path d="M-50,460 Q270,420 450,480 T850,460 T1170,500 T1330,480"/>
        <path d="M-50,540 Q290,500 470,560 T870,540 T1190,580 T1330,560"/>
        <path d="M-50,620 Q310,580 490,640 T890,620 T1210,660 T1330,640"/>
        <path d="M-50,700 Q330,660 510,720 T910,700 T1230,740 T1330,720"/>
      </g>
    </svg>
    {/* 64px grid — pure CSS, no SVG cost */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage:
        'linear-gradient(rgba(155,214,107,0.04) 1px, transparent 1px),'
      + 'linear-gradient(90deg, rgba(155,214,107,0.04) 1px, transparent 1px)',
      backgroundSize: '64px 64px',
    }}/>
  </div>
);

// ─── GlassCard ────────────────────────────────────────────────────────────
// Reusable surface — dark glass with green hairline border. Used by hero,
// stat cards, leaderboard rows.
const GlassCard = ({ children, style, ...rest }) => (
  <div style={{
    background: 'rgba(15,30,25,0.55)',
    border: '1px solid rgba(155,214,107,0.20)',
    borderRadius: 6,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(155,214,107,0.05)',
    ...(style || {}),
  }} {...rest}>
    {children}
  </div>
);

// ─── CoordBadge ───────────────────────────────────────────────────────────
// "47.21°N · 8.54°E · 273°" pill. Sits in headers, hero panels.
const CoordBadge = ({ name, showBearing = true, style }) => {
  const c = (window.coordsModern || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' })))(name || '');
  const b = (window.bearingModern || (() => 0))(name || '');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: '"JetBrains Mono",monospace',
      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: '#9CB0A6',
      ...(style || {}),
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#9BD66B',
        boxShadow: '0 0 8px rgba(155,214,107,0.55)',
        animation: 'mmPulse 2s ease-in-out infinite',
      }}/>
      <span>{c.lat}°{c.latDir} · {c.lon}°{c.lonDir}</span>
      {showBearing && <><span style={{ color: '#5C7068' }}>·</span><span style={{ color: '#9BD66B' }}>{String(b).padStart(3, '0')}°</span></>}
      <style>{`@keyframes mmPulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%     { opacity: 0.4; transform: scale(0.85); }
      }`}</style>
    </div>
  );
};

// ─── ModernThemeTransition ────────────────────────────────────────────────
// Radar-sweep curtain for entering/leaving cartographerModern. Listens for
// 'ely:theme-transition' and renders null otherwise. The aesthetic is:
// dark slate field with a topographic grid + a green sweep line rotating
// around a pulsing center pin — feels like the dashboard "acquiring signal".
const ModernThemeTransition = () => {
  const [active, setActive] = React.useState(false);
  const [phase, setPhase] = React.useState('idle');

  React.useEffect(() => {
    const onChange = (e) => {
      // Single-winner gate — see theme.jsx dispatcher for the pick logic.
      const winner = e.detail?.winner;
      if (winner !== 'cartographerModern') return;
      setActive(true);
      setPhase('in');
      setTimeout(() => setPhase('hold'),  700);
      setTimeout(() => setPhase('out'),  1400);
      setTimeout(() => { setPhase('idle'); setActive(false); }, 2000);
    };
    window.addEventListener('ely:theme-transition', onChange);
    return () => window.removeEventListener('ely:theme-transition', onChange);
  }, []);

  if (!active) return null;

  // Fade-in (opacity + scale-from-90% on the hub) for entry, slide-up for exit.
  const opacity   = phase === 'out' ? 0 : 1;
  const transform = phase === 'out' ? 'translateY(-100%)' : 'translateY(0)';
  const transition =
    phase === 'in'  ? 'opacity 700ms ease, transform 700ms cubic-bezier(0.65, 0, 0.35, 1)'
  : phase === 'out' ? 'opacity 600ms ease, transform 600ms cubic-bezier(0.65, 0, 0.35, 1)'
  :                   'none';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
      transform, transition, opacity,
      willChange: 'transform, opacity',
      background: `
        radial-gradient(ellipse at 50% 50%, #1A2A24 0%, #0E1614 70%),
        #0E1614
      `,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Topographic grid behind everything */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(rgba(155,214,107,0.05) 1px, transparent 1px),'
        + 'linear-gradient(90deg, rgba(155,214,107,0.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}/>

      {/* Radar sweep — single rotating gradient cone */}
      <div style={{
        position: 'absolute', width: 1200, height: 1200,
        animation: 'mmRadar 2.4s linear infinite',
        background: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(155,214,107,0.32) 350deg, rgba(155,214,107,0.55) 360deg, transparent 361deg)`,
        borderRadius: '50%',
        willChange: 'transform',
      }}/>

      {/* Concentric range rings */}
      <svg width="600" height="600" viewBox="0 0 600 600" style={{ position: 'absolute', opacity: 0.7 }}>
        <circle cx="300" cy="300" r="280" fill="none" stroke="#9BD66B" strokeWidth="0.6" opacity="0.4"/>
        <circle cx="300" cy="300" r="220" fill="none" stroke="#9BD66B" strokeWidth="0.5" opacity="0.3"/>
        <circle cx="300" cy="300" r="160" fill="none" stroke="#9BD66B" strokeWidth="0.5" opacity="0.3"/>
        <circle cx="300" cy="300" r="100" fill="none" stroke="#9BD66B" strokeWidth="0.5" opacity="0.4"/>
        {/* Crosshairs */}
        <line x1="0"   y1="300" x2="600" y2="300" stroke="#5DD3C4" strokeWidth="0.6" opacity="0.4" strokeDasharray="4 6"/>
        <line x1="300" y1="0"   x2="300" y2="600" stroke="#5DD3C4" strokeWidth="0.6" opacity="0.4" strokeDasharray="4 6"/>
        {/* Cardinal labels */}
        <g fontFamily='"JetBrains Mono",monospace' fontSize="11" fontWeight="600" fill="#9BD66B" textAnchor="middle">
          <text x="300" y="14">N</text>
          <text x="586" y="304">E</text>
          <text x="300" y="592">S</text>
          <text x="14"  y="304">W</text>
        </g>
      </svg>

      {/* Center pin — pulsing accent */}
      <div style={{
        position: 'absolute',
        width: 18, height: 18, borderRadius: '50%',
        background: '#9BD66B',
        boxShadow: '0 0 24px rgba(155,214,107,0.85), 0 0 12px rgba(155,214,107,0.95)',
        animation: 'mmRadarPulse 1.2s ease-in-out infinite',
      }}/>

      {/* Bottom HUD strip */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 32,
        display: 'flex', justifyContent: 'center', gap: 32,
        fontFamily: '"JetBrains Mono",monospace', fontSize: 10,
        letterSpacing: '0.18em', color: 'rgba(155,214,107,0.7)',
      }}>
        <span>● ACQUIRING</span>
        <span style={{ color: 'rgba(93,211,196,0.7)' }}>SECTOR 04</span>
        <span>SURVEY · ONLINE</span>
      </div>

      <style>{`
        @keyframes mmRadar {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes mmRadarPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 24px rgba(155,214,107,0.85), 0 0 12px rgba(155,214,107,0.95); }
          50%      { transform: scale(1.4); box-shadow: 0 0 36px rgba(155,214,107,1),    0 0 20px rgba(155,214,107,1); }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, { MTopo, MPin, TopoBG, GlassCard, CoordBadge, ModernThemeTransition });
