// ElyHub — Cartographer Modern Discover + Saved + Feed views.

// ─── ModernDiscoverView ───────────────────────────────────────────────────
function CartographerModernDiscoverView({ state, setView, wishlist, follows, recent, library, blocks }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const all = (window.LISTINGS || []).filter((l) => !(blocks && blocks.has(l.sellerId)));
  const ownedIds = new Set((library?.items || []).filter((it) => it.status === 'active').map((it) => it.listingId));
  const myId = window.ME?.id || 'me';
  const items = all.filter((l) => !ownedIds.has(l.id) && l.sellerId !== myId).slice(0, 18);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}` }}>
        <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.discover.eyebrow')}</div>
        <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.discover.title')}<span style={{ color: Mm.accent }}>.</span></h1>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
          {tc('feed.sub', { c: '·', ckind: '', n: items.length }).replace('·  · ', '· ')}
        </div>
      </div>

      {items.length === 0 ? (
        <DashboardEmpty title={tc('discover.empty.title')} sub={tc('discover.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {items.map((l) => <ModernListingCard key={l.id} l={l} setView={setView}/>)}
        </div>
      )}
    </div>
  );
}

// ─── ModernSavedView ──────────────────────────────────────────────────────
function CartographerModernSavedView({ state, setView, wishlist }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const items = (wishlist?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);
  const totalPrice = items.reduce((s, l) => s + (l.price || 0), 0);
  const affordable = items.filter((l) => (l.price || 0) <= (state?.aura || 0)).length;

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{
        paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.saved.eyebrow')}</div>
          <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.saved.title')}<span style={{ color: Mm.accent }}>.</span></h1>
          {items.length > 0 && (
            <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
              {tc('saved.sub', { n: items.length, kind: tc(items.length === 1 ? 'saved.kind.s' : 'saved.kind.p'), a: affordable, p: fmt(totalPrice) })}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={() => setView({ id: 'store' })} style={{
            padding: '9px 16px', borderRadius: 4,
            background: 'transparent', color: Mm.text2,
            border: `1px solid ${Mm.hair3}`,
            fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>{tc('saved.cta')}</button>
        )}
      </div>

      {items.length === 0 ? (
        <DashboardEmpty title={tc('saved.empty.title')} sub={tc('saved.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {items.map((l) => <ModernListingCard key={l.id} l={l} setView={setView}/>)}
        </div>
      )}
    </div>
  );
}

// ─── ModernFeedView ───────────────────────────────────────────────────────
function CartographerModernFeedView({ state, setView, follows, wishlist }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const followedIds = new Set(follows?.items || []);
  const items = (window.LISTINGS || [])
    .filter((l) => followedIds.has(l.sellerId))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 24);
  const grouped = {};
  for (const l of items) (grouped[l.sellerId || '_'] = grouped[l.sellerId || '_'] || []).push(l);
  const creators = Object.keys(grouped);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}` }}>
        <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.feed.eyebrow')}</div>
        <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.feed.title')}<span style={{ color: Mm.accent }}>.</span></h1>
        {items.length > 0 ? (
          <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
            {tc('feed.sub', { c: creators.length, ckind: tc(creators.length === 1 ? 'feed.creator.s' : 'feed.creator.p'), n: items.length })}
          </div>
        ) : (
          <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
            {tc('feed.empty.hint')}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <DashboardEmpty title={tc('feed.empty.title')} sub={tc('feed.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {items.map((l) => <ModernListingCard key={l.id} l={l} setView={setView} showSeller/>)}
        </div>
      )}
    </div>
  );
}

// ─── Shared listing card (modern) ────────────────────────────────────────
function ModernListingCard({ l, setView, showSeller }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  return (
    <div onClick={() => setView({ id: 'plugin', listingId: l.id })}
         style={{
           cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden',
           background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
           borderRadius: 6,
           transition: 'transform 0.15s, border-color 0.15s',
         }}
         onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; }}
         onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = Mm.hair2; }}>

      <div style={{
        height: 130, borderBottom: `1px solid ${Mm.hair}`,
        background: l.image
          ? `url("${l.image}") center/cover`
          : `linear-gradient(135deg, ${Mm.accent}22, ${Mm.cyan}11)`,
      }}/>

      <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 4, fontSize: 9 }}>
          {String(l.type || tc('profile.listings.type')).toUpperCase()}
        </div>
        <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 15, lineHeight: 1.2 }}>{l.title}</div>
        {l.tagline && (
          <div style={{ ...MmTY.small, color: Mm.text3, marginTop: 4 }}>{l.tagline}</div>
        )}
        {showSeller && l.sellerName && (
          <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginTop: 8 }}>
            {tc('feed.bySeller', { name: String(l.sellerName).toUpperCase() })}
          </div>
        )}

        <div style={{ flex: 1 }}/>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Mm.hair}`,
        }}>
          <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>{tc('common.price')}</span>
          <span style={{ ...MmTY.numTab, fontSize: 16, color: Mm.accent }}>{fmt(l.price)}</span>
        </div>
      </div>
    </div>
  );
}

function DashboardEmpty({ title, sub }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  return (
    <div style={{
      ...MmTY.body, color: Mm.text3, textAlign: 'center',
      padding: '60px 24px',
      background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`,
      borderRadius: 6,
    }}>
      <div style={{ ...MmTY.coord, color: Mm.text4, marginBottom: 10 }}>◌ {title.toUpperCase()}</div>
      {sub}
    </div>
  );
}

window.CartographerModernDiscoverView = CartographerModernDiscoverView;
window.CartographerModernSavedView    = CartographerModernSavedView;
window.CartographerModernFeedView     = CartographerModernFeedView;
