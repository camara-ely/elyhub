// dist/zodiac/views.jsx — Zodiac variants of Sidebar, Topbar, HomeView.
//
// These mount only when T.zodiac is true (gated at the top of each host
// component in shell.jsx + home.jsx). They consume the SAME props the host
// passes — so real data (ME, LISTINGS, library, state, view, setView,
// onQuick) flows through, and routes still work via setView({id}).
//
// Visual primitives come from window.Z (palette) + window.Z* components
// loaded by zodiac/tokens-zodiac.jsx + zodiac/ui-zodiac.jsx. We never
// reference T tokens directly here — the design is fully ink+gold.
//
// Loaded as <script type="text/babel"> in index.html, after shell.jsx and
// home.jsx, so window.ZodiacSidebar / Topbar / HomeView are defined by the
// time the gates are reached on render.

// ─── Cosmic backdrop — fixed layer behind everything when zodiac is on ───
function ZCosmicBG() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 50% 0%, #15110a 0%, transparent 55%),
          linear-gradient(180deg, #0a0805 0%, #060503 100%)
        `,
      }}/>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.22 }}>
        {window.ZStarfield && React.createElement(window.ZStarfield, { count: 70, color: window.Z.parch })}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)',
      }}/>
    </div>
  );
}

// ─── Roman numeral helper ───
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
function roman(n) { return ROMAN[n] || String(n); }

// ─── Resolve avatar URL from any user shape (MEMBERS row, /members API row,
// authedUser, message thread, etc). Tries every field name in priority
// order — Discord CDN URL when only avatar_hash is given.
function zAvatarSrc(u) {
  if (!u) return null;
  if (u.avatarUrl) return u.avatarUrl;
  if (u.avatar_url) return u.avatar_url;
  if (u.avatar && /^https?:\/\//.test(u.avatar)) return u.avatar;
  if (u.avatar_hash && u.id) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar_hash}.png?size=128`;
  if (u.avatarHash && u.id)  return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatarHash}.png?size=128`;
  return null;
}
window.zAvatarSrc = zAvatarSrc;

// Inline glyphs for nav slots that aren't in ui-zodiac's icon set —
// keeps the line-art-on-gold visual language but avoids reusing the same
// bell three times (saved / feed / messages all looked identical).
function ZIHeart(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>
    </svg>
  );
}
function ZIPulse(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M3 12h4l2-6 4 12 2-6h6"/>
    </svg>
  );
}
function ZIScroll(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M5 4h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4z"/>
      <path d="M9 9h7M9 13h7"/>
      <path d="M5 4a3 3 0 0 0-3 3v9"/>
    </svg>
  );
}
function ZICompass(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M16 8l-2.5 5.5L8 16l2.5-5.5L16 8z" fill={p.color || Z.gold} fillOpacity="0.5"/>
    </svg>
  );
}
function ZIQuill(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M20 4c-7 0-12 5-12 12 0 .5.05 1 .1 1.5"/>
      <path d="M4 20l5-5"/>
      <path d="M14 10c-4 0-6 4-6 6"/>
    </svg>
  );
}
function ZIShield(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z"/>
    </svg>
  );
}
function ZIPeople(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <circle cx="9" cy="8" r="3.2"/>
      <path d="M3 20a6 6 0 0 1 12 0"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M14 20a5 5 0 0 1 8-3.5"/>
    </svg>
  );
}
function ZIChat(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>
    </svg>
  );
}
function ZIKey(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <circle cx="8" cy="15" r="4"/>
      <path d="M11 12 21 2M17 6l3 3M15 8l3 3"/>
    </svg>
  );
}
function ZIAnvil(p) {
  const Z = window.Z;
  const sw = p.sw || 1;
  return (
    <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
         stroke={p.color || Z.gold} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={p.style}>
      <path d="M3 9h11l3 3h4M3 9v3h11M14 12v4M10 16h8M8 20h12"/>
    </svg>
  );
}

// ─── Map host nav id → zodiac glyph icon component ───
function zodiacIconForNav(id) {
  const m = {
    home:        window.ZIHome,
    leaderboard: window.ZIRank,
    store:       window.ZIStore,
    discover:    ZICompass,
    claim:       window.ZIGift,
    zephyro:     window.ZIFlame,
    saved:       ZIHeart,
    feed:        ZIPulse,
    members:     ZIPeople,
    messages:    ZIChat,
    trophies:    window.ZITrophy,
    licenses:    ZIKey,
    maker:       ZIAnvil,
    profile:     window.ZIUser,
    admin:       ZIShield,
    library:     ZIScroll,
    rewards:     window.ZIGift,
  };
  return m[id] || window.ZIHome;
}

// ─── Zodiac Sidebar ───
function ZodiacSidebar({ view, setView, state, onQuick, library, wishlist, follows, messages }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.ZodiacFlavor?.goldFill || window.goldFill;

  // Reuse host gates (admin, maker, hugin) — same logic as Sidebar in shell.jsx.
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

  const tx = (k, fb) => {
    try { return (typeof t === 'function' ? t(k) : null) || fb; } catch { return fb; }
  };

  const items = [
    { id: 'home',        label: tx('nav.home', 'Home') },
    { id: 'leaderboard', label: tx('nav.leaderboard', 'Leaderboard') },
    { id: 'store',       label: tx('nav.store', 'Store') },
    { id: 'discover',    label: tx('nav.discover', 'Discover') },
    { id: 'claim',       label: tx('nav.claim', 'Claim') },
    { id: 'zephyro',     label: tx('nav.zephyro', 'Hugin'), highlight: true, locked: !zephyroActive },
    { id: 'saved',       label: tx('nav.saved', 'Saved'), badge: wishlist?.items?.length || 0 },
    { id: 'feed',        label: tx('nav.feed', 'Feed') },
    { id: 'members',     label: 'Members' },
    { id: 'messages',    label: tx('nav.messages', 'Messages'), badge: messages?.unreadCount || 0 },
    { id: 'trophies',    label: tx('nav.trophies', 'Trophies') },
    { id: 'licenses',    label: tx('nav.licenses', 'My Licenses') },
    ...(hasMakerProducts ? [{ id: 'maker', label: tx('nav.maker', 'Maker') }] : []),
    { id: 'profile',     label: tx('nav.profile', 'Profile') },
    ...(adminRole ? [{ id: 'admin', label: adminRole === 'owner' ? 'Admin (owner)' : 'Admin' }] : []),
  ];

  // Active plugins from library (mirrors host Sidebar) — renders as a
  // collapsible group below the static nav.
  const activePlugins = (library && typeof window.getActivePlugins === 'function')
    ? window.getActivePlugins(library.items) : [];
  const hasLibrary = library && library.items && library.items.length > 0;
  // Always start collapsed on each session (matches the host Sidebar in
  // shell.jsx — owner preference). User can toggle in-session but state is
  // not persisted; next app open starts collapsed again.
  const [pluginsCollapsed, setPluginsCollapsed] = React.useState(true);
  const togglePluginsCollapsed = () => setPluginsCollapsed((v) => !v);

  const auraNow = (window.ME?.aura) ?? state.aura;
  const prev = window.ME?.prevLevelAura ?? 0;
  const next = window.ME?.nextLevelAura ?? 1;
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / Math.max(1, (next - prev))) * 100)));

  return (
    <aside aria-label="Primary" className="no-scrollbar" style={{
      width: 250, flexShrink: 0, padding: '36px 22px 22px',
      // Independent scroll pane — matches the default Sidebar in shell.jsx.
      // The body is locked by Shell's outer container, so each pane owns
      // its own scroll. `position: sticky` + `top: 0` are gone (the body
      // doesn't scroll anymore so sticky has nothing to anchor against).
      height: '100vh', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 22,
      // Zodiac-only: keep the parchment-panel feel via a hairline rule and
      // a soft vertical wash. The default (non-zodiac) Sidebar has no such
      // differentiation — owner preference: zodiac wants the divider, light
      // theme does not.
      borderRight: `1px solid ${Z.hair}`,
      background: 'linear-gradient(180deg, rgba(10,9,8,0.6), rgba(10,9,8,0.3))',
    }}>
      {/* Logo block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 16px', borderBottom: `1px solid ${Z.hair}` }}>
        {window.ZLogo && React.createElement(window.ZLogo, { size: 34 })}
        <div>
          <div style={{ ...ZTY.h3, color: Z.parch, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1 }}>
            Ely<span style={goldFill || { color: Z.gold }}>Hub</span>
          </div>
          <div style={{ ...ZTY.capsSm, color: Z.text3, marginTop: 4 }}>AURA · 2026</div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => {
          const active = view.id === it.id;
          const Icon = zodiacIconForNav(it.id);
          // Hugin gets the exact same anomaly treatment as in non-zodiac
          // themes — full ink+gold border, gold-leaf text, glow, ACTIVE
          // badge — so the item reads identically across themes.
          const isHugin = it.id === 'zephyro';
          return (
            <button key={it.id} onClick={() => setView({ id: it.id })} style={isHugin ? {
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px',
              background: active
                ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`
                : `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${active ? Z.gold : Z.hair3}`,
              borderRadius: 2,
              color: active ? Z.parch : Z.text,
              fontFamily: '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif',
              fontStyle: 'normal', fontWeight: 600, fontSize: 15,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all .2s',
              position: 'relative',
              boxShadow: active
                ? `inset 0 0 12px ${Z.goldGlow}, 0 0 16px ${Z.goldGlow}`
                : `inset 0 0 8px ${Z.goldGlow}, 0 0 14px rgba(201,162,78,0.20)`,
            } : {
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '11px 12px', borderRadius: 0,
              background: active ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})` : 'transparent',
              border: 'none',
              borderLeft: active ? `2px solid ${Z.gold}` : '2px solid transparent',
              color: active ? Z.parch : Z.text2,
              fontFamily: Z.fontSerif, fontSize: 15, fontWeight: 400,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all .2s',
              position: 'relative',
            }}>
              {isHugin ? (
                // Vertical gold rule on the left edge — matches host anomaly.
                <span style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                  background: `linear-gradient(180deg, transparent, ${Z.gold}, transparent)`,
                }}/>
              ) : (
                <span style={{
                  ...ZTY.capsSm, color: active ? Z.gold : Z.text4,
                  width: 22, textAlign: 'center', fontFamily: Z.fontCaps,
                }}>{roman(i + 1)}</span>
              )}
              {Icon && React.createElement(Icon, {
                size: isHugin ? 16 : 17,
                color: isHugin ? Z.gold : (active ? Z.gold : Z.text2),
                sw: 1,
              })}
              {isHugin ? (
                <span style={{
                  flex: 1, fontStyle: 'italic',
                  background: `linear-gradient(180deg, ${Z.goldHi} 0%, ${Z.gold} 50%, ${Z.goldLo} 100%)`,
                  WebkitBackgroundClip: 'text', backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', color: 'transparent',
                }}>{it.label}</span>
              ) : (
                <span style={{ flex: 1, fontStyle: active ? 'italic' : 'normal' }}>{it.label}</span>
              )}
              {isHugin && it.locked && window.ZILock && (
                <span title="Subscription required" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20,
                  background: Z.ink, border: `1px solid ${Z.hair2}`,
                  color: Z.gold,
                }}>
                  {React.createElement(window.ZILock, { size: 10, color: Z.gold })}
                </span>
              )}
              {isHugin && !it.locked && (
                <span style={{
                  padding: '2px 8px',
                  background: `linear-gradient(180deg, ${Z.goldHi}, ${Z.gold} 50%, ${Z.goldLo})`,
                  color: Z.ink,
                  fontFamily: '"Cinzel","Cormorant SC",serif',
                  fontStyle: 'normal',
                  fontWeight: 600, fontSize: 9, letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  boxShadow: `0 0 6px ${Z.goldGlow}`,
                }}>✦ ACTIVE</span>
              )}
              {!!it.badge && !active && (
                <span style={{
                  ...ZTY.capsSm, fontSize: 9, padding: '1px 6px',
                  border: `1px solid ${Z.hair2}`, color: Z.text2,
                  background: Z.ink3,
                }}>{it.badge > 99 ? '99+' : it.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active plugins group + library link */}
      {hasLibrary && (
        <div style={{ marginTop: 6 }}>
          <button onClick={togglePluginsCollapsed} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: '6px 12px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...ZTY.capsSm, color: Z.text3, textAlign: 'left',
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: pluginsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .18s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span style={{ flex: 1 }}>PLUGINS</span>
            {activePlugins.length > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{activePlugins.length}</span>}
          </button>
          {!pluginsCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activePlugins.map(({ entry, listing }) => {
                const isHugin = (listing.kassa_product_id || listing.kassaProductId) === 'gleipnir';
                const navId = isHugin ? 'zephyro' : `plugin:${listing.id}`;
                const isActive = view.id === navId;
                const expiringSoon = entry.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;
                return (
                  <button key={listing.id} onClick={() => setView({ id: navId })} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 12px',
                    background: isActive ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})` : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? `2px solid ${Z.gold}` : '2px solid transparent',
                    color: isActive ? Z.parch : Z.text2,
                    fontFamily: Z.fontSerif, fontSize: 13, fontStyle: isActive ? 'italic' : 'normal',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    {window.ZIFlame && React.createElement(window.ZIFlame,
                      { size: 14, color: isActive ? Z.gold : Z.text3, sw: 1 })}
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listing.title}
                    </span>
                    {expiringSoon && window.ZTag && React.createElement(window.ZTag,
                      { color: Z.copper }, '◐')}
                  </button>
                );
              })}
              {/* Library link */}
              <button onClick={() => setView({ id: 'library' })} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 12px',
                background: view.id === 'library' ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})` : 'transparent',
                border: 'none',
                borderLeft: view.id === 'library' ? `2px solid ${Z.gold}` : '2px solid transparent',
                color: view.id === 'library' ? Z.parch : Z.text3,
                fontFamily: Z.fontSerif, fontSize: 13, fontStyle: view.id === 'library' ? 'italic' : 'normal',
                cursor: 'pointer', textAlign: 'left',
                marginTop: activePlugins.length ? 4 : 0,
                paddingTop: activePlugins.length ? 10 : 9,
                borderTop: activePlugins.length ? `1px solid ${Z.hair}` : 'none',
              }}>
                {ZIScroll && React.createElement(ZIScroll, { size: 14, color: view.id === 'library' ? Z.gold : Z.text3, sw: 1 })}
                <span style={{ flex: 1 }}>My Library</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1 }}/>

      {/* Balance card */}
      <div style={{
        padding: 18, position: 'relative',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 12, opacity: 0.85 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 12, opacity: 0.85 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 12, opacity: 0.85 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 12, opacity: 0.85 })}
        </>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold }}>YOUR AURA</div>
          <button onClick={onQuick?.settings} style={{
            width: 22, height: 22, padding: 0, background: 'transparent',
            border: `1px solid ${Z.hair2}`, color: Z.text3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Settings">
            {window.ZISettings && React.createElement(window.ZISettings, { size: 11, color: Z.gold })}
          </button>
        </div>
        <div style={{ ...ZTY.h2, color: Z.gold, ...goldFill, fontSize: 32, lineHeight: 1 }}>
          {Number(auraNow).toLocaleString('en-US')}
        </div>
        <div style={{ ...ZTY.small, color: Z.text3, marginTop: 4, fontStyle: 'italic' }}>
          aura · level {state.level}
        </div>
        <div style={{ marginTop: 14, height: 2, background: Z.ink4, position: 'relative' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${Z.goldLo}, ${Z.gold}, ${Z.goldHi})` }}/>
          <div style={{
            position: 'absolute', top: -3, left: `calc(${pct}% - 4px)`,
            width: 8, height: 8, transform: 'rotate(45deg)', background: Z.goldHi,
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ ...ZTY.capsSm, fontSize: 9, color: Z.text3 }}>{pct}%</span>
          <span style={{ ...ZTY.capsSm, fontSize: 9, color: Z.text3 }}>→ L{state.level + 1}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Zodiac Topbar ───
function ZodiacTopbar({ state, onQuick, onNotif, setView, onSettings, library, reviews, follows }) {
  const Z = window.Z, ZTY = window.ZTY;
  const [authedUser, setAuthedUser] = React.useState(() => window.ElyAuth?.getCurrentUser?.() || null);
  React.useEffect(() => {
    const unsub = window.ElyAuth?.subscribe?.(() => {
      setAuthedUser(window.ElyAuth?.getCurrentUser?.() || null);
    });
    return () => unsub?.();
  }, []);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (ev) => { if (menuRef.current && !menuRef.current.contains(ev.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const display = authedUser?.globalName || authedUser?.username || window.ME?.name || 'guest';
  // Pick up live sign-override changes
  const [, _signTick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const onChange = () => _signTick();
    window.addEventListener('elyhub:zodiac-sign-changed', onChange);
    return () => window.removeEventListener('elyhub:zodiac-sign-changed', onChange);
  }, []);
  const overrideSign = (typeof window.getMySign === 'function') ? window.getMySign(display) : null;
  const sign = overrideSign || (window.signOf ? window.signOf(display) : 'Aries');
  const glyph = window.ZODIAC_GLYPHS ? window.ZODIAC_GLYPHS[sign] : '✦';

  return (
    <div style={{
      height: 76, padding: '20px 48px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Search — embed the host's real SearchBar so ⌘K + autocomplete
          actually work. The host component already reads T tokens which
          are zodiac-overridden, so it lands ink+gold automatically. */}
      <div style={{ flex: 1, maxWidth: 520 }}>
        {window.SearchBar
          ? React.createElement(window.SearchBar, { setView, onQuick })
          : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair2}`, color: Z.text2,
            }}>
              {window.ZISearch && React.createElement(window.ZISearch, { size: 14, color: Z.text3 })}
              <span style={{ ...ZTY.body, color: Z.text3, fontSize: 14, fontStyle: 'italic', flex: 1 }}>
                Search…
              </span>
            </div>
          )}
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', size: 'sm', onClick: onQuick?.gift,
            icon: window.ZIGift ? React.createElement(window.ZIGift, { size: 13, color: Z.gold }) : null },
          'SEND AURA')}
        <button onClick={onNotif} style={{
          width: 38, height: 38, padding: 0,
          background: `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`,
          border: `1px solid ${Z.hair2}`, color: Z.gold,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Notifications">
          {window.ZIBell && React.createElement(window.ZIBell, { size: 14, color: Z.gold })}
        </button>
        {authedUser ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '5px 14px 5px 5px',
              background: `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})`,
              border: `1px solid ${Z.hair2}`,
              cursor: 'pointer',
            }}>
              {window.ZAvatar && React.createElement(window.ZAvatar, {
                name: display, src: authedUser.avatarUrl, size: 30, ring: true, sign,
              })}
              <div style={{ textAlign: 'left' }}>
                <div style={{ ...ZTY.small, color: Z.parch, fontStyle: 'italic', lineHeight: 1.1 }}>
                  {display.split(' ')[0]}
                </div>
                <div style={{ ...ZTY.capsSm, fontSize: 9, color: Z.gold, lineHeight: 1.2 }}>
                  {sign.toUpperCase()}
                </div>
              </div>
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 220, zIndex: 50,
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${Z.hair2}`,
                padding: 6,
              }}>
                <ZMenuItem label="My Profile" onClick={() => { setMenuOpen(false); setView?.({ id: 'profile' }); }}/>
                <ZMenuItem label="Send Aura"  onClick={() => { setMenuOpen(false); onQuick?.gift?.(); }}/>
                <ZMenuItem label="Settings"   onClick={() => { setMenuOpen(false); onSettings?.(); }}/>
                <div style={{ height: 1, background: Z.hair, margin: '4px 0' }}/>
                <ZMenuItem label="Sign out"   danger onClick={() => { setMenuOpen(false); window.ElyAuth?.signOut(); }}/>
              </div>
            )}
          </div>
        ) : (
          window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', size: 'sm', onClick: () => window.ElyAuth?.signIn() },
            'SIGN IN')
        )}
      </div>
    </div>
  );
}

function ZMenuItem({ label, onClick, danger }) {
  const Z = window.Z, ZTY = window.ZTY;
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
        background: hov ? Z.ink3 : 'transparent',
        border: 'none', cursor: 'pointer',
        ...ZTY.body, color: danger ? Z.bad : Z.text, fontStyle: 'italic',
      }}>{label}</button>
  );
}

// ─── Zodiac Home View ───
function ZodiacHomeView({ state, setState, setView, onQuick }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const ME = window.ME || {};
  const auraNow = ME.aura ?? state.aura;
  const prev = ME.prevLevelAura ?? 0;
  const next = ME.nextLevelAura ?? 1;
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));
  const tagClaimed = !!ME.tagClaimedToday;
  const boosterClaimed = !!ME.boosterClaimedToday;
  const top = [...(window.MEMBERS || [])].sort((a, b) => b.aura - a.aura).slice(0, 6);
  // Subscribe to live polls so the activity strip refreshes whenever
  // data.jsx pushes a new AURA_FEED snapshot — same source the host's
  // AuraFeedList uses. Without this the feed would be a stale snapshot
  // taken on first render.
  const [, _tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    if (typeof window.__subscribeLive !== 'function') return undefined;
    return window.__subscribeLive(() => _tick());
  }, []);
  const feed = (Array.isArray(window.AURA_FEED) ? window.AURA_FEED : []).slice(0, 6);
  const liveReady = window.__liveStatus?.ready;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  return (
    // No CosmicBG here — Shell's AmbientBG already paints the zodiac preset's
    // ink gradient. Mounting another fixed-position bg layer inside the home
    // grid covered the sidebar (same stacking context, later in DOM order).
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Identity banner — full art shown end-to-end. Text overlay lives in
            the lower-left corner over the dark feather region so it doesn't
            collide with the cartouche or ravens. Subtle bottom gradient gives
            the text breathing room without fighting the artwork. */}
        <div style={{
          position: 'relative', background: Z.ink,
          border: `1px solid ${Z.hair2}`,
          overflow: 'hidden',
        }}>
          <img src={`zodiac/ely-zodiac-banner.png?v=${Date.now()}`} alt="Celestial Ely"
            style={{
              display: 'block', width: '100%', height: 'auto',
              objectFit: 'contain',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}/>
          {/* Lower-left vignette for text legibility */}
          <div style={{
            position: 'absolute', left: 0, bottom: 0, width: '40%', height: '50%',
            background: `radial-gradient(ellipse at bottom left, rgba(10,9,8,0.85), transparent 70%)`,
            pointerEvents: 'none',
          }}/>
          <div style={{ position: 'absolute', left: 28, bottom: 22, pointerEvents: 'none' }}>
            <div style={{
              ...ZTY.capsSm, color: Z.gold, marginBottom: 8,
              textShadow: `0 1px 2px rgba(0,0,0,0.8)`,
            }}>ZODIAC · IDENTITY</div>
            <div style={{
              ...ZTY.h1, color: Z.parch, fontSize: 44, lineHeight: 1, fontStyle: 'italic',
              textShadow: `0 2px 8px rgba(0,0,0,0.85)`,
            }}>
              Celestial Ely
            </div>
          </div>
        </div>

        {/* Hero — today + balance + sun mandala */}
        <div style={{
          position: 'relative', overflow: 'hidden', padding: '32px 36px',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          {window.ZCorner && <>
            {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18, opacity: 0.85 })}
            {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18, opacity: 0.85 })}
            {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18, opacity: 0.85 })}
            {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18, opacity: 0.85 })}
          </>}
          {/* Starburst removed — user preference */}
          <div style={{ position: 'relative' }}>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 6 }}>{today} · MOON ☽ WAXING</div>
            <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 16 }}>TODAY'S AURA</div>
            <div style={{ ...ZTY.display, ...goldFill, fontSize: 96, lineHeight: 1, marginBottom: 12 }}>
              {Number(auraNow).toLocaleString('en-US')}
            </div>
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 24 }}>
              aura points{ME.delta ? `  ✦  ${ME.delta > 0 ? '↑' : '↓'} ${Math.abs(ME.delta)} today` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...ZTY.capsSm, color: Z.text3, marginBottom: 6 }}>
              <span>LEVEL {state.level}</span>
              <span style={{ flex: 1 }}/>
              <span>{pct}% TO {state.level + 1}</span>
            </div>
            <div style={{ height: 2, background: Z.ink4, position: 'relative' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${Z.goldLo}, ${Z.gold}, ${Z.goldHi})` }}/>
              <div style={{ position: 'absolute', top: -3, left: `calc(${pct}% - 4px)`, width: 8, height: 8, transform: 'rotate(45deg)', background: Z.goldHi }}/>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              {window.ZTag && React.createElement(window.ZTag, { color: Z.gold, glow: true },
                `${ME.streak || 1}-DAY STREAK`)}
              {window.ZTag && React.createElement(window.ZTag, { color: Z.gold },
                `RANK #${ME.rank || '?'}`)}
              {window.ZTag && React.createElement(window.ZTag, { muted: true },
                (window.signOf ? window.signOf(ME.name || 'You') : 'AQUARIUS').toUpperCase())}
            </div>
          </div>
        </div>

        {/* Daily claims */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>II.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Daily Rewards</span>
            <span style={{ ...ZTY.capsSm, color: Z.text3 }}>
              {(tagClaimed ? 0 : 1) + (boosterClaimed ? 0 : 1)} UNCLAIMED
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ZClaimCard
              label={(typeof t === 'function' && t('home.tagBonus')) || 'ELY tag bonus'}
              hint={(typeof t === 'function' && t('claim.tagLabel')) || 'Wear the ELY tag'}
              amount={300} claimed={tagClaimed}
              onClaim={() => window.ElyOps?.claimDaily?.('tag')}/>
            <ZClaimCard
              label={(typeof t === 'function' && t('home.serverBoost')) || 'Server boost'}
              hint={(typeof t === 'function' && t('claim.boosterLabel')) || 'Boost the server'}
              amount={500} claimed={boosterClaimed}
              onClaim={() => window.ElyOps?.claimDaily?.('booster')}/>
          </div>
        </div>

        {/* Top members */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>III.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>The Order</span>
            <span style={{ flex: 1 }}/>
            <button onClick={() => setView({ id: 'leaderboard' })} style={{
              ...ZTY.capsSm, color: Z.gold, background: 'transparent',
              border: `1px solid ${Z.hair2}`, padding: '6px 12px', cursor: 'pointer',
            }}>VIEW ALL →</button>
          </div>
          <div style={{
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
            padding: 6,
          }}>
            {top.map((u, i) => <ZRankRow key={u.id} rank={i + 1} user={u} isMe={u.id === ME.id || u.id === 'me'}/>)}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Featured drop */}
        <div style={{
          position: 'relative', padding: 18,
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          {window.ZCorner && <>
            {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
            {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
            {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
            {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
          </>}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {window.ZTag && React.createElement(window.ZTag, { color: Z.gold, glow: true }, 'FEATURED')}
            {window.ZTag && React.createElement(window.ZTag, { color: Z.copper }, 'NEW RELIC')}
          </div>
          <div style={{
            position: 'relative', height: 180, marginBottom: 16,
            border: `1px solid ${Z.hair}`,
            background: `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {window.ZStarburst && React.createElement(window.ZStarburst, { size: 140, color: Z.gold, sw: 0.5, points: 14 })}
          </div>
          <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 4 }}>HOODIE · CHARCOAL · DROP III</div>
          <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 22, fontStyle: 'italic' }}>ElyHub Hoodie</div>
          <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 16 }}>
            Charcoal heavyweight, drop III
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ ...ZTY.h3, color: Z.gold, ...goldFill, fontSize: 20 }}>12,000</span>
              <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>AURA</span>
            </div>
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'primary', size: 'sm', onClick: () => setView({ id: 'store' }) }, 'CLAIM')}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{
          position: 'relative', padding: 18,
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>IV.</span>
            <span style={{ ...ZTY.h3, color: Z.parch, fontSize: 22, fontStyle: 'italic' }}>Activity</span>
            <span style={{ flex: 1 }}/>
            {liveReady && window.ZTag && React.createElement(window.ZTag, { color: Z.good, glow: true }, '● LIVE')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {feed.length === 0 ? (
              <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', padding: '20px 4px', textAlign: 'center' }}>
                The skies are quiet — no events yet today.
              </div>
            ) : (
              feed.map((f) => <ZFeedItem key={f.id || `${f.kind}-${f.at}`} f={f} last={f === feed[feed.length - 1]}/>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───
function ZClaimCard({ label, hint, amount, claimed, onClaim }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  return (
    <div style={{
      position: 'relative', padding: 22,
      background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
      border: `1px solid ${claimed ? Z.hair : Z.hair2}`,
      opacity: claimed ? 0.55 : 1,
    }}>
      <div style={{ ...ZTY.capsSm, color: claimed ? Z.text4 : Z.gold, marginBottom: 10 }}>
        {claimed ? 'CLAIMED' : 'AVAILABLE'}
      </div>
      <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 18, fontStyle: 'italic', marginBottom: 4 }}>{label}</div>
      {hint && (
        <div style={{ ...ZTY.body, color: Z.text3, fontSize: 12, fontStyle: 'italic', marginBottom: 14 }}>
          {hint}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: hint ? 0 : 12 }}>
        <div>
          <span style={{ ...ZTY.h2, ...goldFill, fontSize: 28, fontStyle: 'italic' }}>+{amount}</span>
          <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>AURA</span>
        </div>
        {!claimed && window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', size: 'sm', onClick: onClaim }, 'CLAIM')}
      </div>
    </div>
  );
}

function ZRankRow({ rank, user, isMe }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: isMe ? Z.ink3 : 'transparent',
      borderLeft: isMe ? `2px solid ${Z.gold}` : '2px solid transparent',
    }}>
      <span style={{ ...ZTY.capsSm, color: rank <= 3 ? Z.gold : Z.text3, width: 28, fontFamily: Z.fontCaps }}>
        {String(rank).padStart(2, '0')}
      </span>
      {window.ZAvatar && React.createElement(window.ZAvatar,
        { name: user.name, src: user.avatarUrl || user.avatar, size: 30, ring: rank === 1 })}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...ZTY.body, color: Z.parch, fontStyle: isMe ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.name}{isMe && <span style={{ ...ZTY.capsSm, color: Z.gold, marginLeft: 8 }}>· YOU</span>}
        </div>
        <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>
          {(window.signOf ? window.signOf(user.name) : '').toUpperCase()}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ ...ZTY.body, ...goldFill, fontVariantNumeric: 'tabular-nums' }}>
          {Number(user.aura).toLocaleString('en-US')}
        </span>
      </div>
    </div>
  );
}

// Relative-time helper — falls back to a manual format if window.relTime
// isn't exported (it lives in tokens.jsx as a closure helper in some builds).
function zRelTime(at) {
  if (typeof window.relTime === 'function') {
    try { return window.relTime(at); } catch {}
  }
  if (!at) return '';
  const ms = Date.now() - at;
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

// Renders a single AURA_FEED entry. Mirrors the host's AuraFeedEntry kind
// switch so gifts show "from → to", daily claims show the action name,
// redemptions read as a debit, etc. Resolves names + avatar URLs straight
// from the AURA_FEED row (data.jsx already populates fromName/fromAvatar/
// toName/toAvatar from the bot's user table).
function ZFeedItem({ f, last }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const toName   = f.toName   || 'User';
  const fromName = f.fromName || 'User';
  const toFirst   = toName.split(' ')[0];
  const fromFirst = fromName.split(' ')[0];
  let avatarName = toName, avatarSrc = f.toAvatar, line, subtitle;
  let negative = false;

  switch (f.kind) {
    case 'gift':
      avatarName = fromName; avatarSrc = f.fromAvatar;
      line = (
        <>
          <span style={{ color: Z.parch }}>{fromFirst}</span>
          <span style={{ color: Z.text3, margin: '0 6px' }}>→</span>
          <span style={{ color: Z.parch }}>{toFirst}</span>
        </>
      );
      subtitle = f.note;
      break;
    case 'daily_tag':
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> claimed the tag bonus</span></>;
      break;
    case 'daily_booster':
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> claimed the booster bonus</span></>;
      break;
    case 'gym_post':
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> posted to gym club</span></>;
      subtitle = f.note;
      break;
    case 'postjob':
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> posted a job</span></>;
      break;
    case 'available':
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> marked available</span></>;
      break;
    case 'redeem':
      line = (
        <>
          <span style={{ color: Z.parch }}>{toFirst}</span>
          <span style={{ color: Z.text3 }}> redeemed</span>
          {f.note ? <> <span style={{ color: Z.parch }}>{f.note}</span></> : null}
        </>
      );
      negative = true;
      break;
    default:
      line = <><span style={{ color: Z.parch }}>{toFirst}</span><span style={{ color: Z.text3 }}> {f.kind || 'event'}</span></>;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : `1px solid ${Z.hair}`,
    }}>
      {window.ZAvatar && React.createElement(window.ZAvatar,
        { name: avatarName, src: avatarSrc, size: 30 })}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...ZTY.body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.35,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {line}
        </div>
        {subtitle && (
          <div style={{ ...ZTY.small, color: Z.text3, fontSize: 12, fontStyle: 'italic', marginTop: 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{subtitle}"
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...ZTY.body, ...goldFill, fontWeight: 500, fontVariantNumeric: 'tabular-nums', opacity: negative ? 0.55 : 1 }}>
          {negative ? '−' : '+'}{Number(Math.abs(f.amount || 0)).toLocaleString('en-US')}
        </div>
        <div style={{ ...ZTY.capsSm, fontSize: 9, color: Z.text4 }}>{zRelTime(f.at) || f.time || ''}</div>
      </div>
    </div>
  );
}

// ─── Zodiac Leaderboard ───
function ZodiacLeaderboardView({ state, focusId, onQuick }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [category, setCategory] = React.useState('overall');
  const metricKey = category === 'gym' ? 'gymPosts' : 'aura';
  const ordered = React.useMemo(() => {
    const list = [...(window.MEMBERS || [])];
    list.sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
    return category === 'gym' ? list.filter((u) => (u.gymPosts || 0) > 0) : list;
  }, [category, metricKey]);
  const meId = window.ME?.id || 'me';
  const myIdx = ordered.findIndex((u) => u.id === meId);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>RANKING · THE ORDER</div>
          <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Leaderboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink2 }}>
          {[{ v: 'overall', l: 'OVERALL' }, { v: 'gym', l: 'GYM CLUB' }].map((opt) => (
            <button key={opt.v} onClick={() => setCategory(opt.v)} style={{
              ...ZTY.capsSm, padding: '8px 18px', cursor: 'pointer',
              background: category === opt.v ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
              color: category === opt.v ? Z.ink : Z.text2,
              border: 'none',
              fontWeight: 500,
            }}>{opt.l}</button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      {ordered.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 14, marginBottom: 28, alignItems: 'end' }}>
          {[1, 0, 2].map((idx, col) => {
            const u = ordered[idx];
            const isFirst = idx === 0;
            const sign = window.signOf ? window.signOf(u.name) : '';
            const glyph = window.ZODIAC_GLYPHS ? window.ZODIAC_GLYPHS[sign] : '✦';
            return (
              <div key={u.id} style={{
                position: 'relative', padding: isFirst ? '32px 22px' : '24px 18px',
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${isFirst ? Z.gold : Z.hair2}`,
                textAlign: 'center',
                boxShadow: isFirst ? `0 0 32px ${Z.goldGlow}` : 'none',
              }}>
                {window.ZCorner && isFirst && <>
                  {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
                  {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
                  {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
                  {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
                </>}
                <div style={{ ...ZTY.capsLg, color: Z.gold, marginBottom: 14 }}>
                  {idx === 0 ? 'I.' : idx === 1 ? 'II.' : 'III.'}
                </div>
                <div style={{ display: 'inline-block', marginBottom: 10 }}>
                  {window.ZAvatar && React.createElement(window.ZAvatar, { name: u.name, src: u.avatarUrl || u.avatar, size: isFirst ? 64 : 52, ring: isFirst, sign })}
                </div>
                <div style={{ ...ZTY.h3, color: Z.parch, fontStyle: 'italic', marginBottom: 4 }}>{u.name}</div>
                <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>{sign.toUpperCase()} {glyph}</div>
                <div style={{ ...ZTY.h2, ...goldFill, fontSize: isFirst ? 30 : 24 }}>
                  {Number(u[metricKey] || 0).toLocaleString('en-US')}
                </div>
                <div style={{ ...ZTY.capsSm, color: Z.text3, marginTop: 4 }}>{category === 'gym' ? 'POSTS' : 'AURA'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div style={{ background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`, border: `1px solid ${Z.hair2}`, padding: 6 }}>
        {ordered.length === 0 && (
          <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', padding: '40px 20px', textAlign: 'center' }}>
            The order awaits its first member.
          </div>
        )}
        {ordered.map((u, i) => {
          const isMe = u.id === meId;
          return <ZRankRow key={u.id} rank={i + 1} user={u} isMe={isMe}/>;
        })}
      </div>

      {myIdx >= 0 && (
        <div style={{ ...ZTY.capsSm, color: Z.text3, textAlign: 'center', marginTop: 18, fontStyle: 'italic' }}>
          You stand at rank {myIdx + 1} of {ordered.length}.
        </div>
      )}
    </div>
  );
}

// ─── Zodiac Trophies ───
function ZodiacTrophiesView({ focusId }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const trophies = (typeof window.deriveTrophies === 'function') ? window.deriveTrophies(window.ME) : [];
  const earned = trophies.filter((tr) => tr.unlocked).length;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          RELICS · {earned}/{trophies.length} EARNED
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Trophies</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {trophies.map((tr) => (
          <div key={tr.id} data-focus-id={tr.id} style={{
            position: 'relative', padding: 24,
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${tr.unlocked ? Z.hair3 : Z.hair}`,
            opacity: tr.unlocked ? 1 : 0.55,
            overflow: 'hidden',
          }}>
            {tr.unlocked && window.ZCorner && <>
              {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 12 })}
              {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 12 })}
              {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 12 })}
              {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 12 })}
            </>}
            {tr.unlocked && window.ZStarburst && (
              <div style={{ position: 'absolute', right: -30, top: -20, opacity: 0.18, pointerEvents: 'none' }}>
                {React.createElement(window.ZStarburst, { size: 160, color: Z.gold, sw: 0.4, points: 12 })}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 52, height: 52, marginBottom: 16,
                border: `1px solid ${tr.unlocked ? Z.gold : Z.hair2}`,
                background: tr.unlocked ? `radial-gradient(circle, ${Z.ink3}, ${Z.ink})` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {window.ZSun && React.createElement(window.ZSun, {
                  size: 36, color: tr.unlocked ? Z.gold : Z.text4, sw: 0.7,
                })}
              </div>
              <div style={{ ...ZTY.h3, color: Z.parch, fontStyle: 'italic', marginBottom: 6 }}>{tr.name}</div>
              <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 14, marginBottom: 16 }}>
                {tr.desc}
              </div>
              {!tr.unlocked && tr.total > 1 && (
                <>
                  <div style={{ height: 2, background: Z.ink4, position: 'relative', marginBottom: 6 }}>
                    <div style={{
                      width: `${Math.min(100, (tr.progress / tr.total) * 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${Z.goldLo}, ${Z.gold})`,
                    }}/>
                  </div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>
                    {tr.progress} / {tr.total}
                  </div>
                </>
              )}
              {tr.unlocked && window.ZTag && React.createElement(window.ZTag,
                { color: Z.gold, glow: true }, '✦ EARNED')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zodiac Profile ───
function ZodiacProfileView({ state, onQuick, setView, onPublish, onEdit, publishing, wishlist }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const me = window.ME || {};
  // Pick up live sign-override changes
  const [, _signTick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const onChange = () => _signTick();
    window.addEventListener('elyhub:zodiac-sign-changed', onChange);
    return () => window.removeEventListener('elyhub:zodiac-sign-changed', onChange);
  }, []);
  // Bio — synced with localStorage + Settings → Account writes to the same
  // key. We listen for storage + ely:bio-changed so edits land live.
  const [bio, setBio] = React.useState(() => {
    try { return localStorage.getItem('elyhub.bio.v1') || ''; } catch { return ''; }
  });
  React.useEffect(() => {
    const sync = () => { try { setBio(localStorage.getItem('elyhub.bio.v1') || ''); } catch {} };
    window.addEventListener('storage', sync);
    window.addEventListener('ely:bio-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ely:bio-changed', sync);
    };
  }, []);
  const authedUser = (typeof window.ElyAuth?.getCurrentUser === 'function')
    ? window.ElyAuth.getCurrentUser() : null;
  const display = me.name || me.username || authedUser?.globalName || authedUser?.username || 'you';
  const avatarSrc = zAvatarSrc({ ...me, ...(authedUser || {}) });
  const overrideSign = (typeof window.getMySign === 'function') ? window.getMySign(display) : null;
  const sign = overrideSign || (window.signOf ? window.signOf(display) : 'Aries');
  const glyph = window.ZODIAC_GLYPHS ? window.ZODIAC_GLYPHS[sign] : '✦';
  const auraNow = me.aura ?? state.aura;
  const myListings = (window.LISTINGS || []).filter((l) => l.sellerId === me.id);
  const trophies = (typeof window.deriveTrophies === 'function') ? window.deriveTrophies(me) : [];
  const earned = trophies.filter((tr) => tr.unlocked).length;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // Stats from ME — voice, gym, streak. Same source as the host profile.
  const voiceHours = Math.floor((me.voiceSeconds || 0) / 3600);
  const voiceMins  = Math.floor(((me.voiceSeconds || 0) % 3600) / 60);
  const gymPosts = me.gymPosts || 0;
  const gymStreakBest = me.gymStreakBest || 0;
  const gymStreakNow  = me.gymStreakCurrent || 0;
  // Discord roles synced by the bot, fall back to derived tags.
  const liveRoles = Array.isArray(me.discordRoles) ? me.discordRoles : [];
  const tagsToShow = liveRoles.length
    ? liveRoles.map((r) => ({ name: r.name, hue: (r.color && r.color !== '#000000') ? r.color : Z.gold }))
    : ((typeof window.deriveServerTags === 'function' && window.deriveServerTags(me).length)
        ? window.deriveServerTags(me)
        : [{ name: 'Member', hue: Z.gold }]);

  return (
    <div>
      {/* Hero card */}
      <div style={{
        position: 'relative', overflow: 'hidden', padding: '40px 48px',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        marginBottom: 28,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 22 })}
        </>}
        {window.ZStarburst && (
          <div style={{ position: 'absolute', right: -60, top: -40, opacity: 0.4, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 360, color: Z.gold, sw: 0.4, points: 16 })}
          </div>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 30 }}>
          <div style={{ flexShrink: 0 }}>
            {window.ZAvatar && React.createElement(window.ZAvatar, { name: display, src: avatarSrc, size: 110, ring: true, sign })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => setPickerOpen(true)} title="Change your sign" style={{
              ...ZTY.capsSm, color: Z.gold, marginBottom: 8,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span>{sign.toUpperCase()} {glyph}</span>
              <span style={{ ...ZTY.capsSm, fontSize: 9, color: Z.text3 }}>· CHANGE</span>
            </button>
            <div style={{ ...ZTY.h1, color: Z.parch, fontSize: 48, fontStyle: 'italic', marginBottom: 4 }}>
              {display}
            </div>
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 20 }}>
              @{me.username || me.tag || 'unknown'} · level {state.level} · rank #{me.rank || '?'}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: bio || tagsToShow.length ? 18 : 0 }}>
              <ZStatCell label="AURA" value={Number(auraNow).toLocaleString('en-US')}/>
              <ZStatCell label="STREAK" value={`${me.streak || 0} days`}/>
              <ZStatCell label="RELICS" value={`${earned}/${trophies.length}`}/>
              <ZStatCell label="LISTINGS" value={myListings.length}/>
            </div>
            {bio && bio.trim() && (
              <div style={{
                ...ZTY.body, color: Z.text2, fontStyle: 'italic',
                maxWidth: 560, lineHeight: 1.55, marginBottom: 14,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>"{bio}"</div>
            )}
            {tagsToShow.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tagsToShow.slice(0, 8).map((tg) => (
                  <span key={tg.name} style={{
                    ...ZTY.capsSm, fontSize: 9, padding: '4px 10px',
                    background: Z.ink3, border: `1px solid ${Z.hair2}`,
                    color: Z.parch, display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: tg.hue || Z.gold }}/>
                    {tg.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'secondary', size: 'sm', onClick: () => onQuick?.settings?.() },
              'SETTINGS')}
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'primary', size: 'sm', onClick: () => onQuick?.gift?.() },
              'SEND AURA')}
          </div>
        </div>
      </div>

      {/* Activity stats — voice / gym */}
      {(voiceHours > 0 || gymPosts > 0) && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 28, fontStyle: 'italic' }}>Activity</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {voiceHours > 0 && (
              <div style={{
                position: 'relative', padding: 22,
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${Z.hair2}`,
              }}>
                <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>VOICE</div>
                <div style={{ ...ZTY.h2, ...goldFill, fontSize: 32, fontStyle: 'italic' }}>
                  {voiceHours}h {voiceMins > 0 && <span style={{ fontSize: 22, opacity: 0.7 }}>{voiceMins}m</span>}
                </div>
                <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
                  total in chambers
                </div>
              </div>
            )}
            {gymPosts > 0 && (
              <div style={{
                position: 'relative', padding: 22,
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${Z.hair2}`,
              }}>
                <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>GYM CLUB</div>
                <div style={{ ...ZTY.h2, ...goldFill, fontSize: 32, fontStyle: 'italic' }}>{gymPosts}</div>
                <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
                  posts · streak {gymStreakNow}/{gymStreakBest}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trophies preview */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>{(voiceHours > 0 || gymPosts > 0) ? 'II.' : 'I.'}</span>
          <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 28, fontStyle: 'italic' }}>Recent Relics</span>
          <span style={{ flex: 1 }}/>
          <button onClick={() => setView({ id: 'trophies' })} style={{
            ...ZTY.capsSm, color: Z.gold, background: 'transparent',
            border: `1px solid ${Z.hair2}`, padding: '6px 12px', cursor: 'pointer',
          }}>VIEW ALL →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {trophies.filter((t) => t.unlocked).slice(0, 4).map((tr) => (
            <div key={tr.id} style={{
              padding: 16, position: 'relative',
              background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair3}`,
              textAlign: 'center',
            }}>
              <div style={{ marginBottom: 8 }}>
                {window.ZSun && React.createElement(window.ZSun, { size: 32, color: Z.gold, sw: 0.7 })}
              </div>
              <div style={{ ...ZTY.small, color: Z.parch, fontStyle: 'italic' }}>{tr.name}</div>
            </div>
          ))}
          {trophies.filter((t) => t.unlocked).length === 0 && (
            <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', gridColumn: '1 / -1', padding: '20px 0' }}>
              No relics earned yet.
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      {myListings.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>{(voiceHours > 0 || gymPosts > 0) ? 'III.' : 'II.'}</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 28, fontStyle: 'italic' }}>My Listings</span>
            <span style={{ flex: 1 }}/>
            <button onClick={() => onPublish?.()} style={{
              ...ZTY.capsSm, color: Z.gold, background: 'transparent',
              border: `1px solid ${Z.hair2}`, padding: '6px 12px', cursor: 'pointer',
            }}>+ NEW LISTING</button>
          </div>
          <div style={{
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`, padding: 6,
          }}>
            {myListings.map((l) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderBottom: `1px solid ${Z.hair}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>{l.title}</div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>{l.tagline || l.type?.toUpperCase()}</div>
                </div>
                <div style={{ ...ZTY.body, ...goldFill }}>{Number(l.price || 0).toLocaleString('en-US')}</div>
                <button onClick={() => onEdit?.(l)} style={{
                  ...ZTY.capsSm, color: Z.gold, background: 'transparent',
                  border: `1px solid ${Z.hair2}`, padding: '4px 10px', cursor: 'pointer',
                }}>EDIT</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pickerOpen && <ZodiacSignPicker current={sign} onClose={() => setPickerOpen(false)}/>}
    </div>
  );
}

// ─── Sign picker modal ───
// Grid of all 12 zodiac signs. Click one to persist via setMySign — fires
// 'elyhub:zodiac-sign-changed' so every subscriber re-renders.
function ZodiacSignPicker({ current, onClose }) {
  const Z = window.Z, ZTY = window.ZTY;
  const signs = window.ZODIACS || [];
  const glyphs = window.ZODIAC_GLYPHS || {};
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const pick = (s) => {
    if (typeof window.setMySign === 'function') window.setMySign(s);
    onClose?.();
  };
  const reset = () => {
    if (typeof window.setMySign === 'function') window.setMySign(null);
    onClose?.();
  };
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .2s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 32,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 16 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 16 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 16 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 16 })}
        </>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 4 }}>YOUR SIGN</div>
            <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 26 }}>Choose your constellation</h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, padding: 0, background: 'transparent',
            border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
          }}>
            {window.ZIX && React.createElement(window.ZIX, { size: 14, color: Z.text2 })}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {signs.map((s) => {
            const active = s === current;
            return (
              <button key={s} onClick={() => pick(s)} style={{
                position: 'relative', padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                background: active ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : Z.ink3,
                border: `1px solid ${active ? Z.gold : Z.hair2}`,
                color: active ? Z.ink : Z.parch,
                transition: 'all .15s',
              }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = Z.hair3; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = Z.hair2; }}>
                <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 4, fontFamily: Z.fontDisp }}>
                  {glyphs[s] || '✦'}
                </div>
                <div style={{ ...ZTY.capsSm, fontSize: 9 }}>{s.toUpperCase()}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <button onClick={reset} style={{
            ...ZTY.capsSm, color: Z.text3, background: 'transparent',
            border: 'none', padding: 0, cursor: 'pointer', fontStyle: 'italic',
          }}>Reset to default</button>
          <span style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', fontSize: 12 }}>
            Click a sign to apply.
          </span>
        </div>
      </div>
    </div>
  );
}

function ZStatCell({ label, value }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  return (
    <div>
      <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 4 }}>{label}</div>
      <div style={{ ...ZTY.h3, ...goldFill, fontSize: 22, fontStyle: 'italic' }}>{value}</div>
    </div>
  );
}

// ─── Zodiac Marketplace home ───
function ZodiacMarketHomeView({ state, setView, onQuick, focusId, wishlist, recent, blocks, onPublish }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [type, setType] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('trending');

  const all = (window.LISTINGS || [])
    .filter((l) => !(blocks && blocks.has(l.sellerId)))
    .filter((l) => !(l.kassa_product_id || l.kassaProductId));

  const q = query.trim().toLowerCase();
  const matchesQ = (l) => {
    if (!q) return true;
    if (l.title?.toLowerCase().includes(q)) return true;
    if (l.tagline?.toLowerCase().includes(q)) return true;
    if (l.tags?.some((tg) => tg.toLowerCase().includes(q))) return true;
    return false;
  };

  const filtered = all
    .filter((l) => type === 'all' || l.type === type)
    .filter(matchesQ);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'new')       return (b.createdAt || 0) - (a.createdAt || 0);
    if (sort === 'priceAsc')  return (a.price || 0) - (b.price || 0);
    if (sort === 'priceDesc') return (b.price || 0) - (a.price || 0);
    if (sort === 'rating')    return (b.rating || 0) - (a.rating || 0);
    return (b.downloads || 0) - (a.downloads || 0);
  });

  const featured = all.filter((l) => l.featured).slice(0, 3);

  const types = [
    { v: 'all',    l: 'ALL' },
    { v: 'plugin', l: 'PLUGINS' },
    { v: 'theme',  l: 'THEMES' },
    { v: 'pack',   l: 'PACKS' },
    { v: 'asset',  l: 'ASSETS' },
  ];
  const sorts = [
    { v: 'trending',  l: 'TRENDING' },
    { v: 'new',       l: 'NEW' },
    { v: 'priceAsc',  l: 'PRICE ↑' },
    { v: 'priceDesc', l: 'PRICE ↓' },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>BAZAAR · OPEN</div>
          <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Marketplace</h1>
          <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginTop: 6 }}>
            {sorted.length} relics on offer.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'secondary', size: 'sm', onClick: () => onPublish?.() }, '+ NEW LISTING')}
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        marginBottom: 18,
      }}>
        {window.ZISearch && React.createElement(window.ZISearch, { size: 14, color: Z.gold })}
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search relics, makers, tags…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            ...ZTY.body, color: Z.parch, fontStyle: 'italic',
          }}
        />
        {!!query && (
          <button onClick={() => setQuery('')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: Z.text3,
          }}>✕</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink2 }}>
          {types.map((opt) => (
            <button key={opt.v} onClick={() => setType(opt.v)} style={{
              ...ZTY.capsSm, padding: '6px 14px', cursor: 'pointer',
              background: type === opt.v ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
              color: type === opt.v ? Z.ink : Z.text2,
              border: 'none', fontWeight: 500,
            }}>{opt.l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 4, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink2 }}>
          {sorts.map((opt) => (
            <button key={opt.v} onClick={() => setSort(opt.v)} style={{
              ...ZTY.capsSm, padding: '6px 12px', cursor: 'pointer',
              background: sort === opt.v ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
              color: sort === opt.v ? Z.ink : Z.text2,
              border: 'none', fontWeight: 500,
            }}>{opt.l}</button>
          ))}
        </div>
      </div>

      {/* Featured strip */}
      {featured.length > 0 && type === 'all' && !q && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Featured</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {featured.map((l) => <ZListingCard key={l.id} l={l} setView={setView} featured/>)}
          </div>
        </div>
      )}

      {/* All / filtered grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>{featured.length > 0 && type === 'all' && !q ? 'II.' : 'I.'}</span>
          <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>
            {q ? `Results for "${query}"` : type === 'all' ? 'All Relics' : types.find((tt) => tt.v === type)?.l}
          </span>
        </div>
        {sorted.length === 0 ? (
          <div style={{
            ...ZTY.body, color: Z.text3, fontStyle: 'italic', padding: 60,
            textAlign: 'center',
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair}`,
          }}>
            No relics match. The bazaar awaits new arrivals.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {sorted.map((l) => <ZListingCard key={l.id} l={l} setView={setView}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ZListingCard({ l, setView, featured }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [hov, setHov] = React.useState(false);
  const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
  return (
    <div
      onClick={() => setView({ id: 'listing', focusId: l.id })}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', cursor: 'pointer', overflow: 'hidden',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${hov ? Z.hair3 : (featured ? Z.gold : Z.hair2)}`,
        boxShadow: hov ? `0 0 24px ${Z.goldGlow}` : 'none',
        transition: 'all .25s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
      }}>
      {window.ZCorner && featured && <>
        {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 12 })}
      </>}
      {/* Image / sigil panel */}
      <div style={{
        position: 'relative', height: 160,
        background: l.thumbnailUrl ? 'transparent' : `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
        borderBottom: `1px solid ${Z.hair}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {l.thumbnailUrl ? (
          <img src={l.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          window.ZStarburst && React.createElement(window.ZStarburst, { size: 100, color: Z.gold, sw: 0.5, points: 12 })
        )}
        {featured && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            {window.ZTag && React.createElement(window.ZTag, { color: Z.gold, glow: true }, 'FEATURED')}
          </div>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 6 }}>
          {(l.type || 'item').toUpperCase()}{seller ? ` · ${seller.name.toUpperCase()}` : ''}
        </div>
        <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 18, fontStyle: 'italic', marginBottom: 6,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.title}
        </div>
        {l.tagline && (
          <div style={{ ...ZTY.body, color: Z.text2, fontSize: 13, fontStyle: 'italic', marginBottom: 14,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {l.tagline}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ ...ZTY.h3, ...goldFill, fontSize: 20 }}>
              {Number(l.price || 0).toLocaleString('en-US')}
            </span>
            <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>
              AURA{l.billing === 'monthly' ? ' /mo' : ''}
            </span>
          </div>
          {l.rating && (
            <div style={{ ...ZTY.capsSm, color: Z.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
              ✦ {Number(l.rating).toFixed(1)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Base modal shell ───
function ZModalShell({ children, onClose, width = 480, dismissable = true }) {
  const Z = window.Z;
  React.useEffect(() => {
    if (!dismissable) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissable, onClose]);
  return (
    <div role="dialog" aria-modal="true" onClick={dismissable ? onClose : undefined} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .25s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: width, maxHeight: '90vh',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 32, overflow: 'auto',
        animation: 'slideUp .25s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}
        {children}
      </div>
    </div>
  );
}

function ZModalHeader({ title, onClose }) {
  const Z = window.Z, ZTY = window.ZTY;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 28 }}>{title}</h2>
      {onClose && (
        <button onClick={onClose} style={{
          width: 32, height: 32, padding: 0, background: 'transparent',
          border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {window.ZIX && React.createElement(window.ZIX, { size: 14, color: Z.text2 })}
        </button>
      )}
    </div>
  );
}

// ─── Zodiac Gift Modal ───
function ZodiacGiftModal({ state, onClose, onSend, initialFriend }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [friend, setFriend] = React.useState(initialFriend || null);
  const [amount, setAmount] = React.useState(500);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const presets = [100, 500, 1000, 2500, 5000];
  const myId = window.ME?.id;

  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normalize(search);
  const candidates = (window.MEMBERS || [])
    .filter((m) => m.id !== myId)
    .filter((m) => !q || normalize(m.name).includes(q) || normalize(m.tag).includes(q));

  async function handleSend() {
    setErr(null); setSending(true);
    try {
      if (window.ElyOps?.sendGift) {
        await window.ElyOps.sendGift(friend.id, amount, note || null);
      }
      onSend?.(friend, amount);
      setSent(true);
    } catch (e) { setErr(e.message || 'send failed'); }
    finally { setSending(false); }
  }

  if (sent) {
    return (
      <ZModalShell onClose={onClose} width={400}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {window.ZSun && React.createElement(window.ZSun,
            { size: 80, color: Z.gold, sw: 1, fill: true, style: { animation: 'zodiacGlow 2s infinite' } })}
          <h2 style={{ ...ZTY.h2, margin: '20px 0 6px', color: Z.parch, fontStyle: 'italic' }}>Gift Sent</h2>
          <p style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>
            <span style={goldFill}>{Number(amount).toLocaleString('en-US')}</span> aura → {friend.name}
          </p>
          <div style={{ marginTop: 24 }}>
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'primary', full: true, onClick: onClose }, 'DONE')}
          </div>
        </div>
      </ZModalShell>
    );
  }

  return (
    <ZModalShell onClose={!sending ? onClose : null} width={500}>
      <ZModalHeader title="Send Aura" onClose={!sending ? onClose : null}/>

      {!friend ? (
        <>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>RECIPIENT</div>
          {(window.MEMBERS || []).length >= 6 && (
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or tag…"
              style={{
                width: '100%', padding: '12px 14px', marginBottom: 14,
                background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
                ...ZTY.body, color: Z.parch, fontStyle: 'italic',
              }}/>
          )}
          <div style={{ maxHeight: 360, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {candidates.map((m) => {
              const sign = window.signOf ? window.signOf(m.name) : '';
              return (
                <button key={m.id} onClick={() => setFriend(m)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'transparent',
                  border: `1px solid ${Z.hair}`, cursor: 'pointer',
                  textAlign: 'left', transition: 'all .15s',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = Z.hair3}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = Z.hair}>
                  {window.ZAvatar && React.createElement(window.ZAvatar, { name: m.name, src: m.avatarUrl || m.avatar, size: 32, sign })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>{m.name}</div>
                    <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>@{m.tag} · {sign.toUpperCase()}</div>
                  </div>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                No one matches "{search}".
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Selected friend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 22,
            background: Z.ink3, border: `1px solid ${Z.hair2}`,
          }}>
            {window.ZAvatar && React.createElement(window.ZAvatar,
              { name: friend.name, src: friend.avatarUrl || friend.avatar, size: 40, ring: true, sign: window.signOf?.(friend.name) })}
            <div style={{ flex: 1 }}>
              <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>{friend.name}</div>
              <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>@{friend.tag}</div>
            </div>
            <button onClick={() => setFriend(null)} disabled={sending} style={{
              ...ZTY.capsSm, color: Z.gold, background: 'transparent',
              border: `1px solid ${Z.hair2}`, padding: '6px 10px', cursor: 'pointer',
            }}>CHANGE</button>
          </div>

          {/* Amount */}
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>AMOUNT</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
            <span style={{ ...ZTY.h1, ...goldFill, fontSize: 56, lineHeight: 1 }}>
              {Number(amount).toLocaleString('en-US')}
            </span>
            <span style={{ ...ZTY.capsSm, color: Z.text3 }}>AURA</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {presets.map((p) => (
              <button key={p} onClick={() => setAmount(p)} disabled={sending} style={{
                ...ZTY.capsSm, padding: '8px 14px', cursor: sending ? 'default' : 'pointer',
                background: amount === p ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : Z.ink3,
                color: amount === p ? Z.ink : Z.text2,
                border: `1px solid ${amount === p ? Z.gold : Z.hair2}`,
                fontWeight: 500,
              }}>{p.toLocaleString('en-US')}</button>
            ))}
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
            disabled={sending} style={{
              width: '100%', padding: '10px 14px', marginBottom: 18,
              background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
              ...ZTY.body, color: Z.parch, fontVariantNumeric: 'tabular-nums',
            }}/>

          {/* Note */}
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>NOTE (OPTIONAL)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={sending}
            placeholder="A line of thanks…" maxLength={120}
            style={{
              width: '100%', padding: '12px 14px', marginBottom: 22,
              background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
              ...ZTY.body, color: Z.parch, fontStyle: 'italic',
            }}/>

          {err && (
            <div style={{
              ...ZTY.body, color: Z.bad, fontStyle: 'italic', marginBottom: 14,
              padding: 12, border: `1px solid ${Z.bad}55`, background: 'rgba(161,71,53,0.12)',
            }}>⚠ {err}</div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'secondary', onClick: onClose, disabled: sending }, 'CANCEL')}
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'primary', full: true, onClick: handleSend,
                disabled: sending || amount > state.aura || amount < 1 },
              sending ? 'SENDING…' : amount > state.aura ? 'INSUFFICIENT AURA' : `SEND ${Number(amount).toLocaleString('en-US')}`)}
          </div>
        </>
      )}
    </ZModalShell>
  );
}

// ─── Zodiac Redeem Modal ───
function ZodiacRedeemModal({ reward, state, onClose, onConfirm }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [stage, setStage] = React.useState('confirm');
  const [err, setErr] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  async function handleConfirm() {
    setErr(null); setSending(true);
    try {
      if (window.ElyOps?.redeem) await window.ElyOps.redeem(reward.id);
      onConfirm?.();
      setStage('done');
    } catch (e) { setErr(e.message || 'redeem failed'); }
    finally { setSending(false); }
  }

  if (stage === 'done') {
    return (
      <ZModalShell onClose={onClose} width={400}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {window.ZSun && React.createElement(window.ZSun,
            { size: 80, color: Z.gold, sw: 1, fill: true })}
          <h2 style={{ ...ZTY.h2, margin: '20px 0 6px', color: Z.parch, fontStyle: 'italic' }}>Claimed</h2>
          <p style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>
            {reward.title} is yours.
          </p>
          <div style={{ marginTop: 24 }}>
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'primary', full: true, onClick: onClose }, 'DONE')}
          </div>
        </div>
      </ZModalShell>
    );
  }

  const cost = reward?.price || 0;
  const canAfford = state.aura >= cost;

  return (
    <ZModalShell onClose={!sending ? onClose : null} width={460}>
      <ZModalHeader title="Claim Relic" onClose={!sending ? onClose : null}/>

      <div style={{
        position: 'relative', overflow: 'hidden', padding: 22, marginBottom: 22,
        background: `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        textAlign: 'center',
      }}>
        {window.ZStarburst && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.45, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 160, color: Z.gold, sw: 0.4, points: 14 })}
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>{(reward.category || 'RELIC').toUpperCase()}</div>
          <div style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic', marginBottom: 6 }}>
            {reward.title}
          </div>
          {reward.sub && (
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>{reward.sub}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
        <span style={{ ...ZTY.capsSm, color: Z.text3 }}>COST</span>
        <span>
          <span style={{ ...ZTY.h2, ...goldFill, fontSize: 28 }}>{Number(cost).toLocaleString('en-US')}</span>
          <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>AURA</span>
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
        <span style={{ ...ZTY.capsSm, color: Z.text3 }}>YOUR AURA</span>
        <span>
          <span style={{ ...ZTY.body, color: canAfford ? Z.parch : Z.bad, fontVariantNumeric: 'tabular-nums', fontStyle: 'italic' }}>
            {Number(state.aura).toLocaleString('en-US')}
          </span>
          <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>AURA</span>
        </span>
      </div>

      {err && (
        <div style={{
          ...ZTY.body, color: Z.bad, fontStyle: 'italic', marginBottom: 14,
          padding: 12, border: `1px solid ${Z.bad}55`, background: 'rgba(161,71,53,0.12)',
        }}>⚠ {err}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', onClick: onClose, disabled: sending }, 'CANCEL')}
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'primary', full: true, onClick: handleConfirm,
            disabled: sending || !canAfford },
          sending ? 'CLAIMING…' : !canAfford ? 'INSUFFICIENT AURA' : 'CLAIM')}
      </div>
    </ZModalShell>
  );
}

// ─── Zodiac Level Up Takeover ───
function ZodiacLevelUpTakeover({ level, onClose }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .3s', overflow: 'hidden',
    }}>
      {/* Radial bloom */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '160vw', height: '160vw',
        transform: `translate(-50%, -50%) scale(${stage >= 1 ? 1 : 0})`,
        background: `radial-gradient(circle, ${Z.goldGlow} 0%, ${Z.gold}33 25%, transparent 60%)`,
        filter: 'blur(60px)',
        transition: 'transform 2s cubic-bezier(.2,.9,.3,1)',
        pointerEvents: 'none',
      }}/>

      {/* Sun rays (long + short alternating) */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${stage >= 1 ? 1 : 0}) rotate(${stage >= 2 ? 30 : 0}deg)`,
        transition: 'transform 2.4s cubic-bezier(.2,.9,.3,1)',
        opacity: stage >= 3 ? 0.55 : 1,
        pointerEvents: 'none',
      }}>
        {window.ZStarburst && React.createElement(window.ZStarburst,
          { size: 720, color: Z.gold, sw: 0.5, points: 20 })}
      </div>

      {/* Star sparkles */}
      {stage >= 1 && [...Array(20)].map((_, i) => {
        const a = (i / 20) * Math.PI * 2;
        const dist = 240 + (i % 4) * 60;
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 4, height: 4, transform: stage >= 1
              ? `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) rotate(45deg)`
              : 'translate(-50%, -50%) rotate(45deg)',
            background: Z.goldHi, boxShadow: `0 0 12px ${Z.gold}`,
            opacity: stage >= 3 ? 0 : 1,
            transition: 'opacity 1s, transform 1.6s cubic-bezier(.2,.9,.3,1)',
            pointerEvents: 'none',
          }}/>
        );
      })}

      {/* Center stack */}
      <div style={{
        position: 'relative', textAlign: 'center', zIndex: 5,
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'scale(1)' : 'scale(0.85)',
        transition: 'all .8s cubic-bezier(.2,.9,.3,1)',
      }}>
        <div style={{ ...ZTY.capsLg, color: Z.gold, marginBottom: 10, fontSize: 14, letterSpacing: '0.4em' }}>
          ✦ ASCENSION ✦
        </div>
        <div style={{ ...ZTY.display, ...goldFill, fontSize: 220, lineHeight: 0.9, fontStyle: 'italic' }}>
          {level}
        </div>
        <div style={{ ...ZTY.capsLg, color: Z.parch, marginTop: 4, fontSize: 14, letterSpacing: '0.4em' }}>
          LEVEL REACHED
        </div>
        <div style={{ marginTop: 36 }}>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', size: 'lg', onClick: onClose }, 'CONTINUE')}
        </div>
      </div>
    </div>
  );
}

// ─── Zodiac Listing Detail ───
function ZodiacListingDetailView({ state, setView, onQuick, focusId, library, purchaseListing, reviews, wishlist, follows, recent, messages, coupons, reports, blocks }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const l = (window.LISTINGS || []).find((x) => x.id === focusId);

  // Record this view in recent history (matches host behavior).
  React.useEffect(() => {
    if (l && recent && l.sellerId !== (window.ME?.id || 'me')) recent.push(l.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l?.id]);

  if (!l) {
    return (
      <div style={{
        padding: 60, textAlign: 'center',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 16 }}>
          Relic not found in the bazaar.
        </div>
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', size: 'sm', onClick: () => setView({ id: 'store' }) },
          '← BACK TO MARKETPLACE')}
      </div>
    );
  }

  const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
  const levelLocked = state.level < (l.level || 1);
  const auraShort = state.aura < (l.price || 0);
  const ownedEntry = library?.items.find((it) => it.listingId === l.id);
  const activeOwned = ownedEntry && ownedEntry.status === 'active' && (!ownedEntry.expiresAt || ownedEntry.expiresAt > Date.now());
  const isSub = l.billing === 'monthly';
  const locked = !activeOwned && (levelLocked || auraShort);
  const isOwn = l.sellerId === (window.ME?.id || 'me');
  const inWishlist = wishlist?.has?.(l.id);
  const isFollowing = seller && follows?.has?.(seller.id);

  const listingReviews = reviews?.forListing?.(l.id) || [];
  const avgRating = listingReviews.length
    ? listingReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / listingReviews.length
    : (l.rating || 0);

  const [pending, setPending] = React.useState(false);
  const handleBuy = async () => {
    setPending(true);
    try { await purchaseListing?.(l); } catch {} finally { setPending(false); }
  };

  return (
    <div>
      {/* Back nav */}
      <button onClick={() => setView({ id: 'store' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK TO MARKETPLACE</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 28 }}>
        {/* Left — visual + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Hero panel */}
          <div style={{
            position: 'relative', overflow: 'hidden', height: 320,
            background: l.thumbnailUrl ? 'transparent' : `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {l.thumbnailUrl ? (
              <img src={l.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            ) : (
              window.ZStarburst && React.createElement(window.ZStarburst,
                { size: 240, color: Z.gold, sw: 0.5, points: 16 })
            )}
            {window.ZCorner && <>
              {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
              {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
              {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
              {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
            </>}
            {l.featured && (
              <div style={{ position: 'absolute', top: 16, left: 16 }}>
                {window.ZTag && React.createElement(window.ZTag, { color: Z.gold, glow: true }, 'FEATURED')}
              </div>
            )}
          </div>

          {/* Title block */}
          <div>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>
              {(l.type || 'RELIC').toUpperCase()}
              {seller && <> · BY <button onClick={() => setView({ id: 'profile', userId: seller.id })}
                style={{ ...ZTY.capsSm, color: Z.gold, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                {seller.name.toUpperCase()}
              </button></>}
            </div>
            <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 48, fontStyle: 'italic' }}>
              {l.title}
            </h1>
            {l.tagline && (
              <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginTop: 10, fontSize: 18 }}>
                {l.tagline}
              </div>
            )}
          </div>

          {/* Description */}
          {l.description && (
            <div style={{
              padding: 22, background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair2}`,
            }}>
              <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 12 }}>DESCRIPTION</div>
              <div style={{ ...ZTY.body, color: Z.text, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                {l.description}
              </div>
            </div>
          )}

          {/* Tags */}
          {l.tags && l.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {l.tags.map((tg) => (
                window.ZTag && React.createElement(window.ZTag,
                  { key: tg, color: Z.gold }, tg.toUpperCase())
              ))}
            </div>
          )}

          {/* Reviews */}
          {listingReviews.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
                <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>
                  Reviews
                </span>
                <span style={{ ...ZTY.capsSm, color: Z.text3 }}>
                  ✦ {avgRating.toFixed(1)} · {listingReviews.length}
                </span>
              </div>
              <div style={{
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${Z.hair2}`, padding: 6,
              }}>
                {listingReviews.slice(0, 8).map((r, i) => {
                  const author = (window.MEMBERS || []).find((m) => m.id === r.userId);
                  return (
                    <div key={i} style={{
                      padding: '14px 16px',
                      borderBottom: i === Math.min(listingReviews.length, 8) - 1 ? 'none' : `1px solid ${Z.hair}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {window.ZAvatar && React.createElement(window.ZAvatar, {
                          name: author?.name || 'Anon',
                          src: author?.avatarUrl || author?.avatar,
                          size: 26,
                          sign: window.signOf?.(author?.name),
                        })}
                        <span style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>
                          {author?.name || 'Anon'}
                        </span>
                        <span style={{ ...ZTY.capsSm, color: Z.gold }}>
                          {'✦'.repeat(Math.round(r.rating || 0))}
                        </span>
                      </div>
                      {r.text && (
                        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 14 }}>
                          {r.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right — purchase panel */}
        <div>
          <div style={{
            position: 'sticky', top: 96, padding: 24,
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair3}`,
          }}>
            {window.ZCorner && <>
              {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
              {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
              {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
              {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
            </>}

            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>
              {isSub ? 'SUBSCRIPTION' : 'ONE-TIME'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ ...ZTY.h1, ...goldFill, fontSize: 44 }}>
                {Number(l.price || 0).toLocaleString('en-US')}
              </span>
              <span style={{ ...ZTY.capsSm, color: Z.text3 }}>AURA{isSub ? ' /MO' : ''}</span>
            </div>
            {avgRating > 0 && (
              <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 18 }}>
                ✦ {avgRating.toFixed(1)} · {listingReviews.length || l.downloads || 0} {listingReviews.length ? 'REVIEWS' : 'DOWNLOADS'}
              </div>
            )}

            {/* CTA */}
            <div style={{ marginTop: 20 }}>
              {isOwn ? (
                window.ZBtn && React.createElement(window.ZBtn,
                  { variant: 'secondary', full: true, disabled: true }, 'YOUR LISTING')
              ) : activeOwned ? (
                window.ZBtn && React.createElement(window.ZBtn,
                  { variant: 'secondary', full: true, onClick: () => setView({ id: 'library' }) },
                  isSub ? 'MANAGE SUBSCRIPTION' : 'OWNED · GO TO LIBRARY')
              ) : (
                window.ZBtn && React.createElement(window.ZBtn,
                  { variant: 'primary', full: true, onClick: handleBuy,
                    disabled: locked || pending },
                  pending ? 'PROCESSING…' :
                    levelLocked ? `LEVEL ${l.level} REQUIRED` :
                    auraShort ? 'INSUFFICIENT AURA' :
                    isSub ? 'SUBSCRIBE' : 'CLAIM RELIC')
              )}
            </div>

            {/* Secondary actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {!isOwn && wishlist && (
                <button onClick={() => wishlist.toggle(l.id)} style={{
                  flex: 1, ...ZTY.capsSm, padding: '10px',
                  background: inWishlist ? Z.ink3 : 'transparent',
                  border: `1px solid ${inWishlist ? Z.gold : Z.hair2}`,
                  color: inWishlist ? Z.gold : Z.text2, cursor: 'pointer',
                }}>{inWishlist ? '★ SAVED' : '☆ SAVE'}</button>
              )}
              {!isOwn && seller && follows && (
                <button onClick={() => follows.toggle(seller.id)} style={{
                  flex: 1, ...ZTY.capsSm, padding: '10px',
                  background: isFollowing ? Z.ink3 : 'transparent',
                  border: `1px solid ${isFollowing ? Z.gold : Z.hair2}`,
                  color: isFollowing ? Z.gold : Z.text2, cursor: 'pointer',
                }}>{isFollowing ? 'FOLLOWING' : '+ FOLLOW'}</button>
              )}
            </div>

            {/* Seller mini-card */}
            {seller && (
              <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${Z.hair}` }}>
                <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 10 }}>MAKER</div>
                <button onClick={() => setView({ id: 'profile', userId: seller.id })} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 0, textAlign: 'left',
                }}>
                  {window.ZAvatar && React.createElement(window.ZAvatar,
                    { name: seller.name, src: seller.avatarUrl || seller.avatar, size: 36, sign: window.signOf?.(seller.name) })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>
                      {seller.name}
                    </div>
                    <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>
                      @{seller.tag} · L{seller.level || 1}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Zodiac Notification Drawer ───
function ZodiacNotifDrawer({ onClose, library, reviews, follows, setView }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const meId = window.ME?.id || null;
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];
  const [lastSeen] = React.useState(typeof window.getLastSeen === 'function' ? window.getLastSeen : () => 0);
  const [dismissed, setDismissed] = React.useState(
    typeof window.getDismissed === 'function' ? window.getDismissed : () => new Set()
  );
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = window.ElyNotify?.subscribeEvents?.(() => setTick((t) => t + 1));
    return () => { try { unsub?.(); } catch {} };
  }, []);

  const allItems = (typeof window.buildNotifications === 'function')
    ? window.buildNotifications(feed, meId, lastSeen, { library, reviews, follows })
    : [];
  const items = allItems.filter((n) => !dismissed.has(n.id));

  React.useEffect(() => {
    if (typeof window.markAllNotifsSeen === 'function') window.markAllNotifsSeen();
  }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(id);
      try { window.saveDismissed?.(next); } catch {}
      return next;
    });
  };
  const clearAll = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of allItems) next.add(n.id);
      try { window.saveDismissed?.(next); } catch {}
      return next;
    });
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,4,3,0.6)',
      animation: 'fadeIn .2s',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 20, right: 20, bottom: 20, width: 400,
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 24, overflowY: 'auto',
        animation: 'slideInR .3s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
        </>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 4 }}>OMENS · {items.length}</div>
            <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 26 }}>Inbox</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {items.length > 0 && (
              <button onClick={clearAll} style={{
                ...ZTY.capsSm, color: Z.text2, background: 'transparent',
                border: `1px solid ${Z.hair2}`, padding: '6px 10px', cursor: 'pointer',
              }}>CLEAR ALL</button>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, padding: 0, background: 'transparent',
              border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {window.ZIX && React.createElement(window.ZIX, { size: 14, color: Z.text2 })}
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            ...ZTY.body, color: Z.text3, fontStyle: 'italic',
          }}>
            <div style={{ marginBottom: 14 }}>
              {window.ZMoon && React.createElement(window.ZMoon, { size: 48, color: Z.gold, sw: 0.8 })}
            </div>
            The skies are quiet.<br/>No new omens.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((n) => {
              const author = n.fromUserId
                ? (window.MEMBERS || []).find((m) => m.id === n.fromUserId)
                : null;
              return (
                <div key={n.id} style={{
                  position: 'relative', padding: 14,
                  background: n.unread ? Z.ink3 : 'transparent',
                  border: `1px solid ${n.unread ? Z.hair3 : Z.hair}`,
                  cursor: n.onClick || n.action ? 'pointer' : 'default',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
                  onClick={() => {
                    if (typeof n.action === 'function') n.action(setView);
                    else if (n.viewId) setView({ id: n.viewId, focusId: n.focusId });
                  }}>
                  {author ? (
                    window.ZAvatar && React.createElement(window.ZAvatar, {
                      name: author.name,
                      src: author.avatarUrl || author.avatar,
                      size: 32, sign: window.signOf?.(author.name),
                    })
                  ) : (
                    <div style={{
                      width: 32, height: 32, flexShrink: 0,
                      border: `1px solid ${Z.hair2}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: Z.ink2,
                    }}>
                      {window.ZSun && React.createElement(window.ZSun, { size: 18, color: Z.gold, sw: 0.7 })}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...ZTY.body, color: Z.parch, fontSize: 14, fontStyle: 'italic' }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ ...ZTY.body, color: Z.text3, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ ...ZTY.capsSm, color: Z.text4, fontSize: 9, marginTop: 4 }}>
                      {n.time || ''}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} style={{
                    background: 'transparent', border: 'none', color: Z.text4,
                    cursor: 'pointer', padding: 4, alignSelf: 'flex-start',
                  }} title="Dismiss">
                    {window.ZIX && React.createElement(window.ZIX, { size: 12, color: Z.text4 })}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Theme transition overlay ───
// Subscribes to 'ely:theme-transition' fired by applyResolvedTheme when the
// user crosses the zodiac boundary. Plays a brief fullscreen ceremony — sun
// mandala on entry, ZSun fading on exit. Mounts unconditionally inside Shell
// so it can fire in either direction.
function ZodiacThemeTransition() {
  const [phase, setPhase] = React.useState(null);
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    let timers = [];
    const onChange = (e) => {
      const dir = e.detail?.direction;
      if (dir !== 'in' && dir !== 'out') return;
      if (e.detail?.preview) return;
      // Only one curtain plays per transition — the dispatcher picks a
      // `winner` (destination if premium, else source). When two premium
      // themes cross (zodiac → cartographer etc.), this prevents both
      // curtains from overlaying each other.
      const winner = e.detail?.winner;
      if (winner != null && winner !== 'zodiac') return;
      // Smooth ceremony — opacity fades in (700ms), holds at full opacity
      // for ~700ms while the mandala plays, then fades out (700ms).
      // The token mutation + transient state flip happen at ~800ms, when
      // the curtain is at full opacity (handled in applyResolvedTheme +
      // previewTheme delays).
      setPhase(dir);
      setStage(0);
      timers.forEach(clearTimeout); timers = [];
      timers.push(setTimeout(() => setStage(1), 60));   // start fade-in
      timers.push(setTimeout(() => setStage(2), 1500)); // start fade-out
      timers.push(setTimeout(() => setPhase(null), 2300));
    };
    window.addEventListener('ely:theme-transition', onChange);
    return () => {
      window.removeEventListener('ely:theme-transition', onChange);
      timers.forEach(clearTimeout);
    };
  }, []);
  if (!phase) return null;
  const Z = window.Z || {};
  const isIn = phase === 'in';
  const bg = isIn ? '#0A0908' : '#E8DCC0';
  const accent = isIn ? (Z.gold || '#C9A24E') : '#1A1408';
  return (
    <div role="presentation" aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      opacity: stage === 0 ? 0 : stage === 1 ? 1 : 0,
      transition: 'opacity 700ms ease',
    }}>
      {isIn && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '140vw', height: '140vw', borderRadius: '50%',
          transform: `translate(-50%, -50%) scale(${stage >= 1 ? 1 : 0.4})`,
          background: `radial-gradient(circle, ${Z.goldGlow || 'rgba(201,162,78,0.45)'} 0%, transparent 60%)`,
          filter: 'blur(60px)',
          transition: 'transform 1.8s cubic-bezier(.2,.9,.3,1)',
          opacity: stage === 2 ? 0.4 : 1,
        }}/>
      )}
      {isIn && window.ZStarburst && (
        <div style={{
          position: 'relative', zIndex: 2,
          transform: stage >= 1
            ? `scale(1) rotate(${stage === 2 ? 30 : 0}deg)`
            : 'scale(0.5) rotate(-30deg)',
          transition: 'transform 1.8s cubic-bezier(.2,.9,.3,1)',
          opacity: stage === 2 ? 0.6 : 1,
        }}>
          {React.createElement(window.ZStarburst, { size: 380, color: accent, sw: 0.6, points: 18 })}
        </div>
      )}
      {!isIn && window.ZSun && (
        <div style={{
          position: 'relative', zIndex: 2,
          transform: stage >= 1 ? 'scale(1)' : 'scale(0.7)',
          transition: 'transform 1.4s cubic-bezier(.2,.9,.3,1)',
          opacity: stage === 2 ? 0 : 0.85,
        }}>
          {React.createElement(window.ZSun, { size: 220, color: accent, sw: 0.7 })}
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: '15%', left: 0, right: 0, textAlign: 'center',
        color: accent, opacity: stage === 1 ? 1 : 0,
        transition: 'opacity 600ms ease 200ms',
        fontFamily: '"Cinzel","Cormorant SC","Cormorant Garamond",serif',
        fontWeight: 600, fontSize: 22, letterSpacing: '0.5em',
        textShadow: isIn ? `0 0 20px ${accent}88` : 'none',
      }}>
        {isIn ? '✦  ENTERING THE ORDER  ✦' : '✦  RETURNING  ✦'}
      </div>
    </div>
  );
}

// ─── Hugin theme-preview button ───
// On hover, swaps the active theme to Zodiac so the user sees a live
// preview. On unhover, reverts to whatever theme was active before. Skips
// the overlay ceremony (preview: true on the dispatched event). Listens to
// pointer leave on the document too in case the user mouses off-screen.
// Compact gold chip — hover flips the whole app to Zodiac instantly,
// mouse-leave reverts with a subtle fade. Saved theme is read from
// localStorage on every leave so a quick in/out can't accidentally snapshot
// 'zodiac' as the saved value.
function HuginThemePreviewButton() {
  const Z = window.Z || {};
  const [hover, setHover] = React.useState(false);

  const readSaved = () => {
    try {
      const raw = localStorage.getItem('ely:theme:v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.theme || 'blue';
    } catch { return 'blue'; }
  };

  const enter = () => {
    setHover(true);
    if (typeof window.previewTheme === 'function') window.previewTheme('zodiac');
  };
  const leave = () => {
    setHover(false);
    if (typeof window.previewTheme === 'function') window.previewTheme(readSaved());
  };
  React.useEffect(() => () => {
    if (typeof window.previewTheme === 'function') window.previewTheme(readSaved());
  }, []);

  return (
    <button onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        background: hover
          ? `linear-gradient(180deg, ${Z.goldHi || '#F2D896'}, ${Z.gold || '#C9A24E'})`
          : 'transparent',
        border: `1px solid ${Z.gold || '#C9A24E'}`,
        color: hover ? (Z.ink || '#0A0908') : (Z.gold || '#C9A24E'),
        fontFamily: '"Cinzel","Cormorant SC","Cormorant Garamond",serif',
        fontWeight: 500, fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase', cursor: 'pointer',
        boxShadow: hover ? `0 0 10px ${Z.goldGlow || 'rgba(201,162,78,0.45)'}` : 'none',
        transition: 'background .25s ease, color .25s ease, box-shadow .25s ease',
      }}>
      <span>✦</span><span>Preview theme</span>
    </button>
  );
}

// Expose on window so the host gates can pick them up.
window.HuginThemePreviewButton = HuginThemePreviewButton;
window.ZodiacGiftModal         = ZodiacGiftModal;
window.ZodiacListingDetailView = ZodiacListingDetailView;
window.ZodiacNotifDrawer       = ZodiacNotifDrawer;
window.ZodiacRedeemModal       = ZodiacRedeemModal;
window.ZodiacLevelUpTakeover   = ZodiacLevelUpTakeover;
// (ZodiacThemeTransition is defined further below — these exports happen
// at end-of-file so the function declaration above is visible.)
window.ZodiacThemeTransition   = ZodiacThemeTransition;
window.ZodiacSidebar           = ZodiacSidebar;
window.ZodiacTopbar            = ZodiacTopbar;
window.ZodiacHomeView          = ZodiacHomeView;
window.ZodiacLeaderboardView   = ZodiacLeaderboardView;
window.ZodiacTrophiesView      = ZodiacTrophiesView;
window.ZodiacProfileView       = ZodiacProfileView;
window.ZodiacMarketHomeView    = ZodiacMarketHomeView;
