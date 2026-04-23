// views.jsx — route views + theme customisation.
//
// Extracted from app.jsx. Everything that's reached via sidebar navigation
// but doesn't fit in home.jsx (which covers the canonical three):
//
//   • KassaHubView / PluginPanelView  — plugin surfaces
//   • DiscoverView + scoreDiscover    — "for you" recommendations
//   • CollectionView / SavedView      — wishlist grids
//   • MessagesView                    — 1:1 DM thread pane
//   • FeedView                        — followed-creator feed
//   • MyLibraryView                   — owned / subscribed items
//   • useTweaks / TweaksPanel         — runtime theme editor overlay
//   • WelcomeModal + wasWelcomed/markWelcomed — post-login splash

// ──── PluginPanelView — the "inside" of a subscribed plugin ────
// ──── KassaHubView — first-party plugin with exclusive sidebar tab ────
// Dual-state page driven by the user's subscription status on listing
// l-kassahub. Locked state sells the product (hero, features, pricing,
// screenshots). Unlocked state becomes the live plugin shell with a Launch
// button and license info. Shares purchaseListing with the marketplace so the
// Subscribe CTA here behaves identically to clicking Subscribe on the detail
// page — debits aura, flips status, lands on the dashboard.
function KassaHubView({ state, setView, library, purchaseListing }) {
  const listing = (window.LISTINGS || []).find((x) => x.id === 'l-kassahub');
  const entry = library?.items?.find((it) => it.listingId === 'l-kassahub');
  const active = !!(entry && entry.status === 'active'
    && (!entry.expiresAt || entry.expiresAt > Date.now()));
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, [active]);

  const [pending, setPending] = React.useState(false);

  if (!listing) {
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>KassaHub isn't available right now.</div>
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
        try { ElyNotify?.toast?.({ text: `KassaHub unlocked — welcome aboard 🎉`, kind: 'success' }); } catch {}
      } else {
        try { ElyNotify?.toast?.({ text: 'Not enough aura', kind: 'warn' }); } catch {}
      }
    }, 420);
  };

  const launch = () => {
    const inv = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
    if (inv) {
      inv('launch_plugin', { plugin: listing.id }).catch(() => {
        try { ElyNotify?.toast?.({ text: 'KassaHub launcher not wired yet', kind: 'info' }); } catch {}
      });
    } else {
      try { ElyNotify?.toast?.({ text: 'KassaHub — launch coming soon', kind: 'info' }); } catch {}
    }
  };

  // Feature cards shown in both states. Locked: as a teaser. Unlocked: as a
  // map to what's on offer once you hit Launch.
  const features = [
    { title: 'Clip Notes', body: 'Jot notes directly on the timeline. Auto-synced to markers.', icon: '📝' },
    { title: 'Render Queue', body: 'Track export progress across Premiere + DaVinci in one panel.', icon: '🎬' },
    { title: 'Asset Bin Sync', body: 'Your library follows you across projects — no re-importing.', icon: '📦' },
    { title: 'Quick Library', body: 'Hotkey-pinned shelf of your most-used clips, fonts, and presets.', icon: '⚡' },
  ];

  const exp = entry?.expiresAt ? expiryLabel(entry.expiresAt) : '';
  const warn = active && entry?.expiresAt && (entry.expiresAt - Date.now()) < 3 * 86_400_000;

  return (
    <div>
      {/* Hero — gradient background, logo mark, status chip. Same layout in
          both states but the CTA swaps. */}
      <Glass style={{ padding: 0, overflow: 'hidden', position: 'relative', marginBottom: 18 }}>
        <HoverOrbs restX={80} restY={25} size={620} color={T.lilac} colorHi={T.accentHi}/>
        <div style={{
          padding: 36,
          background: `linear-gradient(135deg, rgba(167,139,250,0.14), rgba(61,123,255,0.08) 60%, transparent)`,
          display: 'flex', gap: 24, alignItems: 'center', position: 'relative', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 92, height: 92, borderRadius: T.r.lg, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: `0 10px 36px ${T.lilac}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}>
            <ListingTypeIcon type="plugin" size={42}/>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ ...TY.micro, color: T.lilac, marginBottom: 6, letterSpacing: '0.14em' }}>
              ELY · FIRST-PARTY PLUGIN
            </div>
            <h1 style={{ ...TY.h1, margin: 0, color: T.text, fontSize: 36 }}>
              {listing.title}<span style={{ color: T.lilac }}>.</span>
            </h1>
            <div style={{ ...TY.body, color: T.text2, marginTop: 8, maxWidth: 560 }}>
              {listing.tagline} — built in-house, deeply integrated with your ElyHub account,
              aura balance, and community trophies.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {active ? (
                <>
                  <span style={{
                    padding: '5px 12px', borderRadius: T.r.pill,
                    background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
                    color: '#fff', fontFamily: T.fontSans, fontWeight: 700, fontSize: 10,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    boxShadow: `0 0 14px ${T.lilac}66`,
                  }}>● Active</span>
                  {exp && (
                    <span style={{ ...TY.small, color: warn ? '#f5c451' : T.text3, fontSize: 12, alignSelf: 'center' }}>
                      {exp}
                    </span>
                  )}
                </>
              ) : (
                <span style={{
                  padding: '5px 12px', borderRadius: T.r.pill,
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(167,139,250,0.35)',
                  color: T.lilac, fontFamily: T.fontSans, fontWeight: 600, fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <ILock size={10}/> Subscription required
                </span>
              )}
            </div>
          </div>
          {active ? (
            <button
              onClick={launch}
              style={{
                padding: '14px 28px', borderRadius: T.r.pill, border: 'none',
                background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
                color: '#fff', cursor: 'pointer', flexShrink: 0,
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 15,
                boxShadow: `0 6px 22px ${T.lilac}66`,
              }}
            >Launch KassaHub →</button>
          ) : (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 2 }}>Monthly subscription</div>
              <div style={{ ...TY.numMed, color: T.lilac, fontSize: 32, textShadow: `0 0 14px ${T.lilac}66` }}>
                {fmt(listing.price)}
              </div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>aura / month</div>
              <button
                onClick={subscribe}
                disabled={pending || locked}
                style={{
                  marginTop: 10, padding: '12px 24px', borderRadius: T.r.pill, border: 'none',
                  background: locked ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
                  color: locked ? T.text3 : '#fff',
                  cursor: pending ? 'progress' : locked ? 'not-allowed' : 'pointer',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 14,
                  boxShadow: locked ? 'none' : `0 6px 22px ${T.lilac}66`,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: pending ? 0.85 : 1,
                }}
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
      </Glass>

      {/* Features grid */}
      <div style={{ marginBottom: 18 }}>
        <SectionTitle label={active ? "What's inside" : "Why subscribe"} meta={active ? 'Hotkeys, shortcuts, panels' : 'Everything you get with Pro'}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {features.map((f) => (
            <Glass key={f.title} style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                width: 42, height: 42, borderRadius: T.r.md, marginBottom: 12,
                background: `linear-gradient(135deg, ${T.lilac}33, rgba(255,255,255,0.04))`,
                border: `0.5px solid ${T.lilac}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{f.icon}</div>
              <div style={{ ...TY.body, color: T.text, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
              <div style={{ ...TY.small, color: T.text3, fontSize: 12, lineHeight: 1.5 }}>{f.body}</div>
            </Glass>
          ))}
        </div>
      </div>

      {/* Screenshots (shared across states) */}
      {listing.screenshots?.length > 0 && (
        <Glass style={{ padding: 22, marginBottom: 18 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 12 }}>SCREENSHOTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {listing.screenshots.map((src, i) => (
              <div key={i} style={{
                aspectRatio: '16/10', borderRadius: T.r.md, overflow: 'hidden',
                border: `0.5px solid ${T.glassBorder}`, background: 'rgba(255,255,255,0.03)',
              }}>
                <img src={src} alt={`${listing.title} ${i + 1}`} loading="lazy"
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
              </div>
            ))}
          </div>
        </Glass>
      )}

      {/* About + license row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 18, alignItems: 'start' }}>
        <Glass style={{ padding: 22 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>ABOUT</div>
          <div style={{ ...TY.body, color: T.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{listing.description}</div>
        </Glass>
        <Glass style={{ padding: 22 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>LICENSE</div>
          {active ? (
            <>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>Pro · Monthly</div>
              <div style={{ ...TY.small, color: warn ? '#f5c451' : T.text3, marginTop: 6 }}>
                {exp || 'Active'}
              </div>
              <button
                onClick={() => setView({ id: 'library' })}
                style={{
                  marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: T.r.pill,
                  background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, cursor: 'pointer',
                  fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                }}
              >Manage in library</button>
            </>
          ) : (
            <>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>Not subscribed</div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 6, lineHeight: 1.5 }}>
                Unlock the full plugin for {fmt(listing.price)} aura per month. Cancel anytime.
              </div>
              <button
                onClick={subscribe}
                disabled={pending || locked}
                style={{
                  marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: T.r.pill, border: 'none',
                  background: locked ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
                  color: locked ? T.text3 : '#fff',
                  cursor: pending ? 'progress' : locked ? 'not-allowed' : 'pointer',
                  fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pending ? 0.85 : 1,
                }}
              >
                {pending && <Spinner size={11} color="#fff"/>}
                {pending ? 'Subscribing…' : 'Subscribe'}
              </button>
            </>
          )}
        </Glass>
      </div>
    </div>
  );
}

// Reachable via the sidebar `plugin:<listingId>` entries. For now this is a
// host shell: shows license status, a Launch button, and basic info. When a
// plugin is a separate Tauri app (like KassaHub) the Launch button will invoke
// a Tauri command to spawn its window — mocked below until the native side
// lands.
function PluginPanelView({ listingId, library, setView }) {
  const listing = (window.LISTINGS || []).find((x) => x.id === listingId);
  const entry = library.items.find((it) => it.listingId === listingId);
  const [, force] = React.useReducer((x) => x + 1, 0);
  // Re-render every 30s so the expiry countdown stays fresh.
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

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
    // Invoke a Tauri command if we're inside the Tauri runtime. For KassaHub
    // this will open its window; anything else is a no-op until wired.
    const inv = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
    if (inv) {
      inv('launch_plugin', { plugin: listing.id }).catch(() => {
        try { ElyNotify?.toast?.({ text: `${listing.title} launcher not wired yet`, kind: 'info' }); } catch {}
      });
    } else {
      try { ElyNotify?.toast?.({ text: `${listing.title} — launch coming soon`, kind: 'info' }); } catch {}
    }
  };

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
            onClick={launch}
            disabled={!active}
            style={{
              padding: '12px 22px', borderRadius: T.r.pill, border: 'none',
              background: active ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
              color: active ? '#fff' : T.text3,
              cursor: active ? 'pointer' : 'not-allowed',
              fontFamily: T.fontSans, fontWeight: 600, fontSize: 14,
              boxShadow: active ? `0 4px 18px ${T.accent}66` : 'none',
              flexShrink: 0,
            }}
          >
            {active ? 'Launch' : 'Inactive'}
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

// ──── MessagesView — inbox + conversation pane ────
// Two-pane layout: thread list on the left, active conversation on the right.
// Selecting a thread marks it read on the next tick, which clears the sidebar
// pip without flashing an unread state during the render. Composing uses
// Enter-to-send, Shift+Enter for newlines (standard chat expectation).
function MessagesView({ state, setView, messages, threadId, blocks, reports }) {
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
          <div style={{ ...TY.body, color: T.text2, marginBottom: 6 }}>No conversations yet.</div>
          <div style={{ ...TY.small, color: T.text3 }}>Open a creator's profile and hit Message to start one.</div>
          <button
            onClick={() => setView({ id: 'store' })}
            style={{
              marginTop: 16, padding: '8px 18px', borderRadius: T.r.pill, border: 'none',
              background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
              color: '#fff', cursor: 'pointer',
              fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
            }}
          >Browse marketplace</button>
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
                      {last ? (last.fromId === meId ? 'You: ' : '') + last.text : 'No messages yet'}
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
                            padding: '8px 12px',
                            borderRadius: mine
                              ? `14px 14px ${grouped ? 14 : 4}px 14px`
                              : `14px 14px 14px ${grouped ? 14 : 4}px`,
                            background: mine
                              ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`
                              : 'rgba(255,255,255,0.06)',
                            color: mine ? '#fff' : T.text,
                            border: mine ? 'none' : `0.5px solid ${T.glassBorder}`,
                            fontSize: 13, lineHeight: 1.45,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            boxShadow: mine ? `0 2px 12px ${T.accent}44` : 'none',
                          }}>
                            {m.text}
                            <div style={{
                              fontSize: 9.5,
                              marginTop: 4,
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

// ──── FeedView — novelties from creators the user follows ────
// Pulls every listing authored by a followed creator, newest first, and tags
// anything created after the last visit as "new". If the user follows nobody
// yet, we suggest the top creators so the page isn't a dead end. Also marks
// the feed as seen on mount so the sidebar pip clears.
function FeedView({ state, setView, follows, wishlist }) {
  // Mark seen on mount so the sidebar "N new" pip clears the instant you
  // land here. We still compute `sinceSeen` off the *captured* seen timestamp
  // so the "New" ribbons stay visible for this render.
  const seenAtMount = React.useRef(follows?.lastSeen || 0).current;
  React.useEffect(() => { follows?.markSeen?.(); /* eslint-disable-next-line */ }, []);

  const allListings = window.LISTINGS || [];
  const followed = follows?.items || [];
  const followedListings = allListings
    .filter((l) => followed.includes(l.sellerId))
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
            {followed.length} {followed.length === 1 ? 'creator' : 'creators'} · {followedListings.length} {followedListings.length === 1 ? 'listing' : 'listings'}
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
function MyLibraryView({ state, setView, library, purchaseListing }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = library.items
    .map((it) => ({ entry: it, listing: (window.LISTINGS || []).find((l) => l.id === it.listingId) }))
    .filter((r) => r.listing);

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
          </div>
        </div>
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

  const resolved = resolveTheme(tweaks);
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
