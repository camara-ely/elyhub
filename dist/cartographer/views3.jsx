// ElyHub — Cartographer (vintage) gift modal + members view.
//
// Mounted only when T.cartographer is true. The host modals.jsx GiftModal
// and views.jsx MembersView delegate to these via window.CartographerGift*
// and window.CartographerMembersView respectively.

// ─── CartographerGiftModal ───────────────────────────────────────────────
// Envelope-style modal: parchment background + ornate corners + wax-red
// "Selar e enviar" button. Success state stamps a giant wax seal over the
// envelope with the recipient's initial.
function CartographerGiftModal({ state, onClose, onSend, initialFriend }) {
  const M = window.M, MTY = window.MTY;
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));

  const [friend, setFriend] = React.useState(initialFriend || null);
  const [amount, setAmount] = React.useState(500);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [freshMembers, setFreshMembers] = React.useState(null);
  const preset = [100, 500, 1000, 2500, 5000];

  // Same fresh-members fetch the host modal does — live Discord names/avatars.
  React.useEffect(() => {
    if (!window.ElyAPI?.isSignedIn?.()) return;
    window.ElyAPI.get('/members?sort=name&limit=300')
      .then((res) => {
        const list = (res.items || []).map((r) => ({
          id: r.id, name: r.name || r.id,
          tag: (r.name || r.id).toLowerCase().replace(/\s+/g, '').slice(0, 20),
          avatar: r.avatar_url || null,
        }));
        setFreshMembers(list);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !sending && !sent) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sending, sent, onClose]);

  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normalize(search);
  const myId = window.ME?.id;
  const memberPool = freshMembers || (window.MEMBERS || []);
  const candidates = memberPool
    .filter((m) => m.id !== myId)
    .filter((m) => !q || normalize(m.name).includes(q) || normalize(m.tag).includes(q));

  async function handleSend() {
    setErr(null); setSending(true);
    try {
      if (window.ElyOps?.sendGift) {
        await window.ElyOps.sendGift(friend.id, amount, note || null);
      }
      onSend && onSend(friend, amount);
      setSent(true);
    } catch (e) {
      setErr(e.message || 'envio falhou');
    } finally {
      setSending(false);
    }
  }

  // Common backdrop — sealed envelope wrapper. Z-index over everything else.
  const Backdrop = ({ children }) => (
    <div onClick={(e) => { if (e.target === e.currentTarget && !sending && !sent) onClose(); }}
         style={{
           position: 'fixed', inset: 0, zIndex: 1000,
           background: 'rgba(20,12,5,0.55)',
           backdropFilter: 'blur(4px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           padding: 24,
         }}>
      <div style={{
        width: 520, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.95), rgba(220,207,174,0.98)), #EFE3C8',
        border: `1px solid ${M.hair3}`,
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45), 0 0 0 1px rgba(59,38,22,0.15)',
        padding: '32px 36px',
      }}>
        {/* ornate corners */}
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', top: 6, left: 6 } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', top: 6, right: 6, transform: 'scaleX(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', bottom: 6, left: 6, transform: 'scaleY(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 36, style: { position: 'absolute', bottom: 6, right: 6, transform: 'scale(-1,-1)' } })}
          </>
        )}
        <div style={{ position: 'absolute', inset: 12, border: `1px solid ${M.ink}`, opacity: 0.25, pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      </div>
    </div>
  );

  // Success — giant wax seal stamps over the envelope content.
  if (sent) return (
    <Backdrop>
      <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 22px',
          background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset -6px -10px 18px rgba(0,0,0,0.4), inset 4px 6px 12px rgba(255,255,255,0.18), 4px 6px 16px rgba(139,36,24,0.5)',
          position: 'relative',
          animation: 'mStamp 600ms cubic-bezier(.34,1.56,.64,1) both',
        }}>
          <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '1.5px dashed rgba(232,200,170,0.55)' }}/>
          <span style={{
            fontFamily: '"Cinzel",serif', fontSize: 44, fontWeight: 700,
            color: '#E8DCC0', letterSpacing: '0.02em',
          }}>
            {(window.initialOf ? window.initialOf(friend?.name) : (friend?.name || '?')[0]).toUpperCase()}
          </span>
        </div>
        <h2 style={{ ...MTY.h2, color: M.ink, margin: 0 }}>Carta selada<span style={{ color: M.wax }}>.</span></h2>
        <p style={{ ...MTY.hand, color: M.ink3, marginTop: 8, fontSize: 15 }}>
          {fmt(amount)} aura entregue a <em style={{ color: M.wax, fontStyle: 'italic' }}>{friend?.name}</em>
        </p>
        <div style={{ marginTop: 26 }}>
          {window.PaperButton && React.createElement(window.PaperButton, {
            variant: 'primary', onClick: onClose,
          }, 'Concluir')}
        </div>
        <style>{`@keyframes mStamp {
          0%   { transform: scale(0.3) rotate(-25deg); opacity: 0; }
          60%  { transform: scale(1.18) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }`}</style>
      </div>
    </Backdrop>
  );

  return (
    <Backdrop>
      {/* header: title + close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 4 }}>Carta de aura</div>
          <h2 style={{ ...MTY.h2, color: M.ink, margin: 0 }}>Enviar presente<span style={{ color: M.wax }}>.</span></h2>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: M.ink3, fontSize: 22, lineHeight: 1, padding: 4,
        }}>✕</button>
      </div>

      {!friend ? (
        <>
          <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 10 }}>Destinatário</div>
          {memberPool.length >= 6 && (
            <input
              autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar navegante…"
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.4)',
                border: `1px solid ${M.hair2}`, borderRadius: 0,
                color: M.ink, fontFamily: M.fontBody, fontSize: 14, outline: 'none',
                marginBottom: 14,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 360, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ ...MTY.hand, color: M.ink3, textAlign: 'center', padding: '24px 8px' }}>
                Nenhum navegante encontrado.
              </div>
            ) : candidates.map((m) => (
              <button key={m.id} onClick={() => setFriend(m)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 8px',
                borderBottom: `1px dashed ${M.hair}`,
                display: 'flex', alignItems: 'center', gap: 12,
                color: M.ink, textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(200,162,78,0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {window.WaxSeal && React.createElement(window.WaxSeal, { src: m.avatar, name: m.name, size: 36, ring: 4 })}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...MTY.h3, color: M.ink, margin: 0, fontSize: 14 }}>{m.name}</div>
                  <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12 }}>@{m.tag}</div>
                </div>
                <span style={{ color: M.ink3, fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setFriend(null)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...MTY.capsSm, color: M.wax,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginBottom: 14, padding: 0,
          }}>‹ Trocar destinatário</button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 14, background: 'rgba(232,220,192,0.6)',
            border: `1px solid ${M.hair2}`, marginBottom: 22,
          }}>
            {window.WaxSeal && React.createElement(window.WaxSeal, { src: friend.avatar, name: friend.name, size: 44, ring: 5 })}
            <div>
              <div style={{ ...MTY.h3, color: M.ink, margin: 0, fontSize: 16 }}>{friend.name}</div>
              <div style={{ ...MTY.hand, color: M.ink3, fontSize: 13 }}>@{friend.tag}</div>
            </div>
          </div>

          <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 10 }}>Quantia</div>
          <div style={{ padding: '14px 0 6px', textAlign: 'center' }}>
            <input
              type="text" inputMode="numeric"
              value={amount === 0 ? '' : String(amount)}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                setAmount(clean === '' ? 0 : parseInt(clean, 10));
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              style={{
                fontFamily: '"Cinzel",serif', fontSize: 56, fontWeight: 600,
                color: amount > (state?.aura || 0) ? M.wax : M.ink,
                background: 'transparent', border: 'none', outline: 'none',
                textAlign: 'center', width: '100%', padding: 0,
                caretColor: M.wax, letterSpacing: '0.02em',
              }}
            />
            <div style={{ ...MTY.capsSm, color: M.ink3, marginTop: 2 }}>aura</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
            {preset.map((p) => (
              <button key={p} onClick={() => setAmount(p)} style={{
                padding: '6px 14px',
                background: amount === p ? `${M.wax}` : 'rgba(232,220,192,0.6)',
                border: `1px solid ${amount === p ? M.wax : M.hair2}`,
                color: amount === p ? M.surface : M.ink2,
                fontFamily: '"Cinzel",serif', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.18em', cursor: 'pointer',
              }}>{fmt(p)}</button>
            ))}
          </div>

          <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 8 }}>Bilhete (opcional)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)}
                 placeholder="Escreva à mão livre…"
                 style={{
                   width: '100%', padding: 14,
                   background: 'rgba(232,220,192,0.5)',
                   border: `1px solid ${M.hair2}`,
                   color: M.ink, fontFamily: M.fontHand, fontStyle: 'italic',
                   fontSize: 15, outline: 'none', marginBottom: 22,
                   boxSizing: 'border-box',
                 }}/>

          {window.PaperButton && React.createElement(window.PaperButton, {
            variant: 'primary',
            onClick: handleSend,
            disabled: amount < 1 || amount > (state?.aura || 0) || sending,
            style: { width: '100%', justifyContent: 'center' },
          }, sending ? 'Selando…' : `Selar e enviar ${fmt(amount)} aura`)}

          {err && (
            <div style={{
              marginTop: 14, padding: 12,
              background: 'rgba(139,36,24,0.12)',
              border: `1px solid ${M.wax}`,
              ...MTY.hand, color: M.wax, fontSize: 13,
            }}>⚠ {err}</div>
          )}
        </>
      )}
    </Backdrop>
  );
}

// ─── CartographerMembersView ─────────────────────────────────────────────
// Vintage cartographic directory. Header is a parchment scroll with a
// stylized mini-map; below is a grid of member cards each as a "logged
// position" with wax seal + coordinates + bearing.
function CartographerMembersView({ state, focusId, onQuick }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const bearingOf = window.bearingOf || (() => 0);
  const coordsOf = window.coordsOf || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));

  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('aura');
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch full directory (not just top-50). Use /members which already
  // honors LEADERBOARD_HIDDEN_IDS server-side.
  React.useEffect(() => {
    if (!window.ElyAPI?.isSignedIn?.()) {
      // Not signed in yet — retry every 600ms (mirrors the host's MembersView).
      const id = setInterval(() => {
        if (window.ElyAPI?.isSignedIn?.()) {
          clearInterval(id);
          load();
        }
      }, 600);
      return () => clearInterval(id);
    }
    load();
  }, [sort]);

  function load() {
    setLoading(true);
    window.ElyAPI.get(`/members?sort=${sort}&limit=200`)
      .then((res) => {
        const list = (res.items || []).map((r) => ({
          id: r.id,
          name: r.name || r.id,
          avatar: r.avatar_url || null,
          aura: r.aura || 0,
          level: r.level || 0,
          joinedAt: r.joined_at,
          lastActive: r.last_active_at,
        }));
        setMembers(list);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }

  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normalize(search);
  const filtered = members.filter((m) => !q || normalize(m.name).includes(q));

  const sorts = [
    { id: 'aura',   label: tc('members.sort.aura') },
    { id: 'name',   label: tc('members.sort.name') },
    { id: 'joined', label: tc('members.sort.joined') },
    { id: 'oldest', label: tc('members.sort.oldest') },
    { id: 'active', label: tc('members.sort.active') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, position: 'relative', zIndex: 1 }}>

      {/* Page header */}
      <div style={{
        paddingBottom: 22, borderBottom: `1px solid ${M.hair2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 18,
      }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.members.eyebrow')}</div>
          <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>
            {tc('page.members.title')}<span style={{ color: M.wax }}>.</span>
          </h1>
          <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
            {tc('members.sub', { n: filtered.length })}
          </div>
        </div>

        {/* sort chips */}
        <div style={{ display: 'flex', gap: 0, background: M.surface, border: `1px solid ${M.hair2}`, padding: 3 }}>
          {sorts.map((s) => {
            const on = sort === s.id;
            return (
              <button key={s.id} onClick={() => setSort(s.id)}
                style={{
                  ...MTY.capsSm, padding: '7px 13px', cursor: 'pointer',
                  border: 'none', background: on ? M.wax : 'transparent',
                  color: on ? M.surface : M.ink2, fontWeight: 600,
                  letterSpacing: '0.20em',
                  transition: 'all 0.15s',
                }}>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={tc('members.search')}
             style={{
               width: '100%', padding: '12px 18px', boxSizing: 'border-box',
               background: M.surface, border: `1px solid ${M.hair2}`,
               color: M.ink, fontFamily: M.fontBody, fontStyle: 'italic',
               fontSize: 15, outline: 'none',
             }}/>

      {loading && (
        <div style={{ ...MTY.hand, color: M.ink3, textAlign: 'center', padding: '40px 0' }}>
          {tc('members.empty.loading')}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          ...MTY.body, color: M.ink3, textAlign: 'center',
          padding: '40px 24px', background: M.surface,
          border: `1px dashed ${M.hair2}`,
        }}>
          {tc('members.empty.none')}
        </div>
      )}

      {/* Members grid — each card is a "logged position" */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filtered.map((m) => {
            const c = coordsOf(m.name || '');
            const focus = focusId && m.id === focusId;
            return (
              <div key={m.id} data-focus-id={m.id}
                style={{
                  position: 'relative',
                  background: focus
                    ? 'linear-gradient(180deg, rgba(200,162,78,0.18), rgba(232,220,192,0.6)), #EFE3C8'
                    : '#EFE3C8',
                  border: `1px solid ${focus ? M.hair3 : M.hair2}`,
                  padding: '20px 20px 18px',
                  boxShadow: focus
                    ? '3px 5px 14px rgba(200,162,78,0.18)'
                    : '2px 4px 10px rgba(59,38,22,0.08)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '3px 7px 16px rgba(59,38,22,0.14)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = focus ? '3px 5px 14px rgba(200,162,78,0.18)' : '2px 4px 10px rgba(59,38,22,0.08)'; }}>

                {/* corner ornaments — discreet */}
                {window.OrnateCorner && (
                  <>
                    {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.32, style: { position: 'absolute', top: 4, left: 4 } })}
                    {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.32, style: { position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)' } })}
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  {window.WaxSeal && React.createElement(window.WaxSeal, { src: m.avatar, name: m.name, size: 48, ring: 6 })}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      ...MTY.h3, color: M.ink, margin: 0, fontSize: 16,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{m.name}</div>
                    <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 2 }}>
                      L{m.level} · {tc('podium.bearing', { n: bearingOf(m.name) })}
                    </div>
                  </div>
                </div>

                {/* coordinate plate */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  paddingTop: 12, borderTop: `1px dashed ${M.hair}`,
                }}>
                  <div>
                    <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 2 }}>{tc('podium.position')}</div>
                    <div style={{ ...MTY.hand, color: M.ink2, fontSize: 12, lineHeight: 1.4 }}>
                      {c.lat}°{c.latDir}<br/>{c.lon}°{c.lonDir}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 2 }}>{tc('common.aura')}</div>
                    <div style={{ ...MTY.num, fontSize: 17, color: M.ink }}>{fmt(m.aura)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.CartographerGiftModal   = CartographerGiftModal;
window.CartographerMembersView = CartographerMembersView;
