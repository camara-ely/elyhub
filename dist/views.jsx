// views.jsx — route views + theme customisation.
//
// Extracted from app.jsx. Everything that's reached via sidebar navigation
// but doesn't fit in home.jsx (which covers the canonical three):
//
//   • ZephyroView / PluginPanelView  — plugin surfaces
//   • DiscoverView + scoreDiscover    — "for you" recommendations
//   • CollectionView / SavedView      — wishlist grids
//   • MessagesView                    — 1:1 DM thread pane
//   • FeedView                        — followed-creator feed
//   • MyLibraryView                   — owned / subscribed items
//   • useTweaks / TweaksPanel         — runtime theme editor overlay
//   • WelcomeModal + wasWelcomed/markWelcomed — post-login splash

// ──── ResetSubscriptionButton — dev/owner-only reset for Hugin subscription ────
// Shown ONLY when window.ME.id is in the owner list (checked at render site).
// Uses a two-step confirm (no window.confirm — blocked by WKWebView in Tauri).
// First click → button turns red "Confirm?". Second click → executes reset.
// Clicking anywhere else (blur/mouseleave while in confirm state) cancels.
function ResetSubscriptionButton() {
  const [stage, setStage] = React.useState('idle'); // 'idle' | 'confirm' | 'busy'
  const timerRef = React.useRef(null);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const handleClick = async () => {
    if (stage === 'busy') return;
    if (stage === 'idle') {
      setStage('confirm');
      // Auto-cancel confirm after 3s if user doesn't click again.
      clearTimer();
      timerRef.current = setTimeout(() => setStage('idle'), 3000);
      return;
    }
    // stage === 'confirm' → execute
    clearTimer();
    setStage('busy');
    try {
      await window.ElyAPI?.post('/me/subscriptions/gleipnir/reset', {});
      try { ElyNotify?.toast?.({ text: 'Subscription reset — reloading…', kind: 'success' }); } catch {}
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      try { ElyNotify?.toast?.({ text: `Reset failed: ${err?.message || err}`, kind: 'warn' }); } catch {}
      setStage('idle');
    }
  };

  React.useEffect(() => () => clearTimer(), []);

  const isConfirm = stage === 'confirm';
  const isBusy    = stage === 'busy';
  return (
    <button
      onClick={handleClick}
      disabled={isBusy}
      title="Dev only — reset subscription to unsubscribed state"
      style={{
        padding: '8px 14px', background: isConfirm ? 'rgba(239,107,124,0.15)' : 'transparent',
        border: `1px solid ${isConfirm ? 'rgba(239,107,124,0.8)' : 'rgba(255,200,50,0.45)'}`,
        color: isConfirm ? '#f4849a' : '#f5c451',
        cursor: isBusy ? 'progress' : 'pointer',
        fontFamily: '"Cinzel","Cormorant SC",serif', fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        fontWeight: 600, transition: 'all .2s', opacity: isBusy ? 0.5 : 1,
        flexShrink: 0,
      }}
    >{isBusy ? '…' : isConfirm ? 'Confirm?' : '⚙ Reset sub'}</button>
  );
}

// ──── PluginPanelView — the "inside" of a subscribed plugin ────
// ──── ZephyroView — first-party plugin with exclusive sidebar tab ────
// Dual-state page driven by the user's subscription status on listing
// l-zephyro. Locked state sells the product (hero, features, pricing,
// screenshots). Unlocked state becomes the live plugin shell with a Launch
// button and license info. Shares purchaseListing with the marketplace so the
// Subscribe CTA here behaves identically to clicking Subscribe on the detail
// page — debits aura, flips status, lands on the dashboard.
function ZephyroView({ state, setView, library, purchaseListing }) {
  // No zodiac gate here — this view is ALREADY painted in the zodiac visual
  // language (raven video, gold cartouche, corners, full subscribe/install/
  // launch/manage flow) regardless of active theme. Showing the simplified
  // ZodiacZephyroView when zodiac is on dropped half the info, so we always
  // render the canonical version below.
  // Look up Hugin listings by Kassa product_id. There can be MULTIPLE rows
  // sharing product_id='gleipnir' — one per tier (1key, 2key, etc.). We
  // sort by price so the tier selector shows cheapest first.
  const listings = window.LISTINGS || [];
  const tiers = listings
    .filter((x) => (x.kassa_product_id || x.kassaProductId) === 'gleipnir')
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  const fallback = listings.find((x) => x.id === 'l-zephyro');
  // The "owned" listing is whichever tier the user already bought. A
  // CANCELLED subscription whose expiresAt is still in the future also
  // counts as owned — the user paid for the period, so they keep access
  // until expiry. They just can't cancel again or be charged a renewal.
  // If they own none, default selection is the cheapest tier for Subscribe.
  const ownedEntry = tiers
    .map((l) => ({ l, e: library?.items?.find((it) => it.listingId === l.id) }))
    .find((x) => x.e
      && (x.e.status === 'active' || x.e.status === 'cancelled')
      && (!x.e.expiresAt || x.e.expiresAt > Date.now()));
  // Selected tier index — only matters when user is NOT yet active.
  const [tierIdx, setTierIdx] = React.useState(0);
  const listing = ownedEntry?.l || tiers[tierIdx] || tiers[0] || fallback;
  const entry = ownedEntry?.e || null;
  const active = !!ownedEntry;
  // Distinguish "Active" (auto-renewing) from "Cancelled, still in period".
  const cancelledButValid = active && entry?.status === 'cancelled';
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, [active]);

  const [pending, setPending] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  if (!listing) {
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>Hugin isn't available right now.</div>
      </Glass>
    );
  }

  const auraShort = state.aura < listing.price;
  const levelLocked = state.level < (listing.level || 1);
  const locked = levelLocked || auraShort;

  const subscribe = () => {
    if (pending || locked) return;
    setPending(true);
    setTimeout(() => {
      const res = purchaseListing?.(listing);
      setPending(false);
      if (res?.ok) {
        try { ElyNotify?.toast?.({ text: `Hugin unlocked — welcome aboard 🎉`, kind: 'success' }); } catch {}
      } else {
        try { ElyNotify?.toast?.({ text: 'Not enough aura', kind: 'warn' }); } catch {}
      }
    }, 420);
  };

  const launch = () => {
    const inv = window.__TAURI__?.core?.invoke;
    if (!inv) {
      try { ElyNotify?.toast?.({ text: 'Hugin — launch only works in the desktop app', kind: 'info' }); } catch {}
      return;
    }
    // Hugin ships as Hugin.app — `open -a Hugin` finds it in /Applications.
    inv('launch_app', { nameOrPath: 'Hugin' }).catch((err) => {
      try {
        ElyNotify?.toast?.({
          text: `Couldn't launch Hugin — make sure Hugin.app is installed in /Applications. (${err})`,
          kind: 'warn',
        });
      } catch {}
    });
  };

  // Active subscribers still need to physically install the plugin before the
  // Launch button makes sense. Track "installed" via localStorage flag set by
  // the DownloadManager on first successful save.
  const installed = window.useInstalled ? window.useInstalled(listing?.id) : false;
  const [downloading, setDownloading] = React.useState(false);
  const downloadPlugin = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const detail = await window.ElyAPI.get(`/listings/${listing.id}`);
      const ghUrl = detail?.current_version_url || listing.current_version_url;
      if (!ghUrl) {
        try { ElyNotify?.toast?.({ text: 'No release available yet', kind: 'warn' }); } catch {}
        return;
      }
      const base = window.ELYHUB_CONFIG?.apiUrl || '';
      const token = window.ElyAPI?.getToken?.();
      const safeTitle = (listing.title || 'plugin').replace(/[^\w.-]+/g, '_');
      const ver = detail?.current_version || listing.current_version || '';
      window.ElyDownloads?.start?.({
        listingId: listing.id,
        version: ver || null,
        title: `${listing.title}${ver ? ` ${ver}` : ''}`,
        url: `${base}/listings/${encodeURIComponent(listing.id)}/release/download`,
        filename: `${safeTitle}${ver ? `_${ver}` : ''}.zip`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (err) {
      try { ElyNotify?.toast?.({ text: `Download failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
    } finally {
      setDownloading(false);
    }
  };

  // Real Hugin feature pillars — what subscribers actually get inside the
  // After Effects + Premiere panels. Mystic-flavored copy because Hugin
  // ships under the zodiac aesthetic; technical substance preserved so it
  // still reads as a real plugin product page.
  const features = [
    {
      title: 'Linked Nulls',
      body: 'Drop a null bound to any selected layer with one keystroke. Move the null, the layer follows. No expressions, no parenting drudgery.',
    },
    {
      title: 'Slider Sigils',
      body: 'Auto-generate a slider that drives any effect parameter. Animate scale, opacity, distortion — anything — without writing a single expression.',
    },
    {
      title: 'Curve Workshop',
      body: 'Hand-shape easing curves on the fly. Save your favourites as named presets and recall them in any future shot.',
    },
    {
      title: 'Preset Library',
      body: 'Drop in motion presets — text builds, transitions, common rigs — with a click. Build your own and share inside the order.',
    },
    {
      title: 'Keystroke Sorcery',
      body: 'Dozens of new shortcuts mapped over the corners of After Effects and Premiere that Adobe never bothered to bind.',
    },
    {
      title: 'Auto-update',
      body: 'Every release is pulled the moment you launch. Your installation is always current — no manual download dance.',
    },
  ];

  // Subscriber-only perks. Owned by anyone with an active Hugin license,
  // independent of which tier (1 Key / 2 Keys) they hold.
  const rewards = [
    { title: 'Zodiac Theme', body: 'Unlock the celestial reskin of ElyHub — gold leaf, ink, parchment.', glyph: '✦' },
    { title: 'Inner Circle', body: 'Special role on the Discord server. Private channels, voted hands.', glyph: '⌘' },
    { title: 'Bound License', body: 'Your key, minted automatically by the bot when you subscribe.', glyph: '🗝' },
    { title: 'Beta Hands', body: 'First taste of every new feature before it lands in the public release.', glyph: '🜍' },
  ];

  // Public-facing FAQ. Plain Q/A, no collapsing — keeps the page legible
  // and saves a state hook.
  const faq = [
    { q: 'Where does Hugin run?', a: 'After Effects and Premiere on macOS and Windows. Hugin installs as a CEP / UXP panel and binds itself to the host on launch.' },
    { q: 'Do I need a separate license key?', a: "No. The moment you subscribe, the bot mints a license key bound to your Discord account. It's revealed in your library and DMed to you automatically." },
    { q: 'What happens if I cancel?', a: 'You keep full access until the end of the period you already paid for. After that, the license deactivates and Hugin returns to its locked state.' },
    { q: 'How are updates delivered?', a: 'Hugin polls the public release feed at launch. New version available, the plugin pulls and applies it before the host even loads — no clicking, no installer.' },
    { q: 'Can I share my key?', a: 'A key activates on a fixed number of devices (the tier you bought). Each activation binds to a hardware fingerprint; sharing across users will trip the limit.' },
  ];

  const exp = entry?.expiresAt ? expiryLabel(entry.expiresAt) : '';
  const warn = active && entry?.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;

  // Zodiac palette — used by every section below the hero so the whole
  // page reads as one zodiac-themed product surface, regardless of the
  // active app theme. Hardcoded fallbacks let this work even when the
  // window.Z object hasn't been loaded.
  const Z = window.Z || {};
  const ZGOLD = Z.gold || '#c9a24e';
  const ZGOLDHI = Z.goldHi || '#e6c97a';
  const ZGOLDLO = Z.goldLo || '#a0822d';
  const ZGOLDGLOW = Z.goldGlow || 'rgba(201,162,78,0.45)';
  const ZHAIR = Z.hair || 'rgba(201,162,78,0.18)';
  const ZINK = Z.ink || '#0b0a08';
  const ZINK2 = Z.ink2 || '#13110d';
  const ZSERIF = '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif';
  const ZCAPS = '"Cinzel","Cormorant SC",serif';
  const goldText = {
    background: `linear-gradient(180deg, ${ZGOLDHI} 0%, ${ZGOLD} 50%, ${ZGOLDLO} 100%)`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    WebkitTextFillColor: 'transparent', color: 'transparent',
  };

  return (
    <div>
      {/* Hero — zodiac-themed showcase. Looping video painted full-bleed,
          dark gradient hugs the left edge so the content reads, and the
          parchment-frame center of the video bleeds through the right ~55%
          for visibility. Owner wanted MORE of the visualizer, so the hero
          is intentionally tall (380px) and the gradient backs off in the
          middle to let the raven + frame breathe.
          Palette uses Z (zodiac) tokens regardless of the active theme so
          the page reads as "occult parchment" even on the modern theme.
          ZODIAC_GOLD/HI/LO are inline so we don't depend on window.Z being
          loaded — the zodiac variant ships separately, but the Hugin page
          should always feel zodiac. */}
      {(() => {
          const Z = window.Z || {};
          const ZGOLD = Z.gold || '#c9a24e';
          const ZGOLDHI = Z.goldHi || '#e6c97a';
          const ZGOLDLO = Z.goldLo || '#a0822d';
          const ZGOLDGLOW = Z.goldGlow || 'rgba(201,162,78,0.45)';
          const ZHAIR = Z.hair || 'rgba(201,162,78,0.18)';
          const ZINK = Z.ink || '#0b0a08';
          const ZPARCH = Z.parch || '#e9dfb8';
          const ZSERIF = '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif';
          const ZCAPS = '"Cinzel","Cormorant SC",serif';
          const goldTextStyle = {
            background: `linear-gradient(180deg, ${ZGOLDHI} 0%, ${ZGOLD} 50%, ${ZGOLDLO} 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
          };
          // Corner ornament — L-shaped gold rule at each banner corner.
          // Square brackets evoke a tarot card frame without competing with
          // the parchment frame already inside the video.
          const Corner = ({ pos, size = 22 }) => {
            const { top, right, bottom, left } = pos;
            const lineH = 1; // hairline thickness
            const horiz = (() => {
              const s = { position: 'absolute', height: lineH, background: ZGOLD, width: size };
              if (top !== undefined) s.top = top;
              if (bottom !== undefined) s.bottom = bottom;
              if (left !== undefined) s.left = left;
              else s.right = right;
              return s;
            })();
            const vert = (() => {
              const s = { position: 'absolute', width: lineH, background: ZGOLD, height: size };
              if (top !== undefined) s.top = top;
              if (bottom !== undefined) s.bottom = bottom;
              if (left !== undefined) s.left = left;
              else s.right = right;
              return s;
            })();
            return <><span style={horiz}/><span style={vert}/></>;
          };

          return (
            <div style={{
              // Banner is sized to match the new wider video aspect (3160:1080
              // ≈ 2.93:1). aspectRatio derives height from width so the video
              // frames pixel-perfect; maxWidth keeps it from going edge-to-edge
              // on big monitors. Centered horizontally with auto margins.
              maxWidth: 1100, margin: '0 auto 18px', position: 'relative',
              aspectRatio: '3160 / 1080',
              overflow: 'hidden',
              // Sharp rectangular zodiac frame: 1px gold border, square corners,
              // no backdrop blur (we want the video sharp, not blurred glass).
              border: `1px solid ${ZGOLD}`,
              borderRadius: 0,
              background: ZINK,
              boxShadow: `0 18px 60px rgba(0,0,0,0.6), 0 0 32px ${ZGOLDGLOW}`,
            }}>
              {/* Video — full bleed, behind everything. */}
              <video
                src="assets/hugin-loop.mp4"
                poster="assets/hugin-banner.png"
                autoPlay loop muted playsInline preload="auto"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', zIndex: 0, opacity: 0.95,
                  pointerEvents: 'none',
                }}
              />
              {/* Vignette — dark on the LEFT (content), backs off in the center
                  (parchment frame visible), shallow dark on the right (CTA
                  legibility). Tuned to maximize visualizer visibility. */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                background: `linear-gradient(90deg,
                  rgba(8,6,3,0.95) 0%,
                  rgba(8,6,3,0.78) 16%,
                  rgba(8,6,3,0.30) 34%,
                  rgba(8,6,3,0.05) 52%,
                  rgba(8,6,3,0.05) 68%,
                  rgba(8,6,3,0.30) 84%,
                  rgba(8,6,3,0.70) 100%)`,
              }}/>
              {/* Inner gold hairline — sits just inside the outer border to
                  echo a tarot card's double-rule. */}
              <div style={{
                position: 'absolute', inset: 8, zIndex: 1, pointerEvents: 'none',
                border: `1px solid ${ZHAIR}`,
              }}/>
              {/* Corner ornaments — L-shaped gold accents at each interior
                  corner of the inner rule. */}
              <Corner pos={{ top: 14, left: 14 }}/>
              <Corner pos={{ top: 14, right: 14 }}/>
              <Corner pos={{ bottom: 14, left: 14 }}/>
              <Corner pos={{ bottom: 14, right: 14 }}/>
              <div style={{
                padding: '40px 44px', position: 'relative', zIndex: 2,
                display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap',
                minHeight: 380,
              }}>
                {/* Logo — illuminated-manuscript style frame around the
                    parchment raven. Three nested borders + 4 ornate corner
                    blocks (each is a small "+" mark in gold) give the plate
                    a tarot-card / Book of Hours weight without any imagery. */}
                <div style={{
                  width: 132, height: 132, flexShrink: 0,
                  position: 'relative',
                  background: ZINK,
                  // Triple-stack of borders via box-shadow (cheap layered rules):
                  //   1. solid 1px gold outer
                  //   2. 4px gap + thin 0.5px gold mid-line
                  //   3. 7px gap + 1px gold inner
                  //   plus drop shadow + gold ambient glow
                  boxShadow: [
                    `0 0 0 1px ${ZGOLD}`,
                    `0 0 0 4px ${ZINK}`,
                    `0 0 0 5px rgba(201,162,78,0.6)`,
                    `0 0 0 8px ${ZINK}`,
                    `0 0 0 9px ${ZGOLD}`,
                    `0 14px 44px rgba(0,0,0,0.7)`,
                    `0 0 28px ${ZGOLDGLOW}`,
                  ].join(', '),
                }}>
                  <img
                    src="assets/hugin-logo.png"
                    alt="Hugin"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Corner cartouches — small gold cross/+ marks anchoring
                      each corner of the inner rule. SVG so the cross is
                      crisp at any DPI. */}
                  {[
                    { top: -3, left: -3 },
                    { top: -3, right: -3 },
                    { bottom: -3, left: -3 },
                    { bottom: -3, right: -3 },
                  ].map((pos, i) => (
                    <span key={i} style={{
                      position: 'absolute', ...pos,
                      width: 12, height: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <svg viewBox="0 0 12 12" width="12" height="12" style={{ display: 'block' }}>
                        <rect x="5.4" y="0" width="1.2" height="12" fill={ZGOLD}/>
                        <rect x="0" y="5.4" width="12" height="1.2" fill={ZGOLD}/>
                        <circle cx="6" cy="6" r="2" fill={ZINK} stroke={ZGOLD} strokeWidth="0.8"/>
                      </svg>
                    </span>
                  ))}
                  {/* Mid-edge fleur accents — tiny gold diamonds centered on
                      each side of the inner rule, evoking a manuscript page's
                      ornament. Pure CSS (rotated square). */}
                  {[
                    { top: -2, left: '50%', transform: 'translate(-50%, 0) rotate(45deg)' },
                    { bottom: -2, left: '50%', transform: 'translate(-50%, 0) rotate(45deg)' },
                    { left: -2, top: '50%', transform: 'translate(0, -50%) rotate(45deg)' },
                    { right: -2, top: '50%', transform: 'translate(0, -50%) rotate(45deg)' },
                  ].map((s, i) => (
                    <span key={`d${i}`} style={{
                      position: 'absolute', ...s,
                      width: 5, height: 5,
                      background: ZGOLD,
                      boxShadow: `0 0 4px ${ZGOLDGLOW}`,
                      pointerEvents: 'none',
                    }}/>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
                  {/* Title — owner removed: "Hugin." was redundant with the
                      large HUGIN already burned into the parchment frame in
                      the visualizer. The Cinzel label + tagline carry enough
                      identity on this side. */}
                  <div style={{
                    fontFamily: ZCAPS, fontSize: 12, fontWeight: 500,
                    letterSpacing: '0.32em', textTransform: 'uppercase',
                    marginBottom: 18, ...goldTextStyle,
                  }}>
                    ✦ ELY · FIRST-PARTY PLUGIN ✦
                  </div>
                  <div style={{
                    fontFamily: ZSERIF, fontSize: 19, fontStyle: 'italic',
                    color: '#f4ecd0', lineHeight: 1.55,
                    // Heavy dark halo behind the text — the cream-on-dark
                    // contrast was fine on the left half of the gradient but
                    // the tagline's tail bleeds into the bright parchment
                    // visualizer where it disappeared. Layered text-shadows
                    // cut a dark ring around each glyph for legibility on
                    // any background.
                    textShadow:
                      '0 0 12px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,1)',
                    fontWeight: 500,
                  }}>
                    {listing.tagline} — bound to the loom of ElyHub:
                    your aura, your trophies, your library.
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    {active ? (
                      <>
                        <span style={{
                          padding: '5px 14px',
                          background: 'rgba(150,100,200,0.15)',
                          border: '1px solid rgba(150,100,200,0.55)',
                          color: T.lilac, fontFamily: T.fontSans, fontWeight: 600, fontSize: 10,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          boxShadow: '0 0 10px rgba(150,100,200,0.2)',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          borderRadius: T.r.pill,
                        }}>✦ Active</span>
                        {exp && (
                          <span style={{
                            ...TY.small, fontFamily: ZSERIF, fontStyle: 'italic',
                            color: warn ? '#f5c451' : ZPARCH,
                            fontSize: 13, alignSelf: 'center',
                            textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                          }}>{exp}</span>
                        )}
                      </>
                    ) : (
                      <span style={{
                        padding: '5px 14px',
                        background: 'rgba(8,6,3,0.7)',
                        border: `1px solid ${ZGOLD}`,
                        fontFamily: ZCAPS, fontWeight: 500, fontSize: 10,
                        letterSpacing: '0.22em', textTransform: 'uppercase',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        ...goldTextStyle,
                      }}>
                        <ILock size={10}/> Subscription required
                      </span>
                    )}
                  </div>
                </div>
                {active && installed ? (
                  <button
                    onClick={launch}
                    style={{
                      padding: '12px 28px',
                      background: 'rgba(150,100,200,0.15)',
                      border: '1px solid rgba(150,100,200,0.65)',
                      color: T.lilac, cursor: 'pointer', flexShrink: 0,
                      marginLeft: 'auto',
                      fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      borderRadius: T.r.pill,
                      boxShadow: '0 4px 16px rgba(150,100,200,0.2)',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(150,100,200,0.28)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.85)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(150,100,200,0.15)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.65)'; }}
                  >✦ Launch Hugin</button>
                ) : active ? (
                  <button
                    onClick={downloadPlugin}
                    disabled={downloading}
                    style={{
                      padding: '12px 28px',
                      background: 'rgba(150,100,200,0.15)',
                      border: '1px solid rgba(150,100,200,0.65)',
                      color: T.lilac, cursor: downloading ? 'progress' : 'pointer', flexShrink: 0,
                      marginLeft: 'auto',
                      fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      borderRadius: T.r.pill,
                      boxShadow: '0 4px 16px rgba(150,100,200,0.2)',
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      opacity: downloading ? 0.85 : 1,
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { if (!downloading) { e.currentTarget.style.background = 'rgba(150,100,200,0.28)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.85)'; } }}
                    onMouseLeave={(e) => { if (!downloading) { e.currentTarget.style.background = 'rgba(150,100,200,0.15)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.65)'; } }}
                  >
                    {downloading && <Spinner size={14} color={T.lilac}/>}
                    {downloading ? 'Summoning…' : 'Download Hugin ↓'}
                  </button>
                ) : (
            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 240, marginLeft: 'auto' }}>
              {tiers.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div style={{ ...TY.micro, color: T.text3, textAlign: 'left' }}>CHOOSE YOUR PLAN</div>
                  {tiers.map((t, i) => {
                    const sel = i === tierIdx;
                    const tierLabel = (t.kassa_tier || t.kassaTier || '').toUpperCase();
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTierIdx(i)}
                        style={{
                          padding: '10px 14px', borderRadius: T.r.md,
                          border: sel ? `1px solid ${T.lilac}` : `0.5px solid ${T.glassBorder}`,
                          background: sel ? `linear-gradient(135deg, ${T.lilac}22, rgba(255,255,255,0.04))` : 'rgba(255,255,255,0.03)',
                          color: T.text, cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 12, fontFamily: T.fontSans,
                          boxShadow: sel ? `0 0 14px ${T.lilac}44` : 'none',
                          transition: 'all .15s',
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {(() => {
                              const m = (t.kassa_tier || t.kassaTier || '').match(/^(\d+)key$/i);
                              if (m) return `${m[1]} ${m[1] === '1' ? 'Key' : 'Keys'}`;
                              return tierLabel || t.title;
                            })()}
                          </span>
                          <span style={{ ...TY.small, color: T.text3, fontSize: 10, letterSpacing: '0.04em' }}>
                            {t.billing === 'monthly' ? 'monthly' : 'one-time'}
                          </span>
                        </span>
                        <span style={{ ...TY.numMed, color: sel ? T.lilac : T.text2, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(t.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 2 }}>
                {listing.billing === 'monthly' ? 'Monthly subscription' : 'One-time'}
              </div>
              <div style={{ ...TY.numMed, color: T.lilac, fontSize: 32, textShadow: `0 0 14px ${T.lilac}66` }}>
                {fmt(listing.price)}
              </div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>
                aura{listing.billing === 'monthly' ? ' / month' : ''}
              </div>
              <button
                onClick={subscribe}
                disabled={pending || locked}
                style={{
                  marginTop: 10, padding: '12px 24px', borderRadius: T.r.pill,
                  border: `1px solid ${locked ? 'rgba(150,100,200,0.2)' : 'rgba(150,100,200,0.6)'}`,
                  background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(150,100,200,0.15)',
                  color: locked ? T.text3 : T.lilac,
                  cursor: pending ? 'progress' : locked ? 'not-allowed' : 'pointer',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 14,
                  boxShadow: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: pending ? 0.85 : 1,
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => { if (!locked && !pending) { e.currentTarget.style.background = 'rgba(150,100,200,0.28)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.85)'; } }}
                onMouseLeave={(e) => { if (!locked && !pending) { e.currentTarget.style.background = 'rgba(150,100,200,0.15)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.6)'; } }}
              >
                {pending && <Spinner size={14} color="#fff"/>}
                {pending ? 'Subscribing…'
                  : levelLocked ? `Requires Level ${listing.level}`
                  : auraShort ? `Need ${fmt(listing.price - state.aura)} more aura`
                  : 'Subscribe to unlock'}
              </button>
            </div>
          )}
        </div>
            </div>
          );
        })()}

      {/* ───── License status strip — always shown between banner and body ───── */}
      {active ? (
        <div style={{
          maxWidth: 1100, margin: '-4px auto 22px',
          border: `1px solid rgba(150,100,200,0.45)`,
          borderTop: `1px solid rgba(150,100,200,0.15)`,
          background: 'linear-gradient(180deg, rgba(20,12,35,0.97), rgba(12,8,22,0.99))',
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(150,100,200,0.1)`,
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Label */}
            <div style={{
              fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: T.text3, fontWeight: 600,
            }}>LICENSE</div>
            {/* Divider */}
            <div style={{ width: 1, height: 22, background: `rgba(150,100,200,0.3)` }}/>
            {/* Tier */}
            <div style={{ fontFamily: ZSERIF, fontSize: 15, color: T.text2, fontWeight: 500 }}>
              {(() => {
                const m = (listing.kassa_tier || listing.kassaTier || '').match(/^(\d+)key$/i);
                const tierTxt = m ? `${m[1]} ${m[1] === '1' ? 'Key' : 'Keys'}` : 'Pro';
                const billTxt = listing.billing === 'monthly' ? '· Monthly' : '· One-time';
                return `${tierTxt} ${billTxt}`;
              })()}
            </div>
            {/* Divider */}
            <div style={{ width: 1, height: 22, background: `rgba(150,100,200,0.3)` }}/>
            {/* Status dot + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {cancelledButValid ? (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef6b7c', boxShadow: '0 0 6px #ef6b7c', flexShrink: 0 }}/>
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.lilac, boxShadow: `0 0 6px rgba(150,100,200,0.5)`, flexShrink: 0 }}/>
              )}
              <span style={{
                fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                fontWeight: 600,
                color: cancelledButValid ? '#f4849a' : warn ? '#f5c451' : T.lilac,
              }}>
                {cancelledButValid
                  ? `Cancelled — access ${exp ? `for ${exp}` : 'until expiry'}`
                  : exp || 'Active'}
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {entry?.status === 'active' && listing.billing === 'monthly' && (
              <button
                onClick={() => setConfirmCancel(true)}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: `1px solid rgba(239,107,124,0.5)`,
                  color: '#f4849a', cursor: 'pointer',
                  fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                  fontWeight: 600, transition: 'all .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef6b7c'; e.currentTarget.style.background = 'rgba(239,107,124,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(239,107,124,0.5)'; e.currentTarget.style.background = 'transparent'; }}
              >Cancel subscription</button>
            )}
            {['264327419027128320', '462672954585776131'].includes(window.ME?.id) && (
              <ResetSubscriptionButton />
            )}
            <button
              onClick={() => setView({ id: 'library' })}
              style={{
                padding: '8px 18px', background: 'transparent',
                border: `1px solid rgba(150,100,200,0.45)`,
                color: T.lilac, cursor: 'pointer',
                fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                fontWeight: 600, transition: 'all .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(150,100,200,0.8)'; e.currentTarget.style.background = `rgba(150,100,200,0.1)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(150,100,200,0.45)'; e.currentTarget.style.background = 'transparent'; }}
            >Manage in library</button>
          </div>
        </div>
      ) : (
        /* ── Not-subscribed strip — same slot, different state ── */
        <div style={{
          maxWidth: 1100, margin: '-4px auto 22px',
          border: `1px solid rgba(150,100,200,0.45)`,
          borderTop: `1px solid rgba(150,100,200,0.15)`,
          background: 'linear-gradient(180deg, rgba(20,12,35,0.97), rgba(12,8,22,0.99))',
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(150,100,200,0.1)`,
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: T.text3, fontWeight: 600,
            }}>LICENSE</div>
            <div style={{ width: 1, height: 22, background: 'rgba(150,100,200,0.3)' }}/>
            <div style={{ fontFamily: ZSERIF, fontSize: 15, color: T.text2, fontWeight: 500 }}>
              Not subscribed
            </div>
            <div style={{ width: 1, height: 22, background: 'rgba(150,100,200,0.3)' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#888', flexShrink: 0 }}/>
              <span style={{
                fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                fontWeight: 600, color: T.text3,
              }}>
                {fmt(listing.price)} aura / month
              </span>
            </div>
          </div>
          <button
            onClick={subscribe}
            disabled={pending || locked}
            style={{
              padding: '9px 22px', borderRadius: T.r.pill,
              border: `1px solid ${locked ? 'rgba(150,100,200,0.2)' : 'rgba(150,100,200,0.6)'}`,
              background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(150,100,200,0.15)',
              color: locked ? T.text3 : T.lilac,
              cursor: pending ? 'progress' : locked ? 'not-allowed' : 'pointer',
              fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all .15s',
              opacity: pending ? 0.85 : 1, flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!locked && !pending) { e.currentTarget.style.background = 'rgba(150,100,200,0.28)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.85)'; } }}
            onMouseLeave={(e) => { if (!locked && !pending) { e.currentTarget.style.background = 'rgba(150,100,200,0.15)'; e.currentTarget.style.borderColor = 'rgba(150,100,200,0.6)'; } }}
          >
            {pending && <Spinner size={11} color="#fff"/>}
            {pending ? 'Subscribing…'
              : levelLocked ? `Level ${listing.level} required`
              : auraShort ? `Need ${fmt(listing.price - state.aura)} more aura`
              : 'Subscribe'}
          </button>
        </div>
      )}

      {/* ───────────────── WHAT IS HUGIN ───────────────── */}
      {/* One-paragraph pitch + host badges (After Effects, Premiere). The
          zodiac caps headline acts as a section delimiter that matches the
          banner aesthetic; the body is plain serif for readability. */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.32em',
          textTransform: 'uppercase', marginBottom: 14, ...goldText,
        }}>
          ✦ THE HAND BEHIND THE HOST ✦
        </div>
        <div style={{
          fontFamily: ZSERIF, fontStyle: 'italic',
          fontSize: 22, lineHeight: 1.55, color: '#f4ecd0',
          maxWidth: 760, marginBottom: 22, fontWeight: 600,
        }}>
          Hugin is a power tool for After Effects and Premiere. Linked nulls,
          auto-sliders for any effect, custom curves, motion presets, and a
          fistful of shortcuts Adobe never thought to bind — all conjured
          from one panel, all bound to your aura.
        </div>
        {/* Host badges — pill rectangles with gold rules. Logos can be
            swapped in later by replacing the <span> with an <img>. */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { name: 'After Effects', meta: '2022 +' },
            { name: 'Premiere Pro', meta: '2022 +' },
            { name: 'macOS & Windows', meta: 'native' },
          ].map((h) => (
            <div key={h.name} style={{
              padding: '8px 16px',
              border: `1px solid ${ZHAIR}`,
              background: 'rgba(8,6,3,0.55)',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 6, height: 6, background: ZGOLD,
                boxShadow: `0 0 6px ${ZGOLDGLOW}`,
              }}/>
              <span style={{
                fontFamily: ZSERIF,
                fontSize: 14, color: '#f4ecd0', fontWeight: 500,
              }}>{h.name}</span>
              <span style={{
                fontFamily: ZCAPS, fontSize: 9, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: ZGOLD, opacity: 0.8,
              }}>{h.meta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────── FEATURES ───────────────── */}
      {/* 6-card grid. Each card is a parchment-bordered tile with the same
          gold-rule treatment as the hero plate (single inner hairline +
          corner cross marks at the four corners). Roman numeral on the
          left ties them together as a sequence rather than a flat list. */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.32em',
          textTransform: 'uppercase', marginBottom: 14, ...goldText,
        }}>
          ✦ INSIDE THE PANEL ✦
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {features.map((f, i) => {
            const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i] || String(i + 1);
            return (
              <div key={f.title} style={{
                position: 'relative',
                padding: '24px 22px 22px',
                background: `linear-gradient(180deg, ${ZINK2}, ${ZINK})`,
                border: `1px solid ${ZHAIR}`,
              }}>
                {/* corner cross marks (smaller version of the logo plate's) */}
                {[
                  { top: -3, left: -3 }, { top: -3, right: -3 },
                  { bottom: -3, left: -3 }, { bottom: -3, right: -3 },
                ].map((pos, k) => (
                  <span key={k} style={{ position: 'absolute', ...pos, width: 8, height: 8, pointerEvents: 'none' }}>
                    <svg viewBox="0 0 8 8" width="8" height="8">
                      <rect x="3.4" y="0" width="1.2" height="8" fill={ZGOLD}/>
                      <rect x="0" y="3.4" width="8" height="1.2" fill={ZGOLD}/>
                    </svg>
                  </span>
                ))}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.2em',
                    color: ZGOLD, opacity: 0.65,
                  }}>{roman}</span>
                  <span style={{
                    fontFamily: ZSERIF, fontStyle: 'italic',
                    fontSize: 22, fontWeight: 600, ...goldText,
                  }}>{f.title}</span>
                </div>
                <div style={{
                  fontFamily: ZSERIF,
                  fontSize: 14, lineHeight: 1.6, color: '#ede5cc', fontWeight: 500,
                }}>{f.body}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────── SUBSCRIBER REWARDS ───────────────── */}
      {/* Bigger, more decorated cards because these are the perks (the
          "what you actually get for the aura you spend"). Each has a
          large glyph at top, a one-line bold title, and a short blurb. */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.32em',
          textTransform: 'uppercase', marginBottom: 14, ...goldText,
        }}>
          ✦ WHAT BINDS YOU TO THE ORDER ✦
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}>
          {rewards.map((r) => (
            <div key={r.title} style={{
              position: 'relative', padding: '28px 22px',
              background: `linear-gradient(180deg, ${ZINK2}, ${ZINK})`,
              boxShadow: [
                `0 0 0 1px ${ZGOLD}`,
                `0 0 0 4px ${ZINK}`,
                `0 0 0 5px rgba(201,162,78,0.4)`,
                `0 12px 36px rgba(0,0,0,0.5)`,
                `0 0 24px ${ZGOLDGLOW}`,
              ].join(', '),
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: ZSERIF, fontSize: 36, lineHeight: 1,
                ...goldText, marginBottom: 12,
              }}>{r.glyph}</div>
              <div style={{
                fontFamily: ZSERIF, fontStyle: 'italic',
                fontSize: 19, fontWeight: 600, ...goldText, marginBottom: 8,
              }}>{r.title}</div>
              <div style={{
                fontFamily: ZSERIF,
                fontSize: 13, lineHeight: 1.6, color: '#ede5cc', fontWeight: 500,
              }}>{r.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────── SHOWCASE ───────────────── */}
      {/* Placeholder visual frames — owner will swap in real screenshots.
          Each tile is a parchment-style box with a labeled spot indicator
          and a "frame coming soon" backdrop. Three tiles in a strip, each
          mimicking a fake annotated screenshot of Hugin in action. */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.32em',
          textTransform: 'uppercase', marginBottom: 14, ...goldText,
        }}>
          ✦ SEEN IN PRACTICE ✦
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {[
            { idx: '01', label: 'Linked Nulls', body: 'A single keystroke binds a null to the selected layer.' },
            { idx: '02', label: 'Slider Sigils', body: "Spin up an effect-driven slider — no expressions written." },
            { idx: '03', label: 'Curve Workshop', body: 'Hand-drawn easing curves saved as recallable presets.' },
          ].map((s) => (
            <div key={s.idx} style={{
              position: 'relative', overflow: 'hidden',
              background: ZINK,
              border: `1px solid ${ZGOLD}`,
              boxShadow: `0 12px 36px rgba(0,0,0,0.5)`,
            }}>
              {/* parchment placeholder area — uses the existing banner.png
                  as a faded backdrop to evoke "screenshot frame" without
                  actual content yet. */}
              <div style={{
                aspectRatio: '16 / 10',
                position: 'relative',
                background: `
                  linear-gradient(rgba(8,6,3,0.65), rgba(8,6,3,0.65)),
                  url("assets/hugin-banner.png") center/cover no-repeat
                `,
              }}>
                <div style={{
                  position: 'absolute', inset: 8,
                  border: `1px solid ${ZHAIR}`, pointerEvents: 'none',
                }}/>
                <div style={{
                  position: 'absolute', top: 12, left: 14,
                  fontFamily: ZCAPS, fontSize: 10, letterSpacing: '0.3em',
                  color: ZGOLD,
                }}>{s.idx}</div>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    fontFamily: ZSERIF, fontStyle: 'italic',
                    fontSize: 14, color: ZGOLD, opacity: 0.55,
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}>— frame to come —</div>
                </div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{
                  fontFamily: ZSERIF, fontStyle: 'italic',
                  fontSize: 18, fontWeight: 600, ...goldText, marginBottom: 4,
                }}>{s.label}</div>
                <div style={{
                  fontFamily: ZSERIF,
                  fontSize: 13, color: '#ede5cc', lineHeight: 1.55, fontWeight: 500,
                }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────── FAQ ───────────────── */}
      {/* Plain Q/A list. No collapse — keeps the page legible and the
          questions are short enough to read inline. Hairline rule
          separates each entry. */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: ZCAPS, fontSize: 11, letterSpacing: '0.32em',
          textTransform: 'uppercase', marginBottom: 14, ...goldText,
        }}>
          ✦ ANSWERED IN INK ✦
        </div>
        <div style={{
          background: `linear-gradient(180deg, ${ZINK2}, ${ZINK})`,
          border: `1px solid ${ZHAIR}`,
        }}>
          {faq.map((item, i) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderTop: i === 0 ? 'none' : `1px solid ${ZHAIR}`,
            }}>
              <div style={{
                fontFamily: ZSERIF, fontStyle: 'italic',
                fontSize: 17, fontWeight: 600, ...goldText, marginBottom: 8,
              }}>
                <span style={{ color: ZGOLD, opacity: 0.55, marginRight: 10 }}>—</span>
                {item.q}
              </div>
              <div style={{
                fontFamily: ZSERIF,
                fontSize: 14, lineHeight: 1.7, color: '#ede5cc',
                paddingLeft: 22, fontWeight: 500,
              }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About row — always full width; license is handled by the strip above */}
      <Glass style={{ padding: 22 }}>
        <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>ABOUT</div>
        <div style={{ ...TY.body, color: T.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{listing.description}</div>
      </Glass>

      {/* Cancel-subscription confirmation modal — guards against accidental
          clicks on the destructive button. Plain custom modal because
          window.confirm() doesn't reliably fire inside the Tauri webview. */}
      {confirmCancel && (
        <div
          onClick={() => setConfirmCancel(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440, width: '100%',
              background: T.bg2 || '#1a1d2a',
              border: `0.5px solid ${T.glassBorder}`,
              borderRadius: T.r.lg, padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ ...TY.h3, color: T.text, marginBottom: 8 }}>
              Cancel {listing.title}?
            </div>
            <div style={{ ...TY.body, color: T.text2, fontSize: 14, lineHeight: 1.55, marginBottom: 6 }}>
              Your subscription will not renew next cycle.
            </div>
            <div style={{ ...TY.small, color: T.text3, fontSize: 12, lineHeight: 1.55, marginBottom: 22 }}>
              You'll keep full access {exp ? `for ${exp}` : 'until the current period ends'} —
              your license stays valid until expiry.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmCancel(false)}
                style={{
                  padding: '10px 20px', borderRadius: T.r.pill,
                  border: `0.5px solid ${T.glassBorder}`,
                  background: 'rgba(255,255,255,0.04)', color: T.text2,
                  cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                }}
              >Keep subscription</button>
              <button
                onClick={() => {
                  library.cancel(listing.id);
                  setConfirmCancel(false);
                  try { ElyNotify?.toast?.({
                    text: `${listing.title} cancelled — access ${exp ? `for ${exp}` : 'until expiry'}`,
                    kind: 'info',
                  }); } catch {}
                }}
                style={{
                  padding: '10px 20px', borderRadius: T.r.pill,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef6b7c, #c94a5b)',
                  color: '#fff', cursor: 'pointer',
                  fontFamily: T.fontSans, fontSize: 13, fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(239,107,124,0.4)',
                }}
              >Yes, cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reachable via the sidebar `plugin:<listingId>` entries. For now this is a
// host shell: shows license status, a Launch button, and basic info. When a
// plugin is a separate Tauri app (like Zephyro) the Launch button will invoke
// a Tauri command to spawn its window — mocked below until the native side
// lands.
function PluginPanelView({ listingId, library, setView }) {
  if (T.zodiac && window.ZodiacPluginPanelView) {
    return <window.ZodiacPluginPanelView listingId={listingId} library={library} setView={setView}/>;
  }
  const listing = (window.LISTINGS || []).find((x) => x.id === listingId);
  const entry = library.items.find((it) => it.listingId === listingId);
  const [, force] = React.useReducer((x) => x + 1, 0);
  // Re-render every 30s so the expiry countdown stays fresh.
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

  // First-party plugins (Hugin etc.) have a dedicated, richer page — this
  // generic panel is redundant and confuses the user. Redirect on mount so
  // clicks from My Library / sidebar always land on the canonical view.
  const isHugin = listing && (listing.kassa_product_id || listing.kassaProductId) === 'gleipnir';
  React.useEffect(() => {
    if (isHugin) setView({ id: 'zephyro' });
  }, [isHugin]);
  if (isHugin) return null;

  if (!listing) {
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>Plugin not found.</div>
        <button onClick={() => setView({ id: 'library' })} style={{ ...linkStyle(), marginTop: 12 }}>← Back to library</button>
      </Glass>
    );
  }
  const meta = listingTypeMeta(listing.type);
  const active = entry && entry.status === 'active' && (!entry.expiresAt || entry.expiresAt > Date.now());
  const expLbl = entry?.expiresAt ? expiryLabel(entry.expiresAt) : '';
  const warn = active && entry.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;

  const launch = () => {
    const inv = window.__TAURI__?.core?.invoke;
    if (!inv) {
      try { ElyNotify?.toast?.({ text: `${listing.title} — launch only works in the desktop app`, kind: 'info' }); } catch {}
      return;
    }
    // Use the listing title as the .app name (works for Hugin → Hugin.app).
    // Future listings may need a per-listing override stored on the row.
    inv('launch_app', { nameOrPath: listing.title }).catch((err) => {
      try {
        ElyNotify?.toast?.({
          text: `Couldn't launch ${listing.title} — make sure it's installed in /Applications. (${err})`,
          kind: 'warn',
        });
      } catch {}
    });
  };

  const installed = window.useInstalled ? window.useInstalled(listing?.id) : false;
  const [downloading, setDownloading] = React.useState(false);
  const downloadPlugin = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const detail = await window.ElyAPI.get(`/listings/${listing.id}`);
      const ghUrl = detail?.current_version_url || listing.current_version_url;
      if (!ghUrl) {
        try { ElyNotify?.toast?.({ text: 'No release available yet', kind: 'warn' }); } catch {}
        return;
      }
      const base = window.ELYHUB_CONFIG?.apiUrl || '';
      const token = window.ElyAPI?.getToken?.();
      const safeTitle = (listing.title || 'plugin').replace(/[^\w.-]+/g, '_');
      const ver = detail?.current_version || listing.current_version || '';
      window.ElyDownloads?.start?.({
        listingId: listing.id,
        version: ver || null,
        title: `${listing.title}${ver ? ` ${ver}` : ''}`,
        url: `${base}/listings/${encodeURIComponent(listing.id)}/release/download`,
        filename: `${safeTitle}${ver ? `_${ver}` : ''}.zip`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (err) {
      try { ElyNotify?.toast?.({ text: `Download failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
    } finally {
      setDownloading(false);
    }
  };
  // Reactive: clicking the CTA either fires the launcher (when installed) or
  // kicks off a download (when active subscription but plugin not yet on disk).
  const ctaActive = active && installed;
  const ctaDownload = active && !installed;
  const ctaLabel = ctaActive ? 'Launch' : ctaDownload ? (downloading ? 'Starting…' : 'Download') : 'Inactive';
  const ctaHandler = ctaActive ? launch : ctaDownload ? downloadPlugin : undefined;
  const ctaEnabled = ctaActive || (ctaDownload && !downloading);

  return (
    <div>
      <button onClick={() => setView({ id: 'library' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        ...TY.small, color: T.textOnBg2, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
      }}>← My Library</button>

      <Glass style={{ padding: 0, overflow: 'hidden', position: 'relative', marginBottom: 18 }}>
        <HoverOrbs restX={75} restY={30} size={520} color={meta.hue} colorHi={T.accentHi}/>
        <div style={{ padding: 28, display: 'flex', gap: 20, alignItems: 'center', position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: T.r.lg,
            background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.04))`,
            border: `0.5px solid ${meta.hue}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: meta.hue, flexShrink: 0,
          }}>
            <ListingTypeIcon type={listing.type} size={32}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TY.micro, color: meta.hue, marginBottom: 4 }}>{meta.label.replace(/s$/, '').toUpperCase()}</div>
            <h1 style={{ ...TY.h2, margin: 0, color: T.text }}>{listing.title}</h1>
            <div style={{ ...TY.body, color: T.text2, marginTop: 4 }}>{listing.tagline}</div>
          </div>
          <button
            onClick={ctaHandler}
            disabled={!ctaEnabled}
            style={{
              padding: '12px 22px', borderRadius: T.r.pill, border: 'none',
              background: ctaEnabled ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
              color: ctaEnabled ? '#fff' : T.text3,
              cursor: ctaEnabled ? (downloading ? 'progress' : 'pointer') : 'not-allowed',
              fontFamily: T.fontSans, fontWeight: 600, fontSize: 14,
              boxShadow: ctaEnabled ? `0 4px 18px ${T.accent}66` : 'none',
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: downloading ? 0.85 : 1,
            }}
          >
            {downloading && <Spinner size={12} color="#fff"/>}
            {ctaLabel}
          </button>
        </div>
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 18, alignItems: 'start' }}>
        <Glass style={{ padding: 22 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>ABOUT</div>
          <div style={{ ...TY.body, color: T.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{listing.description}</div>
        </Glass>

        <Glass style={{ padding: 22 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>LICENSE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: active ? (warn ? '#f5c451' : '#6ee7a0') : '#ef6b7c',
              boxShadow: `0 0 8px ${active ? (warn ? '#f5c451' : '#6ee7a0') : '#ef6b7c'}`,
            }}/>
            <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>
              {active ? (warn ? 'Expiring soon' : 'Active') : (entry?.status === 'expired' ? 'Expired' : entry?.status === 'cancelled' ? 'Cancelled' : 'Not subscribed')}
            </div>
          </div>
          {expLbl && <div style={{ ...TY.small, color: T.text3 }}>{expLbl}</div>}
          {listing.billing === 'monthly' && (
            <>
              <div style={{ height: 1, background: T.glassBorder, margin: '14px 0' }}/>
              <div style={{ ...TY.small, color: T.text3, fontSize: 12, lineHeight: 1.5 }}>
                {fmt(listing.price)} aura / month. License lapses if a renewal fails. Manage from My Library.
              </div>
              <button
                onClick={() => setView({ id: 'listing', focusId: listing.id })}
                style={{
                  marginTop: 12, width: '100%',
                  padding: '10px 14px', borderRadius: T.r.pill,
                  border: `0.5px solid ${T.glassBorder}`,
                  background: 'rgba(255,255,255,0.04)', color: T.text2,
                  cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                }}
              >
                {active ? 'Manage subscription' : 'Renew'}
              </button>
            </>
          )}
        </Glass>
      </div>
    </div>
  );
}

// ──── Discover scoring ────
// Blends every personal signal we have into a single relevance score per
// listing, plus a short list of "reasons" the UI can surface as chips so
// the ranking doesn't feel like a black box.
//
// Signals (weights tuned by feel — nothing precise, just what reads as
// sensible on the seeded dataset):
//   +70  creator is followed
//   +40  type matches something in wishlist
//   +30  tag overlap with recent-view history
//   +20  tag overlap with wishlist
//   +12  within-budget (aura ≥ price) — nudge affordable stuff first
//   ×0   owned items (hard-filtered, not scored) — and user's own listings
//
// Recent views themselves are excluded from the results so Discover doesn't
// just re-surface the strip you already scrolled past.
function scoreDiscover(listing, ctx) {
  const { follows, wishlist, recent, library, state } = ctx;
  const reasons = [];
  let score = 0;

  if (follows?.has?.(listing.sellerId)) {
    score += 70;
    const seller = (window.MEMBERS || []).find((m) => m.id === listing.sellerId);
    reasons.push({ text: seller ? `From ${seller.name.split(' ')[0]}` : 'From a creator you follow', kind: 'follow' });
  }

  // Wishlist type affinity — if you've hearted 3 plugins, plugins float up.
  const wishListings = (wishlist?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);
  const wishTypes = new Set(wishListings.map((l) => l.type));
  if (wishTypes.has(listing.type)) {
    score += 40;
    reasons.push({ text: `Matches your saved ${listing.type}s`, kind: 'wish' });
  }

  // Recent-view tag overlap.
  const recentListings = (recent?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);
  const recentTags = new Set(recentListings.flatMap((l) => l.tags || []));
  const ownTags = listing.tags || [];
  const recentOverlap = ownTags.filter((t) => recentTags.has(t));
  if (recentOverlap.length) {
    score += 30 * Math.min(2, recentOverlap.length);
    reasons.push({ text: `Similar to what you've browsed`, kind: 'recent' });
  }

  // Wishlist tag overlap.
  const wishTags = new Set(wishListings.flatMap((l) => l.tags || []));
  const wishOverlap = ownTags.filter((t) => wishTags.has(t));
  if (wishOverlap.length && !recentOverlap.length) {
    score += 20;
    reasons.push({ text: `Tags you've saved before`, kind: 'tag' });
  }

  if (state && listing.price && state.aura >= listing.price && state.level >= (listing.level || 1)) {
    score += 12;
  }

  // Small baseline so ties fall to higher-rated items. effectiveRating is
  // defined below in the file but hoisted.
  try {
    const er = effectiveRating(listing);
    if (er.rating > 0) score += er.rating * 2;
  } catch {}

  return { score, reasons: reasons.slice(0, 2) };
}

// ──── DiscoverView — personalised "For you" surface ────
// Ranks every listing the user doesn't own, excluding recent-views (those
// already have their own strip), and surfaces up to 18 picks with a reason
// chip each. Empty-state pushes users toward the signals that feed the
// ranker so the page becomes useful quickly.
function DiscoverView({ state, setView, wishlist, follows, recent, library, blocks }) {
  if (T.zodiac && window.ZodiacDiscoverView) {
    return <window.ZodiacDiscoverView state={state} setView={setView} wishlist={wishlist} follows={follows} recent={recent} library={library} blocks={blocks}/>;
  }
  const all = (window.LISTINGS || []).filter((l) => !(blocks && blocks.has(l.sellerId)));
  const ownedIds = new Set((library?.items || []).filter((it) => it.status === 'active').map((it) => it.listingId));
  const recentIds = new Set(recent?.items || []);
  const myId = window.ME?.id || 'me';

  const ranked = all
    .filter((l) => !ownedIds.has(l.id) && !recentIds.has(l.id) && l.sellerId !== myId)
    .map((l) => ({ l, ...scoreDiscover(l, { follows, wishlist, recent, library, state }) }))
    .filter((r) => r.score > 10) // cheap cutoff — no reason-less picks
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  const hasSignals = (follows?.items?.length || 0) + (wishlist?.items?.length || 0) + (recent?.items?.length || 0) > 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...TY.h1, margin: 0 }}>For you</h1>
        <div style={{ ...TY.small, color: T.text3, marginTop: 4 }}>
          Picks blended from what you've saved, followed, and browsed.
        </div>
      </div>

      {!hasSignals ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>✨</div>
          <div style={{ ...TY.h3, margin: 0 }}>Give us a few signals first</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 8, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Heart a few listings, follow a creator, or just browse the marketplace for a minute. Come back and this page will light up with personalised picks.
          </div>
          <button
            onClick={() => setView({ id: 'store' })}
            style={{
              marginTop: 18, padding: '10px 18px', borderRadius: T.r.pill, border: 'none',
              background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`, color: '#fff',
              fontFamily: T.fontSans, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              boxShadow: `0 4px 18px ${T.accent}66`,
            }}
          >
            Browse marketplace
          </button>
        </Glass>
      ) : ranked.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>Nothing new to recommend right now.</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>Follow more creators or heart a few listings and check back.</div>
        </Glass>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {ranked.map(({ l, reasons }, i) => (
            <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ListingCard
                l={l}
                state={state}
                index={i}
                onOpen={() => setView({ id: 'listing', focusId: l.id })}
                onSeller={(m) => setView({ id: 'profile', userId: m.id })}
                wishlist={wishlist}
              />
              {reasons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 2px' }}>
                  {reasons.map((r, ri) => {
                    const hue = r.kind === 'follow' ? T.accentHi
                              : r.kind === 'wish'   ? '#ff9ab1'
                              : r.kind === 'recent' ? T.lilac
                              :                       T.green;
                    return (
                      <span key={ri} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: T.r.pill,
                        background: `${hue}15`,
                        border: `0.5px solid ${hue}40`,
                        color: hue,
                        fontFamily: T.fontSans, fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}>
                        {r.kind === 'follow' && '→'}
                        {r.kind === 'wish' && '♡'}
                        {r.kind === 'recent' && '◔'}
                        {r.kind === 'tag' && '#'}
                        {r.text}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──── SavedView — wishlist grid ────
// ────────────── Collection detail ──────────────
// Resolves a collection id → { collection, items } via getCollectionItems so
// rule-based collections stay fresh on every render. The header leans on the
// collection's accent color to give each one a distinct identity without
// needing per-collection hero art.
function CollectionView({ state, setView, collectionId, wishlist }) {
  if (T.zodiac && window.ZodiacCollectionView) {
    return <window.ZodiacCollectionView state={state} setView={setView} collectionId={collectionId} wishlist={wishlist}/>;
  }
  const collection = (window.LISTING_COLLECTIONS || []).find((c) => c.id === collectionId);
  const items = collection ? (window.getCollectionItems?.(collection) || []) : [];
  const [sort, setSort] = React.useState('default'); // default | priceAsc | priceDesc | rating | new

  if (!collection) {
    return (
      <div style={{ padding: 40 }}>
        <button onClick={() => setView({ id: 'store' })} style={{
          background: 'transparent', border: 'none', color: T.text2,
          cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
        }}>← Back to marketplace</button>
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>Collection not found.</div>
        </Glass>
      </div>
    );
  }

  const sortFns = {
    default:   null,
    priceAsc:  (a, b) => (a.price || 0) - (b.price || 0),
    priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
    rating:    (a, b) => (effectiveRating(b).rating) - (effectiveRating(a).rating),
    new:       (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  };
  const sorted = sort === 'default' ? items : [...items].sort(sortFns[sort]);

  const openListing = (l) => setView({ id: 'listing', focusId: l.id });
  const openSeller = (m) => setView({ id: 'profile', userId: m.id });

  return (
    <div>
      <button onClick={() => setView({ id: 'store' })} style={{
        background: 'transparent', border: 'none', color: T.text2,
        cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20,
      }}>← Back to marketplace</button>

      <div style={{
        position: 'relative',
        borderRadius: T.r.md,
        padding: '28px 28px 24px',
        marginBottom: 28,
        overflow: 'hidden',
        border: `0.5px solid ${T.glassBorder}`,
        background: `
          linear-gradient(135deg, ${collection.accent}26, ${collection.accent}0a 60%, transparent),
          rgba(255,255,255,0.03)
        `,
      }}>
        <div style={{ ...TY.micro, color: collection.accent, letterSpacing: '0.1em', marginBottom: 8 }}>COLLECTION</div>
        <h1 style={{ ...TY.h1, margin: 0, color: T.textOnBg }}>
          {collection.name}<span style={{ color: collection.accent }}>.</span>
        </h1>
        <div style={{ ...TY.body, color: T.textOnBg2, marginTop: 8, maxWidth: 560 }}>
          {collection.blurb}
        </div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 12, fontSize: 12 }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: T.r.pill,
            background: 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text, fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="default">Curated order</option>
          <option value="new">Newest</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>This collection is empty right now.</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>Check back soon — it auto-updates.</div>
        </Glass>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {sorted.map((l, i) => (
            <ListingCard key={l.id} l={l} state={state} onOpen={openListing} onSeller={openSeller} index={i} wishlist={wishlist}/>
          ))}
        </div>
      )}
    </div>
  );
}

// Shows everything the user has hearted on the marketplace. Flags items the
// user can't currently afford so they know what to work toward. Empty state
// points back to the marketplace so this page is never a dead end.
function SavedView({ state, setView, wishlist }) {
  if (T.zodiac && window.ZodiacSavedView) {
    return <window.ZodiacSavedView state={state} setView={setView} wishlist={wishlist}/>;
  }
  const items = (wishlist?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);

  // Aggregate totals so the header can give a "you need X more aura" nudge.
  const totalPrice = items.reduce((s, l) => s + (l.price || 0), 0);
  const affordable = items.filter((l) => state.aura >= (l.price || 0) && state.level >= (l.level || 1)).length;

  if (!items.length) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ ...TY.h1, margin: 0 }}>Saved</h1>
          <div style={{ ...TY.small, color: T.text3, marginTop: 4 }}>Listings you've hearted from the marketplace.</div>
        </div>
        <Glass style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🤍</div>
          <div style={{ ...TY.h3, margin: 0 }}>Nothing saved yet</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Tap the heart on any listing to save it here — useful for tracking what you're eyeing before you have the aura to unlock it.
          </div>
          <button
            onClick={() => setView({ id: 'store' })}
            style={{
              marginTop: 18, padding: '10px 18px', borderRadius: T.r.pill, border: 'none',
              background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`, color: '#fff',
              fontFamily: T.fontSans, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              boxShadow: `0 4px 18px ${T.accent}66`,
            }}
          >
            Browse marketplace
          </button>
        </Glass>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ ...TY.h1, margin: 0 }}>Saved</h1>
          <div style={{ ...TY.small, color: T.text3, marginTop: 4 }}>
            {items.length} {items.length === 1 ? 'listing' : 'listings'} · {affordable} within reach · {fmt(totalPrice)} aura total
          </div>
        </div>
        <button
          onClick={() => setView({ id: 'store' })}
          style={{
            padding: '8px 14px', borderRadius: T.r.pill,
            background: 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text2, cursor: 'pointer',
            fontFamily: T.fontSans, fontWeight: 500, fontSize: 12,
          }}
        >
          + Browse more
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {items.map((l, i) => (
          <ListingCard
            key={l.id}
            l={l}
            state={state}
            index={i}
            onOpen={() => setView({ id: 'listing', focusId: l.id })}
            onSeller={(m) => setView({ id: 'profile', userId: m.id })}
            wishlist={wishlist}
          />
        ))}
      </div>
    </div>
  );
}

// ──── MessageListingCard — rich attachment bubble for shared listings ────
//
// Rendered when a chat message has `attachment: { type: 'listing', id }`.
// Looks up the listing in window.LISTINGS (hydrated by data.jsx) and shows
// a compact card: cover image on the left, title + price on the right,
// whole thing clickable to jump into the listing detail.
//
// If the listing is gone (unpublished / removed), we show a muted "Listing
// unavailable" state rather than a broken link — the message itself stays
// in the thread because it's part of the conversation history.
function MessageListingCard({ listingId, onOpen, mine }) {
  const listing = (window.LISTINGS || []).find((l) => l.id === listingId);
  const seller = listing ? (window.MEMBERS || []).find((m) => m.id === listing.sellerId) : null;
  // Cover image — first asset with kind='cover', else the first image asset,
  // else fall back to the seed `image` field for legacy listings.
  const cover = listing?.image
    || listing?.assets?.find?.((a) => a.kind === 'cover')?.url
    || listing?.assets?.find?.((a) => a.kind?.startsWith?.('image'))?.url
    || null;

  if (!listing) {
    return (
      <div style={{
        width: 280, maxWidth: '100%',
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: `0.5px solid ${T.glassBorder}`,
        color: T.text3, fontSize: 12, fontStyle: 'italic',
      }}>
        Listing unavailable
      </div>
    );
  }

  const priceLabel = listing.price
    ? `${fmt(listing.price)} aura${listing.billing === 'monthly' ? '/mo' : ''}`
    : 'Free';

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        width: 300, maxWidth: '100%',
        padding: 0, borderRadius: 12,
        background: mine ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
        border: `0.5px solid ${mine ? 'rgba(255,255,255,0.25)' : T.glassBorder}`,
        cursor: 'pointer', overflow: 'hidden',
        textAlign: 'left', color: 'inherit', fontFamily: 'inherit',
        transition: 'transform .12s ease, background .12s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        width: 76, minWidth: 76, alignSelf: 'stretch',
        background: cover
          ? `url(${cover}) center/cover`
          : `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
        borderRight: `0.5px solid ${T.glassBorder}`,
      }}/>
      <div style={{
        flex: 1, minWidth: 0,
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
      }}>
        <div style={{
          ...TY.micro,
          color: mine ? 'rgba(255,255,255,0.72)' : T.text3,
          fontSize: 9, letterSpacing: 0.6,
        }}>LISTING</div>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.25,
          color: mine ? '#fff' : T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{listing.title}</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          fontSize: 11,
          color: mine ? 'rgba(255,255,255,0.85)' : T.text2,
        }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {seller ? `by ${seller.name}` : ''}
          </span>
          <span style={{ fontWeight: 600, flexShrink: 0 }}>{priceLabel}</span>
        </div>
      </div>
    </button>
  );
}

// ──── MessagesView — inbox + conversation pane ────
// Two-pane layout: thread list on the left, active conversation on the right.
// Selecting a thread marks it read on the next tick, which clears the sidebar
// pip without flashing an unread state during the render. Composing uses
// Enter-to-send, Shift+Enter for newlines (standard chat expectation).
function MessagesView({ state, setView, messages, threadId, blocks, reports }) {
  if (T.zodiac && window.ZodiacMessagesView) {
    return <window.ZodiacMessagesView state={state} setView={setView} messages={messages} threadId={threadId} blocks={blocks} reports={reports}/>;
  }
  const meId = messages.meId;
  // Hide threads from blocked users. If the viewer is currently on a blocked
  // thread via a stale route, we fall back to the first visible one.
  const list = blocks ? messages.list.filter((t) => !blocks.has(t.otherId)) : messages.list;
  // Prefer the explicit threadId from the router; else the most recent; else
  // the first; else null (empty state).
  const routeOtherId = threadId && messages.threads[threadId]?.otherId;
  const routeBlocked = routeOtherId && blocks && blocks.has(routeOtherId);
  const resolved = threadId && messages.threads[threadId] && !routeBlocked
    ? threadId
    : list[0]?.id || null;
  const active = resolved ? messages.threads[resolved] : null;
  const other = active ? (window.MEMBERS || []).find((m) => m.id === active.otherId) : null;

  React.useEffect(() => {
    if (resolved) messages.markRead(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [resolved, active?.messages?.length]);

  const [draft, setDraft] = React.useState('');
  React.useEffect(() => { setDraft(''); }, [resolved]);
  const submit = () => {
    if (!draft.trim() || !active) return;
    messages.send(active.otherId, draft);
    setDraft('');
  };

  const select = (id) => setView({ id: 'messages', threadId: id });
  const openProfile = (userId) => setView({ id: 'profile', userId });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...TY.micro, color: T.textOnBg3, marginBottom: 8 }}>INBOX</div>
        <h1 style={{ ...TY.h1, margin: 0, color: T.textOnBg }}>Messages<span style={{ color: T.accentHi }}>.</span></h1>
      </div>

      {list.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>💬</div>
          <div style={{ ...TY.body, color: T.text, fontWeight: 500, marginBottom: 6 }}>No conversations yet</div>
          <div style={{ ...TY.small, color: T.text3, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
            DMs are private — start one by opening a creator's profile and hitting <b style={{ color: T.text2 }}>Message</b>, or by sharing a listing card from the marketplace.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button
              onClick={() => setView({ id: 'leaderboard' })}
              style={{
                padding: '9px 18px', borderRadius: T.r.pill, border: 'none',
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: '#fff', cursor: 'pointer',
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
              }}
            >Browse creators</button>
            <button
              onClick={() => setView({ id: 'discover' })}
              style={{
                padding: '9px 18px', borderRadius: T.r.pill,
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text2, cursor: 'pointer',
                fontFamily: T.fontSans, fontWeight: 500, fontSize: 12,
              }}
            >Discover</button>
          </div>
        </Glass>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 320px) 1fr',
          gap: 14, alignItems: 'start',
          minHeight: 520,
        }}>
          {/* ── Thread list ── */}
          <Glass style={{ padding: 6, maxHeight: 640, overflowY: 'auto' }}>
            {list.map((t) => {
              const m = (window.MEMBERS || []).find((x) => x.id === t.otherId);
              if (!m) return null;
              const last = t.messages[t.messages.length - 1];
              const unread = messages.unreadForThread(t);
              const selected = t.id === resolved;
              return (
                <button
                  key={t.id}
                  onClick={() => select(t.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: 10, borderRadius: T.r.sm,
                    background: selected ? 'rgba(61,123,255,0.10)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', gap: 10, alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={m.name} src={m.avatar} size={36}/>
                    {unread > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 16, height: 16, padding: '0 4px',
                        borderRadius: 8, background: T.accentHi,
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #05060A',
                      }}>{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ ...TY.body, color: T.text, fontWeight: unread ? 600 : 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name}
                      </span>
                      {last && <span style={{ ...TY.small, color: T.text3, fontSize: 10, flexShrink: 0 }}>{relativeTime(last.ts)}</span>}
                    </div>
                    <div style={{
                      ...TY.small, fontSize: 11,
                      color: unread ? T.text2 : T.text3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2,
                    }}>
                      {last
                        ? (last.fromId === meId ? 'You: ' : '')
                          + (last.text || (last.attachment?.type === 'listing' ? '📦 Shared a listing' : ''))
                        : 'No messages yet'}
                    </div>
                  </div>
                </button>
              );
            })}
          </Glass>

          {/* ── Conversation pane ── */}
          <Glass style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 520, maxHeight: 640 }}>
            {active && other ? (
              <>
                <div style={{
                  padding: '14px 18px', borderBottom: `0.5px solid ${T.glassBorder}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <button
                    onClick={() => openProfile(other.id)}
                    style={{
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%',
                    }}
                  >
                    <Avatar name={other.name} src={other.avatar} size={38}/>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{other.name}</div>
                    <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>@{other.tag} · {other.role}</div>
                  </div>
                  <button
                    onClick={() => openProfile(other.id)}
                    style={{
                      padding: '6px 12px', borderRadius: T.r.pill,
                      background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder}`,
                      color: T.text2, cursor: 'pointer', fontSize: 11, fontFamily: T.fontSans, fontWeight: 500,
                    }}
                  >View profile</button>
                </div>

                {/* Message list */}
                <div ref={scrollerRef} style={{
                  flex: 1, overflowY: 'auto', padding: '18px 18px 8px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {active.messages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: T.text3 }}>
                      <div style={{ ...TY.body, fontSize: 13 }}>Say hi to {other.name.split(' ')[0]} 👋</div>
                      <div style={{ ...TY.small, fontSize: 11, marginTop: 4 }}>Messages are end-to-end on your machine.</div>
                    </div>
                  ) : (
                    active.messages.map((m, i) => {
                      const mine = m.fromId === meId;
                      const prev = active.messages[i - 1];
                      const grouped = prev && prev.fromId === m.fromId && (m.ts - prev.ts) < 5 * 60_000;
                      return (
                        <div key={m.id} style={{
                          display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
                          marginTop: grouped ? 0 : 8,
                        }}>
                          <div style={{
                            maxWidth: '72%',
                            padding: m.attachment && !m.text ? 0 : '8px 12px',
                            borderRadius: mine
                              ? `14px 14px ${grouped ? 14 : 4}px 14px`
                              : `14px 14px 14px ${grouped ? 14 : 4}px`,
                            background: m.attachment && !m.text
                              ? 'transparent'
                              : (mine
                                  ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`
                                  : 'rgba(255,255,255,0.06)'),
                            color: mine ? '#fff' : T.text,
                            border: m.attachment && !m.text
                              ? 'none'
                              : (mine ? 'none' : `0.5px solid ${T.glassBorder}`),
                            fontSize: 13, lineHeight: 1.45,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            boxShadow: m.attachment && !m.text
                              ? 'none'
                              : (mine ? `0 2px 12px ${T.accent}44` : 'none'),
                            overflow: 'hidden',
                          }}>
                            {m.text}
                            {m.attachment?.type === 'listing' && (
                              <MessageListingCard
                                listingId={m.attachment.id}
                                onOpen={() => setView({ id: 'listing', focusId: m.attachment.id })}
                                mine={mine}
                              />
                            )}
                            <div style={{
                              fontSize: 9.5,
                              marginTop: m.attachment && !m.text ? 6 : 4,
                              padding: m.attachment && !m.text ? '0 2px' : 0,
                              color: mine ? 'rgba(255,255,255,0.72)' : T.text3,
                              textAlign: mine ? 'right' : 'left',
                            }}>{relativeTime(m.ts)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Composer */}
                <div style={{
                  padding: 12, borderTop: `0.5px solid ${T.glassBorder}`,
                  display: 'flex', gap: 8, alignItems: 'flex-end',
                }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                    }}
                    placeholder={`Message ${other.name.split(' ')[0]}…`}
                    rows={1}
                    style={{
                      flex: 1, minHeight: 36, maxHeight: 140, resize: 'none',
                      padding: '9px 12px', borderRadius: T.r.md,
                      background: 'rgba(255,255,255,0.05)',
                      border: `0.5px solid ${T.glassBorder}`,
                      color: T.text, fontFamily: T.fontSans, fontSize: 13, lineHeight: 1.4,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim()}
                    style={{
                      padding: '9px 16px', borderRadius: T.r.pill, border: 'none',
                      background: draft.trim() ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                      color: draft.trim() ? '#fff' : T.text3,
                      cursor: draft.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                      flexShrink: 0,
                    }}
                  >Send</button>
                </div>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: T.text3, padding: 40 }}>
                <div style={{ ...TY.body, fontSize: 13 }}>Select a conversation to start reading.</div>
              </div>
            )}
          </Glass>
        </div>
      )}
    </div>
  );
}

// ──── MembersView — Discord guild directory ────
// Backed by /members. The Discord bot keeps `discord_members` in sync via
// gateway events (guildMemberAdd / Remove / Update); this view just renders
// what's there. New members appear within ~1 minute of joining the server
// (bot pushes; cron worker drains; this view polls every 30s).
//
// Filters: client-side server roundtrip. Sort + search debounce 250ms so
// each keystroke doesn't fire a request. We page in batches of 60.
function MembersView({ state, setView, messages }) {
  if (T.zodiac && window.ZodiacMembersView) {
    return <window.ZodiacMembersView state={state} setView={setView} messages={messages}/>;
  }
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [sort, setSort] = React.useState('joined'); // joined | aura | name | oldest
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const PAGE = 60;

  // Debounce search input so each keystroke doesn't trigger a fetch.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // Reset paging when filter/sort changes.
  React.useEffect(() => { setOffset(0); }, [sort, debouncedSearch]);

  const load = React.useCallback(async (append = false) => {
    setLoading(true);
    try {
      // Prefer the authenticated /members endpoint (supports sort+search+paging).
      // Fall back to window.MEMBERS (kept live by the /me/poll) when the user
      // isn't signed in or the JWT has expired — so the directory still shows
      // real guild data rather than a blank "No members yet" empty state.
      if (window.ElyAPI?.isSignedIn?.()) {
        const params = new URLSearchParams({
          sort, limit: String(PAGE), offset: String(offset),
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        const res = await window.ElyAPI.get(`/members?${params}`);
        setItems((prev) => append ? [...prev, ...(res.items || [])] : (res.items || []));
        setTotal(res.total || 0);
        setError(null);
      } else {
        // Unauthenticated fallback — shape window.MEMBERS to match the /members schema.
        const pool = Array.isArray(window.MEMBERS) ? window.MEMBERS : [];
        let sorted = [...pool];
        if (sort === 'aura') sorted.sort((a, b) => (b.aura || 0) - (a.aura || 0));
        else if (sort === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const filtered = debouncedSearch
          ? sorted.filter((m) => (m.name || '').toLowerCase().startsWith(debouncedSearch.toLowerCase()))
          : sorted;
        setItems(filtered.map((m) => ({
          id: m.id, name: m.name, avatar_url: m.avatar || null,
          aura: m.aura || 0, level: m.level || 0, roles: m.discordRoles || [],
          joined_at: null, last_active_at: null,
        })));
        setTotal(filtered.length);
        setError(null);
      }
    } catch (err) {
      console.warn('[members] load failed:', err.message);
      // On failure, try the local MEMBERS pool rather than going blank.
      const pool = Array.isArray(window.MEMBERS) ? window.MEMBERS : [];
      if (pool.length > 0 && !append) {
        setItems(pool.map((m) => ({
          id: m.id, name: m.name, avatar_url: m.avatar || null,
          aura: m.aura || 0, level: m.level || 0, roles: m.discordRoles || [],
          joined_at: null, last_active_at: null,
        })));
        setTotal(pool.length);
      } else {
        setError(err.message || 'load failed');
      }
    } finally {
      setLoading(false);
    }
  }, [sort, debouncedSearch, offset]);

  React.useEffect(() => { load(offset > 0); }, [load, offset]);

  // Background refresh — picks up new joins / aura changes without
  // needing the user to reload. Suppress while typing.
  React.useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      // Refresh first page only, preserving scroll for paged-in items.
      if (offset === 0) load(false);
    }, 30_000);
    return () => clearInterval(id);
  }, [load, offset]);

  const tabBtn = (id, label) => {
    const active = sort === id;
    return (
      <button
        key={id}
        onClick={() => setSort(id)}
        style={{
          padding: '6px 14px', borderRadius: T.r.pill,
          background: active
            ? `linear-gradient(135deg, ${T.accentHi}33, rgba(255,255,255,0.04))`
            : 'transparent',
          border: active ? `0.5px solid ${T.accentHi}66` : `0.5px solid ${T.glassBorder}`,
          color: active ? T.text : T.text3, cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
          transition: 'all .15s',
        }}
      >{label}</button>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 8 }}>COMMUNITY</div>
          <h1 style={{ ...TY.h1, margin: 0 }}>Members<span style={{ color: T.accentHi }}>.</span></h1>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
            {total > 0 ? `${total.toLocaleString()} ${total === 1 ? 'member' : 'members'}` : 'Discord guild directory'}
            {loading && offset === 0 ? ' · refreshing…' : ''}
          </div>
        </div>
      </div>

      <Glass style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{
            flex: '1 1 220px', minWidth: 200,
            padding: '9px 14px', borderRadius: T.r.pill,
            border: `0.5px solid ${T.glassBorder}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.text, fontFamily: T.fontSans, fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabBtn('joined', 'Newest')}
          {tabBtn('oldest', 'Oldest')}
          {tabBtn('aura', 'Top aura')}
          {tabBtn('name', 'A → Z')}
        </div>
      </Glass>

      {error && (
        <Glass style={{ padding: 18, marginBottom: 14, borderColor: 'rgba(239,107,124,0.4)' }}>
          <div style={{ ...TY.small, color: '#ef6b7c' }}>Couldn't load members: {error}</div>
        </Glass>
      )}

      {items.length === 0 && !loading ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>👥</div>
          <div style={{ ...TY.body, color: T.text, fontWeight: 500, marginBottom: 6 }}>
            {debouncedSearch ? 'No members match' : 'No members yet'}
          </div>
          <div style={{ ...TY.small, color: T.text3, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
            {debouncedSearch
              ? 'Try a different search.'
              : 'The Discord bot will populate this list as members join. Check back in a minute.'}
          </div>
        </Glass>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {items.map((m) => <MemberCard key={m.id} m={m} setView={setView} messages={messages} meId={state?.id || window.ME?.id}/>)}
          </div>
          {items.length < total && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
              <button
                onClick={() => setOffset(offset + PAGE)}
                disabled={loading}
                style={{
                  padding: '10px 24px', borderRadius: T.r.pill,
                  background: 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, cursor: loading ? 'progress' : 'pointer',
                  fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                  opacity: loading ? 0.6 : 1,
                }}
              >{loading ? 'Loading…' : `Load ${Math.min(PAGE, total - items.length)} more`}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberCard({ m, setView, messages, meId }) {
  // Server returns a fully-formed CDN URL (the bot stores it that way via
  // displayAvatarURL). Older clients sent avatar_hash — accept both for
  // forward-compat during rollout.
  const avatar = m.avatar_url
    || (m.avatar_hash ? `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar_hash}.png?size=128` : null);
  // Only show a timestamp when we actually have joined_at from the bot.
  // Falling back to last_active_at would lie ("just now" for everyone the
  // bot just bulk-synced). Better to render nothing and let the user know
  // the data is missing than to display misinformation.
  const joined = (() => {
    if (!m.joined_at) return null;
    const ms = Date.now() - m.joined_at;
    if (ms < 60_000) return 'joined just now';
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `joined ${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `joined ${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `joined ${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `joined ${mo}mo ago`;
    return `joined ${Math.floor(mo / 12)}y ago`;
  })();
  const isMe = meId && m.id === meId;

  return (
    <Glass style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={() => setView({ id: 'profile', userId: m.id })}>
      {avatar ? (
        <img src={avatar} alt={m.name} style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }}/>
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.fontSans, fontWeight: 600, fontSize: 16,
        }}>{(m.name || '?').slice(0, 1).toUpperCase()}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.name}{isMe && <span style={{ ...TY.small, color: T.text3, fontSize: 11, marginLeft: 6 }}>(you)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ ...TY.small, color: T.accentHi, fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {fmt(m.aura || 0)}
          </span>
          <span style={{ ...TY.small, color: T.text3, fontSize: 10 }}>aura</span>
          {joined && (
            <>
              <span style={{ ...TY.small, color: T.text3, fontSize: 10 }}>·</span>
              <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{joined}</span>
            </>
          )}
          {m.level > 0 && (
            <>
              <span style={{ ...TY.small, color: T.text3, fontSize: 10 }}>·</span>
              <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>lvl {m.level}</span>
            </>
          )}
        </div>
      </div>
      {!isMe && messages?.startThread && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const tid = messages.startThread(m.id);
            if (tid) setView({ id: 'messages', threadId: tid });
          }}
          title="Send message"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text2, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
      )}
    </Glass>
  );
}

// ──── FeedView — novelties from creators the user follows ────
// Pulls every listing authored by a followed creator, newest first, and tags
// anything created after the last visit as "new". If the user follows nobody
// yet, we suggest the top creators so the page isn't a dead end. Also marks
// the feed as seen on mount so the sidebar pip clears.
function FeedView({ state, setView, follows, wishlist }) {
  if (T.zodiac && window.ZodiacFeedView) {
    return <window.ZodiacFeedView state={state} setView={setView} follows={follows} wishlist={wishlist}/>;
  }
  // Mark seen on mount so the sidebar "N new" pip clears the instant you
  // land here. We still compute `sinceSeen` off the *captured* seen timestamp
  // so the "New" ribbons stay visible for this render.
  const seenAtMount = React.useRef(follows?.lastSeen || 0).current;
  React.useEffect(() => { follows?.markSeen?.(); /* eslint-disable-next-line */ }, []);

  const allListings = window.LISTINGS || [];
  const followed = follows?.items || [];
  const meId = window.ME?.id || 'me';
  // Feed shows listings from creators you follow + your own published
  // listings (so a creator who just shipped sees their own work in the
  // "what's new" surface — otherwise it looks broken when you publish
  // something and nothing appears here).
  // Dedup tier-alias rows so a tiered product (Hugin 1key + 2key) shows
  // up as a single feed card, not two.
  const followedListings = (window.dedupTieredListings
      ? window.dedupTieredListings(allListings)
      : allListings)
    .filter((l) => followed.includes(l.sellerId) || l.sellerId === meId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const newCount = followedListings.filter((l) => (l.createdAt || 0) > seenAtMount).length;

  // Empty state — either no follows at all, or following creators with no
  // listings yet. Either way we surface top creators as a nudge.
  if (!followed.length) {
    const topCreators = (window.MEMBERS || [])
      .map((m) => ({ ...m, stats: getCreatorStats(m.id) }))
      .filter((m) => m.stats.listings > 0)
      .sort((a, b) => b.stats.sales - a.stats.sales)
      .slice(0, 4);
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ ...TY.h1, margin: 0 }}>Feed</h1>
          <div style={{ ...TY.small, color: T.text3, marginTop: 4 }}>New listings from creators you follow.</div>
        </div>
        <Glass style={{ padding: 40, textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>📡</div>
          <div style={{ ...TY.h3, margin: 0 }}>You're not following anyone yet</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 8, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Follow a creator and any new listing they publish shows up here. Start with the ones below, or head to the marketplace.
          </div>
        </Glass>
        {topCreators.length > 0 && (
          <>
            <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>SUGGESTED CREATORS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {topCreators.map((m) => (
                <Glass key={m.id} style={{ padding: 16, cursor: 'pointer' }} onClick={() => setView({ id: 'profile', userId: m.id })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={m.name} src={m.avatar} size={44}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TY.body, color: T.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ ...TY.small, fontSize: 11, color: T.text3 }}>{m.stats.listings} listings · {fmt(m.stats.sales)} sold</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <FollowButton
                      followed={follows.has(m.id)}
                      onToggle={() => {
                        const wasFollowing = follows.has(m.id);
                        follows.toggle(m.id);
                        try {
                          ElyNotify?.toast?.({
                            text: wasFollowing ? `Unfollowed ${m.name.split(' ')[0]}` : `Following ${m.name.split(' ')[0]}`,
                            kind: wasFollowing ? 'info' : 'success',
                          });
                        } catch {}
                      }}
                      size="sm"
                    />
                  </div>
                </Glass>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Group listings by creator for the "From ___" headers. Keeps the page
  // readable when one creator drops multiple items at once.
  const byCreator = new Map();
  for (const l of followedListings) {
    if (!byCreator.has(l.sellerId)) byCreator.set(l.sellerId, []);
    byCreator.get(l.sellerId).push(l);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ ...TY.h1, margin: 0 }}>Feed</h1>
          <div style={{ ...TY.small, color: T.text3, marginTop: 4 }}>
            {(() => {
              // Count distinct sellers actually represented in the feed
              // (followed creators + you, when you have your own listings).
              const distinct = new Set(followedListings.map((l) => l.sellerId)).size;
              return `${distinct} ${distinct === 1 ? 'creator' : 'creators'}`;
            })()} · {followedListings.length} {followedListings.length === 1 ? 'listing' : 'listings'}
            {newCount > 0 && <> · <span style={{ color: T.accentHi, fontWeight: 600 }}>{newCount} new since last visit</span></>}
          </div>
        </div>
        <button
          onClick={() => setView({ id: 'store' })}
          style={{
            padding: '8px 14px', borderRadius: T.r.pill,
            background: 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text2, cursor: 'pointer',
            fontFamily: T.fontSans, fontWeight: 500, fontSize: 12,
          }}
        >
          Find more creators
        </button>
      </div>

      {followedListings.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>No listings yet from the creators you follow.</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>New publishes will show up here automatically.</div>
        </Glass>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {[...byCreator.entries()].map(([sellerId, items]) => {
            const m = (window.MEMBERS || []).find((x) => x.id === sellerId);
            if (!m) return null;
            return (
              <div key={sellerId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <button
                    onClick={() => setView({ id: 'profile', userId: m.id })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    <Avatar name={m.name} src={m.avatar} size={30}/>
                    <span style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{m.name}</span>
                  </button>
                  <span style={{ ...TY.small, color: T.text3 }}>· {items.length} {items.length === 1 ? 'listing' : 'listings'}</span>
                  <div style={{ flex: 1 }}/>
                  <FollowButton
                    followed={follows.has(m.id)}
                    onToggle={() => {
                      follows.toggle(m.id);
                      try { ElyNotify?.toast?.({ text: `Unfollowed ${m.name.split(' ')[0]}`, kind: 'info' }); } catch {}
                    }}
                    size="sm"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {items.map((l, i) => (
                    <div key={l.id} style={{ position: 'relative' }}>
                      <ListingCard
                        l={l}
                        state={state}
                        index={i}
                        onOpen={() => setView({ id: 'listing', focusId: l.id })}
                        onSeller={() => setView({ id: 'profile', userId: m.id })}
                        wishlist={wishlist}
                      />
                      {(l.createdAt || 0) > seenAtMount && (
                        <span
                          title="New since your last visit"
                          style={{
                            position: 'absolute', top: -6, left: -6, zIndex: 3,
                            padding: '3px 8px', borderRadius: T.r.pill,
                            background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                            color: '#fff',
                            fontFamily: T.fontSans, fontWeight: 700, fontSize: 9,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            boxShadow: `0 2px 10px ${T.accent}88`,
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──── MyLibraryView — everything the user owns / subscribes to ────
//
// Auto-update integration: we fetch /me/library once on mount to get the
// current_version per listing (sourced from GitHub Releases via the cron
// poller). Compared against localStorage `elyhub:installed:<listing_id>`
// to decide whether to show the Update button. installed_version updates
// whenever the user clicks Update or Download (treating download-as-install).
const installedKey = (lid) => `elyhub:installed:${lid}`;
function getInstalled(lid) { try { return localStorage.getItem(installedKey(lid)) || null; } catch { return null; } }
function setInstalled(lid, ver) { try { if (ver) localStorage.setItem(installedKey(lid), ver); } catch {} }

function MyLibraryView({ state, setView, library, purchaseListing }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacMyLibraryView) {
    return <window.ZodiacMyLibraryView state={state} setView={setView} library={library} purchaseListing={purchaseListing}/>;
  }
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

  // releases: { [listing_id]: { version, url, published_at } }
  const [releases, setReleases] = React.useState({});
  React.useEffect(() => {
    if (!window.ElyAPI?.isSignedIn?.()) return;
    let cancelled = false;
    window.ElyAPI.get('/me/library').then((res) => {
      if (cancelled) return;
      const map = {};
      for (const it of res?.items || []) {
        if (it.current_version) {
          map[it.listing_id] = {
            version: it.current_version,
            url: it.current_version_url,
            published_at: it.current_version_published_at,
          };
        }
      }
      setReleases(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const rawRows = library.items
    .map((it) => ({ entry: it, listing: (window.LISTINGS || []).find((l) => l.id === it.listingId) }))
    .filter((r) => r.listing);

  // Dedup tiered Kassa products: when the user owns multiple tiers of the
  // same product (e.g. Hugin 1key + 2key), they share kassa_product_id.
  // Pick the entry with the most-current status so the card reflects what
  // the user can actually use (active beats cancelled beats expired). Ties
  // break on higher price.
  const statusRank = (e) => {
    if (!e) return 0;
    const valid = !e.expiresAt || e.expiresAt > Date.now();
    if (e.status === 'active' && valid) return 3;
    if (e.status === 'cancelled' && valid) return 2;
    if (e.status === 'active' || e.status === 'cancelled') return 1; // expired implicitly
    return 0;
  };
  const dedupMap = new Map();
  for (const r of rawRows) {
    const kpid = r.listing.kassa_product_id || r.listing.kassaProductId;
    if (!kpid) { dedupMap.set(`id:${r.listing.id}`, r); continue; }
    const k = `kpid:${kpid}`;
    const prev = dedupMap.get(k);
    if (!prev) { dedupMap.set(k, r); continue; }
    const a = statusRank(r.entry);
    const b = statusRank(prev.entry);
    if (a > b || (a === b && (r.listing.price || 0) > (prev.listing.price || 0))) {
      dedupMap.set(k, r);
    }
  }
  const rows = [...dedupMap.values()];

  // Active sorted by soonest expiry first (one-time items — no expiry — sink
  // to the bottom of their group).
  const active = rows
    .filter((r) => r.entry.status === 'active')
    .sort((a, b) => (a.entry.expiresAt || Infinity) - (b.entry.expiresAt || Infinity));
  const inactive = rows.filter((r) => r.entry.status !== 'active');

  // Per-listing pending state so only the clicked Renew button shows a spinner.
  const [renewing, setRenewing] = React.useState(null); // listingId or null
  const renew = (listing) => {
    if (renewing) return;
    setRenewing(listing.id);
    setTimeout(() => {
      const res = purchaseListing(listing);
      setRenewing(null);
      if (!res.ok) {
        try { ElyNotify?.toast?.({ text: 'Not enough aura to renew', kind: 'warn' }); } catch {}
      } else {
        try { ElyNotify?.toast?.({ text: `${listing.title} renewed`, kind: 'success' }); } catch {}
      }
    }, 380);
  };
  const cancelSub = (listing) => {
    library.cancel(listing.id);
    try { ElyNotify?.toast?.({ text: `${listing.title} cancelled — access until expiry`, kind: 'info' }); } catch {}
  };

  // Download the pack asset for an owned listing. Flow:
  //   1. GET /listings/:id  →  assets[] includes the pack row (if any)
  //   2. GET /downloads/:asset_id/url  →  short-TTL presigned R2 URL
  //   3. window.open(url)  →  browser follows, R2 streams the file
  // Per-listing pending flag so only the clicked button spins.
  const [downloading, setDownloading] = React.useState(null);
  const downloadPack = async (listing) => {
    if (downloading) return;
    if (!window.ElyAPI?.get) {
      try { ElyNotify?.toast?.({ text: 'API not ready yet', kind: 'warn' }); } catch {}
      return;
    }
    setDownloading(listing.id);
    try {
      const detail = await window.ElyAPI.get(`/listings/${listing.id}`);
      // GitHub-backed listings (auto-update via Releases): proxy the download
      // through the Worker. The release-asset URL itself can't be fetched
      // directly from the client because (a) private repos require an
      // Authorization header, (b) public repos redirect to S3 with no CORS.
      // The Worker has the listing's github_token, auths the request, and
      // streams the bytes back over a same-origin connection.
      const ghUrl = detail?.current_version_url || listing.current_version_url;
      if (ghUrl) {
        const base = window.ELYHUB_CONFIG?.apiUrl || '';
        const token = window.ElyAPI?.getToken?.();
        const proxyUrl = `${base}/listings/${encodeURIComponent(listing.id)}/release/download`;
        // Server bundles every release asset into one zip — name it after the
        // listing + version, not after the first asset URL (which is just one
        // of the inner files).
        const safeTitle = (listing.title || 'plugin').replace(/[^\w.-]+/g, '_');
        const ver = detail?.current_version || listing.current_version || '';
        const filename = `${safeTitle}${ver ? `_${ver}` : ''}.zip`;
        window.ElyDownloads?.start?.({
          listingId: listing.id,
          version: detail?.current_version || null,
          title: `${listing.title}${detail?.current_version ? ` ${detail.current_version}` : ''}`,
          url: proxyUrl,
          filename,
          // DownloadManager passes this through to fetch() so the Worker can
          // verify entitlement (user_library row) before streaming.
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return;
      }
      const pack = (detail?.assets || []).find((a) => a.kind === 'pack');
      if (!pack) {
        try { ElyNotify?.toast?.({ text: 'This listing has no pack file yet', kind: 'warn' }); } catch {}
        return;
      }
      const signed = await window.ElyAPI.get(`/downloads/${pack.id}/url`);
      if (!signed?.url) {
        try { ElyNotify?.toast?.({ text: 'Could not get download URL', kind: 'warn' }); } catch {}
        return;
      }
      // Hand off to the global DownloadManager — it streams the bytes (so we
      // can show real progress) and then triggers the native Save dialog.
      // Returning immediately unblocks the button; the progress UI lives in
      // the DownloadStack regardless of which view is on screen.
      window.ElyDownloads?.start?.({
        listingId: listing.id,
        title: listing.title,
        url: signed.url,
        filename: pack.filename || 'pack.bin',
      });
    } catch (err) {
      console.warn('[library] download failed:', err);
      try { ElyNotify?.toast?.({ text: `Download failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
    } finally {
      setDownloading(null);
    }
  };

  // Tiny iOS-style switch. Controlled, flips on click.
  const Toggle = ({ on, onChange, color = T.accent }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{
        width: 34, height: 20, borderRadius: 10, border: 'none',
        background: on ? `linear-gradient(135deg, ${T.accentHi}, ${color})` : 'rgba(255,255,255,0.10)',
        position: 'relative', cursor: 'pointer',
        boxShadow: on ? `0 0 10px ${color}66, inset 0 1px 0 rgba(255,255,255,0.2)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'background .18s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        transition: 'left .18s',
      }}/>
    </button>
  );

  const Row = ({ r }) => {
    const { listing, entry } = r;
    const meta = listingTypeMeta(listing.type);
    const act = entry.status === 'active' && (!entry.expiresAt || entry.expiresAt > Date.now());
    const isSub = entry.type === 'subscription';
    const expLbl = entry.expiresAt ? expiryLabel(entry.expiresAt) : '';
    const warn = act && entry.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;
    const autoRenew = entry.autoRenew !== false; // default true for legacy entries
    const canAfford = state.aura >= listing.price;
    // Release/update — populated from /me/library fetch above.
    const release = releases[listing.id];
    const installed = getInstalled(listing.id);
    const updateAvailable = act && release?.version && release.version !== installed;
    const installAvailable = act && release?.version && !installed; // first-time download
    const [updating, setUpdating] = React.useState(false);
    const applyUpdate = async (e) => {
      e.stopPropagation();
      if (!release?.url) {
        try { ElyNotify?.toast?.({ text: 'No release asset available yet', kind: 'warn' }); } catch {}
        return;
      }
      setUpdating(true);
      try {
        // Hand off to global DownloadManager — same pipeline as Download. We
        // pass through to GitHub's CDN (release asset URL is already public
        // for public repos; private-repo support would need an API mirror).
        window.ElyDownloads?.start?.({
          title: `${listing.title} ${release.version}`,
          url: release.url,
          filename: `${listing.id}-${release.version}.zip`,
        });
        setInstalled(listing.id, release.version);
        try { ElyNotify?.toast?.({ text: `${listing.title} updated to ${release.version}`, kind: 'success' }); } catch {}
        force();
      } catch (err) {
        try { ElyNotify?.toast?.({ text: `Update failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
      } finally { setUpdating(false); }
    };

    const openPrimary = () => {
      if (listing.type === 'plugin' && act) setView({ id: `plugin:${listing.id}` });
      else setView({ id: 'listing', focusId: listing.id });
    };

    return (
      <Glass hover onClick={openPrimary} style={{
        padding: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
      }}>
        {/* Left accent bar when expiring soon. Purely decorative, but pulls the
            eye to rows that need attention. */}
        {warn && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#f5c451', boxShadow: `0 0 12px #f5c45199` }}/>}
        <div style={{
          width: 44, height: 44, borderRadius: T.r.md, flexShrink: 0,
          background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.04))`,
          border: `0.5px solid ${meta.hue}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.hue,
        }}>
          <ListingTypeIcon type={listing.type} size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TY.body, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.title}
          </div>
          <div style={{ ...TY.small, color: T.text3, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: act ? (warn ? '#f5c451' : T.text3) : '#ef6b7c' }}>
              {act ? (isSub ? expLbl : 'Owned') : (entry.status === 'expired' ? 'Expired' : entry.status === 'cancelled' ? 'Cancelled' : 'Inactive')}
            </span>
            {isSub && act && autoRenew && (
              <>
                <span style={{ color: T.text3 }}>·</span>
                <span style={{ color: canAfford ? T.text3 : '#ef6b7c' }}>
                  Renews {fmt(listing.price)} aura{!canAfford && ' · not enough aura'}
                </span>
              </>
            )}
            {isSub && act && !autoRenew && (
              <>
                <span style={{ color: T.text3 }}>·</span>
                <span style={{ color: '#f5c451' }}>Auto-renew off</span>
              </>
            )}
            {/* Version badge — installed when up-to-date, "Update X.Y.Z" when behind. */}
            {release?.version && installed && !updateAvailable && (
              <>
                <span style={{ color: T.text3 }}>·</span>
                <span style={{ color: T.text3, fontFamily: T.fontMono, fontSize: 11 }}>{installed}</span>
              </>
            )}
            {updateAvailable && (
              <>
                <span style={{ color: T.text3 }}>·</span>
                <span style={{
                  color: '#f5c451', fontFamily: T.fontMono, fontSize: 11, fontWeight: 600,
                }}>
                  Update → {release.version}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Update / Install button. Shown when there's a release available
            and the user either hasn't installed yet or is on an older version. */}
        {(updateAvailable || installAvailable) && !listing.id.startsWith('user-') && (
          <div onClick={(e) => e.stopPropagation()}>
            <button
              onClick={applyUpdate}
              disabled={updating}
              style={{
                padding: '6px 14px', borderRadius: T.r.pill, border: 'none',
                background: updateAvailable
                  ? `linear-gradient(135deg, #f5c451, #f59e0b)`
                  : `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: '#fff',
                cursor: updating ? 'progress' : 'pointer',
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                opacity: updating ? 0.85 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: updateAvailable ? `0 2px 10px #f5c45166` : `0 2px 10px ${T.accent}55`,
              }}
              title={updateAvailable ? `Update to ${release.version}` : `Install ${release.version}`}
            >
              {updating ? <Spinner size={11} color="#fff"/> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/>
                </svg>
              )}
              {updating ? 'Updating…' : updateAvailable ? `Update ${release.version}` : `Install ${release.version}`}
            </button>
          </div>
        )}
        {/* Download button — shown for any active owned listing (both one-time
            and subs). The endpoint itself enforces ownership; this button just
            makes the common case one-click. Backend-hosted listings only —
            we check the id shape as a proxy for "exists in DB" (user-…
            listings are local-only and have no pack asset). */}
        {act && !listing.id.startsWith('user-') && (
          <div onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => downloadPack(listing)}
              disabled={downloading === listing.id}
              style={{
                padding: '6px 14px', borderRadius: T.r.pill, border: 'none',
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: '#fff',
                cursor: downloading === listing.id ? 'progress' : 'pointer',
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                opacity: downloading === listing.id ? 0.85 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: `0 2px 10px ${T.accent}55`,
              }}
              title="Download pack"
            >
              {downloading === listing.id ? <Spinner size={11} color="#fff"/> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {downloading === listing.id ? 'Getting link…' : 'Download'}
            </button>
          </div>
        )}
        {isSub && act && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={autoRenew ? 'Auto-renew is on' : 'Auto-renew is off'}>
              <span style={{ ...TY.small, fontSize: 11, color: T.text3 }}>Auto</span>
              <Toggle on={autoRenew} onChange={(v) => library.setAutoRenew(listing.id, v)}/>
            </div>
            <button onClick={() => cancelSub(listing)} style={{
              padding: '6px 12px', borderRadius: T.r.pill,
              border: `0.5px solid ${T.glassBorder}`, background: 'rgba(255,255,255,0.04)',
              color: T.text3, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
            }}>Cancel</button>
          </div>
        )}
        {isSub && !act && (
          <div onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => renew(listing)}
              disabled={!canAfford || renewing === listing.id}
              style={{
                padding: '6px 14px', borderRadius: T.r.pill, border: 'none',
                background: canAfford ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                color: canAfford ? '#fff' : T.text3,
                cursor: renewing === listing.id ? 'progress' : canAfford ? 'pointer' : 'not-allowed',
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                opacity: renewing === listing.id ? 0.85 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {renewing === listing.id && <Spinner size={11} color="#fff"/>}
              {renewing === listing.id ? 'Renewing…' : 'Renew'}
            </button>
          </div>
        )}
      </Glass>
    );
  };

  // Group rows by listing type, preserving the canonical LISTING_TYPES order
  // so plugins always come before themes, etc.
  const groupByType = (list) => {
    const order = (window.LISTING_TYPES || []).map((t) => t.id);
    const buckets = {};
    for (const r of list) {
      const t = r.listing.type;
      (buckets[t] = buckets[t] || []).push(r);
    }
    return order
      .filter((t) => buckets[t]?.length)
      .map((t) => ({ type: t, meta: listingTypeMeta(t), rows: buckets[t] }));
  };
  const activeGroups = groupByType(active);

  return (
    <div>
      <button onClick={() => setView({ id: 'store' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        ...TY.small, color: T.textOnBg2, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
      }}>← Marketplace</button>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ ...TY.h1, margin: 0, color: T.textOnBg }}>My Library</h1>
        <div style={{ ...TY.body, color: T.textOnBg2, marginTop: 4 }}>
          Everything you've picked up from the marketplace.
        </div>
      </div>

      {rows.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2, marginBottom: 14 }}>
            Nothing here yet. Go grab your first plugin, theme, or pack.
          </div>
          <button
            onClick={() => setView({ id: 'store' })}
            style={{
              padding: '10px 20px', borderRadius: T.r.pill, border: 'none',
              background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
              color: '#fff', cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 600, fontSize: 13,
            }}
          >Open marketplace</button>
        </Glass>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ ...TY.micro, color: T.textOnBg3, marginBottom: 10 }}>ACTIVE · {active.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {activeGroups.map((g) => (
                  <div key={g.type}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                      <span style={{ color: g.meta.hue, display: 'inline-flex' }}><ListingTypeIcon type={g.type} size={12}/></span>
                      <span style={{ ...TY.micro, color: T.textOnBg3 }}>{g.meta.label.toUpperCase()}</span>
                      <span style={{ ...TY.small, fontSize: 11, color: T.textOnBg3 }}>· {g.rows.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {g.rows.map((r) => <Row key={r.entry.listingId} r={r}/>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <div style={{ ...TY.micro, color: T.textOnBg3, marginBottom: 10 }}>EXPIRED / CANCELLED · {inactive.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inactive.map((r) => <Row key={r.entry.listingId} r={r}/>)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function useTweaks() {
  // Migrate legacy preset names so saved users don't break.
  const THEME_ALIAS = { blue: 'nocturne' };
  const saved = loadThemeState();
  const initialTheme = saved?.theme
    ? (THEME_PRESETS[saved.theme] || saved.theme === 'custom' ? saved.theme : THEME_ALIAS[saved.theme] || 'nocturne')
    : (THEME_ALIAS[TWEAK_DEFAULTS?.theme] || TWEAK_DEFAULTS?.theme || 'nocturne');
  const initialSlots = Array.isArray(saved?.customSlots) && saved.customSlots.length
    ? saved.customSlots
    : [makeDefaultCustom()];
  const initialActive = saved?.activeCustomId && initialSlots.find((s) => s.id === saved.activeCustomId)
    ? saved.activeCustomId
    : initialSlots[0].id;

  const [tweaks, setTweaks] = React.useState({
    theme: initialTheme,
    customSlots: initialSlots,
    activeCustomId: initialActive,
    // Convenience pointer — resolved on the fly but cached here too.
    custom: initialSlots.find((s) => s.id === initialActive) || initialSlots[0],
    // Per-wallpaper-preset overrides (opacity, blur). { [presetKey]: { bgOpacity, bgBlur } }
    presetOverrides: saved?.presetOverrides && typeof saved.presetOverrides === 'object' ? saved.presetOverrides : {},
  });
  const [open, setOpen] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  const apply = (next) => {
    const r = resolveTheme(next);
    applyResolvedTheme(r);
    force();
  };

  const persist = (next) => {
    saveThemeState({
      theme: next.theme,
      customSlots: next.customSlots,
      activeCustomId: next.activeCustomId,
      presetOverrides: next.presetOverrides || {},
    });
  };

  // Expose a global previewTheme(key) so the Hugin preview button can flip
  // tokens without persisting. We pass the SAME tweaks object with just the
  // theme overridden, and skip persistence so the user's saved theme stays.
  // When the theme apply was deferred (zodiac transition curtain), the T
  // tokens flip mid-ceremony — force a re-render so the new tokens land in
  // the React tree without waiting for the next state change.
  React.useEffect(() => {
    const onDeferred = () => force();
    window.addEventListener('ely:theme-deferred-applied', onDeferred);
    return () => window.removeEventListener('ely:theme-deferred-applied', onDeferred);
  }, []);

  React.useEffect(() => {
    // previewTheme(key) — silent flip (hover preview). previewTheme(key,
    // { ceremony: true }) — full transition overlay (route-driven swap when
    // entering Hugin etc.). Neither persists; the user's saved theme stays
    // in tweaks state + localStorage.
    window.previewTheme = (key, opts) => {
      const ceremony = !!(opts && opts.ceremony);
      if (!ceremony) {
        try { T.__skipNextTransition = true; } catch {}
      }
      const next = { ...tweaks, theme: key };
      apply(next);
      // Update React-state-backed AmbientBG/Shell so they re-render with the
      // new resolved theme. With ceremony, defer so the swap lands while the
      // curtain is fully covering. Without ceremony (hover preview), do it
      // immediately for snappy feedback.
      const flipState = () => { try { window.__setTransientTheme?.(key); } catch {} };
      // Match the applyResolvedTheme deferred-apply timing — both fire at
      // 800ms so AmbientBG/Shell + T tokens swap together at full curtain.
      if (ceremony) setTimeout(flipState, 800);
      else flipState();
    };
    // Expose the persisted theme so route-watchers can know what to revert to.
    window.savedThemeKey = tweaks.theme;
    return () => {
      try { delete window.previewTheme; } catch {}
      try { delete window.savedThemeKey; } catch {}
    };
  }, [tweaks]);

  React.useEffect(() => {
    const h = (e) => {
      if (e.data?.type === '__activate_edit_mode') setOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    apply(tweaks);
    return () => window.removeEventListener('message', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate listener for bg-sample completion. Reads tweaks via ref so we
  // don't need it in deps (keeps the main mount effect pristine).
  const tweaksRef = React.useRef(tweaks);
  React.useEffect(() => { tweaksRef.current = tweaks; }, [tweaks]);
  React.useEffect(() => {
    const onSampled = () => apply(tweaksRef.current);
    window.addEventListener('ely:bg-sampled', onSampled);
    return () => window.removeEventListener('ely:bg-sampled', onSampled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tweak = (k, v) => {
    setTweaks((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'theme') {
        // When switching preset vs custom, refresh the `custom` snapshot.
        if (v === 'custom') {
          next.custom = next.customSlots.find((s) => s.id === next.activeCustomId) || next.customSlots[0];
        }
        apply(next);
        persist(next);
      }
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  // Patch a single field on the currently active custom slot. Used by the
  // editor for every keystroke/drag/etc.
  const updateCustom = (patch) => {
    setTweaks((prev) => {
      const idx = prev.customSlots.findIndex((s) => s.id === prev.activeCustomId);
      if (idx < 0) return prev;
      const updated = { ...prev.customSlots[idx], ...patch };
      const customSlots = prev.customSlots.slice();
      customSlots[idx] = updated;
      const next = { ...prev, customSlots, custom: updated };
      if (prev.theme === 'custom') apply(next);
      persist(next);
      return next;
    });
  };

  // Swap which custom slot is active.
  const selectCustom = (id) => {
    setTweaks((prev) => {
      const hit = prev.customSlots.find((s) => s.id === id);
      if (!hit) return prev;
      const next = { ...prev, activeCustomId: id, custom: hit, theme: 'custom' };
      apply(next);
      persist(next);
      return next;
    });
  };

  // Create a new custom slot (duplicated from the active one or a preset).
  const addCustomSlot = (name, seed) => {
    setTweaks((prev) => {
      const base = seed || prev.customSlots.find((s) => s.id === prev.activeCustomId) || makeDefaultCustom();
      const slot = {
        ...base,
        id: 'c' + Date.now().toString(36),
        name: name || `Theme ${prev.customSlots.length + 1}`,
        points: base.points.map((p) => ({ ...p })),
      };
      const customSlots = [...prev.customSlots, slot];
      const next = { ...prev, customSlots, activeCustomId: slot.id, custom: slot, theme: 'custom' };
      apply(next);
      persist(next);
      return next;
    });
  };

  const deleteCustomSlot = (id) => {
    setTweaks((prev) => {
      if (prev.customSlots.length <= 1) return prev; // keep at least one
      const customSlots = prev.customSlots.filter((s) => s.id !== id);
      const activeCustomId = prev.activeCustomId === id ? customSlots[0].id : prev.activeCustomId;
      const custom = customSlots.find((s) => s.id === activeCustomId);
      const next = { ...prev, customSlots, activeCustomId, custom };
      if (prev.theme === 'custom') apply(next);
      persist(next);
      return next;
    });
  };

  // Patch opacity/blur on a wallpaper preset without converting it to custom.
  const updatePresetOverride = (presetKey, patch) => {
    setTweaks((prev) => {
      const current = prev.presetOverrides?.[presetKey] || {};
      const presetOverrides = { ...(prev.presetOverrides || {}), [presetKey]: { ...current, ...patch } };
      const next = { ...prev, presetOverrides };
      apply(next);
      persist(next);
      return next;
    });
  };

  // Transient theme override — used by previewTheme() so the AmbientBG /
  // Shell render in the previewed theme without overwriting the user's
  // saved choice. Null means "use tweaks.theme as normal".
  const [transientTheme, setTransientTheme] = React.useState(null);
  // Clear the transient whenever the user explicitly changes their saved
  // theme (Settings → Appearance). Without this, an old transient set by a
  // previous Hugin route revert ('blue') would override the new save.
  React.useEffect(() => { setTransientTheme(null); }, [tweaks.theme]);
  const effectiveTweaks = transientTheme ? { ...tweaks, theme: transientTheme } : tweaks;
  const resolved = resolveTheme(effectiveTweaks);
  React.useEffect(() => {
    window.__setTransientTheme = setTransientTheme;
    return () => { try { delete window.__setTransientTheme; } catch {} };
  }, []);
  return { tweaks, tweak, open, setOpen, resolved, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride };
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

// ────────────── Welcome ──────────────
// One-time modal shown when a Discord user signs in for the first time on this
// install. Greets by name, shows their current stats, explains what they can
// do, and gently prompts for notification permission. Persistence is per-user
// id so multiple Discord accounts on the same machine each get welcomed once.
const WELCOMED_PREFIX = 'ely:welcomed:';

function wasWelcomed(userId) {
  if (!userId) return true; // don't show anything without an id
  try { return !!localStorage.getItem(WELCOMED_PREFIX + userId); }
  catch { return true; }
}

function markWelcomed(userId) {
  if (!userId) return;
  try { localStorage.setItem(WELCOMED_PREFIX + userId, String(Date.now())); } catch {}
}

function WelcomeModal({ me, onClose }) {
  if (T.zodiac && window.ZodiacWelcomeModal) {
    return <window.ZodiacWelcomeModal me={me} onClose={onClose}/>;
  }
  const [enablingPush, setEnablingPush] = React.useState(false);
  const [pushState, setPushState] = React.useState(null); // 'granted' | 'denied' | 'default' | null

  const firstName = (me?.name || 'there').split(' ')[0];

  async function enablePush() {
    if (enablingPush) return;
    setEnablingPush(true);
    try {
      const state = await window.ElyNotify?.requestPermission?.();
      setPushState(state || 'default');
      if (state === 'granted') {
        window.ElyNotify?.setPref?.('push', true);
      }
    } finally {
      setEnablingPush(false);
    }
  }

  function finish() {
    markWelcomed(me?.id);
    onClose();
  }

  // Esc closes (and marks welcomed, so it doesn't reappear next render).
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Step = ({ icon, title, body }) => (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: `0.5px solid ${T.glassBorder}` }}>
      <div style={{
        width: 36, height: 36, borderRadius: T.r.sm, flexShrink: 0,
        background: `linear-gradient(135deg, ${T.accent}33, rgba(255,255,255,0.04))`,
        border: `0.5px solid ${T.glassBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.accentHi,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{title}</div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{body}</div>
      </div>
    </div>
  );

  return (
    <Modal onClose={finish} width={480}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
          background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 48px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          overflow: 'hidden',
        }}>
          {me?.avatar
            ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <ISparkle size={26} color="#fff"/>}
        </div>
        <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>{t('welcome.kicker')}</div>
        <h2 style={{ ...TY.h2, margin: 0 }}>{t('welcome.hi').replace('{name}', firstName)}</h2>
        <p style={{ ...TY.body, color: T.text2, marginTop: 8 }}>{t('welcome.blurb')}</p>
      </div>

      {/* Live stats — only show if they're non-zero, otherwise the newcomer
          sees "rank #null, 0 aura" which feels discouraging. */}
      {(me?.aura > 0 || me?.level > 0) && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          padding: '14px 4px', marginBottom: 10,
          borderTop: `0.5px solid ${T.glassBorder}`,
          borderBottom: `0.5px solid ${T.glassBorder}`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...TY.numMed, color: T.accentHi, fontSize: 22 }}>{fmt(me.aura || 0)}</div>
            <div style={{ ...TY.micro, color: T.text3 }}>{t('home.aura')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...TY.numMed, fontSize: 22 }}>L{me.level || 0}</div>
            <div style={{ ...TY.micro, color: T.text3 }}>{t('welcome.level')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...TY.numMed, fontSize: 22 }}>{me.rank ? `#${me.rank}` : '—'}</div>
            <div style={{ ...TY.micro, color: T.text3 }}>{t('welcome.rank')}</div>
          </div>
        </div>
      )}

      <div style={{ margin: '10px 0' }}>
        <Step icon={<IGift size={16}/>} title={t('welcome.s1Title')} body={t('welcome.s1Body')}/>
        <Step icon={<IStore size={16}/>} title={t('welcome.s2Title')} body={t('welcome.s2Body')}/>
        <Step icon={<ITrophy size={16}/>} title={t('welcome.s3Title')} body={t('welcome.s3Body')}/>
      </div>

      {/* Notification permission nudge. Only surface the button when the user
          hasn't already answered — if we already have granted/denied, skip the
          row entirely to keep the modal tight. */}
      {pushState !== 'granted' && pushState !== 'denied' && (
        <div style={{
          padding: 14, borderRadius: T.r.md, marginTop: 14,
          background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{t('welcome.notifTitle')}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{t('welcome.notifBody')}</div>
          </div>
          <Btn variant="secondary" size="sm" disabled={enablingPush} onClick={enablePush}>
            {enablingPush ? '…' : t('welcome.enable')}
          </Btn>
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <Btn variant="primary" full size="lg" onClick={finish}>{t('welcome.start')}</Btn>
      </div>
    </Modal>
  );
}

// Expose MessageListingCard so the Zodiac MessagesView can render listing
// attachments without re-implementing the lookup + cover image logic.
Object.assign(window, { MessageListingCard });
