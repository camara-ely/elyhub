// ElyHub — Glassmorphism web desktop

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

// ────────────── Ambient gradient background ──────────────
function AmbientBG({ theme }) {
  const t = THEMES[theme] || THEMES.blue;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: t.bg, transition: 'background 0.8s' }}/>
      {/* Ambient orbs */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%',
        width: '65vw', height: '65vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${t.orb1}cc 0%, ${t.orb1}44 35%, transparent 65%)`,
        filter: 'blur(90px)', animation: 'orb1 24s ease-in-out infinite',
        transition: 'background 0.8s',
      }}/>
      <div style={{
        position: 'absolute', bottom: '-25%', right: '-15%',
        width: '75vw', height: '75vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${t.orb2}99 0%, ${t.orb2}33 40%, transparent 65%)`,
        filter: 'blur(110px)', animation: 'orb2 30s ease-in-out infinite',
        transition: 'background 0.8s',
      }}/>
      <div style={{
        position: 'absolute', top: '40%', left: '35%',
        width: '45vw', height: '45vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${t.orb3}77 0%, transparent 60%)`,
        filter: 'blur(90px)', animation: 'orb3 20s ease-in-out infinite',
        transition: 'background 0.8s',
      }}/>
      {/* Grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.8'/></svg>")`,
      }}/>
    </div>
  );
}

// ────────────── Shell ──────────────
function Shell({ view, setView, state, onQuick, children }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: T.text, fontFamily: T.fontSans }}>
      <AmbientBG theme={T.theme || 'blue'}/>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
        <Sidebar view={view} setView={setView} state={state} onQuick={onQuick}/>
        <main style={{ flex: 1, minWidth: 0 }}>
          <Topbar state={state} onQuick={onQuick} onNotif={() => setNotifOpen(true)}/>
          <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 48px 80px' }}>
            {children}
          </div>
        </main>
      </div>
      {notifOpen && <NotifDrawer onClose={() => setNotifOpen(false)}/>}
    </div>
  );
}

function Sidebar({ view, setView, state, onQuick }) {
  const items = [
    { id: 'home',        label: 'Home',        icon: <IHome/> },
    { id: 'leaderboard', label: 'Ranking',     icon: <IRank/> },
    { id: 'store',       label: 'Store',       icon: <IStore/> },
    { id: 'trophies',    label: 'Trophies',    icon: <ITrophy/> },
    { id: 'profile',     label: 'Profile',     icon: <IUser/> },
  ];
  const pct = Math.round(((state.aura - ME.prevLevelAura)/(ME.nextLevelAura - ME.prevLevelAura))*100);
  return (
    <aside style={{
      width: 240, flexShrink: 0, padding: 20,
      position: 'sticky', top: 0, height: '100vh',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 20px' }}>
        <ILogo size={28}/>
        <span style={{ fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 24, letterSpacing: '-0.02em' }}>
          Ely<span style={{ color: T.accentHi }}>Hub</span>
        </span>
      </div>

      <Glass style={{ padding: 6, flexShrink: 0 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(it => {
            const active = view.id === it.id;
            return (
              <button key={it.id} onClick={() => setView({ id: it.id })} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: T.r.md,
                background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                border: 'none',
                color: active ? T.text : T.text2,
                fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all .15s',
              }}>
                {React.cloneElement(it.icon, { size: 17, color: active ? T.accentHi : 'currentColor' })}
                {it.label}
              </button>
            );
          })}
        </nav>
      </Glass>

      <div style={{ flex: 1 }}/>

      <Glass style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ ...TY.micro, color: T.text3 }}>Balance</div>
          <button onClick={onQuick?.settings} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text3, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Settings">
            <ISettings size={12}/>
          </button>
        </div>
        <div style={{ ...TY.numMed, color: T.text, fontSize: 28 }}><Counter value={state.aura}/></div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>aura · L{state.level}</div>
        <div style={{ marginTop: 12, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${T.accent}, ${T.accentHi})`,
            boxShadow: `0 0 8px ${T.accentGlow}`,
            transition: 'width .8s',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{pct}%</span>
          <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>→ L{state.level+1}</span>
        </div>
      </Glass>
    </aside>
  );
}

function Topbar({ state, onQuick, onNotif }) {
  return (
    <div style={{
      height: 76, padding: '20px 48px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Glass style={{ flex: 1, maxWidth: 440, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: T.r.pill }}>
        <ISearch size={15} color={T.text3}/>
        <input placeholder="Search members, rewards, trophies…" style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: T.text, fontFamily: T.fontSans, fontSize: 13,
        }}/>
        <span style={{ ...TY.mono, color: T.text3, padding: '2px 7px', border: `0.5px solid ${T.glassBorder}`, borderRadius: 5, background: 'rgba(255,255,255,0.05)' }}>⌘K</span>
      </Glass>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn variant="secondary" icon={<IGift size={15}/>} size="sm" onClick={onQuick.gift}>Gift</Btn>
        <button onClick={onNotif} style={{
          width: 38, height: 38, borderRadius: '50%',
          ...glass(1, { padding: 0 }),
          color: T.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <IBell size={16}/>
          <span style={{
            position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%',
            background: T.accentHi, boxShadow: `0 0 8px ${T.accent}`,
          }}/>
        </button>
        <Glass style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 14px 5px 5px', borderRadius: T.r.pill }}>
          <Avatar name={ME.name} size={28} ring/>
          <span style={{ ...TY.small, color: T.text, fontWeight: 500 }}>{ME.name.split(' ')[0]}</span>
        </Glass>
      </div>
    </div>
  );
}

// ────────────── Home ──────────────
function HomeView({ state, setState, setView, onQuick }) {
  const claim = (key, amount) => setState(s => ({ ...s, aura: s.aura + amount, [`${key}Claimed`]: true }));
  const pct = Math.round(((state.aura - ME.prevLevelAura)/(ME.nextLevelAura - ME.prevLevelAura))*100);
  const top = [...MEMBERS].sort((a,b) => b.aura - a.aura).slice(0, 6);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }} className="ely-home-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Weekly identity banner */}
        <Glass style={{ padding: 0, position: 'relative', overflow: 'hidden', height: 200 }}>
          <img src="assets/ely-lettering.png" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(5,9,26,0.7) 100%)',
          }}/>
          <div style={{ position: 'absolute', left: 24, bottom: 20, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ ...TY.micro, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Week 17 · Identity</div>
              <div style={{ ...TY.h3, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Fluffy Ely</div>
            </div>
            <Tag muted>Updated weekly</Tag>
          </div>
        </Glass>
        {/* Hero */}
        <Glass style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: -100, right: -60, width: 320, height: 320, borderRadius: '50%',
            background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`,
            filter: 'blur(20px)', pointerEvents: 'none',
          }}/>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 12 }}>Hoje · Tuesday, April 22</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 6 }}>
            <div style={{ ...TY.numLarge, color: T.text, textShadow: `0 0 40px ${T.accentGlow}` }}>
              <Counter value={state.aura}/>
            </div>
            <div style={{ paddingBottom: 18 }}>
              <div style={{ ...TY.body, color: T.text3 }}>aura</div>
              <div style={{ ...TY.small, color: T.accentHi, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <IArrowUp size={12} sw={2}/> +1,240 today
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...TY.small, color: T.text3, marginBottom: 8 }}>
                <span>Level {state.level}</span>
                <span>{pct}% to {state.level+1}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${T.accent}, ${T.accentHi})`,
                  boxShadow: `0 0 12px ${T.accentGlow}`, transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                }}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color={T.accentHi} glow><IFlame size={11}/> {state.streak}-day streak</Tag>
              <Tag muted>Rank #{state.rank}</Tag>
            </div>
          </div>
        </Glass>

        {/* Claims */}
        <section>
          <SectionTitle label="Daily claims" meta={`${2-(state.tagClaimed?1:0)-(state.boostClaimed?1:0)} available`}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ClaimCard label="ELY tag bonus" icon={<ISparkle size={18}/>} amount={300} cooldown="18h 12m" claimed={state.tagClaimed} onClaim={() => claim('tag', 300)}/>
            <ClaimCard label="Server boost"   icon={<IFlame size={18}/>}   amount={500} cooldown="22h 30m" claimed={state.boostClaimed} onClaim={() => claim('boost', 500)}/>
          </div>
        </section>

        {/* Leaderboard preview */}
        <section>
          <SectionTitle label="Ranking" meta="Today" action={<button onClick={() => setView({ id: 'leaderboard' })} style={linkStyle}>View all <IChevR size={12}/></button>}/>
          <Glass style={{ overflow: 'hidden', padding: 6 }}>
            {top.slice(0, 5).map((u, i) => (
              <RankRow key={u.id} rank={i+1} user={u} isMe={u.id === 'me'}/>
            ))}
          </Glass>
        </section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <FeaturedDrop onQuick={onQuick}/>
        <section>
          <SectionTitle label="Aura feed" meta={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.green }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }}/>Live</span>}/>
          <Glass style={{ padding: '4px 18px' }}>
            {FEED.map((f, i) => <FeedItem key={i} f={f} last={i === FEED.length - 1}/>)}
          </Glass>
        </section>

        <section>
          <SectionTitle label="Your trophies" action={<button onClick={() => setView({ id: 'trophies' })} style={linkStyle}>All <IChevR size={12}/></button>}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {TROPHIES.slice(0,3).map(t => <MiniTrophy key={t.id} t={t}/>)}
          </div>
        </section>
      </div>
    </div>
  );
}

const linkStyle = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: T.accentHi, fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 3, padding: 0,
};

function SectionTitle({ label, meta, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ ...TY.h3, margin: 0, color: T.text }}>{label}</h2>
        {meta && <span style={{ ...TY.small, color: T.text3 }}>{meta}</span>}
      </div>
      {action}
    </div>
  );
}

function ClaimCard({ label, icon, amount, cooldown, claimed, onClaim }) {
  return (
    <Glass hover={!claimed} onClick={claimed ? undefined : onClaim} style={{
      padding: 20, position: 'relative', overflow: 'hidden',
      opacity: claimed ? 0.55 : 1,
    }}>
      {!claimed && <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`, pointerEvents: 'none',
      }}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: claimed ? 'rgba(255,255,255,0.05)' : `${T.accent}33`,
          border: `0.5px solid ${claimed ? T.glassBorder : T.accent + '66'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: claimed ? T.text3 : T.accentHi,
        }}>{icon}</div>
        <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{claimed ? `Claimed · ${cooldown}` : 'Available'}</span>
      </div>
      <div style={{ ...TY.body, color: T.text2, marginBottom: 6, position: 'relative' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, position: 'relative' }}>
        <span style={{ ...TY.numMed, color: claimed ? T.text3 : T.text }}>+{amount}</span>
        <span style={{ ...TY.small, color: T.text3 }}>aura</span>
      </div>
    </Glass>
  );
}

function RankRow({ rank, user, isMe }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 14px', borderRadius: 12,
      background: isMe ? `${T.accent}18` : 'transparent',
      border: isMe ? `0.5px solid ${T.accent}44` : '0.5px solid transparent',
      marginBottom: 2, transition: 'all .15s',
    }}>
      <div style={{ width: 24, ...TY.mono, color: rank <= 3 ? T.accentHi : T.text3, fontSize: 11 }}>
        {String(rank).padStart(2, '0')}
      </div>
      <Avatar name={user.name} size={34} ring={rank === 1}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{user.name}</span>
          {isMe && <Tag color={T.accentHi} glow>You</Tag>}
        </div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>L{user.level} · {user.role}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...TY.numSm, color: T.text }}>{fmt(user.aura)}</div>
        <div style={{ marginTop: 3 }}><Delta value={user.delta}/></div>
      </div>
    </div>
  );
}

function FeaturedDrop({ onQuick }) {
  return (
    <Glass style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', bottom: -80, left: -40, width: 260, height: 260, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 60%)`, pointerEvents: 'none',
      }}/>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, position: 'relative' }}>
        <Tag color={T.accentHi} glow>New drop</Tag>
        <Tag muted>6 left</Tag>
      </div>
      <div style={{
        height: 140, borderRadius: T.r.md, marginBottom: 14,
        background: `linear-gradient(135deg, ${T.accent}44, rgba(255,255,255,0.04))`,
        border: `0.5px solid ${T.glassBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.text3, fontFamily: T.fontMono, fontSize: 11,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,0.02) 18px 19px)` }}/>
        <span style={{ position: 'relative' }}>hoodie.product.png</span>
      </div>
      <h3 style={{ ...TY.h3, margin: 0, color: T.text, position: 'relative' }}>ElyHub Hoodie</h3>
      <p style={{ ...TY.small, color: T.text3, margin: '4px 0 16px', position: 'relative' }}>Drop 03 · Charcoal · Limited run</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div>
          <span style={{ ...TY.numSm, color: T.accentHi, fontSize: 18 }}>25,000</span>
          <span style={{ ...TY.small, color: T.text3, marginLeft: 4 }}>aura</span>
        </div>
        <Btn variant="primary" size="sm" onClick={() => onQuick.redeem(REWARDS[5])}>Redeem</Btn>
      </div>
    </Glass>
  );
}

function FeedItem({ f, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 0',
      borderBottom: last ? 'none' : `0.5px solid ${T.glassBorder}`,
    }}>
      <Avatar name={f.who} size={30}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.small, color: T.text2, lineHeight: 1.35 }}>
          <span style={{ color: T.text, fontWeight: 500 }}>{f.who.split(' ')[0]}</span>
          <span style={{ margin: '0 4px' }}>→</span>
          <span style={{ color: T.text, fontWeight: 500 }}>{f.to.split(' ')[0]}</span>
        </div>
        {f.note && <div style={{ ...TY.small, color: T.text3, marginTop: 1, fontSize: 12 }}>"{f.note}"</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...TY.numSm, color: T.accentHi, fontSize: 13 }}>+{fmt(f.amount)}</div>
        <div style={{ ...TY.small, color: T.text4, fontSize: 10 }}>{f.time}</div>
      </div>
    </div>
  );
}

function MiniTrophy({ t }) {
  return (
    <Glass style={{ padding: 14, opacity: t.unlocked ? 1 : 0.45, overflow: 'hidden', position: 'relative' }}>
      {t.unlocked && <div style={{
        position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`, pointerEvents: 'none',
      }}/>}
      <div style={{
        width: 34, height: 34, borderRadius: 10, marginBottom: 12,
        background: t.unlocked ? `${T.accent}33` : 'rgba(255,255,255,0.05)',
        border: `0.5px solid ${t.unlocked ? T.accent + '66' : T.glassBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.unlocked ? T.accentHi : T.text3, position: 'relative',
      }}><ITrophy size={16}/></div>
      <div style={{ ...TY.small, color: T.text, fontWeight: 500, lineHeight: 1.25, position: 'relative' }}>{t.name}</div>
      <div style={{ ...TY.small, color: T.text3, marginTop: 3, fontSize: 11 }}>{t.unlocked ? 'Earned' : `${Math.round(t.progress/t.total*100)}%`}</div>
    </Glass>
  );
}

// ────────────── Leaderboard ──────────────
function LeaderboardView({ state }) {
  const [category, setCategory] = React.useState('overall');
  const [window_, setWindow] = React.useState('week');
  const mult = { overall: 1, gym: 0.8, deals: 1.2, voice: 0.9 }[category] || 1;
  const winMult = { today: 0.05, week: 0.3, month: 0.6, all: 1 }[window_];
  const ordered = React.useMemo(() => [...MEMBERS].map(u => ({
    ...u, aura: Math.round(u.aura * mult * winMult),
  })).sort((a,b) => b.aura - a.aura), [mult, winMult]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Ranking</div>
          <h1 style={{ ...TY.h1, margin: 0 }}>The climb<span style={{ color: T.accentHi }}>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Segmented value={category} onChange={setCategory} options={[
            { value: 'overall', label: 'Overall' }, { value: 'gym', label: 'Gym' },
            { value: 'deals', label: 'Deals' }, { value: 'voice', label: 'Voice' },
          ]}/>
          <Segmented value={window_} onChange={setWindow} options={[
            { value: 'today', label: 'Today' }, { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' }, { value: 'all', label: 'All' },
          ]}/>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        {ordered.slice(0,3).map((u, i) => {
          const medal = ['#FFB84D', '#D0D5DB', '#C77D4D'][i];
          return (
            <Glass key={u.id} style={{
              padding: 22, position: 'relative', overflow: 'hidden',
              transform: i === 0 ? 'translateY(-6px)' : 'none',
              borderColor: i === 0 ? `${T.accent}55` : T.glassBorder,
            }}>
              {i === 0 && <div style={{
                position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%',
                background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`,
              }}/>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: medal, color: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.fontMono, fontSize: 12, fontWeight: 600,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px ${medal}55`,
                }}>{i+1}</div>
                <Delta value={u.delta}/>
              </div>
              <Avatar name={u.name} size={56} ring={i === 0}/>
              <div style={{ ...TY.h3, margin: '14px 0 4px', position: 'relative' }}>{u.name}</div>
              <div style={{ ...TY.small, color: T.text3, marginBottom: 16 }}>@{u.tag} · L{u.level}</div>
              <div style={{ ...TY.numMed, color: i === 0 ? T.accentHi : T.text, fontSize: 26, position: 'relative' }}>{fmt(u.aura)}</div>
              <div style={{ ...TY.small, color: T.text3 }}>aura</div>
            </Glass>
          );
        })}
      </div>

      <Glass style={{ padding: 6, overflow: 'hidden' }}>
        {ordered.slice(3).map((u, i) => (
          <RankRow key={u.id} rank={i+4} user={u} isMe={u.id === 'me'}/>
        ))}
      </Glass>
    </div>
  );
}

// ────────────── Store ──────────────
function StoreView({ state, onQuick }) {
  const [cat, setCat] = React.useState('All');
  const cats = ['All', 'Software', 'Club', 'Merch', 'Cards', 'Events'];
  const items = cat === 'All' ? REWARDS : REWARDS.filter(r => r.category === cat);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Store</div>
          <h1 style={{ ...TY.h1, margin: 0 }}>Redeem your aura<span style={{ color: T.accentHi }}>.</span></h1>
        </div>
        <Glass style={{ padding: '14px 22px', textAlign: 'right' }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>Balance</div>
          <div style={{ ...TY.numMed, color: T.accentHi }}>{fmt(state.aura)}</div>
        </Glass>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {cats.map(c => {
          const active = cat === c;
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '8px 16px', borderRadius: T.r.pill,
              background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
              color: active ? '#0a0a0a' : T.text2,
              border: `0.5px solid ${active ? 'transparent' : T.glassBorder}`,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              fontFamily: T.fontSans, fontWeight: 500, fontSize: 13, cursor: 'pointer',
              boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.8)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'all .2s',
            }}>{c}</button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {items.map(r => <RewardCard key={r.id} r={r} state={state} onRedeem={() => onQuick.redeem(r)}/>)}
      </div>
    </div>
  );
}

function RewardCard({ r, state, onRedeem }) {
  const locked = state.level < r.level;
  const hues = { Software: '#7FB0FF', Club: T.accentHi, Merch: '#C89DFF', Cards: '#5FD99A', Events: '#FFD166' };
  const hue = hues[r.category] || T.accent;
  return (
    <Glass hover={!locked} style={{ padding: 16, opacity: locked ? 0.55 : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        aspectRatio: '4/3', borderRadius: T.r.md, marginBottom: 14, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${hue}55, rgba(255,255,255,0.02))`,
        border: `0.5px solid ${T.glassBorder}`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 15px)` }}/>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.text3, fontFamily: T.fontMono, fontSize: 11,
        }}>{r.title.split(' ')[0].toLowerCase()}.png</div>
        {r.stock <= 5 && <span style={{ position: 'absolute', top: 10, left: 10 }}><Tag color={T.accentHi} glow>{r.stock} left</Tag></span>}
      </div>
      <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{r.title}</div>
      <div style={{ ...TY.small, color: T.text3, marginTop: 2, marginBottom: 14, flex: 1 }}>{r.sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...TY.numSm, color: T.text, fontSize: 15 }}>{fmt(r.price)}</div>
          <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>aura</div>
        </div>
        {locked
          ? <Tag muted><ILock size={11}/>&nbsp;L{r.level}</Tag>
          : <Btn variant="secondary" size="sm" onClick={onRedeem}>Redeem</Btn>}
      </div>
    </Glass>
  );
}

// ────────────── Trophies ──────────────
function TrophiesView() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Trophies</div>
        <h1 style={{ ...TY.h1, margin: 0 }}>Earned on the way up<span style={{ color: T.accentHi }}>.</span></h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {TROPHIES.map(t => (
          <Glass key={t.id} hover style={{ padding: 20, opacity: t.unlocked ? 1 : 0.5, overflow: 'hidden', position: 'relative' }}>
            {t.unlocked && <div style={{
              position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%',
              background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`,
            }}/>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: t.unlocked ? `linear-gradient(135deg, ${T.accent}44, ${T.accent}22)` : 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${t.unlocked ? `${T.accent}66` : T.glassBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.unlocked ? T.accentHi : T.text3,
                boxShadow: t.unlocked ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px ${T.accentGlow}` : 'none',
              }}><ITrophy size={22}/></div>
              {!t.unlocked && <ILock size={14} color={T.text3}/>}
            </div>
            <div style={{ ...TY.body, color: T.text, fontWeight: 500, position: 'relative' }}>{t.name}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 4, marginBottom: 16, minHeight: 32 }}>{t.desc}</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${(t.progress/t.total)*100}%`, height: '100%',
                background: t.unlocked ? `linear-gradient(90deg, ${T.accent}, ${T.accentHi})` : T.text3,
                boxShadow: t.unlocked ? `0 0 8px ${T.accentGlow}` : 'none',
              }}/>
            </div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 8, fontFamily: T.fontMono, fontSize: 11 }}>
              {fmt(t.progress)} / {fmt(t.total)}
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

// ────────────── Profile ──────────────
function ProfileView({ state, onQuick }) {
  const points = [15, 18, 22, 24, 27, 28, 31, 32];
  const max = Math.max(...points);
  const W = 600, H = 140;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i/(points.length-1))*W} ${H - (p/max)*H*0.85}`).join(' ');

  return (
    <div>
      <Glass style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -100, left: -80, width: 360, height: 360, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`, pointerEvents: 'none',
        }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', flexWrap: 'wrap' }}>
          <Avatar name={ME.name} size={96} ring/>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ ...TY.h1, margin: 0 }}>{ME.name}</h1>
            <div style={{ ...TY.body, color: T.text3, marginTop: 4 }}>@{ME.tag} · Joined Mar 2024</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {ME.roles.map(r => <Tag key={r} color={T.accentHi}>{r}</Tag>)}
            </div>
          </div>
          <Btn variant="primary" icon={<IGift size={15}/>} onClick={onQuick.gift}>Gift aura</Btn>
        </div>
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCell label="Lifetime" value={fmt(state.aura * 3)}/>
        <StatCell label="Level" value={state.level} suffix={`/${state.level+1}`}/>
        <StatCell label="Rank" value={`#${state.rank}`}/>
        <StatCell label="Streak" value={state.streak} suffix="days"/>
      </div>

      <Glass style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ ...TY.h3, margin: 0 }}>Level history</h3>
          <span style={{ ...TY.small, color: T.text3 }}>Last 8 weeks</span>
        </div>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={T.accent} stopOpacity="0.4"/>
              <stop offset="1" stopColor={T.accent} stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="histStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={T.accent}/>
              <stop offset="1" stopColor={T.accentHi}/>
            </linearGradient>
          </defs>
          <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#hist)"/>
          <path d={path} fill="none" stroke="url(#histStroke)" strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${T.accentGlow})` }}/>
          {points.map((p, i) => <circle key={i} cx={(i/(points.length-1))*W} cy={H - (p/max)*H*0.85} r={i === points.length-1 ? 5 : 2.5} fill={T.accentHi}/>)}
        </svg>
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Glass style={{ padding: 28 }}>
          <h3 style={{ ...TY.h3, margin: '0 0 18px' }}>Aura flow</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text3, marginBottom: 4 }}>Given</div>
              <div style={{ ...TY.numMed, color: T.text }}>{fmt(32500)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text3, marginBottom: 4 }}>Received</div>
              <div style={{ ...TY.numMed, color: T.accentHi }}>{fmt(18240)}</div>
            </div>
          </div>
        </Glass>

        <Glass style={{ padding: 28 }}>
          <h3 style={{ ...TY.h3, margin: '0 0 18px' }}>Recent trophies</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {TROPHIES.slice(0,3).map(t => <MiniTrophy key={t.id} t={t}/>)}
          </div>
        </Glass>
      </div>
    </div>
  );
}

function StatCell({ label, value, suffix }) {
  return (
    <Glass style={{ padding: 20 }}>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ ...TY.numMed, color: T.text }}>{value}</span>
        {suffix && <span style={{ ...TY.small, color: T.text3 }}>{suffix}</span>}
      </div>
    </Glass>
  );
}

// ────────────── Modals ──────────────
function Modal({ children, onClose, width = 440 }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glass(2, {
          width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
          borderRadius: T.r.xl, padding: 28,
          animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.15)',
        }),
      }}>{children}</div>
    </div>
  );
}

function GiftModal({ state, onClose, onSend }) {
  const [friend, setFriend] = React.useState(null);
  const [amount, setAmount] = React.useState(500);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const preset = [100, 500, 1000, 2500, 5000];

  if (sent) return (
    <Modal onClose={onClose} width={400}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
          background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}><ICheck size={26} color="#fff" sw={2}/></div>
        <h2 style={{ ...TY.h2, margin: 0 }}>Sent</h2>
        <p style={{ ...TY.body, color: T.text3, marginTop: 6 }}>{fmt(amount)} aura → {friend.name}</p>
        <div style={{ marginTop: 24 }}><Btn variant="primary" full onClick={onClose}>Done</Btn></div>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ ...TY.h2, margin: 0 }}>Gift aura</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={18}/></button>
      </div>

      {!friend ? (
        <>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>To</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 360, overflowY: 'auto' }}>
            {MEMBERS.filter(m => m.id !== 'me').map(m => (
              <button key={m.id} onClick={() => setFriend(m)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 8px', borderRadius: T.r.md, display: 'flex', alignItems: 'center', gap: 12, color: T.text, textAlign: 'left',
                transition: 'background .15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar name={m.name} size={36}/>
                <div style={{ flex: 1 }}>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ ...TY.small, color: T.text3 }}>@{m.tag}</div>
                </div>
                <IChevR size={14} color={T.text3}/>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setFriend(null)} style={{ background: 'transparent', border: 'none', color: T.accentHi, cursor: 'pointer', ...TY.small, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>
            <IChevL size={14}/> Back
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 14, background: 'rgba(255,255,255,0.04)',
            borderRadius: T.r.md, border: `0.5px solid ${T.glassBorder}`, marginBottom: 20,
          }}>
            <Avatar name={friend.name} size={40}/>
            <div>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{friend.name}</div>
              <div style={{ ...TY.small, color: T.text3 }}>@{friend.tag}</div>
            </div>
          </div>

          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Amount</div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ ...TY.numLarge, fontSize: 60, color: T.text, textShadow: `0 0 40px ${T.accentGlow}` }}>{fmt(amount)}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>aura</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
            {preset.map(p => (
              <button key={p} onClick={() => setAmount(p)} style={{
                padding: '6px 14px', borderRadius: T.r.pill,
                background: amount === p ? `${T.accent}33` : 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${amount === p ? T.accent : T.glassBorder}`,
                color: amount === p ? T.accentHi : T.text2,
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                boxShadow: amount === p ? `0 0 12px ${T.accentGlow}` : 'none',
              }}>{fmt(p)}</button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" style={{
            width: '100%', padding: 14, background: 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${T.glassBorder}`, borderRadius: T.r.md,
            color: T.text, fontFamily: T.fontSans, fontSize: 14, outline: 'none',
            marginBottom: 20, boxSizing: 'border-box',
          }}/>
          <Btn variant="primary" full size="lg" onClick={() => { onSend(friend, amount); setSent(true); }} disabled={amount > state.aura}>
            Send {fmt(amount)} aura
          </Btn>
        </>
      )}
    </Modal>
  );
}

function RedeemModal({ reward, state, onClose, onConfirm }) {
  const [stage, setStage] = React.useState('confirm');
  if (!reward) return null;
  return (
    <Modal onClose={onClose}>
      {stage === 'confirm' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ ...TY.h2, margin: 0 }}>Redeem</h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={18}/></button>
          </div>
          <div style={{
            display: 'flex', gap: 14, padding: 14,
            background: 'rgba(255,255,255,0.04)', borderRadius: T.r.md,
            marginBottom: 20, border: `0.5px solid ${T.glassBorder}`,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: T.r.sm,
              background: `linear-gradient(135deg, ${T.accent}44, rgba(255,255,255,0.04))`,
              border: `0.5px solid ${T.glassBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.text3, fontFamily: T.fontMono, fontSize: 9,
            }}>img</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{reward.title}</div>
              <div style={{ ...TY.small, color: T.text3 }}>{reward.sub}</div>
            </div>
          </div>
          <Row k="Price" v={`${fmt(reward.price)} aura`}/>
          <Row k="Balance after" v={`${fmt(state.aura - reward.price)} aura`}/>
          <Row k="Delivery" v="Code via Discord DM" last/>
          <div style={{ marginTop: 24 }}>
            <Btn variant="primary" full size="lg" onClick={() => setStage('success')}>Confirm redemption</Btn>
          </div>
        </>
      )}
      {stage === 'success' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
            background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}><ICheck size={26} color="#fff" sw={2}/></div>
          <h2 style={{ ...TY.h2, margin: 0 }}>Redeemed</h2>
          <p style={{ ...TY.body, color: T.text3, marginTop: 6 }}>Your code is in your Discord DMs.</p>
          <div style={{
            padding: '16px 20px', borderRadius: T.r.md,
            background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder2}`,
            margin: '20px 0', fontFamily: T.fontMono, fontSize: 16, letterSpacing: '0.12em', color: T.accentHi,
            textShadow: `0 0 12px ${T.accentGlow}`,
          }}>ELY-K9XP-742M</div>
          <Btn variant="primary" full onClick={() => { onConfirm(); onClose(); }}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: last ? 'none' : `0.5px solid ${T.glassBorder}` }}>
      <span style={{ ...TY.body, color: T.text3 }}>{k}</span>
      <span style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function NotifDrawer({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 20, right: 20, bottom: 20, width: 380,
        ...glass(2, {
          padding: 24, overflowY: 'auto', borderRadius: T.r.xl,
          animation: 'slideInR .3s cubic-bezier(.2,.9,.3,1.05)',
        }),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...TY.h2, margin: 0 }}>Inbox</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={18}/></button>
        </div>
        {NOTIFICATIONS.map(n => (
          <div key={n.id} style={{
            padding: '14px 0', borderBottom: `0.5px solid ${T.glassBorder}`,
            display: 'flex', gap: 12, position: 'relative',
          }}>
            {n.unread && <span style={{
              position: 'absolute', left: -10, top: 22, width: 6, height: 6, borderRadius: '50%',
              background: T.accentHi, boxShadow: `0 0 8px ${T.accent}`,
            }}/>}
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{n.title}</div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{n.time} ago</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────── Settings ──────────────
function SettingsModal({ onClose }) {
  const [section, setSection] = React.useState('account');
  const [push, setPush] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [gifts, setGifts] = React.useState(true);
  const [drops, setDrops] = React.useState(true);
  const [ranking, setRanking] = React.useState(false);
  const [theme, setTheme] = React.useState('auto');
  const [lang, setLang] = React.useState('en');
  const [privacy, setPrivacy] = React.useState('public');

  const sections = [
    { id: 'account',  label: 'Account',       icon: <IUser/> },
    { id: 'notif',    label: 'Notifications', icon: <IBell/> },
    { id: 'appear',   label: 'Appearance',    icon: <ISparkle/> },
    { id: 'privacy',  label: 'Privacy',       icon: <ILock/> },
    { id: 'about',    label: 'About',         icon: <ICheck/> },
  ];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glass(2, {
          width: 780, maxWidth: '100%', height: 560, maxHeight: '90vh',
          borderRadius: T.r.xl, padding: 0, display: 'flex', overflow: 'hidden',
          animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.15)',
        }),
      }}>
        {/* Sidebar */}
        <div style={{ width: 220, padding: 20, borderRight: `0.5px solid ${T.glassBorder}`, background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ ...TY.h3, fontSize: 17 }}>Settings</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={16}/></button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(s => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: T.r.md,
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none', color: active ? T.text : T.text2,
                  fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {React.cloneElement(s.icon, { size: 15, color: active ? T.accentHi : 'currentColor' })}
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {section === 'account' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>Account</h3>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: 16, background: 'rgba(255,255,255,0.04)',
                borderRadius: T.r.md, border: `0.5px solid ${T.glassBorder}`, marginBottom: 20,
              }}>
                <Avatar name={ME.name} size={52} ring/>
                <div style={{ flex: 1 }}>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{ME.name}</div>
                  <div style={{ ...TY.small, color: T.text3 }}>Discord · @{ME.tag}</div>
                </div>
                <Btn variant="secondary" size="sm">Change</Btn>
              </div>
              <Field label="Display name" value={ME.name}/>
              <Field label="Bio" value="Building in public. Gym Club member."/>
              <Field label="Timezone" value="Europe/Lisbon"/>
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <Btn variant="secondary" size="sm">Disconnect Discord</Btn>
                <Btn variant="ghost" size="sm" style={{ color: T.red }}>Delete account</Btn>
              </div>
            </div>
          )}
          {section === 'notif' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>Notifications</h3>
              <Toggle label="Push notifications" sub="Receive alerts on this device" value={push} onChange={setPush}/>
              <Toggle label="Sound effects" sub="Play a sound on aura events" value={sound} onChange={setSound}/>
              <div style={{ ...TY.micro, color: T.text3, margin: '24px 0 10px' }}>Event types</div>
              <Toggle label="Aura gifts" value={gifts} onChange={setGifts}/>
              <Toggle label="New drops & rewards" value={drops} onChange={setDrops}/>
              <Toggle label="Leaderboard changes" sub="When you move up or down" value={ranking} onChange={setRanking}/>
            </div>
          )}
          {section === 'appear' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>Appearance</h3>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[{v:'auto',l:'Auto'},{v:'dark',l:'Dark'},{v:'light',l:'Light'}].map(o => (
                  <button key={o.v} onClick={() => setTheme(o.v)} style={{
                    flex: 1, padding: '18px 12px', borderRadius: T.r.md,
                    background: theme === o.v ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${theme === o.v ? T.accent + '88' : T.glassBorder}`,
                    color: theme === o.v ? T.accentHi : T.text2,
                    fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', boxShadow: theme === o.v ? `0 0 16px ${T.accentGlow}` : 'none',
                  }}>{o.l}</button>
                ))}
              </div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Language</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{v:'en',l:'English'},{v:'pt',l:'Português'}].map(o => (
                  <button key={o.v} onClick={() => setLang(o.v)} style={{
                    flex: 1, padding: '12px', borderRadius: T.r.md,
                    background: lang === o.v ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${lang === o.v ? T.accent + '88' : T.glassBorder}`,
                    color: lang === o.v ? T.accentHi : T.text2,
                    fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>{o.l}</button>
                ))}
              </div>
              <Toggle label="Reduced motion" sub="Minimize animations and parallax" value={false} onChange={()=>{}}/>
            </div>
          )}
          {section === 'privacy' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>Privacy</h3>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Profile visibility</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {[
                  { v: 'public', l: 'Public', d: 'Anyone in ElyHub can see your profile' },
                  { v: 'members', l: 'Members only', d: 'Only verified members' },
                  { v: 'private', l: 'Private', d: 'Only you' },
                ].map(o => (
                  <button key={o.v} onClick={() => setPrivacy(o.v)} style={{
                    padding: 14, borderRadius: T.r.md, textAlign: 'left',
                    background: privacy === o.v ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${privacy === o.v ? T.accent + '88' : T.glassBorder}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `1.5px solid ${privacy === o.v ? T.accentHi : T.text3}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {privacy === o.v && <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.accentHi, boxShadow: `0 0 6px ${T.accent}` }}/>}
                    </div>
                    <div>
                      <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{o.l}</div>
                      <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{o.d}</div>
                    </div>
                  </button>
                ))}
              </div>
              <Toggle label="Show on leaderboard" value={true} onChange={()=>{}}/>
              <Toggle label="Allow aura gifts from anyone" value={true} onChange={()=>{}}/>
            </div>
          )}
          {section === 'about' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>About</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <ILogo size={42}/>
                <div>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>ElyHub</div>
                  <div style={{ ...TY.small, color: T.text3 }}>v1.2.0 · April 2026</div>
                </div>
              </div>
              <Row k="Terms of Service" v="→"/>
              <Row k="Privacy Policy" v="→"/>
              <Row k="Support" v="→"/>
              <Row k="Credits" v="→" last/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>{label}</div>
      <input defaultValue={value} style={{
        width: '100%', padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
        borderRadius: T.r.md, color: T.text, fontFamily: T.fontSans, fontSize: 13,
        outline: 'none', boxSizing: 'border-box',
      }}/>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '12px 0', borderBottom: `0.5px solid ${T.glassBorder}`,
    }}>
      <div>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{label}</div>
        {sub && <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 23, borderRadius: 12, position: 'relative',
        background: value ? `linear-gradient(180deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.1)',
        border: `0.5px solid ${value ? T.accent : T.glassBorder2}`, cursor: 'pointer', padding: 0,
        boxShadow: value ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px ${T.accentGlow}` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'all .2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 19 : 2,
          width: 17, height: 17, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'left .2s cubic-bezier(.4,0,.2,1)',
        }}/>
      </button>
    </div>
  );
}

// ────────────── Level-Up Takeover ──────────────
function LevelUpTakeover({ level, onClose }) {
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 120);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const perks = [
    { label: 'Unlocked · ElyHub Hoodie', icon: <IStore size={14}/> },
    { label: '+500 aura bonus', icon: <ISparkle size={14}/> },
    { label: 'Custom role color', icon: <IUser size={14}/> },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(3,6,16,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .3s', overflow: 'hidden',
    }}>
      {/* Radial burst */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '120vw', height: '120vw',
        transform: `translate(-50%, -50%) scale(${stage >= 1 ? 1 : 0})`,
        background: `radial-gradient(circle, ${T.accent}66 0%, ${T.accent}22 25%, transparent 55%)`,
        filter: 'blur(40px)',
        transition: 'transform 1.8s cubic-bezier(.2,.9,.3,1)',
        pointerEvents: 'none',
      }}/>

      {/* Rays */}
      {stage >= 1 && [...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 2, height: '60vh',
          background: `linear-gradient(180deg, transparent 0%, ${T.accentHi}88 40%, transparent 100%)`,
          transformOrigin: '50% 0',
          transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(-50%)`,
          opacity: stage >= 2 ? 0.5 : 0.9,
          transition: 'opacity 1s', pointerEvents: 'none',
          animation: `fadeIn 0.6s ease-out ${i * 0.05}s backwards`,
        }}/>
      ))}

      {/* Particles */}
      {stage >= 1 && [...Array(24)].map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 200 + (i % 3) * 80;
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 4, height: 4, borderRadius: '50%',
            background: T.accentHi,
            boxShadow: `0 0 10px ${T.accent}`,
            transform: stage >= 1
              ? `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`
              : `translate(-50%, -50%)`,
            opacity: stage >= 2 ? 0 : 1,
            transition: 'transform 1.4s cubic-bezier(.2,.9,.3,1), opacity 1s',
            pointerEvents: 'none',
          }}/>
        );
      })}

      {/* Content */}
      <div style={{
        position: 'relative', textAlign: 'center', padding: 40,
        transform: `scale(${stage >= 1 ? 1 : 0.8}) translateY(${stage >= 1 ? 0 : 20}px)`,
        opacity: stage >= 1 ? 1 : 0,
        transition: 'all .8s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        <div style={{ ...TY.micro, color: T.accentHi, marginBottom: 18, letterSpacing: '0.2em', textShadow: `0 0 16px ${T.accent}` }}>
          LEVEL UP
        </div>
        <div style={{
          ...TY.display, fontSize: 180, color: T.text,
          textShadow: `0 0 80px ${T.accent}, 0 0 120px ${T.accentGlow}`,
          lineHeight: 0.9, marginBottom: 8,
        }}>{level}</div>
        <div style={{ ...TY.h2, color: T.text, marginBottom: 6 }}>You reached L{level}</div>
        <div style={{ ...TY.body, color: T.text2, marginBottom: 32 }}>New perks unlocked</div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          maxWidth: 360, margin: '0 auto 32px',
        }}>
          {perks.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', borderRadius: T.r.pill,
              background: 'rgba(255,255,255,0.06)',
              border: `0.5px solid ${T.glassBorder}`,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
              opacity: stage >= 2 ? 1 : 0,
              transition: `all .5s cubic-bezier(.2,.9,.3,1) ${0.1 * i}s`,
            }}>
              <div style={{ color: T.accentHi }}>{p.icon}</div>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{p.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          transform: stage >= 3 ? 'translateY(0)' : 'translateY(10px)',
          opacity: stage >= 3 ? 1 : 0,
          transition: 'all .4s ease-out',
        }}>
          <Btn variant="primary" size="lg" onClick={onClose}>Continue</Btn>
        </div>
      </div>
    </div>
  );
}

// ────────────── Tweaks ──────────────
function useTweaks() {
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [open, setOpen] = React.useState(false);
  const [, force] = React.useReducer(x => x + 1, 0);
  const applyTheme = (themeKey) => {
    const th = THEMES[themeKey] || THEMES.blue;
    T.theme = themeKey;
    T.accent = th.accent;
    T.accentHi = th.accentHi;
    T.accentGlow = th.accent + '80';
  };
  React.useEffect(() => {
    const h = (e) => {
      if (e.data?.type === '__activate_edit_mode') setOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    applyTheme(tweaks.theme || (tweaks.accent === '#E25C3A' ? 'ember' : 'blue'));
    force();
    return () => window.removeEventListener('message', h);
  }, []);
  const tweak = (k, v) => {
    setTweaks(t => ({ ...t, [k]: v }));
    if (k === 'theme') {
      applyTheme(v);
      force();
    }
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };
  return { tweaks, tweak, open, setOpen };
}

function TweaksPanel({ tweaks, tweak, onQuick, onClose }) {
  const current = tweaks.theme || 'blue';
  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
      width: 300, ...glass(2, { padding: 20, borderRadius: T.r.lg }),
      color: T.text, fontFamily: T.fontSans,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ ...TY.h3, fontSize: 16 }}>Tweaks</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={14}/></button>
      </div>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 12 }}>Theme</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {Object.entries(THEMES).map(([key, th]) => {
          const active = current === key;
          return (
            <button key={key} onClick={() => tweak('theme', key)} style={{
              padding: 0, borderRadius: 10, cursor: 'pointer',
              border: active ? `1.5px solid #fff` : `0.5px solid rgba(255,255,255,0.15)`,
              background: 'transparent', overflow: 'hidden',
              boxShadow: active ? `0 0 16px ${th.accent}99` : 'none',
            }} title={th.name}>
              <div style={{
                height: 40, position: 'relative', overflow: 'hidden',
                background: th.bg,
              }}>
                <div style={{ position: 'absolute', top: -10, left: -10, width: 40, height: 40, borderRadius: '50%',
                  background: `radial-gradient(circle, ${th.orb1}cc, transparent)`, filter: 'blur(8px)' }}/>
                <div style={{ position: 'absolute', bottom: -12, right: -8, width: 36, height: 36, borderRadius: '50%',
                  background: `radial-gradient(circle, ${th.orb2}cc, transparent)`, filter: 'blur(8px)' }}/>
                <div style={{ position: 'absolute', top: 10, right: 8, width: 10, height: 10, borderRadius: '50%',
                  background: th.accentHi, boxShadow: `0 0 10px ${th.accent}` }}/>
              </div>
              <div style={{
                padding: '5px 6px', fontSize: 10, fontWeight: 500,
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: 'rgba(0,0,0,0.3)', textAlign: 'center',
              }}>{th.name}</div>
            </button>
          );
        })}
      </div>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>Demos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <button onClick={onQuick?.levelUp} style={demoBtn}>
          <ISparkle size={13} color={T.accentHi}/> Trigger level up
        </button>
        <button onClick={onQuick?.gift} style={demoBtn}>
          <IGift size={13} color={T.accentHi}/> Open gift flow
        </button>
        <button onClick={onQuick?.settings} style={demoBtn}>
          <ISettings size={13} color={T.accentHi}/> Open settings
        </button>
      </div>
      <div style={{ ...TY.small, color: T.text3, lineHeight: 1.5, fontSize: 11 }}>
        Each theme changes the whole palette — accent, orbs and background.
      </div>
    </div>
  );
}

const demoBtn = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px', borderRadius: T.r.md,
  background: 'rgba(255,255,255,0.04)',
  border: `0.5px solid ${T.glassBorder}`,
  color: T.text, fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', textAlign: 'left',
};

// ────────────── App ──────────────
function App() {
  const [view, setView] = React.useState({ id: 'home' });
  const [state, setState] = React.useState({ aura: ME.aura, level: ME.level, rank: ME.rank, streak: ME.streak, tagClaimed: false, boostClaimed: false });
  const [giftOpen, setGiftOpen] = React.useState(false);
  const [redeem, setRedeem] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [levelUp, setLevelUp] = React.useState(null);
  const { tweaks, tweak, open: tweaksOpen, setOpen: setTweaksOpen } = useTweaks();

  const onQuick = {
    gift: () => setGiftOpen(true),
    redeem: (r) => setRedeem(r),
    settings: () => setSettingsOpen(true),
    levelUp: () => setLevelUp(state.level + 1),
  };

  const contents = {
    home:        <HomeView state={state} setState={setState} setView={setView} onQuick={onQuick}/>,
    leaderboard: <LeaderboardView state={state}/>,
    store:       <StoreView state={state} onQuick={onQuick}/>,
    trophies:    <TrophiesView/>,
    profile:     <ProfileView state={state} onQuick={onQuick}/>,
  };

  return (
    <>
      <Shell view={view} setView={setView} state={state} onQuick={onQuick}>
        {contents[view.id]}
      </Shell>
      {giftOpen && <GiftModal state={state} onClose={() => setGiftOpen(false)} onSend={(f, a) => setState(s => ({ ...s, aura: s.aura - a }))}/>}
      {redeem && <RedeemModal reward={redeem} state={state} onClose={() => setRedeem(null)} onConfirm={() => setState(s => ({ ...s, aura: s.aura - redeem.price }))}/>}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)}/>}
      {levelUp && <LevelUpTakeover level={levelUp} onClose={() => setLevelUp(null)}/>}
      {tweaksOpen && <TweaksPanel tweaks={tweaks} tweak={tweak} onQuick={onQuick} onClose={() => setTweaksOpen(false)}/>}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
