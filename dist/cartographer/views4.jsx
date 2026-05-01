// ElyHub — Cartographer (vintage) Sidebar + Topbar variants.
//
// Pragmatic clones of shell.jsx Sidebar/Topbar — same routing, same hooks,
// vintage styling. We deliberately skip a few host edge cases (Hugin anomaly
// treatment, plugin group with collapse, new-pip on marketplace) to keep
// this file under control. Those degrade gracefully — Hugin still routes,
// active plugins still render via window.LISTINGS lookup, etc.

// ─── CartographerSidebar ─────────────────────────────────────────────────
function CartographerSidebar({ view, setView, state, onQuick, library, wishlist, follows, messages }) {
  const M = window.M, MTY = window.MTY;
  const ME = window.ME || {};
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));

  const adminState = typeof window.useAdminRole === 'function' ? window.useAdminRole() : { role: null };
  const adminRole = adminState?.role || null;
  const hasMakerProducts = typeof window.useHasMakerProducts === 'function' ? window.useHasMakerProducts() : false;

  // Hugin (kassa product 'gleipnir') sidebar entry — reuse host's gating logic.
  const huginListing = (window.LISTINGS || []).find((x) =>
    (x.kassa_product_id || x.kassaProductId) === 'gleipnir',
  );
  const HUGIN_LISTING_ID = huginListing?.id || 'l-zephyro';
  const zephyroEntry = library?.items?.find((it) => it.listingId === HUGIN_LISTING_ID);
  const zephyroActive = !!(zephyroEntry && zephyroEntry.status === 'active'
    && (!zephyroEntry.expiresAt || zephyroEntry.expiresAt > Date.now()));

  const feedNewCount = (() => {
    if (!follows || !follows.items.length) return 0;
    if (view.id === 'feed') return 0;
    const seen = follows.lastSeen || 0;
    return (window.LISTINGS || []).filter(
      (l) => follows.items.includes(l.sellerId) && (l.createdAt || 0) > seen
    ).length;
  })();

  // Inline tiny SVG icons — vintage-line style, ink stroke. Keeping them
  // self-contained so we don't hunt for matching host icons.
  const Ico = ({ d, sw = 1.4 }) => (
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
    { id: 'feed',        label: tc('nav.feed'),        icon: <Ico d={<><circle cx="6" cy="18" r="2"/><path d="M4 12a8 8 0 0 1 8 8M4 6a14 14 0 0 1 14 14"/></>}/>, newPip: feedNewCount },
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
      width: 240, flexShrink: 0, padding: '44px 16px 20px',
      height: '100vh', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 12,
      borderRight: `1px solid ${M.hair2}`,
      background: 'linear-gradient(180deg, rgba(232,220,192,0.55), rgba(220,207,174,0.35))',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 6px' }}>
        {window.SERVER?.iconUrl ? (
          <img src={window.SERVER.iconUrl} alt={window.SERVER?.name || 'server'}
            style={{
              width: 30, height: 30, borderRadius: '50%', objectFit: 'cover',
              border: `1px solid ${M.hair3}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 1px 2px 4px rgba(59,38,22,0.2)',
            }}/>
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: M.surface, fontFamily: M.fontDisp, fontSize: 13, fontWeight: 700,
            boxShadow: 'inset -2px -3px 5px rgba(0,0,0,0.3), 1px 2px 4px rgba(59,38,22,0.25)',
          }}>E</div>
        )}
        <span style={{
          fontFamily: M.fontDisp, fontWeight: 600, fontSize: 16,
          letterSpacing: '0.18em', color: M.ink, textTransform: 'uppercase',
        }}>ElyHub</span>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((it) => {
          const active = view.id === it.id;
          return (
            <button key={it.id} data-tour={`nav-${it.id}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setView({ id: it.id, listingId: it.id === 'zephyro' ? HUGIN_LISTING_ID : undefined })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', cursor: 'pointer',
                background: active ? M.wax : 'transparent',
                border: 'none',
                color: active ? M.surface : M.ink2,
                fontFamily: M.fontDisp, fontWeight: 600, fontSize: 12,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                transition: 'all 0.15s',
                position: 'relative', textAlign: 'left',
                opacity: it.locked ? 0.55 : 1,
              }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'rgba(200,162,78,0.18)'; }}
              onMouseOut={(e)  => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ display: 'inline-flex', color: 'inherit', flex: 'none', opacity: active ? 1 : 0.85 }}>
                {it.icon}
              </span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.premium && !active && (
                <span style={{
                  ...MTY.capsSm, fontSize: 8, color: M.gold, letterSpacing: '0.22em',
                  border: `1px solid ${M.gold}`, padding: '2px 5px',
                }}>{it.locked ? 'Bloq' : 'Pro'}</span>
              )}
              {(it.badge > 0) && (
                <span style={{
                  fontFamily: M.fontDisp, fontSize: 10, fontWeight: 600,
                  color: active ? M.surface : M.wax,
                  letterSpacing: '0.05em',
                }}>{it.badge}</span>
              )}
              {it.newPip > 0 && !active && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: M.wax,
                  boxShadow: `0 0 6px ${M.waxGlow}`,
                }}/>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }}/>

      {/* Aura ledger card at the foot of the sidebar — settings (astrolabe)
          tucked top-right, mirroring the host pattern. */}
      <div style={{
        position: 'relative',
        background: M.surface, border: `1px solid ${M.hair2}`,
        padding: '14px 14px 16px',
        boxShadow: '2px 3px 8px rgba(59,38,22,0.10)',
      }}>
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 18, opacity: 0.4, style: { position: 'absolute', top: 2, left: 2 } })}
            {React.createElement(window.OrnateCorner, { size: 18, opacity: 0.4, style: { position: 'absolute', bottom: 2, right: 2, transform: 'scale(-1,-1)' } })}
          </>
        )}

        {/* Settings — astrolabe gear, top-right of card */}
        <button onClick={() => onQuick && onQuick.settings && onQuick.settings()}
          title={tc('nav.settings')}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 26, height: 26, borderRadius: '50%',
            background: 'transparent', border: `1px solid ${M.hair2}`,
            color: M.ink3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = M.wax; e.currentTarget.style.color = M.wax; }}
          onMouseOut={(e)  => { e.currentTarget.style.borderColor = M.hair2; e.currentTarget.style.color = M.ink3; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2.5"/>
            <path d="M5 12h2M17 12h2M12 5v2M12 17v2"/>
          </svg>
        </button>

        <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 6 }}>{tc('nav.brand.balance')}</div>
        <div style={{ ...MTY.num, fontSize: 22, color: M.wax, lineHeight: 1, marginBottom: 4 }}>
          {fmt(auraNow)}
        </div>
        <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12 }}>
          aura · L{lvl}
        </div>
        <div style={{ marginTop: 10, height: 2, background: 'rgba(59,38,22,0.12)' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${M.gold}, ${M.wax})`,
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5,
                      ...MTY.capsSm, fontSize: 8, color: M.ink3 }}>
          <span>{pct}%</span>
          <span>→ L{lvl + 1}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── CartographerTopbar ──────────────────────────────────────────────────
function CartographerTopbar({ state, onQuick, onNotif, setView, onSettings, library, reviews, follows }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const ME = window.ME || {};
  const [search, setSearch] = React.useState('');

  // Search query — use the host search overlay if present (window.ElySearch).
  // Otherwise just route to discover with the query as state.
  const onSearchKey = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      if (typeof window.ElySearch?.open === 'function') {
        window.ElySearch.open(search.trim());
      } else {
        setView({ id: 'discover', q: search.trim() });
      }
    }
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      padding: '20px 48px 18px',
      background: 'linear-gradient(180deg, rgba(232,220,192,0.88), rgba(232,220,192,0.65))',
      backdropFilter: 'blur(6px)',
      borderBottom: `1px solid ${M.hair2}`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>

      {/* Search — paper input with wax-red focus */}
      <div style={{ flex: 1, maxWidth: 640, position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: M.ink3, pointerEvents: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="6.5"/>
            <path d="m20 20-4.5-4.5" strokeLinecap="round"/>
          </svg>
        </span>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
               onKeyDown={onSearchKey}
               placeholder={tc('topbar.search')}
               style={{
                 width: '100%', padding: '10px 14px 10px 38px', boxSizing: 'border-box',
                 background: 'rgba(255,255,255,0.45)',
                 border: `1px solid ${M.hair2}`,
                 color: M.ink, fontFamily: M.fontBody, fontStyle: 'italic',
                 fontSize: 14, outline: 'none',
                 transition: 'border-color 0.15s',
               }}
               onFocus={(e) => (e.target.style.borderColor = M.wax)}
               onBlur={(e) => (e.target.style.borderColor = M.hair2)}/>
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          ...MTY.capsSm, fontSize: 9, color: M.ink3,
          background: 'rgba(232,220,192,0.7)', border: `1px solid ${M.hair2}`,
          padding: '2px 6px',
        }}>⌘K</span>
      </div>

      {/* Gift CTA */}
      <button onClick={() => onQuick && onQuick('gift')}
        style={{
          padding: '10px 18px',
          background: M.wax, color: M.surface,
          border: `1px solid ${M.wax}`,
          fontFamily: M.fontDisp, fontWeight: 600, fontSize: 11,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 2px 3px 6px rgba(139,36,24,0.3)',
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="9" width="18" height="12"/>
          <path d="M3 13h18M12 9v12M8 9c-3 0-3-5 0-5 2 0 4 5 4 5 0 0 2-5 4-5 3 0 3 5 0 5"/>
        </svg>
        {tc('topbar.gift')}
      </button>

      {/* Notifications */}
      <button onClick={onNotif}
        title={tc('topbar.notif')}
        style={{
          width: 38, height: 38,
          background: 'rgba(255,255,255,0.4)',
          border: `1px solid ${M.hair2}`,
          color: M.ink2, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = M.wax; e.currentTarget.style.color = M.wax; }}
        onMouseOut={(e)  => { e.currentTarget.style.borderColor = M.hair2; e.currentTarget.style.color = M.ink2; }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17z"/>
          <path d="M10 20a2 2 0 0 0 4 0"/>
        </svg>
      </button>


      {/* User pill — small wax seal of self */}
      <button onClick={() => setView({ id: 'profile' })}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center',
        }}>
        {window.WaxSeal && React.createElement(window.WaxSeal, {
          src: ME.avatar, name: ME.name || 'eu', size: 38, ring: 4,
        })}
      </button>
    </div>
  );
}

window.CartographerSidebar = CartographerSidebar;
window.CartographerTopbar  = CartographerTopbar;
