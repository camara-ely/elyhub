// ElyHub — Cartographer Modern modals + Members + Profile.
//
// Reuses the host's logic where possible (buildNotifications, deriveTrophies,
// AppearancePane, etc.) — Babel scripts share global scope so we can call
// these directly. We only re-skin the chrome.

// ─── ModernGiftModal ─────────────────────────────────────────────────────
function CartographerModernGiftModal({ state, onClose, onSend, initialFriend }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const [friend, setFriend] = React.useState(initialFriend || null);
  const [amount, setAmount] = React.useState(500);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [freshMembers, setFreshMembers] = React.useState(null);
  const preset = [100, 500, 1000, 2500, 5000];

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
      if (window.ElyOps?.sendGift) await window.ElyOps.sendGift(friend.id, amount, note || null);
      onSend && onSend(friend, amount);
      setSent(true);
    } catch (e) { setErr(e.message || 'send failed'); }
    finally { setSending(false); }
  }

  const Backdrop = ({ children }) => (
    <div onClick={(e) => { if (e.target === e.currentTarget && !sending && !sent) onClose(); }}
         style={{
           position: 'fixed', inset: 0, zIndex: 1000,
           background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
         }}>
      <div style={{
        width: 520, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.98))',
        border: `1px solid ${Mm.hair3}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(155,214,107,0.10)',
        padding: '28px 32px',
      }}>{children}</div>
    </div>
  );

  if (sent) return (
    <Backdrop>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%', margin: '0 auto 22px',
          background: `linear-gradient(135deg, ${Mm.accentHi}, ${Mm.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${Mm.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          animation: 'mmStamp 600ms cubic-bezier(.34,1.56,.64,1) both',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={Mm.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10"/>
          </svg>
        </div>
        <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0 }}>Transmitted<span style={{ color: Mm.accent }}>.</span></h2>
        <p style={{ ...MmTY.small, color: Mm.text3, marginTop: 8 }}>
          {fmt(amount)} aura → <strong style={{ color: Mm.accent }}>{friend?.name}</strong>
        </p>
        <button onClick={onClose} style={{
          marginTop: 24, padding: '10px 18px', borderRadius: 4,
          background: Mm.accent, color: Mm.bg, border: `1px solid ${Mm.accent}`,
          fontFamily: Mm.fontUI, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Done</button>
        <style>{`@keyframes mmStamp {
          0%   { transform: scale(0.3) rotate(-25deg); opacity: 0; }
          60%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }`}</style>
      </div>
    </Backdrop>
  );

  return (
    <Backdrop>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 4 }}>TRANSMIT · AURA</div>
          <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0 }}>Send gift<span style={{ color: Mm.accent }}>.</span></h2>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: Mm.text3,
          cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4,
        }}>✕</button>
      </div>

      {!friend ? (
        <>
          <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 10 }}>RECIPIENT</div>
          {memberPool.length >= 6 && (
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search surveyor…" style={{
                     width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                     background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
                     borderRadius: 4, color: Mm.text,
                     fontFamily: Mm.fontUI, fontSize: 14, outline: 'none', marginBottom: 14,
                   }}/>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ ...MmTY.body, color: Mm.text3, textAlign: 'center', padding: '24px 8px' }}>No matches.</div>
            ) : candidates.map((m) => (
              <button key={m.id} onClick={() => setFriend(m)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 8px', borderBottom: `1px solid ${Mm.hair}`,
                display: 'flex', alignItems: 'center', gap: 12, color: Mm.text, textAlign: 'left',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(155,214,107,0.06)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div style={{
                  width: 32, height: 32, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
                  background: m.avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
                  border: `1px solid ${Mm.hair2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 12, fontWeight: 700 }}>{m.name[0]?.toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                  <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>@{m.tag}</div>
                </div>
                <span style={{ color: Mm.text3, fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setFriend(null)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...MmTY.coord, color: Mm.accent,
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: 0,
          }}>‹ CHANGE</button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, background: 'rgba(10,18,16,0.65)',
            border: `1px solid ${Mm.hair2}`, borderRadius: 4, marginBottom: 22,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 4, overflow: 'hidden',
              background: friend.avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
              border: `1px solid ${Mm.hair2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {friend.avatar
                ? <img src={friend.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 13, fontWeight: 700 }}>{friend.name[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <div style={{ ...MmTY.body, color: Mm.text, fontWeight: 500 }}>{friend.name}</div>
              <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>@{friend.tag}</div>
            </div>
          </div>

          <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 10 }}>AMOUNT</div>
          <div style={{ padding: '14px 0 6px', textAlign: 'center' }}>
            <input type="text" inputMode="numeric"
              value={amount === 0 ? '' : String(amount)}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                setAmount(clean === '' ? 0 : parseInt(clean, 10));
              }}
              onFocus={(e) => e.target.select()} placeholder="0"
              style={{
                fontFamily: Mm.fontMono, fontSize: 56, fontWeight: 600,
                color: amount > (state?.aura || 0) ? Mm.danger : Mm.accent,
                background: 'transparent', border: 'none', outline: 'none',
                textAlign: 'center', width: '100%', padding: 0,
                caretColor: Mm.accent, letterSpacing: '-0.04em',
                textShadow: amount > (state?.aura || 0) ? 'none' : `0 0 28px ${Mm.accentGlow}`,
              }}/>
            <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 2 }}>aura</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
            {preset.map((p) => (
              <button key={p} onClick={() => setAmount(p)} style={{
                padding: '6px 14px', borderRadius: 4,
                background: amount === p ? `${Mm.accent}33` : 'rgba(10,18,16,0.65)',
                border: `1px solid ${amount === p ? Mm.accent : Mm.hair2}`,
                color: amount === p ? Mm.accent : Mm.text2,
                fontFamily: Mm.fontMono, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>{fmt(p)}</button>
            ))}
          </div>

          <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 8 }}>NOTE (OPTIONAL)</div>
          <input value={note} onChange={(e) => setNote(e.target.value)}
                 placeholder="Add a transmission note…"
                 style={{
                   width: '100%', padding: 12, boxSizing: 'border-box',
                   background: 'rgba(10,18,16,0.65)',
                   border: `1px solid ${Mm.hair2}`, borderRadius: 4,
                   color: Mm.text, fontFamily: Mm.fontUI, fontSize: 14,
                   outline: 'none', marginBottom: 22,
                 }}/>

          <button onClick={handleSend}
            disabled={amount < 1 || amount > (state?.aura || 0) || sending}
            style={{
              width: '100%', padding: '12px 18px', borderRadius: 4,
              background: Mm.accent, color: Mm.bg, border: `1px solid ${Mm.accent}`,
              fontFamily: Mm.fontUI, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: `0 0 14px ${Mm.accent}33`,
              opacity: (amount < 1 || amount > (state?.aura || 0) || sending) ? 0.5 : 1,
            }}>{sending ? 'Transmitting…' : `Transmit ${fmt(amount)} aura`}</button>

          {err && (
            <div style={{
              marginTop: 14, padding: 12,
              background: 'rgba(224,122,95,0.15)', border: `1px solid ${Mm.danger}`,
              borderRadius: 4, ...MmTY.small, color: Mm.danger,
            }}>⚠ {err}</div>
          )}
        </>
      )}
    </Backdrop>
  );
}

// ─── ModernRedeemModal ────────────────────────────────────────────────────
function CartographerModernRedeemModal({ reward, state, onClose, onConfirm }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
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
      const raw = err?.message || 'unknown';
      const msg = raw === 'not signed in' ? 'Sign in required.'
        : raw.startsWith('failed:insufficient') ? 'Insufficient aura.'
        : raw.startsWith('invalid:') ? 'Reward unavailable.'
        : raw === 'op timeout' ? 'Timed out, try again.'
        : `Try again: ${raw}`;
      setError(msg);
    } finally { setSending(false); }
  }

  const Backdrop = ({ children }) => (
    <div onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
         style={{
           position: 'fixed', inset: 0, zIndex: 1000,
           background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
         }}>
      <div style={{
        width: 460, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.98))',
        border: `1px solid ${Mm.hair3}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        padding: '28px 32px',
      }}>{children}</div>
    </div>
  );

  if (stage === 'success') return (
    <Backdrop>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%', margin: '0 auto 22px',
          background: `linear-gradient(135deg, ${Mm.accentHi}, ${Mm.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${Mm.accentGlow}`,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={Mm.bg} strokeWidth="2.5"><path d="m5 12 5 5 9-10"/></svg>
        </div>
        <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0 }}>Logged<span style={{ color: Mm.accent }}>.</span></h2>
        <p style={{ ...MmTY.small, color: Mm.text3, marginTop: 8 }}>The team will reach out for delivery.</p>
        <div style={{
          padding: '14px 18px', background: 'rgba(10,18,16,0.65)',
          border: `1px solid ${Mm.hair2}`, borderRadius: 4, margin: '20px 0',
          ...MmTY.small, color: Mm.text2, textAlign: 'left',
        }}>
          <div style={{ ...MmTY.h3, fontSize: 14, color: Mm.text, marginBottom: 4 }}>{reward.title}</div>
          <div>−{fmt(reward.price)} aura · ID <span style={{ ...MmTY.coord, color: Mm.accent }}>{reward.id}</span></div>
        </div>
        <button onClick={onClose} style={{
          width: '100%', padding: '10px 18px', borderRadius: 4,
          background: Mm.accent, color: Mm.bg, border: `1px solid ${Mm.accent}`,
          fontFamily: Mm.fontUI, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Done</button>
      </div>
    </Backdrop>
  );

  return (
    <Backdrop>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 4 }}>MARKETPLACE</div>
          <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0 }}>Confirm redeem<span style={{ color: Mm.accent }}>.</span></h2>
        </div>
        <button onClick={onClose} disabled={sending} style={{
          background: 'transparent', border: 'none', color: Mm.text3,
          cursor: sending ? 'not-allowed' : 'pointer', fontSize: 22, lineHeight: 1, padding: 4,
        }}>✕</button>
      </div>

      <div style={{
        display: 'flex', gap: 14, padding: 14,
        background: 'rgba(10,18,16,0.65)',
        border: `1px solid ${Mm.hair2}`, borderRadius: 4, marginBottom: 20,
      }}>
        <div style={{
          width: 56, height: 56, flexShrink: 0,
          background: reward.image ? `url("${reward.image}") center/cover` : `linear-gradient(135deg, ${Mm.accent}33, ${Mm.cyan}11)`,
          border: `1px solid ${Mm.hair2}`, borderRadius: 4,
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 15 }}>{reward.title}</div>
          <div style={{ ...MmTY.small, color: Mm.text3, marginTop: 2 }}>{reward.sub}</div>
        </div>
      </div>

      <ModernRow label="COST" value={`${fmt(reward.price)} aura`}/>
      <ModernRow label="BALANCE AFTER" value={`${fmt(Math.max(0, (state?.aura || 0) - reward.price))} aura`}/>
      <ModernRow label="DELIVERY" value="Team will contact you" last/>

      {error && (
        <div style={{
          marginTop: 14, padding: 12,
          background: 'rgba(224,122,95,0.15)', border: `1px solid ${Mm.danger}`,
          borderRadius: 4, ...MmTY.small, color: Mm.danger,
        }}>⚠ {error}</div>
      )}

      <button onClick={handleConfirm} disabled={sending} style={{
        marginTop: 20, width: '100%', padding: '12px 18px', borderRadius: 4,
        background: Mm.accent, color: Mm.bg, border: `1px solid ${Mm.accent}`,
        fontFamily: Mm.fontUI, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        boxShadow: `0 0 14px ${Mm.accent}33`,
        opacity: sending ? 0.5 : 1,
      }}>{sending ? 'Logging…' : error ? 'Try again' : 'Confirm redeem'}</button>
    </Backdrop>
  );
}

function ModernRow({ label, value, last }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '10px 0',
      borderBottom: last ? 'none' : `1px solid ${Mm.hair}`,
    }}>
      <span style={{ ...MmTY.coord, color: Mm.text3 }}>{label}</span>
      <span style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, fontSize: 14 }}>{value}</span>
    </div>
  );
}

// ─── ModernNotifDrawer ────────────────────────────────────────────────────
function CartographerModernNotifDrawer({ onClose, library, reviews, follows, setView }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const meId = window.ME?.id || null;
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];

  const lastSeen = (typeof getLastSeen === 'function') ? getLastSeen() : 0;
  const [dismissed, setDismissed] = React.useState(() =>
    (typeof getDismissed === 'function') ? getDismissed() : new Set()
  );
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
      const next = new Set(prev); next.add(id);
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

  const rel = (atMs) => {
    if (!atMs) return '';
    const ms = Date.now() - atMs;
    if (ms < 60_000) return 'now';
    const m = Math.floor(ms / 60_000); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 20, right: 20, bottom: 20, width: 380,
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.99))',
        border: `1px solid ${Mm.hair2}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        padding: 24, overflowY: 'auto',
        animation: 'mmSlideR 0.3s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 4 }}>SIGNAL · INBOX</div>
            <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0, fontSize: 20 }}>Notifications<span style={{ color: Mm.accent }}>.</span></h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {items.length > 0 && (
              <button onClick={clearAll} style={{
                background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
                color: Mm.text2, cursor: 'pointer',
                fontFamily: Mm.fontMono, fontSize: 10, letterSpacing: '0.18em',
                padding: '5px 10px', borderRadius: 3,
              }}>CLEAR</button>
            )}
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: Mm.text3,
              cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4,
            }}>✕</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{
            padding: '40px 12px', textAlign: 'center',
            ...MmTY.body, color: Mm.text3,
          }}>
            <div style={{ ...MmTY.coord, color: Mm.text4, marginBottom: 8 }}>◌ NO SIGNAL</div>
            All clear.
          </div>
        ) : items.map((n, i) => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '11px 0',
            borderBottom: i === items.length - 1 ? 'none' : `1px solid ${Mm.hair}`,
          }}>
            <div style={{
              marginTop: 6, flex: 'none',
              width: 6, height: 6, borderRadius: '50%',
              background: n.unread ? Mm.accent : 'transparent',
              boxShadow: n.unread ? `0 0 6px ${Mm.accent}` : 'none',
              border: n.unread ? 'none' : `1px solid ${Mm.hair2}`,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...MmTY.body, color: Mm.text, fontSize: 13,
                fontWeight: n.unread ? 500 : 400,
              }}>{n.title}</div>
              <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 4, fontSize: 9 }}>{rel(n.at)}</div>
            </div>
            <button onClick={() => dismiss(n.id)} title="Dismiss" style={{
              background: 'transparent', border: 'none', color: Mm.text4,
              cursor: 'pointer', padding: 4, fontSize: 14, lineHeight: 1,
            }}>✕</button>
          </div>
        ))}

        <style>{`@keyframes mmSlideR { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      </div>
    </div>
  );
}

window.CartographerModernGiftModal   = CartographerModernGiftModal;
window.CartographerModernRedeemModal = CartographerModernRedeemModal;
window.CartographerModernNotifDrawer = CartographerModernNotifDrawer;
