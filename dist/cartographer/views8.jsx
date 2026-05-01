// ElyHub — Cartographer (vintage) StoreView.
// "Mercado" — paper market with reward tomes laid out as parchment cards.

function CartographerStoreView({ state, onQuick, focusId }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
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
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 16,
        paddingBottom: 22, borderBottom: `1px solid ${M.hair2}`,
      }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.store.eyebrow')}</div>
          <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>
            {tc('page.store.title')}<span style={{ color: M.wax }}>.</span>
          </h1>
          <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
            {tc('store.sub', { n: items.length, label: tc(items.length === 1 ? 'store.kind.singular' : 'store.kind.plural') })}
          </div>
        </div>

        <div style={{
          position: 'relative',
          background: M.surface, border: `1px solid ${M.hair3}`,
          padding: '14px 22px', textAlign: 'right',
          boxShadow: '2px 3px 8px rgba(59,38,22,0.10)',
        }}>
          {window.OrnateCorner && (
            <>
              {React.createElement(window.OrnateCorner, { size: 16, opacity: 0.4, style: { position: 'absolute', top: 2, left: 2 } })}
              {React.createElement(window.OrnateCorner, { size: 16, opacity: 0.4, style: { position: 'absolute', bottom: 2, right: 2, transform: 'scale(-1,-1)' } })}
            </>
          )}
          <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>{tc('nav.brand.balance')}</div>
          <div style={{ ...MTY.num, fontSize: 22, color: M.wax, lineHeight: 1.1 }}>{fmt(state.aura || 0)}</div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', background: M.surface, border: `1px solid ${M.hair2}`, padding: 3, alignSelf: 'flex-start' }}>
        {cats.map((c) => {
          const on = cat === c.id;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              ...MTY.capsSm, padding: '8px 16px', cursor: 'pointer',
              border: 'none', background: on ? M.wax : 'transparent',
              color: on ? M.surface : M.ink2, fontWeight: 600,
              letterSpacing: '0.20em',
              transition: 'all 0.15s',
            }}>{c.label}</button>
          );
        })}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{
          ...MTY.body, color: M.ink3, textAlign: 'center',
          padding: '60px 24px', background: M.surface,
          border: `1px dashed ${M.hair2}`,
        }}>
          {tc('store.empty')}
          <div style={{ ...MTY.hand, color: M.ink4, marginTop: 8 }}>{tc('store.empty.sub')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {items.map((r) => <CartoTomoCard key={r.id} r={r} state={state} onRedeem={() => onQuick.redeem(r)} focus={focusId === r.id}/>)}
        </div>
      )}
    </div>
  );
}

function CartoTomoCard({ r, state, onRedeem, focus }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const levelLocked = state.level < r.level;
  const auraShort = state.aura < r.price;
  const locked = levelLocked || auraShort;
  const auraShortBy = Math.max(0, r.price - state.aura);

  return (
    <div data-focus-id={r.id} style={{
      position: 'relative',
      background: focus
        ? 'linear-gradient(180deg, rgba(200,162,78,0.16), rgba(232,220,192,0.6)), #EFE3C8'
        : '#EFE3C8',
      border: `1px solid ${focus ? M.hair3 : M.hair2}`,
      boxShadow: focus
        ? '3px 5px 14px rgba(200,162,78,0.18)'
        : '2px 4px 10px rgba(59,38,22,0.08)',
      transition: 'transform 0.15s, box-shadow 0.15s',
      display: 'flex', flexDirection: 'column',
      opacity: locked ? 0.85 : 1,
    }}
    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '3px 6px 14px rgba(59,38,22,0.14)'; }}
    onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = focus ? '3px 5px 14px rgba(200,162,78,0.18)' : '2px 4px 10px rgba(59,38,22,0.08)'; }}>

      {/* Image */}
      <div style={{
        height: 140, position: 'relative', overflow: 'hidden',
        background: r.image
          ? `url("${r.image}") center/cover`
          : `linear-gradient(135deg, rgba(200,162,78,0.25), rgba(232,220,192,0.5))`,
        borderBottom: `1px solid ${M.hair}`,
        filter: locked ? 'sepia(0.65) brightness(0.78)' : 'sepia(0.20)',
      }}>
        {/* Status chip top-right */}
        <span style={{
          position: 'absolute', top: 8, right: 8,
          ...MTY.capsSm, fontSize: 9, color: locked ? M.ink3 : M.wax,
          padding: '3px 8px', background: 'rgba(232,220,192,0.85)',
          border: `1px solid ${locked ? M.hair2 : M.wax}`,
          letterSpacing: '0.18em',
        }}>{locked ? tc('common.lockedShort') : tc('common.availableShort')}</span>
        {typeof r.stock === 'number' && r.stock <= 10 && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            ...MTY.capsSm, fontSize: 9, color: M.wax,
            padding: '3px 8px', background: 'rgba(232,220,192,0.85)',
            border: `1px solid ${M.wax}`,
            letterSpacing: '0.18em',
          }}>{r.stock} {tc('store.kind.plural')}</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4, fontSize: 9 }}>
          {String(r.category || 'tomo').toUpperCase()}
        </div>
        <h3 style={{ ...MTY.h3, color: M.ink, margin: 0, fontSize: 15, lineHeight: 1.2 }}>{r.title}</h3>
        {r.sub && (
          <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
            {r.sub}
          </div>
        )}

        <div style={{ flex: 1 }}/>

        {/* Footer: price + button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14, paddingTop: 10, borderTop: `1px dashed ${M.hair}`,
        }}>
          <div>
            <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8 }}>
              {levelLocked ? tc('store.card.req', { lvl: r.level }) : auraShort ? tc('store.card.short', { n: fmt(auraShortBy) }) : tc('common.cost')}
            </div>
            <div style={{ ...MTY.num, fontSize: 16, color: locked ? M.ink3 : M.wax }}>{fmt(r.price)}</div>
          </div>
          <button onClick={onRedeem} disabled={locked} style={{
            padding: '7px 14px',
            background: locked ? 'transparent' : M.wax,
            color: locked ? M.ink3 : M.surface,
            border: `1px solid ${locked ? M.hair2 : M.wax}`,
            fontFamily: M.fontDisp, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.20em', textTransform: 'uppercase',
            cursor: locked ? 'not-allowed' : 'pointer',
            boxShadow: locked ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.15), 1px 2px 4px rgba(139,36,24,0.25)',
          }}>{locked ? '—' : tc('store.card.cta')}</button>
        </div>
      </div>
    </div>
  );
}

window.CartographerStoreView = CartographerStoreView;
