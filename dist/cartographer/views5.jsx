// ElyHub — Cartographer (vintage) NotifDrawer + RedeemModal.
//
// Mounted only when T.cartographer is true. Mirrors the host modals.jsx
// behavior with parchment styling.
//   • CartographerNotifDrawer — slide-in scroll of recent events
//   • CartographerRedeemModal — purchase confirmation as a paper certificate

// Small inline icon helper — same line-engraving feel as ui-cartographer.
const _MIco = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

// ─── CartographerNotifDrawer ─────────────────────────────────────────────
// Right-side parchment scroll. Notifications are rendered as ledger entries
// with a small wax-red dot for unread state. Reuses the host's
// buildNotifications + getLastSeen + getDismissed/save helpers via the
// global scope (Babel script tags share scope).
function CartographerNotifDrawer({ onClose, library, reviews, follows, setView }) {
  const M = window.M, MTY = window.MTY;
  const meId = window.ME?.id || null;
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];

  // Use host helpers if available (defined in modals.jsx in same global scope).
  const lastSeen = (typeof getLastSeen === 'function') ? getLastSeen() : 0;
  const [dismissed, setDismissed] = React.useState(() => {
    return (typeof getDismissed === 'function') ? getDismissed() : new Set();
  });
  const [, setEventTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = window.ElyNotify?.subscribeEvents?.(() => setEventTick((x) => x + 1));
    return () => { try { unsub?.(); } catch {} };
  }, []);

  const allItems = (typeof buildNotifications === 'function')
    ? buildNotifications(feed, meId, lastSeen, { library, reviews, follows })
    : [];
  const items = allItems.filter((n) => !dismissed.has(n.id));

  React.useEffect(() => {
    if (typeof markAllNotifsSeen === 'function') markAllNotifsSeen();
  }, []);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { (typeof saveDismissed === 'function') && saveDismissed(next); } catch {}
      return next;
    });
  };
  const clearAll = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of allItems) next.add(n.id);
      try { (typeof saveDismissed === 'function') && saveDismissed(next); } catch {}
      return next;
    });
  };

  // PT-BR relative time — "agora", "5 min", "2 h", "3 d".
  const rel = (atMs) => {
    if (!atMs) return '';
    const ms = Date.now() - atMs;
    if (ms < 60_000) return 'agora';
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h`;
    return `${Math.floor(h / 24)} d`;
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(20,12,5,0.55)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      animation: 'mFadeIn 0.2s',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 20, right: 20, bottom: 20, width: 400,
        background: 'linear-gradient(180deg, rgba(232,220,192,0.97), rgba(220,207,174,0.99)), #EFE3C8',
        border: `1px solid ${M.hair3}`,
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45)',
        padding: 28, overflowY: 'auto',
        animation: 'mSlideInR 0.3s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        {/* corner ornaments */}
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 32, style: { position: 'absolute', top: 6, left: 6 } })}
            {React.createElement(window.OrnateCorner, { size: 32, style: { position: 'absolute', top: 6, right: 6, transform: 'scaleX(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 32, style: { position: 'absolute', bottom: 6, left: 6, transform: 'scaleY(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 32, style: { position: 'absolute', bottom: 6, right: 6, transform: 'scale(-1,-1)' } })}
          </>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, position: 'relative', zIndex: 2,
        }}>
          <div>
            <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 4 }}>Diário de Avisos</div>
            <h2 style={{ ...MTY.h2, color: M.ink, margin: 0, fontSize: 22 }}>
              Caixa<span style={{ color: M.wax }}>.</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {items.length > 0 && (
              <button onClick={clearAll} style={{
                background: 'rgba(232,220,192,0.6)', border: `1px solid ${M.hair2}`,
                color: M.ink2, cursor: 'pointer',
                fontFamily: M.fontDisp, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                padding: '6px 10px',
              }}>Limpar</button>
            )}
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: M.ink3,
              cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4,
            }}>✕</button>
          </div>
        </div>

        {/* List */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {items.length === 0 ? (
            <div style={{
              padding: '40px 12px', textAlign: 'center',
              ...MTY.hand, color: M.ink3, fontStyle: 'italic',
            }}>
              Nenhum aviso pendente.
              <div style={{ ...MTY.capsSm, color: M.ink4, marginTop: 8, fontSize: 9 }}>
                — diário em silêncio —
              </div>
            </div>
          ) : items.map((n, i) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 0',
              borderBottom: i === items.length - 1 ? 'none' : `1px dashed ${M.hair}`,
            }}>
              {/* unread dot — wax-red */}
              <div style={{
                marginTop: 6, flex: 'none',
                width: 7, height: 7, borderRadius: '50%',
                background: n.unread ? M.wax : 'transparent',
                boxShadow: n.unread ? `0 0 6px ${M.waxGlow}` : 'none',
                border: n.unread ? 'none' : `1px solid ${M.hair2}`,
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...MTY.body, color: M.ink, fontSize: 14, lineHeight: 1.4,
                  fontWeight: n.unread ? 500 : 400,
                }}>{n.title}</div>
                <div style={{ ...MTY.capsSm, color: M.ink3, marginTop: 4, fontSize: 9 }}>
                  {rel(n.at)}
                </div>
              </div>
              <button onClick={() => dismiss(n.id)} title="Descartar" style={{
                background: 'transparent', border: 'none', color: M.ink4,
                cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1,
                alignSelf: 'center',
              }}>✕</button>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes mFadeIn   { from { opacity: 0; } to { opacity: 1; } }
          @keyframes mSlideInR { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}

// ─── CartographerRedeemModal ─────────────────────────────────────────────
// Paper certificate confirming a redeem. Two stages: confirm + success.
// Same business logic as host RedeemModal — calls window.ElyOps.redeemReward.
function CartographerRedeemModal({ reward, state, onClose, onConfirm }) {
  const M = window.M, MTY = window.MTY;
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));

  const [stage, setStage] = React.useState('confirm');
  const [error, setError] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!reward) return;
    const onKey = (e) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reward, sending, onClose]);

  if (!reward) return null;

  async function handleConfirm() {
    if (sending) return;
    setSending(true); setError(null);
    try {
      const api = window.ElyOps;
      if (!api?.redeemReward) throw new Error('not signed in');
      await api.redeemReward(reward.id, reward.price, reward.title);
      setStage('success');
      onConfirm?.();
    } catch (err) {
      const raw = err?.message || 'desconhecido';
      const msg = raw === 'not signed in' ? 'Faça login pra resgatar.'
        : raw.startsWith('failed:insufficient') ? 'Aura insuficiente.'
        : raw.startsWith('invalid:') ? 'Recompensa indisponível.'
        : raw === 'op timeout' ? 'Tempo esgotado, tente novamente.'
        : `Tente novamente: ${raw}`;
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  const Backdrop = ({ children, w = 460 }) => (
    <div onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
         style={{
           position: 'fixed', inset: 0, zIndex: 1000,
           background: 'rgba(20,12,5,0.55)',
           backdropFilter: 'blur(4px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           padding: 24,
         }}>
      <div style={{
        width: w, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.95), rgba(220,207,174,0.98)), #EFE3C8',
        border: `1px solid ${M.hair3}`,
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45)',
        padding: '32px 36px',
      }}>
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', top: 6, left: 6 } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', top: 6, right: 6, transform: 'scaleX(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', bottom: 6, left: 6, transform: 'scaleY(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', bottom: 6, right: 6, transform: 'scale(-1,-1)' } })}
          </>
        )}
        <div style={{ position: 'absolute', inset: 12, border: `1px solid ${M.ink}`, opacity: 0.25, pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    </div>
  );

  if (stage === 'success') return (
    <Backdrop>
      <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 22px',
          background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset -6px -10px 18px rgba(0,0,0,0.4), inset 4px 6px 12px rgba(255,255,255,0.18), 4px 6px 16px rgba(139,36,24,0.5)',
          animation: 'mStamp 600ms cubic-bezier(.34,1.56,.64,1) both',
        }}>
          <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '1.5px dashed rgba(232,200,170,0.55)', pointerEvents: 'none' }}/>
          <span style={{ color: '#E8DCC0', fontSize: 38, lineHeight: 1 }}>✦</span>
        </div>
        <h2 style={{ ...MTY.h2, color: M.ink, margin: 0 }}>Recompensa lavrada<span style={{ color: M.wax }}>.</span></h2>
        <p style={{ ...MTY.hand, color: M.ink3, marginTop: 8, fontSize: 15 }}>
          O cartógrafo-mor entrará em contato para a entrega.
        </p>
        <div style={{
          padding: '14px 18px',
          background: 'rgba(232,220,192,0.6)',
          border: `1px solid ${M.hair2}`,
          margin: '20px 0',
          ...MTY.hand, color: M.ink2, fontSize: 13,
        }}>
          <div style={{ ...MTY.h3, color: M.ink, fontSize: 14, marginBottom: 4 }}>{reward.title}</div>
          <div>−{fmt(reward.price)} aura · selo <span style={{ ...MTY.capsSm, color: M.wax, fontSize: 11 }}>{reward.id}</span></div>
        </div>
        {window.PaperButton && React.createElement(window.PaperButton, {
          variant: 'primary', onClick: onClose,
          style: { width: '100%', justifyContent: 'center' },
        }, 'Concluir')}
      </div>
    </Backdrop>
  );

  return (
    <Backdrop>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 4 }}>Recompensa do mercado</div>
          <h2 style={{ ...MTY.h2, color: M.ink, margin: 0 }}>Confirmar resgate<span style={{ color: M.wax }}>.</span></h2>
        </div>
        <button onClick={onClose} disabled={sending} style={{
          background: 'transparent', border: 'none', color: M.ink3,
          cursor: sending ? 'not-allowed' : 'pointer', fontSize: 22, lineHeight: 1, padding: 4,
        }}>✕</button>
      </div>

      {/* Reward card */}
      <div style={{
        display: 'flex', gap: 14, padding: 14,
        background: 'rgba(232,220,192,0.6)',
        border: `1px solid ${M.hair2}`,
        marginBottom: 22,
      }}>
        <div style={{
          width: 60, height: 60, flexShrink: 0,
          background: `linear-gradient(135deg, rgba(200,162,78,0.3), rgba(232,220,192,0.5))`,
          border: `1px solid ${M.hair2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: M.ink3, fontFamily: M.fontDisp, fontSize: 9,
          overflow: 'hidden',
        }}>
          {reward.image
            ? <img src={reward.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.35)' }}/>
            : '✦'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MTY.h3, color: M.ink, fontSize: 16, margin: 0 }}>{reward.title}</div>
          <div style={{ ...MTY.hand, color: M.ink3, fontSize: 13, marginTop: 2 }}>{reward.sub}</div>
        </div>
      </div>

      {/* Ledger rows */}
      <CartoRow label="Custo" value={`${fmt(reward.price)} aura`}/>
      <CartoRow label="Saldo após" value={`${fmt(Math.max(0, (state?.aura || 0) - reward.price))} aura`}/>
      <CartoRow label="Entrega" value="Cartógrafo entrará em contato" last/>

      {error && (
        <div style={{
          marginTop: 14, padding: '10px 12px',
          background: 'rgba(139,36,24,0.12)',
          border: `1px solid ${M.wax}`,
          ...MTY.hand, color: M.wax, fontSize: 13,
        }}>⚠ {error}</div>
      )}

      <div style={{ marginTop: 24 }}>
        {window.PaperButton && React.createElement(window.PaperButton, {
          variant: 'primary',
          onClick: handleConfirm,
          disabled: sending,
          style: { width: '100%', justifyContent: 'center' },
        }, sending ? 'Selando…' : error ? 'Tentar novamente' : 'Selar resgate')}
      </div>
    </Backdrop>
  );
}

function CartoRow({ label, value, last }) {
  const M = window.M, MTY = window.MTY;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: last ? 'none' : `1px dashed ${M.hair}`,
    }}>
      <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 10 }}>{label}</span>
      <span style={{ ...MTY.body, color: M.ink, fontWeight: 500, fontSize: 14 }}>{value}</span>
    </div>
  );
}

window.CartographerNotifDrawer = CartographerNotifDrawer;
window.CartographerRedeemModal = CartographerRedeemModal;
