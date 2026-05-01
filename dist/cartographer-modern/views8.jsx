// ElyHub — Cartographer Modern ShortcutsModal + ReportModal.

function CartographerModernShortcutsModal({ onClose }) {
  const Mm = window.Mm, MmTY = window.MmTY;

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const groups = [
    { title: 'SEARCH', rows: [
      { keys: [mod, 'K'], label: 'Focus search' },
      { keys: ['/'],      label: 'Focus search' },
      { keys: ['↑', '↓'], label: 'Navigate results' },
      { keys: ['↵'],      label: 'Open highlighted' },
      { keys: ['Esc'],    label: 'Close dropdown' },
    ]},
    { title: 'NAVIGATION', rows: [
      { keys: ['?'],   label: 'Toggle this sheet' },
      { keys: ['Esc'], label: 'Close modal / dropdown' },
    ]},
    { title: 'GENERAL', rows: [
      { keys: [mod, 'R'],     label: 'Reload app' },
      { keys: ['Shift', 'R'], label: 'Replay intro (dev)' },
    ]},
  ];

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div style={{
        width: '100%', maxWidth: 520, padding: '22px 24px',
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.99))',
        border: `1px solid ${Mm.hair2}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 4 }}>KEYBOARD</div>
            <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 17 }}>Shortcuts<span style={{ color: Mm.accent }}>.</span></div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4, border: `1px solid ${Mm.hair2}`,
            background: 'transparent', color: Mm.text3, cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((g) => (
            <div key={g.title}>
              <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 6 }}>{g.title}</div>
              <div style={{
                background: 'rgba(10,18,16,0.65)',
                border: `1px solid ${Mm.hair2}`, borderRadius: 4, overflow: 'hidden',
              }}>
                {g.rows.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderTop: i === 0 ? 'none' : `1px solid ${Mm.hair}`,
                  }}>
                    <span style={{ ...MmTY.body, color: Mm.text2, fontSize: 13 }}>{r.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      {r.keys.map((k, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span style={{ color: Mm.text3, fontSize: 11 }}>+</span>}
                          <kbd style={{
                            fontFamily: Mm.fontMono, fontSize: 11, fontWeight: 600,
                            color: Mm.accent, padding: '3px 7px',
                            background: 'rgba(155,214,107,0.08)',
                            border: `1px solid ${Mm.hair3}`, borderRadius: 3,
                            letterSpacing: '0.04em',
                          }}>{k}</kbd>
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
          marginTop: 16, paddingTop: 12, borderTop: `1px solid ${Mm.hair}`,
          ...MmTY.coord, color: Mm.text3, fontSize: 9, textAlign: 'center',
        }}>
          PRESS{' '}
          <kbd style={{
            fontFamily: Mm.fontMono, fontSize: 9, color: Mm.accent,
            padding: '2px 6px', margin: '0 4px',
            background: 'rgba(155,214,107,0.08)', border: `1px solid ${Mm.hair3}`,
            borderRadius: 2,
          }}>?</kbd>{' '}
          ANYWHERE TO REOPEN
        </div>
      </div>
    </div>
  );
}

function CartographerModernReportModal({ target, reports, onClose }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const REPORT_REASONS = window.REPORT_REASONS || {};
  const options = REPORT_REASONS[target.kind] || REPORT_REASONS.user || [
    { id: 'spam',  label: 'Spam',  sub: 'Repetitive or misleading content' },
    { id: 'abuse', label: 'Abuse', sub: 'Offensive behavior' },
    { id: 'other', label: 'Other', sub: 'Describe below' },
  ];
  const [reason, setReason] = React.useState(options[0].id);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const already = reports?.has?.(target.kind, target.id);

  const onSubmit = () => {
    if (already) { onClose(); return; }
    const res = reports.submit({ kind: target.kind, targetId: target.id, reason, note });
    if (res.ok) {
      setSent(true);
      try { ElyNotify?.toast?.({ text: 'Report submitted — thanks for flagging', kind: 'success' }); } catch {}
      setTimeout(onClose, 900);
    }
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div style={{
        width: 460, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.99))',
        border: `1px solid ${Mm.hair2}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        padding: '22px 26px',
      }}>
        <div style={{ ...MmTY.coord, color: Mm.danger, marginBottom: 6 }}>
          REPORT · {String(target.kind || 'USER').toUpperCase()}
        </div>
        <h2 style={{ ...MmTY.h2, color: Mm.text, margin: 0 }}>
          {already ? 'Already reported' : 'What\'s wrong?'}<span style={{ color: Mm.danger }}>.</span>
        </h2>
        <div style={{ ...MmTY.small, color: Mm.text2, fontSize: 13, marginTop: 6, marginBottom: 18 }}>
          {target.name && <>Reporting <strong style={{ color: Mm.text }}>{target.name}</strong>. </>}
          {already
            ? 'Already flagged — a moderator will review.'
            : 'Mods will review. Abuse of the report system can limit your account.'}
        </div>

        {!already && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {options.map((o) => {
                const active = reason === o.id;
                return (
                  <button key={o.id} onClick={() => setReason(o.id)} style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 4,
                    background: active ? `${Mm.danger}22` : 'rgba(10,18,16,0.65)',
                    border: `1px solid ${active ? Mm.danger : Mm.hair2}`,
                    color: Mm.text, cursor: 'pointer',
                    fontFamily: Mm.fontUI,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%', marginTop: 3,
                      border: `1.5px solid ${active ? Mm.danger : Mm.hair2}`,
                      background: active ? Mm.danger : 'transparent',
                      flexShrink: 0,
                    }}/>
                    <span style={{ flex: 1 }}>
                      <div style={{ ...MmTY.body, fontSize: 13, fontWeight: 500, color: Mm.text }}>{o.label}</div>
                      <div style={{ ...MmTY.small, fontSize: 11, color: Mm.text3, marginTop: 2 }}>{o.sub}</div>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 6 }}>MORE DETAIL (OPTIONAL)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the mods what happened…"
              rows={3} style={{
                width: '100%', padding: 12, boxSizing: 'border-box',
                background: 'rgba(10,18,16,0.65)', borderRadius: 4,
                border: `1px solid ${Mm.hair2}`,
                color: Mm.text, fontFamily: Mm.fontUI,
                fontSize: 13, outline: 'none', resize: 'vertical',
                marginBottom: 18,
              }}/>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {!already && (
            <button onClick={onClose} style={{
              padding: '9px 16px', borderRadius: 4,
              background: 'transparent', color: Mm.text2,
              border: `1px solid ${Mm.hair2}`, cursor: 'pointer',
              fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
            }}>Cancel</button>
          )}
          <button onClick={onSubmit} disabled={sent} style={{
            padding: '9px 16px', borderRadius: 4,
            background: Mm.danger, color: Mm.bg,
            border: `1px solid ${Mm.danger}`, cursor: sent ? 'default' : 'pointer',
            fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
            boxShadow: `0 0 12px ${Mm.danger}33`,
            opacity: sent ? 0.7 : 1,
          }}>{sent ? 'Submitted' : already ? 'Close' : 'Submit report'}</button>
        </div>
      </div>
    </div>
  );
}

window.CartographerModernShortcutsModal = CartographerModernShortcutsModal;
window.CartographerModernReportModal    = CartographerModernReportModal;
