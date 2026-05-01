// ElyHub — Cartographer Modern StoreView.
// "Marketplace" as a topographic dashboard catalog.

function CartographerModernStoreView({ state, onQuick, focusId }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const REWARDS = window.REWARDS || [];

  const [cat, setCat] = React.useState('All');
  React.useEffect(() => { if (focusId) setCat('All'); }, [focusId]);

  const cats = [
    { id: 'All',      label: tc('store.cat.all') },
    { id: 'Software', label: tc('store.cat.software') },
    { id: 'Club',     label: tc('store.cat.club') },
    { id: 'Merch',    label: tc('store.cat.merch') },
    { id: 'Cards',    label: tc('store.cat.cards') },
    { id: 'Events',   label: tc('store.cat.events') },
  ];
  const items = cat === 'All' ? REWARDS : REWARDS.filter((r) => r.category === cat);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 16,
        paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}`,
      }}>
        <div>
          <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.store.eyebrow')}</div>
          <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>
            {tc('page.store.title')}<span style={{ color: Mm.accent }}>.</span>
          </h1>
          <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
            {tc('store.sub', { n: items.length, label: tc(items.length === 1 ? 'store.kind.singular' : 'store.kind.plural') })}
          </div>
        </div>

        <div style={{
          background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
          padding: '12px 22px', borderRadius: 6, textAlign: 'right',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: Mm.accent,
              boxShadow: `0 0 6px ${Mm.accent}`, animation: 'mmPulse 2s ease-in-out infinite',
            }}/>
            <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>{tc('nav.brand.balance').toUpperCase()}</span>
          </div>
          <div style={{ ...MmTY.numTab, fontSize: 22, color: Mm.accent, lineHeight: 1.1 }}>{fmt(state.aura || 0)}</div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 0, flexWrap: 'wrap',
        background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
        padding: 3, borderRadius: 4, alignSelf: 'flex-start',
      }}>
        {cats.map((c) => {
          const on = cat === c.id;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              ...MmTY.coord, padding: '7px 14px', cursor: 'pointer',
              border: 'none', background: on ? Mm.accent : 'transparent',
              color: on ? Mm.bg : Mm.text2, fontWeight: 600, borderRadius: 2,
              transition: 'all 0.15s',
            }}>{c.label}</button>
          );
        })}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{
          ...MmTY.body, color: Mm.text3, textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`,
          borderRadius: 6,
        }}>
          <div style={{ ...MmTY.coord, color: Mm.text4, marginBottom: 8 }}>{tc('store.empty.sub')}</div>
          {tc('store.empty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {items.map((r) => <ModernRewardCard key={r.id} r={r} state={state} onRedeem={() => onQuick.redeem(r)} focus={focusId === r.id}/>)}
        </div>
      )}
    </div>
  );
}

function ModernRewardCard({ r, state, onRedeem, focus }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const levelLocked = state.level < r.level;
  const auraShort = state.aura < r.price;
  const locked = levelLocked || auraShort;
  const auraShortBy = Math.max(0, r.price - state.aura);

  return (
    <div data-focus-id={r.id} style={{
      position: 'relative',
      background: focus
        ? 'linear-gradient(135deg, rgba(155,214,107,0.12), rgba(93,211,196,0.04))'
        : 'rgba(15,30,25,0.55)',
      border: `1px solid ${focus ? Mm.hair3 : Mm.hair2}`,
      borderRadius: 6, overflow: 'hidden',
      boxShadow: focus ? `0 0 14px rgba(155,214,107,0.18)` : 'none',
      transition: 'transform 0.15s, border-color 0.15s',
      display: 'flex', flexDirection: 'column',
      opacity: locked ? 0.85 : 1,
    }}
    onMouseOver={(e) => { if (!locked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; } }}
    onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = focus ? Mm.hair3 : Mm.hair2; }}>

      {/* Image with chips */}
      <div style={{
        height: 140, position: 'relative', overflow: 'hidden',
        background: r.image
          ? `url("${r.image}") center/cover`
          : `linear-gradient(135deg, ${Mm.accent}22, ${Mm.cyan}11)`,
        borderBottom: `1px solid ${Mm.hair}`,
        filter: locked ? 'grayscale(0.45) brightness(0.7)' : 'none',
      }}>
        <span style={{
          position: 'absolute', top: 8, right: 8,
          ...MmTY.coord, fontSize: 9, color: locked ? Mm.text3 : Mm.accent,
          padding: '3px 8px', borderRadius: 2,
          background: 'rgba(10,18,16,0.85)',
          border: `1px solid ${locked ? Mm.hair : Mm.hair3}`,
        }}>{locked ? tc('common.locked').toUpperCase() : tc('common.available').toUpperCase()}</span>
        {typeof r.stock === 'number' && r.stock <= 10 && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            ...MmTY.coord, fontSize: 9, color: Mm.cyan,
            padding: '3px 8px', borderRadius: 2,
            background: 'rgba(10,18,16,0.85)',
            border: `1px solid ${Mm.cyan}66`,
          }}>{r.stock} {tc('store.kind.plural').toUpperCase()}</span>
        )}
      </div>

      <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 4, fontSize: 9 }}>
          {String(r.category || 'reward').toUpperCase()}
        </div>
        <h3 style={{ ...MmTY.h3, color: Mm.text, margin: 0, fontSize: 15, lineHeight: 1.2 }}>{r.title}</h3>
        {r.sub && (
          <div style={{ ...MmTY.small, color: Mm.text3, marginTop: 4 }}>{r.sub}</div>
        )}

        <div style={{ flex: 1 }}/>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Mm.hair}`,
        }}>
          <div>
            <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>
              {levelLocked ? tc('store.card.req', { lvl: r.level }) : auraShort ? tc('store.card.short', { n: fmt(auraShortBy) }) : tc('common.cost')}
            </div>
            <div style={{ ...MmTY.numTab, fontSize: 16, color: locked ? Mm.text3 : Mm.accent }}>{fmt(r.price)}</div>
          </div>
          <button onClick={onRedeem} disabled={locked} style={{
            padding: '7px 14px', borderRadius: 3,
            background: locked ? 'transparent' : Mm.accent,
            color: locked ? Mm.text3 : Mm.bg,
            border: `1px solid ${locked ? Mm.hair2 : Mm.accent}`,
            fontFamily: Mm.fontUI, fontSize: 11, fontWeight: 600,
            cursor: locked ? 'not-allowed' : 'pointer',
            boxShadow: locked ? 'none' : `0 0 12px ${Mm.accent}33`,
          }}>{locked ? '—' : tc('store.card.cta')}</button>
        </div>
      </div>
    </div>
  );
}

window.CartographerModernStoreView = CartographerModernStoreView;
