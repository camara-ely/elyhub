// marketplace.jsx — the creator-driven storefront.
//
// Extracted from app.jsx. Holds the full marketplace surface: listing cards,
// the home grid, the detail view (with its embedded reviews + media gallery),
// and the legacy reward-only Store kept for backward compat.
//
// Contents (roughly in order):
//   • Helpers          — ListingTypeIcon, listingTypeMeta, priceLine, SellerLine,
//                         effectiveRating, RatingChip, DownloadsChip
//   • Card pieces      — HeartButton, ShareMenu/ShareTrigger, FollowButton,
//                         Spinner, CoverFallback
//   • ListingCard      — the universal card used in every grid
//   • TopCreatorsRow   — horizontal strip of top sellers
//   • MarketHomeView   — /store landing page
//   • TypePill / FeaturedHeroCard — market home scaffolding
//   • Reviews          — StarPicker, StarRow, relativeTime, ReviewItem, ReviewsSection
//   • Media gallery    — ListingMediaGallery
//   • ListingDetailView — full product page
//   • StoreView / RewardCard — legacy aura-rewards shop

// ────────────── Marketplace ──────────────
// Replaces the old reward-only Store with a creator-driven marketplace:
// plugins, themes, backgrounds, sound packs, presets, 3D rigs, templates.
// Every listing has a seller (a real MEMBERS entry) and lives at its own
// detail page. Sub-views:
//   MarketHomeView    — featured hero, trending, top creators, category tiles
//   ListingDetailView — full page for a single listing
//   ListingCard       — shared card used everywhere a listing is rendered

// Tiny inline icon by listing type. Inline so we don't fight imports — these
// are pure SVG and the marketplace is self-contained.
function ListingTypeIcon({ type, size = 14, color }) {
  const c = color || 'currentColor';
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'plugin':     return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M17 13v3m0 4v0m-4-3h3m4 0h0"/></svg>;
    case 'theme':      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18M3 12h18"/></svg>;
    case 'background': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-4 4 3 5-4 4 3"/></svg>;
    case 'sfx':        return <svg {...common}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/></svg>;
    case 'preset':     return <svg {...common}><path d="M4 6h16M4 12h10M4 18h16"/><circle cx="17" cy="12" r="1.6"/></svg>;
    case 'rig':        return <svg {...common}><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 22V12"/></svg>;
    case 'template':   return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
    default:           return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function listingTypeMeta(type) {
  return (window.LISTING_TYPES || []).find((t) => t.id === type) || { id: type, label: type, hue: T.accent };
}

function priceLine(l) {
  return l.billing === 'monthly' ? `${fmt(l.price)} / month` : fmt(l.price);
}

// Compact "by @tag · L42" line. Resolves sellerId → MEMBERS entry. Clicking
// the name opens the seller's profile.
function SellerLine({ sellerId, onSeller, size = 11 }) {
  const seller = (window.MEMBERS || []).find((m) => m.id === sellerId);
  // Fallback when the seller isn't in the client-side MEMBERS array — happens
  // for backend-seeded demos (e.g. `demo-seller-0001`) and newly published
  // listings before the user table is hydrated. Show a muted, unclickable
  // "by Unknown" instead of collapsing the footer to an empty strip.
  if (!seller) {
    // If it's the current user's own listing, say "by you" — nicer than
    // falling through the generic path. For everyone else we show
    // "Creator" as a soft placeholder: data.jsx hydrates the real name
    // shortly after /listings returns, so this only shows for a blink.
    const me = window.ME;
    const isMe = me && me.id === sellerId;
    return (
      <span style={{
        ...TY.small, fontSize: size, color: T.text3,
        display: 'inline-flex', alignItems: 'center', gap: 4, opacity: isMe ? 1 : 0.7,
      }}>
        by <span style={{ color: T.text2, fontWeight: 500 }}>{isMe ? 'you' : 'Creator'}</span>
      </span>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSeller?.(seller); }}
      style={{
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        ...TY.small, fontSize: size, color: T.text3, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = T.text2; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = T.text3; }}
    >
      by <span style={{ color: T.text2, fontWeight: 500 }}>{seller.name.split(' ')[0]}</span>
    </button>
  );
}

// Resolve the rating shown to users. Reviews are the source of truth — if the
// listing has any, use the computed average + count. Otherwise fall back to
// whatever shipped with the seed data (which for user-published listings is 0).
function effectiveRating(l) {
  const stats = reviewStatsForListing(l.id);
  if (stats.count > 0) return { rating: stats.avg, count: stats.count };
  return { rating: l.rating || 0, count: l.reviewCount || 0 };
}

// Star + rating chip. Compact, monospaced number.
function RatingChip({ rating, count, size = 11 }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.text2, fontFamily: T.fontSans, fontSize: size, fontVariantNumeric: 'tabular-nums' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD166" stroke="none"><path d="m12 2 2.9 6.9 7.1.6-5.4 4.7 1.7 7L12 17.8 5.7 21.2l1.7-7L2 9.5l7.1-.6z"/></svg>
      <span>{rating.toFixed(2)}</span>
      {count != null && <span style={{ color: T.text3 }}>({fmt(count)})</span>}
    </span>
  );
}

// Compact downloads chip — "1.2K installs" / "412 installs". Uses K notation
// so the chip never grows past 5–6 chars.
function DownloadsChip({ n, size = 11 }) {
  if (!n) return null;
  const label = n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${n}`;
  return (
    <span style={{ ...TY.small, fontSize: size, color: T.text3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>
      {label}
    </span>
  );
}

// ──── ListingCard — universal marketplace card ────
// Shape mirrors RewardCard so they live happily side by side, but keys off
// the richer LISTING schema: type icon, seller line, rating, downloads,
// subscription badge, level lock.
// ──── HeartButton — wishlist toggle. Animated fill, glow when saved. ────
// Called from ListingCard + ListingDetailView. Uses an onToggle callback so
// the parent doesn't have to thread wishlist methods into every child.
function HeartButton({ saved, onToggle, size = 18, solid = false }) {
  // `solid` used to swap the entire circle to a pink gradient when saved — it
  // read as a primary action rather than "saved" state and drowned out the
  // adjacent Subscribe button. Now the circle is always dark glass; only the
  // heart icon fills pink + a soft halo indicates the saved state, matching
  // how the marketplace cards have always done it.
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
      title={saved ? 'Remove from saved' : 'Save for later'}
      style={{
        width: size + 14, height: size + 14, borderRadius: '50%',
        background: 'rgba(8,10,18,0.62)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: `0.5px solid ${saved ? 'rgba(255,107,143,0.55)' : T.glassBorder}`,
        color: saved ? '#ff6b8f' : T.text3,
        cursor: 'pointer', padding: 0, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .18s cubic-bezier(.2,.9,.3,1.15)',
        boxShadow: saved ? '0 0 14px rgba(255,107,143,0.35)' : 'none',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24"
           fill={saved ? 'currentColor' : 'none'}
           stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
           style={{
             transform: saved ? 'scale(1.06)' : 'scale(1)',
             transition: 'transform .18s cubic-bezier(.2,.9,.3,1.4)',
             // Path's drawable extent is y=4.61..21.23 out of a 24-viewBox —
             // ~0.6 units below geometric center. Nudge up so the glyph looks
             // optically centered inside the circle.
             transformOrigin: '50% 50%',
             marginTop: -1,
           }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}

// ──── ShareMenu — popover with quick-copy affordances for a listing ────
// Three flavours, each optimised for where a user typically pastes:
//   • Link       → elyhub://listing/<id>   deep-link back into the app
//   • Discord    → markdown block with title, price, seller, link   (this is
//                  a Discord community, so most "shares" will end up there)
//   • Plain text → just the title + price   for casual mentions
//
// Uses navigator.clipboard with a document.execCommand fallback for environments
// that don't expose it (older WKWebView builds). Each option briefly flashes
// "Copied" inside the menu so the user gets feedback without a toast spam.
function ShareMenu({ listing, seller, onClose, anchorRef, onSendDM }) {
  const [copied, setCopied] = React.useState(null); // which item just flashed
  const menuRef = React.useRef(null);

  // Compute viewport-relative position off the anchor button. We portal to
  // <body> so that sibling cards with `backdrop-filter` (each a fresh
  // stacking context in WebKit) can't paint over us. Recomputed on resize
  // and scroll so the menu tracks the anchor if the page moves under it.
  const [pos, setPos] = React.useState(() => {
    const r = anchorRef?.current?.getBoundingClientRect?.();
    return r ? { top: r.bottom + 8, right: window.innerWidth - r.right } : { top: 0, right: 0 };
  });
  React.useEffect(() => {
    const update = () => {
      const r = anchorRef?.current?.getBoundingClientRect?.();
      if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('resize', update);
    // Use capture so we catch scrolls on inner containers (the page often
    // scrolls inside a wrapper div, not the window).
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  // Close on outside click or Escape.
  React.useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)
          && !anchorRef?.current?.contains?.(e.target)) onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, anchorRef]);

  const writeClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const deepLink = `elyhub://listing/${listing.id}`;
  const priceLine = listing.price
    ? `${fmt(listing.price)} aura${listing.billing === 'monthly' ? '/mo' : ''}`
    : 'Free';
  const markdown = [
    `**${listing.title}**`,
    listing.tagline || listing.sub ? `_${listing.tagline || listing.sub}_` : null,
    `${priceLine}${seller ? ` · by **${seller.name}**` : ''}`,
    `<${deepLink}>`,
  ].filter(Boolean).join('\n');
  const plain = `${listing.title} — ${priceLine}${seller ? ` by ${seller.name}` : ''}`;

  const items = [
    // DM item is a special action — doesn't copy, opens the picker modal.
    // Kind marker lets activate() branch.
    { id: 'dm',       kind: 'dm',   label: 'Send to someone…',     sub: 'Pick a member · delivers via Discord' },
    { id: 'link',     kind: 'copy', label: 'Copy link',            sub: deepLink,                                text: deepLink  },
    { id: 'discord',  kind: 'copy', label: 'Copy as Discord post', sub: `${listing.title} + price + link`,       text: markdown },
    { id: 'plain',    kind: 'copy', label: 'Copy title + price',   sub: plain,                                   text: plain    },
  ];

  const activate = async (it) => {
    if (it.kind === 'dm') {
      onSendDM?.();
      return;
    }
    const ok = await writeClipboard(it.text);
    if (ok) {
      setCopied(it.id);
      try { ElyNotify?.toast?.({ text: 'Copied to clipboard', kind: 'success' }); } catch {}
      setTimeout(() => { setCopied((c) => (c === it.id ? null : c)); onClose?.(); }, 900);
    }
  };

  const menuNode = (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, right: pos.right, zIndex: 9000,
        minWidth: 280,
        ...glass(2, {
          padding: 6, borderRadius: T.r.md,
          animation: 'slideUp .14s cubic-bezier(.2,.9,.3,1.05)',
        }),
      }}
    >
      <div style={{ ...TY.micro, color: T.text3, padding: '6px 10px 4px' }}>SHARE</div>
      {items.map((it) => {
        const isCopied = copied === it.id;
        return (
          <button
            key={it.id}
            onClick={() => activate(it)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', textAlign: 'left',
              padding: '9px 10px', borderRadius: T.r.sm,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.text,
              transition: 'background .12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: T.r.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isCopied ? `${T.green}22` : 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${isCopied ? `${T.green}55` : T.glassBorder}`,
              color: isCopied ? T.green : T.text2,
              flexShrink: 0,
              transition: 'all .18s',
            }}>
              {isCopied
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10"/></svg>
                : it.kind === 'dm'
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  : <ICopy size={13}/>}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{isCopied ? 'Copied!' : it.label}</span>
              <span style={{
                display: 'block', fontSize: 11, color: T.text3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontFamily: it.id === 'link' ? T.fontMono : T.fontSans,
              }}>
                {it.sub}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
  return ReactDOM.createPortal(menuNode, document.body);
}

// ──── DMPickerModal — pick a member to DM this listing to ────
//
// Posts the listing into the in-app DM thread with the chosen member
// (via useMessages.send) and navigates to that thread so the user sees
// their message land and can follow up. No Discord round-trip — we used
// to punt out via the discord:// deep-link but that felt broken (modal
// closed, nothing visible happened) so we keep it inside the app.
//
// Picks the recipient list from window.MEMBERS (populated by the
// leaderboard poll). If MEMBERS is empty (fresh login, pre-hydrate) we
// show a hint rather than a blank list. Recent recipients float to the
// top via localStorage (`ely.dm.recent.v1`).
const DM_RECENT_KEY = 'ely.dm.recent.v1';
function loadDmRecent() {
  try {
    const raw = localStorage.getItem(DM_RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveDmRecent(ids) {
  try { localStorage.setItem(DM_RECENT_KEY, JSON.stringify(ids.slice(0, 12))); } catch {}
}

function DMPickerModal({ listing, seller, messages, setView, onClose }) {
  if (T.zodiac && window.ZodiacDMPickerModal) {
    return <window.ZodiacDMPickerModal listing={listing} seller={seller} messages={messages} setView={setView} onClose={onClose}/>;
  }
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  const recentIds = loadDmRecent();
  const me = window.ME || {};
  const members = Array.isArray(window.MEMBERS) ? window.MEMBERS : [];

  // Filter out self + the seller (sending a listing to its own seller is
  // odd). Apply query filter (name/tag, case-insensitive). Recent ids
  // sort first, then alphabetical.
  const qNorm = q.trim().toLowerCase();
  const filtered = members
    .filter((m) => m.id !== me.id && m.id !== seller?.id)
    .filter((m) => {
      if (!qNorm) return true;
      return (m.name || '').toLowerCase().includes(qNorm)
          || (m.tag || '').toLowerCase().includes(qNorm);
    })
    .sort((a, b) => {
      const ai = recentIds.indexOf(a.id);
      const bi = recentIds.indexOf(b.id);
      if (ai !== bi) {
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const send = (member) => {
    // Post a listing *attachment* rather than a text blob with a URL — the
    // thread view renders it as a clickable card (cover + title + price)
    // via the `attachment` field on the message.
    let threadId = null;
    try {
      threadId = messages?.startThread?.(member.id) || null;
      messages?.send?.(member.id, '', { type: 'listing', id: listing.id });
    } catch (err) {
      console.warn('[dm-picker] send failed', err);
      try { ElyNotify?.toast?.({ text: `Couldn't send — try again`, kind: 'warn' }); } catch {}
      return;
    }

    // Remember this recipient so they float to the top of the picker next time.
    const next = [member.id, ...recentIds.filter((x) => x !== member.id)];
    saveDmRecent(next);

    try {
      ElyNotify?.toast?.({
        text: `Sent to ${member.name}`,
        kind: 'success',
      });
    } catch {}
    onClose?.();
    // Jump straight into the conversation so the user sees their message
    // land (and can type a follow-up without hunting for the thread).
    if (threadId && setView) {
      setView({ id: 'messages', threadId });
    }
  };

  // Portal to <body> so the fixed overlay escapes any transform/filter
  // ancestor that would otherwise create a containing block and trap it
  // inline next to the Share button (we saw this exact bug — modal rendered
  // glued to the trigger instead of covering the viewport).
  const overlay = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn .14s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          ...glass(2, { padding: 14, borderRadius: T.r.lg }),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ ...TY.micro, color: T.text3 }}>SHARE</div>
            <div style={{ ...TY.h3, color: T.text, fontSize: 18, marginTop: 2 }}>
              {listing.title}
            </div>
            <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 2 }}>
              Pick a friend to send this listing to
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
              color: T.text3, cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px', borderRadius: T.r.md,
            background: 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${T.glassBorder}`,
            color: T.text, fontFamily: T.fontSans, fontSize: 13,
            outline: 'none', marginBottom: 10,
          }}
        />
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ ...TY.small, color: T.text3, padding: '20px 8px', textAlign: 'center' }}>
              {members.length === 0
                ? 'Member list is still loading — try again in a moment.'
                : 'No matches.'}
            </div>
          ) : filtered.map((m, i) => {
            const isRecent = recentIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => send(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  padding: '9px 8px', borderRadius: T.r.sm,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: T.text, transition: 'background .12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: m.avatar ? `url(${m.avatar}) center/cover` : 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${T.glassBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.text3, fontSize: 12, fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {!m.avatar && (m.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: T.text3, fontFamily: T.fontMono }}>@{m.tag || m.id.slice(0, 6)}</div>
                </div>
                {isRecent && i < 3 && (
                  <span style={{
                    ...TY.micro, color: T.text3, fontSize: 9, letterSpacing: 0.5,
                    padding: '2px 6px', borderRadius: T.r.pill,
                    background: 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${T.glassBorder}`,
                  }}>RECENT</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(overlay, document.body);
}

// ShareTrigger — glass pill that opens the ShareMenu popover. Positioned
// relatively so the menu anchors off this element. Matches HeartButton sizing
// so the two sit cleanly side-by-side in the CTA row.
function ShareTrigger({ listing, seller, messages, setView }) {
  // We used to pop an intermediate ShareMenu with copy-link / copy-markdown
  // options, but the only one anyone ever wanted was "Send to a friend",
  // and the rest felt like noise. Click now opens the DM picker directly.
  const [dmOpen, setDmOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setDmOpen(true); }}
        title="Share with a friend"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: dmOpen ? 'rgba(255,255,255,0.10)' : 'rgba(8,10,18,0.62)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `0.5px solid ${dmOpen ? T.glassBorder2 : T.glassBorder}`,
          color: dmOpen ? T.text : T.text3,
          cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .18s cubic-bezier(.2,.9,.3,1.15)',
        }}
      >
        {/* The share glyph (two nodes on the right, one on the left) has its
            visual centroid ~2 units right of the 24-viewBox center. Nudge
            left so it sits cleanly inside the circle rather than looking
            like it's drifting right. */}
        <span style={{ display: 'inline-flex', marginLeft: -1 }}>
          <IShare size={15}/>
        </span>
      </button>
      {dmOpen && (
        <DMPickerModal
          listing={listing}
          seller={seller}
          messages={messages}
          setView={setView}
          onClose={() => setDmOpen(false)}
        />
      )}
    </div>
  );
}

// ──── FollowButton — toggles a creator follow. Two sizes:
//   size="md"  — pill with "Follow" / "Following" label (used on profile header)
//   size="sm"  — compact pill, icon-only when following, used in seller cards
// Colour scheme uses the accent stack so it reads as a first-party action
// (matching Subscribe) rather than a social action (pink, like the heart).
function FollowButton({ followed, onToggle, size = 'md', stopPropagation = true }) {
  const isSmall = size === 'sm';
  const [hover, setHover] = React.useState(false);
  const label = followed
    ? (hover && !isSmall ? 'Unfollow' : 'Following')
    : 'Follow';
  return (
    <button
      onClick={(e) => { if (stopPropagation) e.stopPropagation(); onToggle?.(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={followed ? 'Unfollow creator' : 'Follow creator'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: isSmall ? '4px 10px' : '7px 14px',
        borderRadius: T.r.pill,
        background: followed
          ? (hover ? 'rgba(255,90,110,0.12)' : 'rgba(255,255,255,0.06)')
          : `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
        border: followed
          ? `0.5px solid ${hover ? 'rgba(255,90,110,0.45)' : T.glassBorder}`
          : 'none',
        color: followed
          ? (hover ? '#ff9aa8' : T.text2)
          : '#fff',
        fontFamily: T.fontSans, fontWeight: 600,
        fontSize: isSmall ? 11 : 12,
        cursor: 'pointer',
        boxShadow: followed ? 'none' : `0 2px 12px ${T.accent}55`,
        transition: 'all .18s cubic-bezier(.2,.9,.3,1.15)',
        lineHeight: 1.1,
      }}
    >
      {!followed && <span style={{ fontSize: isSmall ? 12 : 14, marginTop: -1 }}>+</span>}
      {followed && hover && !isSmall && <span style={{ fontSize: 12, marginTop: -1 }}>×</span>}
      {followed && !hover && (
        <svg width={isSmall ? 10 : 12} height={isSmall ? 10 : 12} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10"/>
        </svg>
      )}
      {label}
    </button>
  );
}

// ──── Spinner — tiny inline loading spinner for CTAs (Subscribe/Renew).
// Uses the btnSpin keyframe defined in index.html. Stroke is a conic-gradient
// ring with a transparent gap so it reads as "working" rather than "dead".
function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%',
      border: `2px solid ${color}44`,
      borderTopColor: color,
      animation: 'btnSpin .7s linear infinite',
      flexShrink: 0,
    }}/>
  );
}

// ──── CoverFallback — the layered placeholder used when a listing has no
// cover image (or the image 404s). Subtle tiled dot grid + oversize type icon
// centered with a soft glow. Way nicer than a flat gradient — and recognizable
// by type at a glance. Seeded to the listing id so the grid's phase is stable.
function CoverFallback({ type, seed = 0, size = 56 }) {
  const meta = listingTypeMeta(type);
  // Hash the seed to offset the pattern by a few px in each axis so different
  // listings don't look copy-pasted.
  let h = 0; const s = String(seed);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const ox = Math.abs(h % 16), oy = Math.abs((h >> 4) % 16);
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(120% 120% at 20% 10%, ${meta.hue}44, rgba(255,255,255,0.02) 60%)`,
    }}>
      {/* Dot-grid pattern, very faint. backgroundPosition jittered by seed. */}
      <div style={{
        position: 'absolute', inset: -2,
        backgroundImage: `radial-gradient(${meta.hue}33 1px, transparent 1.2px)`,
        backgroundSize: '16px 16px',
        backgroundPosition: `${ox}px ${oy}px`,
        opacity: 0.6,
      }}/>
      {/* Glow blob behind the icon. */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: size * 2.4, height: size * 2.4,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(closest-side, ${meta.hue}44, transparent 70%)`,
        filter: 'blur(6px)',
        pointerEvents: 'none',
      }}/>
      {/* Center icon */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        color: meta.hue, opacity: 0.82,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: `drop-shadow(0 0 14px ${meta.hue}66)`,
      }}>
        <ListingTypeIcon type={type} size={size}/>
      </div>
    </div>
  );
}

function ListingCard({ l, state, onOpen, onSeller, compact = false, index = 0, wishlist }) {
  const meta = listingTypeMeta(l.type);
  const levelLocked = state.level < (l.level || 1);
  const auraShort = state.aura < l.price;
  const locked = levelLocked || auraShort;
  // "New" badge for listings created within the last 48h. Matches the
  // createdAt stamp written by usePublishing(); seed data has no createdAt so
  // it stays off for them.
  const isNew = l.createdAt && (Date.now() - l.createdAt) < 48 * 3600 * 1000;
  // Stagger entry: each card in a grid starts slightly later than the previous
  // one, capped at ~180ms so big result sets don't feel sluggish.
  const delay = Math.min(index * 30, 180);
  // Custom hover — typed-color glow + bigger lift than the default Glass hover.
  // We skip Glass's hover prop and wire our own so the shadow picks up meta.hue.
  const onEnter = (e) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = `inset 0 1px 0 ${T.glassHi}, 0 18px 48px rgba(0,0,0,0.5), 0 0 0 0.5px ${meta.hue}66, 0 0 30px ${meta.hue}33`;
    e.currentTarget.style.borderColor = meta.hue + '88';
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = `inset 0 1px 0 ${T.glassHi}, 0 10px 40px rgba(0,0,0,0.35)`;
    e.currentTarget.style.borderColor = T.glassBorder;
  };
  return (
    <Glass
      onClick={() => onOpen?.(l)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        padding: compact ? 12 : 14,
        opacity: levelLocked ? 0.55 : 1,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        cursor: 'pointer',
        animation: `cardRise .42s cubic-bezier(.2,.9,.3,1.1) both`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{
        aspectRatio: compact ? '16/10' : '4/3', borderRadius: T.r.md, marginBottom: 12,
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.02))`,
        border: `0.5px solid ${T.glassBorder}`,
      }}>
        <CoverFallback type={l.type} seed={l.id} size={compact ? 40 : 52}/>
        {l.cover && (
          <img src={l.cover} alt={l.title} loading="lazy"
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
               onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
        )}
        {/* Type chip — top-left. Icon-only when the cover has room for
            text would push us over budget; kept tight so the cover art
            breathes. NEW flag lives in the same chip as a small accent dot
            rather than its own pill, which was visually shouting. */}
        <span style={{
          position: 'absolute', top: 10, left: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: T.r.pill,
          background: 'rgba(8,10,18,0.62)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `0.5px solid ${meta.hue}55`,
          color: meta.hue,
          fontFamily: T.fontSans, fontWeight: 600, fontSize: 9,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <ListingTypeIcon type={l.type} size={10}/>
          {meta.label.replace(/s$/, '')}
          {isNew && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: T.accentHi,
              boxShadow: `0 0 6px ${T.accent}cc`,
              marginLeft: 2,
            }}/>
          )}
        </span>
        {/* Top-right — heart only. Monthly/Weekly billing is already signaled
            by the "/mo" suffix beside the price, so a cover badge was just
            noise. Hidden on your own listings — saving something you sell
            doesn't make sense. */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          {wishlist && (
            <HeartButton
              saved={wishlist.has(l.id)}
              onToggle={() => wishlist.toggle(l.id)}
              size={14}
            />
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500, lineHeight: 1.25 }}>{l.title}</div>
      </div>
      <div style={{ ...TY.small, color: T.text3, marginTop: 2, marginBottom: 10, lineHeight: 1.35 }}>{l.tagline || l.sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{
            ...TY.numSm,
            color: locked ? T.text2 : T.accentHi,
            fontSize: 14,
            textShadow: locked ? 'none' : `0 0 10px ${T.accentGlow}`,
          }}>
            {fmt(l.price)}
          </div>
          {l.billing === 'monthly' && (
            <span style={{ ...TY.small, fontSize: 11, color: T.text3 }}>/mo</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {(() => { const er = effectiveRating(l); return er.rating > 0 && <RatingChip rating={er.rating}/>; })()}
          {l.downloads > 0 && <DownloadsChip n={l.downloads}/>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `0.5px solid ${T.glassBorder}`, gap: 8 }}>
        <SellerLine sellerId={l.sellerId} onSeller={onSeller}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Posted-date stamp — only for listings with a real createdAt (seed
              demos don't have one). Helps users gauge freshness when sorting
              by date or browsing "Just launched". */}
          {l.createdAt && (
            <span style={{ ...TY.small, color: T.text3, fontSize: 10 }} title={new Date(l.createdAt).toLocaleString()}>
              {relativeTime(l.createdAt)}
            </span>
          )}
          {levelLocked && <Tag muted><ILock size={10}/>&nbsp;L{l.level}</Tag>}
        </div>
      </div>
    </Glass>
  );
}

// ──── Top Creators row ────
// Shows top 4 sellers ranked by lifetime sales. Each card opens the seller's
// profile. Uses HoverOrbs for the same liquid-glass hover treatment as
// reward cards.
function TopCreatorsRow({ onSeller }) {
  const ranked = (window.MEMBERS || [])
    .map((m) => ({ ...m, stats: getCreatorStats(m.id) }))
    .filter((m) => m.stats.listings > 0)
    .sort((a, b) => b.stats.sales - a.stats.sales)
    .slice(0, 4);
  if (!ranked.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {ranked.map((m, i) => (
        <Glass key={m.id} hover onClick={() => onSeller?.(m)}
               style={{ padding: 14, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
          <HoverOrbs restX={20} restY={30} size={260} color={T.accent} colorHi={T.accentHi}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <Avatar name={m.name} src={m.avatar} size={36}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
              <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>@{m.tag}</div>
            </div>
            <div style={{ ...TY.micro, color: T.text3 }}>#{i + 1}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, position: 'relative' }}>
            <div>
              <div style={{ ...TY.numSm, color: T.text, fontSize: 14 }}>{m.stats.listings}</div>
              <div style={{ ...TY.micro, color: T.text3 }}>Listings</div>
            </div>
            <div>
              <div style={{ ...TY.numSm, color: T.text, fontSize: 14 }}>{fmt(m.stats.sales)}</div>
              <div style={{ ...TY.micro, color: T.text3 }}>Sales</div>
            </div>
            <div>
              <div style={{ ...TY.numSm, color: T.text, fontSize: 14 }}>{m.stats.avgRating.toFixed(1)}</div>
              <div style={{ ...TY.micro, color: T.text3 }}>Rating</div>
            </div>
          </div>
        </Glass>
      ))}
    </div>
  );
}

// ──── MarketHome — landing view of /store ────
function MarketHomeView({ state, setView, onQuick, focusId, wishlist, recent, blocks, onPublish }) {
  // Zodiac gate — delegates to the celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacMarketHomeView) {
    return <window.ZodiacMarketHomeView state={state} setView={setView} onQuick={onQuick} focusId={focusId} wishlist={wishlist} recent={recent} blocks={blocks} onPublish={onPublish}/>;
  }
  const [activeType, setActiveType] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('trending'); // trending | new | priceAsc | priceDesc | rating
  // Richer filters — collapsed by default to keep the page calm. `filtersOpen`
  // flips the panel open; the chip on the toggle button shows how many filters
  // are currently constraining the result set.
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [priceMin, setPriceMin] = React.useState('');
  const [priceMax, setPriceMax] = React.useState('');
  const [ratingFloor, setRatingFloor] = React.useState(0); // 0 | 3 | 4 | 4.5
  const [billing, setBilling] = React.useState('any'); // any | one-time | monthly
  const [affordable, setAffordable] = React.useState(false);
  const [activeTags, setActiveTags] = React.useState([]); // multi-select
  React.useEffect(() => { if (focusId) setActiveType('all'); }, [focusId]);
  useFocusHighlight(focusId);

  // Drop listings from blocked sellers out of every derived list below.
  // First-party Kassa products (Hugin etc.) DO appear in the marketplace —
  // owner reverted the earlier "hide them entirely" rule because removing
  // them made the storefront look incomplete. Tier-alias rows are still
  // collapsed via dedupTieredListings so a tiered product (1key + 2key)
  // shows as one card; clicking it still routes to the dedicated Zephyro
  // page (see ListingDetailView's isHugin redirect).
  const baseListings = window.dedupTieredListings
    ? window.dedupTieredListings(window.LISTINGS || [])
    : (window.LISTINGS || []);
  const all = baseListings
    .filter((l) => !(blocks && blocks.has(l.sellerId)));
  const featured = all.filter((l) => l.featured);
  // Freshly published listings, newest first. Its own strip right under the
  // hero so a creator who just hit "Publish" sees their item immediately
  // without scrolling past trending/top creators/etc.
  const justLaunched = [...all]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8);
  const trending = [...all].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 6);

  // Text search matches title, tagline, tags, seller name. Case-insensitive.
  const q = query.trim().toLowerCase();
  const matchesQ = (l) => {
    if (!q) return true;
    if (l.title?.toLowerCase().includes(q)) return true;
    if (l.tagline?.toLowerCase().includes(q)) return true;
    if (l.tags?.some((t) => t.toLowerCase().includes(q))) return true;
    const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
    if (seller?.name.toLowerCase().includes(q)) return true;
    if (seller?.tag.toLowerCase().includes(q)) return true;
    return false;
  };
  // All structured filters in one predicate — kept separate from matchesQ so
  // the tag cloud below can compute counts that already respect type+query
  // but not tag selection itself (otherwise the cloud would collapse once a
  // tag is picked).
  const pMin = priceMin === '' ? null : Number(priceMin);
  const pMax = priceMax === '' ? null : Number(priceMax);
  const matchesFilters = (l) => {
    if (pMin != null && !Number.isNaN(pMin) && (l.price || 0) < pMin) return false;
    if (pMax != null && !Number.isNaN(pMax) && (l.price || 0) > pMax) return false;
    if (ratingFloor > 0 && (effectiveRating(l).rating || 0) < ratingFloor) return false;
    if (billing !== 'any' && (l.billing || 'one-time') !== billing) return false;
    if (affordable && (l.price || 0) > (state.aura || 0)) return false;
    if (activeTags.length && !activeTags.every((tg) => (l.tags || []).includes(tg))) return false;
    return true;
  };
  const typeFiltered = activeType === 'all' ? all : all.filter((l) => l.type === activeType);
  const searched = typeFiltered.filter(matchesQ);
  const filtered = [...searched].filter(matchesFilters);
  const sortFns = {
    trending:  (a, b) => (b.downloads || 0) - (a.downloads || 0),
    new:       (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    oldest:    (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    priceAsc:  (a, b) => (a.price || 0) - (b.price || 0),
    priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
    rating:    (a, b) => (effectiveRating(b).rating) - (effectiveRating(a).rating),
  };
  filtered.sort(sortFns[sort] || sortFns.trending);

  // Tag cloud — top 14 most common tags within the currently searched+typed
  // set. Reflects what's actually browsable right now, so as you narrow with
  // other filters the cloud stays relevant.
  const tagCounts = (() => {
    const m = new Map();
    for (const l of searched) {
      for (const tg of l.tags || []) m.set(tg, (m.get(tg) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  })();

  const activeFilterCount =
    (pMin != null && !Number.isNaN(pMin) ? 1 : 0) +
    (pMax != null && !Number.isNaN(pMax) ? 1 : 0) +
    (ratingFloor > 0 ? 1 : 0) +
    (billing !== 'any' ? 1 : 0) +
    (affordable ? 1 : 0) +
    activeTags.length;
  const clearAllFilters = () => {
    setPriceMin(''); setPriceMax('');
    setRatingFloor(0); setBilling('any');
    setAffordable(false); setActiveTags([]);
  };
  const toggleTag = (tg) => setActiveTags((cur) => cur.includes(tg) ? cur.filter((x) => x !== tg) : [...cur, tg]);

  const openListing = (l) => setView({ id: 'listing', focusId: l.id });
  const openSeller = (m) => setView({ id: 'profile', userId: m.id });

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...TY.micro, color: T.textOnBg3, marginBottom: 10 }}>MARKETPLACE</div>
          <h1 style={{ ...TY.h1, margin: 0, color: T.textOnBg }}>Marketplace<span style={{ color: T.accentHi }}>.</span></h1>
          <div style={{ ...TY.body, color: T.textOnBg2, marginTop: 8, maxWidth: 540 }}>
            Plugins, themes, sound packs, 3D rigs and more — built by the community, paid in aura.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* "+ Publish" action lives here (top-right of the marketplace
              header) instead of buried in the profile so creators have a
              one-click entry into the publish flow from the page they
              already browse their competition on. */}
          {onPublish && (
            <button
              onClick={onPublish}
              style={{
                padding: '12px 20px', borderRadius: T.r.pill, border: 'none',
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: '#fff', cursor: 'pointer',
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 13,
                boxShadow: `0 4px 18px ${T.accent}66`,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
              title="Publish a listing"
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Publish
            </button>
          )}
          <Glass style={{ padding: '14px 22px', textAlign: 'right' }}>
            <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>Your balance</div>
            <div style={{ ...TY.numMed, color: T.accentHi }}>{fmt(state.aura)}</div>
          </Glass>
        </div>
      </div>

      {/* ── Featured hero ── */}
      {featured.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle label="Featured this week" meta={`${featured.length} picks`}/>
          <div style={{ display: 'grid', gridTemplateColumns: featured.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {featured.slice(0, 3).map((l) => <FeaturedHeroCard key={l.id} l={l} state={state} onOpen={openListing} onSeller={openSeller}/>)}
          </div>
        </div>
      )}

      {/* ── Just launched ── */}
      {/* Newest publishes, horizontal scroll. Sits directly under the hero so
          a creator who just published sees their own listing without scrolling.
          Hidden if there's nothing — avoids an empty rail on a fresh install. */}
      {justLaunched.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionTitle
            label="Just launched"
            meta="Fresh off the press"
            action={
              <button
                onClick={() => { setSort('new'); setActiveType('all'); }}
                style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  ...TY.small, color: T.text3, fontSize: 11,
                }}
                title="See all sorted by newest"
              >
                See all →
              </button>
            }
          />
          <div style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(220px, 240px)',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollSnapType: 'x proximity',
          }}>
            {justLaunched.map((l, i) => (
              <div key={l.id} style={{ scrollSnapAlign: 'start' }}>
                <ListingCard
                  l={l}
                  state={state}
                  onOpen={openListing}
                  onSeller={openSeller}
                  index={i}
                  compact
                  wishlist={wishlist}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recently viewed ── */}
      {/* Only renders with ≥2 entries — a single card isn't a "strip". We
          resolve ids → listings on every render so unpublished items drop
          out automatically. Horizontal scroll keeps the vertical rhythm of
          the page calm even when the user has a long history. */}
      {(() => {
        const recentListings = (recent?.items || [])
          .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
          .filter(Boolean)
          .slice(0, 10);
        if (recentListings.length < 2) return null;
        return (
          <div style={{ marginBottom: 36 }}>
            <SectionTitle
              label="Recently viewed"
              meta="Jump back in"
              action={
                <button
                  onClick={() => { recent?.clear?.(); }}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    ...TY.small, color: T.text3, fontSize: 11,
                  }}
                  title="Clear history"
                >
                  Clear
                </button>
              }
            />
            <div style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridAutoColumns: 'minmax(220px, 240px)',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollSnapType: 'x proximity',
            }}>
              {recentListings.map((l, i) => (
                <div key={l.id} style={{ scrollSnapAlign: 'start' }}>
                  <ListingCard
                    l={l}
                    state={state}
                    onOpen={openListing}
                    onSeller={openSeller}
                    index={i}
                    compact
                    wishlist={wishlist}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Trending ── */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle label="Trending" meta="Most installed this month" action={
          <span style={{ ...TY.small, color: T.textOnBg3 }}>{trending.length} items</span>
        }/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {trending.map((l, i) => <ListingCard key={l.id} l={l} state={state} onOpen={openListing} onSeller={openSeller} index={i} wishlist={wishlist}/>)}
        </div>
      </div>

      {/* ── Collections ── */}
      {/* Editorial groupings that cut across type — resolved live against
          LISTINGS so auto-rule collections stay fresh. Skip any collection
          that currently resolves to <2 items (a collection of one looks
          like a mistake). */}
      {(() => {
        const cols = (window.LISTING_COLLECTIONS || [])
          .map((c) => ({ c, items: (window.getCollectionItems?.(c) || []) }))
          .filter(({ items }) => items.length >= 2);
        if (!cols.length) return null;
        return (
          <div style={{ marginBottom: 36 }}>
            <SectionTitle label="Collections" meta="Curated picks"/>
            <div style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridAutoColumns: 'minmax(260px, 280px)',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollSnapType: 'x proximity',
            }}>
              {cols.map(({ c, items }) => (
                <button
                  key={c.id}
                  onClick={() => setView({ id: 'collection', collectionId: c.id })}
                  style={{
                    scrollSnapAlign: 'start', textAlign: 'left',
                    padding: 16, minHeight: 140,
                    border: `0.5px solid ${T.glassBorder}`,
                    borderRadius: T.r.md,
                    background: `
                      linear-gradient(135deg, ${c.accent}22, ${c.accent}08 60%, transparent),
                      rgba(255,255,255,0.03)
                    `,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    gap: 10,
                    transition: 'transform .2s, border-color .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = c.accent + '66'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = T.glassBorder; }}
                >
                  <div>
                    <div style={{ ...TY.micro, color: c.accent, marginBottom: 4, letterSpacing: '0.08em' }}>COLLECTION</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: '-0.01em', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ ...TY.small, color: T.text2, fontSize: 12, lineHeight: 1.4 }}>{c.blurb}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                    <span style={{ color: c.accent, fontSize: 12, fontWeight: 500 }}>Open →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Top creators ── */}
      <div style={{ marginBottom: 36 }}>
        <SectionTitle label="Top creators" meta="By lifetime sales"/>
        <TopCreatorsRow onSeller={openSeller}/>
      </div>

      {/* ── Browse ── */}
      <div style={{ marginBottom: 16 }}>
        <SectionTitle label="Browse" meta={filtered.length + (filtered.length === 1 ? ' result' : ' results')}/>

        {/* Search + Sort row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: T.text3, display: 'flex', alignItems: 'center', pointerEvents: 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, tag, creator…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 34px 10px 34px', borderRadius: T.r.pill,
                background: 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, fontFamily: T.fontSans, fontSize: 13,
                outline: 'none',
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  color: T.text2, cursor: 'pointer', fontSize: 12, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: T.r.pill,
              background: 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${T.glassBorder}`,
              color: T.text, fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', outline: 'none',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <option value="trending">Trending</option>
            <option value="new">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priceAsc">Price ↑</option>
            <option value="priceDesc">Price ↓</option>
            <option value="rating">Top rated</option>
          </select>
          {/* Filters toggle — shows a count chip when anything is active so the
              user never forgets a hidden constraint is narrowing the list. */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            style={{
              padding: '10px 14px', borderRadius: T.r.pill,
              background: filtersOpen || activeFilterCount > 0
                ? `linear-gradient(135deg, ${T.accentHi}24, ${T.accent}14)`
                : 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${filtersOpen || activeFilterCount > 0 ? T.accentHi + '66' : T.glassBorder}`,
              color: T.text, fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', outline: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h18M6 12h12M10 19h4"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 9, background: T.accentHi, color: '#fff',
                fontSize: 10, fontWeight: 700, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>{activeFilterCount}</span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '10px 12px', borderRadius: T.r.pill,
                background: 'transparent', border: 'none',
                color: T.text3, cursor: 'pointer',
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
              }}
            >Clear all</button>
          )}
        </div>

        {/* Filters panel — collapses to zero height when closed so the rest
            of the page doesn't jump. Grouped by intent: price, rating,
            billing, a single "affordable" toggle, then a tag cloud. */}
        {filtersOpen && (
          <Glass style={{ padding: 16, marginBottom: 14, animation: 'cardRise .22s cubic-bezier(0.19, 1, 0.22, 1) both' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {/* Price */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>PRICE (AURA)</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number" inputMode="numeric" min={0}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: `0.5px solid ${T.glassBorder}`,
                      color: T.text, fontSize: 12, outline: 'none',
                    }}
                  />
                  <span style={{ color: T.text3, fontSize: 11 }}>–</span>
                  <input
                    type="number" inputMode="numeric" min={0}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: `0.5px solid ${T.glassBorder}`,
                      color: T.text, fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginTop: 10, cursor: 'pointer', userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={affordable}
                    onChange={(e) => setAffordable(e.target.checked)}
                    style={{ accentColor: T.accentHi }}
                  />
                  <span style={{ ...TY.small, color: T.text2, fontSize: 12 }}>
                    Only items I can afford
                  </span>
                </label>
              </div>

              {/* Rating floor */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>MIN RATING</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ v: 0, l: 'Any' }, { v: 3, l: '3★+' }, { v: 4, l: '4★+' }, { v: 4.5, l: '4.5★+' }].map((o) => {
                    const on = ratingFloor === o.v;
                    return (
                      <button
                        key={o.v}
                        onClick={() => setRatingFloor(o.v)}
                        style={{
                          padding: '6px 12px', borderRadius: T.r.pill,
                          border: `0.5px solid ${on ? T.accentHi + '66' : T.glassBorder}`,
                          background: on ? `linear-gradient(135deg, ${T.accentHi}2a, ${T.accent}14)` : 'rgba(255,255,255,0.04)',
                          color: on ? T.text : T.text2,
                          fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        }}
                      >{o.l}</button>
                    );
                  })}
                </div>
              </div>

              {/* Billing */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>BILLING</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ v: 'any', l: 'Any' }, { v: 'one-time', l: 'One-time' }, { v: 'monthly', l: 'Monthly' }].map((o) => {
                    const on = billing === o.v;
                    return (
                      <button
                        key={o.v}
                        onClick={() => setBilling(o.v)}
                        style={{
                          padding: '6px 12px', borderRadius: T.r.pill,
                          border: `0.5px solid ${on ? T.accentHi + '66' : T.glassBorder}`,
                          background: on ? `linear-gradient(135deg, ${T.accentHi}2a, ${T.accent}14)` : 'rgba(255,255,255,0.04)',
                          color: on ? T.text : T.text2,
                          fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        }}
                      >{o.l}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tag cloud — only render when there are tags available in the
                current scope, otherwise the label hangs awkwardly over empty
                space. */}
            {tagCounts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>TAGS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tagCounts.map(([tg, n]) => {
                    const on = activeTags.includes(tg);
                    return (
                      <button
                        key={tg}
                        onClick={() => toggleTag(tg)}
                        style={{
                          padding: '5px 10px', borderRadius: T.r.pill,
                          border: `0.5px solid ${on ? T.accentHi + '66' : T.glassBorder}`,
                          background: on ? `linear-gradient(135deg, ${T.accentHi}2a, ${T.accent}14)` : 'rgba(255,255,255,0.04)',
                          color: on ? T.text : T.text2,
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <span>#{tg}</span>
                        <span style={{ color: T.text3, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Glass>
        )}

        {/* Type pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <TypePill active={activeType === 'all'} onClick={() => setActiveType('all')} label="All" hue={T.accent} count={all.filter(matchesQ).length}/>
          {(window.LISTING_TYPES || []).map((t) => (
            <TypePill key={t.id} active={activeType === t.id} onClick={() => setActiveType(t.id)} label={t.label} hue={t.hue} icon={t.id} count={all.filter((l) => l.type === t.id).filter(matchesQ).length}/>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Glass style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2, marginBottom: 6 }}>
              {q ? `No matches for "${query}"` : 'Nothing here yet.'}
            </div>
            <div style={{ ...TY.small, color: T.text3 }}>
              {q ? 'Try a different search or clear the filter.' : 'Pick a different category.'}
            </div>
            {(q || activeType !== 'all' || activeFilterCount > 0) && (
              <button
                onClick={() => { setQuery(''); setActiveType('all'); clearAllFilters(); }}
                style={{
                  marginTop: 16, padding: '8px 18px', borderRadius: T.r.pill, border: 'none',
                  background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                  color: '#fff', cursor: 'pointer',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                }}
              >Clear filters</button>
            )}
          </Glass>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filtered.map((l, i) => <ListingCard key={l.id} l={l} state={state} onOpen={openListing} onSeller={openSeller} index={i} wishlist={wishlist}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function TypePill({ active, onClick, label, hue, icon, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: T.r.pill,
      background: active ? `linear-gradient(135deg, ${hue}40, ${hue}22)` : 'rgba(255,255,255,0.06)',
      color: active ? T.text : T.text2,
      border: `0.5px solid ${active ? hue + '88' : T.glassBorder}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      fontFamily: T.fontSans, fontWeight: 500, fontSize: 13, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7,
      boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 18px ${hue}33` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      transition: 'all .2s',
    }}>
      {icon && <ListingTypeIcon type={icon} size={12} color={active ? hue : 'currentColor'}/>}
      <span>{label}</span>
      {count != null && <span style={{ ...TY.small, fontSize: 11, color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
    </button>
  );
}

// ──── Featured hero — large card for the hero row ────
function FeaturedHeroCard({ l, state, onOpen, onSeller }) {
  const meta = listingTypeMeta(l.type);
  const levelLocked = state.level < (l.level || 1);
  return (
    <Glass hover onClick={() => onOpen(l)}
           style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
      <HoverOrbs restX={75} restY={20} size={420} color={meta.hue} colorHi={T.accentHi}/>
      <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.02))` }}>
        <CoverFallback type={l.type} seed={l.id} size={80}/>
        {l.cover && <img src={l.cover} alt={l.title} loading="lazy"
                         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                         onError={(e) => { e.currentTarget.style.display = 'none'; }}/>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,10,18,0.65) 100%)' }}/>
        <span style={{
          position: 'absolute', top: 14, left: 14,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: T.r.pill,
          background: 'rgba(8,10,18,0.62)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `0.5px solid ${meta.hue}66`,
          color: meta.hue,
          fontFamily: T.fontSans, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <ListingTypeIcon type={l.type} size={11}/>
          Featured · {meta.label.replace(/s$/, '')}
        </span>
      </div>
      <div style={{ padding: 18, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ ...TY.h3, margin: 0, color: T.text }}>{l.title}</h3>
          <div style={{ ...TY.numMed, color: T.accentHi, fontSize: 22, textShadow: `0 0 14px ${T.accentGlow}` }}>{fmt(l.price)}{l.billing === 'monthly' && <span style={{ ...TY.small, fontSize: 12, color: T.text3, marginLeft: 4 }}>/mo</span>}</div>
        </div>
        <div style={{ ...TY.small, color: T.text2, marginTop: 6, lineHeight: 1.45 }}>{l.tagline}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 }}>
          <SellerLine sellerId={l.sellerId} onSeller={onSeller} size={12}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(() => { const er = effectiveRating(l); return <RatingChip rating={er.rating} count={er.count} size={12}/>; })()}
            <DownloadsChip n={l.downloads} size={12}/>
            {levelLocked && <Tag muted><ILock size={11}/>&nbsp;L{l.level}</Tag>}
          </div>
        </div>
      </div>
    </Glass>
  );
}

// ──── StarPicker — interactive 5-star input. Controlled. ────
// Hover preview shows a temporary highlighted state; releasing sets the value.
// Used inside WriteReviewForm.
function StarPicker({ value, onChange, size = 22 }) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value || 0;
  return (
    <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n === value ? 0 : n)}
          style={{
            background: 'transparent', border: 'none', padding: 2, cursor: 'pointer',
            lineHeight: 0, color: n <= shown ? '#FFD166' : 'rgba(255,255,255,0.18)',
            transition: 'color .15s, transform .15s',
            transform: n === hover ? 'scale(1.15)' : 'scale(1)',
          }}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= shown ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
            <path d="m12 2 2.9 6.9 7.1.6-5.4 4.7 1.7 7L12 17.8 5.7 21.2l1.7-7L2 9.5l7.1-.6z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

// Read-only star row used inside each ReviewItem. Tiny, monochrome gold.
function StarRow({ rating, size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, lineHeight: 0 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24"
             fill={n <= rating ? '#FFD166' : 'rgba(255,255,255,0.14)'} stroke="none">
          <path d="m12 2 2.9 6.9 7.1.6-5.4 4.7 1.7 7L12 17.8 5.7 21.2l1.7-7L2 9.5l7.1-.6z"/>
        </svg>
      ))}
    </span>
  );
}

// Relative-time label for review timestamps. Falls back to days ago after a
// week so things stay punchy without a date picker.
function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = Math.floor(diff / 86_400_000);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ──── ReviewItem — one review in the list. Avatar + stars + relative time. ────
// Layers: base row (avatar + stars + text + timestamp) → actions (helpful,
// edit, remove) → optional seller reply → optional reply compose. The inline
// edit mode reuses StarPicker so the write/edit UI feel identical.
function ReviewItem({ review, listing, reviews, onSeller, canSellerReply, verified, reports, blocks }) {
  // Prefer MEMBERS lookup (full record incl. level, tag) when available —
  // the real-time leaderboard keeps it fresh. Fall back to the author
  // fields baked into remote reviews so rows render cold, before MEMBERS
  // has hydrated the author.
  const memberRow = (window.MEMBERS || []).find((m) => m.id === review.authorId);
  const author = memberRow || (review.authorName ? {
    id: review.authorId,
    name: review.authorName,
    avatar: review.authorAvatar || '',
    tag: '',
  } : null);
  const me = window.ME || {};
  const isMine = (me.id || 'me') === review.authorId && !review.seed;
  const isSeller = canSellerReply && !!listing && listing.sellerId === me.id;
  const sellerMember = (window.MEMBERS || []).find((m) => m.id === listing?.sellerId);
  const helpful = reviews?.isHelpful?.(review.id) || false;
  const helpfulCount = review.helpfulCount || 0;

  const [editing, setEditing] = React.useState(false);
  const [editRating, setEditRating] = React.useState(review.rating);
  const [editText, setEditText] = React.useState(review.text || '');
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState(review.reply?.text || '');
  // Arm+commit for destructive actions (window.confirm is a no-op in Tauri's
  // WKWebView — see shell.jsx:769). First click arms; second within 3s commits.
  const [armedRemoveReply, setArmedRemoveReply] = React.useState(false);
  const [armedRemoveReview, setArmedRemoveReview] = React.useState(false);
  React.useEffect(() => {
    if (!armedRemoveReply) return;
    const t = setTimeout(() => setArmedRemoveReply(false), 3000);
    return () => clearTimeout(t);
  }, [armedRemoveReply]);
  React.useEffect(() => {
    if (!armedRemoveReview) return;
    const t = setTimeout(() => setArmedRemoveReview(false), 3000);
    return () => clearTimeout(t);
  }, [armedRemoveReview]);

  const saveEdit = () => {
    if (!editRating) return;
    const ok = reviews?.update?.(review.id, { rating: editRating, text: editText });
    if (ok) {
      setEditing(false);
      try { ElyNotify?.toast?.({ text: 'Review updated', kind: 'success' }); } catch {}
    }
  };
  const submitReply = () => {
    const ok = reviews?.addReply?.(review.id, replyText);
    if (ok) {
      setReplyOpen(false);
      try { ElyNotify?.toast?.({ text: 'Reply posted', kind: 'success' }); } catch {}
    }
  };
  const removeReply = () => {
    if (!armedRemoveReply) {
      setArmedRemoveReply(true);
      try { ElyNotify?.toast?.({ text: 'Click again to remove your reply', kind: 'warn' }); } catch {}
      return;
    }
    setArmedRemoveReply(false);
    reviews?.removeReply?.(review.id);
  };

  const linkBtn = {
    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
    color: T.text3, fontSize: 11, fontFamily: T.fontSans,
  };

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 0',
      borderBottom: `0.5px solid ${T.glassBorder}`,
    }}>
      <div
        onClick={() => author && onSeller?.(author)}
        style={{ cursor: author ? 'pointer' : 'default', borderRadius: '50%' }}
      >
        <Avatar name={author?.name || '?'} src={author?.avatar} size={36}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 13 }}>
            {author?.name || 'Anonymous'}{isMine && <span style={{ color: T.accentHi, marginLeft: 6, fontSize: 11 }}>· you</span>}
          </span>
          {!editing && <StarRow rating={review.rating}/>}
          {verified && (
            <span
              title="Owns this listing — verified purchase"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 10,
                background: 'rgba(95,217,154,0.12)',
                border: `0.5px solid rgba(95,217,154,0.35)`,
                color: T.green || '#5FD99A', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-10"/>
              </svg>
              VERIFIED
            </span>
          )}
          <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
            {relativeTime(review.createdAt)}
            {review.editedAt && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>· edited</span>}
          </span>
        </div>

        {!editing ? (
          review.text && (
            <div style={{ ...TY.body, color: T.text2, marginTop: 6, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {review.text}
            </div>
          )
        ) : (
          <div style={{ marginTop: 8 }}>
            <StarPicker value={editRating} onChange={setEditRating} size={18}/>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 500))}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', marginTop: 8,
                padding: 10, borderRadius: T.r.sm,
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, fontFamily: T.fontSans, fontSize: 12,
                resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button onClick={() => { setEditing(false); setEditRating(review.rating); setEditText(review.text || ''); }}
                style={{ ...linkBtn, fontSize: 12 }}>Cancel</button>
              <button
                onClick={saveEdit}
                disabled={!editRating}
                style={{
                  padding: '6px 14px', borderRadius: T.r.pill, border: 'none',
                  background: editRating ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                  color: editRating ? '#fff' : T.text3,
                  cursor: editRating ? 'pointer' : 'not-allowed',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 11,
                }}
              >Save</button>
            </div>
          </div>
        )}

        {/* Actions row */}
        {!editing && reviews && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => reviews?.toggleHelpful?.(review.id)}
              title={helpful ? 'You marked this helpful' : 'Mark helpful'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: T.r.pill,
                border: `0.5px solid ${helpful ? T.accentHi + '66' : T.glassBorder}`,
                background: helpful ? `linear-gradient(135deg, ${T.accentHi}2a, ${T.accent}14)` : 'rgba(255,255,255,0.04)',
                color: helpful ? T.text : T.text2,
                fontSize: 11, fontFamily: T.fontSans, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill={helpful ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 22V10l5-7a2 2 0 0 1 2 2v5h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2z"/>
                <path d="M7 10H3v12h4z"/>
              </svg>
              Helpful{helpfulCount > 0 && ` · ${helpfulCount}`}
            </button>
            {isMine && !review.seed && (
              <>
                <button onClick={() => setEditing(true)} style={linkBtn}>Edit</button>
                <button
                  onClick={() => {
                    if (!armedRemoveReview) {
                      setArmedRemoveReview(true);
                      try { ElyNotify?.toast?.({ text: 'Click again to remove your review', kind: 'warn' }); } catch {}
                      return;
                    }
                    setArmedRemoveReview(false);
                    reviews?.remove?.(review.id);
                  }}
                  style={{ ...linkBtn, color: armedRemoveReview ? '#ff6b7a' : T.text3 }}
                >{armedRemoveReview ? 'Click again' : 'Remove'}</button>
              </>
            )}
            {isSeller && !review.reply && !replyOpen && (
              <button onClick={() => setReplyOpen(true)} style={{ ...linkBtn, color: T.accentHi }}>
                Reply as seller
              </button>
            )}
            {reports && !isMine && (
              <div style={{ marginLeft: 'auto' }}>
                <ReportTrigger
                  target={{ kind: 'review', id: review.id, name: author?.name ? `${author.name}'s review` : 'this review' }}
                  reports={reports}
                  size={13}
                  compact
                />
              </div>
            )}
          </div>
        )}

        {/* Seller reply — rendered inline, indented. Kept distinct with a left
            bar + subtle gradient so it reads as authoritative, not equal. */}
        {review.reply && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            borderLeft: `2px solid ${T.accentHi}`,
            borderRadius: '0 8px 8px 0',
            background: `linear-gradient(90deg, ${T.accentHi}12, transparent 60%)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accentHi, letterSpacing: '0.04em' }}>
                SELLER REPLY
              </span>
              <span style={{ ...TY.small, color: T.text2, fontSize: 11 }}>
                {sellerMember?.name || 'Seller'}
              </span>
              <span style={{ ...TY.small, color: T.text3, fontSize: 10 }}>
                {relativeTime(review.reply.createdAt)}
              </span>
              {isSeller && (
                <button onClick={removeReply} style={{ ...linkBtn, marginLeft: 'auto', fontSize: 10, color: armedRemoveReply ? '#ff6b7a' : T.text3 }}>
                  {armedRemoveReply ? 'Click again' : 'Remove'}
                </button>
              )}
            </div>
            <div style={{ ...TY.body, color: T.text2, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {review.reply.text}
            </div>
          </div>
        )}

        {/* Reply compose */}
        {replyOpen && (
          <div style={{
            marginTop: 10, padding: 10, borderRadius: T.r.sm,
            background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
          }}>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
              placeholder="Thank them, address concerns, clarify features…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: 8, borderRadius: T.r.sm,
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, fontFamily: T.fontSans, fontSize: 12,
                resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ ...TY.small, color: T.text3, fontSize: 10 }}>{replyText.length} / 500</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setReplyOpen(false); setReplyText(''); }} style={{ ...linkBtn, fontSize: 11 }}>Cancel</button>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  style={{
                    padding: '5px 12px', borderRadius: T.r.pill, border: 'none',
                    background: replyText.trim() ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                    color: replyText.trim() ? '#fff' : T.text3,
                    cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: T.fontSans, fontWeight: 600, fontSize: 11,
                  }}
                >Post reply</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──── ReviewsSection — summary + write form + list. Drops into ListingDetailView. ────
function ReviewsSection({ listing, library, reviews, setView, reports, blocks }) {
  const stats = reviewStatsForListing(listing.id);
  const all = reviewsForListing(listing.id);
  const [filter, setFilter] = React.useState(0); // 0 = all, 1..5 = specific rating
  const [sortBy, setSortBy] = React.useState('helpful'); // helpful | new | old | hi | lo
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);

  // Verified-purchase set: review author ids that currently hold this listing
  // in their library. We can only know this for the current user (library is
  // local), so in practice only "me" reviews get the badge — which is fine
  // since seed authors are all guaranteed to have purchased via the seed
  // narrative (we badge them too). Kept as a predicate so both bases flow
  // through one check.
  const meOwns = !!library?.items?.find(
    (it) => it.listingId === listing.id && it.status === 'active'
      && (!it.expiresAt || it.expiresAt > Date.now())
  );
  const meId = (window.ME?.id || 'me');
  const isVerified = (r) => r.seed || (r.authorId === meId && meOwns);

  const me = window.ME || {};
  const ownedEntry = library?.items?.find((it) => it.listingId === listing.id);
  const owns = !!(ownedEntry && ownedEntry.status === 'active'
    && (!ownedEntry.expiresAt || ownedEntry.expiresAt > Date.now()));
  const isOwn = listing.sellerId === me.id;
  const signedIn = !!window.ElyAPI?.isSignedIn?.();
  const already = reviews?.hasReviewed?.(listing.id);
  // Show the write form for any signed-in non-seller who hasn't reviewed
  // this listing yet. The backend enforces actual ownership (user_library)
  // — we surface a toast if POST returns `not_owned`. Gating UI on the
  // local library would hide the form for users whose library hasn't
  // synced (e.g. fresh login on another device).
  const canWrite = signedIn && !isOwn && !already;

  // Filter out reviews authored by users the current viewer has blocked.
  // Done before rating filter so the rating histogram reflects the blocked-
  // free view too.
  const unblocked = blocks ? all.filter((r) => !blocks.has(r.authorId)) : all;
  const filtered = filter === 0 ? unblocked : unblocked.filter((r) => r.rating === filter);
  const sortFns = {
    helpful: (a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0) || (b.createdAt - a.createdAt),
    new:     (a, b) => b.createdAt - a.createdAt,
    old:     (a, b) => a.createdAt - b.createdAt,
    hi:      (a, b) => b.rating - a.rating || (b.createdAt - a.createdAt),
    lo:      (a, b) => a.rating - b.rating || (b.createdAt - a.createdAt),
  };
  const visible = [...filtered].sort(sortFns[sortBy] || sortFns.helpful);
  const shown = expanded ? visible : visible.slice(0, 5);

  const submit = () => {
    if (!rating) {
      try { ElyNotify?.toast?.({ text: 'Pick a star rating first', kind: 'warn' }); } catch {}
      return;
    }
    reviews?.add?.({ listingId: listing.id, rating, text });
    setRating(0);
    setText('');
    try { ElyNotify?.toast?.({ text: 'Review posted — thanks!', kind: 'success' }); } catch {}
  };

  const openSeller = (m) => setView?.({ id: 'profile', userId: m.id });

  // Distribution bars — 5★ → 1★, each bar width % of total.
  const DistBar = ({ stars }) => {
    const n = stats.dist[stars - 1];
    const pct = stats.count ? (n / stats.count) * 100 : 0;
    const active = filter === stars;
    return (
      <button
        onClick={() => setFilter(active ? 0 : stars)}
        style={{
          display: 'grid', gridTemplateColumns: '22px 1fr 32px', alignItems: 'center', gap: 8,
          width: '100%', background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
          border: 'none', padding: '4px 6px', borderRadius: 6, cursor: 'pointer',
          color: T.text3, fontFamily: T.fontSans, fontSize: 11,
        }}
      >
        <span style={{ textAlign: 'left' }}>{stars}★</span>
        <span style={{
          height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`, background: '#FFD166',
            transition: 'width .3s',
          }}/>
        </span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      </button>
    );
  };

  return (
    <Glass style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...TY.micro, color: T.text3 }}>REVIEWS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {stats.count > 0 && (
            <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
              {filter > 0 ? `${filter}★ · ${visible.length} of ${stats.count}` : `${stats.count} total`}
            </div>
          )}
          {stats.count > 1 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: T.r.pill,
                background: 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="helpful">Most helpful</option>
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="hi">Highest rated</option>
              <option value="lo">Lowest rated</option>
            </select>
          )}
        </div>
      </div>

      {stats.count > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 200px) 1fr', gap: 20, alignItems: 'start', marginBottom: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...TY.numMed, color: T.text, fontSize: 38, lineHeight: 1 }}>{stats.avg.toFixed(1)}</div>
            <div style={{ marginTop: 6 }}><StarRow rating={Math.round(stats.avg)} size={14}/></div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6, fontSize: 11 }}>based on {stats.count} {stats.count === 1 ? 'review' : 'reviews'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[5, 4, 3, 2, 1].map((n) => <DistBar key={n} stars={n}/>)}
          </div>
        </div>
      ) : (
        <div style={{ ...TY.body, color: T.text3, padding: '8px 0 16px' }}>
          No reviews yet — be the first to leave one.
        </div>
      )}

      {/* Write form — only for buyers who haven't reviewed */}
      {canWrite && (
        <div style={{
          padding: 14, marginBottom: 14, borderRadius: T.r.md,
          background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${T.glassBorder}`,
        }}>
          <div style={{ ...TY.small, color: T.text2, marginBottom: 10, fontSize: 12 }}>Share your experience</div>
          <StarPicker value={rating} onChange={setRating}/>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="What worked? What could be better? (optional)"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', marginTop: 10,
              padding: 10, borderRadius: T.r.sm,
              background: 'rgba(255,255,255,0.04)',
              border: `0.5px solid ${T.glassBorder}`,
              color: T.text, fontFamily: T.fontSans, fontSize: 12,
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{text.length} / 500</span>
            <button
              onClick={submit}
              disabled={!rating}
              style={{
                padding: '8px 18px', borderRadius: T.r.pill, border: 'none',
                background: rating ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                color: rating ? '#fff' : T.text3,
                cursor: rating ? 'pointer' : 'not-allowed',
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
              }}
            >Post review</button>
          </div>
        </div>
      )}
      {!canWrite && !already && (
        <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginBottom: 12, fontStyle: 'italic' }}>
          {isOwn
            ? "You can't review your own listing."
            : !signedIn
              ? 'Sign in to leave a review.'
              : ''}
        </div>
      )}

      {/* List */}
      {shown.length > 0 && (
        <div>
          {shown.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              listing={listing}
              reviews={reviews}
              onSeller={openSeller}
              canSellerReply
              verified={isVerified(r)}
              reports={reports}
              blocks={blocks}
            />
          ))}
          {visible.length > 5 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                marginTop: 12, background: 'transparent', border: 'none', color: T.accentHi,
                cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, padding: 0,
              }}
            >Show all {visible.length} reviews →</button>
          )}
        </div>
      )}
      {shown.length === 0 && stats.count > 0 && (
        <div style={{ ...TY.body, color: T.text3, padding: '12px 0', textAlign: 'center', fontSize: 12 }}>
          No {filter}★ reviews. <button onClick={() => setFilter(0)} style={{ background: 'transparent', border: 'none', color: T.accentHi, cursor: 'pointer', padding: 0, fontFamily: T.fontSans, fontSize: 12 }}>Clear filter</button>
        </div>
      )}
    </Glass>
  );
}

// ──── Media gallery — hero viewer + thumb strip ────
// Unifies l.cover + l.screenshots + l.videos into a single navigable gallery.
// Follows the App Store / Stripe product-page pattern: dominant main viewer
// on top, click-to-select thumbnails below, arrow overlays for keyboard-less
// browsing, tap the main image to open the fullscreen lightbox.
//
// `items` is the computed list of { kind, src, alt, poster? }. If only one
// item exists, the thumb strip and nav arrows collapse — the hero becomes a
// calm single-image card. Videos use native <video controls>, which means
// clicking the video does NOT open the lightbox (the control surface
// intercepts), matching platform expectations.
function ListingMediaGallery({ listing, meta, items, active, setActive, onLightbox }) {
  const one = items.length <= 1;
  const item = items[active] || items[0];
  const next = () => setActive((i) => (i + 1) % items.length);
  const prev = () => setActive((i) => (i - 1 + items.length) % items.length);

  return (
    <Glass style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <HoverOrbs restX={70} restY={25} size={520} color={meta.hue} colorHi={T.accentHi}/>
      <div style={{
        aspectRatio: '16/9', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.02))`,
        cursor: item?.kind === 'image' ? 'zoom-in' : 'default',
      }}
        onClick={() => { if (item?.kind === 'image') onLightbox(active); }}
      >
        <CoverFallback type={listing.type} seed={listing.id} size={120}/>
        {item?.kind === 'image' && (
          <img
            src={item.src} alt={item.alt}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {item?.kind === 'video' && (
          <video
            key={item.src}
            src={item.src}
            poster={item.poster}
            controls
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
          />
        )}

        {/* Type chip — same placement as before. */}
        <span style={{
          position: 'absolute', top: 16, left: 16,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: T.r.pill,
          background: 'rgba(8,10,18,0.62)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `0.5px solid ${meta.hue}66`,
          color: meta.hue,
          fontFamily: T.fontSans, fontWeight: 600, fontSize: 11,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          <ListingTypeIcon type={listing.type} size={12}/>
          {meta.label.replace(/s$/, '')}
        </span>

        {/* Counter — only when >1 */}
        {!one && (
          <span style={{
            position: 'absolute', top: 16, right: 16,
            ...TY.small, color: T.text2, fontSize: 11,
            padding: '5px 10px', borderRadius: T.r.pill,
            background: 'rgba(8,10,18,0.62)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: `0.5px solid ${T.glassBorder}`,
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}>{active + 1} / {items.length}</span>
        )}

        {/* Arrow overlays */}
        {!one && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous media"
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(8,10,18,0.55)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              }}
            >‹</button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next media"
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(8,10,18,0.55)',
                border: `0.5px solid ${T.glassBorder}`,
                color: T.text, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              }}
            >›</button>
          </>
        )}
      </div>

      {/* Thumb strip */}
      {!one && (
        <div style={{
          display: 'flex', gap: 6, padding: 10,
          overflowX: 'auto',
          borderTop: `0.5px solid ${T.glassBorder}`,
          background: 'rgba(255,255,255,0.02)',
        }}>
          {items.map((it, i) => {
            const on = i === active;
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  flex: '0 0 auto', width: 82, aspectRatio: '16/10',
                  borderRadius: 6, overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer', padding: 0,
                  border: on ? `1.5px solid ${T.accentHi}` : `0.5px solid ${T.glassBorder}`,
                  boxShadow: on ? `0 0 0 2px ${T.accentHi}33` : 'none',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'all .15s',
                  opacity: on ? 1 : 0.72,
                }}
              >
                {it.kind === 'image' && (
                  <img src={it.src} alt={it.alt} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {it.kind === 'video' && (
                  <>
                    {it.poster && <img src={it.poster} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>}
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.35)', color: '#fff',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ──── ListingDetailView — full page ────
function ListingDetailView({ state, setView, onQuick, focusId, library, purchaseListing, reviews, wishlist, follows, recent, messages, coupons, reports, blocks }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacListingDetailView) {
    return <window.ZodiacListingDetailView state={state} setView={setView} onQuick={onQuick} focusId={focusId} library={library} purchaseListing={purchaseListing} reviews={reviews} wishlist={wishlist} follows={follows} recent={recent} messages={messages} coupons={coupons} reports={reports} blocks={blocks}/>;
  }
  const l = (window.LISTINGS || []).find((x) => x.id === focusId);
  // First-party Hugin listings (any tier sharing kassa_product_id='gleipnir')
  // have a dedicated, richer page. Always redirect to ZephyroView so the
  // generic detail page never shows for Hugin — same rule applied to
  // PluginPanelView. Mounted as a useEffect so the redirect runs after the
  // initial render commits and React doesn't complain about setState during
  // render.
  const isHugin = l && (l.kassa_product_id || l.kassaProductId) === 'gleipnir';
  React.useEffect(() => {
    if (isHugin) setView({ id: 'zephyro' });
  }, [isHugin]);
  if (isHugin) return null;

  if (!l) {
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>Listing not found.</div>
        <button onClick={() => setView({ id: 'store' })} style={{ ...linkStyle(), marginTop: 12 }}>← Back to marketplace</button>
      </Glass>
    );
  }
  const meta = listingTypeMeta(l.type);
  const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
  const sellerStats = seller ? getCreatorStats(seller.id) : null;
  const levelLocked = state.level < (l.level || 1);
  const auraShort = state.aura < l.price;
  const ownedEntry = library?.items.find((it) => it.listingId === l.id);
  const activeOwned = ownedEntry && ownedEntry.status === 'active' && (!ownedEntry.expiresAt || ownedEntry.expiresAt > Date.now());
  const isSub = l.billing === 'monthly';
  // If user already owns a one-time or has an active sub, disable (they go to Manage instead).
  const alreadyHas = activeOwned && (!isSub || true);
  const locked = (!alreadyHas) && (levelLocked || auraShort);

  // Record this view in the recently-viewed history. Skips the user's own
  // listings so your own drafts don't pollute the strip.
  React.useEffect(() => {
    if (l && recent && l.sellerId !== (window.ME?.id || 'me')) recent.push(l.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l?.id]);

  // Tactile "processing" state — purchaseListing is sync, but a brief pending
  // flash makes the CTA feel substantial instead of instant-teleport.
  const [pending, setPending] = React.useState(false);

  // Coupon state — code the buyer has typed, validation result against this
  // specific listing, and whether they've locked it in. We revalidate live
  // as they type so they see green/red feedback before committing.
  const [couponInput, setCouponInput] = React.useState('');
  const [couponApplied, setCouponApplied] = React.useState(null);
  const couponCheck = React.useMemo(() => {
    if (!coupons || !couponInput.trim()) return null;
    return coupons.validate(couponInput, l);
  }, [couponInput, coupons, l.id, l.price, l.sellerId]);
  const appliedDiscount = couponApplied ? couponApplied.discount : 0;
  const effectivePrice = Math.max(0, (l.price || 0) - appliedDiscount);
  const applyCoupon = () => {
    if (!couponCheck?.ok) {
      const reason = couponCheck?.reason;
      const msg = reason === 'wrong-seller' ? "Code isn't for this creator"
        : reason === 'wrong-listing' ? "Code doesn't apply to this listing"
        : reason === 'expired' ? 'Code expired'
        : reason === 'used-up' ? 'Code has reached its usage limit'
        : 'Invalid code';
      try { ElyNotify?.toast?.({ text: msg, kind: 'warn' }); } catch {}
      return;
    }
    setCouponApplied({ code: couponCheck.coupon.code, discount: couponCheck.discount, percentOff: couponCheck.coupon.percentOff });
    try { ElyNotify?.toast?.({ text: `Code applied — ${couponCheck.coupon.percentOff}% off`, kind: 'success' }); } catch {}
  };
  const clearCoupon = () => { setCouponApplied(null); setCouponInput(''); };

  const onPrimary = () => {
    if (pending) return;
    if (alreadyHas) {
      if (l.type === 'plugin') setView({ id: `plugin:${l.id}` });
      else setView({ id: 'library' });
      return;
    }
    if (locked) return;
    if (purchaseListing) {
      setPending(true);
      setTimeout(() => {
        const res = purchaseListing(l, couponApplied ? couponApplied.code : null);
        setPending(false);
        if (res.ok) {
          const paid = res.finalPrice != null ? res.finalPrice : l.price;
          const savedSuffix = res.discount ? ` · saved ${fmt(res.discount)}` : '';
          try { ElyNotify?.toast?.({ text: `${l.title} ${isSub ? 'subscribed' : 'added to library'} — ${fmt(paid)} aura${savedSuffix}`, kind: 'success' }); } catch {}
          if (l.type === 'plugin') setView({ id: `plugin:${l.id}` });
          else setView({ id: 'library' });
        } else {
          try { ElyNotify?.toast?.({ text: 'Not enough aura', kind: 'warn' }); } catch {}
        }
      }, 380);
    } else {
      onQuick.redeem({ ...l, sub: l.tagline });
    }
  };
  // Exclude listings the user already owns from "Related" — if they already
  // have it, suggesting it again is wasted real estate.
  const ownedIds = new Set((library?.items || []).map((it) => it.listingId));
  // Dedup tier-alias rows (Hugin 1key + 2key share kassa_product_id) so
  // Related doesn't surface the same product twice as separate cards.
  const relatedSource = window.dedupTieredListings
    ? window.dedupTieredListings(window.LISTINGS || [])
    : (window.LISTINGS || []);
  const related = relatedSource
    .filter((x) => x.id !== l.id && !ownedIds.has(x.id) && (x.type === l.type || x.sellerId === l.sellerId))
    .slice(0, 4);

  // Unified gallery — cover first, then screenshots, then optional videos.
  // Dedup by src so a listing that repeats its cover in screenshots doesn't
  // show it twice. Videos carry an optional poster for the thumb strip.
  const galleryItems = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (item) => {
      if (!item?.src || seen.has(item.src)) return;
      seen.add(item.src);
      out.push(item);
    };
    if (l.cover) push({ kind: 'image', src: l.cover, alt: l.title });
    for (const src of l.screenshots || []) push({ kind: 'image', src, alt: l.title });
    for (const v of l.videos || []) {
      if (typeof v === 'string') push({ kind: 'video', src: v, alt: l.title });
      else if (v?.src) push({ kind: 'video', src: v.src, poster: v.poster, alt: l.title });
    }
    return out;
  }, [l.id, l.cover, l.screenshots, l.videos]);
  const [galleryIdx, setGalleryIdx] = React.useState(0);
  // Reset when navigating between listings.
  React.useEffect(() => { setGalleryIdx(0); }, [l.id]);

  // Lightbox — indexes into galleryItems. Only images are zoomed; videos play
  // inline via their native controls.
  const [lightbox, setLightbox] = React.useState(null);
  const imageItems = galleryItems.filter((it) => it.kind === 'image');
  const currentLightbox = lightbox != null ? imageItems[lightbox] : null;
  React.useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => Math.min(imageItems.length - 1, (i ?? 0) + 1));
      if (e.key === 'ArrowLeft') setLightbox((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, imageItems.length]);
  // Bridge the gallery's click-to-zoom: translate gallery index → imageItems
  // index (they differ if videos are interleaved).
  const openLightboxFromGallery = (galIdx) => {
    const src = galleryItems[galIdx]?.src;
    const imgIdx = imageItems.findIndex((it) => it.src === src);
    if (imgIdx >= 0) setLightbox(imgIdx);
  };

  const openListing = (x) => setView({ id: 'listing', focusId: x.id });
  const openSeller = (m) => setView({ id: 'profile', userId: m.id });

  return (
    <div>
      {/* Back link */}
      <button onClick={() => setView({ id: 'store' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        ...TY.small, color: T.textOnBg2, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
      }}>← Back to marketplace</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }}>
        {/* ── Left: hero + description + screenshots ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ListingMediaGallery
            listing={l}
            meta={meta}
            items={galleryItems}
            active={galleryIdx}
            setActive={setGalleryIdx}
            onLightbox={openLightboxFromGallery}
          />

          <Glass style={{ padding: 22, position: 'relative' }}>
            {reports && l.sellerId !== (window.ME?.id || 'me') && (
              <div style={{ position: 'absolute', top: 14, right: 14 }}>
                <ReportTrigger target={{ kind: 'listing', id: l.id, name: l.title }} reports={reports} size={15}/>
              </div>
            )}
            <h1 style={{ ...TY.h2, margin: 0, color: T.text, paddingRight: reports ? 28 : 0 }}>{l.title}</h1>
            <div style={{ ...TY.body, color: T.text2, marginTop: 6 }}>{l.tagline}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              {(() => { const er = effectiveRating(l); return <RatingChip rating={er.rating} count={er.count} size={12}/>; })()}
              <DownloadsChip n={l.downloads} size={12}/>
              <span style={{ ...TY.small, fontSize: 12, color: T.text3 }}>Updated {l.updatedAt}</span>
            </div>
            <div style={{ height: 1, background: T.glassBorder, margin: '18px 0' }}/>
            <div style={{ ...TY.body, color: T.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{l.description}</div>
            {l.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
                {l.tags.map((tag) => (
                  <span key={tag} style={{ ...TY.small, fontSize: 11, color: T.text3, padding: '4px 10px', borderRadius: T.r.pill, background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}` }}>#{tag}</span>
                ))}
              </div>
            )}
          </Glass>

          <ReviewsSection listing={l} library={library} reviews={reviews} setView={setView} reports={reports} blocks={blocks}/>
        </div>

        {/* ── Right: price + seller + related ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 12 }}>
          <Glass style={{ padding: 22 }}>
            <div style={{ ...TY.micro, color: T.text3 }}>{l.billing === 'monthly' ? 'SUBSCRIPTION' : 'ONE-TIME PURCHASE'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <div style={{ ...TY.numMed, color: T.accentHi, fontSize: 36, textShadow: `0 0 18px ${T.accentGlow}` }}>{fmt(effectivePrice)}</div>
              <span style={{ ...TY.small, color: T.text3 }}>aura{l.billing === 'monthly' ? ' / month' : ''}</span>
              {appliedDiscount > 0 && (
                <span style={{ ...TY.small, color: T.text3, fontSize: 12, marginLeft: 4 }}>
                  <span style={{ textDecoration: 'line-through', color: T.text3 }}>{fmt(l.price)}</span>
                  {' '}
                  <span style={{
                    color: '#6ee7b7', background: 'rgba(110,231,183,0.12)',
                    padding: '2px 8px', borderRadius: T.r.pill,
                    border: '0.5px solid rgba(110,231,183,0.35)',
                    fontWeight: 600, fontSize: 11,
                  }}>−{couponApplied.percentOff}%</span>
                </span>
              )}
            </div>
            {/* Center-align so the round icon buttons sit on the same
                optical baseline as the pill's label. `stretch` used to
                pull the circles taller than wide, drifting the glyphs
                upward. */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <button
              disabled={(!alreadyHas && (levelLocked || state.aura < effectivePrice)) || pending}
              onClick={onPrimary}
              style={{
                flex: 1,
                padding: '12px 18px', borderRadius: T.r.pill, border: 'none',
                background: (!alreadyHas && (levelLocked || state.aura < effectivePrice)) ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: (!alreadyHas && (levelLocked || state.aura < effectivePrice)) ? T.text3 : '#fff',
                cursor: pending ? 'progress' : (!alreadyHas && (levelLocked || state.aura < effectivePrice)) ? 'not-allowed' : 'pointer',
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 14,
                boxShadow: (!alreadyHas && (levelLocked || state.aura < effectivePrice)) ? 'none' : `0 4px 18px ${T.accent}66`,
                transition: 'all .2s',
                opacity: pending ? 0.85 : 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {pending && <Spinner size={14} color="#fff"/>}
              {pending ? (isSub ? 'Subscribing…' : 'Redeeming…')
                : alreadyHas
                ? (isSub ? 'Manage subscription' : (l.type === 'plugin' ? 'Open plugin' : 'In your library ✓'))
                : levelLocked ? `Requires Level ${l.level}`
                : (state.aura < effectivePrice) ? `Need ${fmt(effectivePrice - state.aura)} more aura`
                : (isSub ? 'Subscribe' : 'Redeem')}
            </button>
            {/* Hide heart on your own listing — saving something you sell
                is meaningless and clutters the CTA row. */}
            {wishlist && l.sellerId !== (window.ME?.id) && (
              <HeartButton
                saved={wishlist.has(l.id)}
                onToggle={() => wishlist.toggle(l.id)}
                size={20}
              />
            )}
            <ShareTrigger listing={l} seller={seller} messages={messages} setView={setView}/>
            </div>
            {l.billing === 'monthly' && !locked && (
              <div style={{ ...TY.small, color: T.text3, marginTop: 10, fontSize: 11, lineHeight: 1.4 }}>
                Renews monthly. Cancel any time from your library — license expires when not paid.
              </div>
            )}
            {coupons && !alreadyHas && seller && seller.id !== (window.ME?.id || 'me') && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${T.glassBorder}` }}>
                {couponApplied ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{
                        color: '#6ee7b7',
                        background: 'rgba(110,231,183,0.12)',
                        padding: '3px 10px', borderRadius: T.r.pill,
                        border: '0.5px solid rgba(110,231,183,0.35)',
                        fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                        fontFamily: T.fontMono,
                      }}>{couponApplied.code}</span>
                      <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
                        −{fmt(couponApplied.discount)} aura
                      </span>
                    </div>
                    <button
                      onClick={clearCoupon}
                      style={{
                        background: 'transparent', border: 'none',
                        color: T.text3, cursor: 'pointer',
                        fontFamily: T.fontSans, fontSize: 11, padding: 0,
                      }}
                    >remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>PROMO CODE</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(); }}
                        placeholder="e.g. WELCOME15"
                        style={{
                          flex: 1, minWidth: 0,
                          padding: '8px 12px', borderRadius: T.r.md,
                          background: 'rgba(255,255,255,0.03)',
                          border: `0.5px solid ${
                            couponInput && couponCheck && !couponCheck.ok ? 'rgba(255,140,140,0.4)'
                            : couponInput && couponCheck && couponCheck.ok ? 'rgba(110,231,183,0.4)'
                            : T.glassBorder
                          }`,
                          color: T.text, fontFamily: T.fontMono, fontSize: 12,
                          letterSpacing: 0.5, textTransform: 'uppercase',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={!couponInput.trim()}
                        style={{
                          padding: '8px 14px', borderRadius: T.r.md,
                          background: 'rgba(255,255,255,0.06)',
                          border: `0.5px solid ${T.glassBorder}`,
                          color: couponInput.trim() ? T.text : T.text3,
                          cursor: couponInput.trim() ? 'pointer' : 'not-allowed',
                          fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                        }}
                      >Apply</button>
                    </div>
                    {couponInput && couponCheck && !couponCheck.ok && (
                      <div style={{ ...TY.small, color: 'rgba(255,140,140,0.85)', fontSize: 10.5, marginTop: 6 }}>
                        {couponCheck.reason === 'wrong-seller' ? "Not for this creator"
                         : couponCheck.reason === 'wrong-listing' ? "Doesn't apply here"
                         : couponCheck.reason === 'expired' ? 'Code expired'
                         : couponCheck.reason === 'used-up' ? 'Reached usage limit'
                         : 'Invalid code'}
                      </div>
                    )}
                    {couponInput && couponCheck && couponCheck.ok && couponCheck.coupon && (
                      <div style={{ ...TY.small, color: '#6ee7b7', fontSize: 10.5, marginTop: 6 }}>
                        {couponCheck.coupon.percentOff}% off — saves {fmt(couponCheck.discount)} aura. Press Apply.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Glass>

          {seller && (
            <Glass hover onClick={() => openSeller(seller)} style={{ padding: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <HoverOrbs restX={20} restY={30} size={280} color={T.accent} colorHi={T.accentHi}/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', gap: 8 }}>
                <div style={{ ...TY.micro, color: T.text3 }}>SELLER</div>
                {follows && seller.id !== (window.ME?.id || 'me') && (
                  <FollowButton
                    followed={follows.has(seller.id)}
                    onToggle={() => {
                      const wasFollowing = follows.has(seller.id);
                      follows.toggle(seller.id);
                      try {
                        ElyNotify?.toast?.({
                          text: wasFollowing ? `Unfollowed ${seller.name.split(' ')[0]}` : `Following ${seller.name.split(' ')[0]}`,
                          kind: wasFollowing ? 'info' : 'success',
                        });
                      } catch {}
                    }}
                    size="sm"
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                <Avatar name={seller.name} src={seller.avatar} size={44}/>
                <div style={{ flex: 1 }}>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{seller.name}</div>
                  <div style={{ ...TY.small, color: T.text3, fontSize: 12 }}>@{seller.tag} · {seller.role}</div>
                </div>
              </div>
              {sellerStats && (
                <div style={{ display: 'flex', gap: 18, marginTop: 14, position: 'relative' }}>
                  <div>
                    <div style={{ ...TY.numSm, color: T.text }}>{sellerStats.listings}</div>
                    <div style={{ ...TY.micro, color: T.text3 }}>Listings</div>
                  </div>
                  <div>
                    <div style={{ ...TY.numSm, color: T.text }}>{fmt(sellerStats.sales)}</div>
                    <div style={{ ...TY.micro, color: T.text3 }}>Sales</div>
                  </div>
                  <div>
                    <div style={{ ...TY.numSm, color: T.text }}>{sellerStats.avgRating.toFixed(1)}</div>
                    <div style={{ ...TY.micro, color: T.text3 }}>Avg ★</div>
                  </div>
                </div>
              )}
              {messages && seller.id !== (window.ME?.id || 'me') && (
                <div style={{ marginTop: 14, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <Btn
                    icon={<IMessage size={14}/>}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const tid = messages.startThread(seller.id);
                      if (tid) setView({ id: 'messages', threadId: tid });
                    }}
                  >Message {seller.name.split(' ')[0]}</Btn>
                </div>
              )}
            </Glass>
          )}

          {related.length > 0 && (
            <Glass style={{ padding: 18 }}>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>RELATED</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {related.map((r) => (
                  <button key={r.id} onClick={() => openListing(r)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: T.r.sm, overflow: 'hidden', flexShrink: 0, position: 'relative', background: `linear-gradient(135deg, ${listingTypeMeta(r.type).hue}55, rgba(255,255,255,0.02))` }}>
                      <CoverFallback type={r.type} seed={r.id} size={20}/>
                      {r.cover && <img src={r.cover} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative' }} onError={(e) => { e.currentTarget.style.display = 'none'; }}/>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TY.small, color: T.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                      <div style={{ ...TY.small, fontSize: 11, color: T.accentHi, fontFamily: T.fontSans }}>{fmt(r.price)} {r.billing === 'monthly' ? '/mo' : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Glass>
          )}
        </div>
      </div>

      {currentLightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40, cursor: 'zoom-out',
          }}
        >
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }} style={{
              position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: `0.5px solid ${T.glassBorder}`,
              color: T.text, cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>‹</button>
          )}
          {lightbox < (imageItems.length - 1) && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }} style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: `0.5px solid ${T.glassBorder}`,
              color: T.text, cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>›</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} aria-label="Close image viewer" style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: `0.5px solid ${T.glassBorder}`,
            color: T.text, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>×</button>
          <div style={{
            position: 'absolute', top: 24, left: 24,
            ...TY.small, color: T.text2,
            padding: '6px 12px', borderRadius: T.r.pill,
            background: 'rgba(255,255,255,0.06)',
            border: `0.5px solid ${T.glassBorder}`,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            {lightbox + 1} / {imageItems.length}
          </div>
          <img
            src={currentLightbox.src}
            alt={currentLightbox.alt || `${l.title} ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              borderRadius: T.r.md,
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ────────────── Store (legacy reward-only view, kept for compat) ──────────────
function StoreView({ state, onQuick, focusId }) {
  if (T.zodiac && window.ZodiacStoreView) {
    return <window.ZodiacStoreView state={state} onQuick={onQuick} focusId={focusId}/>;
  }
  const [cat, setCat] = React.useState('All');
  // When search navigated us here with a focusId, snap the category filter
  // back to "All" so the target is guaranteed to be visible.
  React.useEffect(() => { if (focusId) setCat('All'); }, [focusId]);
  useFocusHighlight(focusId);
  const cats = ['All', 'Software', 'Club', 'Merch', 'Cards', 'Events'];
  const items = cat === 'All' ? REWARDS : REWARDS.filter(r => r.category === cat);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('store.kicker')}</div>
          <h1 style={{ ...TY.h1, margin: 0 }}>{t('store.title')}<span style={{ color: T.accentHi }}>.</span></h1>
        </div>
        <Glass style={{ padding: '14px 22px', textAlign: 'right' }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>{t('store.balance')}</div>
          <div style={{ ...TY.numMed, color: T.accentHi }}>{fmt(state.aura)}</div>
        </Glass>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {cats.map(c => {
          const active = cat === c;
          const label = c === 'All' ? t('store.allCat') : c;
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
            }}>{label}</button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Glass style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>{t('store.empty')}</div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>{t('store.emptySub')}</div>
        </Glass>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {items.map(r => <RewardCard key={r.id} r={r} state={state} onRedeem={() => onQuick.redeem(r)}/>)}
        </div>
      )}
    </div>
  );
}

// Helpers for the image-overlay status chips used by RewardCard. Extracted
// so both AVAILABLE (green) and X-LEFT (red) render through the same style
// function — guarantees visual parity and makes it trivial to tweak the
// pattern in one place later. `hue` controls text colour, dot colour, and
// the subtle outer glow; everything else (dark translucent backdrop, blur,
// padding, font weight, letter-spacing) stays constant.
const imageChipStyle = (hue) => ({
  position: 'absolute', top: 10, right: 10,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px',
  borderRadius: T.r.pill,
  background: 'rgba(8,10,18,0.62)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: `0.5px solid ${hue}55`,
  color: hue,
  fontFamily: T.fontSans, fontWeight: 600, fontSize: 10,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  boxShadow: `0 4px 14px rgba(0,0,0,0.35), 0 0 12px ${hue}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
  whiteSpace: 'nowrap',
});
const imageChipDotStyle = (hue) => ({
  width: 5, height: 5, borderRadius: '50%',
  background: hue,
  boxShadow: `0 0 8px ${hue}`,
});

function RewardCard({ r, state, onRedeem }) {
  // Two independent gates — level (permanent block) and aura (temporary,
  // user just needs to farm more). Before, we only checked level, so cards
  // that were level-OK but too expensive still showed a live Redeem button.
  // Clicking it would fail server-side with insufficient balance, which felt
  // broken from the UI. Now we reflect both gates visually.
  const levelLocked = state.level < r.level;
  const auraShort = state.aura < r.price;
  const locked = levelLocked || auraShort;
  // "Affordable" = user can actually act on this card right now. We lean
  // into the visual distinction because cheap/locked cards and
  // ready-to-redeem cards were reading almost identical in the grid — the
  // tiny secondary button didn't do enough. Now affordable cards get a
  // breathing accent ring, a colored price, and a primary CTA with a
  // slow glow pulse.
  const affordable = !locked;
  const hues = { Software: '#7FB0FF', Club: T.accentHi, Merch: '#C89DFF', Cards: '#5FD99A', Events: '#FFD166' };
  const hue = hues[r.category] || T.accent;
  return (
    <Glass
      data-focus-id={r.id}
      hover={!locked}
      style={{
        padding: 16, opacity: levelLocked ? 0.55 : 1,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // Accent ring on affordable cards — replaces the default glass
        // border with an accent-tinted one and adds an outer glow. Subtle
        // but unmistakable once you scan the grid.
        border: affordable ? `0.5px solid ${T.accent}55` : undefined,
        boxShadow: affordable
          ? `inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02), 0 12px 50px rgba(0,0,0,0.45), 0 0 0 1px ${T.accent}22, 0 0 28px ${T.accent}22`
          : undefined,
      }}
    >
      {/* Scoped keyframes — card-level pulse runs only when affordable.
          cardGlow gently breathes the outer accent halo. ctaGlow pulses
          the primary CTA's own shadow at the same rhythm so the button
          and the ring feel linked. */}
      {affordable && (
        <style>{`
          @keyframes cardGlow {
            0%, 100% { box-shadow: inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02), 0 12px 50px rgba(0,0,0,0.45), 0 0 0 1px ${T.accent}22, 0 0 24px ${T.accent}22; }
            50%      { box-shadow: inset 0 1px 0 ${T.glassHi}, inset 0 0 0 0.5px rgba(255,255,255,0.02), 0 12px 50px rgba(0,0,0,0.45), 0 0 0 1px ${T.accent}44, 0 0 40px ${T.accent}55; }
          }
          @keyframes ctaGlow {
            0%, 100% { box-shadow: 0 4px 14px ${T.accent}55, 0 0 0 0 ${T.accent}00; }
            50%      { box-shadow: 0 6px 22px ${T.accent}88, 0 0 0 3px ${T.accent}22; }
          }
        `}</style>
      )}
      <div style={{
        aspectRatio: '4/3', borderRadius: T.r.md, marginBottom: 14, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${hue}55, rgba(255,255,255,0.02))`,
        border: `0.5px solid ${T.glassBorder}`,
      }}>
        {r.image ? (
          <img
            src={r.image}
            alt={r.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 15px)` }}/>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.text3, fontFamily: T.fontMono, fontSize: 11,
            }}>{r.title.split(' ')[0].toLowerCase()}.png</div>
          </>
        )}
        {/* Status chips — unified "dark glass pill" pattern for both
            AVAILABLE and X-LEFT. Dark translucent bg + backdrop blur means
            contrast is guaranteed on any product image (pastel clouds, bright
            logos, whatever) without resorting to a loud solid-color badge
            that fights the app's glass aesthetic. Only the accent hue and
            label change between semantics:
              • AVAILABLE  — green (T.green) — "go, you can take this"
              • X LEFT     — red   (T.red)   — "scarcity, act soon"
            The dot mirrors the text color and gets its own glow so the chip
            reads as a live indicator, not a static label. */}
        {affordable && (
          <span style={imageChipStyle(T.green)} data-chip="available">
            <span style={imageChipDotStyle(T.green)}/>
            {t('store.available') || 'AVAILABLE'}
          </span>
        )}
        {r.stock <= 5 && (
          <span style={{ ...imageChipStyle(T.red), left: 10, right: 'auto' }} data-chip="stock">
            <span style={imageChipDotStyle(T.red)}/>
            {r.stock} {t('store.left')}
          </span>
        )}
      </div>
      <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{r.title}</div>
      <div style={{ ...TY.small, color: T.text3, marginTop: 2, marginBottom: 14, flex: 1 }}>{r.sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {/* Price lights up in accent + gains a subtle text-glow when
              affordable — turns the number into a "this is yours" signal. */}
          <div style={{
            ...TY.numSm,
            color: affordable ? T.accentHi : T.text,
            fontSize: 15,
            textShadow: affordable ? `0 0 12px ${T.accentGlow}` : 'none',
          }}>{fmt(r.price)}</div>
          <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{t('home.aura')}</div>
        </div>
        {levelLocked
          ? <Tag muted><ILock size={11}/>&nbsp;L{r.level}</Tag>
          : auraShort
            ? <Tag muted>−{fmt(r.price - state.aura)}</Tag>
            : (
                // Primary filled button with a breathing glow animation.
                // We render a custom button instead of <Btn variant="primary">
                // so we can attach the ctaGlow keyframe without fighting the
                // shared Btn style map. Inline onMouseEnter/Leave handle the
                // stronger hover lift that the default Btn doesn't do.
                <button
                  onClick={onRedeem}
                  style={{
                    ...TY.small,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px',
                    borderRadius: T.r.pill,
                    border: 'none',
                    background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    animation: 'ctaGlow 2.4s ease-in-out infinite',
                    transition: 'transform 180ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  {t('store.redeem')}
                  <span style={{ fontSize: 13, marginLeft: -2, opacity: 0.9 }}>→</span>
                </button>
              )}
      </div>
    </Glass>
  );
}
