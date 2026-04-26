// Icons — 1.5px stroke, geometric
const Icon = ({ children, size = 18, color = 'currentColor', sw = 1.5, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>{children}</svg>
);
const IHome = p => <Icon {...p}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></Icon>;
const IRank = p => <Icon {...p}><path d="M5 21V10M12 21V4M19 21v-7"/></Icon>;
const IStore = p => <Icon {...p}><path d="M4 8h16l-1 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 8V6a4 4 0 0 1 8 0v2"/></Icon>;
const ITrophy = p => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6l-1-4h-4z"/></Icon>;
const IUser = p => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>;
const IBell = p => <Icon {...p}><path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17zM10 20a2 2 0 0 0 4 0"/></Icon>;
const ISearch = p => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></Icon>;
const IGift = p => <Icon {...p}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8s-4-5-6-3 2 3 6 3zM12 8s4-5 6-3-2 3-6 3z"/></Icon>;
const IHeart = p => <Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Icon>;
const IFeed = p => <Icon {...p}><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></Icon>;
const ICompass = p => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m15 9-4 2-2 4 4-2z"/></Icon>;
const IShare = p => <Icon {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></Icon>;
const ICopy = p => <Icon {...p}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></Icon>;
const IHelp = p => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></Icon>;
const IMessage = p => <Icon {...p}><path d="M4 5h16v11H8l-4 4z"/></Icon>;
const IPlus = p => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IArrowUp = p => <Icon {...p}><path d="M7 14l5-5 5 5"/></Icon>;
const IArrowDown = p => <Icon {...p}><path d="M7 10l5 5 5-5"/></Icon>;
const IDash = p => <Icon {...p}><path d="M7 12h10"/></Icon>;
const IChevR = p => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
const IChevL = p => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>;
const IX = p => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>;
const ICheck = p => <Icon {...p}><path d="m5 12 5 5 9-10"/></Icon>;
const IDownload = p => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>;
const IFlame = p => <Icon {...p}><path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5C9 9 10 8 10 6c1.5 1 2 2.5 2 2.5S12 5.5 12 3z"/></Icon>;
const ILock = p => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></Icon>;
const ISparkle = p => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5 8 16M16 8l2.5-2.5"/></Icon>;
const IVoice = p => <Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></Icon>;
const IDumbbell = p => <Icon {...p}><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/></Icon>;
const IBriefcase = p => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></Icon>;
const ISettings = p => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></Icon>;
const ILogOut = p => <Icon {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></Icon>;
const ILang = p => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Icon>;

const ILogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="lgrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={T.accent}/>
        <stop offset="1" stopColor={T.accentHi}/>
      </linearGradient>
    </defs>
    <path d="M12 2 L22 8 V16 L12 22 L2 16 V8 Z" fill="url(#lgrad)" opacity="0.2"/>
    <path d="M12 6 L18 9.5 V14.5 L12 18 L6 14.5 V9.5 Z" fill="url(#lgrad)"/>
    <path d="M12 10 L14 11 V13 L12 14 L10 13 V11 Z" fill="rgba(0,0,0,0.8)"/>
  </svg>
);

// Avatar — glassy with soft inner glow
function Avatar({ name = 'A', size = 32, src, ring, accent }) {
  // Zodiac gate — when zodiac is active, every avatar everywhere becomes the
  // celestial medallion (gold ring + sign glyph badge). Falls back to the
  // initials/photo render below for every other theme.
  if (T.zodiac && window.ZAvatar) {
    return <window.ZAvatar name={name} size={size} src={src} ring={ring}/>;
  }
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const h1 = (seed * 47) % 360;
  const h2 = (h1 + 40) % 360;
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  // Use the split longhand (backgroundImage + backgroundSize) rather than the
  // `background` shorthand — React warns when mixing shorthand with longhand
  // because rerender order can clobber one with the other.
  const bgImage = src ? `url(${src})` : `linear-gradient(140deg, oklch(0.65 0.18 ${h1}), oklch(0.45 0.15 ${h2}))`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: T.fontSans, fontWeight: 600,
      fontSize: size * 0.38, letterSpacing: '-0.02em',
      boxShadow: ring
        ? `inset 0 0 0 1.5px ${accent || T.accent}, 0 0 ${size * 0.6}px ${accent || T.accentGlow}, inset 0 1px 1px rgba(255,255,255,0.3)`
        : `inset 0 0 0 0.5px rgba(255,255,255,0.2), inset 0 1px 1px rgba(255,255,255,0.2)`,
      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }}>{!src && initials}</div>
  );
}

// Button
function Btn({ children, variant = 'primary', onClick, icon, iconRight, size = 'md', full, disabled, style = {} }) {
  // Zodiac gate — every Btn everywhere becomes the foil ribbon variant.
  if (T.zodiac && window.ZBtn) {
    return <window.ZBtn variant={variant} onClick={onClick} icon={icon} iconRight={iconRight}
      size={size} full={full} disabled={disabled} style={style}>{children}</window.ZBtn>;
  }
  const h = size === 'lg' ? 46 : size === 'sm' ? 32 : 38;
  const fs = size === 'lg' ? 15 : size === 'sm' ? 13 : 14;
  // Zodiac branch — solid stamped buttons, no blur, no glow halo. Primary is
  // a flat gold-leaf rectangle with a sharp inset bevel (reads as engraved
  // metal); secondary is midnight stone with a gold hairline; ghost stays
  // transparent but switches to a serif italic for the catolic-cartoon feel.
  // Border-radius collapses to the small tier so corners stop being pillowy.
  const base = T.zodiac ? {
    // Primary: solid gold hairline-ruled rectangle on midnight. No gradient,
    // no bevel, no glow — a clean engraved plaque. Text is cream-gold serif
    // italic; the rectangle reads as part of the tarot frame language.
    primary: {
      background: 'rgba(201,162,74,0.10)',
      color: '#F2D58C',
      border: '1px solid #C9A24A',
      boxShadow: 'none',
      fontFamily: '"Cormorant Garamond","Instrument Serif",serif',
      fontStyle: 'italic',
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    // Secondary: even quieter — transparent on midnight with a dim gold rule.
    secondary: {
      background: 'transparent',
      color: '#C9A24A',
      border: '1px solid rgba(201,162,74,0.50)',
      boxShadow: 'none',
      fontFamily: '"Cormorant Garamond","Instrument Serif",serif',
      fontStyle: 'italic',
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    // Ghost: the "Sign" affordance from the coronation ref — no border, no
    // bg, just serif italic with an underline that feels handwritten.
    ghost: {
      background: 'transparent',
      color: '#F2D58C',
      border: 'transparent',
      borderBottom: '1px solid rgba(242,213,140,0.50)',
      borderRadius: 0,
      fontFamily: '"Cormorant Garamond","Instrument Serif",serif',
      fontStyle: 'italic',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'none',
    },
    // Light: cream parchment plaque (used for opposite-tone CTAs)
    light: {
      background: '#F4E4B8',
      color: '#0A0612',
      border: '1px solid #7A6230',
      boxShadow: 'none',
      fontFamily: '"Cormorant Garamond","Instrument Serif",serif',
      fontStyle: 'italic',
      fontWeight: 600,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
    },
  }[variant] : {
    primary: {
      background: `linear-gradient(180deg, ${T.accentHi}, ${T.accent})`,
      color: '#fff', border: `0.5px solid ${T.accent}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 20px ${T.accentGlow}`,
    },
    secondary: {
      background: 'rgba(255,255,255,0.08)', color: T.text,
      border: `0.5px solid ${T.glassBorder2}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    },
    ghost: { background: 'transparent', color: T.text2, border: 'transparent' },
    light: { background: 'rgba(255,255,255,0.95)', color: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 16px rgba(255,255,255,0.1)' },
  }[variant];
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      height: h, padding: `0 ${size==='sm'?14:18}px`,
      // Pill corners under default theme; under Zodiac we drop to a hairline
      // ruled rectangle (square corners) — a deliberate plaque, not a pill.
      borderRadius: T.zodiac ? 2 : T.r.pill,
      ...(disabled ? { background: 'rgba(255,255,255,0.04)', color: T.text3, border: `0.5px solid ${T.glassBorder}` } : base),
      fontFamily: T.fontSans, fontWeight: 500, fontSize: fs,
      letterSpacing: '-0.005em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      width: full ? '100%' : undefined,
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all .2s cubic-bezier(.4,0,.2,1)', ...style,
    }}
    onMouseOver={e => {
      if (disabled) return;
      if (T.zodiac) {
        // Hover: brighten gold border + slightly lift bg fill. No transform.
        if (variant === 'primary') {
          e.currentTarget.style.background = 'rgba(242,213,140,0.18)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = 'rgba(201,162,74,0.10)';
          e.currentTarget.style.color = '#F2D58C';
        }
      } else {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 28px ${T.accentGlow}`;
      }
    }}
    onMouseOut={e => {
      if (disabled) return;
      if (T.zodiac) {
        if (variant === 'primary') {
          e.currentTarget.style.background = 'rgba(201,162,74,0.10)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#C9A24A';
        }
      } else {
        e.currentTarget.style.transform = 'translateY(0)';
        if (variant === 'primary') e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 20px ${T.accentGlow}`;
      }
    }}
    >{icon}{children}{iconRight}</button>
  );
}

// Tag
function Tag({ children, color, muted = false, glow = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: T.r.pill,
      background: muted ? 'rgba(255,255,255,0.06)' : (color ? `${color}22` : 'rgba(255,255,255,0.06)'),
      color: muted ? T.text2 : (color || T.text),
      fontFamily: T.fontSans, fontWeight: 500, fontSize: 11, letterSpacing: '0.02em',
      border: `0.5px solid ${muted ? T.glassBorder : (color ? `${color}55` : T.glassBorder)}`,
      boxShadow: glow && color ? `0 0 20px ${color}55, inset 0 1px 0 rgba(255,255,255,0.15)` : 'inset 0 1px 0 rgba(255,255,255,0.08)',
      whiteSpace: 'nowrap', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>{children}</span>
  );
}

function Delta({ value }) {
  if (!value) return <span style={{ color: T.text4, display: 'inline-flex', alignItems: 'center' }}><IDash size={14}/></span>;
  const up = value > 0;
  const col = up ? T.green : T.red;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: col, fontFamily: T.fontMono, fontSize: 11, fontWeight: 500 }}>
      {up ? <IArrowUp size={12} sw={2}/> : <IArrowDown size={12} sw={2}/>}
      {Math.abs(value)}
    </span>
  );
}

function Counter({ value, duration = 800, style }) {
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
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{fmt(v)}</span>;
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `0.5px solid ${T.glassBorder}`,
      borderRadius: T.r.pill, padding: 3,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {options.map(o => {
        const v = o.value ?? o;
        const label = o.label ?? o;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            padding: '6px 14px', borderRadius: T.r.pill,
            background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
            boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 8px rgba(0,0,0,0.2)' : 'none',
            border: 'none',
            color: active ? T.text : T.text2,
            fontFamily: T.fontSans, fontWeight: 500, fontSize: 13,
            cursor: 'pointer', transition: 'all .2s',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// Glass card wrapper — base for all surfaces
function Glass({ children, style = {}, hover = false, onClick, level = 1, ...rest }) {
  return (
    <div {...rest} onClick={onClick} style={{
      ...glass(level),
      ...style,
      cursor: onClick ? 'pointer' : undefined,
      transition: 'all .25s cubic-bezier(.4,0,.2,1)',
    }}
    onMouseOver={hover ? (e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `inset 0 1px 0 ${T.glassHi}, 0 16px 50px rgba(0,0,0,0.45)`;
      e.currentTarget.style.borderColor = T.glassBorder2;
    } : undefined}
    onMouseOut={hover ? (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `inset 0 1px 0 ${T.glassHi}, 0 10px 40px rgba(0,0,0,0.35)`;
      e.currentTarget.style.borderColor = T.glassBorder;
    } : undefined}
    >{children}</div>
  );
}

Object.assign(window, {
  Icon, IHome, IRank, IStore, ITrophy, IUser, IBell, ISearch, IGift, IHeart, IFeed, ICompass, IShare, ICopy, IHelp, IMessage, IPlus,
  IArrowUp, IArrowDown, IDash, IChevR, IChevL, IX, ICheck, IFlame,
  ILock, ISparkle, IVoice, IDumbbell, IBriefcase, ILogo, ISettings,
  ILogOut, ILang,
  Avatar, Btn, Tag, Delta, Counter, Segmented, Glass,
});
