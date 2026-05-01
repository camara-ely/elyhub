// ElyHub — Cartographer (vintage) MessagesView + MyLicensesView.

// ─── CartographerMessagesView ───────────────────────────────────────────
// Direct messages — paper letterhead style. List of threads on the left,
// active conversation on the right with sealed-letter bubbles.
function CartographerMessagesView({ state, setView, messages, threadId, blocks, reports }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const meId = messages.meId;
  const list = blocks ? messages.list.filter((t) => !blocks.has(t.otherId)) : messages.list;
  const routeOtherId = threadId && messages.threads[threadId]?.otherId;
  const routeBlocked = routeOtherId && blocks && blocks.has(routeOtherId);
  const resolved = threadId && messages.threads[threadId] && !routeBlocked
    ? threadId : list[0]?.id || null;
  const active = resolved ? messages.threads[resolved] : null;
  const other = active ? (window.MEMBERS || []).find((m) => m.id === active.otherId) : null;

  React.useEffect(() => { if (resolved) messages.markRead(resolved); }, [resolved]);
  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [resolved, active?.messages?.length]);

  const [draft, setDraft] = React.useState('');
  React.useEffect(() => { setDraft(''); }, [resolved]);
  const submit = () => {
    if (!draft.trim() || !active) return;
    messages.send(active.otherId, draft);
    setDraft('');
  };

  const rel = (atMs) => {
    if (!atMs) return '';
    const ms = Date.now() - atMs;
    if (ms < 60_000) return 'agora';
    const m = Math.floor(ms / 60_000); if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${M.hair2}` }}>
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.messages.eyebrow')}</div>
        <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>{tc('page.messages.title')}<span style={{ color: M.wax }}>.</span></h1>
        <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
          {list.length} {list.length === 1 ? 'correspondente' : 'correspondentes'}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{
          ...MTY.body, color: M.ink3, textAlign: 'center',
          padding: '60px 24px', background: M.surface,
          border: `1px dashed ${M.hair2}`,
        }}>
          <div style={{ ...MTY.h3, color: M.ink2, marginBottom: 8, fontSize: 17 }}>Nenhuma carta ainda</div>
          <div style={{ ...MTY.hand, fontStyle: 'italic' }}>Envie uma do perfil de outro navegante.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)',
          gap: 0, height: 580,
          background: '#EFE3C8', border: `1px solid ${M.hair2}`,
          boxShadow: '2px 4px 12px rgba(59,38,22,0.08)',
        }}>
          {/* Thread list */}
          <div style={{
            borderRight: `1px solid ${M.hair2}`,
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {list.map((t) => {
              const isActive = t.id === resolved;
              const member = (window.MEMBERS || []).find((m) => m.id === t.otherId);
              return (
                <button key={t.id} onClick={() => setView({ id: 'messages', threadId: t.id })} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', cursor: 'pointer',
                  background: isActive ? 'rgba(200,162,78,0.18)' : 'transparent',
                  border: 'none',
                  borderBottom: `1px dashed ${M.hair}`,
                  textAlign: 'left',
                }}>
                  {window.WaxSeal && React.createElement(window.WaxSeal, {
                    src: member?.avatar, name: member?.name || t.otherName, size: 36, ring: 4,
                  })}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ ...MTY.h3, color: M.ink, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member?.name || t.otherName || 'Anônimo'}
                      </span>
                      {t.lastAt && (
                        <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8, flexShrink: 0 }}>
                          {rel(t.lastAt)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      ...MTY.hand, color: M.ink3, fontSize: 12, fontStyle: 'italic',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>{t.lastBody || '— sem cartas —'}</div>
                  </div>
                  {t.unread > 0 && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: M.wax,
                      boxShadow: `0 0 6px ${M.waxGlow}`, flexShrink: 0,
                    }}/>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active thread */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!active ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...MTY.hand, color: M.ink3, fontStyle: 'italic',
              }}>Selecione uma carta à esquerda</div>
            ) : (
              <>
                {/* Thread header */}
                <div style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${M.hair2}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(232,220,192,0.6)',
                }}>
                  {window.WaxSeal && React.createElement(window.WaxSeal, {
                    src: other?.avatar, name: other?.name || active.otherName, size: 34, ring: 4,
                  })}
                  <button onClick={() => setView({ id: 'profile', userId: active.otherId })}
                    style={{
                      flex: 1, textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                    <div style={{ ...MTY.h3, color: M.ink, fontSize: 14 }}>
                      {other?.name || active.otherName || 'Anônimo'}
                    </div>
                    <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8 }}>VER PERFIL</div>
                  </button>
                </div>

                {/* Messages */}
                <div ref={scrollerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                  {(active.messages || []).map((m, i) => {
                    const mine = m.from === meId;
                    return (
                      <div key={m.id || i} style={{
                        display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
                        marginBottom: 10,
                      }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          background: mine ? M.wax : 'rgba(232,220,192,0.75)',
                          color: mine ? M.surface : M.ink,
                          border: mine ? `1px solid ${M.wax}` : `1px solid ${M.hair2}`,
                          ...MTY.body, fontSize: 14, lineHeight: 1.4,
                          boxShadow: mine ? '1px 2px 4px rgba(139,36,24,0.18)' : '1px 2px 4px rgba(59,38,22,0.08)',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {m.body}
                          <div style={{
                            ...MTY.capsSm, fontSize: 8, marginTop: 4,
                            color: mine ? 'rgba(232,220,192,0.6)' : M.ink3, opacity: 0.8,
                            textAlign: mine ? 'right' : 'left',
                          }}>{rel(m.at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Composer */}
                <div style={{
                  padding: 14, borderTop: `1px solid ${M.hair2}`,
                  background: 'rgba(232,220,192,0.6)',
                  display: 'flex', gap: 10, alignItems: 'flex-end',
                }}>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    placeholder="Escreva à mão livre… (Enter envia)"
                    rows={1} style={{
                      flex: 1, padding: '10px 12px', boxSizing: 'border-box',
                      background: '#EFE3C8', border: `1px solid ${M.hair2}`,
                      color: M.ink, fontFamily: M.fontBody, fontStyle: 'italic',
                      fontSize: 14, outline: 'none', resize: 'none', minHeight: 38, maxHeight: 120,
                    }}/>
                  <button onClick={submit} disabled={!draft.trim()} style={{
                    padding: '10px 16px',
                    background: draft.trim() ? M.wax : 'transparent',
                    color: draft.trim() ? M.surface : M.ink3,
                    border: `1px solid ${draft.trim() ? M.wax : M.hair2}`,
                    fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.20em', textTransform: 'uppercase',
                    cursor: draft.trim() ? 'pointer' : 'default',
                    boxShadow: draft.trim() ? 'inset 0 1px 0 rgba(255,255,255,0.15), 1px 2px 4px rgba(139,36,24,0.25)' : 'none',
                  }}>Enviar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CartographerMyLicensesView ─────────────────────────────────────────
// Mirror of the host MyLicensesView but parchment. Reuses the api() helper
// from licenses.jsx via a thin wrapper.
function CartographerMyLicensesView() {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const [data, setData] = React.useState({ loading: true, items: [], error: null });
  const [busy, setBusy] = React.useState(null);
  const [cooldowns, setCooldowns] = React.useState({});

  const apiGet = (path) => (window.ElyAPI && window.ElyAPI.get) ? window.ElyAPI.get(path) : Promise.reject(new Error('not signed in'));
  const apiPost = (path, body) => (window.ElyAPI && window.ElyAPI.post) ? window.ElyAPI.post(path, body) : Promise.reject(new Error('not signed in'));

  const load = React.useCallback(async () => {
    setData((d) => ({ ...d, loading: true }));
    try {
      const res = await apiGet('/me/licenses');
      const items = Array.isArray(res?.items) ? res.items : [];
      setData({ loading: false, items, error: null });
    } catch (err) {
      setData({ loading: false, items: [], error: err?.message || 'falha ao carregar' });
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (Object.keys(cooldowns).length === 0) return undefined;
    const id = setInterval(() => {
      setCooldowns((prev) => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) if (v > 1) next[k] = v - 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldowns]);

  const resetDevices = async (lic) => {
    if (busy) return;
    setBusy(lic.id);
    try {
      await apiPost(`/me/licenses/${lic.id}/reset-devices`, {});
      try { ElyNotify?.toast?.({ text: 'Dispositivos resetados', kind: 'success' }); } catch {}
      await load();
    } catch (err) {
      if (err?.status === 429) {
        const sec = Number(err?.body?.retry_after_sec || err?.retry_after_sec || 86400);
        setCooldowns((c) => ({ ...c, [lic.id]: sec }));
        try { ElyNotify?.toast?.({ text: `Reset disponível em ${Math.ceil(sec / 3600)}h`, kind: 'warn' }); } catch {}
      } else {
        try { ElyNotify?.toast?.({ text: `Falha: ${err?.message || 'desconhecido'}`, kind: 'warn' }); } catch {}
      }
    } finally { setBusy(null); }
  };

  if (data.loading) {
    return (
      <div style={{ position: 'relative', zIndex: 1, padding: '60px 24px', textAlign: 'center', ...MTY.hand, color: M.ink3, fontStyle: 'italic' }}>
        Consultando os selos…
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${M.hair2}` }}>
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.licenses.eyebrow')}</div>
        <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>{tc('page.licenses.title')}<span style={{ color: M.wax }}>.</span></h1>
        <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
          {data.items.length} {data.items.length === 1 ? 'selo emitido' : 'selos emitidos'}
        </div>
      </div>

      {data.error && (
        <div style={{
          padding: 14, ...MTY.body, color: M.wax, fontSize: 13,
          background: 'rgba(139,36,24,0.10)', border: `1px solid ${M.wax}`,
        }}>⚠ {data.error}</div>
      )}

      {data.items.length === 0 && !data.error ? (
        <div style={{
          ...MTY.body, color: M.ink3, textAlign: 'center',
          padding: '60px 24px', background: M.surface, border: `1px dashed ${M.hair2}`,
        }}>
          <div style={{ ...MTY.h3, color: M.ink2, marginBottom: 8, fontSize: 17 }}>Nenhum selo ainda</div>
          <div style={{ ...MTY.hand, fontStyle: 'italic' }}>Selos aparecem aqui após adquirir tomos do mercado.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {data.items.map((lic) => {
            const cd = cooldowns[lic.id];
            const expired = lic.status === 'expired' || lic.status === 'revoked';
            return (
              <div key={lic.id} style={{
                position: 'relative',
                background: expired ? 'rgba(232,220,192,0.5)' : '#EFE3C8',
                border: `1px solid ${expired ? M.hair2 : M.hair3}`,
                padding: '18px 20px',
                boxShadow: '2px 4px 10px rgba(59,38,22,0.08)',
                opacity: expired ? 0.7 : 1,
              }}>
                {window.OrnateCorner && (
                  <>
                    {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', top: 4, left: 4 } })}
                    {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)' } })}
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 9, marginBottom: 2 }}>
                      {String(lic.product_name || lic.product_id || 'TOMO').toUpperCase()}
                    </div>
                    <div style={{ ...MTY.h3, color: M.ink, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lic.product_name || lic.product_id}
                    </div>
                  </div>
                  <span style={{
                    ...MTY.capsSm, fontSize: 9, color: expired ? M.ink3 : M.wax,
                    padding: '3px 8px', border: `1px solid ${expired ? M.hair2 : M.wax}`,
                    letterSpacing: '0.18em', flexShrink: 0,
                  }}>{(lic.status || 'ativo').toUpperCase()}</span>
                </div>

                {lic.license_key || lic.key_preview ? (
                  <div style={{
                    ...MTY.capsSm, color: M.ink2, fontSize: 11,
                    fontFamily: '"JetBrains Mono",ui-monospace,monospace',
                    background: 'rgba(232,220,192,0.6)',
                    border: `1px solid ${M.hair2}`,
                    padding: '8px 10px',
                    letterSpacing: '0.06em',
                    wordBreak: 'break-all',
                    marginBottom: 12,
                  }}>{lic.license_key || lic.key_preview}</div>
                ) : null}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 10, borderTop: `1px dashed ${M.hair}`,
                }}>
                  <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, fontStyle: 'italic' }}>
                    {lic.devices?.length || 0} {(lic.devices?.length || 0) === 1 ? 'dispositivo' : 'dispositivos'}
                  </div>
                  {!expired && (
                    cd ? (
                      <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 9 }}>
                        {Math.ceil(cd / 3600)}h restantes
                      </span>
                    ) : (
                      <button onClick={() => resetDevices(lic)} disabled={busy === lic.id} style={{
                        padding: '6px 12px',
                        background: 'transparent', color: M.wax,
                        border: `1px solid ${M.wax}`,
                        fontFamily: M.fontDisp, fontSize: 9, fontWeight: 600,
                        letterSpacing: '0.20em', textTransform: 'uppercase',
                        cursor: busy === lic.id ? 'default' : 'pointer',
                        opacity: busy === lic.id ? 0.6 : 1,
                      }}>{busy === lic.id ? 'Resetando' : 'Resetar dispositivos'}</button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.CartographerMessagesView   = CartographerMessagesView;
window.CartographerMyLicensesView = CartographerMyLicensesView;
