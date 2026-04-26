// ElyHub Zodiac — celestial icons, ornate frames, sigils
// All SVG hand-tuned to feel like vintage engravings — thin lines, radiating spokes, no fills.

// ─── Base icon ───
const ZIcon = ({ children, size = 18, color = Z.gold, sw = 1, vb = '0 0 24 24', style }) => (
  <svg width={size} height={size} viewBox={vb} fill="none"
       stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>{children}</svg>
);

// Nav glyphs — astrological-flavoured shapes
const ZIHome = p => <ZIcon {...p}>{/* sun house */}
  <circle cx="12" cy="13" r="3"/>
  {[0,45,90,135,180,225,270,315].map(a => {
    const r1=3.6, r2=5.5;
    const rad=a*Math.PI/180;
    return <line key={a} x1={12+Math.cos(rad)*r1} y1={13+Math.sin(rad)*r1} x2={12+Math.cos(rad)*r2} y2={13+Math.sin(rad)*r2}/>;
  })}
  <path d="M3 12 L12 4 L21 12"/>
</ZIcon>;
const ZIRank = p => <ZIcon {...p}>{/* obelisk steps */}
  <path d="M5 21V12M12 21V5M19 21V15"/>
  <path d="M3 21h18"/>
  <circle cx="12" cy="3" r="0.8" fill={p.color || Z.gold}/>
  <circle cx="5" cy="10" r="0.5" fill={p.color || Z.gold}/>
  <circle cx="19" cy="13" r="0.5" fill={p.color || Z.gold}/>
</ZIcon>;
const ZIStore = p => <ZIcon {...p}>{/* chalice */}
  <path d="M6 5h12l-1 5a5 5 0 0 1-10 0z"/>
  <path d="M12 15v4M9 19h6"/>
  <circle cx="12" cy="8" r="0.6" fill={p.color || Z.gold}/>
</ZIcon>;
const ZITrophy = p => <ZIcon {...p}>{/* laurel + star */}
  <path d="M12 4 L13 8 L17 8 L14 11 L15 15 L12 13 L9 15 L10 11 L7 8 L11 8 Z"/>
  <path d="M5 18c2-2 5-2 7 0M19 18c-2-2-5-2-7 0"/>
</ZIcon>;
const ZIUser = p => <ZIcon {...p}>{/* moon-haloed figure */}
  <circle cx="12" cy="8" r="3.2"/>
  <path d="M5 21a7 7 0 0 1 14 0"/>
  <path d="M9 7a3 3 0 0 0 6 0" strokeWidth={(p.sw||1)*0.6}/>
</ZIcon>;
const ZIBell = p => <ZIcon {...p}>
  <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17zM10 20a2 2 0 0 0 4 0"/>
  <circle cx="12" cy="5" r="0.6" fill={p.color || Z.gold}/>
</ZIcon>;
const ZISearch = p => <ZIcon {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5"/></ZIcon>;
const ZIGift = p => <ZIcon {...p}>{/* sealed envelope w wax star */}
  <rect x="3" y="6" width="18" height="14" rx="0.5"/>
  <path d="M3 7l9 7 9-7"/>
  <circle cx="12" cy="13" r="2"/>
  <path d="M12 11v4M10 13h4" strokeWidth={(p.sw||1)*0.7}/>
</ZIcon>;
const ZIPlus = p => <ZIcon {...p}><path d="M12 5v14M5 12h14"/></ZIcon>;
const ZIArrowUp = p => <ZIcon {...p}><path d="M12 5v14M6 11l6-6 6 6"/></ZIcon>;
const ZIArrowDown = p => <ZIcon {...p}><path d="M12 5v14M6 13l6 6 6-6"/></ZIcon>;
const ZIDash = p => <ZIcon {...p}><path d="M6 12h12"/></ZIcon>;
const ZIChevR = p => <ZIcon {...p}><path d="m9 6 6 6-6 6"/></ZIcon>;
const ZIChevL = p => <ZIcon {...p}><path d="m15 6-6 6 6 6"/></ZIcon>;
const ZIX = p => <ZIcon {...p}><path d="M18 6 6 18M6 6l12 12"/></ZIcon>;
const ZICheck = p => <ZIcon {...p}><path d="m5 12 5 5 9-10"/></ZIcon>;
const ZIFlame = p => <ZIcon {...p}>{/* comet/torch */}
  <path d="M12 3c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3 0-5 0-7z"/>
</ZIcon>;
const ZILock = p => <ZIcon {...p}><rect x="5" y="11" width="14" height="9" rx="0.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></ZIcon>;
const ZISettings = p => <ZIcon {...p}>{/* astrolabe */}
  <circle cx="12" cy="12" r="8"/>
  <circle cx="12" cy="12" r="4"/>
  <path d="M4 12h16M12 4v16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7"/>
</ZIcon>;

// ─── Celestial sigils ───
const ZSun = ({ size = 24, rays = 16, color = Z.gold, sw = 0.8, fill = false, innerR = 0.32, outerR = 0.5, style }) => {
  const c = size/2;
  const rIn = size * innerR, rOut = size * outerR;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
         stroke={color} strokeWidth={sw} strokeLinecap="round" style={style}>
      {fill && <circle cx={c} cy={c} r={rIn} fill={color} stroke="none"/>}
      {!fill && <circle cx={c} cy={c} r={rIn}/>}
      {[...Array(rays)].map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const r1 = rIn + 1, r2 = rOut;
        return <line key={i}
          x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1}
          x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}/>;
      })}
    </svg>
  );
};

// Many-rayed star burst (long + short alternating, like the references)
const ZStarburst = ({ size = 80, color = Z.gold, sw = 0.6, points = 12, style }) => {
  const c = size/2, rC = size*0.08;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
         stroke={color} strokeWidth={sw} strokeLinecap="round" style={style}>
      <circle cx={c} cy={c} r={rC} fill={color} stroke="none"/>
      {[...Array(points*2)].map((_, i) => {
        const a = (i / (points*2)) * Math.PI * 2;
        const long = i % 2 === 0;
        const r1 = rC + 1, r2 = long ? size*0.48 : size*0.22;
        return <line key={i}
          x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1}
          x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}/>;
      })}
      {/* Tiny sparkles around */}
      {[...Array(8)].map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = size * 0.42;
        return <text key={i} x={c + Math.cos(a) * r} y={c + Math.sin(a) * r + 1.5}
          fill={color} stroke="none" fontSize={size*0.06} textAnchor="middle"
          fontFamily="serif">✦</text>;
      })}
    </svg>
  );
};

// Crescent moon w cratered look (just outline + small dots)
const ZMoon = ({ size = 24, color = Z.gold, sw = 1, style }) => {
  const c = size/2, r = size*0.42;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
         stroke={color} strokeWidth={sw} strokeLinecap="round" style={style}>
      <circle cx={c} cy={c} r={r}/>
      <path d={`M ${c+r*0.15} ${c-r*0.7} a ${r*0.85} ${r*0.85} 0 1 0 0 ${r*1.4}`} fill={color} fillOpacity="0.12" stroke="none"/>
      <circle cx={c-r*0.3} cy={c-r*0.2} r={r*0.08} fill={color} stroke="none" opacity="0.6"/>
      <circle cx={c-r*0.1} cy={c+r*0.3} r={r*0.06} fill={color} stroke="none" opacity="0.5"/>
    </svg>
  );
};

// Eye-of-providence / radiating sun face (decorative seal)
const ZEyeSeal = ({ size = 60, color = Z.gold, sw = 0.7 }) => {
  const c = size/2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
         stroke={color} strokeWidth={sw} strokeLinecap="round">
      <circle cx={c} cy={c} r={size*0.45}/>
      <circle cx={c} cy={c} r={size*0.32}/>
      {/* Eye */}
      <path d={`M ${size*0.3} ${c} Q ${c} ${size*0.38} ${size*0.7} ${c} Q ${c} ${size*0.62} ${size*0.3} ${c} Z`}/>
      <circle cx={c} cy={c} r={size*0.06} fill={color} stroke="none"/>
      {/* Outer rays */}
      {[...Array(24)].map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r1 = size*0.46, r2 = size*0.5;
        return <line key={i}
          x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1}
          x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}/>;
      })}
    </svg>
  );
};

// Constellation — random-looking but stable star arrangement
const ZConstellation = ({ width = 200, height = 80, seed = 1, color = Z.gold, density = 8, style }) => {
  // deterministic pseudo-random
  const rand = (n) => {
    const x = Math.sin(seed * 9301 + n * 4937) * 10000;
    return x - Math.floor(x);
  };
  const stars = [...Array(density)].map((_, i) => ({
    x: 8 + rand(i)*(width-16),
    y: 8 + rand(i+100)*(height-16),
    r: 0.7 + rand(i+200)*1.6,
  }));
  const lines = [];
  for (let i = 0; i < stars.length-1; i++) lines.push([i, i+1]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={style}>
      {lines.map(([a,b], i) => (
        <line key={i} x1={stars[a].x} y1={stars[a].y} x2={stars[b].x} y2={stars[b].y}
          stroke={color} strokeWidth="0.5" strokeOpacity="0.45"/>
      ))}
      {stars.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r} fill={color}/>
          <circle cx={s.x} cy={s.y} r={s.r*2.5} fill={color} opacity="0.15"/>
        </g>
      ))}
    </svg>
  );
};

// Tiny star sprinkles for backgrounds (dots + 4-point sparkles)
const ZStarfield = ({ count = 60, color = Z.parch, style }) => {
  const items = [...Array(count)].map((_, i) => {
    const r = (Math.sin(i * 9301 + 7) * 10000) % 1;
    const r2 = (Math.sin(i * 4937 + 13) * 10000) % 1;
    const r3 = (Math.sin(i * 2113 + 19) * 10000) % 1;
    return { x: Math.abs(r)*100, y: Math.abs(r2)*100, big: Math.abs(r3) < 0.15, op: 0.25 + Math.abs(r3)*0.65 };
  });
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
         style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>
      {items.map((s, i) => s.big
        ? <g key={i} opacity={s.op}>
            <line x1={s.x-1.2} y1={s.y} x2={s.x+1.2} y2={s.y} stroke={color} strokeWidth="0.18"/>
            <line x1={s.x} y1={s.y-1.2} x2={s.x} y2={s.y+1.2} stroke={color} strokeWidth="0.18"/>
          </g>
        : <circle key={i} cx={s.x} cy={s.y} r="0.18" fill={color} opacity={s.op}/>
      )}
    </svg>
  );
};

// Hairline horizontal divider w center diamond
const ZDivider = ({ children, color = Z.gold, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...style }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${color}55, ${color}aa)` }}/>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 4, height: 4, transform: 'rotate(45deg)', background: color, opacity: 0.7 }}/>
      {children && <span style={{ ...ZTY.capsSm, color: color, opacity: 0.85 }}>{children}</span>}
      <span style={{ width: 4, height: 4, transform: 'rotate(45deg)', background: color, opacity: 0.7 }}/>
    </div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${color}55, ${color}aa)` }}/>
  </div>
);

// ─── ORNATE FRAME — the signature element ───
// Renders as positioned absolute corners; place inside any relative container.
function ZFrame({ color = Z.gold, opacity = 0.85, double = true, corners = 'flourish', children, padding = 16, style = {} }) {
  // We do: outer 1px box + inner 1px box + flourish corners
  return (
    <div style={{ position: 'relative', padding, ...style }}>
      {/* Outer hairline */}
      <div style={{
        position: 'absolute', inset: 0,
        border: `1px solid ${color}`, opacity,
        pointerEvents: 'none',
      }}/>
      {/* Inner hairline */}
      {double && <div style={{
        position: 'absolute', inset: 4,
        border: `0.5px solid ${color}`, opacity: opacity * 0.55,
        pointerEvents: 'none',
      }}/>}
      {/* Corner flourishes */}
      {corners === 'flourish' && [['tl', 'top-left'], ['tr', 'top-right'], ['bl', 'bottom-left'], ['br', 'bottom-right']].map(([k]) => (
        <ZCorner key={k} pos={k} color={color} opacity={opacity}/>
      ))}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function ZCorner({ pos = 'tl', color = Z.gold, size = 18, opacity = 0.9 }) {
  // Curlicue corner — single SVG, rotated/flipped per corner
  const transform = {
    tl: 'none',
    tr: 'scaleX(-1)',
    bl: 'scaleY(-1)',
    br: 'scale(-1, -1)',
  }[pos];
  const positionStyle = {
    tl: { top: -1, left: -1 },
    tr: { top: -1, right: -1 },
    bl: { bottom: -1, left: -1 },
    br: { bottom: -1, right: -1 },
  }[pos];
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"
         style={{ position: 'absolute', ...positionStyle, transform, pointerEvents: 'none', opacity }}>
      {/* Tiny floral curl */}
      <path d="M 0 4 L 2 4 Q 4 4 4 2 L 4 0" stroke={color} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M 0 7 L 1.5 7 M 7 0 L 7 1.5" stroke={color} strokeWidth="0.5" strokeLinecap="round"/>
      <circle cx="4" cy="4" r="0.6" fill={color}/>
      <path d="M 0.5 1.5 Q 2 0.5 4.5 0.5" stroke={color} strokeWidth="0.4" fill="none" opacity="0.7"/>
    </svg>
  );
}

// CARTOUCHE — taller arched frame for hero panels (like the references)
function ZCartouche({ children, color = Z.gold, style = {}, height = 'auto', padding = 28 }) {
  return (
    <div style={{ position: 'relative', padding: `${padding+10}px ${padding}px`, ...style }}>
      {/* Border SVG that renders the arched shape */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="cart-stroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={Z.goldHi}/>
            <stop offset="0.5" stopColor={Z.gold}/>
            <stop offset="1" stopColor={Z.goldLo}/>
          </linearGradient>
        </defs>
        {/* Outer */}
        <path d="M 5 8 Q 5 4 10 4 L 42 4 Q 45 4 47 2 Q 50 0 53 2 Q 55 4 58 4 L 90 4 Q 95 4 95 8 L 95 92 Q 95 96 90 96 L 58 96 Q 55 96 53 98 Q 50 100 47 98 Q 45 96 42 96 L 10 96 Q 5 96 5 92 Z"
          fill="none" stroke="url(#cart-stroke)" strokeWidth="0.4" vectorEffect="non-scaling-stroke"/>
        {/* Inner */}
        <path d="M 7 10 Q 7 6 12 6 L 88 6 Q 93 6 93 10 L 93 90 Q 93 94 88 94 L 12 94 Q 7 94 7 90 Z"
          fill="none" stroke="url(#cart-stroke)" strokeWidth="0.25" vectorEffect="non-scaling-stroke" opacity="0.55"/>
      </svg>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// ─── Panel surfaces ───
// Cosmos panel — black w stars, gold frame
function ZPanel({ children, style = {}, hover = false, onClick, withFrame = true, withStars = true, padding = 22, raised = 0 }) {
  const [h, setH] = React.useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{
        position: 'relative',
        background: raised === 1
          ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`
          : `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        boxShadow: hover && h
          ? `0 0 0 1px ${Z.hair2}, 0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`
          : `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 18px rgba(0,0,0,0.5)`,
        transition: 'all .25s',
        cursor: onClick ? 'pointer' : undefined,
        transform: hover && h ? 'translateY(-2px)' : 'translateY(0)',
        overflow: 'hidden',
        ...style,
      }}>
      {withStars && <ZStarfield count={50} color={Z.parch}/>}
      {withFrame && (
        <>
          <div style={{ position: 'absolute', inset: 8, border: `1px solid ${Z.gold}`, opacity: 0.55, pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', inset: 12, border: `0.5px solid ${Z.gold}`, opacity: 0.25, pointerEvents: 'none' }}/>
          <ZCorner pos="tl" color={Z.gold} size={14} opacity={0.8}/>
          <ZCorner pos="tr" color={Z.gold} size={14} opacity={0.8}/>
          <ZCorner pos="bl" color={Z.gold} size={14} opacity={0.8}/>
          <ZCorner pos="br" color={Z.gold} size={14} opacity={0.8}/>
        </>
      )}
      <div style={{ position: 'relative', padding }}>{children}</div>
    </div>
  );
}

// Parchment panel — aged paper background, dark text (used sparingly for contrast)
function ZParchment({ children, style = {}, padding = 22, withFrame = true }) {
  return (
    <div style={{
      position: 'relative',
      background: `radial-gradient(ellipse at 30% 20%, ${Z.parch} 0%, ${Z.parch2} 70%, ${Z.parch3} 100%)`,
      color: Z.inkText,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 60px rgba(120,80,30,0.18), 0 4px 16px rgba(0,0,0,0.5)`,
      overflow: 'hidden',
      ...style,
    }}>
      {/* Subtle paper texture: noise + age stains */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.18, mixBlendMode: 'multiply',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.7'/></svg>")`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', top: '20%', right: '-10%', width: '50%', height: '50%',
        background: `radial-gradient(ellipse, rgba(120,80,30,0.18), transparent 70%)`,
        pointerEvents: 'none',
      }}/>
      {withFrame && (
        <>
          <div style={{ position: 'absolute', inset: 8, border: `0.75px solid ${Z.goldLo}`, opacity: 0.7, pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', inset: 12, border: `0.5px solid ${Z.goldLo}`, opacity: 0.35, pointerEvents: 'none' }}/>
        </>
      )}
      <div style={{ position: 'relative', padding }}>{children}</div>
    </div>
  );
}

// ─── Avatar: zodiac medallion ───
// A circular gold-ringed disk with the user's zodiac glyph etched on it.
function ZAvatar({ name = '?', size = 36, ring = false, sign, src }) {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const s = sign || signOf(name);
  const glyph = ZODIAC_GLYPHS[s] || '✦';

  // Photo path — render the actual avatar image, with the zodiac glyph as
  // a small badge in the bottom-right so the celestial flavour stays.
  if (src) {
    const badgeSize = Math.max(13, Math.round(size * 0.36));
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <img src={src} alt={name} style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          border: `${ring ? 2 : 1}px solid ${ring ? Z.gold : Z.goldLo}`,
          boxShadow: ring
            ? `0 0 ${size * 0.5}px ${Z.goldGlow}, inset 0 0 0 1px rgba(0,0,0,0.4)`
            : `inset 0 0 0 1px rgba(0,0,0,0.4)`,
        }}/>
        {sign !== false && size >= 28 && (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: badgeSize, height: badgeSize,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Z.goldHi, fontFamily: Z.fontDisp,
            fontSize: badgeSize * 0.95, fontWeight: 500, lineHeight: 1,
            pointerEvents: 'none',
          }}>{glyph}</div>
        )}
      </div>
    );
  }

  const hue = (seed * 47) % 360;
  const stoneA = `oklch(0.32 0.06 ${hue})`;
  const stoneB = `oklch(0.18 0.04 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 30% 25%, ${stoneA}, ${stoneB} 70%, #07060a 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: Z.goldHi,
      fontFamily: Z.fontDisp, fontSize: size * 0.5, fontWeight: 400,
      boxShadow: ring
        ? `inset 0 0 0 1px ${Z.gold}, inset 0 0 0 2px rgba(0,0,0,0.6), inset 0 0 0 3px ${Z.goldLo}, 0 0 ${size * 0.5}px ${Z.goldGlow}`
        : `inset 0 0 0 1px ${Z.goldLo}, inset 0 0 0 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,216,150,0.2)`,
      textShadow: `0 0 6px ${Z.goldGlow}`,
      position: 'relative',
    }}>
      <span style={{ filter: `drop-shadow(0 0 4px ${Z.goldGlow})` }}>{glyph}</span>
    </div>
  );
}

// ─── Button: foil ribbon ───
// Primary = gold metallic. Secondary = cosmos with gold border. Ghost = bare.
function ZBtn({ children, variant = 'primary', onClick, icon, iconRight, size = 'md', full, disabled, style = {} }) {
  const [hover, setHover] = React.useState(false);
  const h = size === 'lg' ? 50 : size === 'sm' ? 34 : 42;
  const fs = size === 'lg' ? 14 : size === 'sm' ? 12 : 13;
  const px = size === 'sm' ? 16 : size === 'lg' ? 28 : 22;

  const variants = {
    primary: {
      background: hover
        ? `linear-gradient(180deg, ${Z.goldHi} 0%, ${Z.gold} 50%, ${Z.goldLo} 100%)`
        : `linear-gradient(180deg, ${Z.gold} 0%, #B5882F 60%, ${Z.goldLo} 100%)`,
      color: Z.ink, border: `1px solid ${Z.goldLo}`,
      boxShadow: hover
        ? `inset 0 1px 0 rgba(255,240,200,0.7), 0 0 24px ${Z.goldGlow}, 0 4px 16px rgba(0,0,0,0.5)`
        : `inset 0 1px 0 rgba(255,240,200,0.5), 0 0 12px ${Z.goldGlow}, 0 2px 10px rgba(0,0,0,0.5)`,
    },
    secondary: {
      background: `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`,
      color: Z.text,
      border: `1px solid ${hover ? Z.gold : Z.hair2}`,
      boxShadow: hover ? `0 0 12px ${Z.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    },
    ghost: {
      background: 'transparent', color: Z.text2, border: '1px solid transparent',
    },
    danger: {
      background: 'transparent', color: Z.bad, border: `1px solid ${Z.bad}55`,
    },
  };

  return (
    <button onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: h, padding: `0 ${px}px`,
        ...(disabled ? { background: Z.ink3, color: Z.text4, border: `1px solid ${Z.hair}` } : variants[variant]),
        fontFamily: Z.fontCaps, fontWeight: 500, fontSize: fs, letterSpacing: '0.18em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : undefined,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all .25s', borderRadius: 0,
        position: 'relative',
        ...style,
      }}>
      {icon}{children}{iconRight}
    </button>
  );
}

// ─── Tag — engraved label ───
function ZTag({ children, color = Z.gold, muted = false, glow = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      background: muted ? Z.ink3 : `${color}15`,
      color: muted ? Z.text2 : color,
      fontFamily: Z.fontCaps, fontWeight: 500, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
      border: `1px solid ${muted ? Z.hair : `${color}55`}`,
      boxShadow: glow ? `0 0 14px ${color}55, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ─── Delta indicator ───
function ZDelta({ value }) {
  if (!value) return <span style={{ color: Z.text4, display: 'inline-flex', alignItems: 'center' }}><ZIDash size={12}/></span>;
  const up = value > 0;
  const col = up ? Z.good : Z.bad;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: col, fontFamily: Z.fontCaps, fontSize: 10, letterSpacing: '0.05em' }}>
      {up ? <ZIArrowUp size={11} sw={1.4}/> : <ZIArrowDown size={11} sw={1.4}/>}
      {Math.abs(value)}
    </span>
  );
}

// ─── Counter (animated number) ───
function ZCounter({ value, duration = 800, style }) {
  const [v, setV] = React.useState(value);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current === value) return;
    const from = prev.current, to = value, start = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span style={{ fontVariantNumeric: 'oldstyle-nums tabular-nums', ...style }}>{fmtZ(v)}</span>;
}

// ─── Segmented control (golden ticks) ───
function ZSegmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch',
      background: Z.ink2,
      border: `1px solid ${Z.hair2}`,
      padding: 0,
    }}>
      {options.map((o, i) => {
        const v = o.value ?? o;
        const label = o.label ?? o;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            padding: '8px 16px',
            background: active ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
            color: active ? Z.ink : Z.text2,
            border: 'none',
            borderRight: i < options.length - 1 ? `1px solid ${Z.hair}` : 'none',
            fontFamily: Z.fontCaps, fontWeight: 500, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.3)` : 'none',
            transition: 'all .2s',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ─── Ornate header — "I . THE MAGICIAN" style cartouche label ───
function ZHeader({ numeral, title, subtitle, align = 'center' }) {
  return (
    <div style={{ textAlign: align }}>
      {numeral && (
        <div style={{ ...ZTY.capsLg, color: Z.gold, marginBottom: 8, ...goldFill }}>
          {numeral}
        </div>
      )}
      <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontStyle: 'italic' }}>{title}</h1>
      {subtitle && <div style={{ ...ZTY.body, color: Z.text2, marginTop: 6, fontStyle: 'italic' }}>{subtitle}</div>}
    </div>
  );
}

// Decorative side-flourish (vertical line with diamond, used in headers)
function ZFlourish({ color = Z.gold, height = 80, vertical = true }) {
  if (!vertical) return null;
  return (
    <svg width="14" height={height} viewBox={`0 0 14 ${height}`} fill="none">
      <line x1="7" y1="0" x2="7" y2={height} stroke={color} strokeWidth="0.5" opacity="0.5"/>
      <circle cx="7" cy={height/2} r="2" fill={color}/>
      <path d={`M 4 ${height/2-6} L 7 ${height/2-3} L 10 ${height/2-6} M 4 ${height/2+6} L 7 ${height/2+3} L 10 ${height/2+6}`}
        stroke={color} strokeWidth="0.5" fill="none"/>
    </svg>
  );
}

// Small ornamental "fleuron" between sections
function ZFleuron({ size = 22, color = Z.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="1.5" fill={color}/>
      <path d="M12 6 Q 14 9 12 12 Q 10 9 12 6 Z M12 18 Q 14 15 12 12 Q 10 15 12 18 Z M6 12 Q 9 14 12 12 Q 9 10 6 12 Z M18 12 Q 15 14 12 12 Q 15 10 18 12 Z"
        fill={color} opacity="0.7"/>
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="0.4" opacity="0.5"/>
    </svg>
  );
}

// Logo — radiant sun seal w "ELY" tucked inside
function ZLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id="zlogo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={Z.goldHi}/>
          <stop offset="0.7" stopColor={Z.gold}/>
          <stop offset="1" stopColor={Z.goldLo}/>
        </radialGradient>
      </defs>
      {/* Long rays */}
      {[...Array(16)].map((_, i) => {
        const a = (i/16)*Math.PI*2;
        const long = i % 2 === 0;
        return <line key={i}
          x1={16+Math.cos(a)*9} y1={16+Math.sin(a)*9}
          x2={16+Math.cos(a)*(long?15:12)} y2={16+Math.sin(a)*(long?15:12)}
          stroke="url(#zlogo-glow)" strokeWidth="1" strokeLinecap="round"/>;
      })}
      <circle cx="16" cy="16" r="7" fill={Z.ink} stroke="url(#zlogo-glow)" strokeWidth="1.2"/>
      <text x="16" y="20" textAnchor="middle" fontSize="9" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontWeight="500" fill="url(#zlogo-glow)">E</text>
    </svg>
  );
}

Object.assign(window, {
  ZIcon, ZIHome, ZIRank, ZIStore, ZITrophy, ZIUser, ZIBell, ZISearch, ZIGift, ZIPlus,
  ZIArrowUp, ZIArrowDown, ZIDash, ZIChevR, ZIChevL, ZIX, ZICheck, ZIFlame, ZILock, ZISettings,
  ZSun, ZStarburst, ZMoon, ZEyeSeal, ZConstellation, ZStarfield, ZDivider,
  ZFrame, ZCorner, ZCartouche, ZPanel, ZParchment,
  ZAvatar, ZBtn, ZTag, ZDelta, ZCounter, ZSegmented, ZHeader, ZFlourish, ZFleuron, ZLogo,
});
