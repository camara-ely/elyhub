// modals.jsx — all top-level overlays: report, gift, redeem, notification
// drawer, shortcuts, settings (with the large appearance pane), and the
// level-up takeover.
//
// Extracted from app.jsx in the modularization pass. These are the biggest
// UI-heavy chunks that aren't tied to a specific route — consolidating them
// here makes app.jsx focus purely on routing + top-level composition.
//
// Contents (roughly in order):
//   • Modal          — generic backdrop + glass panel wrapper
//   • ReportModal / ReportTrigger / ProfileOverflowMenu  — moderation
//   • GiftModal      — aura gifting flow
//   • RedeemModal    — claim/redeem rewards
//   • NotifDrawer    — inbox drawer + buildNotifications builders
//   • Kbd / ShortcutsModal  — ⌘K / ? helper
//   • SettingsModal  — the big settings panel (appearance, notifications, account)
//   • LevelUpTakeover — full-screen level-up cinematic

// ────────────── Modals ──────────────
function Modal({ children, onClose, width = 440 }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glass(2, {
          width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
          borderRadius: T.r.xl, padding: 28,
          animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.15)',
        }),
      }}>{children}</div>
    </div>
  );
}

// ──── ReportModal — generic "report content" dialog ────
// Pops from any ReportTrigger (listing, review, profile). The reason picker
// is scoped to the target kind so review reports can't select "scam" while
// user reports still can. A short note textarea lets the reporter add
// context; both reason and note are persisted via `reports.submit`.
const REPORT_REASONS = {
  listing: [
    { id: 'scam',      label: 'Scam or fraud',         sub: 'Fake product, stolen asset, takes payment and doesn\'t deliver' },
    { id: 'spam',      label: 'Spam',                  sub: 'Duplicate / low-effort listing' },
    { id: 'nsfw',      label: 'NSFW or offensive',     sub: 'Sexual, violent, or harassing content' },
    { id: 'copyright', label: 'Copyright violation',   sub: 'Reselling assets the creator doesn\'t own' },
    { id: 'other',     label: 'Something else',        sub: 'Describe below' },
  ],
  review: [
    { id: 'spam',      label: 'Spam or off-topic',     sub: 'Doesn\'t actually review the product' },
    { id: 'offensive', label: 'Abusive or harassing',  sub: 'Personal attacks, slurs' },
    { id: 'fake',      label: 'Fake / paid review',    sub: 'Didn\'t buy, review-farming' },
    { id: 'other',     label: 'Something else',        sub: 'Describe below' },
  ],
  user: [
    { id: 'harassment', label: 'Harassment',           sub: 'Targeting me or others' },
    { id: 'scam',       label: 'Scammer',              sub: 'Pattern of fraudulent sales' },
    { id: 'impersonation', label: 'Impersonation',     sub: 'Pretending to be someone else' },
    { id: 'spam',       label: 'Spam account',         sub: 'Bot or bulk-promo account' },
    { id: 'other',      label: 'Something else',       sub: 'Describe below' },
  ],
};
function ReportModal({ target, reports, onClose }) {
  if (T.zodiac && window.ZodiacReportModal) {
    return <window.ZodiacReportModal target={target} reports={reports} onClose={onClose}/>;
  }
  if (T.cartographer && window.CartographerReportModal) {
    return <window.CartographerReportModal target={target} reports={reports} onClose={onClose}/>;
  }
  if (T.cartographerModern && window.CartographerModernReportModal) {
    return <window.CartographerModernReportModal target={target} reports={reports} onClose={onClose}/>;
  }
  // `target` is { kind, id, name }. `reports` is the useReports instance.
  const options = REPORT_REASONS[target.kind] || REPORT_REASONS.user;
  const [reason, setReason] = React.useState(options[0].id);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const already = reports.has(target.kind, target.id);
  const onSubmit = () => {
    if (already) { onClose(); return; }
    const res = reports.submit({ kind: target.kind, targetId: target.id, reason, note });
    if (res.ok) {
      setSent(true);
      try { ElyNotify?.toast?.({ text: 'Report sent — thanks for flagging', kind: 'success' }); } catch {}
      setTimeout(onClose, 900);
    }
  };
  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>
        REPORT {target.kind.toUpperCase()}
      </div>
      <h2 style={{ ...TY.h2, margin: 0, marginBottom: 4 }}>
        {already ? 'Already reported' : 'What\'s wrong?'}
      </h2>
      <div style={{ ...TY.body, color: T.text3, fontSize: 13, marginBottom: 18 }}>
        {target.name ? <>Reporting <span style={{ color: T.text2 }}>{target.name}</span>. </> : null}
        {already
          ? "You've already flagged this — a moderator will take a look."
          : 'Our mods will review it. Abuse of the report system can get your account limited.'}
      </div>
      {!already && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {options.map((o) => {
              const active = reason === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setReason(o.id)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px', borderRadius: T.r.md,
                    background: active ? 'rgba(61,123,255,0.10)' : 'rgba(255,255,255,0.02)',
                    border: `0.5px solid ${active ? T.accent + '66' : T.glassBorder}`,
                    color: T.text, cursor: 'pointer',
                    fontFamily: T.fontSans,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%', marginTop: 3,
                    border: `1.5px solid ${active ? T.accent : T.glassBorder2}`,
                    background: active ? T.accent : 'transparent',
                    flexShrink: 0,
                  }}/>
                  <span style={{ flex: 1 }}>
                    <div style={{ ...TY.body, fontSize: 13, fontWeight: 500, color: T.text }}>{o.label}</div>
                    <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 2 }}>{o.sub}</div>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>MORE DETAIL (OPTIONAL)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Links, timestamps, anything that helps us investigate…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: T.r.md,
              background: 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${T.glassBorder}`,
              color: T.text, fontFamily: T.fontSans, fontSize: 12,
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ ...TY.small, color: T.text3, fontSize: 10, textAlign: 'right', marginTop: 4 }}>
            {note.length}/500
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onClose} style={{
          padding: '8px 16px', borderRadius: T.r.pill,
          background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
          color: T.text2, cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 13,
        }}>{already ? 'Close' : 'Cancel'}</button>
        {!already && (
          <button onClick={onSubmit} disabled={sent} style={{
            padding: '8px 18px', borderRadius: T.r.pill,
            background: sent ? 'rgba(110,231,183,0.18)' : 'linear-gradient(135deg, rgba(255,140,140,0.95), rgba(220,90,90,0.95))',
            border: 'none', color: '#fff', cursor: sent ? 'default' : 'pointer',
            fontFamily: T.fontSans, fontSize: 13, fontWeight: 600,
            boxShadow: sent ? 'none' : '0 3px 14px rgba(220,90,90,0.45)',
            opacity: sent ? 0.6 : 1,
          }}>{sent ? 'Enviado ✓' : 'Enviar report'}</button>
        )}
      </div>
    </Modal>
  );
}

// ──── ReportTrigger — compact icon button that opens the ReportModal ────
// Drop-in anywhere you want a flag affordance. Hides entirely if `reports`
// isn't passed (so unwired surfaces gracefully disappear).
function ReportTrigger({ target, reports, size = 14, compact }) {
  const [open, setOpen] = React.useState(false);
  if (!reports) return null;
  if (target.id === (window.ME?.id || 'me')) return null;
  const already = reports.has(target.kind, target.id);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={already ? 'Already reported' : 'Report'}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: compact ? 2 : 4, borderRadius: T.r.sm,
          color: already ? 'rgba(255,140,140,0.8)' : T.text3,
          display: 'inline-flex', alignItems: 'center',
          opacity: compact ? 0.6 : 1,
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 21V4"/><path d="M4 4h12l-2 5 2 5H4"/>
        </svg>
      </button>
      {open && <ReportModal target={target} reports={reports} onClose={() => setOpen(false)}/>}
    </>
  );
}

// ──── ProfileOverflowMenu — "…" button on a profile page ────
// Popover over the profile hero with Block / Report. Closes on outside-click
// or Esc. The block toggle is immediate (no modal) because it's reversible;
// reporting opens the richer ReportModal.
function ProfileOverflowMenu({ m, blocks, reports }) {
  const [open, setOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const blocked = blocks?.has(m.id);
  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          title="More"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: `0.5px solid ${T.glassBorder2}`,
            color: T.text2, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          </svg>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
            minWidth: 190,
            ...glass(2, { padding: 6, borderRadius: T.r.md }),
          }}>
            {blocks && (
              <button
                onClick={() => {
                  blocks.toggle(m.id);
                  setOpen(false);
                  try {
                    ElyNotify?.toast?.({
                      text: blocked ? `Unblocked ${m.name.split(' ')[0]}` : `Blocked ${m.name.split(' ')[0]} — you won't see their content`,
                      kind: blocked ? 'info' : 'warn',
                    });
                  } catch {}
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: T.r.sm,
                  background: 'transparent', border: 'none',
                  color: T.text, cursor: 'pointer',
                  fontFamily: T.fontSans, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>
                </svg>
                {blocked ? 'Unblock' : 'Block'} {m.name.split(' ')[0]}
              </button>
            )}
            {reports && (
              <button
                onClick={() => { setOpen(false); setReportOpen(true); }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: T.r.sm,
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,140,140,0.9)', cursor: 'pointer',
                  fontFamily: T.fontSans, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 21V4"/><path d="M4 4h12l-2 5 2 5H4"/>
                </svg>
                Report {reports.has('user', m.id) ? '(sent)' : ''}
              </button>
            )}
          </div>
        )}
      </div>
      {reportOpen && (
        <ReportModal
          target={{ kind: 'user', id: m.id, name: m.name }}
          reports={reports}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

function GiftModal({ state, onClose, onSend, initialFriend }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacGiftModal) {
    return <window.ZodiacGiftModal state={state} onClose={onClose} onSend={onSend} initialFriend={initialFriend}/>;
  }
  // Cartographer (vintage) gate — envelope with wax seal.
  if (T.cartographer && window.CartographerGiftModal) {
    return <window.CartographerGiftModal state={state} onClose={onClose} onSend={onSend} initialFriend={initialFriend}/>;
  }
  // Cartographer Modern gate — telemetry transmission.
  if (T.cartographerModern && window.CartographerModernGiftModal) {
    return <window.CartographerModernGiftModal state={state} onClose={onClose} onSend={onSend} initialFriend={initialFriend}/>;
  }
  const [friend, setFriend] = React.useState(initialFriend || null);
  const [amount, setAmount] = React.useState(500);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const preset = [100, 500, 1000, 2500, 5000];
  // Fresh member list fetched from /members when the modal opens — gets
  // up-to-date Discord display names and avatar URLs for all guild members,
  // not just the top-50 leaderboard snapshot kept in window.MEMBERS.
  const [freshMembers, setFreshMembers] = React.useState(null);
  React.useEffect(() => {
    if (!window.ElyAPI?.isSignedIn?.()) return;
    window.ElyAPI.get('/members?sort=name&limit=300')
      .then((res) => {
        const list = (res.items || []).map((r) => ({
          id: r.id,
          name: r.name || r.id,
          tag: (r.name || r.id).toLowerCase().replace(/\s+/g, '').slice(0, 20),
          avatar: r.avatar_url || null,
        }));
        setFreshMembers(list);
      })
      .catch(() => { /* fall back to MEMBERS below */ });
  }, []);

  // Esc closes. Like RedeemModal, lock it while the op is mid-flight so a
  // stray keypress doesn't orphan a pending gift the user can't trace.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !sending && !sent) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sending, sent, onClose]);

  // Filter the friend list. Normalize-diacritics approach mirrors the topbar
  // search so "ines" matches "Inês". Matches either name or tag, case-insensitive.
  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(search);
  const myId = window.ME?.id;
  // Prefer the fresh /members list (all members, current Discord names/avatars).
  // Fall back to MEMBERS global (top-50 poll) while fetch is in flight.
  const memberPool = freshMembers || MEMBERS;
  const candidates = memberPool
    .filter((m) => m.id !== myId)
    .filter((m) => !q || normalize(m.name).includes(q) || normalize(m.tag).includes(q));

  async function handleSend() {
    setErr(null);
    setSending(true);
    try {
      if (window.ElyOps?.sendGift) {
        // Write to Turso's pending_ops, then wait up to ~6s for the bot's
        // pending-ops-worker to apply via transferXp. Throws if the bot
        // rejects (insufficient balance, self-gift, etc.), which surfaces
        // below as an inline error instead of silently crediting nothing.
        await window.ElyOps.sendGift(friend.id, amount, note || null);
      }
      // No optimistic aura update — data.jsx's next poll (≤5s) picks up
      // the authoritative aura totals from the bot's Turso mirror and the
      // ME-sync effect in App re-renders state.aura for us.
      onSend(friend, amount);
      setSent(true);
    } catch (e) {
      console.error('[gift] send failed', e);
      setErr(e.message || 'send failed');
    } finally {
      setSending(false);
    }
  }

  if (sent) return (
    <Modal onClose={onClose} width={400}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
          background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}><ICheck size={26} color="#fff" sw={2}/></div>
        <h2 style={{ ...TY.h2, margin: 0 }}>{t('gift.sent')}</h2>
        <p style={{ ...TY.body, color: T.text3, marginTop: 6 }}>{fmt(amount)} {t('home.aura')} → {friend.name}</p>
        <div style={{ marginTop: 24 }}><Btn variant="primary" full onClick={onClose}>{t('gift.done')}</Btn></div>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ ...TY.h2, margin: 0 }}>{t('gift.title')}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={18}/></button>
      </div>

      {!friend ? (
        <>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('gift.to')}</div>
          {/* Filter — autofocuses so the user can start typing immediately.
              Hidden when there are fewer than 6 members, since scrolling isn't
              a problem yet and the extra chrome just adds noise. */}
          {memberPool.length >= 6 && (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('gift.search')}
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${T.glassBorder}`, borderRadius: T.r.md,
                color: T.text, fontFamily: T.fontSans, fontSize: 13, outline: 'none',
                marginBottom: 10,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 360, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', ...TY.small, color: T.text3 }}>
                {t('gift.noMatches')}
              </div>
            ) : candidates.map(m => (
              <button key={m.id} onClick={() => setFriend(m)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 8px', borderRadius: T.r.md, display: 'flex', alignItems: 'center', gap: 12, color: T.text, textAlign: 'left',
                transition: 'background .15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar name={m.name} src={m.avatar} size={36}/>
                <div style={{ flex: 1 }}>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ ...TY.small, color: T.text3 }}>@{m.tag}</div>
                </div>
                <IChevR size={14} color={T.text3}/>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setFriend(null)} style={{ background: 'transparent', border: 'none', color: T.accentHi, cursor: 'pointer', ...TY.small, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, padding: 0 }}>
            <IChevL size={14}/> {t('gift.back')}
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 14, background: 'rgba(255,255,255,0.04)',
            borderRadius: T.r.md, border: `0.5px solid ${T.glassBorder}`, marginBottom: 20,
          }}>
            <Avatar name={friend.name} size={40}/>
            <div>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{friend.name}</div>
              <div style={{ ...TY.small, color: T.text3 }}>@{friend.tag}</div>
            </div>
          </div>

          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('gift.amount')}</div>
          {/* Editable hero number — the big display IS the input. Click
              anywhere on it and start typing. Styled to look identical to
              the static display it replaced (same TY.numLarge, same glow,
              same tabular-nums) so there's no visual shift between "read"
              and "edit" states — the caret is the only clue it's editable.
              Over-limit turns the number red so feedback is immediate
              without needing a separate warning line below. */}
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <input
              type="text"
              inputMode="numeric"
              value={amount === 0 ? '' : String(amount)}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                setAmount(clean === '' ? 0 : parseInt(clean, 10));
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              style={{
                ...TY.numLarge,
                fontSize: 60,
                color: amount > state.aura ? T.red : T.text,
                textShadow: amount > state.aura ? 'none' : `0 0 40px ${T.accentGlow}`,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                width: '100%',
                padding: 0,
                caretColor: T.accentHi,
              }}
            />
            <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{t('home.aura')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
            {preset.map(p => (
              <button key={p} onClick={() => setAmount(p)} style={{
                padding: '6px 14px', borderRadius: T.r.pill,
                background: amount === p ? `${T.accent}33` : 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${amount === p ? T.accent : T.glassBorder}`,
                color: amount === p ? T.accentHi : T.text2,
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                boxShadow: amount === p ? `0 0 12px ${T.accentGlow}` : 'none',
              }}>{fmt(p)}</button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('gift.note')} style={{
            width: '100%', padding: 14, background: 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${T.glassBorder}`, borderRadius: T.r.md,
            color: T.text, fontFamily: T.fontSans, fontSize: 14, outline: 'none',
            marginBottom: 20, boxSizing: 'border-box',
          }}/>
          <Btn variant="primary" full size="lg" onClick={handleSend} disabled={amount < 1 || amount > state.aura || sending}>
            {sending ? t('gift.sending') : `${t('gift.send')} ${fmt(amount)} ${t('home.aura')}`}
          </Btn>
          {err && (
            <div style={{ ...TY.small, color: T.red, marginTop: 12, textAlign: 'center' }}>
              {err}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// Redemption modal. Stages: 'confirm' → (sending) → 'success' | 'error'.
// The bot is authoritative for the aura deduction — we enqueue a `redeem` op
// via pending_ops and the bot's worker validates balance, deducts via addXp,
// logs to aura_log, and DMs the user + posts to the admin channel. If the
// worker returns anything other than 'ok' (e.g. 'failed:insufficient'), we
// show the error and let the user retry. The live poll will pick up the new
// aura on its next tick, so we don't need to optimistically deduct here.
function RedeemModal({ reward, state, onClose, onConfirm }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacRedeemModal) {
    return <window.ZodiacRedeemModal reward={reward} state={state} onClose={onClose} onConfirm={onConfirm}/>;
  }
  // Cartographer gate — paper certificate.
  if (T.cartographer && window.CartographerRedeemModal) {
    return <window.CartographerRedeemModal reward={reward} state={state} onClose={onClose} onConfirm={onConfirm}/>;
  }
  // Cartographer Modern gate — dashboard log.
  if (T.cartographerModern && window.CartographerModernRedeemModal) {
    return <window.CartographerModernRedeemModal reward={reward} state={state} onClose={onClose} onConfirm={onConfirm}/>;
  }
  const [stage, setStage] = React.useState('confirm');
  const [error, setError] = React.useState(null);
  const [sending, setSending] = React.useState(false);

  // Esc closes the modal (except mid-send — don't let the user lose the
  // op by accident while the bot is still processing it).
  React.useEffect(() => {
    if (!reward) return;
    const onKey = (e) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reward, sending, onClose]);

  if (!reward) return null;

  async function handleConfirm() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const api = window.ElyOps;
      if (!api?.redeemReward) {
        throw new Error('not signed in');
      }
      await api.redeemReward(reward.id, reward.price, reward.title);
      setStage('success');
      onConfirm?.();
    } catch (err) {
      // Translate the worker result into something readable.
      const raw = err?.message || 'unknown';
      const msg = raw === 'not signed in'
        ? t('redeem.errSignIn')
        : raw.startsWith('failed:insufficient')
          ? t('redeem.errInsuff')
          : raw.startsWith('invalid:')
            ? t('redeem.errInvalid')
            : raw === 'op timeout'
              ? t('redeem.errTimeout')
              : `${t('claim.tryAgain')}: ${raw}`;
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal onClose={sending ? undefined : onClose}>
      {stage === 'confirm' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ ...TY.h2, margin: 0 }}>{t('redeem.title')}</h2>
            <button onClick={onClose} disabled={sending} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: sending ? 'not-allowed' : 'pointer' }}><IX size={18}/></button>
          </div>
          <div style={{
            display: 'flex', gap: 14, padding: 14,
            background: 'rgba(255,255,255,0.04)', borderRadius: T.r.md,
            marginBottom: 20, border: `0.5px solid ${T.glassBorder}`,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: T.r.sm, overflow: 'hidden',
              background: `linear-gradient(135deg, ${T.accent}44, rgba(255,255,255,0.04))`,
              border: `0.5px solid ${T.glassBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.text3, fontFamily: T.fontMono, fontSize: 9,
              flexShrink: 0,
            }}>
              {reward.image
                ? <img src={reward.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : 'img'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{reward.title}</div>
              <div style={{ ...TY.small, color: T.text3 }}>{reward.sub}</div>
            </div>
          </div>
          <Row k={t('redeem.price')} v={`${fmt(reward.price)} ${t('home.aura')}`}/>
          <Row k={t('redeem.balanceAfter')} v={`${fmt(Math.max(0, state.aura - reward.price))} ${t('home.aura')}`}/>
          <Row k={t('redeem.delivery')} v={t('redeem.deliveryVal')} last/>
          {error && (
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: T.r.sm,
              background: 'rgba(239, 68, 68, 0.1)', border: '0.5px solid rgba(239,68,68,0.3)',
              ...TY.small, color: '#fca5a5',
            }}>{error}</div>
          )}
          <div style={{ marginTop: 24 }}>
            <Btn variant="primary" full size="lg" disabled={sending} onClick={handleConfirm}>
              {sending ? t('gift.sending') : error ? t('claim.tryAgain') : t('redeem.confirm')}
            </Btn>
          </div>
        </>
      )}
      {stage === 'success' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
            background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${T.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}><ICheck size={26} color="#fff" sw={2}/></div>
          <h2 style={{ ...TY.h2, margin: 0 }}>{t('redeem.success')}</h2>
          <p style={{ ...TY.body, color: T.text3, marginTop: 6 }}>
            {t('redeem.successSub')}
          </p>
          <div style={{
            padding: '14px 18px', borderRadius: T.r.md,
            background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder2}`,
            margin: '20px 0', ...TY.small, color: T.text2,
          }}>
            <div style={{ color: T.text, fontWeight: 500, marginBottom: 4 }}>{reward.title}</div>
            <div>−{fmt(reward.price)} {t('home.aura')} · id <span style={{ fontFamily: T.fontMono, color: T.accentHi }}>{reward.id}</span></div>
          </div>
          <Btn variant="primary" full onClick={onClose}>{t('gift.done')}</Btn>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: last ? 'none' : `0.5px solid ${T.glassBorder}` }}>
      <span style={{ ...TY.body, color: T.text3 }}>{k}</span>
      <span style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

// Derive a notifications list from recent aura_log entries involving the
// signed-in user. Filter rules:
//   gift     → show if I'm the recipient (gifts I sent aren't "for me")
//   redeem   → always show (always about me — both sides are me)
//   postjob, available, gym_post, daily_tag, daily_booster → show if I'm the
//              subject (to_user_id === me), these are XP grants to me
// Returns a list of { id, title, at, unread } — timestamps are ms since epoch.
function buildNotifications(feed, meId, lastSeenMs, ctx = {}) {
  if (!Array.isArray(feed) || !meId) return [];
  const out = [];
  for (const e of feed) {
    // Skip anything that isn't about me.
    const isRecipient = e.toId === meId;
    const isSender    = e.fromId === meId;
    if (!isRecipient && !(e.kind === 'redeem' && isSender)) continue;
    // Gifts I sent aren't notifications — only gifts received.
    if (e.kind === 'gift' && !isRecipient) continue;

    let title;
    const fromFirst = (e.fromName || 'Someone').split(' ')[0];
    const auraWord = t('home.aura');
    switch (e.kind) {
      case 'gift':
        title = `${fromFirst} ${t('inbox.giftedYou')} ${fmt(e.amount)} ${auraWord}${e.note ? ` — "${e.note}"` : ''}`;
        break;
      case 'redeem':
        title = `${t('inbox.redeemedFor')}${e.note ? ` ${e.note}` : ''} ${t('inbox.forAmount')} ${fmt(Math.abs(e.amount))} ${auraWord}`;
        break;
      case 'postjob':     title = `+${fmt(e.amount)} ${t('inbox.postJob')}`; break;
      case 'available':   title = `+${fmt(e.amount)} ${t('inbox.avail')}`; break;
      case 'gym_post':    title = `+${fmt(e.amount)} ${t('inbox.gymPost')}${e.note ? ` · ${e.note}` : ''}`; break;
      case 'daily_tag':   title = `+${fmt(e.amount)} ${t('inbox.dailyTag')}`; break;
      case 'daily_booster': title = `+${fmt(e.amount)} ${t('inbox.dailyBooster')}`; break;
      default:            title = `${e.kind} · ${fmt(e.amount)} ${auraWord}`;
    }

    out.push({
      id: `${e.kind}:${e.id}`,
      title,
      at: e.at,
      unread: e.at > lastSeenMs,
    });
  }

  // Merge synthetic events (level-ups, etc) from ElyNotify's event log. These
  // aren't in aura_log so they'd be invisible otherwise. We sort the combined
  // list so synthetic and real events interleave chronologically.
  const synth = window.ElyNotify?.getEvents?.() || [];
  for (const e of synth) {
    if (!e || !e.id) continue;
    // Only level-up rendering for now; extend here as more synthetic kinds appear.
    let title = e.title;
    if (!title && e.kind === 'levelup') {
      title = `Level ${e.data?.level ?? '?'} unlocked`;
    }
    if (!title) continue;
    out.push({
      id: `synth:${e.id}`,
      title,
      at: e.at || 0,
      unread: (e.at || 0) > lastSeenMs,
    });
  }
  // ── Marketplace-derived rows ───────────────────────────────────────────
  // These aren't in the aura log or ElyNotify's synthetic events — they're
  // derived on the fly from library + reviews + follows state so they always
  // reflect current reality.
  const { library, reviews, follows } = ctx;
  const listings = window.LISTINGS || [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Subscriptions expiring in the next 3 days — nag window, not further.
  if (library?.items) {
    for (const it of library.items) {
      if (it.status !== 'active' || !it.expiresAt) continue;
      const msLeft = it.expiresAt - now;
      if (msLeft <= 0) continue;
      if (msLeft > 3 * DAY) continue;
      const l = listings.find((x) => x.id === it.listingId);
      if (!l) continue;
      const days = Math.max(1, Math.ceil(msLeft / DAY));
      out.push({
        id: `sub-expiring:${it.listingId}:${it.expiresAt}`,
        title: `${l.title} renews in ${days} day${days === 1 ? '' : 's'}`,
        at: it.expiresAt - 3 * DAY, // show up in recency roughly when the window opens
        unread: (it.expiresAt - 3 * DAY) > lastSeenMs,
        action: { id: 'library' },
      });
    }
    // Recently expired (last 3 days) — prompt to renew.
    for (const it of library.items) {
      if (it.status === 'active') continue;
      if (!it.expiresAt) continue;
      const ago = now - it.expiresAt;
      if (ago < 0 || ago > 3 * DAY) continue;
      const l = listings.find((x) => x.id === it.listingId);
      if (!l) continue;
      out.push({
        id: `sub-expired:${it.listingId}:${it.expiresAt}`,
        title: `${l.title} expired — renew to restore access`,
        at: it.expiresAt,
        unread: it.expiresAt > lastSeenMs,
        action: { id: 'listing', focusId: l.id },
      });
    }
  }

  // New reviews on listings I've published. Only flag unread ones so the
  // drawer doesn't fill up with ancient 5★s every time you open it.
  if (reviews?.items) {
    const mine = new Set(listings.filter((l) => l.sellerId === meId).map((l) => l.id));
    for (const r of reviews.items) {
      if (!mine.has(r.listingId)) continue;
      if (r.authorId === meId) continue;
      if ((r.createdAt || 0) <= lastSeenMs) continue; // unread-only
      const l = listings.find((x) => x.id === r.listingId);
      if (!l) continue;
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      out.push({
        id: `review:${r.id}`,
        title: `${stars} new review on ${l.title}${r.body ? ` — "${r.body.slice(0, 60)}${r.body.length > 60 ? '…' : ''}"` : ''}`,
        at: r.createdAt || now,
        unread: true,
        action: { id: 'listing', focusId: l.id },
      });
    }
  }

  // Followed creators publishing new listings since the user's last feed
  // visit. Deduplicates by creator+listing so the same publish doesn't show
  // twice across reopens.
  if (follows?.items?.length) {
    const seen = follows.lastSeen || 0;
    for (const l of listings) {
      if (!follows.items.includes(l.sellerId)) continue;
      if ((l.createdAt || 0) <= seen) continue;
      const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
      out.push({
        id: `follow-new:${l.id}`,
        title: `${seller ? seller.name.split(' ')[0] : 'Someone you follow'} published ${l.title}`,
        at: l.createdAt || now,
        unread: (l.createdAt || 0) > lastSeenMs,
        action: { id: 'listing', focusId: l.id },
      });
    }
  }

  out.sort((a, b) => b.at - a.at);
  return out;
}

const LAST_SEEN_KEY = 'elyhub:lastNotifSeen';
const DISMISSED_KEY = 'elyhub:notifDismissed';

// Read the "last seen" timestamp. Used by the nav-bar dot indicator AND the
// drawer; exported so both can use the same source.
function getLastSeen() {
  try {
    const v = Number(localStorage.getItem(LAST_SEEN_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function markAllNotifsSeen() {
  try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())); } catch {}
}

// Dismissed-notification persistence. We store IDs (not full rows) so stale
// IDs from old aura_log rows naturally fall off when the feed rotates them
// out. Capped at 500 so the set can't grow forever.
function getDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDismissed(set) {
  try {
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {}
}

function NotifDrawer({ onClose, library, reviews, follows, setView }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacNotifDrawer) {
    return <window.ZodiacNotifDrawer onClose={onClose} library={library} reviews={reviews} follows={follows} setView={setView}/>;
  }
  // Cartographer gate — parchment Diário de Avisos drawer.
  if (T.cartographer && window.CartographerNotifDrawer) {
    return <window.CartographerNotifDrawer onClose={onClose} library={library} reviews={reviews} follows={follows} setView={setView}/>;
  }
  // Cartographer Modern gate — telemetry signal inbox.
  if (T.cartographerModern && window.CartographerModernNotifDrawer) {
    return <window.CartographerModernNotifDrawer onClose={onClose} library={library} reviews={reviews} follows={follows} setView={setView}/>;
  }
  const meId = window.ME?.id || null;
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];
  const [lastSeen] = React.useState(getLastSeen);
  const [dismissed, setDismissed] = React.useState(getDismissed);
  // Tick on synthetic event changes so new level-ups surface without reopening.
  const [, setEventTick] = React.useState(0);
  React.useEffect(() => {
    const unsub = window.ElyNotify?.subscribeEvents?.(() => setEventTick((t) => t + 1));
    return () => { try { unsub?.(); } catch {} };
  }, []);
  const allItems = buildNotifications(feed, meId, lastSeen, { library, reviews, follows });
  const items = allItems.filter((n) => !dismissed.has(n.id));

  // Mark as seen when the drawer opens — not on close, because the user has
  // already visually absorbed the unread dot state by the time they're here.
  React.useEffect(() => { markAllNotifsSeen(); }, []);

  // Esc closes the drawer. Also supported: clicking the backdrop.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const clearAll = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of allItems) next.add(n.id);
      saveDismissed(next);
      return next;
    });
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 20, right: 20, bottom: 20, width: 380,
        ...glass(2, {
          padding: 24, overflowY: 'auto', borderRadius: T.r.xl,
          animation: 'slideInR .3s cubic-bezier(.2,.9,.3,1.05)',
        }),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...TY.h2, margin: 0 }}>{t('inbox.title')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, cursor: 'pointer',
                  fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
                  padding: '6px 10px', borderRadius: T.r.pill,
                  transition: 'all .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = T.text2; }}
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={18}/></button>
          </div>
        </div>
        {!meId && (
          <div style={{ padding: '36px 8px', textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2 }}>{t('inbox.signin')}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              {t('inbox.signinSub')}
            </div>
          </div>
        )}
        {meId && items.length === 0 && (
          <div style={{ padding: '36px 8px', textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2 }}>{t('inbox.caughtUp')}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              {t('inbox.caughtUpSub')}
            </div>
          </div>
        )}
        {meId && items.map(n => (
          <NotifRow
            key={n.id}
            n={n}
            onDismiss={() => dismiss(n.id)}
            onAction={n.action ? () => { setView?.(n.action); onClose(); } : null}
          />
        ))}
      </div>
    </div>
  );
}

// A single inbox row with swipe-to-dismiss + hover-X fallback.
// Pointer events (not touch) so it works on both trackpad drag and mouse.
function NotifRow({ n, onDismiss, onAction }) {
  const [drag, setDrag] = React.useState(0);       // current X translation
  const [hover, setHover] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const startX = React.useRef(null);
  const DISMISS_THRESHOLD = 120;

  const onPointerDown = (e) => {
    // Ignore clicks on the X button — it has its own handler.
    if (e.target.closest?.('[data-dismiss-btn]')) return;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (startX.current == null) return;
    // Only allow right-swipe (positive delta) — left-swipe feels wrong for
    // a drawer that slides in from the right.
    setDrag(Math.max(0, e.clientX - startX.current));
  };
  const endDrag = () => {
    if (startX.current == null) return;
    if (drag > DISMISS_THRESHOLD) {
      setRemoving(true);
      setDrag(600);
      setTimeout(onDismiss, 180);
    } else {
      setDrag(0);
    }
    startX.current = null;
  };

  const onRowClick = (e) => {
    // Don't fire on drag-dismiss or when clicking the X.
    if (!onAction) return;
    if (drag > 4) return;
    if (e.target.closest?.('[data-dismiss-btn]')) return;
    onAction();
  };
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={onRowClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '14px 8px', margin: '0 -8px',
        borderBottom: `0.5px solid ${T.glassBorder}`,
        display: 'flex', gap: 12, position: 'relative',
        transform: `translateX(${drag}px)`,
        opacity: removing ? 0 : Math.max(0.3, 1 - drag / 300),
        transition: startX.current == null ? 'transform .2s ease, opacity .2s ease, background .15s' : 'none',
        touchAction: 'pan-y',
        cursor: drag > 0 ? 'grabbing' : (onAction ? 'pointer' : 'default'),
        borderRadius: T.r.sm,
        background: onAction && hover ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      {n.unread && <span style={{
        position: 'absolute', left: -10, top: 22, width: 6, height: 6, borderRadius: '50%',
        background: T.accentHi, boxShadow: `0 0 8px ${T.accent}`,
      }}/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{n.title}</div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{relTime(n.at)} ago</div>
      </div>
      <button
        data-dismiss-btn
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{
          background: 'transparent', border: 'none',
          color: T.text3, cursor: 'pointer',
          padding: 4, borderRadius: T.r.sm,
          opacity: hover ? 1 : 0,
          transition: 'opacity .15s',
          alignSelf: 'flex-start',
        }}
        title="Dismiss"
      >
        <IX size={14}/>
      </button>
    </div>
  );
}

// ────────────── Keyboard shortcuts ──────────────
// A single reference sheet for everything the keyboard can do. Grouped by
// intent (Navigation / Search / General) so a skim reads like a cheat sheet.
// Keys render as <Kbd> chips; multi-key combos join with "+". The list is
// the source of truth — actual key handling lives in the components that own
// the behavior (SearchBar owns ⌘K, the intro owns Shift+R, etc.).
function Kbd({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 22, padding: '0 6px',
      border: `0.5px solid ${T.glassBorder}`,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 5,
      fontFamily: T.fontMono, fontSize: 11, fontWeight: 500,
      color: 'rgba(255,255,255,0.85)',
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)',
    }}>{children}</span>
  );
}
function ShortcutsModal({ onClose }) {
  if (T.zodiac && window.ZodiacShortcutsModal) {
    return <window.ZodiacShortcutsModal onClose={onClose}/>;
  }
  if (T.cartographer && window.CartographerShortcutsModal) {
    return <window.CartographerShortcutsModal onClose={onClose}/>;
  }
  if (T.cartographerModern && window.CartographerModernShortcutsModal) {
    return <window.CartographerModernShortcutsModal onClose={onClose}/>;
  }
  // Esc to close — standard modal affordance.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const groups = [
    {
      title: t('shortcuts.search'),
      rows: [
        { keys: [mod, 'K'], label: isMac ? 'Focus search' : 'Focus search' },
        { keys: ['/'],      label: 'Focus search' },
        { keys: ['↑', '↓'], label: 'Navigate results' },
        { keys: ['↵'],      label: 'Open highlighted result' },
        { keys: ['Esc'],    label: 'Close dropdown' },
      ],
    },
    {
      title: t('shortcuts.nav'),
      rows: [
        { keys: ['?'],      label: 'Toggle this sheet' },
        { keys: ['Esc'],    label: 'Close modal / dropdown' },
      ],
    },
    {
      title: t('shortcuts.general'),
      rows: [
        { keys: [mod, 'R'], label: 'Reload app' },
        { keys: ['Shift', 'R'], label: 'Replay intro (dev)' },
      ],
    },
  ];

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(5,6,10,0.72)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 180ms ease-out both',
      }}
    >
      <Glass style={{
        width: '100%', maxWidth: 520, padding: 22,
        animation: 'slideUp 220ms cubic-bezier(0.19,1,0.22,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IHelp size={20}/>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {t('shortcuts.title')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}
          >
            <IX size={14}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((g) => (
            <div key={g.title}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.42)', marginBottom: 8,
              }}>{g.title}</div>
              <div style={{
                border: `0.5px solid ${T.glassBorder}`,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
              }}>
                {g.rows.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderTop: i === 0 ? 'none' : `0.5px solid ${T.glassBorder}`,
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.82)' }}>{r.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      {r.keys.map((k, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>+</span>}
                          <Kbd>{k}</Kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 14, fontSize: 11,
          color: 'rgba(255,255,255,0.38)', textAlign: 'center',
        }}>{t('shortcuts.hint')}</div>
      </Glass>
    </div>
  );
}

// ────────────── Settings ──────────────
function SettingsModal({ onClose, tweaks, tweak, resolvedTheme, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride, library }) {
  if (T.zodiac && window.ZodiacSettingsModal) {
    return <window.ZodiacSettingsModal onClose={onClose} tweaks={tweaks} tweak={tweak} resolvedTheme={resolvedTheme} updateCustom={updateCustom} selectCustom={selectCustom} addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot} updatePresetOverride={updatePresetOverride} library={library}/>;
  }
  // Cartographer (vintage) gate — parchment dialog wraps the host panes.
  if (T.cartographer && window.CartographerSettingsModal) {
    return <window.CartographerSettingsModal onClose={onClose} tweaks={tweaks} tweak={tweak} resolvedTheme={resolvedTheme} updateCustom={updateCustom} selectCustom={selectCustom} addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot} updatePresetOverride={updatePresetOverride} library={library}/>;
  }
  // Cartographer Modern gate — dark glass dialog wraps the host panes.
  if (T.cartographerModern && window.CartographerModernSettingsModal) {
    return <window.CartographerModernSettingsModal onClose={onClose} tweaks={tweaks} tweak={tweak} resolvedTheme={resolvedTheme} updateCustom={updateCustom} selectCustom={selectCustom} addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot} updatePresetOverride={updatePresetOverride} library={library}/>;
  }
  const [section, setSection] = React.useState('account');
  const lang = window.ElyI18N?.getLang?.() || 'en';
  const setLang = (code) => window.ElyI18N?.setLang?.(code);

  const sections = [
    { id: 'account',  label: t('settings.account'),       icon: <IUser/> },
    { id: 'notif',    label: t('settings.notifications'), icon: <IBell/> },
    { id: 'appear',   label: t('settings.appearance'),    icon: <ISparkle/> },
    { id: 'downloads', label: 'Downloads',                icon: <IDownload/> },
    { id: 'about',    label: t('settings.about'),         icon: <ICheck/> },
  ];

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,6,10,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glass(2, {
          width: section === 'appear' ? 920 : 780, maxWidth: '100%',
          height: section === 'appear' ? 640 : 560, maxHeight: '90vh',
          borderRadius: T.r.xl, padding: 0, display: 'flex', overflow: 'hidden',
          animation: 'slideUp .3s cubic-bezier(.2,.9,.3,1.15)',
          transition: 'width .25s ease, height .25s ease',
        }),
      }}>
        {/* Sidebar */}
        <div style={{ width: 220, padding: 20, borderRight: `0.5px solid ${T.glassBorder}`, background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ ...TY.h3, fontSize: 17 }}>{t('settings.title')}</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer' }}><IX size={16}/></button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(s => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: T.r.md,
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none', color: active ? T.text : T.text2,
                  fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {React.cloneElement(s.icon, { size: 15, color: active ? T.accentHi : 'currentColor' })}
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {section === 'account' && <AccountPane onAfterSignOut={onClose}/>}
          {section === 'notif' && <NotifPane/>}
          {section === 'downloads' && <DownloadsPane/>}
          {section === 'appear' && (
            <AppearancePane
              tweaks={tweaks}
              tweak={tweak}
              resolved={resolvedTheme}
              updateCustom={updateCustom}
              selectCustom={selectCustom}
              addCustomSlot={addCustomSlot}
              deleteCustomSlot={deleteCustomSlot}
              updatePresetOverride={updatePresetOverride}
              library={library}
              lang={lang}
              setLang={setLang}
            />
          )}
          {section === 'about' && (
            <div>
              <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>{t('settings.about')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                {window.SERVER?.iconUrl ? (
                  <img
                    src={window.SERVER.iconUrl}
                    alt={window.SERVER?.name || 'server'}
                    style={{
                      width: 48, height: 48, borderRadius: 12, objectFit: 'cover',
                      border: `0.5px solid ${T.glassBorder}`,
                    }}
                  />
                ) : (
                  <ILogo size={42}/>
                )}
                <div>
                  <div style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 16 }}>ElyHub</div>
                  <div style={{ ...TY.small, color: T.text3 }}>v0.1.0 · early access</div>
                </div>
              </div>
              <div style={{ ...TY.small, color: T.text3, lineHeight: 1.6 }}>
                Companion app for the {window.SERVER?.name || 'Ely'} Discord community — leaderboards,
                daily claims, aura gifts and reward redemptions, all synced live with the server.
              </div>
              <div style={{ ...TY.micro, color: T.text3, marginTop: 28, textAlign: 'center' }}>
                made with ♥ by the ely core team
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────── Appearance pane ──────────────
// Full theme customization. Presets grid at top, then (when "Custom" is
// active) the editor underneath: slot picker, accent hue bar, base-color
// picker, light points list with drag on preview + per-point sliders (X, Y,
// size, opacity, blur) + per-point color, bg image import, auto-contrast
// toggle. Everything writes through `updateCustom` which persists to
// localStorage and re-applies the theme live.

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

// Horizontal hue bar — click or drag to pick a pure hue (sat=1, lum=0.55).
// Outputs a hex through `onChange`. Small marker tracks the last-picked hue.
function HueBar({ value, onChange, height = 32 }) {
  const ref = React.useRef(null);
  const draggingRef = React.useRef(false);
  const [hue, setHue] = React.useState(() => {
    const c = parseHex(value) || { r: 1, g: 89, b: 231 };
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case c.r: h = ((c.g - c.b) / d) % 6; break;
        case c.g: h = (c.b - c.r) / d + 2; break;
        default:  h = (c.r - c.g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return h;
  });
  const pick = (clientX) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const h = pct * 360;
    setHue(h);
    const { r, g, b } = hslToRgb(h, 1, 0.55);
    onChange?.(rgbToHex(r, g, b));
  };
  return (
    <div
      ref={ref}
      onPointerDown={(e) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX); }}
      onPointerMove={(e) => { if (draggingRef.current) pick(e.clientX); }}
      onPointerUp={(e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
      style={{
        position: 'relative',
        height, width: '100%', borderRadius: 999,
        background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        border: `0.5px solid ${T.glassBorder}`,
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: -2, left: `calc(${(hue / 360) * 100}% - 7px)`,
        width: 14, height: height + 4, borderRadius: 7,
        background: 'rgba(255,255,255,0.98)',
        border: '2px solid rgba(0,0,0,0.25)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }}/>
    </div>
  );
}

// Native color input styled as a swatch. Browsers give us a rich picker for
// free — no need to rebuild saturation/lightness by hand.
function Swatch({ value, onChange, size = 28 }) {
  return (
    <label style={{
      display: 'inline-block', position: 'relative',
      width: size, height: size, borderRadius: '50%',
      background: value || '#000',
      boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.25), 0 1px 4px rgba(0,0,0,0.3)`,
      cursor: 'pointer', overflow: 'hidden',
      flexShrink: 0,
    }}>
      <input
        type="color"
        value={value || '#000000'}
        onInput={(e) => onChange?.(e.target.value)}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0,
        }}
      />
    </label>
  );
}

// Slider — stepper + clickable-track design. WKWebView under Tauri kept
// refusing drag events on both native <input type=range> and on custom
// pointer-captured divs inside this modal (possibly backdrop-filter related).
// So instead: −/+ buttons for fine control, and the track itself is a series
// of tick buttons that jump the value to whatever position you click. No
// dragging required, works 100% of the time because it's just buttons.
function Slider({ label, value, min, max, step, onChange, unit = '' }) {
  const v = typeof value === 'number' ? value : min;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const trackRef = React.useRef(null);
  const draggingRef = React.useRef(false);
  const [hover, setHover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const clamp = (n) => Math.max(min, Math.min(max, parseFloat(n.toFixed(6))));
  // Snap to `step` but also respect decimal precision to avoid FP noise.
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  const setFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + p * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange?.(clamp(parseFloat(snapped.toFixed(decimals + 2))));
  };

  // Global listeners while dragging so the thumb keeps following the cursor
  // even if it leaves the track's hitbox. WKWebView respects window-level
  // pointermove reliably, unlike setPointerCapture on nested elements.
  React.useEffect(() => {
    if (!dragging) return;
    const move = (e) => { if (draggingRef.current) setFromClientX(e.clientX); };
    const up = () => { draggingRef.current = false; setDragging(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const onDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    setFromClientX(e.clientX);
  };

  const active = hover || dragging;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ ...TY.micro, color: T.text3, fontSize: 10 }}>{label}</span>
        <span style={{ ...TY.mono, fontSize: 10, color: dragging ? T.accentHi : T.text2 }}>
          {v.toFixed(decimals)}{unit}
        </span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{
          position: 'relative', height: 22, cursor: dragging ? 'grabbing' : 'pointer',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        {/* rail */}
        <span style={{
          position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
          height: active ? 6 : 4, borderRadius: 999,
          background: 'rgba(255,255,255,0.10)',
          pointerEvents: 'none', display: 'block',
          transition: 'height .18s ease',
        }}/>
        {/* fill */}
        <span style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: `${pct * 100}%`, height: active ? 6 : 4, borderRadius: 999,
          background: T.accent,
          boxShadow: active ? `0 0 12px ${T.accentGlow}` : 'none',
          pointerEvents: 'none', display: 'block',
          transition: dragging ? 'height .18s ease' : 'width .08s linear, height .18s ease, box-shadow .18s ease',
        }}/>
        {/* thumb */}
        <span style={{
          position: 'absolute', left: `${pct * 100}%`, top: '50%',
          transform: `translate(-50%, -50%) scale(${active ? 1.15 : 1})`,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          boxShadow: active
            ? `0 0 0 2px ${T.accent}, 0 0 14px ${T.accentGlow}, 0 2px 8px rgba(0,0,0,0.5)`
            : `0 0 0 2px ${T.accent}, 0 2px 6px rgba(0,0,0,0.4)`,
          pointerEvents: 'none', display: 'block',
          transition: dragging
            ? 'transform .15s cubic-bezier(.2,.9,.3,1.15), box-shadow .18s ease'
            : 'left .08s linear, transform .15s cubic-bezier(.2,.9,.3,1.15), box-shadow .18s ease',
        }}/>
      </div>
    </div>
  );
}

// Draggable canvas preview — renders the resolved theme's orbs and lets the
// user drag any point to reposition it. Click empty space to add a new point.
// `zoom` controls a virtual viewport — zoom < 1 reveals points positioned
// outside the normal 0..100 range so you can actually grab them.
function ThemeCanvas({ resolved, updateCustom, selectedId, setSelectedId, editable, zoom = 1 }) {
  const boxRef = React.useRef(null);
  const dragRef = React.useRef(null); // { id, offX, offY }
  // Pad in %-space so (0,0)..(100,100) stays centered even when zoomed out.
  const pad = (1 - zoom) * 50; // at zoom 0.6 → 20% pad
  const vpToPct = (vpPct) => pad + vpPct * zoom; // map 0..100 of point-space to the visible viewport %
  const pctToVp = (pct) => (pct - pad) / zoom;

  const onDown = (e, p) => {
    if (!editable) return;
    e.stopPropagation();
    setSelectedId(p.id);
    const rect = boxRef.current.getBoundingClientRect();
    const px = rect.left + (vpToPct(p.x) / 100) * rect.width;
    const py = rect.top + (vpToPct(p.y) / 100) * rect.height;
    dragRef.current = { id: p.id, offX: e.clientX - px, offY: e.clientY - py };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = boxRef.current.getBoundingClientRect();
    const vpX = ((e.clientX - rect.left - d.offX) / rect.width) * 100;
    const vpY = ((e.clientY - rect.top - d.offY) / rect.height) * 100;
    const x = pctToVp(vpX);
    const y = pctToVp(vpY);
    const clampedX = Math.max(-50, Math.min(150, x));
    const clampedY = Math.max(-50, Math.min(150, y));
    updateCustom({
      points: resolved.points.map((pp) => pp.id === d.id ? { ...pp, x: Math.round(clampedX), y: Math.round(clampedY) } : pp),
    });
  };
  const onUp = () => { dragRef.current = null; };
  const onCanvasClick = (e) => {
    if (!editable) return;
    if (resolved.bgImage) return; // wallpaper mode — no light points
    if (dragRef.current) return; // swallow end-of-drag clicks
    // Only add if the click landed on the canvas itself, not a dot.
    if (e.target !== boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const vpX = ((e.clientX - rect.left) / rect.width) * 100;
    const vpY = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.round(pctToVp(vpX));
    const y = Math.round(pctToVp(vpY));
    const np = {
      id: 'p' + Date.now().toString(36),
      x, y, size: 28, color: resolved.accent || '#0159E7',
      alpha: 0.7, blur: 60, factor: 0.3, blend: 'screen',
    };
    updateCustom({ points: [...resolved.points, np] });
    setSelectedId(np.id);
  };

  return (
    <div
      ref={boxRef}
      onClick={onCanvasClick}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{
        position: 'relative', height: 220, width: '100%',
        borderRadius: T.r.md, overflow: 'hidden',
        background: resolved.bgImage ? '#0A0D1A' : resolved.base,
        border: `0.5px solid ${T.glassBorder}`,
        cursor: editable && !resolved.bgImage ? 'crosshair' : 'default',
      }}
    >
      {resolved.bgImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${resolved.bgImage}")`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: typeof resolved.bgOpacity === 'number' ? resolved.bgOpacity : 0.75,
          filter: resolved.bgBlur ? `blur(${Math.min(resolved.bgBlur, 40)}px)` : 'none',
          transform: resolved.bgBlur ? 'scale(1.05)' : 'none',
          pointerEvents: 'none',
        }}/>
      )}
      {resolved.bgImage && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(3,6,14,0.25), rgba(3,6,14,0.45))',
          pointerEvents: 'none',
        }}/>
      )}
      {!resolved.bgImage && resolved.points.map((p) => {
        const col = p.color || '#0159E7';
        const a = typeof p.alpha === 'number' ? p.alpha : 0.7;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: `${vpToPct(p.y)}%`, left: `${vpToPct(p.x)}%`,
              width: `${p.size * 1.6 * zoom}px`, height: `${p.size * 1.6 * zoom}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${withA(col, a)} 0%, ${withA(col, a * 0.4)} 35%, transparent 85%)`,
              filter: `blur(${Math.min(p.blur || 40, 40) * zoom}px)`,
              mixBlendMode: p.blend || 'normal',
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
      {/* Drag handles — small solid dots at each point's center. Overlaid
          above the blur so users can actually grab them. */}
      {editable && !resolved.bgImage && resolved.points.map((p) => {
        const active = selectedId === p.id;
        return (
          <div
            key={p.id + 'h'}
            onPointerDown={(e) => onDown(e, p)}
            style={{
              position: 'absolute', top: `${vpToPct(p.y)}%`, left: `${vpToPct(p.x)}%`,
              width: 16, height: 16, marginLeft: -8, marginTop: -8,
              borderRadius: '50%', background: p.color || '#0159E7',
              border: active ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.6)',
              boxShadow: active ? `0 0 0 3px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.5)` : '0 2px 6px rgba(0,0,0,0.4)',
              cursor: 'grab', touchAction: 'none', zIndex: 2,
            }}
          />
        );
      })}
      {/* Viewport border overlay — shows the "live" 0..100 area when zoomed out */}
      {editable && zoom < 0.99 && (
        <div style={{
          position: 'absolute',
          left: `${pad}%`, top: `${pad}%`,
          width: `${100 * zoom}%`, height: `${100 * zoom}%`,
          border: `1px dashed ${T.glassBorder2}`,
          pointerEvents: 'none', borderRadius: 4,
        }}/>
      )}
    </div>
  );
}

// Universal tile — renders a mini-preview of a theme config (preset or custom
// slot) with a centered label strip. Active tile gets the accent glow.
function ThemeTile({ config, label, active, onClick, accentColor, dim = false, locked = false, lockHint }) {
  const pts = (config?.points || []).slice(0, 5);
  const glow = accentColor || config?.accentHi || config?.accent || T.accent;
  // Premium themes get distinct "luxury" framing — sharp corners + persistent
  // accent border so they stand apart from every other tile at a glance.
  // Zodiac → gold leaf. Cartographer → wax-red ink frame on parchment.
  const isZodiac       = config?.unlock?.kassa === 'gleipnir';
  // Cartographer is free (no unlock.kassa) — match by name so it still
  // gets the wax-red premium framing without the lock gate.
  const isCartographer = config?.name === 'Cartographer';
  const isModern       = config?.name === 'Cartographer Modern';
  const isPremium      = isZodiac || isCartographer || isModern;
  const GOLD = '#C9A24E';
  const WAX  = '#8B2418';
  const FAIRWAY = '#9BD66B';
  const frame = isCartographer ? WAX : isModern ? FAIRWAY : GOLD;
  const frameRgba = isCartographer ? '139,36,24' : isModern ? '155,214,107' : '201,162,78';
  const radius = isPremium ? 0 : T.r.md;
  const border = isPremium
    ? (active ? `1.5px solid ${frame}` : `1px solid rgba(${frameRgba},0.55)`)
    : (active ? `1.5px solid ${glow}` : `0.5px solid ${T.glassBorder}`);
  const shadow = isPremium
    ? (active ? `0 0 22px rgba(${frameRgba},0.55), 0 0 6px rgba(${frameRgba},0.3)` : `0 0 8px rgba(${frameRgba},0.2)`)
    : (active ? `0 0 20px ${glow}80` : 'none');
  return (
    <button
      onClick={onClick}
      title={locked ? (lockHint || `${label} — locked`) : label}
      style={{
        padding: 0, borderRadius: radius, cursor: 'pointer',
        border, background: 'transparent', overflow: 'hidden',
        boxShadow: shadow,
        position: 'relative', display: 'flex', flexDirection: 'column',
        opacity: dim ? 0.85 : (locked ? 0.78 : 1),
      }}
    >
      <div style={{
        height: 64, position: 'relative', overflow: 'hidden',
        background: isCartographer
          ? 'linear-gradient(135deg, #EFE3C8 0%, #DECFAE 50%, #C9B791 100%)'
          : isModern
            ? 'linear-gradient(135deg, #0E1614 0%, #1A2A24 50%, #0E1614 100%)'
            : (isZodiac ? '#0A0805' : (config?.base || '#0A0D1A')),
      }}>
        {/* Cartographer also gets its bgImage in the tile preview — the
            wallpaper IS the theme's identity. We render it *under* the
            MCompass below so the rosa-dos-ventos sits on the parchment map. */}
        {config?.bgImage && (!isPremium || isCartographer) && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url("${config.bgImage}")`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: isCartographer ? 0.85 : (typeof config.bgOpacity === 'number' ? config.bgOpacity : 0.9),
          }}/>
        )}
        {/* Premium tile signatures: Zodiac → starburst centered.
            Cartographer → MCompass (pinned to bottom-right, partially clipped
            so the rosa-dos-ventos reads as a bleed motif on the parchment). */}
        {isCartographer ? (
          <div style={{
            position: 'absolute', right: -8, bottom: -8, opacity: 0.55, pointerEvents: 'none',
          }}>
            {window.MCompass
              ? React.createElement(window.MCompass, { size: 72, wax: false })
              : <span style={{ color: WAX, fontSize: 28, lineHeight: 1 }}>✦</span>}
          </div>
        ) : isModern ? (
          <>
            {/* Topographic isolines + center pin */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}
                 viewBox="0 0 256 64" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="#3B5A40" strokeWidth="0.5">
                <path d="M-10 18 Q60 8 120 22 T270 18"/>
                <path d="M-10 32 Q60 22 120 36 T270 32"/>
                <path d="M-10 46 Q60 36 120 50 T270 46"/>
              </g>
            </svg>
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%,-50%) rotate(-45deg)',
              width: 26, height: 26, borderRadius: '50% 50% 50% 0',
              background: FAIRWAY,
              boxShadow: `0 0 14px ${FAIRWAY}88`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                transform: 'rotate(45deg)',
                fontFamily: '"JetBrains Mono",monospace', fontSize: 11, fontWeight: 700,
                color: '#0E1614',
              }}>1</span>
            </div>
          </>
        ) : isZodiac ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            {window.ZStarburst
              ? React.createElement(window.ZStarburst, { size: 72, color: GOLD, sw: 0.5, points: 14 })
              : <span style={{ color: GOLD, fontSize: 28, lineHeight: 1 }}>✦</span>}
          </div>
        ) : pts.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${p.y}%`, left: `${p.x}%`,
            width: `${Math.max(p.size, 20) * 1.1}px`, height: `${Math.max(p.size, 20) * 1.1}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withA(p.color, 0.7)} 0%, transparent 65%)`,
            filter: 'blur(10px)',
            mixBlendMode: p.blend || 'normal',
            transform: 'translate(-50%, -50%)',
          }}/>
        ))}
        {(config?.unlock?.kassa || isCartographer) && (
          <>
            <span style={{
              position: 'absolute', top: 6, right: 8,
              color: frame, fontSize: 11, lineHeight: 1,
              filter: `drop-shadow(0 0 4px ${frame}99)`,
              pointerEvents: 'none',
            }}>✦</span>
          </>
        )}
      </div>
      <div style={{
        padding: '7px 6px', fontSize: 11, fontWeight: 500,
        color: active ? T.text : T.text2,
        background: 'rgba(0,0,0,0.4)', textAlign: 'center',
        fontFamily: T.fontSans,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
      {/* Lock chip — solid backdrop + gold padlock. Sits over the preview so
          users see the theme is locked without clicking. The wrapper button
          still receives the click; AppearancePane decides what to do (open
          the unlock listing instead of switching themes). */}
      {locked && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(8,4,18,0.45) 0%, rgba(8,4,18,0.65) 100%)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            border: `1px solid ${withA(glow, 0.55)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: glow, fontSize: 14,
            boxShadow: `0 0 14px ${withA(glow, 0.45)}`,
          }} aria-hidden>
            {/* Inline padlock — keep glyph-free for fontless platforms */}
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M2 6 V4.2 a4 4 0 0 1 8 0 V6" stroke={glow} strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="1.2" y="6" width="9.6" height="7" rx="1.6"
                    fill="rgba(0,0,0,0.4)" stroke={glow} strokeWidth="1.2"/>
              <circle cx="6" cy="9.4" r="0.9" fill={glow}/>
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

// "+" tile — adds a new custom slot and activates it.
function AddThemeTile({ onClick }) {
  return (
    <button onClick={onClick} title="Create a new custom theme" style={{
      padding: 0, borderRadius: T.r.md, cursor: 'pointer',
      border: `1px dashed ${T.glassBorder2}`,
      background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.text3, fontSize: 22, fontWeight: 300, fontFamily: T.fontSans,
      }}>+</div>
      <div style={{
        padding: '7px 6px', fontSize: 11, fontWeight: 500,
        color: T.text3, background: 'rgba(0,0,0,0.3)', textAlign: 'center',
        fontFamily: T.fontSans,
      }}>New</div>
    </button>
  );
}

function AppearancePane({ tweaks, tweak, resolved, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride, library, lang, setLang }) {
  const currentTheme = tweaks?.theme || 'nocturne';
  const isCustom = currentTheme === 'custom';
  const isWallpaperPreset = !!WALLPAPER_PRESETS[currentTheme];
  // Resolve which presets are unlocked based on the user's library. A preset
  // declares its gate via `unlock.kassa = '<product_id>'`; we map library
  // entries → listings → kassa_product_id and check membership. No gate set =
  // freely available. Using a Set so we can extend later (multi-product unlocks).
  const ownedKassaProducts = React.useMemo(() => {
    const set = new Set();
    const listings = window.LISTINGS || [];
    for (const it of (library?.items || [])) {
      if (it.status !== 'active') continue;
      const l = listings.find((x) => x.id === it.listingId);
      const pid = l?.kassa_product_id || l?.kassaProductId;
      if (pid) set.add(pid);
    }
    return set;
  }, [library?.items]);
  const isPresetLocked = (preset) => {
    const need = preset?.unlock?.kassa;
    if (!need) return false;
    if (ownedKassaProducts.has(need)) return false;
    // Dev override — localStorage.ely:dev:stub-<product> = '1' bypasses the
    // gate entirely. Lets us test premium themes without wiring a real
    // listing+library round-trip. Per-product so each can be toggled
    // independently. Reads localStorage directly (not state) so the answer
    // is fresh on every render — no reload needed after flipping the flag.
    try {
      if (localStorage.getItem(`ely:dev:stub-${need}`) === '1') return false;
    } catch {}
    return true;
  };
  // When a locked tile is tapped, route to the unlock listing instead of
  // switching the theme (which would silently fail anyway since resolveTheme
  // just falls back to nocturne for unknown keys, but we'd rather make the
  // intent explicit).
  const handlePresetClick = (key, preset) => {
    if (isPresetLocked(preset)) {
      const need = preset.unlock.kassa;
      const listing = (window.LISTINGS || []).find(
        (x) => (x.kassa_product_id || x.kassaProductId) === need,
      );
      try {
        ElyNotify?.toast?.({
          text: listing
            ? `${preset.name} unlocks with ${listing.title}`
            : `${preset.name} requires a premium plugin`,
          kind: 'info',
        });
      } catch {}
      return;
    }
    tweak('theme', key);
  };
  const [selectedPointId, setSelectedPointId] = React.useState(resolved?.points?.[0]?.id || null);
  const [zoom, setZoom] = React.useState(1);
  // Active slot (for rename / tile highlight). Slots live inside tweaks.customSlots.
  const activeSlot = isCustom ? (tweaks.customSlots || []).find((s) => s.id === tweaks.activeCustomId) : null;

  React.useEffect(() => {
    // Keep the selected point valid when points change out from under us.
    if (!resolved?.points?.some((p) => p.id === selectedPointId)) {
      setSelectedPointId(resolved?.points?.[0]?.id || null);
    }
  }, [resolved?.points, selectedPointId]);

  const selectedPoint = resolved?.points?.find((p) => p.id === selectedPointId) || null;

  const patchPoint = (id, patch) => {
    updateCustom({ points: resolved.points.map((p) => p.id === id ? { ...p, ...patch } : p) });
  };
  const removePoint = (id) => {
    updateCustom({ points: resolved.points.filter((p) => p.id !== id) });
  };
  const onImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateCustom({ bgImage: typeof reader.result === 'string' ? reader.result : null });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h3 style={{ ...TY.h3, margin: '0 0 16px' }}>{t('settings.appearance')}</h3>

      {/* Theme tile grid — presets on the left, each custom slot as its own
          tile, then a "+" tile to spin up a new custom slot. Single source of
          truth for theme switching; no separate pill strip. */}
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('settings.theme') || 'Theme'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {Object.entries(THEME_PRESETS).map(([key, p]) => {
          const locked = isPresetLocked(p);
          return (
            <ThemeTile
              key={key}
              config={p}
              label={p.name}
              active={currentTheme === key}
              accentColor={p.accentHi}
              locked={locked}
              lockHint={locked ? `Unlocks with Hugin` : undefined}
              onClick={() => handlePresetClick(key, p)}
            />
          );
        })}
        {Object.entries(WALLPAPER_PRESETS).map(([key, p]) => (
          <ThemeTile
            key={key}
            config={p}
            label={p.name}
            active={currentTheme === key}
            accentColor={p.accentHi}
            onClick={() => tweak('theme', key)}
          />
        ))}
        {(tweaks.customSlots || []).map((s) => {
          const active = isCustom && s.id === tweaks.activeCustomId;
          return (
            <ThemeTile
              key={s.id}
              config={s}
              label={s.name || 'Custom'}
              active={active}
              accentColor={s.accentHi || s.accent || T.accent}
              onClick={() => { tweak('theme', 'custom'); selectCustom(s.id); }}
            />
          );
        })}
        <AddThemeTile onClick={() => { tweak('theme', 'custom'); addCustomSlot(); }}/>
      </div>

      {/* Wallpaper preset controls — lets users tweak opacity/blur on the
          built-in wallpaper themes without forking into a custom slot. */}
      {isWallpaperPreset && (
        <div style={{
          padding: 14, borderRadius: T.r.md, marginBottom: 20,
          background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...TY.micro, color: T.text3 }}>Wallpaper · {WALLPAPER_PRESETS[currentTheme].name}</div>
            <button
              onClick={() => updatePresetOverride(currentTheme, { bgOpacity: undefined, bgBlur: undefined })}
              style={{
                background: 'transparent', border: 'none', color: T.text3,
                fontFamily: T.fontSans, fontSize: 11, cursor: 'pointer', padding: 0,
              }}
              title="Reset to preset defaults"
            >Reset</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Slider
              label="Opacity"
              value={typeof resolved.bgOpacity === 'number' ? resolved.bgOpacity : 0.88}
              min={0.1} max={1} step={0.01}
              onChange={(v) => updatePresetOverride(currentTheme, { bgOpacity: v })}
            />
            <Slider
              label="Blur"
              value={typeof resolved.bgBlur === 'number' ? resolved.bgBlur : 0}
              min={0} max={60} step={1}
              onChange={(v) => updatePresetOverride(currentTheme, { bgBlur: v })}
              unit="px"
            />
          </div>
        </div>
      )}

      {/* Custom editor */}
      {isCustom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Slot header — rename + delete the active slot inline */}
          {activeSlot && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: T.r.md,
              background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
            }}>
              <div style={{ ...TY.micro, color: T.text3, fontSize: 10 }}>EDITING</div>
              <input
                type="text"
                value={activeSlot.name || ''}
                onChange={(e) => updateCustom({ name: e.target.value })}
                placeholder="Theme name"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: T.text, fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, padding: 0,
                }}
              />
              {(tweaks.customSlots || []).length > 1 && (
                <button onClick={() => deleteCustomSlot(activeSlot.id)} style={{
                  padding: '5px 10px', borderRadius: T.r.sm,
                  background: 'transparent', border: `0.5px solid ${T.glassBorder2}`,
                  color: T.red, fontSize: 11, fontFamily: T.fontSans, fontWeight: 500, cursor: 'pointer',
                }}>Delete</button>
              )}
            </div>
          )}

          {/* Live preview with zoom controls */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
              <div style={{ ...TY.micro, color: T.text3 }}>Preview — click to add, drag to move</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))} title="Zoom out" style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, fontFamily: T.fontSans, fontSize: 14, lineHeight: 1, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>−</button>
                <div style={{ ...TY.mono, fontSize: 11, color: T.text2, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
                <button onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))} title="Zoom in" style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, fontFamily: T.fontSans, fontSize: 14, lineHeight: 1, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>+</button>
                <button onClick={() => setZoom(1)} title="Reset zoom" style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text3, fontSize: 10, fontFamily: T.fontSans, cursor: 'pointer', marginLeft: 4,
                }}>reset</button>
              </div>
            </div>
            <ThemeCanvas
              resolved={resolved}
              updateCustom={updateCustom}
              selectedId={selectedPointId}
              setSelectedId={setSelectedPointId}
              editable
              zoom={zoom}
            />
          </div>

          {/* Colors row — accent hue + base color side-by-side, no inline file upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 8 }}>Accent hue</div>
              <HueBar value={resolved.accent} onChange={(hex) => updateCustom({ accent: hex, accentHi: hex })}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Swatch value={resolved.accent} onChange={(hex) => updateCustom({ accent: hex })}/>
                <span style={{ ...TY.mono, fontSize: 11, color: T.text2 }}>{resolved.accent}</span>
              </div>
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 8 }}>Base vignette</div>
              <HueBar value={(resolved.base || '').match(/#[0-9a-f]{6}/i)?.[0] || '#03082A'} onChange={(hex) => {
                // Keep it as a radial gradient — single flat bg looks lifeless.
                updateCustom({ base: `radial-gradient(ellipse at 30% 0%, ${hex} 0%, ${hex} 42%, #01030A 100%)` });
              }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Swatch value={(resolved.base || '').match(/#[0-9a-f]{6}/i)?.[0] || '#03082A'} onChange={(hex) => {
                  updateCustom({ base: `radial-gradient(ellipse at 30% 0%, ${hex} 0%, ${hex} 42%, #01030A 100%)` });
                }}/>
                <span style={{ ...TY.mono, fontSize: 11, color: T.text2 }}>{(resolved.base || '').match(/#[0-9a-f]{6}/i)?.[0] || '#03082A'}</span>
              </div>
            </div>
          </div>

          {/* Background image — standalone row, glass card */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px', borderRadius: T.r.md,
            background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {resolved.bgImage ? (
                <div style={{
                  width: 44, height: 44, borderRadius: T.r.sm, flexShrink: 0,
                  background: `url("${resolved.bgImage}") center/cover`,
                  border: `0.5px solid ${T.glassBorder2}`,
                }}/>
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: T.r.sm, flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', border: `0.5px dashed ${T.glassBorder2}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: T.text3, fontSize: 18,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <circle cx="9" cy="10" r="2"/>
                    <path d="m3 18 6-6 5 5 3-3 4 4"/>
                  </svg>
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...TY.body, color: T.text, fontSize: 13, fontWeight: 500 }}>Background image</div>
                <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{resolved.bgImage ? 'Image set · layered under your light points' : 'Optional — overrides the base vignette'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <label style={{
                padding: '7px 12px', borderRadius: T.r.sm,
                background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder2}`,
                color: T.text2, fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                {resolved.bgImage ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" onChange={onImageUpload} style={{ display: 'none' }}/>
              </label>
              {resolved.bgImage && (
                <button onClick={() => updateCustom({ bgImage: null })} style={{
                  padding: '7px 12px', borderRadius: T.r.sm,
                  background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text3, fontFamily: T.fontSans, fontSize: 12, cursor: 'pointer',
                }}>Remove</button>
              )}
            </div>
          </div>

          {/* Auto contrast toggle — custom switch to avoid the native
              checkbox square (which WKWebView paints with a hard fill). */}
          {(() => {
            const on = resolved.autoContrast !== false;
            return (
              <button
                type="button"
                onClick={() => updateCustom({ autoContrast: !on })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 14px', borderRadius: T.r.md,
                  background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ ...TY.body, color: T.text, fontSize: 13, fontWeight: 500 }}>Auto contrast</div>
                  <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>Darkens the card backing so text stays legible on bright backgrounds.</div>
                </div>
                <div style={{
                  width: 36, height: 20, borderRadius: 999, padding: 2,
                  background: on ? T.accent : 'rgba(255,255,255,0.12)',
                  transition: 'background .15s', flexShrink: 0,
                  boxShadow: on ? `0 0 10px ${T.accent}55` : 'none',
                  display: 'flex', alignItems: 'center',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff',
                    transform: on ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform .15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}/>
                </div>
              </button>
            );
          })()}

          {/* Wallpaper-mode controls: opacity + blur for the bg image. Only
              shown when an image is set; in this mode we hide the light-point
              editor entirely — user asked for a clean photo wallpaper. */}
          {resolved.bgImage && (
            <div style={{
              padding: 14, borderRadius: T.r.md,
              background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ ...TY.micro, color: T.text3 }}>Wallpaper</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Slider
                  label="Opacity"
                  value={typeof resolved.bgOpacity === 'number' ? resolved.bgOpacity : 0.75}
                  min={0.1} max={1} step={0.01}
                  onChange={(v) => updateCustom({ bgOpacity: v })}
                />
                <Slider
                  label="Blur"
                  value={typeof resolved.bgBlur === 'number' ? resolved.bgBlur : 0}
                  min={0} max={60} step={1}
                  onChange={(v) => updateCustom({ bgBlur: v })}
                  unit="px"
                />
              </div>
            </div>
          )}

          {/* Points palette — hidden in wallpaper mode */}
          {!resolved.bgImage && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...TY.micro, color: T.text3 }}>Light points · {resolved.points.length}</div>
              <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>Click any dot to change its color</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {resolved.points.map((p) => {
                const active = p.id === selectedPointId;
                // Wrapper div clips the native color input into a perfect
                // circle — WKWebView ignores border-radius on <input type=color>
                // itself. The invisible input fills the wrapper for clicks.
                return (
                  <label
                    key={p.id}
                    onClick={() => setSelectedPointId(p.id)}
                    title="Click to change color"
                    style={{
                      position: 'relative', display: 'inline-block',
                      width: 32, height: 32, borderRadius: '50%',
                      background: p.color || '#0159E7',
                      cursor: 'pointer', overflow: 'hidden',
                      boxShadow: active
                        ? `0 0 0 2px ${T.bg}, 0 0 0 4px ${T.accentHi}, 0 2px 8px rgba(0,0,0,0.35)`
                        : `inset 0 0 0 1.5px rgba(255,255,255,0.25), 0 1px 4px rgba(0,0,0,0.3)`,
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="color"
                      value={p.color || '#0159E7'}
                      onInput={(e) => patchPoint(p.id, { color: e.target.value })}
                      onChange={(e) => patchPoint(p.id, { color: e.target.value })}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0,
                      }}
                    />
                  </label>
                );
              })}
              <button onClick={() => {
                const np = {
                  id: 'p' + Date.now().toString(36),
                  x: 50, y: 50, size: 30, color: resolved.accent,
                  alpha: 0.7, blur: 60, factor: 0.3, blend: 'screen',
                };
                updateCustom({ points: [...resolved.points, np] });
                setSelectedPointId(np.id);
              }} title="Add a new light point" style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'transparent', border: `1px dashed ${T.glassBorder2}`,
                color: T.text3, cursor: 'pointer', fontSize: 15, lineHeight: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, padding: 0,
              }}>+</button>
            </div>
          </div>
          )}

          {/* Selected point editor — now with explicit "Color" heading, larger
              swatch, and grouped sliders for clarity. */}
          {!resolved.bgImage && selectedPoint && (
            <div style={{
              padding: 14, borderRadius: T.r.md,
              background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Swatch value={selectedPoint.color} onChange={(hex) => patchPoint(selectedPoint.id, { color: hex })} size={36}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TY.body, color: T.text, fontSize: 13, fontWeight: 600 }}>Editing light point</div>
                  <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>Drag on preview or use sliders below</div>
                </div>
                <button onClick={() => removePoint(selectedPoint.id)} style={{
                  padding: '6px 12px', borderRadius: T.r.sm,
                  background: 'transparent', border: `0.5px solid ${T.glassBorder2}`,
                  color: T.red, fontSize: 11, fontFamily: T.fontSans, fontWeight: 500, cursor: 'pointer',
                }}>Delete</button>
              </div>
              {/* Position row */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6, fontSize: 10 }}>Position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Slider label="X"   value={selectedPoint.x} min={-30} max={120} step={1} onChange={(v) => patchPoint(selectedPoint.id, { x: v })} unit="%"/>
                  <Slider label="Y"   value={selectedPoint.y} min={-30} max={120} step={1} onChange={(v) => patchPoint(selectedPoint.id, { y: v })} unit="%"/>
                </div>
              </div>
              {/* Shape row */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6, fontSize: 10 }}>Shape</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Slider label="Size" value={selectedPoint.size} min={4} max={120} step={1} onChange={(v) => patchPoint(selectedPoint.id, { size: v })} unit="vw"/>
                  <Slider label="Blur" value={selectedPoint.blur} min={0} max={200} step={1} onChange={(v) => patchPoint(selectedPoint.id, { blur: v })} unit="px"/>
                </div>
              </div>
              {/* Light row */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6, fontSize: 10 }}>Light</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Slider label="Opacity"  value={selectedPoint.alpha}  min={0} max={1} step={0.05} onChange={(v) => patchPoint(selectedPoint.id, { alpha: v })}/>
                  <Slider label="Parallax" value={selectedPoint.factor} min={0} max={1} step={0.05} onChange={(v) => patchPoint(selectedPoint.id, { factor: v })}/>
                </div>
              </div>
              {/* Blend mode */}
              <div>
                <div style={{ ...TY.micro, color: T.text3, marginBottom: 6, fontSize: 10 }}>Blend mode</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['normal','screen','overlay','soft-light','lighten'].map((b) => {
                    const on = (selectedPoint.blend || 'normal') === b;
                    return (
                      <button key={b} onClick={() => patchPoint(selectedPoint.id, { blend: b })} style={{
                        padding: '5px 10px', borderRadius: 999,
                        background: on ? `${T.accent}33` : 'rgba(255,255,255,0.04)',
                        border: `0.5px solid ${on ? T.accent + '88' : T.glassBorder}`,
                        color: on ? T.accentHi : T.text2,
                        fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      }}>{b}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Language picker — moved to the bottom so the editor gets the spotlight */}
      <div style={{ marginTop: 22 }}>
        <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('settings.language')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{v:'en',l:'English'},{v:'pt',l:'Português'}].map((o) => (
            <button key={o.v} onClick={() => setLang(o.v)} style={{
              flex: 1, padding: '12px', borderRadius: T.r.md,
              background: lang === o.v ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
              border: `0.5px solid ${lang === o.v ? T.accent + '88' : T.glassBorder}`,
              color: lang === o.v ? T.accentHi : T.text2,
              fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>{o.l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Notifications settings pane. Reads/writes directly against window.ElyNotify
// so prefs stay in sync across tabs/reloads via localStorage. Subscribing is
// what lets e.g. flipping Push off elsewhere immediately reflect here.
function NotifPane() {
  const N = window.ElyNotify;
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => N?.subscribe?.(force), []);
  if (!N) {
    return (
      <div>
        <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>{t('settings.notifications')}</h3>
        <div style={{ ...TY.small, color: T.text3 }}>Notification module failed to load.</div>
      </div>
    );
  }
  const p = N.prefs;
  const set = (k) => (v) => N.setPref(k, v);
  const pushBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';
  return (
    <div>
      <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>{t('settings.notifications')}</h3>
      <Toggle
        label="Push notifications"
        sub={pushBlocked ? 'Blocked — allow notifications in system settings' : 'Desktop alerts for new events'}
        value={p.push && !pushBlocked}
        onChange={set('push')}
      />
      <Toggle
        label="Sound effects"
        sub="Play a chime on incoming aura events"
        value={p.sound}
        onChange={set('sound')}
      />
      <div style={{ ...TY.micro, color: T.text3, margin: '24px 0 10px' }}>EVENT TYPES</div>
      <Toggle label="Aura gifts" value={p.gifts} onChange={set('gifts')}/>
      <Toggle label="New drops & rewards" value={p.drops} onChange={set('drops')}/>
      <Toggle label="Leaderboard changes" sub="When you move up or down" value={p.ranking} onChange={set('ranking')}/>
    </div>
  );
}

// Downloads pane — lets the user pick a default save folder. The save dialog
// itself still goes through WebKit (no Tauri filesystem write yet), so this is
// effectively a hint: the dialog defaults here, and the post-download "Show in
// Finder" / "Open Folder" buttons reveal in this directory. We can wire actual
// disk writes once the Rust download path is in.
function DownloadsPane() {
  const KEY = 'elyhub.downloadDir';
  const [dir, setDir] = React.useState(() => {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
  });
  const [resolving, setResolving] = React.useState(false);

  // First mount: if no preference, resolve the OS default (~/Downloads) for
  // display. We don't persist this — only an explicit pick writes localStorage.
  const [defaultDir, setDefaultDir] = React.useState('');
  React.useEffect(() => {
    const inv = window.__TAURI__?.core?.invoke;
    if (!inv) return;
    inv('default_download_dir').then((p) => setDefaultDir(p || ''));
  }, []);

  const effective = dir || defaultDir;

  const pick = async () => {
    const inv = window.__TAURI__?.core?.invoke;
    if (!inv) {
      try { ElyNotify?.toast?.({ text: 'Folder picker only works in the desktop app', kind: 'warn' }); } catch {}
      return;
    }
    setResolving(true);
    try {
      const chosen = await inv('pick_directory', { defaultPath: effective || null });
      if (chosen) {
        setDir(chosen);
        try { localStorage.setItem(KEY, chosen); } catch {}
        try { window.dispatchEvent(new Event('elyhub:download-dir-changed')); } catch {}
      }
    } catch (e) {
      try { ElyNotify?.toast?.({ text: `Picker failed: ${e?.message || e}`, kind: 'warn' }); } catch {}
    } finally {
      setResolving(false);
    }
  };

  const reset = () => {
    setDir('');
    try { localStorage.removeItem(KEY); } catch {}
    try { window.dispatchEvent(new Event('elyhub:download-dir-changed')); } catch {}
  };

  const reveal = () => {
    const inv = window.__TAURI__?.core?.invoke;
    if (inv && effective) inv('open_path', { path: effective }).catch(() => {});
  };

  return (
    <div>
      <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>Downloads</h3>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>SAVE FOLDER</div>
      <div style={{
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: `0.5px solid ${T.glassBorder}`,
        borderRadius: T.r.md,
        ...TY.body, color: T.text2, fontSize: 13,
        wordBreak: 'break-all', marginBottom: 4,
        fontFamily: T.fontMono || 'ui-monospace, monospace',
      }}>
        {effective || '(no default — using browser default)'}
      </div>
      <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginBottom: 14 }}>
        {dir
          ? 'Custom folder. The save dialog will default here.'
          : 'Using your OS default — pick a folder to override.'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={pick} disabled={resolving} style={{
          padding: '9px 16px', borderRadius: T.r.pill, border: 'none',
          background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
          color: '#fff', cursor: resolving ? 'progress' : 'pointer',
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          opacity: resolving ? 0.8 : 1,
        }}>
          {resolving ? 'Opening picker…' : 'Choose folder…'}
        </button>
        {effective && (
          <button onClick={reveal} style={{
            padding: '9px 16px', borderRadius: T.r.pill,
            background: 'rgba(255,255,255,0.06)',
            color: T.text, border: `0.5px solid ${T.glassBorder}`,
            cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          }}>Open in Finder</button>
        )}
        {dir && (
          <button onClick={reset} style={{
            padding: '9px 16px', borderRadius: T.r.pill,
            background: 'transparent',
            color: T.text3, border: `0.5px solid ${T.glassBorder}`,
            cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          }}>Reset to default</button>
        )}
      </div>
      <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 24, lineHeight: 1.6 }}>
        <strong style={{ color: T.text2 }}>Note —</strong> WebKit's save dialog still
        asks where to save each file. This setting controls where it points to
        first, and where “Show in Finder” / “Open Folder” jump to after a
        download finishes. Direct-to-disk saving lands in a future update.
      </div>
    </div>
  );
}

function Field({ label, value, readOnly, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...TY.micro, color: T.text3, marginBottom: 6 }}>{label}</div>
      <input
        value={value || ''}
        readOnly={!!readOnly}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={{
          width: '100%', padding: '10px 14px',
          background: readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
          border: `0.5px solid ${T.glassBorder}`,
          borderRadius: T.r.md,
          color: readOnly ? T.text3 : T.text,
          fontFamily: T.fontSans, fontSize: 13,
          outline: 'none', boxSizing: 'border-box',
          cursor: readOnly ? 'default' : 'text',
        }}/>
    </div>
  );
}

// Account pane — real backend wiring.
//
// What's live vs. derived vs. local-only:
//   Live (from Discord via window.ElyAuth.getCurrentUser()):
//     - avatar, display name, username/tag (read-only — edit them on Discord)
//   Derived from the browser:
//     - timezone (Intl.DateTimeFormat().resolvedOptions().timeZone — read-only)
//   Local-only (localStorage, never leaves this device):
//     - bio (free-text note for the user; we don't have a `bio` column anywhere)
//
// Actions wired to real flows:
//   - "Change" on the avatar card → opens Discord profile settings in a browser
//     (they edit it there, our verifyCurrentToken picks up the change next boot)
//   - "Sign in with Discord" (if signed out) → ElyAuth.signIn()
//   - "Disconnect Discord" → ElyAuth.signOut() after a confirmation modal
//
// What we intentionally don't offer:
//   - "Delete account" — the bot's xp rows are the "account" and only the bot
//     can delete them. Surfacing a button here that does nothing is worse than
//     not having one. Users who want data removed can DM the admin.
const BIO_KEY = 'elyhub.bio.v1';

function AccountPane({ onAfterSignOut }) {
  const authUser = window.ElyAuth?.getCurrentUser?.() || null;
  const signedIn = !!authUser;
  const me = window.ME || {};

  const [bio, setBio] = React.useState(() => {
    try { return localStorage.getItem(BIO_KEY) || ''; } catch { return ''; }
  });
  const [bioSaved, setBioSaved] = React.useState(false);
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);
  const [signingIn, setSigningIn] = React.useState(false);

  // Debounced save — every edit pushes to localStorage after 400ms of quiet.
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(BIO_KEY, bio);
        // Broadcast so ProfileView (and anything else watching) picks up the
        // new bio instantly. localStorage 'storage' event only fires across
        // tabs, not within the same tab — so we dispatch our own.
        window.dispatchEvent(new CustomEvent('ely:bio-changed'));
        setBioSaved(true);
      } catch {}
      const t2 = setTimeout(() => setBioSaved(false), 1200);
      return () => clearTimeout(t2);
    }, 400);
    return () => clearTimeout(id);
  }, [bio]);

  const tz = React.useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '—'; } catch { return '—'; }
  }, []);

  async function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    try { await window.ElyAuth?.signIn?.(); } finally { setSigningIn(false); }
  }

  function handleConfirmSignOut() {
    window.ElyAuth?.signOut?.();
    setConfirmSignOut(false);
    onAfterSignOut?.();
  }

  function openDiscordProfile() {
    // Opens the system browser via Tauri when available, falls back to window.open.
    const url = 'https://discord.com/channels/@me';
    try {
      if (window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('open_url', { url });
        return;
      }
    } catch {}
    window.open(url, '_blank');
  }

  if (!signedIn) {
    return (
      <div>
        <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>{t('settings.account')}</h3>
        <div style={{
          padding: 20, background: 'rgba(255,255,255,0.04)',
          borderRadius: T.r.md, border: `0.5px solid ${T.glassBorder}`,
          textAlign: 'center',
        }}>
          <div style={{ ...TY.body, color: T.text2, marginBottom: 6 }}>{t('settings.signIn')}</div>
          <div style={{ ...TY.small, color: T.text3, marginBottom: 18 }}>{t('settings.signInSub')}</div>
          <Btn variant="primary" size="sm" onClick={handleSignIn} disabled={signingIn}>
            {signingIn ? t('top.signingIn') : t('top.signin')}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ ...TY.h3, margin: '0 0 20px' }}>{t('settings.account')}</h3>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: 16, background: 'rgba(255,255,255,0.04)',
        borderRadius: T.r.md, border: `0.5px solid ${T.glassBorder}`, marginBottom: 20,
      }}>
        <Avatar name={me.name || authUser.globalName} src={me.avatar || authUser.avatarUrl} size={52} ring/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TY.body, color: T.text, fontWeight: 500 }}>
            {me.name || authUser.globalName}
          </div>
          <div style={{ ...TY.small, color: T.text3 }}>
            Discord · @{me.tag || authUser.username}
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={openDiscordProfile}>
          {t('settings.changeAvatar')}
        </Btn>
      </div>

      <Field label={t('settings.displayName')} value={me.name || authUser.globalName} readOnly/>

      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 6,
        }}>
          <div style={{ ...TY.micro, color: T.text3 }}>{t('settings.bio')}</div>
          {bioSaved && (
            <div style={{ ...TY.micro, color: T.accentHi, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ICheck size={10}/> {t('settings.saved')}
            </div>
          )}
        </div>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 140))}
          maxLength={140}
          style={{
            width: '100%', padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
            borderRadius: T.r.md, color: T.text, fontFamily: T.fontSans, fontSize: 13,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <Field label={t('settings.timezone')} value={tz} readOnly/>

      <div style={{ marginTop: 24 }}>
        <Btn variant="secondary" size="sm" onClick={() => setConfirmSignOut(true)}>
          <ILogOut size={14}/> {t('settings.disconnect')}
        </Btn>
      </div>

      {confirmSignOut && (
        <div onClick={() => setConfirmSignOut(false)} style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(5,6,10,0.7)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'fadeIn .15s',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            ...glass(2, { padding: 24, width: 360, maxWidth: '100%', borderRadius: T.r.lg,
              animation: 'slideUp .2s cubic-bezier(.2,.9,.3,1.1)',
            }),
          }}>
            <div style={{ ...TY.h3, margin: '0 0 8px' }}>{t('settings.discSignOutTitle')}</div>
            <div style={{ ...TY.small, color: T.text3, marginBottom: 20 }}>
              {t('settings.discSignOutSub')}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmSignOut(false)}>
                {t('settings.cancel')}
              </Btn>
              <Btn variant="primary" size="sm" onClick={handleConfirmSignOut}>
                {t('settings.discSignOutOk')}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, sub, value, onChange }) {
  // Zodiac variant — squared switch with a sliding gold token instead of the
  // pill+circle. The label/divider style differs too so the section reads as
  // engraved rather than glass.
  if (T.zodiac) {
    const Z = window.Z, ZTY = window.ZTY;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '14px 0', borderBottom: `1px solid ${Z.hair}`,
      }}>
        <div>
          <div style={{ ...ZTY.body, color: Z.parch, fontStyle: 'italic', fontSize: 15 }}>{label}</div>
          {sub && <div style={{ ...ZTY.small, color: Z.text3, fontStyle: 'italic', marginTop: 2 }}>{sub}</div>}
        </div>
        <button onClick={() => onChange(!value)} aria-pressed={value} style={{
          width: 46, height: 22, position: 'relative', cursor: 'pointer', padding: 0,
          background: value ? `linear-gradient(180deg, ${Z.ink3}, ${Z.ink2})` : Z.ink3,
          border: `1px solid ${value ? Z.gold : Z.hair2}`,
          boxShadow: value ? `inset 0 0 8px ${Z.goldGlow}` : 'none',
          transition: 'all .2s',
          flexShrink: 0,
          borderRadius: 0,
        }}>
          {/* Sliding token (gold leaf chip when on, ink chip when off) */}
          <div style={{
            position: 'absolute', top: 2, bottom: 2,
            left: value ? 24 : 2,
            width: 18,
            background: value ? `linear-gradient(180deg, ${Z.goldHi}, ${Z.gold} 50%, ${Z.goldLo})` : Z.ink4,
            border: `1px solid ${value ? Z.goldLo : Z.hair2}`,
            transition: 'left .2s cubic-bezier(.4,0,.2,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {value && (
              <span style={{ fontSize: 8, color: Z.ink, fontFamily: Z.fontCaps, fontWeight: 700 }}>✦</span>
            )}
          </div>
        </button>
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '12px 0', borderBottom: `0.5px solid ${T.glassBorder}`,
    }}>
      <div>
        <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{label}</div>
        {sub && <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 23, borderRadius: 12, position: 'relative',
        background: value ? `linear-gradient(180deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.1)',
        border: `0.5px solid ${value ? T.accent : T.glassBorder2}`, cursor: 'pointer', padding: 0,
        boxShadow: value ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px ${T.accentGlow}` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'all .2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 19 : 2,
          width: 17, height: 17, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'left .2s cubic-bezier(.4,0,.2,1)',
        }}/>
      </button>
    </div>
  );
}

// ────────────── Level-Up Takeover ──────────────
function LevelUpTakeover({ level, onClose }) {
  // Zodiac gate — delegates to celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacLevelUpTakeover) {
    return <window.ZodiacLevelUpTakeover level={level} onClose={onClose}/>;
  }
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 120);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const perks = [
    { label: t('levelup.hoodie'), icon: <IStore size={14}/> },
    { label: t('levelup.bonus'), icon: <ISparkle size={14}/> },
    { label: t('levelup.roleColor'), icon: <IUser size={14}/> },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Level up" style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(3,6,16,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .3s', overflow: 'hidden',
    }}>
      {/* Radial burst */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '120vw', height: '120vw',
        transform: `translate(-50%, -50%) scale(${stage >= 1 ? 1 : 0})`,
        background: `radial-gradient(circle, ${T.accent}66 0%, ${T.accent}22 25%, transparent 55%)`,
        filter: 'blur(40px)',
        transition: 'transform 1.8s cubic-bezier(.2,.9,.3,1)',
        pointerEvents: 'none',
      }}/>

      {/* Rays */}
      {stage >= 1 && [...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 2, height: '60vh',
          background: `linear-gradient(180deg, transparent 0%, ${T.accentHi}88 40%, transparent 100%)`,
          transformOrigin: '50% 0',
          transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(-50%)`,
          opacity: stage >= 2 ? 0.5 : 0.9,
          transition: 'opacity 1s', pointerEvents: 'none',
          animation: `fadeIn 0.6s ease-out ${i * 0.05}s backwards`,
        }}/>
      ))}

      {/* Particles */}
      {stage >= 1 && [...Array(24)].map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 200 + (i % 3) * 80;
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 4, height: 4, borderRadius: '50%',
            background: T.accentHi,
            boxShadow: `0 0 10px ${T.accent}`,
            transform: stage >= 1
              ? `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`
              : `translate(-50%, -50%)`,
            opacity: stage >= 2 ? 0 : 1,
            transition: 'transform 1.4s cubic-bezier(.2,.9,.3,1), opacity 1s',
            pointerEvents: 'none',
          }}/>
        );
      })}

      {/* Content */}
      <div style={{
        position: 'relative', textAlign: 'center', padding: 40,
        transform: `scale(${stage >= 1 ? 1 : 0.8}) translateY(${stage >= 1 ? 0 : 20}px)`,
        opacity: stage >= 1 ? 1 : 0,
        transition: 'all .8s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        <div style={{ ...TY.micro, color: T.accentHi, marginBottom: 18, letterSpacing: '0.2em', textShadow: `0 0 16px ${T.accent}` }}>
          {t('levelup.kicker')}
        </div>
        <div style={{
          ...TY.display, fontSize: 180, color: T.text,
          textShadow: `0 0 80px ${T.accent}, 0 0 120px ${T.accentGlow}`,
          lineHeight: 0.9, marginBottom: 8,
        }}>{level}</div>
        <div style={{ ...TY.h2, color: T.text, marginBottom: 6 }}>{t('levelup.reached')}{level}</div>
        <div style={{ ...TY.body, color: T.text2, marginBottom: 32 }}>{t('levelup.newPerks')}</div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          maxWidth: 360, margin: '0 auto 32px',
        }}>
          {perks.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', borderRadius: T.r.pill,
              background: 'rgba(255,255,255,0.06)',
              border: `0.5px solid ${T.glassBorder}`,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
              opacity: stage >= 2 ? 1 : 0,
              transition: `all .5s cubic-bezier(.2,.9,.3,1) ${0.1 * i}s`,
            }}>
              <div style={{ color: T.accentHi }}>{p.icon}</div>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500, fontSize: 14 }}>{p.label}</div>
            </div>
          ))}
        </div>

        <div style={{
          transform: stage >= 3 ? 'translateY(0)' : 'translateY(10px)',
          opacity: stage >= 3 ? 1 : 0,
          transition: 'all .4s ease-out',
        }}>
          <Btn variant="primary" size="lg" onClick={onClose}>{t('levelup.continue')}</Btn>
        </div>
      </div>
    </div>
  );
}

// Expose panes for the Zodiac SettingsModal variant in dist/zodiac/views3.jsx
// — its zodiac-themed shell renders the same panes inside ink+gold chrome.
Object.assign(window, {
  AccountPane, NotifPane, DownloadsPane, AppearancePane,
});
