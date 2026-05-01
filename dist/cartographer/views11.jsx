// ElyHub — Cartographer (vintage) ShortcutsModal + ReportModal.

// ─── CartographerShortcutsModal ──────────────────────────────────────────
function CartographerShortcutsModal({ onClose }) {
  const M = window.M, MTY = window.MTY;

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const groups = [
    {
      title: 'Busca',
      rows: [
        { keys: [mod, 'K'], label: 'Focar busca' },
        { keys: ['/'],      label: 'Focar busca' },
        { keys: ['↑', '↓'], label: 'Navegar resultados' },
        { keys: ['↵'],      label: 'Abrir resultado' },
        { keys: ['Esc'],    label: 'Fechar dropdown' },
      ],
    },
    {
      title: 'Navegação',
      rows: [
        { keys: ['?'],   label: 'Abrir/fechar este pergaminho' },
        { keys: ['Esc'], label: 'Fechar modal' },
      ],
    },
    {
      title: 'Geral',
      rows: [
        { keys: [mod, 'R'],     label: 'Recarregar app' },
        { keys: ['Shift', 'R'], label: 'Reabrir intro (dev)' },
      ],
    },
  ];

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(20,12,5,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div style={{
        width: '100%', maxWidth: 520,
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.97), rgba(220,207,174,0.99))',
        border: `1px solid ${M.hair3}`, padding: '24px 26px',
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45)',
      }}>
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', top: 5, left: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', top: 5, right: 5, transform: 'scaleX(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', bottom: 5, left: 5, transform: 'scaleY(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', bottom: 5, right: 5, transform: 'scale(-1,-1)' } })}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 4 }}>Atalhos do teclado</div>
            <div style={{ ...MTY.h3, color: M.ink, fontSize: 17 }}>Manuscrito de teclas<span style={{ color: M.wax }}>.</span></div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: `1px solid ${M.hair2}`,
            background: 'transparent', color: M.ink3, cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 2 }}>
          {groups.map((g) => (
            <div key={g.title}>
              <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 6 }}>{g.title}</div>
              <div style={{ background: 'rgba(232,220,192,0.6)', border: `1px solid ${M.hair2}` }}>
                {g.rows.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderTop: i === 0 ? 'none' : `1px dashed ${M.hair}`,
                  }}>
                    <span style={{ ...MTY.body, color: M.ink2, fontSize: 13 }}>{r.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      {r.keys.map((k, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span style={{ color: M.ink3, fontSize: 11 }}>+</span>}
                          <kbd style={{
                            fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
                            color: M.ink, padding: '3px 8px',
                            background: '#EFE3C8', border: `1px solid ${M.hair2}`,
                            boxShadow: '1px 2px 0 rgba(59,38,22,0.12)',
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
          marginTop: 18, paddingTop: 14,
          borderTop: `1px dashed ${M.hair}`, position: 'relative', zIndex: 2,
          ...MTY.hand, color: M.ink3, fontSize: 12, fontStyle: 'italic',
          textAlign: 'center',
        }}>
          Tecle <kbd style={{
            fontFamily: M.fontDisp, fontSize: 10, fontWeight: 600,
            color: M.ink, padding: '2px 6px', margin: '0 4px',
            background: '#EFE3C8', border: `1px solid ${M.hair2}`,
          }}>?</kbd> em qualquer tela para reabrir.
        </div>
      </div>
    </div>
  );
}

// ─── CartographerReportModal ─────────────────────────────────────────────
function CartographerReportModal({ target, reports, onClose }) {
  const M = window.M, MTY = window.MTY;
  const REPORT_REASONS = window.REPORT_REASONS || {};
  const options = REPORT_REASONS[target.kind] || REPORT_REASONS.user || [
    { id: 'spam', label: 'Spam', sub: 'Conteúdo repetitivo ou enganoso' },
    { id: 'abuse', label: 'Abuso', sub: 'Comportamento ofensivo' },
    { id: 'other', label: 'Outro', sub: 'Descreva abaixo' },
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
      try { ElyNotify?.toast?.({ text: 'Denúncia registrada — obrigado por sinalizar', kind: 'success' }); } catch {}
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
        background: 'rgba(20,12,5,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div style={{
        width: 460, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.97), rgba(220,207,174,0.99))',
        border: `1px solid ${M.hair3}`, padding: '24px 28px',
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45)',
      }}>
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', top: 5, left: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 28, style: { position: 'absolute', bottom: 5, right: 5, transform: 'scale(-1,-1)' } })}
          </>
        )}
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 6 }}>
          Denunciar {target.kind === 'user' ? 'navegante' : target.kind}
        </div>
        <h2 style={{ ...MTY.h2, color: M.ink, margin: 0, fontSize: 22 }}>
          {already ? 'Já registrado' : 'Qual o problema?'}<span style={{ color: M.wax }}>.</span>
        </h2>
        <div style={{ ...MTY.body, color: M.ink2, fontSize: 13, marginTop: 6, marginBottom: 18 }}>
          {target.name && <>Denunciando <strong style={{ color: M.ink }}>{target.name}</strong>. </>}
          {already
            ? 'Já foi sinalizado — um moderador irá analisar.'
            : 'Mods irão revisar. Abuso do sistema pode resultar em restrições.'}
        </div>

        {!already && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {options.map((o) => {
                const active = reason === o.id;
                return (
                  <button key={o.id} onClick={() => setReason(o.id)} style={{
                    textAlign: 'left', padding: '10px 12px',
                    background: active ? 'rgba(139,36,24,0.10)' : 'rgba(232,220,192,0.5)',
                    border: `1px solid ${active ? M.wax : M.hair2}`,
                    color: M.ink, cursor: 'pointer',
                    fontFamily: M.fontBody,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%', marginTop: 3,
                      border: `1.5px solid ${active ? M.wax : M.hair3}`,
                      background: active ? M.wax : 'transparent',
                      flexShrink: 0,
                    }}/>
                    <span style={{ flex: 1 }}>
                      <div style={{ ...MTY.body, fontSize: 13, fontWeight: 500, color: M.ink }}>{o.label}</div>
                      <div style={{ ...MTY.hand, fontSize: 12, color: M.ink3, marginTop: 2, fontStyle: 'italic' }}>{o.sub}</div>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 6 }}>Mais detalhes (opcional)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Conte ao moderador o que aconteceu…"
              rows={3} style={{
                width: '100%', padding: 12, boxSizing: 'border-box',
                background: 'rgba(232,220,192,0.5)',
                border: `1px solid ${M.hair2}`,
                color: M.ink, fontFamily: M.fontBody, fontStyle: 'italic',
                fontSize: 14, outline: 'none', resize: 'vertical',
                marginBottom: 18,
              }}/>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {!already && (
            <button onClick={onClose} style={{
              padding: '9px 16px', background: 'transparent', color: M.ink2,
              border: `1px solid ${M.hair2}`, cursor: 'pointer',
              fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.20em', textTransform: 'uppercase',
            }}>Cancelar</button>
          )}
          <button onClick={onSubmit} disabled={sent} style={{
            padding: '9px 16px',
            background: M.wax, color: M.surface,
            border: `1px solid ${M.wax}`, cursor: sent ? 'default' : 'pointer',
            fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.20em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 1px 2px 4px rgba(139,36,24,0.25)',
            opacity: sent ? 0.7 : 1,
          }}>{sent ? 'Enviado' : already ? 'Fechar' : 'Selar denúncia'}</button>
        </div>
      </div>
    </div>
  );
}

window.CartographerShortcutsModal = CartographerShortcutsModal;
window.CartographerReportModal    = CartographerReportModal;
