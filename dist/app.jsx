// ElyHub — app root. Routes views and composes the Shell.


// ────────────── App ──────────────

// ──────────────── Login gate ────────────────
// Full-screen pre-auth splash. Renders instead of the Shell tree when no
// Discord user is signed in. We still paint the drag strip ourselves so the
// window is draggable before sign-in (titleBarStyle "Overlay" has no native
// titlebar to grab). The CTA calls the same ElyAuth.signIn() the topbar uses
// — keeps the OAuth flow in one place. Errors surface inline rather than
// throwing, because a failed auth on the gate has nowhere else to land.
function LoginGate() {
  const [signingIn, setSigningIn] = React.useState(false);
  const [err, setErr] = React.useState(null);
  // Entrance animation: flips true on first rAF after mount, which triggers
  // every element's transition from its "pre-mount" style to its final
  // style. rAF (not a 0ms timer) is what guarantees the browser has painted
  // the initial frame — without it the transition doesn't fire because the
  // element starts its life already in the final state.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const startDrag = (e) => {
    if (e.button !== 0) return;
    const inv = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
    inv?.('plugin:window|start_dragging').catch(() => {});
  };

  // Helper — each inner element's stagger style. Index-based delay so we
  // can tweak the rhythm in one place. Delays in ms: 0, 100, 200, 300, 400…
  const staggered = (i, extra = {}) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 700ms ${EASE_EXPO_OUT} ${180 + i * 90}ms, transform 800ms ${EASE_EXPO_OUT} ${180 + i * 90}ms`,
    ...extra,
  });

  const onSignIn = async () => {
    if (signingIn || !window.ElyAuth?.signIn) return;
    setSigningIn(true);
    setErr(null);
    try {
      await window.ElyAuth.signIn();
      // App will re-render via ElyAuth.subscribe → gate falls away automatically.
    } catch (e) {
      console.error('[gate] sign-in failed', e);
      setErr(e?.message || 'Sign-in failed');
      setSigningIn(false);
    }
  };

  return (
    <>
      {/* Drag strip — same pattern as App() below, duplicated so the window
          is still draggable while the gate is showing. */}
      <div
        onMouseDown={startDrag}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 24, zIndex: 9999 }}
      />
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        {/* Keyframes for the gate's ambient drift — slower than the intro
            so the gate feels settled rather than cinematic. */}
        <style>{`
          @keyframes gateOrbA {
            0%, 100% { transform: translate(0, 0); }
            50%      { transform: translate(28px, -20px); }
          }
          @keyframes gateOrbB {
            0%, 100% { transform: translate(0, 0); }
            50%      { transform: translate(-22px, 18px); }
          }
        `}</style>

        {/* Ambient orbs — fade in on mount, then drift continuously.
            Slower cycles (18s/22s) than the intro orbs so the gate feels
            static-but-alive rather than cinematic. */}
        <div style={{
          position: 'absolute', top: '15%', left: '20%', width: 420, height: 420,
          opacity: mounted ? 1 : 0,
          transition: `opacity 1200ms ${EASE_EXPO_OUT}`,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: `radial-gradient(circle, ${T.accentGlow}, transparent 70%)`,
            filter: 'blur(80px)',
            animation: mounted ? 'gateOrbA 18s ease-in-out infinite' : 'none',
          }}/>
        </div>
        <div style={{
          position: 'absolute', bottom: '10%', right: '15%', width: 360, height: 360,
          opacity: mounted ? 1 : 0,
          transition: `opacity 1400ms ${EASE_EXPO_OUT} 120ms`,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,157,255,0.35), transparent 70%)',
            filter: 'blur(90px)',
            animation: mounted ? 'gateOrbB 22s ease-in-out infinite' : 'none',
          }}/>
        </div>

        {/* Card — scales from 0.96 + slides up + fades on mount. Expo-out
            easing matches the intro so the two screens feel part of one
            design language. */}
        <div style={{
          ...glass(2),
          position: 'relative',
          padding: '56px 64px',
          maxWidth: 480, width: '100%',
          textAlign: 'center',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(16px)',
          transition: `opacity 900ms ${EASE_EXPO_OUT}, transform 1000ms ${EASE_EXPO_OUT}`,
        }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 14, ...staggered(0) }}>ELYHUB</div>
          <div style={{ ...TY.display, fontSize: 56, marginBottom: 12, color: T.text, ...staggered(1) }}>
            Welcome<span style={{ color: T.accentHi }}>.</span>
          </div>
          <div style={{ ...TY.body, color: T.text2, maxWidth: 340, margin: '0 auto 36px', ...staggered(2) }}>
            {t('gate.blurb') || 'Sign in with Discord to access your aura, leaderboard, and rewards.'}
          </div>

          <button
            onClick={onSignIn}
            disabled={signingIn}
            style={{
              ...TY.body,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 28px',
              borderRadius: T.r.pill,
              border: 'none',
              background: signingIn ? T.glassBg2 : '#5865F2', // Discord brand blurple
              color: '#fff',
              fontWeight: 500,
              cursor: signingIn ? 'default' : 'pointer',
              boxShadow: signingIn ? 'none' : '0 8px 28px rgba(88,101,242,0.45)',
              minWidth: 240,
              ...staggered(3, {
                // Preserve the fast hover/pressed feedback by merging the
                // hover transition after the entrance stagger finishes.
                transition: `opacity 700ms ${EASE_EXPO_OUT} 450ms, transform 800ms ${EASE_EXPO_OUT} 450ms, background 160ms ease, box-shadow 160ms ease`,
              }),
            }}
          >
            {/* Inline Discord mark — no extra asset needed */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.372.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            {signingIn ? t('top.signingIn') : (t('gate.cta') || 'Continue with Discord')}
          </button>

          {err && (
            <div style={{ ...TY.small, color: T.red, marginTop: 18 }}>
              {err}
            </div>
          )}

          <div style={{ ...TY.small, color: T.text3, marginTop: 28, fontSize: 12, ...staggered(4) }}>
            {t('gate.hint') || 'You must be a member of the ElyHub Discord server.'}
          </div>
        </div>
      </div>
    </>
  );
}

// Top-level auth router. Swaps the entire tree between LoginGate and the
// authed app based on ElyAuth state. Keeping this as its own component (not
// an early return inside AuthedApp) is important — React's rules of hooks
// forbid conditional hook calls, so the authed app has to be a whole
// subtree that mounts/unmounts atomically when auth state flips. Side
// benefit: all the authed-only state (view, giftOpen, etc.) resets cleanly
// on sign-out since the subtree fully unmounts.
function App() {
  // Three render states, checked in order:
  //   1. Intro sequence — first-ever launch on this machine
  //   2. Login gate — not signed in (OAuth not completed)
  //   3. Authed app — everything else
  //
  // Crossfade: during the intro's final dissolve (~900ms), we mount the
  // LoginGate UNDER the intro so both are rendered together. The intro
  // fades/scales out on top while the gate animates in below — no blank
  // frame, no "seco" cut. `gateReveal` flips when the intro signals
  // onFadeStart; it stays true once set so the gate's mount state is stable
  // even after the intro unmounts (otherwise the gate would remount and
  // replay its entrance).
  const [introDone, setIntroDone] = React.useState(() => hasSeenIntro());
  const [gateReveal, setGateReveal] = React.useState(() => hasSeenIntro());
  const [authedUser, setAuthedUser] = React.useState(() => window.ElyAuth?.getCurrentUser?.() || null);
  React.useEffect(() => {
    const unsub = window.ElyAuth?.subscribe?.(() => {
      setAuthedUser(window.ElyAuth?.getCurrentUser?.() || null);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  if (authedUser) return <AuthedApp/>;

  // Pre-auth: render gate whenever gateReveal is true (either the intro has
  // handed off, or the intro was skipped entirely because it's been seen).
  // The intro is rendered on top of the gate so its phase-4 dissolve reads
  // as the two crossfading. Once introDone flips, the intro unmounts and
  // the gate is left alone — but because we mounted the gate earlier, its
  // entrance animation has already played by then.
  return (
    <>
      {gateReveal && <LoginGate/>}
      {!introDone && (
        <IntroSequence
          onFadeStart={() => setGateReveal(true)}
          onDone={() => { markIntroSeen(); setIntroDone(true); }}
        />
      )}
    </>
  );
}

function AuthedApp() {
  const [view, setView] = React.useState({ id: 'home' });
  // Force re-render whenever Turso pushes new leaderboard data OR when the
  // user switches language (i18n dictionary reads happen during render so a
  // forceUpdate is the simplest way to refresh every translated label).
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const sub = window.__subscribeLive;
    if (typeof sub !== 'function') return undefined;
    return sub(forceUpdate);
  }, []);
  React.useEffect(() => {
    const subI = window.ElyI18N?.subscribe;
    if (typeof subI !== 'function') return undefined;
    return subI(forceUpdate);
  }, []);
  // Ask for OS notification permission once on mount (no-op if already
  // granted/denied). Only bothers the user if they have push enabled in prefs.
  React.useEffect(() => {
    if (window.ElyNotify?.prefs?.push) {
      window.ElyNotify.requestPermission?.();
    }
  }, []);
  // Local gameplay state is a thin cache of ME so pre-auth screens still
  // render. The authoritative data lives on window.ME (refreshed by
  // data.jsx every ~5s), so most views now read ME.* directly — see HomeView
  // which derives aura/level/rank straight from ME. tagClaimed / boostClaimed
  // used to live here but were fake; now they come from ME.tagClaimedToday
  // and ME.boosterClaimedToday, set by data.jsx from the bot's Turso mirror.
  const [state, setState] = React.useState({ aura: ME.aura, level: ME.level, rank: ME.rank, streak: ME.streak });
  // Re-sync gameplay state when the underlying user changes (e.g. Discord sign-in
  // swaps ME to a different person) AND when the live poll refreshes ME.aura
  // so views that still read state.aura (Store, Profile, etc.) see the new total.
  React.useEffect(() => {
    setState((s) => ({ ...s, aura: ME.aura, level: ME.level, rank: ME.rank, streak: ME.streak }));
  }, [ME.id, ME.aura, ME.level, ME.rank, ME.streak]);
  // giftOpen can be a boolean (no preselection → show friend picker) OR a
  // member object (skip the picker, open straight on the amount step).
  const [giftOpen, setGiftOpen] = React.useState(false);
  const [redeem, setRedeem] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Global shortcuts: "?" opens the cheat sheet, "/" focuses the top search.
  // Both guard against editable-element focus so they never hijack a real
  // textfield. The "?" key arrives as Shift+/ on US layouts — key === '?' is
  // the portable check across layouts.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      const tag = ae && ae.tagName;
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || (ae && ae.isContentEditable);
      if (editable) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === '/') {
        const el = document.querySelector('input[data-topbar-search]');
        if (el) { e.preventDefault(); el.focus(); el.select?.(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [levelUp, setLevelUp] = React.useState(null);
  // First-time welcome. Computed from ME.id on every render — once the signed-in
  // user transitions from preview/null to a real id we haven't welcomed yet,
  // this flips true and the modal renders. markWelcomed() inside the modal
  // persists to localStorage, so subsequent renders read it as already welcomed.
  const [welcomeTick, setWelcomeTick] = React.useState(0);
  const showWelcome =
    ME && ME.id && !ME.isPreview && ME.id !== '__preview__' &&
    !wasWelcomed(ME.id);
  // When the user signs out/in, bump the tick so a fresh ME triggers a re-check
  // without waiting for a live poll.
  React.useEffect(() => {
    const sub = window.ElyAuth?.subscribe;
    if (typeof sub !== 'function') return undefined;
    return sub(() => setWelcomeTick((x) => x + 1));
  }, []);

  // data.jsx stashes the newest crossed level in __pendingLevelUp whenever it
  // detects a level-up. Consume it here after each live poll: if set AND we're
  // not already showing the takeover, fire it and clear. Chaining into the
  // takeover from a real level-up means the celebration isn't just a demo.
  React.useEffect(() => {
    const sub = window.__subscribeLive;
    if (typeof sub !== 'function') return undefined;
    return sub(() => {
      const pending = window.__pendingLevelUp;
      if (pending && !levelUp) {
        window.__pendingLevelUp = null;
        setLevelUp(pending);
      }
    });
  }, [levelUp]);
  const { tweaks, tweak, open: tweaksOpen, setOpen: setTweaksOpen, resolved: resolvedTheme, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride } = useTweaks();

  const onQuick = {
    gift: (member) => setGiftOpen(member && member.id ? member : true),
    redeem: (r) => setRedeem(r),
    settings: () => setSettingsOpen(true),
    shortcuts: () => setShortcutsOpen(true),
    levelUp: () => setLevelUp(state.level + 1),
    tour: () => tour.start(),
  };

  // Library — purchased / subscribed listings. Powers the dynamic plugin
  // sidebar nav items and the My Library view.
  const library = useLibrary();
  const publishing = usePublishing();
  const reviews = useReviews();
  const wishlist = useWishlist();
  const follows = useFollows();
  const recent = useRecentlyViewed();
  const messages = useMessages();
  const coupons = useCoupons();
  const reports = useReports();
  const blocks = useBlocks();
  const tour = useOnboarding();
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [editingListing, setEditingListing] = React.useState(null);
  const openPublish = () => { setEditingListing(null); setPublishOpen(true); };
  const openEdit = (l) => { setEditingListing(l); setPublishOpen(true); };

  // Marketplace purchase action. Optimistically debits aura locally; the
  // real backend wire-up will replace this with a server-authoritative call.
  const purchaseListing = (listing, couponCode) => {
    // Coupon resolution — silently ignore an invalid code rather than block
    // the sale (the UI should have already surfaced invalid state before the
    // user hit Buy). Successful redeem both debits the discounted price and
    // increments the coupon's usage counter.
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const res = coupons.validate(couponCode, listing);
      if (res.ok && res.coupon) {
        discount = res.discount || 0;
        appliedCoupon = res.coupon;
      }
    }
    const finalPrice = Math.max(0, (listing.price || 0) - discount);
    if (state.aura < finalPrice) return { ok: false, err: 'insufficient' };
    const entry = library.purchase({ ...listing, price: finalPrice });
    setState((s) => ({ ...s, aura: Math.max(0, s.aura - finalPrice) }));
    if (appliedCoupon) coupons.recordUse(appliedCoupon.code);
    return { ok: true, entry, discount, appliedCoupon, finalPrice };
  };

  // Auto-renew sweep. Fires every 60s. For each active subscription with
  // autoRenew && expiresAt in the past, try to extend it. If aura is short,
  // flip autoRenew off and notify — a lapsed sub should never spam retries.
  React.useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const it of library.items) {
        if (it.type !== 'subscription') continue;
        if (!it.autoRenew) continue;
        if (it.status !== 'active') continue;
        if (!it.expiresAt || it.expiresAt > now) continue;
        const listing = (window.LISTINGS || []).find((l) => l.id === it.listingId);
        if (!listing) continue;
        if (state.aura >= listing.price) {
          purchaseListing(listing);
          try { ElyNotify?.toast?.({ text: `${listing.title} auto-renewed — ${fmt(listing.price)} aura`, kind: 'success' }); } catch {}
        } else {
          library.setAutoRenew(it.listingId, false);
          try { ElyNotify?.toast?.({ text: `${listing.title} not renewed — not enough aura. Auto-renew paused.`, kind: 'warn' }); } catch {}
        }
      }
    };
    // Run once on mount in case we came back after the expiry window.
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library.items, state.aura]);

  // Custom view router — needs to handle dynamic ids like 'plugin:l-kassahub'
  // alongside the static map below.
  let mainView;
  if (view.id?.startsWith('plugin:')) {
    const listingId = view.id.slice('plugin:'.length);
    mainView = <PluginPanelView listingId={listingId} library={library} setView={setView}/>;
  } else {
    const contents = {
      home:        <HomeView state={state} setState={setState} setView={setView} onQuick={onQuick}/>,
      leaderboard: <LeaderboardView state={state} focusId={view.focusId} onQuick={onQuick}/>,
      store:       <MarketHomeView state={state} setView={setView} onQuick={onQuick} focusId={view.focusId} library={library} wishlist={wishlist} recent={recent} blocks={blocks}/>,
      discover:    <DiscoverView state={state} setView={setView} wishlist={wishlist} follows={follows} recent={recent} library={library} blocks={blocks}/>,
      listing:     <ListingDetailView state={state} setView={setView} onQuick={onQuick} focusId={view.focusId} library={library} purchaseListing={purchaseListing} reviews={reviews} wishlist={wishlist} follows={follows} recent={recent} messages={messages} coupons={coupons} reports={reports} blocks={blocks}/>,
      library:     <MyLibraryView state={state} setView={setView} library={library} purchaseListing={purchaseListing}/>,
      rewards:     <StoreView state={state} onQuick={onQuick} focusId={view.focusId}/>,
      claim:       <StoreView state={state} onQuick={onQuick} focusId={view.focusId}/>,
      kassahub:    <KassaHubView state={state} setView={setView} library={library} purchaseListing={purchaseListing}/>,
      dashboard:   <CreatorDashboardView state={state} setView={setView} publishing={publishing} onEdit={openEdit} reviews={reviews} messages={messages} coupons={coupons}/>,
      trophies:    <TrophiesView focusId={view.focusId}/>,
      saved:       <SavedView state={state} setView={setView} wishlist={wishlist}/>,
      feed:        <FeedView state={state} setView={setView} follows={follows} wishlist={wishlist}/>,
      messages:    <MessagesView state={state} setView={setView} messages={messages} threadId={view.threadId} blocks={blocks} reports={reports}/>,
      collection:  <CollectionView state={state} setView={setView} collectionId={view.collectionId} wishlist={wishlist}/>,
      profile:     (view.userId && view.userId !== (window.ME?.id || 'me'))
                     ? <CreatorProfileView userId={view.userId} state={state} setView={setView} onQuick={onQuick} reviews={reviews} wishlist={wishlist} follows={follows} messages={messages} reports={reports} blocks={blocks}/>
                     : <ProfileView state={state} onQuick={onQuick} setView={setView} onPublish={openPublish} onEdit={openEdit} publishing={publishing} wishlist={wishlist}/>,
    };
    mainView = contents[view.id] || contents.home;
  }

  return (
    <>
      {/* Invisible drag strip across the top of the window. With titleBarStyle
          "Overlay" there's no native title bar to grab, so we paint a 28px-tall
          region and call Tauri's startDragging() on mousedown. We tried the
          data-tauri-drag-region attribute but Tauri 2's auto-injection didn't
          reliably trigger — explicit invoke is bullet-proof. */}
      <div
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          // Use __TAURI_INTERNALS__ directly — it's always present regardless
          // of withGlobalTauri, and exposes the raw invoke bridge. The core
          // window plugin command is plugin:window|start_dragging.
          const inv =
            window.__TAURI_INTERNALS__?.invoke ||
            window.__TAURI__?.core?.invoke;
          inv?.('plugin:window|start_dragging').catch((err) => {
            console.warn('[drag] start_dragging failed', err);
          });
        }}
        onDoubleClick={() => {
          const inv =
            window.__TAURI_INTERNALS__?.invoke ||
            window.__TAURI__?.core?.invoke;
          inv?.('plugin:window|toggle_maximize').catch(() => {});
        }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 24,
          zIndex: 9999, cursor: 'default',
        }}
      />
      <Shell view={view} setView={setView} state={state} onQuick={onQuick} resolvedTheme={resolvedTheme} library={library} wishlist={wishlist} follows={follows} reviews={reviews} messages={messages}>
        {mainView}
      </Shell>
      {giftOpen && <GiftModal state={state} initialFriend={typeof giftOpen === 'object' ? giftOpen : null} onClose={() => setGiftOpen(false)} onSend={() => { /* bot's transferXp is authoritative; data.jsx poll will update ME.aura */ }}/>}
      {redeem && <RedeemModal reward={redeem} state={state} onClose={() => setRedeem(null)} onConfirm={() => { /* bot's worker is authoritative; data.jsx poll will update ME.aura */ }}/>}
      {settingsOpen && <SettingsModal tweaks={tweaks} tweak={tweak} resolvedTheme={resolvedTheme} updateCustom={updateCustom} selectCustom={selectCustom} addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot} updatePresetOverride={updatePresetOverride} onClose={() => setSettingsOpen(false)}/>}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)}/>}
      {levelUp && <LevelUpTakeover level={levelUp} onClose={() => setLevelUp(null)}/>}
      <PublishListingModal
        open={publishOpen}
        onClose={() => { setPublishOpen(false); setEditingListing(null); }}
        onPublish={publishing.publish}
        onUpdate={publishing.update}
        editing={editingListing}
      />
      {showWelcome && <WelcomeModal me={ME} onClose={() => setWelcomeTick((x) => x + 1)}/>}
      {tweaksOpen && <TweaksPanel tweaks={tweaks} tweak={tweak} onQuick={onQuick} onClose={() => setTweaksOpen(false)}/>}
      <ToastStack/>
      <OnboardingTour tour={tour}/>
    </>
  );
}

// In-app toast stack. Subscribes to ElyNotify toast events and renders each
// for 5s with a slide-in animation. Positioned top-right so it doesn't fight
// with the weekly banner or the aura feed panel.
function ToastStack() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    const N = window.ElyNotify;
    if (!N?.subscribeToasts) return undefined;
    return N.subscribeToasts((toast) => {
      setToasts((cur) => [...cur, toast]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== toast.id));
      }, 5000);
    });
  }, []);
  if (!toasts.length) return null;
  return (
    <div role="status" aria-live="polite" aria-atomic="false" style={{
      position: 'fixed', top: 20, right: 20, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        // Kind-specific accent stripe on the left — gives the user an instant
        // signal for whether it's a claim (green), gift (accent blue), level
        // (lilac), rank (blue). Same palette as tokens.jsx so everything feels
        // cohesive. Drop stays accent by default — treated as "new thing" like
        // a level-up.
        const accent =
          t.kind === 'claim'   ? T.green :
          t.kind === 'gift'    ? T.accentHi :
          t.kind === 'levelup' ? T.lilac :
          t.kind === 'rank'    ? T.blue :
          t.kind === 'drop'    ? T.accentHi :
          T.accentHi;
        return (
          <div key={t.id} style={{
            ...glass(1, {
              padding: '12px 16px 12px 18px', borderRadius: T.r.md,
              minWidth: 260, maxWidth: 340,
              animation: 'slideInR .25s cubic-bezier(.2,.9,.3,1.15)',
              pointerEvents: 'auto',
              position: 'relative', overflow: 'hidden',
            }),
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: accent, boxShadow: `0 0 12px ${accent}66`,
            }}/>
            <div style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
              {t.title}
            </div>
            <div style={{ ...TY.small, color: T.text2, fontSize: 12 }}>
              {t.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──── ErrorBoundary — last-resort crash catcher ────
// A React render error anywhere below this boundary flips the UI to a safe
// fallback instead of leaving the user with a white screen. We capture the
// error + component stack to surface on demand (dev builds) and expose a
// Reload button that does a full `location.reload()` — safer than trying to
// recover in place when we don't know what state got corrupted.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetails: false };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // Best-effort: log to ElyNotify so it shows up in the in-app toast stack
    // too, and to the console for devtools inspection.
    try {
      console.error('[ElyHub] Uncaught render error', error, info && info.componentStack);
      if (window.ElyNotify?.toast) {
        window.ElyNotify.toast({
          kind: 'error',
          title: 'Something broke',
          body: String(error && error.message || error),
        });
      }
    } catch {}
  }
  reload = () => { try { location.reload(); } catch {} };
  toggle = () => this.setState((s) => ({ showDetails: !s.showDetails }));
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error.message || this.state.error);
    const stack = (this.state.info && this.state.info.componentStack) || '';
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: '#05060A', color: '#fff',
        fontFamily: '"Inter Tight", -apple-system, system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 520, width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: -0.3 }}>
            Something broke
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 18 }}>
            ElyHub hit an unexpected error and had to stop. Reloading usually clears it — your
            local data is safe.
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 12, color: '#ffb4a8',
            background: 'rgba(255,60,60,0.08)',
            border: '0.5px solid rgba(255,60,60,0.25)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 18,
            wordBreak: 'break-word',
          }}>{msg}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={this.reload} style={{
              flex: 1, height: 42, border: 'none', cursor: 'pointer',
              borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 14,
              background: 'linear-gradient(180deg, #3d7bff, #2a5fd6)',
              boxShadow: '0 6px 20px rgba(61,123,255,0.35)',
            }}>Reload app</button>
            {stack ? (
              <button onClick={this.toggle} style={{
                height: 42, padding: '0 16px', cursor: 'pointer',
                borderRadius: 10, color: '#fff', fontWeight: 500, fontSize: 13,
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.14)',
              }}>{this.state.showDetails ? 'Hide' : 'Details'}</button>
            ) : null}
          </div>
          {this.state.showDetails && stack ? (
            <pre style={{
              marginTop: 16, maxHeight: 220, overflow: 'auto',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)',
              background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8,
              whiteSpace: 'pre-wrap',
            }}>{stack}</pre>
          ) : null}
        </div>
      </div>
    );
  }
}

// ──── OfflineBanner — passive network state indicator ────
// Listens to window online/offline events and renders a small pill at the
// top-center when the browser is offline. ElyHub is a desktop app so we
// almost always have network, but Tauri WKWebView still respects these
// events when the machine genuinely loses connectivity. Also watches for
// the Discord sync layer going silent for >90s as a soft-offline signal.
function OfflineBanner() {
  const [online, setOnline] = React.useState(() => {
    try { return typeof navigator !== 'undefined' ? navigator.onLine !== false : true; } catch { return true; }
  });
  const [stale, setStale] = React.useState(false);
  React.useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  // Soft-offline: if the data layer hasn't refreshed in >90s we warn too.
  // window.__lastDataSync is stamped by data.jsx on every successful poll.
  React.useEffect(() => {
    const id = setInterval(() => {
      const last = window.__lastDataSync || 0;
      if (!last) return;
      setStale(Date.now() - last > 90_000);
    }, 10_000);
    return () => clearInterval(id);
  }, []);
  if (online && !stale) return null;
  const label = !online ? 'You’re offline' : 'Reconnecting…';
  return (
    <div style={{
      position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10001, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      background: 'rgba(20,10,10,0.85)',
      border: '0.5px solid rgba(255,120,120,0.35)',
      borderRadius: 999,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      color: '#ffdcdc', fontSize: 12, fontWeight: 500,
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: !online ? '#ff6b6b' : '#ffb84d',
        boxShadow: `0 0 10px ${!online ? '#ff6b6b' : '#ffb84d'}`,
      }}/>
      {label}
    </div>
  );
}

// Wait for Turso's first fetch (if configured) so the initial render already
// has live data — otherwise the app briefly flashes mock data.
(async () => {
  try {
    if (window.__initialDataReady) {
      // Cap at 3s so a slow DB doesn't block boot entirely.
      await Promise.race([
        window.__initialDataReady,
        new Promise((res) => setTimeout(res, 3000)),
      ]);
    }
  } catch {}
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <ErrorBoundary>
      <OfflineBanner/>
      <App/>
    </ErrorBoundary>
  );
})();
