// dist/zodiac/views3.jsx — third batch of Zodiac variants.
// Less-central screens: Welcome / Shortcuts / Creator dashboard / Plugin panel
// / Publish modal. Same gate pattern.

// ─── Welcome modal (first login) ───
function ZodiacWelcomeModal({ me, onClose }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const firstName = (me?.name || 'there').split(' ')[0];
  const [enablingPush, setEnablingPush] = React.useState(false);
  const [pushState, setPushState] = React.useState(null);

  async function enablePush() {
    if (enablingPush) return;
    setEnablingPush(true);
    try {
      const s = await window.ElyNotify?.requestPermission?.();
      setPushState(s || 'default');
      if (s === 'granted') window.ElyNotify?.setPref?.('push', true);
    } finally { setEnablingPush(false); }
  }

  function markWelcomed() {
    try { localStorage.setItem(`elyhub.welcomed.${me?.id || 'me'}`, '1'); } catch {}
    onClose?.();
  }

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .3s', padding: 20,
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 540,
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: '40px 36px', overflow: 'hidden',
        animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 22 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 22 })}
        </>}
        {window.ZStarburst && (
          <div style={{ position: 'absolute', right: -50, top: -40, opacity: 0.4, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 280, color: Z.gold, sw: 0.4, points: 16 })}
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <div style={{ ...ZTY.capsLg, color: Z.gold, marginBottom: 12, fontSize: 12, letterSpacing: '0.3em' }}>
            ✦ THE ORDER WELCOMES YOU ✦
          </div>
          <h1 style={{ ...ZTY.h1, margin: '0 0 12px', color: Z.parch, fontSize: 44, fontStyle: 'italic' }}>
            Welcome, <span style={goldFill}>{firstName}</span>
          </h1>
          <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 24 }}>
            ElyHub is a marketplace and chronicle for makers. Your aura
            tracks your standing — earn it, gift it, or trade it for relics.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Daily claims', body: 'Tag posts and boost the Discord — small acts, daily aura.' },
              { label: 'The bazaar', body: 'Plugins, themes, packs. All paid in aura.' },
              { label: 'The order', body: 'Climb the leaderboard, earn relics, find your sign.' },
            ].map((p, i) => (
              <div key={p.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 12, flexShrink: 0, paddingTop: 2 }}>
                  {['I', 'II', 'III'][i]}.
                </div>
                <div>
                  <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic' }}>{p.label}</div>
                  <div style={{ ...ZTY.body, color: Z.text3, fontSize: 13, fontStyle: 'italic' }}>{p.body}</div>
                </div>
              </div>
            ))}
          </div>

          {pushState !== 'granted' && pushState !== 'denied' && (
            <div style={{
              padding: 14, marginBottom: 18,
              border: `1px solid ${Z.hair2}`, background: Z.ink3,
            }}>
              <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic', fontSize: 14, marginBottom: 4 }}>
                Hear the omens.
              </div>
              <div style={{ ...ZTY.body, color: Z.text3, fontSize: 12, fontStyle: 'italic', marginBottom: 10 }}>
                Push notifications when aura is gifted, levels rise, or the bazaar drops.
              </div>
              {window.ZBtn && React.createElement(window.ZBtn,
                { variant: 'secondary', size: 'sm', onClick: enablePush, disabled: enablingPush },
                enablingPush ? 'ASKING…' : 'ENABLE OMENS')}
            </div>
          )}

          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', full: true, onClick: markWelcomed, size: 'lg' },
            'BEGIN')}
        </div>
      </div>
    </div>
  );
}

// ─── Shortcuts modal ───
function ZodiacShortcutsModal({ onClose }) {
  const Z = window.Z, ZTY = window.ZTY;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groups = [
    { title: 'NAVIGATION', items: [
      { keys: ['⌘', 'K'],     label: 'Open search' },
      { keys: ['⌘', '1-9'],   label: 'Jump to nav item' },
      { keys: ['G', 'H'],     label: 'Go home' },
      { keys: ['G', 'L'],     label: 'Leaderboard' },
      { keys: ['G', 'S'],     label: 'Marketplace' },
      { keys: ['G', 'P'],     label: 'Profile' },
    ]},
    { title: 'ACTIONS', items: [
      { keys: ['⌘', 'G'],     label: 'Send aura' },
      { keys: ['⌘', ','],     label: 'Settings' },
      { keys: ['⌘', '?'],     label: 'This menu' },
      { keys: ['⌘', 'R'],     label: 'Reload' },
    ]},
    { title: 'GENERAL', items: [
      { keys: ['ESC'],        label: 'Close modal / drawer' },
      { keys: ['⇧', 'R'],     label: 'Replay intro (dev)' },
    ]},
  ];

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .25s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 32, overflow: 'auto',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 28 }}>Shortcuts</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, padding: 0, background: 'transparent',
            border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
          }}>
            {window.ZIX && React.createElement(window.ZIX, { size: 14, color: Z.text2 })}
          </button>
        </div>
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: 22 }}>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 12 }}>{g.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.items.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: `1px solid ${Z.hair}`,
                }}>
                  <span style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>{it.label}</span>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {it.keys.map((k, j) => (
                      <span key={j} style={{
                        ...ZTY.capsSm, fontSize: 11, padding: '4px 9px',
                        background: Z.ink3, border: `1px solid ${Z.hair2}`,
                        color: Z.gold, fontFamily: Z.fontCaps,
                      }}>{k}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Creator Dashboard ───
function ZodiacCreatorDashboardView({ state, setView, publishing, onEdit, reviews, messages, coupons }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const me = window.ME || {};
  const _v = publishing?.version;
  const dedup = typeof window.dedupTieredListings === 'function' ? window.dedupTieredListings : (x) => x;
  const listings = dedup((window.LISTINGS || []).filter((l) => l.sellerId === (me.id || 'me')));

  if (!listings.length) {
    return (
      <div style={{
        padding: 60, textAlign: 'center',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginBottom: 14 }}>
          You haven't forged any relics yet.
        </div>
        {window.ZBtn && React.createElement(window.ZBtn,
          { variant: 'secondary', size: 'sm', onClick: () => setView({ id: 'profile' }) },
          '← BACK TO PROFILE')}
      </div>
    );
  }

  const totals = listings.reduce((acc, l) => {
    acc.sales += l.sales || 0;
    acc.downloads += l.downloads || 0;
    acc.earned += (l.sales || 0) * (l.price || 0);
    return acc;
  }, { sales: 0, downloads: 0, earned: 0 });
  const reviewCount = listings.reduce((acc, l) => {
    const c = (typeof window.reviewStatsForListing === 'function')
      ? window.reviewStatsForListing(l.id).count : 0;
    return acc + c;
  }, 0);

  return (
    <div>
      <button onClick={() => setView({ id: 'profile' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK TO PROFILE</button>

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 10 }}>FORGE · CHRONICLE</div>
        <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 56, fontStyle: 'italic' }}>
          Maker Studio
        </h1>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'RELICS', value: listings.length },
          { label: 'SALES', value: totals.sales },
          { label: 'DOWNLOADS', value: totals.downloads },
          { label: 'AURA EARNED', value: Number(totals.earned).toLocaleString('en-US') },
          { label: 'REVIEWS', value: reviewCount },
        ].map((s) => (
          <div key={s.label} style={{
            position: 'relative', padding: 22,
            background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
            border: `1px solid ${Z.hair2}`,
          }}>
            <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>{s.label}</div>
            <div style={{ ...ZTY.h2, ...goldFill, fontSize: 28, fontStyle: 'italic' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Listings table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ ...ZTY.capsLg, color: Z.gold, fontSize: 11 }}>I.</span>
          <span style={{ ...ZTY.h2, color: Z.parch, fontSize: 26, fontStyle: 'italic' }}>Your Relics</span>
        </div>
        <div style={{
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`, padding: 6,
        }}>
          {listings.map((l, i) => {
            const stats = (typeof window.reviewStatsForListing === 'function')
              ? window.reviewStatsForListing(l.id) : { count: 0, avg: 0 };
            const avg = stats.count > 0 ? stats.avg : (l.rating || 0);
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px',
                borderBottom: i === listings.length - 1 ? 'none' : `1px solid ${Z.hair}`,
              }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.title}
                  </div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>
                    {(l.type || 'ITEM').toUpperCase()}{l.featured ? ' · FEATURED' : ''}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ ...ZTY.body, ...goldFill }}>{Number(l.price || 0).toLocaleString('en-US')}</div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>AURA</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ ...ZTY.body, color: Z.parch, fontVariantNumeric: 'tabular-nums' }}>{l.sales || 0}</div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>SALES</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ ...ZTY.body, color: avg > 0 ? Z.gold : Z.text3 }}>
                    {avg > 0 ? `✦ ${avg.toFixed(1)}` : '—'}
                  </div>
                  <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>RATING</div>
                </div>
                {window.ZBtn && React.createElement(window.ZBtn,
                  { variant: 'secondary', size: 'sm', onClick: () => onEdit?.(l) }, 'EDIT')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Generic plugin panel ───
function ZodiacPluginPanelView({ listingId, library, setView }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const listing = (window.LISTINGS || []).find((x) => x.id === listingId);
  const entry = library?.items?.find((it) => it.listingId === listingId);

  // Hugin redirect (matches host behavior)
  const isHugin = listing && (listing.kassa_product_id || listing.kassaProductId) === 'gleipnir';
  React.useEffect(() => {
    if (isHugin) setView({ id: 'zephyro' });
  }, [isHugin]);
  if (isHugin) return null;

  if (!listing) {
    return (
      <div style={{
        padding: 60, textAlign: 'center',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
      }}>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>This plugin sleeps.</div>
      </div>
    );
  }

  const expires = entry?.expiresAt
    ? new Date(entry.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const cancelled = entry?.status === 'cancelled';
  const active = entry?.status === 'active' && (!entry.expiresAt || entry.expiresAt > Date.now());

  return (
    <div>
      <button onClick={() => setView({ id: 'library' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK TO LIBRARY</button>

      <div style={{
        position: 'relative', overflow: 'hidden', padding: '40px 48px',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        marginBottom: 24,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}
        {window.ZStarburst && (
          <div style={{ position: 'absolute', right: -50, top: -30, opacity: 0.3, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 280, color: Z.gold, sw: 0.4, points: 14 })}
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>
            PLUGIN{listing.billing === 'monthly' ? ' · SUBSCRIPTION' : ''}
          </div>
          <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 44, fontStyle: 'italic' }}>
            {listing.title}
          </h1>
          {listing.tagline && (
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 16, marginTop: 8, marginBottom: 18 }}>
              {listing.tagline}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {active && window.ZTag && React.createElement(window.ZTag,
              { color: cancelled ? Z.copper : Z.good, glow: true },
              cancelled ? '◐ ENDS SOON' : '✦ ACTIVE')}
            {expires && (
              <span style={{ ...ZTY.capsSm, color: Z.text3, alignSelf: 'center' }}>
                {cancelled ? 'UNTIL' : 'RENEWS'} {expires.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {listing.description && (
        <div style={{
          padding: 24,
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 12 }}>ABOUT</div>
          <div style={{ ...ZTY.body, color: Z.text, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
            {listing.description}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Publish listing modal ───
// Simplified — just enough to create or edit. Full validation/preview lives
// in the host's PublishListingModal; we mirror the shape and let the host's
// onPublish/onUpdate handle the actual write.
function ZodiacPublishListingModal({ open, onClose, onPublish, onUpdate, editing }) {
  const Z = window.Z, ZTY = window.ZTY;
  const [type, setType] = React.useState(editing?.type || 'plugin');
  const [title, setTitle] = React.useState(editing?.title || '');
  const [tagline, setTagline] = React.useState(editing?.tagline || '');
  const [description, setDescription] = React.useState(editing?.description || '');
  const [price, setPrice] = React.useState(editing?.price ?? 1000);
  const [billing, setBilling] = React.useState(editing?.billing || 'one-time');
  const [tagsInput, setTagsInput] = React.useState((editing?.tags || []).join(', '));
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    if (!title.trim()) { setErr('Title required.'); return; }
    if (!(price >= 0)) { setErr('Price must be a number.'); return; }
    setErr(null); setSubmitting(true);
    try {
      const payload = {
        type, title: title.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        price: Number(price),
        billing,
        tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editing) await onUpdate?.(editing.id, payload);
      else        await onPublish?.(payload);
      onClose?.();
    } catch (e) { setErr(e.message || 'publish failed'); }
    finally { setSubmitting(false); }
  }

  const types = [
    { v: 'plugin', l: 'PLUGIN' }, { v: 'theme', l: 'THEME' },
    { v: 'pack',   l: 'PACK'   }, { v: 'asset', l: 'ASSET' },
  ];
  const billings = [
    { v: 'one-time', l: 'ONE-TIME' }, { v: 'monthly', l: 'MONTHLY' },
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={!submitting ? onClose : undefined} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .25s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 580, maxHeight: '90vh',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 32, overflow: 'auto',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 28 }}>
            {editing ? 'Edit Relic' : 'Forge Relic'}
          </h2>
          <button onClick={!submitting ? onClose : undefined} style={{
            width: 32, height: 32, padding: 0, background: 'transparent',
            border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
          }}>
            {window.ZIX && React.createElement(window.ZIX, { size: 14, color: Z.text2 })}
          </button>
        </div>

        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>TYPE</div>
        <div style={{ display: 'flex', gap: 4, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink2, marginBottom: 18, width: 'fit-content' }}>
          {types.map((opt) => (
            <button key={opt.v} onClick={() => setType(opt.v)} disabled={submitting} style={{
              ...ZTY.capsSm, padding: '6px 14px', cursor: 'pointer',
              background: type === opt.v ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
              color: type === opt.v ? Z.ink : Z.text2,
              border: 'none',
            }}>{opt.l}</button>
          ))}
        </div>

        <ZField label="TITLE">
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting}
            placeholder="A name worthy of the order" style={zInputStyle()}/>
        </ZField>

        <ZField label="TAGLINE">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={submitting}
            placeholder="One line of why" style={zInputStyle()}/>
        </ZField>

        <ZField label="DESCRIPTION">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting}
            placeholder="Explain the relic" rows={5} style={{ ...zInputStyle(), resize: 'vertical', minHeight: 100 }}/>
        </ZField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ZField label="PRICE (AURA)">
            <input type="number" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
              disabled={submitting} style={zInputStyle()}/>
          </ZField>
          <ZField label="BILLING">
            <div style={{ display: 'flex', gap: 4, padding: 4, border: `1px solid ${Z.hair2}`, background: Z.ink3 }}>
              {billings.map((opt) => (
                <button key={opt.v} onClick={() => setBilling(opt.v)} disabled={submitting} style={{
                  ...ZTY.capsSm, padding: '6px 12px', cursor: 'pointer', flex: 1,
                  background: billing === opt.v ? `linear-gradient(180deg, ${Z.gold}, ${Z.goldLo})` : 'transparent',
                  color: billing === opt.v ? Z.ink : Z.text2,
                  border: 'none',
                }}>{opt.l}</button>
              ))}
            </div>
          </ZField>
        </div>

        <ZField label="TAGS (COMMA-SEPARATED)">
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={submitting}
            placeholder="ui, productivity, ai" style={zInputStyle()}/>
        </ZField>

        {err && (
          <div style={{
            ...ZTY.body, color: Z.bad, fontStyle: 'italic', marginBottom: 14,
            padding: 12, border: `1px solid ${Z.bad}55`, background: 'rgba(161,71,53,0.12)',
          }}>⚠ {err}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'secondary', onClick: onClose, disabled: submitting }, 'CANCEL')}
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', full: true, onClick: handleSubmit, disabled: submitting },
            submitting ? 'FORGING…' : editing ? 'SAVE' : 'PUBLISH')}
        </div>
      </div>
    </div>
  );
}

function ZField({ label, children }) {
  const Z = window.Z, ZTY = window.ZTY;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function zInputStyle() {
  const Z = window.Z, ZTY = window.ZTY;
  return {
    width: '100%', padding: '10px 14px',
    background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
    ...ZTY.body, color: Z.parch, fontStyle: 'italic',
  };
}

// ─── Settings modal — zodiac chrome wrapping the host panes ───
// We don't reimplement Account/Notif/Appearance/Downloads — those panes
// are huge and the host already exposes them on window. We just wrap them
// in a zodiac shell (gold corners, italic title, ink+gold tabs, roman
// numerals) so the modal feels native to the theme.
function ZodiacSettingsModal({ onClose, tweaks, tweak, resolvedTheme, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride, library }) {
  const Z = window.Z, ZTY = window.ZTY;
  const [section, setSection] = React.useState('account');
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = [
    { id: 'account',   label: 'ACCOUNT',       icon: window.ZIUser },
    { id: 'notif',     label: 'OMENS',         icon: window.ZIBell },
    { id: 'appear',    label: 'APPEARANCE',    icon: window.ZSun ? null : null }, // sun-as-glyph below
    { id: 'downloads', label: 'DOWNLOADS',     icon: window.ZIArrowDown },
    { id: 'about',     label: 'ABOUT',         icon: window.ZICheck },
  ];

  const Pane = (() => {
    if (section === 'account')   return window.AccountPane;
    if (section === 'notif')     return window.NotifPane;
    if (section === 'downloads') return window.DownloadsPane;
    if (section === 'appear')    return window.AppearancePane;
    return null;
  })();

  const lang = window.ElyI18N?.getLang?.() || 'en';
  const setLang = (code) => window.ElyI18N?.setLang?.(code);
  const wide = section === 'appear';

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn .25s',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative',
        width: wide ? 980 : 820, maxWidth: '100%',
        height: wide ? 660 : 580, maxHeight: '90vh',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        display: 'flex', overflow: 'hidden',
        animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.05)',
        transition: 'width .25s, height .25s',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}

        {/* Sidebar */}
        <div style={{
          width: 240, padding: '24px 20px',
          borderRight: `1px solid ${Z.hair2}`,
          background: `linear-gradient(180deg, rgba(10,9,8,0.5), rgba(10,9,8,0.2))`,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 2 }}>SCRIBE'S DESK</div>
              <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 22 }}>Settings</h2>
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, padding: 0, background: 'transparent',
              border: `1px solid ${Z.hair2}`, color: Z.text2, cursor: 'pointer',
            }}>
              {window.ZIX && React.createElement(window.ZIX, { size: 12, color: Z.text2 })}
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map((s, i) => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: active ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})` : 'transparent',
                  border: 'none',
                  borderLeft: active ? `2px solid ${Z.gold}` : '2px solid transparent',
                  color: active ? Z.parch : Z.text2,
                  fontFamily: Z.fontSerif, fontSize: 14,
                  fontStyle: 'italic',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all .2s',
                }}>
                  <span style={{ ...ZTY.capsSm, color: active ? Z.gold : Z.text4, width: 22, fontFamily: Z.fontCaps }}>
                    {['I', 'II', 'III', 'IV', 'V'][i]}.
                  </span>
                  {s.id === 'appear' && window.ZSun
                    ? React.createElement(window.ZSun, { size: 14, color: active ? Z.gold : Z.text2, sw: 0.8 })
                    : (s.icon && React.createElement(s.icon, { size: 14, color: active ? Z.gold : Z.text2, sw: 1 }))}
                  <span style={{ flex: 1 }}>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content — host panes inside zodiac chrome */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', position: 'relative' }}>
          {section === 'account' && Pane && React.createElement(Pane, { onAfterSignOut: onClose })}
          {section === 'notif' && Pane && React.createElement(Pane)}
          {section === 'downloads' && Pane && React.createElement(Pane)}
          {section === 'appear' && Pane && React.createElement(Pane, {
            tweaks, tweak, resolved: resolvedTheme,
            updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride,
            library, lang, setLang,
          })}
          {section === 'about' && (
            <div>
              <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>V.</div>
              <h2 style={{ ...ZTY.h2, color: Z.parch, fontStyle: 'italic', margin: '0 0 16px' }}>About ElyHub</h2>
              <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', lineHeight: 1.6, maxWidth: 540 }}>
                ElyHub is a marketplace and chronicle for makers — built around aura,
                a currency earned through participation in the order. The Zodiac
                theme is unlocked by Hugin, the keeper of omens.
              </div>
              <div style={{ ...ZTY.capsSm, color: Z.text3, marginTop: 32 }}>
                BUILT WITH TAURI · REACT · CLOUDFLARE WORKERS
              </div>
            </div>
          )}
          {!Pane && section !== 'about' && (
            <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic' }}>
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Report modal ───
function ZodiacReportModal({ target, reports, onClose }) {
  const Z = window.Z, ZTY = window.ZTY;
  const REPORT_REASONS = window.REPORT_REASONS || {};
  const options = REPORT_REASONS[target.kind] || REPORT_REASONS.user || [];
  const [reason, setReason] = React.useState(options[0]?.id);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const already = reports?.has?.(target.kind, target.id);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = () => {
    if (already) { onClose(); return; }
    const res = reports?.submit?.({ kind: target.kind, targetId: target.id, reason, note });
    if (res?.ok) {
      setSent(true);
      try { window.ElyNotify?.toast?.({ title: 'Report sent', body: 'A mod will take a look.', kind: 'success' }); } catch {}
      setTimeout(onClose, 700);
    }
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .25s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 460,
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 28,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
          {window.ZCorner && React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
        </>}
        <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 6 }}>
          REPORT {(target.kind || '').toUpperCase()}
        </div>
        <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 26, marginBottom: 6 }}>
          {already ? 'Already reported' : "What's wrong?"}
        </h2>
        <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 13, marginBottom: 20 }}>
          {target.name && <>Reporting <span style={{ color: Z.parch }}>{target.name}</span>. </>}
          {already
            ? "You've already flagged this. A mod will look."
            : 'Mods review every report. Abuse of the system can limit your account.'}
        </div>
        {!already && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {options.map((o) => {
                const active = reason === o.id;
                return (
                  <button key={o.id} onClick={() => setReason(o.id)} style={{
                    padding: '10px 14px', textAlign: 'left',
                    background: active ? Z.ink3 : 'transparent',
                    border: `1px solid ${active ? Z.gold : Z.hair2}`,
                    borderLeft: active ? `3px solid ${Z.gold}` : `1px solid ${Z.hair2}`,
                    color: active ? Z.parch : Z.text2,
                    cursor: 'pointer', ...ZTY.body, fontStyle: 'italic',
                  }}>
                    <div>{o.label}</div>
                    {o.hint && <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9, marginTop: 2 }}>{o.hint}</div>}
                  </button>
                );
              })}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Optional details…" rows={3} maxLength={500}
              style={{
                width: '100%', padding: '10px 14px', marginBottom: 14,
                background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
                ...ZTY.body, color: Z.parch, fontStyle: 'italic', resize: 'vertical',
              }}/>
          </>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'secondary', onClick: onClose }, 'CANCEL')}
          {window.ZBtn && React.createElement(window.ZBtn,
            { variant: 'primary', full: true, onClick: onSubmit, disabled: sent || already },
            sent ? 'SENT' : already ? 'CLOSE' : 'SUBMIT')}
        </div>
      </div>
    </div>
  );
}

// ─── DM picker modal ───
function ZodiacDMPickerModal({ listing, seller, messages, setView, onClose }) {
  const Z = window.Z, ZTY = window.ZTY;
  const [q, setQ] = React.useState('');
  const me = window.ME || {};
  const allMembers = Array.isArray(window.MEMBERS) ? window.MEMBERS : [];
  const recentIds = (typeof window.loadDmRecent === 'function') ? window.loadDmRecent() : [];

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const qNorm = q.trim().toLowerCase();
  const filtered = allMembers
    .filter((m) => m.id !== me.id && m.id !== seller?.id)
    .filter((m) => {
      if (!qNorm) return true;
      return (m.name || '').toLowerCase().includes(qNorm) || (m.tag || '').toLowerCase().includes(qNorm);
    })
    .sort((a, b) => {
      const ai = recentIds.indexOf(a.id);
      const bi = recentIds.indexOf(b.id);
      if (ai !== bi) { if (ai < 0) return 1; if (bi < 0) return -1; return ai - bi; }
      return (a.name || '').localeCompare(b.name || '');
    });

  const send = (m) => {
    if (typeof window.saveDmRecent === 'function') window.saveDmRecent(m.id);
    if (messages?.send && listing) {
      messages.send(m.id, `Check this out: ${listing.title}`, { listingId: listing.id });
    }
    setView?.({ id: 'messages', threadId: messages?.threadIdFor?.(m.id) });
    onClose?.();
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,4,3,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .25s', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 460, maxHeight: '85vh',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair3}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${Z.goldGlow}`,
        padding: 24, display: 'flex', flexDirection: 'column',
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 14 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 14 })}
        </>}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 4 }}>SEND BY OWL</div>
          <h2 style={{ ...ZTY.h2, margin: 0, color: Z.parch, fontStyle: 'italic', fontSize: 22 }}>
            {listing?.title ? `Share "${listing.title}"` : 'Pick a recipient'}
          </h2>
        </div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or tag…"
          style={{
            padding: '10px 14px', marginBottom: 12,
            background: Z.ink3, border: `1px solid ${Z.hair2}`, outline: 'none',
            ...ZTY.body, color: Z.parch, fontStyle: 'italic',
          }}/>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((m) => (
            <button key={m.id} onClick={() => send(m)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', background: 'transparent',
              border: `1px solid ${Z.hair}`, cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = Z.hair3}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = Z.hair}>
              {window.ZAvatar && React.createElement(window.ZAvatar, {
                name: m.name, src: m.avatarUrl || m.avatar, size: 30, sign: window.signOf?.(m.name),
              })}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ ...ZTY.capsSm, color: Z.text3, fontSize: 9 }}>@{m.tag}</div>
              </div>
              <span style={{ ...ZTY.capsSm, color: Z.gold }}>SEND →</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ ...ZTY.body, color: Z.text3, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
              No one matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Collection view (curated lists) ───
function ZodiacCollectionView({ state, setView, collectionId, wishlist }) {
  const Z = window.Z, ZTY = window.ZTY, goldFill = window.goldFill;
  const collection = (window.LISTING_COLLECTIONS || []).find((c) => c.id === collectionId);
  const rawItems = collection ? (window.getCollectionItems?.(collection) || []) : [];
  const [sort, setSort] = React.useState('default');

  if (!collection) {
    return (
      <div>
        <button onClick={() => setView({ id: 'store' })} style={{
          ...ZTY.capsSm, color: Z.gold, background: 'transparent',
          border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
        }}>← BACK TO MARKETPLACE</button>
        <div style={{
          padding: 60, textAlign: 'center',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair2}`,
        }}>
          <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic' }}>Collection not found.</div>
        </div>
      </div>
    );
  }

  const sortFns = {
    default:   null,
    priceAsc:  (a, b) => (a.price || 0) - (b.price || 0),
    priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
    new:       (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    rating:    (a, b) => (b.rating || 0) - (a.rating || 0),
  };
  const items = sort === 'default' ? rawItems : [...rawItems].sort(sortFns[sort]);

  const sorts = [
    { v: 'default',  l: 'CURATED' },
    { v: 'new',      l: 'NEW' },
    { v: 'priceAsc', l: 'PRICE ↑' },
    { v: 'priceDesc',l: 'PRICE ↓' },
    { v: 'rating',   l: 'RATING' },
  ];

  return (
    <div>
      <button onClick={() => setView({ id: 'store' })} style={{
        ...ZTY.capsSm, color: Z.gold, background: 'transparent',
        border: 'none', padding: 0, cursor: 'pointer', marginBottom: 22,
      }}>← BACK TO MARKETPLACE</button>

      <div style={{
        position: 'relative', overflow: 'hidden', padding: '36px 40px',
        background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
        border: `1px solid ${Z.hair2}`,
        marginBottom: 24,
      }}>
        {window.ZCorner && <>
          {React.createElement(window.ZCorner, { pos: 'tl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'tr', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'bl', color: Z.gold, size: 18 })}
          {React.createElement(window.ZCorner, { pos: 'br', color: Z.gold, size: 18 })}
        </>}
        {window.ZStarburst && (
          <div style={{ position: 'absolute', right: -40, top: -30, opacity: 0.3, pointerEvents: 'none' }}>
            {React.createElement(window.ZStarburst, { size: 280, color: Z.gold, sw: 0.4, points: 14 })}
          </div>
        )}
        <div style={{ position: 'relative', maxWidth: 600 }}>
          <div style={{ ...ZTY.capsSm, color: Z.gold, marginBottom: 8 }}>CURATED COLLECTION</div>
          <h1 style={{ ...ZTY.h1, margin: 0, color: Z.parch, fontSize: 44, fontStyle: 'italic' }}>
            {collection.title || collection.name}
          </h1>
          {collection.subtitle && (
            <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', marginTop: 8 }}>
              {collection.subtitle}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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

      {items.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
          border: `1px solid ${Z.hair}`,
          ...ZTY.body, color: Z.text3, fontStyle: 'italic',
        }}>
          The collection is empty.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {items.map((l) => (
            <div key={l.id} onClick={() => setView({ id: 'listing', focusId: l.id })} style={{
              cursor: 'pointer', padding: 18,
              background: `linear-gradient(180deg, ${Z.ink2}, ${Z.ink})`,
              border: `1px solid ${Z.hair2}`,
            }}>
              <div style={{ ...ZTY.capsSm, color: Z.text3, marginBottom: 4 }}>{(l.type || 'ITEM').toUpperCase()}</div>
              <div style={{ ...ZTY.h3, color: Z.parch, fontSize: 17, fontStyle: 'italic', marginBottom: 6 }}>{l.title}</div>
              {l.tagline && (
                <div style={{ ...ZTY.body, color: Z.text2, fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>
                  {l.tagline}
                </div>
              )}
              <div style={{ ...ZTY.body, ...goldFill, fontStyle: 'italic' }}>
                {Number(l.price || 0).toLocaleString('en-US')}
                <span style={{ ...ZTY.capsSm, color: Z.text3, marginLeft: 4 }}>AURA</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Expose
window.ZodiacReportModal            = ZodiacReportModal;
window.ZodiacDMPickerModal          = ZodiacDMPickerModal;
window.ZodiacCollectionView         = ZodiacCollectionView;
window.ZodiacSettingsModal          = ZodiacSettingsModal;
window.ZodiacWelcomeModal           = ZodiacWelcomeModal;
window.ZodiacShortcutsModal         = ZodiacShortcutsModal;
window.ZodiacCreatorDashboardView   = ZodiacCreatorDashboardView;
window.ZodiacPluginPanelView        = ZodiacPluginPanelView;
window.ZodiacPublishListingModal    = ZodiacPublishListingModal;
