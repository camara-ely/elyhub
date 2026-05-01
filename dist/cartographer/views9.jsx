// ElyHub — Cartographer (vintage) Discover + Saved + Feed views.
//
// Lightweight parchment wrappers for the marketplace browsing surfaces.
// We don't replicate the host's scoreDiscover algorithm — just render the
// available listings in a grid with vintage chrome.

// ─── CartographerDiscoverView ────────────────────────────────────────────
function CartographerDiscoverView({ state, setView, wishlist, follows, recent, library, blocks }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const all = (window.LISTINGS || []).filter((l) => !(blocks && blocks.has(l.sellerId)));
  const ownedIds = new Set((library?.items || []).filter((it) => it.status === 'active').map((it) => it.listingId));
  const myId = window.ME?.id || 'me';
  const items = all.filter((l) => !ownedIds.has(l.id) && l.sellerId !== myId).slice(0, 18);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ paddingBottom: 22, borderBottom: `1px solid ${M.hair2}` }}>
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.discover.eyebrow')}</div>
        <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>{tc('page.discover.title')}<span style={{ color: M.wax }}>.</span></h1>
        <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
          {tc('feed.sub', { c: '·', ckind: '', n: items.length }).replace('·  · ', '· ')}
        </div>
      </div>

      {items.length === 0 ? (
        <ParchmentEmpty
          title={tc('discover.empty.title')}
          sub={tc('discover.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((l) => <CartoListingCard key={l.id} l={l} setView={setView}/>)}
        </div>
      )}
    </div>
  );
}

// ─── CartographerSavedView ───────────────────────────────────────────────
function CartographerSavedView({ state, setView, wishlist }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const items = (wishlist?.items || [])
    .map((id) => (window.LISTINGS || []).find((l) => l.id === id))
    .filter(Boolean);
  const totalPrice = items.reduce((s, l) => s + (l.price || 0), 0);
  const affordable = items.filter((l) => (l.price || 0) <= (state?.aura || 0)).length;

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        paddingBottom: 22, borderBottom: `1px solid ${M.hair2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.saved.eyebrow')}</div>
          <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>{tc('page.saved.title')}<span style={{ color: M.wax }}>.</span></h1>
          {items.length > 0 && (
            <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
              {tc('saved.sub', { n: items.length, kind: tc(items.length === 1 ? 'saved.kind.s' : 'saved.kind.p'), a: affordable, p: fmt(totalPrice) })}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={() => setView({ id: 'store' })} style={{
            padding: '10px 18px',
            background: 'transparent', color: M.ink2,
            border: `1px solid ${M.hair3}`,
            fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.20em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>{tc('saved.cta')}</button>
        )}
      </div>

      {items.length === 0 ? (
        <ParchmentEmpty
          title={tc('saved.empty.title')}
          sub={tc('saved.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((l) => <CartoListingCard key={l.id} l={l} setView={setView}/>)}
        </div>
      )}
    </div>
  );
}

// ─── CartographerFeedView ────────────────────────────────────────────────
function CartographerFeedView({ state, setView, follows, wishlist }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const followedIds = new Set(follows?.items || []);
  const items = (window.LISTINGS || [])
    .filter((l) => followedIds.has(l.sellerId))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 24);

  // Group by creator
  const grouped = {};
  for (const l of items) {
    const k = l.sellerId || '_';
    grouped[k] = grouped[k] || [];
    grouped[k].push(l);
  }
  const creators = Object.keys(grouped);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ paddingBottom: 22, borderBottom: `1px solid ${M.hair2}` }}>
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.feed.eyebrow')}</div>
        <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>{tc('page.feed.title')}<span style={{ color: M.wax }}>.</span></h1>
        {items.length > 0 ? (
          <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
            {tc('feed.sub', { c: creators.length, ckind: tc(creators.length === 1 ? 'feed.creator.s' : 'feed.creator.p'), n: items.length })}
          </div>
        ) : (
          <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
            {tc('feed.empty.hint')}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <ParchmentEmpty
          title={tc('feed.empty.title')}
          sub={tc('feed.empty.sub')}/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((l) => <CartoListingCard key={l.id} l={l} setView={setView} showSeller/>)}
        </div>
      )}
    </div>
  );
}

// ─── Shared listing card (vintage) ───────────────────────────────────────
function CartoListingCard({ l, setView, showSeller }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  return (
    <div onClick={() => setView({ id: 'plugin', listingId: l.id })}
         style={{
           cursor: 'pointer', display: 'flex', flexDirection: 'column',
           background: '#EFE3C8', border: `1px solid ${M.hair2}`,
           boxShadow: '2px 4px 10px rgba(59,38,22,0.08)',
           transition: 'transform 0.15s, box-shadow 0.15s',
         }}
         onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '3px 6px 14px rgba(59,38,22,0.14)'; }}
         onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '2px 4px 10px rgba(59,38,22,0.08)'; }}>

      <div style={{
        height: 130,
        background: l.image
          ? `url("${l.image}") center/cover`
          : `linear-gradient(135deg, rgba(200,162,78,0.25), rgba(232,220,192,0.5))`,
        borderBottom: `1px solid ${M.hair}`,
        filter: 'sepia(0.20)',
      }}/>

      <div style={{ padding: '14px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4, fontSize: 9 }}>
          {String(l.type || tc('profile.listings.type')).toUpperCase()}
        </div>
        <div style={{ ...MTY.h3, color: M.ink, fontSize: 15, lineHeight: 1.2 }}>{l.title}</div>
        {l.tagline && (
          <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
            {l.tagline}
          </div>
        )}
        {showSeller && l.sellerName && (
          <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8, marginTop: 8 }}>
            {tc('feed.bySeller', { name: String(l.sellerName).toUpperCase() })}
          </div>
        )}

        <div style={{ flex: 1 }}/>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${M.hair}`,
        }}>
          <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 9 }}>{tc('common.price')}</span>
          <span style={{ ...MTY.num, fontSize: 16, color: M.wax }}>{fmt(l.price)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state (vintage) ──────────────────────────────────────────────
function ParchmentEmpty({ title, sub }) {
  const M = window.M, MTY = window.MTY;
  return (
    <div style={{
      ...MTY.body, color: M.ink3, textAlign: 'center',
      padding: '60px 24px', background: M.surface,
      border: `1px dashed ${M.hair2}`,
    }}>
      <div style={{ ...MTY.h3, color: M.ink2, marginBottom: 8, fontSize: 18 }}>{title}</div>
      <div style={{ ...MTY.hand, color: M.ink3, fontStyle: 'italic' }}>{sub}</div>
    </div>
  );
}

window.CartographerDiscoverView = CartographerDiscoverView;
window.CartographerSavedView    = CartographerSavedView;
window.CartographerFeedView     = CartographerFeedView;
