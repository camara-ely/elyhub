// ElyHub — Cartographer Modern Sidebar + Topbar + Leaderboard + Trophies.

// ─── ModernSidebar ───────────────────────────────────────────────────────
function CartographerModernSidebar({ view, setView, state, onQuick, library, wishlist, follows, messages }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const ME = window.ME || {};
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));

  const adminState = typeof window.useAdminRole === 'function' ? window.useAdminRole() : { role: null };
  const adminRole = adminState?.role || null;
  const hasMakerProducts = typeof window.useHasMakerProducts === 'function' ? window.useHasMakerProducts() : false;

  const huginListing = (window.LISTINGS || []).find((x) =>
    (x.kassa_product_id || x.kassaProductId) === 'gleipnir',
  );
  const HUGIN_LISTING_ID = huginListing?.id || 'l-zephyro';
  const zephyroEntry = library?.items?.find((it) => it.listingId === HUGIN_LISTING_ID);
  const zephyroActive = !!(zephyroEntry && zephyroEntry.status === 'active'
    && (!zephyroEntry.expiresAt || zephyroEntry.expiresAt > Date.now()));

  const Ico = ({ d, sw = 1.5 }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );

  const tc = window.tc || ((k) => k);
  const items = [
    { id: 'home',        label: tc('nav.home'),        icon: <Ico d={<><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></>}/> },
    { id: 'leaderboard', label: tc('nav.leaderboard'), icon: <Ico d={<><path d="M5 21V8M12 21V4M19 21V12"/><path d="M3 21h18"/></>}/> },
    { id: 'store',       label: tc('nav.store'),       icon: <Ico d={<><path d="M6 5h12l-1 5a5 5 0 0 1-10 0z"/><path d="M12 15v4M9 19h6"/></>}/> },
    { id: 'discover',    label: tc('nav.discover'),    icon: <Ico d={<><circle cx="12" cy="12" r="9"/><path d="M16 8 13 13 8 16 11 11z"/></>}/> },
    { id: 'claim',       label: tc('nav.claim'),       icon: <Ico d={<><rect x="3" y="6" width="18" height="14" rx="0"/><path d="M3 7l9 7 9-7"/></>}/> },
    { id: 'zephyro',     label: tc('nav.zephyro'),     icon: <Ico d={<><path d="M12 3c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3 0-5 0-7z"/></>}/>, premium: true, locked: !zephyroActive },
    { id: 'saved',       label: tc('nav.saved'),       icon: <Ico d={<><path d="M19 14c1-2 1-4 0-5-1-2-3-2-5 0L12 11l-2-2c-2-2-4-2-5 0-1 1-1 3 0 5l7 7z"/></>}/>, badge: wishlist?.items?.length || 0 },
    { id: 'feed',        label: tc('nav.feed'),        icon: <Ico d={<><circle cx="6" cy="18" r="2"/><path d="M4 12a8 8 0 0 1 8 8M4 6a14 14 0 0 1 14 14"/></>}/> },
    { id: 'members',     label: tc('nav.members'),     icon: <Ico d={<><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 6a4 4 0 0 1 0 6M21 20a6 6 0 0 0-3-5"/></>}/> },
    { id: 'messages',    label: tc('nav.messages'),    icon: <Ico d={<><rect x="3" y="6" width="18" height="14" rx="0"/><path d="M3 7l9 7 9-7"/></>}/>, badge: messages?.unreadCount || 0 },
    { id: 'trophies',    label: tc('nav.trophies'),    icon: <Ico d={<><path d="M12 4l1.5 4L18 8l-3.5 3 1 4.5L12 13l-3.5 2.5 1-4.5L6 8l4.5 0z"/><path d="M5 18c2-2 5-2 7 0M19 18c-2-2-5-2-7 0"/></>}/> },
    { id: 'licenses',    label: tc('nav.licenses'),    icon: <Ico d={<><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15 21 2M17 6l3 3M15 8l3 3"/></>}/> },
    ...(hasMakerProducts ? [{ id: 'maker', label: tc('nav.maker'), icon: <Ico d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>}/> }] : []),
    { id: 'profile',     label: tc('nav.profile'),     icon: <Ico d={<><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>}/> },
    ...(adminRole ? [{ id: 'admin', label: adminRole === 'owner' ? tc('nav.admin.owner') : tc('nav.admin.mod'), icon: <Ico d={<><path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z"/></>}/> }] : []),
  ];

  const auraNow = Number(ME.aura ?? state?.aura ?? 0);
  const lvl = Number(ME.level ?? state?.level ?? 0);
  const prev = Number(ME.prevLevelAura ?? 0);
  const next = Number(ME.nextLevelAura ?? 1);
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));

  return (
    <aside aria-label="Primary" className="no-scrollbar" style={{
      width: 232, flexShrink: 0, padding: '40px 14px 16px',
      height: '100vh', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 10,
      borderRight: `1px solid ${Mm.hair2}`,
      background: 'rgba(15,30,25,0.55)',
      backdropFilter: 'blur(8px)',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 6px' }}>
        {window.SERVER?.iconUrl ? (
          <img src={window.SERVER.iconUrl} alt={window.SERVER?.name || 'server'}
               style={{
                 width: 28, height: 28, borderRadius: 6, objectFit: 'cover',
                 border: `1px solid ${Mm.hair2}`,
               }}/>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 13, fontWeight: 700,
          }}>E</div>
        )}
        <span style={{
          fontFamily: Mm.fontDisp, fontWeight: 700, fontSize: 15,
          color: Mm.text, letterSpacing: '-0.01em',
        }}>ElyHub</span>
        <span style={{
          ...MmTY.coord, color: Mm.text3, marginLeft: 'auto', fontSize: 8,
          padding: '2px 5px', border: `1px solid ${Mm.hair}`, borderRadius: 2,
        }}>v0.1</span>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((it) => {
          const active = view.id === it.id;
          return (
            <button key={it.id} aria-current={active ? 'page' : undefined}
              onClick={() => setView({ id: it.id, listingId: it.id === 'zephyro' ? HUGIN_LISTING_ID : undefined })}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 11px', cursor: 'pointer',
                background: active ? `${Mm.accent}1A` : 'transparent',
                border: `1px solid ${active ? Mm.hair3 : 'transparent'}`,
                borderRadius: 4,
                color: active ? Mm.accent : Mm.text2,
                fontFamily: Mm.fontUI, fontWeight: active ? 600 : 500, fontSize: 13,
                transition: 'all 0.15s', textAlign: 'left', position: 'relative',
                opacity: it.locked ? 0.55 : 1,
              }}
              onMouseOver={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(155,214,107,0.06)'; e.currentTarget.style.color = Mm.text; } }}
              onMouseOut={(e)  => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = Mm.text2; } }}>
              {active && (
                <div style={{
                  position: 'absolute', left: -1, top: 6, bottom: 6, width: 2,
                  background: Mm.accent, boxShadow: `0 0 6px ${Mm.accent}`,
                }}/>
              )}
              <span style={{ display: 'inline-flex', flex: 'none', opacity: active ? 1 : 0.85 }}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.premium && !active && (
                <span style={{
                  ...MmTY.coord, fontSize: 7, color: Mm.cyan,
                  border: `1px solid ${Mm.cyan}`, padding: '2px 5px', borderRadius: 2,
                }}>{it.locked ? 'LOCK' : 'PRO'}</span>
              )}
              {it.badge > 0 && (
                <span style={{
                  fontFamily: Mm.fontMono, fontSize: 10, fontWeight: 600,
                  color: active ? Mm.accent : Mm.cyan,
                }}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }}/>

      {/* Aura HUD card — telemetry style. Settings gear sits top-right
          (matches host pattern across themes). */}
      <div style={{
        position: 'relative',
        background: 'rgba(10,18,16,0.65)',
        border: `1px solid ${Mm.hair2}`, borderRadius: 4,
        padding: '12px 14px',
      }}>
        {/* Settings — top-right gear */}
        <button onClick={() => onQuick && onQuick.settings && onQuick.settings()}
          title={tc('nav.settings')}
          style={{
            position: 'absolute', top: 9, right: 9,
            width: 24, height: 24, borderRadius: '50%',
            background: 'transparent', border: `1px solid ${Mm.hair2}`,
            color: Mm.text3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = Mm.accent; e.currentTarget.style.color = Mm.accent; }}
          onMouseOut={(e)  => { e.currentTarget.style.borderColor = Mm.hair2; e.currentTarget.style.color = Mm.text3; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: Mm.accent,
            boxShadow: `0 0 6px ${Mm.accent}`, animation: 'mmPulse 2s ease-in-out infinite',
          }}/>
          <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>{tc('nav.brand.balance').toUpperCase()} · LIVE</span>
        </div>
        <div style={{ ...MmTY.numTab, fontSize: 22, color: Mm.accent, lineHeight: 1.1 }}>{fmt(auraNow)}</div>
        <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginTop: 2 }}>
          aura · L{lvl}
        </div>
        <div style={{ marginTop: 10, height: 2, background: 'rgba(155,214,107,0.08)', borderRadius: 1 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${Mm.accentLo}, ${Mm.accent}, ${Mm.cyan})`,
            boxShadow: `0 0 4px ${Mm.accent}`,
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>
          <span>{pct}%</span>
          <span style={{ color: Mm.accent }}>→ L{lvl + 1}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── ModernTopbar ────────────────────────────────────────────────────────
function CartographerModernTopbar({ state, onQuick, onNotif, setView, onSettings }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const ME = window.ME || {};
  const [search, setSearch] = React.useState('');

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      if (typeof window.ElySearch?.open === 'function') window.ElySearch.open(search.trim());
      else setView({ id: 'discover', q: search.trim() });
    }
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      padding: '18px 48px 16px',
      background: 'linear-gradient(180deg, rgba(14,22,20,0.92), rgba(14,22,20,0.72))',
      backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${Mm.hair2}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 640, position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: Mm.text3, pointerEvents: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5" strokeLinecap="round"/>
          </svg>
        </span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey}
               placeholder={tc('topbar.search')}
               style={{
                 width: '100%', padding: '10px 14px 10px 38px', boxSizing: 'border-box',
                 background: 'rgba(10,18,16,0.65)',
                 border: `1px solid ${Mm.hair2}`, borderRadius: 4,
                 color: Mm.text, fontFamily: Mm.fontUI, fontSize: 13, outline: 'none',
                 transition: 'border-color 0.15s',
               }}
               onFocus={(e) => (e.target.style.borderColor = Mm.accent)}
               onBlur={(e)  => (e.target.style.borderColor = Mm.hair2)}/>
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          ...MmTY.coord, fontSize: 9, color: Mm.text3,
          background: 'rgba(155,214,107,0.06)', border: `1px solid ${Mm.hair}`,
          padding: '2px 6px', borderRadius: 2,
        }}>⌘K</span>
      </div>

      {/* Send aura */}
      <button onClick={() => onQuick && onQuick('gift')} style={{
        padding: '10px 18px', borderRadius: 4,
        background: Mm.accent, color: Mm.bg,
        border: `1px solid ${Mm.accent}`,
        fontFamily: Mm.fontUI, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: `0 0 14px ${Mm.accent}33`,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="9" width="18" height="12"/><path d="M3 13h18M12 9v12M8 9c-3 0-3-5 0-5 2 0 4 5 4 5 0 0 2-5 4-5 3 0 3 5 0 5"/>
        </svg>
        {tc('topbar.gift')}
      </button>

      {/* Notifications */}
      <button onClick={onNotif} title={tc('topbar.notif')} style={{
        width: 36, height: 36, borderRadius: 4,
        background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
        color: Mm.text2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = Mm.accent; e.currentTarget.style.color = Mm.accent; }}
      onMouseOut={(e)  => { e.currentTarget.style.borderColor = Mm.hair2; e.currentTarget.style.color = Mm.text2; }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17z"/><path d="M10 20a2 2 0 0 0 4 0"/>
        </svg>
      </button>

      {/* Avatar */}
      <button onClick={() => setView({ id: 'profile' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, overflow: 'hidden',
          border: `1px solid ${Mm.hair3}`,
          background: ME.avatar ? '#1a2a24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ME.avatar ? (
            <img src={ME.avatar} alt={ME.name || 'me'} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          ) : (
            <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontWeight: 700, fontSize: 14 }}>
              {(ME.name || 'M')[0]?.toUpperCase()}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── ModernLeaderboardView ───────────────────────────────────────────────
function CartographerModernLeaderboardView({ state, focusId }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const coords = window.coordsModern || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));
  const elev = window.elevationModern || (() => 0);

  const [category, setCategory] = React.useState('overall');
  const [periodData, setPeriodData] = React.useState({});
  const [periodLoading, setPeriodLoading] = React.useState(false);
  const isPeriod = category === 'daily' || category === 'weekly' || category === 'monthly';

  React.useEffect(() => {
    if (!isPeriod || periodData[category]) return;
    setPeriodLoading(true);
    (window.ElyAPI?.get?.(`/me/leaderboard?period=${category}`) || Promise.resolve(null))
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setPeriodData((prev) => ({ ...prev, [category]: res.items }));
        }
      })
      .catch(() => {})
      .finally(() => setPeriodLoading(false));
  }, [category, isPeriod, periodData]);

  const members = window.MEMBERS || [];
  const ordered = React.useMemo(() => {
    if (isPeriod) {
      const items = periodData[category] || [];
      return items.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar_url, aura: r.gained, level: r.level, _gained: r.gained }));
    }
    if (category === 'gym') return [...members].sort((a, b) => (b.gymPosts || 0) - (a.gymPosts || 0));
    return [...members].sort((a, b) => (b.aura || 0) - (a.aura || 0));
  }, [category, isPeriod, periodData, members]);

  const tabs = [
    { id: 'overall', label: tc('lb.tab.overall') },
    { id: 'gym',     label: tc('lb.tab.gym') },
    { id: 'daily',   label: tc('lb.tab.daily') },
    { id: 'weekly',  label: tc('lb.tab.weekly') },
    { id: 'monthly', label: tc('lb.tab.monthly') },
  ];

  const Top1 = ordered[0];
  const Rest = ordered.slice(1, 24);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}`,
      }}>
        <div>
          <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.lb.eyebrow')}</div>
          <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.lb.title')}<span style={{ color: Mm.accent }}>.</span></h1>
          <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
            {tc('lb.sub', { n: ordered.length, category: tc(`lb.tab.${category}`).toUpperCase() })}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 0,
          background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
          padding: 3, borderRadius: 4,
        }}>
          {tabs.map((t) => {
            const on = category === t.id;
            return (
              <button key={t.id} onClick={() => setCategory(t.id)} style={{
                ...MmTY.coord, padding: '7px 12px', cursor: 'pointer',
                border: 'none', background: on ? Mm.accent : 'transparent',
                color: on ? Mm.bg : Mm.text2, fontWeight: 600, borderRadius: 2,
                transition: 'all 0.15s',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {periodLoading && !ordered.length && (
        <div style={{ ...MmTY.coord, color: Mm.text3, textAlign: 'center', padding: '40px 0' }}>
          {tc('lb.empty.loading')}
        </div>
      )}

      {!periodLoading && !ordered.length && (
        <div style={{
          ...MmTY.body, color: Mm.text3, textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`,
          borderRadius: 6,
        }}>
          {tc('lb.empty.none')}
        </div>
      )}

      {/* Top 1 hero */}
      {Top1 && (
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(155,214,107,0.10), rgba(93,211,196,0.04))',
          border: `1px solid ${Mm.hair3}`, borderRadius: 6,
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 24,
          boxShadow: `0 0 24px rgba(155,214,107,0.15)`,
        }}>
          {window.MPin && React.createElement(window.MPin, { value: 1, size: 56, tone: 'accent' })}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...MmTY.h2, color: Mm.text, fontSize: 24 }}>{Top1.name || '—'}</div>
            <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 4 }}>
              L{Top1.level || 0} · {coords(Top1.name || '').lat}°{coords(Top1.name || '').latDir} · {coords(Top1.name || '').lon}°{coords(Top1.name || '').lonDir}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 2 }}>{tc(isPeriod ? 'lb.col.gained' : 'lb.col.aura')}</div>
            <div style={{ ...MmTY.numTab, fontSize: 32, color: Mm.accent }}>
              {isPeriod && '+'}{fmt(Top1.aura || 0)}
            </div>
            <div style={{ ...MmTY.coord, color: Mm.cyan, marginTop: 4 }}>↑ {elev(Top1.name)}m elev</div>
          </div>
        </div>
      )}

      {/* Ledger */}
      {Rest.length > 0 && (
        <div style={{
          background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
          borderRadius: 6, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '50px 50px 1fr 100px 130px',
            gap: 14, padding: '12px 22px',
            borderBottom: `1px solid ${Mm.hair}`,
            ...MmTY.coord, color: Mm.text3,
          }}>
            <span>{tc('lb.col.rank')}</span><span/><span>{tc('lb.col.surveyor')}</span>
            <span style={{ textAlign: 'right' }}>{tc('lb.col.elev')}</span>
            <span style={{ textAlign: 'right' }}>{tc(isPeriod ? 'lb.col.gained' : 'lb.col.aura')}</span>
          </div>
          {Rest.map((m, i) => {
            const rank = i + 2;
            const focus = focusId && m.id === focusId;
            const c = coords(m.name || '');
            return (
              <div key={m.id || rank} data-focus-id={m.id} style={{
                display: 'grid', gridTemplateColumns: '50px 50px 1fr 100px 130px',
                gap: 14, padding: '12px 22px', alignItems: 'center',
                borderBottom: i === Rest.length - 1 ? 'none' : `1px solid ${Mm.hair}`,
                background: focus ? 'rgba(155,214,107,0.10)' : 'transparent',
                transition: 'background 0.15s',
              }}>
                <span style={{ ...MmTY.coord, color: Mm.text3 }}>{String(rank).padStart(2, '0')}</span>
                {window.MPin && React.createElement(window.MPin, { value: rank, size: 32, tone: 'mute' })}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || '—'}</div>
                  <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>L{m.level || 0} · {c.lat}°{c.latDir}</div>
                </div>
                <span style={{ ...MmTY.coord, color: Mm.cyan, textAlign: 'right' }}>↑ {elev(m.name)}m</span>
                <span style={{ ...MmTY.numTab, color: Mm.text, fontSize: 15, textAlign: 'right' }}>{isPeriod && '+'}{fmt(m.aura || 0)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ModernTrophiesView ──────────────────────────────────────────────────
function CartographerModernTrophiesView({ focusId }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const me = window.ME || {};

  const trophies = (typeof window.deriveTrophies === 'function')
    ? window.deriveTrophies(me)
    : (typeof deriveTrophies === 'function' ? deriveTrophies(me) : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}` }}>
        <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.trophies.eyebrow')}</div>
        <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.trophies.title')}<span style={{ color: Mm.accent }}>.</span></h1>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
          {tc('trophies.sub', { u: trophies.filter((t) => t.unlocked).length, t: trophies.length })}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16,
      }}>
        {trophies.map((tr) => {
          const pct = tr.total ? Math.min(100, Math.round((tr.progress / tr.total) * 100)) : 0;
          return (
            <div key={tr.id} style={{
              position: 'relative',
              background: tr.unlocked
                ? 'linear-gradient(135deg, rgba(155,214,107,0.12), rgba(93,211,196,0.04))'
                : 'rgba(15,30,25,0.55)',
              border: `1px solid ${tr.unlocked ? Mm.hair3 : Mm.hair2}`, borderRadius: 6,
              padding: '20px 22px',
              boxShadow: tr.unlocked ? `0 0 18px rgba(155,214,107,0.18)` : 'none',
              opacity: tr.unlocked ? 1 : 0.78,
            }}>
              {tr.unlocked && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 24, height: 24, borderRadius: 4,
                  background: Mm.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${Mm.accent}`,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={Mm.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10"/>
                  </svg>
                </div>
              )}
              <div style={{ ...MmTY.coord, color: tr.unlocked ? Mm.accent : Mm.text3, marginBottom: 10 }}>
                {tc('trophies.label')}
              </div>
              <h3 style={{ ...MmTY.h3, color: Mm.text, margin: '0 0 6px' }}>
                {tc(`trophy.${tr.id}.name`) === `trophy.${tr.id}.name` ? tr.name : tc(`trophy.${tr.id}.name`)}
              </h3>
              <p style={{ ...MmTY.small, color: Mm.text2, margin: 0 }}>
                {tc(`trophy.${tr.id}.desc`) === `trophy.${tr.id}.desc` ? tr.desc : tc(`trophy.${tr.id}.desc`)}
              </p>

              {tr.total > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    ...MmTY.coord, color: Mm.text3, marginBottom: 6,
                  }}>
                    <span>{tr.unlocked ? tc('trophies.completed') : tc('trophies.progress')}</span>
                    <span style={{ color: tr.unlocked ? Mm.accent : Mm.text2 }}>
                      {fmt(tr.progress)} / {fmt(tr.total)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(155,214,107,0.08)', borderRadius: 1 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: tr.unlocked
                        ? `linear-gradient(90deg, ${Mm.accentLo}, ${Mm.accent}, ${Mm.cyan})`
                        : Mm.accentLo,
                    }}/>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.CartographerModernSidebar         = CartographerModernSidebar;
window.CartographerModernTopbar          = CartographerModernTopbar;
window.CartographerModernLeaderboardView = CartographerModernLeaderboardView;
window.CartographerModernTrophiesView    = CartographerModernTrophiesView;
