// dist/zodiac/views2.jsx — second batch of Zodiac variants.
// Same pattern as views.jsx: each component is gated by T.zodiac at the
// host site, consumes real data from window.*, and styles with Z palette.

// ─── Toast Stack (zodiac variant) ───
function ZodiacToastStack({ toasts }) {
  const Z = window.Z, ZTY = window.ZTY;
  if (!toasts.length) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 20, right: 20, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const accent =
          t.kind === 'claim'   ? Z.good :
          t.kind === 'gift'    ? Z.gold :
          t.kind === 'levelup' ? Z.goldHi :
          t.kind === 'rank'    ? Z.gold :
          t.kind === 'drop'    ? Z.copper :
          t.kind === 'warn'    ? Z.bad :
          Z.gold;
        return (
          <div key={t.id} style={{
            position: 'relative', overflow: 'hidden',
            padding: '12px 18px',
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 18px ${accent}33`,
            minWidth: 280, maxWidth: 360,
            animation: 'slideInR .25s cubic-bezier(.2,.9,.3,1.15)',
            pointerEvents: 'auto',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
              background: accent, boxShadow: `0 0 10px ${accent}`,
            }}/>
            <div style={{ ...ZTY.body, color: Z.parch, fontSize: 14, fontStyle: 'italic', marginBottom: 2 }}>
              {t.title}
            </div>
            {t.body && (
              <div style={{ ...ZTY.small, color: Z.text2, fontSize: 12, fontStyle: 'italic' }}>
                {t.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Hugin (Zephyro) page ───
function ZodiacZephyroView({ state, setView, library, purchaseListing }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const listings = window.LISTINGS || [];
  const tiers = listings
    .filter((x) => (x.kassa_product_id || x.kassaProductId) === 'gleipnir')
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  const fallback = listings.find((x) => x.id === 'l-zephyro');
  const ownedEntry = tiers
    .map((l) => ({ l, e: library?.items?.find((it) => it.listingId === l.id) }))
    .find((x) => x.e
      && (x.e.status === 'active' || x.e.status === 'cancelled')
      && (!x.e.expiresAt || x.e.expiresAt > Date.now()));
  const [tierIdx, setTierIdx] = React.useState(0);
  const listing = ownedEntry?.l || tiers[tierIdx] || tiers[0] || fallback;
  const entry = ownedEntry?.e || null;
  const active = !!ownedEntry;
  const cancelledButValid = active && entry?.status === 'cancelled';
  const [pending, setPending] = React.useState(false);

  if (!listing) {
    return (
      <div style={{
        padding: 60, textAlign: 'center',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>
          Hugin sleeps. Try again soon.
        </div>
      </div>
    );
  }

  const auraShort = state.aura < (listing.price || 0);
  const levelLocked = state.level < (listing.level || 1);
  const locked = levelLocked || auraShort;

  const subscribe = () => {
    if (pending || locked) return;
    setPending(true);
    setTimeout(() => {
      const res = purchaseListing?.(listing);
      setPending(false);
      if (res?.ok) {
        try { window.ElyNotify?.toast?.({ title: 'Hugin unlocked', body: 'Welcome aboard the celestial order.', kind: 'success' }); } catch {}
      } else {
        try { window.ElyNotify?.toast?.({ title: 'Insufficient aura', kind: 'warn' }); } catch {}
      }
    }, 420);
  };

  const cancelSub = () => {
    if (!entry) return;
    if (typeof library?.cancel === 'function') library.cancel(entry.id);
    try { window.ElyNotify?.toast?.({ title: 'Subscription cancelled', body: 'You retain access until period ends.', kind: 'success' }); } catch {}
  };

  // Install + launch flow — mirrors the default ZephyroView so the zodiac
  // page has the same Download → Launch progression. Without this the
  // owner sees only Subscribe in zodiac and can't actually run Hugin.
  const installed = window.useInstalled ? window.useInstalled(listing?.id) : false;
  const [downloading, setDownloading] = React.useState(false);
  const downloadPlugin = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const detail = await window.ElyAPI.get(`/listings/${listing.id}`);
      const ghUrl = detail?.current_version_url || listing.current_version_url;
      if (!ghUrl) {
        try { window.ElyNotify?.toast?.({ text: 'No release available yet', kind: 'warn' }); } catch {}
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
      try { window.ElyNotify?.toast?.({ text: `Download failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
    } finally {
      setDownloading(false);
    }
  };
  const launch = () => {
    const inv = window.__TAURI__?.core?.invoke;
    if (!inv) {
      try { window.ElyNotify?.toast?.({ text: 'Hugin — launch only works in the desktop app', kind: 'info' }); } catch {}
      return;
    }
    inv('launch_app', { nameOrPath: 'Hugin' }).catch((err) => {
      try { window.ElyNotify?.toast?.({
        text: `Couldn't launch Hugin — make sure Hugin.app is installed in /Applications. (${err})`,
        kind: 'warn',
      }); } catch {}
    });
  };

  const expiresStr = entry?.expiresAt
    ? new Date(entry.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div>
      <button onClick={() => setView({ id: 'home' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK</button>

      {/* Hero — same banner widget as the default theme. The default
          ZephyroView already uses Z palette tokens with hardcoded fallbacks,
          so the visual is consistent across themes; the content below
          (perks grid, manage block) keeps the zodiac variant's identity. */}
      {(() => {
        const ZGOLD = Z.gold || '#c9a24e';
        const ZGOLDHI = Z.goldHi || '#e6c97a';
        const ZGOLDLO = Z.goldLo || '#a0822d';
        const ZGOLDGLOW = Z.goldGlow || 'rgba(201,162,78,0.45)';
        const ZHAIR = Z.hair || 'rgba(201,162,78,0.18)';
        const ZINK = Z.ink || '#0b0a08';
        const ZSERIF = '"Cormorant Garamond","EB Garamond","Instrument Serif",Georgia,serif';
        const ZCAPS = '"Cinzel","Cormorant SC",serif';
        const goldTextStyle = {
          background: `linear-gradient(180deg, ${ZGOLDHI} 0%, ${ZGOLD} 50%, ${ZGOLDLO} 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent', color: 'transparent',
        };
        const Corner = ({ pos, size = 22 }) => {
          const lineH = 1;
          const horiz = { position: 'absolute', height: lineH, background: ZGOLD, width: size,
            ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }) };
          const vert = { position: 'absolute', width: lineH, background: ZGOLD, height: size,
            ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }) };
          return <><span style={horiz}/><span style={vert}/></>;
        };
        return (
          <div style={{
            maxWidth: 1100, margin: '0 auto 28px', position: 'relative',
            aspectRatio: '3160 / 1080', overflow: 'hidden',
            border: `1px solid ${ZGOLD}`, borderRadius: 0,
            background: ZINK,
            boxShadow: `0 18px 60px rgba(0,0,0,0.6), 0 0 32px ${ZGOLDGLOW}`,
          }}>
            <video
              src="assets/hugin-loop.mp4"
              poster="assets/hugin-banner.png"
              autoPlay loop muted playsInline preload="auto"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', zIndex: 0, opacity: 0.95, pointerEvents: 'none',
              }}
            />
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
            <div style={{
              position: 'absolute', inset: 8, zIndex: 1, pointerEvents: 'none',
              border: `1px solid ${ZHAIR}`,
            }}/>
            <Corner pos={{ top: 14, left: 14 }}/>
            <Corner pos={{ top: 14, right: 14 }}/>
            <Corner pos={{ bottom: 14, left: 14 }}/>
            <Corner pos={{ bottom: 14, right: 14 }}/>

            <div style={{
              padding: '40px 44px', position: 'relative', zIndex: 2,
              display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap',
              minHeight: 380,
            }}>
              {/* Logo plate — same illuminated-manuscript frame as the
                  default theme: triple-stacked gold rules + corner cross
                  cartouches + mid-edge fleur diamonds. Box-shadow stack
                  fakes nested borders without nesting actual elements. */}
              <div style={{
                width: 132, height: 132, flexShrink: 0,
                position: 'relative',
                background: ZINK,
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
                <img src="assets/hugin-logo.png" alt="Hugin"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                {[
                  { top: -3, left: -3 }, { top: -3, right: -3 },
                  { bottom: -3, left: -3 }, { bottom: -3, right: -3 },
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
                {[
                  { top: -2, left: '50%', transform: 'translate(-50%, 0) rotate(45deg)' },
                  { bottom: -2, left: '50%', transform: 'translate(-50%, 0) rotate(45deg)' },
                  { left: -2, top: '50%', transform: 'translate(0, -50%) rotate(45deg)' },
                  { right: -2, top: '50%', transform: 'translate(0, -50%) rotate(45deg)' },
                ].map((s, i) => (
                  <span key={`d${i}`} style={{
                    position: 'absolute', ...s,
                    width: 5, height: 5, background: ZGOLD,
                    boxShadow: `0 0 4px ${ZGOLDGLOW}`,
                    pointerEvents: 'none',
                  }}/>
                ))}
              </div>
              {/* Text column */}
              <div style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
                {/* Title removed — HUGIN already reads massive in the
                    parchment frame on the right side of the banner; a
                    second "Hugin." here was redundant. */}
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
                  textShadow: '0 0 12px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,1)',
                  fontWeight: 500,
                }}>
                  The keeper of omens — bound to the loom of ElyHub:
                  your aura, your trophies, your library.
                </div>
                {active && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '5px 14px',
                      background: cancelledButValid
                        ? 'rgba(8,6,3,0.7)'
                        : `linear-gradient(180deg, ${ZGOLDHI}, ${ZGOLD} 50%, ${ZGOLDLO})`,
                      color: cancelledButValid ? undefined : ZINK,
                      fontFamily: ZCAPS, fontWeight: 500, fontSize: 10,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      border: cancelledButValid ? `1px solid ${Z.copper || '#b27a3f'}` : 'none',
                      boxShadow: cancelledButValid ? 'none' : `0 0 14px ${ZGOLDGLOW}`,
                      ...(cancelledButValid ? { color: Z.copper || '#b27a3f' } : {}),
                    }}>
                      {cancelledButValid ? '◐ Ending soon' : '✦ Active'}
                    </span>
                    {expiresStr && (
                      <span style={{
                        fontFamily: ZSERIF, fontStyle: 'italic',
                        color: '#f4ecd0', fontSize: 13, alignSelf: 'center',
                        textShadow: '0 0 12px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,1)',
                      }}>
                        {cancelledButValid ? 'Until' : 'Renews'} {expiresStr}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* CTA column — Launch when active+installed, Download when
                  active but not installed, Subscribe (with tier selector +
                  price) when not active. marginLeft auto pushes the column
                  flush against the banner's right edge so it doesn't
                  overlap the parchment frame visualizer in the center. */}
              {active && installed ? (
                <button
                  onClick={launch}
                  style={{
                    padding: '14px 32px',
                    background: `linear-gradient(180deg, ${ZGOLDHI}, ${ZGOLD} 50%, ${ZGOLDLO})`,
                    color: ZINK, cursor: 'pointer', flexShrink: 0,
                    marginLeft: 'auto',
                    fontFamily: ZCAPS, fontWeight: 600, fontSize: 12,
                    letterSpacing: '0.22em', textTransform: 'uppercase',
                    border: `1px solid ${ZGOLDLO}`,
                    boxShadow: `0 8px 28px ${ZGOLDGLOW}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 10px 36px ${ZGOLDGLOW}, 0 0 24px ${ZGOLDGLOW}, inset 0 1px 0 rgba(255,255,255,0.5)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 8px 28px ${ZGOLDGLOW}, inset 0 1px 0 rgba(255,255,255,0.4)`; }}
                >✦ Launch Hugin</button>
              ) : active ? (
                <button
                  onClick={downloadPlugin}
                  disabled={downloading}
                  style={{
                    padding: '14px 32px',
                    background: `linear-gradient(180deg, ${ZGOLDHI}, ${ZGOLD} 50%, ${ZGOLDLO})`,
                    color: ZINK, cursor: downloading ? 'progress' : 'pointer', flexShrink: 0,
                    marginLeft: 'auto',
                    fontFamily: ZCAPS, fontWeight: 600, fontSize: 12,
                    letterSpacing: '0.22em', textTransform: 'uppercase',
                    border: `1px solid ${ZGOLDLO}`,
                    boxShadow: `0 8px 28px ${ZGOLDGLOW}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    opacity: downloading ? 0.85 : 1,
                  }}
                >
                  {downloading ? 'Summoning…' : 'Download Hugin ↓'}
                </button>
              ) : (
                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 220, marginLeft: 'auto' }}>
                  {tiers.length > 1 && (
                    <div style={{
                      display: 'flex', gap: 4, padding: 4,
                      border: `1px solid ${ZHAIR}`, background: 'rgba(8,6,3,0.6)',
                      marginBottom: 14,
                    }}>
                      {tiers.map((tt, i) => (
                        <button key={tt.id} onClick={() => setTierIdx(i)} style={{
                          fontFamily: ZCAPS, fontSize: 10, letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          padding: '8px 14px', cursor: 'pointer',
                          background: tierIdx === i ? `linear-gradient(180deg, ${ZGOLDHI}, ${ZGOLD} 50%, ${ZGOLDLO})` : 'transparent',
                          color: tierIdx === i ? ZINK : '#f4ecd0',
                          border: 'none', flex: 1,
                        }}>
                          {tt.title?.replace(/^Hugin\s*[·\(\)\-]?\s*/i, '').replace(/\)$/,'').trim() || `TIER ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{
                    fontFamily: ZSERIF, fontSize: 36, fontStyle: 'italic',
                    ...goldTextStyle, marginBottom: 4, lineHeight: 1,
                  }}>
                    {Number(listing.price || 0).toLocaleString('en-US')}
                  </div>
                  <div style={{
                    fontFamily: ZCAPS, fontSize: 9, letterSpacing: '0.22em',
                    color: '#f4ecd0', marginBottom: 14, textTransform: 'uppercase',
                    textShadow: '0 0 8px rgba(0,0,0,0.9)',
                  }}>
                    AURA{listing.billing === 'monthly' ? ' / MONTH' : ''}
                  </div>
                  <button
                    onClick={subscribe}
                    disabled={pending || locked}
                    style={{
                      padding: '14px 28px', cursor: pending || locked ? 'not-allowed' : 'pointer',
                      background: locked
                        ? 'rgba(8,6,3,0.7)'
                        : `linear-gradient(180deg, ${ZGOLDHI}, ${ZGOLD} 50%, ${ZGOLDLO})`,
                      color: locked ? '#f4ecd0' : ZINK,
                      fontFamily: ZCAPS, fontWeight: 600, fontSize: 11,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      border: `1px solid ${locked ? ZHAIR : ZGOLDLO}`,
                      boxShadow: locked ? 'none' : `0 8px 28px ${ZGOLDGLOW}, inset 0 1px 0 rgba(255,255,255,0.4)`,
                      opacity: pending ? 0.85 : 1,
                    }}
                  >
                    {pending ? 'Binding…' :
                      levelLocked ? `Level ${listing.level} required` :
                      auraShort ? 'Insufficient aura' :
                      '✦ Join the order'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Perks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Zodiac Theme', body: 'A complete celestial reskin — gold leaf, ink, and parchment.', icon: 'sun' },
          { label: 'Sigil Avatars', body: 'Your zodiac glyph etched onto a brass medallion.', icon: 'moon' },
          { label: 'Inner Circle', body: 'Voted access to private hands.', icon: 'star' },
          { label: 'Renewal Bonus', body: 'A relic with each renewal.', icon: 'star' },
        ].map((p) => (
          <div key={p.label} style={{
            position: 'relative', padding: 20,
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
          }}>
            <div style={{ marginBottom: 12 }}>
              {p.icon === 'sun' && window.ZSun && React.createElement(window.ZSun, { size: 32, color: Z.gold, sw: 0.7 })}
              {p.icon === 'moon' && window.ZMoon && React.createElement(window.ZMoon, { size: 32, color: Z.gold, sw: 1 })}
              {p.icon === 'star' && window.ZStarburst && React.createElement(window.ZStarburst, { size: 36, color: Z.gold, sw: 0.5, points: 8 })}
            </div>
            <div style={{ ...ZTY.h3, color: Z.parch, fontStyle: 'italic', fontSize: 18, marginBottom: 6 }}>
              {p.label}
            </div>
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 13 }}>
              {p.body}
            </div>
          </div>
        ))}
      </div>

      {/* Manage */}
      {active && (
        <div style={{
          padding: 22,
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
        }}>
          <div>
            <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>Manage subscription</div>
            <div style={{ ...ZTY.capsSm, color: Z.text3, marginTop: 2 }}>
              {cancelledButValid ? 'CANCELLED — RUNS UNTIL EXPIRY' : 'AUTO-RENEWING'}
            </div>
          </div>
          {!cancelledButValid && window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'danger', size: 'sm', onClick: cancelSub }, 'CANCEL')}
        </div>
      )}
    </div>
  );
}

// ─── My Library ───
function ZodiacMyLibraryView({ state, setView, library, purchaseListing }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const rows = library.items
    .map((it) => ({ entry: it, listing: (window.LISTINGS || []).find((l) => l.id === it.listingId) }))
    .filter((r) => r.listing);

  const active = rows.filter((r) => r.entry.status === 'active' && (!r.entry.expiresAt || r.entry.expiresAt > Date.now()));
  const expired = rows.filter((r) => !active.includes(r));

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          KEEPSAKES · {rows.length} ACQUIRED
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>My Library</h1>
      </div>

      {rows.length === 0 ? (
        <div style={{
          padding: 80, textAlign: 'center',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair}`,
        }}>
          <div style={{ marginBottom: 14 }}>
            {window.ZMoon && React.createElement(window.ZMoon, { size: 56, color: Z.gold, sw: 0.8 })}
          </div>
          <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 16 }}>
            Your library is empty. The bazaar awaits.
          </div>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', size: 'sm', onClick: () => setView({ id: 'store' }) },
            'VISIT MARKETPLACE')}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
                <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Active</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {active.map(({ entry, listing }) => (
                  <ZLibraryCard key={entry.id} entry={entry} listing={listing} setView={setView}/>
                ))}
              </div>
            </div>
          )}
          {expired.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>{active.length > 0 ? 'II.' : 'I.'}</span>
                <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Faded</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {expired.map(({ entry, listing }) => (
                  <ZLibraryCard key={entry.id} entry={entry} listing={listing} setView={setView} faded/>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ZLibraryCard({ entry, listing, setView, faded }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const expires = entry.expiresAt
    ? new Date(entry.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;
  const isHugin = (listing.kassa_product_id || listing.kassaProductId) === 'gleipnir';
  return (
    <div onClick={() => setView({
      id: isHugin ? 'zephyro' : 'listing',
      focusId: isHugin ? undefined : listing.id,
    })} style={{
      cursor: 'pointer', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
      border: `1px solid ${faded ? Z.hair : Z.hair2}`,
      opacity: faded ? 0.55 : 1,
      transition: 'all .25s',
    }}
      onMouseEnter={(e) => { if (!faded) e.currentTarget.style.borderColor = Z.hair3; }}
      onMouseLeave={(e) => { if (!faded) e.currentTarget.style.borderColor = Z.hair2; }}>
      <div style={{
        height: 100, position: 'relative',
        background: `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
        borderBottom: `1px solid ${Z.hair}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {window.ZStarburst && React.createElement(window.ZStarburst, { size: 80, color: Z.gold, sw: 0.5, points: 12 })}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 4 }}>
          {(listing.type || 'item').toUpperCase()}
          {entry.status === 'cancelled' ? ' · CANCELLED' : ''}
        </div>
        <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 17, fontStyle: 'italic', marginBottom: 6,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...ZTY.capsSm, color: Z.text3, marginTop: 10 }}>
          {expires && <span>{entry.status === 'cancelled' ? 'ENDS' : 'RENEWS'} {expires}</span>}
          <span style={{ color: Z.gold }}>OPEN →</span>
        </div>
      </div>
    </div>
  );
}

// ─── Saved view ───
function ZodiacSavedView({ state, setView, wishlist }) {
  const Z = window.Z, ZTY = window.ZTY;
  const items = (wishlist?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          BOOKMARKS · {items.length}
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Saved</h1>
      </div>
      {items.length === 0 ? (
        <ZEmptyState
          glyph="moon"
          title="Nothing saved yet"
          body="Tap the ★ on a relic to bookmark it."
          actionLabel="VISIT MARKETPLACE"
          onAction={() => setView({ id: 'store' })}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {items.map((l) => (
            <div key={l.id} onClick={() => setView({ id: 'listing', focusId: l.id })} style={{
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair2}`, padding: 18,
            }}>
              <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 4 }}>{(l.type || '').toUpperCase()}</div>
              <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 17, fontStyle: 'italic', marginBottom: 6 }}>{l.title}</div>
              {l.tagline && (
                <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>
                  {l.tagline}
                </div>
              )}
              <div style={{ ...ZTY.body, color: Z.gold, fontStyle: 'italic' }}>
                {Number(l.price || 0).toLocaleString('en-US')} <span style={{ ...ZTY.capsSm, color: Z.text3 }}>AURA</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feed view ───
function ZodiacFeedView({ state, setView, follows, wishlist }) {
  const Z = window.Z, ZTY = window.ZTY;
  const followedIds = follows?.items || [];
  const items = (window.LISTINGS || [])
    .filter((l) => followedIds.includes(l.sellerId))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          FROM THOSE YOU FOLLOW · {items.length}
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Feed</h1>
      </div>
      {items.length === 0 ? (
        <ZEmptyState
          glyph="moon"
          title="Your feed sleeps"
          body="Follow makers and their new relics will appear here."
          actionLabel="DISCOVER MAKERS"
          onAction={() => setView({ id: 'discover' })}/>
      ) : (
        <div style={{
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`, padding: 6,
        }}>
          {items.map((l, i) => {
            const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
            return (
              <div key={l.id} onClick={() => setView({ id: 'listing', focusId: l.id })} style={{
                display: 'flex', gap: 14, padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: i === items.length - 1 ? 'none' : `1px solid ${Z.hair}`,
                alignItems: 'center',
              }}>
                {window.ZAvatar && React.createElement(window.ZAvatar, {
                  name: seller?.name || '',
                  src: seller?.avatarUrl || seller?.avatar,
                  size: 36, sign: window.signOf?.(seller?.name),
                })}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 2 }}>
                    {seller?.name?.toUpperCase() || ''} · {(l.type || '').toUpperCase()}
                  </div>
                  <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>{l.title}</div>
                </div>
                <div style={{ ...ZTY.body, color: Z.gold, fontStyle: 'italic' }}>
                  {Number(l.price || 0).toLocaleString('en-US')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Discover view ───
function ZodiacDiscoverView({ state, setView, wishlist, follows, recent, library, blocks }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const all = (window.LISTINGS || []).filter((l) => !(blocks && blocks.has(l.sellerId)));
  const trending = [...all].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 6);
  const fresh = [...all].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);

  // Top makers by listings count
  const makerCounts = new Map();
  for (const l of all) {
    makerCounts.set(l.sellerId, (makerCounts.get(l.sellerId) || 0) + 1);
  }
  const topMakers = [...makerCounts.entries()]
    .map(([id, n]) => ({ user: (window.MEMBERS || []).find((m) => m.id === id), count: n }))
    .filter((x) => x.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>EXPLORE THE BAZAAR</div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Discover</h1>
      </div>

      {/* Trending */}
      {trending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Ascending</span>
            <span style={{ flex: 1 }}/>
            <button onClick={() => setView({ id: 'store' })} style={{
              ...ZTY.capsSm, color: Z.gold, background: 'transparent',
              border: `1px solid ${Z.hair2}`, padding: '6px 12px', cursor: 'pointer',
            }}>VIEW ALL →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {trending.map((l) => (
              window.ZListingCardCompact
                ? React.createElement(window.ZListingCardCompact, { key: l.id, l, setView })
                : <ZDiscoverCard key={l.id} l={l} setView={setView}/>
            ))}
          </div>
        </div>
      )}

      {/* Top makers */}
      {topMakers.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>II.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Cartographers</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {topMakers.map(({ user, count }) => (
              <div key={user.id} onClick={() => setView({ id: 'profile', userId: user.id })} style={{
                cursor: 'pointer', padding: 18, textAlign: 'center',
                background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
                border: `1px solid ${Z.hair2}`,
              }}>
                <div style={{ marginBottom: 12 }}>
                  {window.ZAvatar && React.createElement(window.ZAvatar, {
                    name: user.name,
                    src: user.avatarUrl || user.avatar,
                    size: 56, ring: true, sign: window.signOf?.(user.name),
                  })}
                </div>
                <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 16, fontStyle: 'italic' }}>{user.name}</div>
                <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9, marginTop: 4 }}>
                  {count} {count === 1 ? 'RELIC' : 'RELICS'} · L{user.level || 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fresh */}
      {fresh.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>III.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Just Forged</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {fresh.map((l) => (
              <ZDiscoverCard key={l.id} l={l} setView={setView}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ZDiscoverCard({ l, setView }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  return (
    <div onClick={() => setView({ id: 'listing', focusId: l.id })} style={{
      cursor: 'pointer', padding: 18,
      background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
      border: `1px solid ${Z.hair2}`,
    }}>
      <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 4 }}>{(l.type || 'ITEM').toUpperCase()}</div>
      <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 17, fontStyle: 'italic', marginBottom: 6 }}>{l.title}</div>
      {l.tagline && (
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 13, marginBottom: 10,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {l.tagline}
        </div>
      )}
      <div style={{ ...ZTY.body, ...goldFill, fontStyle: 'italic' }}>
        {Number(l.price || 0).toLocaleString('en-US')} <span style={{ ...ZTY.capsSm, color: Z.text3 }}>AURA</span>
      </div>
    </div>
  );
}

// ─── Messages view ───
// Mirrors host MessagesView shape: messages.list (array of threads),
// messages.threads ({ [clientId]: thread }), messages.meId, messages.markRead,
// messages.send. Each thread = { id, otherId, messages, unread, updatedAt }.
function ZodiacMessagesView({ state, setView, messages, threadId, blocks, reports }) {
  const Z = window.Z, ZTY = window.ZTY;
  const meId = messages?.meId || window.ME?.id;
  const list = (messages?.list && Array.isArray(messages.list))
    ? (blocks ? messages.list.filter((t) => !blocks.has(t.otherId)) : messages.list)
    : [];

  const routeOtherId = threadId && messages?.threads?.[threadId]?.otherId;
  const routeBlocked = routeOtherId && blocks && blocks.has(routeOtherId);
  const [picked, setPicked] = React.useState(null);
  const resolved = picked
    || (threadId && messages?.threads?.[threadId] && !routeBlocked ? threadId : (list[0]?.id || null));
  const active = resolved ? messages?.threads?.[resolved] : null;
  const other = active ? (window.MEMBERS || []).find((m) => m.id === active.otherId) : null;

  React.useEffect(() => {
    if (resolved && messages?.markRead) messages.markRead(resolved);
  }, [resolved]);

  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [resolved, active?.messages?.length]);

  const [draft, setDraft] = React.useState('');
  React.useEffect(() => { setDraft(''); }, [resolved]);
  const submit = () => {
    if (!draft.trim() || !active || !messages?.send) return;
    messages.send(active.otherId, draft.trim());
    setDraft('');
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          CORRESPONDENCE · {list.length}
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Messages</h1>
      </div>
      {list.length === 0 ? (
        <ZEmptyState glyph="moon" title="No letters yet" body="The post road is quiet — open a maker's profile to start a thread."/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, height: '65vh' }}>
          {/* Thread list */}
          <div style={{
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
            overflowY: 'auto',
          }}>
            {list.map((th) => {
              const o = (window.MEMBERS || []).find((m) => m.id === th.otherId);
              const lastMsg = th.messages?.[th.messages.length - 1];
              const isActive = th.id === resolved;
              return (
                <button key={th.id} onClick={() => setPicked(th.id)} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  width: '100%', padding: 14, textAlign: 'left',
                  background: isActive ? Z.ink3 : 'transparent',
                  borderBottom: `1px solid ${Z.hair}`,
                  border: 'none', cursor: 'pointer',
                  borderLeft: isActive ? `2px solid ${Z.gold}` : '2px solid transparent',
                }}>
                  {window.ZAvatar && React.createElement(window.ZAvatar, {
                    name: o?.name || 'Unknown',
                    src: o?.avatarUrl || o?.avatar,
                    size: 32, sign: window.signOf?.(o?.name),
                  })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o?.name || 'Unknown'}
                    </div>
                    {lastMsg && (
                      <div style={{ ...ZTY.small, color: Z.text3, fontSize: 12, fontStyle: 'italic',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lastMsg.text || ''}
                      </div>
                    )}
                  </div>
                  {th.unread > 0 && (
                    <span style={{
                      ...ZTY.capsSm, fontSize: 9, padding: '2px 6px',
                      background: Z.gold, color: Z.ink, fontWeight: 500,
                    }}>{th.unread}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active thread */}
          <div style={{
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
            display: 'flex', flexDirection: 'column', minHeight: 0,
          }}>
            {active ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderBottom: `1px solid ${Z.hair}` }}>
                  {window.ZAvatar && React.createElement(window.ZAvatar, {
                    name: other?.name || 'Unknown',
                    src: other?.avatarUrl || other?.avatar,
                    size: 32, sign: window.signOf?.(other?.name),
                  })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>
                      {other?.name || 'Unknown'}
                    </div>
                    <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>
                      {(window.signOf?.(other?.name) || '').toUpperCase()}
                    </div>
                  </div>
                </div>
                <div ref={scrollerRef} style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(active.messages || []).map((msg) => {
                    const mine = msg.fromId === meId || msg.fromUserId === meId;
                    const hasListing = msg.attachment?.type === 'listing';
                    const onlyAttachment = hasListing && !msg.text;
                    return (
                      <div key={msg.id || msg.ts} style={{
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex', flexDirection: 'column', gap: 6,
                        padding: onlyAttachment ? 0 : '10px 14px',
                        background: onlyAttachment ? 'transparent'
                          : (mine ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : Z.ink3),
                        color: mine ? Z.ink : Z.parch,
                        border: onlyAttachment ? 'none' : (mine ? 'none' : `1px solid ${Z.hair2}`),
                        ...ZTY.body, fontStyle: 'italic', fontSize: 14,
                      }}>
                        {msg.text && <div>{msg.text}</div>}
                        {hasListing && window.MessageListingCard && React.createElement(
                          window.MessageListingCard,
                          { listingId: msg.attachment.id, mine,
                            onOpen: () => setView({ id: 'listing', focusId: msg.attachment.id }) }
                        )}
                      </div>
                    );
                  })}
                  {(active.messages || []).length === 0 && (
                    <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
                      Begin the correspondence.
                    </div>
                  )}
                </div>
                {messages?.send && (
                  <div style={{ padding: 12, borderTop: `1px solid ${Z.hair}`, display: 'flex', gap: 10 }}>
                    <input value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                      placeholder="Compose a letter…"
                      style={{
                        flex: 1, padding: '10px 14px',
                        background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
                        ...ZTY.body, color: Z.parch, fontStyle: 'italic',
                      }}/>
                    {window.ZBtn && React.createElement(window.ZBtn,
                      { variant: 'primary', size: 'sm', onClick: submit, disabled: !draft.trim() },
                      'SEND')}
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...ZTY.body, color: Z.text3, fontStyle: 'italic' }}>
                Select a thread to read.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Creator profile (other users) ───
function ZodiacCreatorProfileView({ userId, state, setView, onQuick, reviews, wishlist, follows, messages, reports, blocks }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const user = (window.MEMBERS || []).find((m) => m.id === userId);
  if (!user) {
    return (
      <div style={{
        padding: 60, textAlign: 'center',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 14 }}>
          This member is unknown to the order.
        </div>
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', size: 'sm', onClick: () => setView({ id: 'leaderboard' }) },
          '← LEADERBOARD')}
      </div>
    );
  }
  const sign = window.signOf ? window.signOf(user.name) : 'Aries';
  const glyph = window.ZODIAC_GLYPHS ? window.ZODIAC_GLYPHS[sign] : '✦';
  const userListings = (window.LISTINGS || []).filter((l) => l.sellerId === user.id);
  const isFollowing = follows?.has?.(user.id);

  return (
    <div>
      <button onClick={() => setView({ id: 'leaderboard' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK</button>

      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden', padding: '40px 48px',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        marginBottom: 28,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}
        {window.ZStarburst && (
          <div style={{ position: 'absolute', right: -50, top: -30, opacity: 0.35, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 320, color: Z.gold, sw: 0.4, points: 14 })}
          </div>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 28 }}>
          {window.ZAvatar && React.createElement(window.ZAvatar,
            { name: user.name, src: user.avatarUrl || user.avatar, size: 96, ring: true, sign })}
          <div style={{ flex: 1 }}>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 6 }}>{sign.toUpperCase()} {glyph}</div>
            <div style={{ ...ZTY.h1, color: Z.parch, fontSize: 42, fontStyle: 'italic' }}>{user.name}</div>
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginTop: 6 }}>
              @{user.tag} · level {user.level || 1} · {Number(user.aura || 0).toLocaleString('en-US')} aura
            </div>
            {user.role && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                {window.ZTag && React.createElement(window.ZTag, { color: Z.gold, glow: true }, user.role.toUpperCase())}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {follows && window.ZBtn && React.createElement(window.ZBtn,
              { variant: isFollowing ? 'secondary' : 'primary', size: 'sm',
                onClick: () => follows.toggle(user.id) },
              isFollowing ? 'FOLLOWING' : '+ FOLLOW')}
            {window.ZBtn && React.createElement(window.ZBtn,
              { variant: 'secondary', size: 'sm', onClick: () => onQuick?.gift?.(user) },
              'SEND AURA')}
          </div>
        </div>
      </div>

      {/* Listings */}
      {userListings.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
            <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Their Relics</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {userListings.map((l) => (
              <ZDiscoverCard key={l.id} l={l} setView={setView}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state helper ───
function ZEmptyState({ glyph, title, body, actionLabel, onAction }) {
  const Z = window.Z, ZTY = window.ZTY;
  return (
    <div style={{
      padding: 80, textAlign: 'center',
      background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
      border: `1px solid ${Z.hair}`,
    }}>
      <div style={{ marginBottom: 14 }}>
        {glyph === 'moon' && window.ZMoon && React.createElement(window.ZMoon, { size: 56, color: Z.gold, sw: 0.8 })}
        {glyph === 'sun' && window.ZSun && React.createElement(window.ZSun, { size: 56, color: Z.gold, sw: 0.7 })}
      </div>
      <div style={{ ...ZTY.h3, color: Z.parch, fontStyle: 'italic', marginBottom: 6 }}>{title}</div>
      <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 16 }}>{body}</div>
      {actionLabel && onAction && window.ZBtn && React.createElement(window.ZBtn,
        { variant: 'primary', size: 'sm', onClick: onAction }, actionLabel)}
    </div>
  );
}

// ─── Store (Redeem) view — rewards grid ───
function ZodiacStoreView({ state, onQuick, focusId }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const REWARDS = window.REWARDS || [];
  const cats = ['All', ...Array.from(new Set(REWARDS.map((r) => r.category).filter(Boolean)))];
  const [cat, setCat] = React.useState('All');
  React.useEffect(() => { if (focusId) setCat('All'); }, [focusId]);
  const items = cat === 'All' ? REWARDS : REWARDS.filter((r) => r.category === cat);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>RELIQUARY</div>
          <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Redeem your aura</h1>
        </div>
        <div style={{
          padding: '14px 22px', textAlign: 'right',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
          position: 'relative', minWidth: 160,
        }}>
          {window.ZCorner && <>
            {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 10 })}
            {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 10 })}
            {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 10 })}
            {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 10 })}
          </>}
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 4 }}>BALANCE</div>
          <div style={{ ...ZTY.h2, ...goldFill, fontSize: 28 }}>{Number(state.aura).toLocaleString('en-US')}</div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 4, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink2, marginBottom: 24, width: 'fit-content' }}>
        {cats.map((c) => {
          const active = cat === c;
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              ...ZTY.capsSm, padding: '8px 16px', cursor: 'pointer',
              background: active ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
              color: active ? Z.ink : Z.text2,
              border: 'none', fontWeight: 500,
            }}>{c.toUpperCase()}</button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <ZEmptyState glyph="moon" title="The reliquary is empty" body="No relics in this category yet."/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((r) => <ZRewardCard key={r.id} r={r} state={state} onQuick={onQuick} focusId={focusId}/>)}
        </div>
      )}
    </div>
  );
}

function ZRewardCard({ r, state, onQuick, focusId }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [hov, setHov] = React.useState(false);
  const auraShort = state.aura < (r.price || 0);
  const levelLocked = state.level < (r.level || 0);
  const stockOut = r.stock != null && r.stock <= 0;
  const locked = auraShort || levelLocked || stockOut;
  const focused = focusId === r.id;
  return (
    <div data-focus-id={r.id}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${focused || hov ? Z.hair3 : Z.hair2}`,
        boxShadow: hov ? `0 0 24px ${Z.goldGlow}` : 'none',
        transition: 'all .25s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
      }}>
      {window.ZCorner && <>
        {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 12 })}
        {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 12 })}
      </>}

      {/* Sigil panel (no thumb in REWARDS shape — show ZStarburst) */}
      <div style={{
        position: 'relative', height: 160,
        background: `radial-gradient(ellipse at center, ${Z.ink3}, ${Z.ink})`,
        borderBottom: `1px solid ${Z.hair}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {window.ZStarburst && React.createElement(window.ZStarburst,
          { size: 110, color: Z.gold, sw: 0.5, points: 14 })}
        {/* Status badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {r.stock != null && r.stock > 0 && r.stock <= 5 && window.ZTag &&
            React.createElement(window.ZTag, { color: Z.bad, glow: true }, `${r.stock} LEFT`)}
          {window.ZTag && React.createElement(window.ZTag,
            { color: stockOut ? Z.text4 : Z.good, glow: !stockOut },
            stockOut ? 'SOLD OUT' : '● AVAILABLE')}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 18, fontStyle: 'italic', marginBottom: 4,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.title}
        </div>
        {r.sub && (
          <div style={{ ...ZTY.body, color: Z.text2, fontSize: 13, fontStyle: 'italic', marginBottom: 14,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {r.sub}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <span style={{ ...ZTY.h3, ...goldFill, fontSize: 22 }}>
              {Number(r.price || 0).toLocaleString('en-US')}
            </span>
            <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 6 }}>AURA</span>
          </div>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: locked ? 'secondary' : 'primary', size: 'sm',
              onClick: () => !locked && onQuick?.redeem?.(r),
              disabled: locked },
            stockOut ? 'SOLD OUT' :
              levelLocked ? `L${r.level} REQ` :
              auraShort ? 'NEED MORE' : 'REDEEM →')}
        </div>
      </div>
    </div>
  );
}

// ─── Members directory ───
function ZodiacMembersView({ state, setView, messages }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [sort, setSort] = React.useState('joined');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const PAGE = 60;

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);
  React.useEffect(() => { setOffset(0); }, [sort, debounced]);

  const load = React.useCallback(async (append = false) => {
    if (!window.ElyAPI?.isSignedIn?.()) return;
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ sort, limit: String(PAGE), offset: String(offset) });
      if (debounced) params.set('search', debounced);
      const res = await window.ElyAPI.get(`/members?${params}`);
      setItems((prev) => append ? [...prev, ...(res.items || [])] : (res.items || []));
      setTotal(res.total || 0);
    } catch (e) { setErr(e.message || 'failed'); }
    finally { setLoading(false); }
  }, [sort, debounced, offset]);
  React.useEffect(() => { load(offset > 0); }, [load]);

  const sorts = [
    { v: 'joined', l: 'NEWEST' },
    { v: 'oldest', l: 'OLDEST' },
    { v: 'aura',   l: 'AURA' },
    { v: 'name',   l: 'NAME' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>
          THE GUILD · {total.toLocaleString('en-US')}
        </div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56 }}>Members</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          {window.ZISearch && React.createElement(window.ZISearch, { size: 14, color: Z.gold })}
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or tag…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              ...ZTY.body, color: Z.parch, fontStyle: 'italic',
            }}/>
        </div>
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

      {err && (
        <div style={{
          ...ZTY.body, color: Z.bad, fontStyle: 'italic', padding: 14,
          border: `1px solid ${Z.bad}55`, background: 'rgba(161,71,53,0.12)', marginBottom: 16,
        }}>⚠ {err}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {items.map((u) => {
          const sign = window.signOf ? window.signOf(u.name) : '';
          // /members API returns avatar_url + avatar_hash. Build the CDN URL
          // when only the hash is given. Falls back through every shape so
          // any seed/test data also resolves.
          const avatarSrc = u.avatar_url
            || (u.avatar_hash ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar_hash}.png?size=128` : null)
            || u.avatarUrl || u.avatar || null;
          return (
            <div key={u.id} onClick={() => setView({ id: 'profile', userId: u.id })} style={{
              cursor: 'pointer', padding: 18, textAlign: 'center',
              background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair2}`,
              transition: 'all .2s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = Z.hair3}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = Z.hair2}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                {window.ZAvatar && React.createElement(window.ZAvatar, {
                  name: u.name, src: avatarSrc, size: 56, sign,
                })}
              </div>
              <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 16, fontStyle: 'italic',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.name}
              </div>
              <div style={{ ...ZTY.capsSm, color: Z.gold, fontSize: 9, marginTop: 4 }}>
                {sign.toUpperCase()} · L{u.level || 0}
              </div>
              {u.aura > 0 && (
                <div style={{ ...ZTY.body, ...goldFill, marginTop: 10 }}>
                  {Number(u.aura).toLocaleString('en-US')}
                  <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 4 }}>AURA</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {items.length < total && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'secondary', size: 'sm', disabled: loading,
              onClick: () => setOffset(items.length) },
            loading ? 'LOADING…' : 'SHOW MORE')}
        </div>
      )}

      {items.length === 0 && !loading && !err && (
        <ZEmptyState glyph="moon" title="No members match" body="Try a different name or sort."/>
      )}
    </div>
  );
}

// Expose all variants on window
window.ZodiacMembersView         = ZodiacMembersView;
window.ZodiacStoreView           = ZodiacStoreView;
window.ZodiacToastStack          = ZodiacToastStack;
window.ZodiacZephyroView         = ZodiacZephyroView;
window.ZodiacMyLibraryView       = ZodiacMyLibraryView;
window.ZodiacSavedView           = ZodiacSavedView;
window.ZodiacFeedView            = ZodiacFeedView;
window.ZodiacDiscoverView        = ZodiacDiscoverView;
window.ZodiacMessagesView        = ZodiacMessagesView;
window.ZodiacCreatorProfileView  = ZodiacCreatorProfileView;
