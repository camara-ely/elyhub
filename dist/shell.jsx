// shell.jsx — app chrome: sidebar, topbar, search, menu.
//
// Extracted from app.jsx. The Shell composes the sticky sidebar + top bar
// around the routed view. ConnectionIndicator is a floating pill for Turso
// poll failures. SearchBar handles ⌘K + autocomplete.
//
// Contents:
//   • Shell             — top-level layout wrapper
//   • ConnectionIndicator — network-error pill
//   • Sidebar           — sticky nav with aura panel + plugins group
//   • SearchBar + normalizeSearch/scoreMatch/buildSearchResults
//   • Topbar            — top-row search + aura chip + user menu
//   • MenuItem          — shared dropdown row helper

// ElyHub — Glassmorphism web desktop


// ────────────── Shell ──────────────
function Shell({ view, setView, state, onQuick, resolvedTheme, library, wishlist, follows, reviews, messages, children }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  // Theme-transition overlay — mounts unconditionally so it can fire when
  // leaving zodiac too. The component listens for 'ely:theme-transition'
  // and renders null when no transition is active.
  const ZTrans = window.ZodiacThemeTransition;
  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', color: T.text, fontFamily: T.fontSans }}>
      {ZTrans && <ZTrans/>}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AmbientBG resolved={resolvedTheme}/>
      {/* Zodiac-only overlay: faint starfield drawn over the AmbientBG. The
          component checks T.starfield internally and noops for other themes. */}
      <ZodiacStarfield/>
      <ZodiacGlobalStyle/>
      <ZodiacFrame/>
      {/* Two-pane independent scroll model. The outer wrapper is locked to
          the viewport (height/overflow above) so the document itself never
          scrolls. Sidebar and main each get their own overflow-y: auto, so
          scrolling one never moves the other. AmbientBG / ZodiacFrame use
          fixed positioning and paint the whole window regardless. */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100vh' }}>
        <Sidebar view={view} setView={setView} state={state} onQuick={onQuick} library={library} wishlist={wishlist} follows={follows} messages={messages}/>
        <main id="main-content" tabIndex={-1} className="no-scrollbar" style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto' }}>
          <Topbar state={state} onQuick={onQuick} setView={setView} onSettings={onQuick.settings} onNotif={() => setNotifOpen(true)} library={library} reviews={reviews} follows={follows}/>
          <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 48px 80px' }}>
            {children}
          </div>
        </main>
      </div>
      {notifOpen && <NotifDrawer onClose={() => setNotifOpen(false)} library={library} reviews={reviews} follows={follows} setView={setView}/>}
      <ConnectionIndicator/>
    </div>
  );
}

// Subtle pill at the bottom-right that only appears when the Turso poll has
// been failing. Dismisses itself the moment a poll succeeds again. Distinct
// from the "no-config" case (which is a dev-env warning, handled silently in
// data.jsx) — we only surface user-visible errors (network / 5xx / auth).
function ConnectionIndicator() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const sub = window.__subscribeLive;
    if (typeof sub !== 'function') return undefined;
    return sub(() => setTick((x) => x + 1));
  }, []);
  const s = window.__liveStatus;
  // Hide when ready, when there's no config (dev env — handled silently), or
  // before the first poll has landed.
  if (!s || s.ready || s.error === 'no-config' || !s.error) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 90,
      ...glass(2, {
        padding: '8px 14px', borderRadius: T.r.pill,
        display: 'flex', alignItems: 'center', gap: 8,
        animation: 'slideInR .3s',
      }),
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: T.red, boxShadow: `0 0 8px ${T.red}`,
      }}/>
      <span style={{ ...TY.small, color: T.text2 }}>{t('conn.offline')}</span>
    </div>
  );
}

function Sidebar({ view, setView, state, onQuick, library, wishlist, follows, messages }) {
  // Zodiac theme gate — when active and the variant is loaded, delegate to
  // dist/zodiac/views.jsx. The original liquid-glass sidebar below is left
  // 100% untouched for every other theme.
  if (T.zodiac && window.ZodiacSidebar) {
    return <window.ZodiacSidebar view={view} setView={setView} state={state} onQuick={onQuick} library={library} wishlist={wishlist} follows={follows} messages={messages}/>;
  }
  // Admin gate — hit /admin/whoami once. Returns { role: 'admin'|'owner'|null }.
  // When null (403/not an admin), the Admin nav item is hidden entirely. The
  // hook is exposed as a global by admin.jsx; guard here for the case where
  // admin.jsx hasn't loaded (shouldn't happen, but defensive).
  const adminState = typeof window.useAdminRole === 'function' ? window.useAdminRole() : { role: null };
  const adminRole = adminState?.role || null;
  // Maker-studio gate — probes /maker/overview once and caches.
  const hasMakerProducts = typeof window.useHasMakerProducts === 'function' ? window.useHasMakerProducts() : false;

  // Hugin is the first-party plugin (Kassa product_id = "gleipnir") — gets
  // its own sidebar tab with exclusive highlight treatment. We resolve the
  // listing id by Kassa product_id so it tracks whichever real listing is
  // wired up server-side, and falls back to the legacy mock id during the
  // pre-publish window.
  const huginListing = (window.LISTINGS || []).find((x) =>
    (x.kassa_product_id || x.kassaProductId) === 'gleipnir',
  );
  const HUGIN_LISTING_ID = huginListing?.id || 'l-zephyro';
  const zephyroEntry = library?.items?.find((it) => it.listingId === HUGIN_LISTING_ID);
  const zephyroActive = !!(zephyroEntry && zephyroEntry.status === 'active'
    && (!zephyroEntry.expiresAt || zephyroEntry.expiresAt > Date.now()));

  // "Feed" pip — number of listings from followed creators created since the
  // user's last visit to the Feed view. Hidden when already on Feed.
  const feedNewCount = (() => {
    if (!follows || !follows.items.length) return 0;
    if (view.id === 'feed') return 0;
    const seen = follows.lastSeen || 0;
    return (window.LISTINGS || []).filter(
      (l) => follows.items.includes(l.sellerId) && (l.createdAt || 0) > seen
    ).length;
  })();

  const items = [
    { id: 'home',        label: t('nav.home'),        icon: <IHome/> },
    { id: 'leaderboard', label: t('nav.leaderboard'), icon: <IRank/> },
    { id: 'store',       label: t('nav.store'),       icon: <IStore/> },
    { id: 'discover',    label: t('nav.discover'),    icon: <ICompass/> },
    { id: 'claim',       label: t('nav.claim'),       icon: <IGift/> },
    { id: 'zephyro',     label: t('nav.zephyro'),     icon: <ListingTypeIcon type="plugin" size={17}/>, highlight: true, locked: !zephyroActive },
    { id: 'saved',       label: t('nav.saved'),       icon: <IHeart/>, badge: wishlist?.items?.length || 0 },
    { id: 'feed',        label: t('nav.feed'),        icon: <IFeed/>, newPip: feedNewCount },
    // Members — Discord guild directory backed by /members. Always shown;
    // bot keeps the list synced via gateway events.
    { id: 'members',     label: 'Members',            icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ) },
    { id: 'messages',    label: t('nav.messages'),    icon: <IMessage/>, badge: messages?.unreadCount || 0 },
    { id: 'trophies',    label: t('nav.trophies'),    icon: <ITrophy/> },
    // My Licenses — always shown for authed users; empty state sells the
    // idea if they don't own any Kassa products yet. Inline SVG key icon
    // since ui.jsx doesn't ship one.
    { id: 'licenses',    label: t('nav.licenses'),    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="4"/>
        <path d="M10.85 12.15 21 2M17 6l3 3M15 8l3 3"/>
      </svg>
    ) },
    // Maker Studio — surfaces only when the user has at least one Kassa-backed
    // listing (probed once at boot via /maker/overview; see effect below).
    // Regular users never see the tab.
    ...(hasMakerProducts ? [{ id: 'maker', label: t('nav.maker'), icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
      </svg>
    ) }] : []),
    { id: 'profile',     label: t('nav.profile'),     icon: <IUser/> },
    // Admin — gated by /admin/whoami. Shown only when server recognises the
    // user as admin (maker-mod role) or owner. The item appears at the bottom
    // of the static nav so it doesn't shuffle the usual layout for non-admins.
    ...(adminRole ? [{ id: 'admin', label: adminRole === 'owner' ? 'Admin (owner)' : 'Admin', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z"/>
      </svg>
    ) }] : []),
  ];
  // Active plugins from the user's library — render below the static nav as a
  // separate group titled "Plugins". Each item routes to plugin:<listingId>.
  const activePlugins = library ? getActivePlugins(library.items) : [];
  const hasLibrary = library && library.items.length > 0;
  const pct = Math.round(((state.aura - ME.prevLevelAura)/(ME.nextLevelAura - ME.prevLevelAura))*100);

  // Collapse state for the plugins group. Always starts collapsed on every
  // session — owner preference: "venha nativamente recolhido, sempre". The
  // user can still expand within the session (state held in memory), but
  // we don't persist their choice; next app open starts collapsed again.
  const [pluginsCollapsed, setPluginsCollapsed] = React.useState(true);
  const togglePluginsCollapsed = () => setPluginsCollapsed((v) => !v);

  // "NEW" pip on the Marketplace item. Shows when there are listings created
  // after the last time the user visited the store, using createdAt stamps
  // from user-published items. Persists the last-visit timestamp on nav so
  // the dot clears as soon as you open the page.
  const [lastMktVisit, setLastMktVisit] = React.useState(() => {
    try { return Number(localStorage.getItem('elyhub.marketplace.lastVisit') || 0); } catch { return 0; }
  });
  React.useEffect(() => {
    if (view.id === 'store') {
      const now = Date.now();
      setLastMktVisit(now);
      try { localStorage.setItem('elyhub.marketplace.lastVisit', String(now)); } catch {}
    }
  }, [view.id]);
  const newListingCount = (window.LISTINGS || []).filter((l) => l.createdAt && l.createdAt > lastMktVisit).length;
  return (
    <aside aria-label="Primary" className="no-scrollbar" style={{
      width: 240, flexShrink: 0, padding: '44px 20px 20px',
      // Each pane scrolls independently — see Shell's two-pane comment.
      // Was `position: sticky; top: 0` back when the body scrolled; now the
      // body is locked and this pane owns its own scroll region. The
      // .no-scrollbar class hides the bar visually while keeping the
      // overflow scrollable (wheel + trackpad still work).
      height: '100vh', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 4px' }}>
        {window.SERVER?.iconUrl ? (
          <img
            src={window.SERVER.iconUrl}
            alt={window.SERVER?.name || 'server'}
            style={{
              width: 28, height: 28, borderRadius: 8, objectFit: 'cover',
              border: `0.5px solid ${T.glassBorder}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          />
        ) : (
          <ILogo size={28}/>
        )}
        <span style={{ fontFamily: T.fontSans, fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>
          ElyHub
        </span>
      </div>

      {/* Nav wrapper — Glass panel restored (owner preference: keep the
          glassmorphism card behind the nav items in default themes). We
          drop the default 0 12px 50px outer shadow because the sidebar
          sits flush against the main pane, and that big dark halo bleeds
          to the right of the panel as a visible "shadow strip" between
          sidebar and main. Inset highlight kept so the glass still has
          a top edge. */}
      <Glass style={{
        padding: 6, flexShrink: 0,
        boxShadow: `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02)`,
      }}>
        <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(it => {
            const active = view.id === it.id;
            const showNewPip = it.id === 'store' && newListingCount > 0 && !active;
            // Hugin "anomaly" treatment — when the user is on a non-zodiac
            // theme, the Hugin sidebar entry is styled with the zodiac palette
            // (gold leaf border + ZIFlame icon + Cormorant italic) so it reads
            // as a glimpse of the celestial realm bleeding into the normal UI.
            // The Z palette + ZIFlame are global from tokens-zodiac.jsx /
            // ui-zodiac.jsx which load on every theme. Returns the styled
            // button directly, skipping the normal highlight path below.
            if (it.id === 'zephyro' && !T.zodiac && window.Z) {
              const Z = window.Z;
              const Flame = window.ZIFlame;
              const Lock  = window.ZILock;
              return (
                <button key={it.id} data-tour={`nav-${it.id}`} aria-current={active ? 'page' : undefined}
                  aria-label={it.label} onClick={() => setView({ id: it.id })}
                  title={it.locked ? 'Hugin · Subscription required' : 'Hugin · Active'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px',
                    background: active
                      ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`
                      : `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                    border: `1px solid ${active ? Z.gold : Z.hair3}`,
                    borderRadius: 2,
                    color: active ? Z.parch : Z.text,
                    fontFamily: '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif',
                    fontStyle: 'italic', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .2s',
                    position: 'relative',
                    boxShadow: active
                      ? `inset 0 0 12px ${Z.goldGlow}, 0 0 16px ${Z.goldGlow}`
                      : `inset 0 0 8px ${Z.goldGlow}, 0 0 14px rgba(201,162,78,0.20)`,
                  }}>
                  {/* gold leaf rule on left edge */}
                  <span style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                    background: `linear-gradient(180deg, transparent, ${Z.gold}, transparent)`,
                  }}/>
                  {Flame && React.createElement(Flame, { size: 16, color: Z.gold, sw: 1 })}
                  <span style={{
                    flex: 1,
                    background: `linear-gradient(180deg, ${Z.goldHi} 0%, ${Z.gold} 50%, ${Z.goldLo} 100%)`,
                    WebkitBackgroundClip: 'text', backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent', color: 'transparent',
                  }}>{it.label}</span>
                  {it.locked && Lock && (
                    <span title="Subscription required" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20,
                      background: Z.ink, border: `1px solid ${Z.hair2}`,
                      color: Z.gold,
                    }}>
                      {React.createElement(Lock, { size: 10, color: Z.gold })}
                    </span>
                  )}
                  {!it.locked && (
                    <span style={{
                      padding: '2px 8px',
                      background: `linear-gradient(180deg, ${Z.goldHi}, ${Z.gold} 50%, ${Z.goldLo})`,
                      color: Z.ink,
                      fontFamily: '"Cinzel","Cormorant SC",serif',
                      fontWeight: 500, fontSize: 9, letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      boxShadow: `0 0 6px ${Z.goldGlow}`,
                    }}>✦ ACTIVE</span>
                  )}
                </button>
              );
            }
            // Zephyro gets a soft lilac→accent gradient background and a
            // padlock chip when not subscribed. Reads as "premium" without
            // shouting. Active sub flips the lock to a checkmark accent.
            const isHighlight = !!it.highlight;
            const highlightBg = isHighlight && !active
              ? 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(61,123,255,0.07))'
              : undefined;
            const highlightShadow = isHighlight && !active
              ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 18px rgba(167,139,250,0.10)`
              : undefined;
            // Icon cloning — the plugin ListingTypeIcon already has sizing
            // baked in, so we avoid re-cloning it. Stock Icon components do
            // accept size/color, so we keep the existing path for those.
            const iconNode = it.icon.type === ListingTypeIcon
              ? React.cloneElement(it.icon, { color: active ? T.accentHi : (isHighlight ? T.lilac : 'currentColor') })
              : React.cloneElement(it.icon, { size: 17, color: active ? T.accentHi : (isHighlight ? T.lilac : 'currentColor') });
            return (
              <button key={it.id} data-tour={`nav-${it.id}`} aria-current={active ? 'page' : undefined} aria-label={it.label} onClick={() => setView({ id: it.id })} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: T.r.md,
                background: active ? 'rgba(255,255,255,0.10)' : (highlightBg || 'transparent'),
                boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : (highlightShadow || 'none'),
                border: 'none',
                color: active ? T.text : T.text2,
                fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all .15s',
                position: 'relative',
              }}>
                {iconNode}
                <span style={{ flex: 1 }}>{it.label}</span>
                {showNewPip && (
                  <span
                    title={`${newListingCount} new ${newListingCount === 1 ? 'listing' : 'listings'}`}
                    style={{
                      padding: '2px 8px', borderRadius: T.r.pill,
                      background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                      color: '#fff',
                      fontFamily: T.fontSans, fontWeight: 700, fontSize: 9,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      boxShadow: `0 0 8px ${T.accent}88`,
                      lineHeight: 1.4, whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {newListingCount > 9 ? '9+' : newListingCount} new
                  </span>
                )}
                {!!it.newPip && !active && (
                  <span
                    title={`${it.newPip} new from followed creators`}
                    style={{
                      padding: '2px 8px', borderRadius: T.r.pill,
                      background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                      color: '#fff',
                      fontFamily: T.fontSans, fontWeight: 700, fontSize: 9,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      boxShadow: `0 0 8px ${T.accent}88`,
                      lineHeight: 1.4, whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {it.newPip > 9 ? '9+' : it.newPip} new
                  </span>
                )}
                {!!it.badge && !active && (
                  <span
                    title={`${it.badge} saved`}
                    style={{
                      padding: '1px 7px', borderRadius: T.r.pill,
                      background: 'rgba(255,107,143,0.16)',
                      border: '0.5px solid rgba(255,107,143,0.35)',
                      color: '#ff9ab1',
                      fontFamily: T.fontSans, fontWeight: 700, fontSize: 10,
                      lineHeight: 1.45,
                    }}
                  >
                    {it.badge > 99 ? '99+' : it.badge}
                  </span>
                )}
                {isHighlight && it.locked && (
                  <span
                    title="Subscription required"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '0.5px solid rgba(167,139,250,0.35)',
                      color: T.lilac,
                    }}
                  >
                    <ILock size={10}/>
                  </span>
                )}
                {isHighlight && !it.locked && (
                  <span
                    title="Active"
                    style={{
                      padding: '1px 7px', borderRadius: T.r.pill,
                      background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
                      color: '#fff',
                      fontFamily: T.fontSans, fontWeight: 700, fontSize: 9,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      boxShadow: `0 0 8px ${T.lilac}66`,
                      lineHeight: 1.4,
                    }}
                  >
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </Glass>

      {/* ── Plugins group — only shows if the user has at least one purchase
            (active plugin OR any library item, so MyLibrary stays accessible
            after a sub expires). Glass panel matches the main nav above —
            same outer-shadow override (avoid the dark strip on the right). */}
      {hasLibrary && (
        <Glass style={{
          padding: 6, flexShrink: 0,
          boxShadow: `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02)`,
        }}>
          {/* Collapsible header — click to show/hide the plugin list. Chevron
              rotates 90° when collapsed. Counter stays visible either way. */}
          <button
            onClick={togglePluginsCollapsed}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '8px 12px 4px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...TY.micro, color: T.text3, textAlign: 'left',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                 style={{ transform: pluginsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .18s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span style={{ flex: 1 }}>PLUGINS</span>
            {activePlugins.length > 0 && (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{activePlugins.length}</span>
            )}
          </button>
          {!pluginsCollapsed && (
            <nav aria-label="Installed plugins" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activePlugins.map(({ entry, listing }) => {
                // Hugin has a dedicated, more polished page (ZephyroView) —
                // route the sidebar entry there instead of the generic
                // PluginPanelView so we don't have two pages for the same plugin.
                const isHugin = (listing.kassa_product_id || listing.kassaProductId) === 'gleipnir';
                const navId = isHugin ? 'zephyro' : `plugin:${listing.id}`;
                const active = view.id === navId;
                const exp = expiryLabel(entry.expiresAt);
                const expiringSoon = entry.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;
                const autoRenew = entry.autoRenew !== false;
                // Tooltip: combine expiry + renewal price + auto-renew status.
                const tooltip = [
                  exp,
                  `Renews ${fmt(listing.price)} aura`,
                  autoRenew ? 'Auto-renew on' : 'Auto-renew off',
                ].filter(Boolean).join(' · ');
                return (
                  <button key={listing.id} onClick={() => setView({ id: navId })} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: T.r.md,
                    background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                    border: 'none',
                    color: active ? T.text : T.text2,
                    fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                  }} title={tooltip}>
                    <span style={{ color: active ? T.accentHi : 'currentColor', display: 'inline-flex' }}>
                      <ListingTypeIcon type="plugin" size={17}/>
                    </span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.title}</span>
                    {expiringSoon && (
                      <span
                        title={tooltip}
                        style={{
                          ...TY.small, fontSize: 10, fontWeight: 700,
                          color: '#f5c451',
                          padding: '1px 6px', borderRadius: T.r.pill,
                          background: 'rgba(245, 196, 81, 0.14)',
                          border: '0.5px solid rgba(245, 196, 81, 0.38)',
                          whiteSpace: 'nowrap',
                        }}
                      >{fmt(listing.price)}</span>
                    )}
                  </button>
                );
              })}
              {/* My Library entry — always visible if any item ever owned */}
              {(() => {
                const active = view.id === 'library';
                return (
                  <button onClick={() => setView({ id: 'library' })} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: T.r.md,
                    background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                    border: 'none',
                    color: active ? T.text : T.text3,
                    fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                    marginTop: activePlugins.length ? 4 : 0,
                    paddingTop: activePlugins.length ? 12 : 10,
                    borderTop: activePlugins.length ? `0.5px solid ${T.glassBorder}` : 'none',
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? T.accentHi : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>
                    <span style={{ flex: 1 }}>My Library</span>
                    {(() => {
                      // Stale localStorage can hold entries for listings that
                      // were later removed/unpublished. Show the count of
                      // items whose listing is still live in window.LISTINGS.
                      const live = window.LISTINGS || [];
                      const byId = new Map(live.map((l) => [l.id, l]));
                      // Dedup tiered Kassa products (1key + 2key Hugin → 1).
                      const keys = new Set();
                      for (const it of library.items) {
                        const l = byId.get(it.listingId);
                        if (!l) continue;
                        const kpid = l.kassa_product_id || l.kassaProductId;
                        keys.add(kpid ? `kpid:${kpid}` : `id:${l.id}`);
                      }
                      return (
                        <span style={{ ...TY.small, fontSize: 10, color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{keys.size}</span>
                      );
                    })()}
                  </button>
                );
              })()}
            </nav>
          )}
        </Glass>
      )}

      <div style={{ flex: 1 }}/>

      {/* Balance / aura panel — kept as Glass card. Same outer-shadow
          override as the nav above, so its right edge doesn't paint a
          dark strip into the main column. */}
      <Glass style={{
        padding: 18,
        boxShadow: `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02)`,
      }} data-tour="aura">
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

// Normalises a string for fuzzy-ish matching: lowercase, strip diacritics,
// strip non-alphanumerics. "Inês Pereira" and "ines" both land at "inespereira"
// / "ines" so searching "ines" matches. Cheap and good enough for ~50 rows
// of members + dozens of rewards/trophies.
function normalizeSearch(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

// Score a candidate against the query. Higher = better match.
// prefix match > substring match > no match.
function scoreMatch(haystack, needle) {
  const h = normalizeSearch(haystack);
  const n = normalizeSearch(needle);
  if (!n) return 0;
  const idx = h.indexOf(n);
  if (idx < 0) return 0;
  return idx === 0 ? 100 - Math.min(50, h.length - n.length) : 50 - idx;
}

// Build a flat ranked result list from the current in-memory data.
function buildSearchResults(query, limit = 8) {
  if (!query || !query.trim()) return [];
  const results = [];

  for (const m of window.MEMBERS || []) {
    const s = Math.max(
      scoreMatch(m.name, query),
      scoreMatch(m.tag, query) * 1.1, // slight boost — tags are typed more
    );
    if (s > 0) results.push({ kind: 'member', id: m.id, title: m.name, sub: `@${m.tag}`, score: s, data: m });
  }

  // Listings — title is the primary signal, tagline/tags pull weight too.
  // Seller-name matches score lower so "Inês" still surfaces the member row first.
  for (const l of window.LISTINGS || []) {
    const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
    const tagHit = (l.tags || []).reduce((best, t) => Math.max(best, scoreMatch(t, query) * 0.7), 0);
    const s = Math.max(
      scoreMatch(l.title, query),
      scoreMatch(l.tagline || l.sub, query) * 0.65,
      tagHit,
      seller ? scoreMatch(seller.name, query) * 0.4 : 0,
    );
    if (s > 0) {
      const meta = listingTypeMeta(l.type);
      results.push({
        kind: 'listing', id: l.id,
        title: l.title,
        sub: `${meta.label.replace(/s$/, '')}${seller ? ` · ${seller.name}` : ''}${l.price ? ` · ${fmt(l.price)}${l.billing === 'monthly' ? '/mo' : ''}` : ''}`,
        score: s, data: l,
      });
    }
  }

  for (const r of window.REWARDS || []) {
    const s = Math.max(
      scoreMatch(r.title, query),
      scoreMatch(r.sub, query) * 0.7,
      scoreMatch(r.category, query) * 0.6,
    );
    if (s > 0) results.push({ kind: 'reward', id: r.id, title: r.title, sub: r.sub, score: s, data: r });
  }

  for (const tr of window.TROPHIES || []) {
    const s = Math.max(
      scoreMatch(tr.name, query),
      scoreMatch(tr.desc, query) * 0.7,
    );
    if (s > 0) results.push({ kind: 'trophy', id: tr.id, title: tr.name, sub: tr.desc, score: s, data: tr });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function SearchBar({ setView, onQuick }) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  const results = React.useMemo(() => buildSearchResults(query, 8), [query]);

  // ⌘K / Ctrl+K — global focus shortcut. Feels ubiquitous enough that users
  // expect it (Linear, Raycast, Notion all use this).
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close dropdown on outside click. Mousedown (not click) so we close before
  // any nav handler fires on the target.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Reset highlighted row whenever the result set changes — otherwise an
  // old cursor index could end up pointing past the new, shorter list.
  React.useEffect(() => { setCursor(0); }, [query]);

  const activate = (r) => {
    if (!r) return;
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    if (r.kind === 'member') {
      // Creator profile exists now — jump straight to it.
      setView?.({ id: 'profile', userId: r.id });
    } else if (r.kind === 'listing') {
      setView?.({ id: 'listing', focusId: r.id });
    } else if (r.kind === 'reward') {
      setView?.({ id: 'claim', focusId: r.id });
    } else if (r.kind === 'trophy') {
      setView?.({ id: 'trophies', focusId: r.id });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (query) { setQuery(''); }
      else { setOpen(false); inputRef.current?.blur(); }
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(results[cursor]);
    }
  };

  const kindLabel = { member: 'Member', listing: 'Listing', reward: 'Reward', trophy: 'Trophy' };
  const kindColor = { member: T.accentHi, listing: T.accent, reward: T.lilac, trophy: T.green };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
      <Glass style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: T.r.pill,
        border: open && results.length > 0 ? `0.5px solid ${T.glassBorder2}` : undefined,
      }} data-tour="search">
        <ISearch size={15} color={T.text3}/>
        <input
          ref={inputRef}
          data-topbar-search=""
          type="search"
          aria-label={t('top.search')}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('top.search')}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: T.text, fontFamily: T.fontSans, fontSize: 13,
          }}
        />
        <span style={{ ...TY.mono, color: T.text3, padding: '2px 7px', border: `0.5px solid ${T.glassBorder}`, borderRadius: 5, background: 'rgba(255,255,255,0.05)' }}>⌘K</span>
      </Glass>
      {open && !query.trim() && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          zIndex: 60,
          ...glass(2, {
            padding: 10, borderRadius: T.r.md,
            animation: 'slideUp .12s cubic-bezier(.2,.9,.3,1.05)',
          }),
        }}>
          <div style={{ ...TY.micro, color: T.text3, padding: '4px 8px 8px' }}>Jump to</div>
          {[
            { label: 'Marketplace',  sub: 'Browse all listings',            kind: 'nav', view: { id: 'store' },       color: T.accent  },
            { label: 'Feed',         sub: 'New from creators you follow',   kind: 'nav', view: { id: 'feed' },        color: T.accentHi },
            { label: 'Saved',        sub: 'Your wishlist',                  kind: 'nav', view: { id: 'saved' },       color: '#ff6b8f'  },
            { label: 'Library',      sub: 'Things you own or subscribe to', kind: 'nav', view: { id: 'library' },     color: T.green   },
            { label: 'Leaderboard',  sub: 'Top members this week',          kind: 'nav', view: { id: 'leaderboard' }, color: T.accentHi },
            { label: 'Trophies',     sub: 'Your unlocks and progress',      kind: 'nav', view: { id: 'trophies' },    color: T.green    },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => { setQuery(''); setOpen(false); inputRef.current?.blur(); setView?.(s.view); }}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: T.r.sm,
                background: 'transparent', border: 'none', cursor: 'pointer', color: T.text,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: s.color,
                boxShadow: `0 0 8px ${s.color}`, flexShrink: 0,
              }}/>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: T.text3 }}>{s.sub}</span>
              </span>
            </button>
          ))}

          {(() => {
            // Showcase a few unlockable rewards as quick-redeem shortcuts.
            // Prefer the featured one + a couple extras the user can afford
            // given their current aura. Falls back to the first three.
            const all = window.REWARDS || [];
            const featured = all.find((r) => r.featured);
            const rest = all.filter((r) => r !== featured);
            const pick = [featured, ...rest].filter(Boolean).slice(0, 3);
            if (!pick.length) return null;
            return (
              <>
                <div style={{ height: 1, background: T.glassBorder, margin: '8px 2px' }}/>
                <div style={{ ...TY.micro, color: T.text3, padding: '4px 8px 8px' }}>Popular rewards</div>
                {pick.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setQuery(''); setOpen(false); inputRef.current?.blur(); setView?.({ id: 'store', focusId: r.id }); }}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 8px', borderRadius: T.r.sm,
                      background: 'transparent', border: 'none', cursor: 'pointer', color: T.text,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: T.r.sm, overflow: 'hidden', flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {r.image
                        ? <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                        : <IGift size={14} color={T.text3}/>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      <span style={{ display: 'block', fontSize: 11, color: T.text3 }}>{r.sub}</span>
                    </span>
                    <span style={{ ...TY.mono, fontSize: 11, color: T.accentHi, flexShrink: 0 }}>{fmt(r.price)}</span>
                  </button>
                ))}
              </>
            );
          })()}

          <div style={{ height: 1, background: T.glassBorder, margin: '8px 2px' }}/>
          <div style={{ ...TY.mono, color: T.text3, fontSize: 10, padding: '6px 8px 4px' }}>
            Try "hugin", "plugin", "ines" — or press ↑↓ to navigate, ↵ to open
          </div>
        </div>
      )}
      {open && query.trim() && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          zIndex: 60,
          ...glass(2, {
            padding: 6, borderRadius: T.r.md,
            animation: 'slideUp .12s cubic-bezier(.2,.9,.3,1.05)',
            maxHeight: 420, overflowY: 'auto',
          }),
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '14px 12px', color: T.text3, fontSize: 13 }}>
              No matches for "{query}"
            </div>
          ) : results.map((r, i) => (
            <button
              key={`${r.kind}:${r.id}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => activate(r)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: T.r.sm,
                background: cursor === i ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: T.text,
              }}
            >
              <span style={{
                ...TY.micro, fontSize: 9,
                padding: '3px 7px', borderRadius: T.r.pill,
                background: `${kindColor[r.kind]}22`, color: kindColor[r.kind],
                flexShrink: 0,
              }}>{kindLabel[r.kind]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                {r.sub && <span style={{ display: 'block', fontSize: 11, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>}
              </span>
              {cursor === i && <span style={{ ...TY.mono, color: T.text3, fontSize: 10 }}>↵</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar({ state, onQuick, onNotif, setView, onSettings, library, reviews, follows }) {
  // Zodiac theme gate — same pattern as Sidebar. Original glass topbar below
  // stays untouched for non-zodiac themes.
  if (T.zodiac && window.ZodiacTopbar) {
    return <window.ZodiacTopbar state={state} onQuick={onQuick} onNotif={onNotif} setView={setView} onSettings={onSettings} library={library} reviews={reviews} follows={follows}/>;
  }
  // Subscribe to auth changes so sign-in / sign-out re-render the topbar.
  // Before: authedUser was read once per render and signOut() mutated a
  // module-level var, so the button visually "did nothing" until something
  // else forced a render.
  const [authedUser, setAuthedUser] = React.useState(() => window.ElyAuth?.getCurrentUser?.() || null);
  React.useEffect(() => {
    const unsub = window.ElyAuth?.subscribe?.(() => {
      setAuthedUser(window.ElyAuth?.getCurrentUser?.() || null);
    });
    return () => unsub?.();
  }, []);
  const [signingIn, setSigningIn] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await window.ElyAuth.signIn();
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    // Tauri's WKWebView silently no-ops window.confirm(), so relying on it
    // made the Sign out button look broken. Just sign out directly — the user
    // can always sign back in if they misclicked.
    setMenuOpen(false);
    window.ElyAuth.signOut();
  };

  // Close the profile menu on outside click. Using mousedown (not click) so
  // the menu closes before any in-app navigation handler fires on a target.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // Unread indicator — any aura_log event about me that arrived after the
  // last time the drawer was opened. Recomputed every render (cheap; AURA_FEED
  // is capped at 30 rows).
  const meId = authedUser?.id || window.ME?.id || null;
  const lastSeen = getLastSeen();
  const unreadCount = meId
    ? buildNotifications(window.AURA_FEED || [], meId, lastSeen, { library, reviews, follows }).filter((n) => n.unread).length
    : 0;

  return (
    <div style={{
      height: 76, padding: '20px 48px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Viewport-centered search — fixed positioning relative to the window
          itself (not the topbar, which sits inside the main content column
          *after* the sidebar). `left: 50vw + translateX(-50%)` plants the
          pill at the exact horizontal middle of the window on every size,
          including fullscreen. `top: 30px` aligns with the topbar's optical
          centre (padding-top is 20, pill height ~40, so 30 hits the middle).
          z-index 11 keeps it above the topbar's z-10 so dropdowns render
          clean. The wrapper is pointer-events:none so clicks pass through to
          anything underneath (e.g. the right-side action buttons) except on
          the pill itself. */}
      <div style={{
        position: 'fixed', left: '50vw', top: 30,
        transform: 'translateX(-50%)',
        width: 440, maxWidth: 'calc(100vw - 96px)',
        pointerEvents: 'none', zIndex: 11,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <SearchBar setView={setView} onQuick={onQuick}/>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn variant="secondary" icon={<IGift size={15}/>} size="sm" onClick={onQuick.gift}>{t('top.gift')}</Btn>
        <button onClick={onNotif} title={unreadCount ? `${unreadCount} ${t('top.unread')}` : t('top.inbox')} style={{
          width: 38, height: 38, borderRadius: '50%',
          ...glass(1, { padding: 0 }),
          color: T.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <IBell size={16}/>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%',
              background: T.accentHi, boxShadow: `0 0 8px ${T.accent}`,
            }}/>
          )}
        </button>
        {authedUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={t('menu.account')}
              style={{
                ...glass(1, { padding: 0 }),
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 14px 5px 5px', borderRadius: T.r.pill,
                border: 'none', cursor: 'pointer', color: T.text,
              }}
            >
              <Avatar name={authedUser.globalName || authedUser.username} src={authedUser.avatarUrl} size={28} ring/>
              <span style={{ ...TY.small, color: T.text, fontWeight: 500 }}>
                {(authedUser.globalName || authedUser.username).split(' ')[0]}
              </span>
              <IChevR size={12} color={T.text3} style={{ transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}/>
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 220, zIndex: 50,
                ...glass(2, {
                  padding: 6, borderRadius: T.r.md,
                  animation: 'slideUp .15s cubic-bezier(.2,.9,.3,1.05)',
                }),
              }}>
                <div style={{ padding: '10px 12px 12px', borderBottom: `0.5px solid ${T.glassBorder}`, marginBottom: 4 }}>
                  <div style={{ ...TY.small, color: T.text, fontWeight: 500 }}>{authedUser.globalName || authedUser.username}</div>
                  <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 2 }}>@{authedUser.username}</div>
                </div>
                <MenuItem icon={<IUser size={14}/>} label={t('menu.myProfile')} onClick={() => { setMenuOpen(false); setView?.({ id: 'profile' }); }}/>
                <MenuItem icon={<IGift size={14}/>} label={t('menu.giftAura')} onClick={() => { setMenuOpen(false); onQuick.gift(); }}/>
                <MenuItem icon={<IHelp size={14}/>} label={t('shortcuts.title')} onClick={() => { setMenuOpen(false); onQuick.shortcuts?.(); }}/>
                <MenuItem icon={<IHelp size={14}/>} label="Replay tour" onClick={() => { setMenuOpen(false); onQuick.tour?.(); }}/>
                <MenuItem icon={<ISettings size={14}/>} label={t('menu.settings')} onClick={() => { setMenuOpen(false); onSettings?.(); }}/>
                <div style={{ height: 1, background: T.glassBorder, margin: '4px 0' }}/>
                <MenuItem icon={<ILogOut size={14}/>} label={t('menu.signOut')} danger onClick={handleSignOut}/>
              </div>
            )}
          </div>
        ) : (
          <Btn variant="primary" size="sm" onClick={handleSignIn}>
            {signingIn ? t('top.signingIn') : t('top.signin')}
          </Btn>
        )}
      </div>
    </div>
  );
}

// A single item in the profile dropdown. `danger` flips it red (used for Sign out).
function MenuItem({ icon, label, onClick, danger }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: T.r.sm,
        background: hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: danger ? '#fca5a5' : T.text,
        fontFamily: T.fontSans, fontSize: 13,
      }}
    >
      <span style={{ color: danger ? '#fca5a5' : T.text3, display: 'inline-flex' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Expose host SearchBar so the Zodiac topbar (dist/zodiac/views.jsx) can
// embed the real search instead of rendering a static placeholder.
Object.assign(window, { SearchBar });
