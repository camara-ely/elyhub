// ElyHub — Cartographer Modern MessagesView + MyLicensesView.

function CartographerModernMessagesView({ state, setView, messages, threadId, blocks, reports }) {
  const Mm = window.Mm, MmTY = window.MmTY;
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
    if (ms < 60_000) return 'now';
    const m = Math.floor(ms / 60_000); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const Avatar = ({ src, name, size = 36 }) => (
    <div style={{
      width: size, height: size, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
      background: src ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
      border: `1px solid ${Mm.hair2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: Math.round(size * 0.4), fontWeight: 700 }}>{(name || '?')[0]?.toUpperCase()}</span>}
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}` }}>
        <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.messages.eyebrow')}</div>
        <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.messages.title')}<span style={{ color: Mm.accent }}>.</span></h1>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
          {list.length} {list.length === 1 ? 'CONTACT' : 'CONTACTS'}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{
          ...MmTY.body, color: Mm.text3, textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`,
          borderRadius: 6,
        }}>
          <div style={{ ...MmTY.coord, color: Mm.text4, marginBottom: 10 }}>◌ NO SIGNALS</div>
          Send one from another surveyor's profile.
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)',
          gap: 0, height: 580,
          background: 'rgba(15,30,25,0.55)',
          border: `1px solid ${Mm.hair2}`, borderRadius: 6, overflow: 'hidden',
        }}>
          <div style={{
            borderRight: `1px solid ${Mm.hair2}`,
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
            background: 'rgba(10,18,16,0.55)',
          }}>
            {list.map((t) => {
              const isActive = t.id === resolved;
              const member = (window.MEMBERS || []).find((m) => m.id === t.otherId);
              return (
                <button key={t.id} onClick={() => setView({ id: 'messages', threadId: t.id })} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '12px 14px', cursor: 'pointer',
                  background: isActive ? `${Mm.accent}1A` : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${Mm.hair}`,
                  textAlign: 'left',
                  position: 'relative',
                }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
                      background: Mm.accent, boxShadow: `0 0 6px ${Mm.accent}`,
                    }}/>
                  )}
                  <Avatar src={member?.avatar} name={member?.name || t.otherName}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member?.name || t.otherName || 'Anonymous'}
                      </span>
                      {t.lastAt && (
                        <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8, flexShrink: 0 }}>
                          {rel(t.lastAt)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      ...MmTY.small, color: Mm.text3, fontSize: 12,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>{t.lastBody || '— no messages —'}</div>
                  </div>
                  {t.unread > 0 && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: Mm.accent,
                      boxShadow: `0 0 6px ${Mm.accent}`, flexShrink: 0,
                    }}/>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!active ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...MmTY.coord, color: Mm.text3,
              }}>SELECT A CHANNEL</div>
            ) : (
              <>
                <div style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${Mm.hair2}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(10,18,16,0.4)',
                }}>
                  <Avatar src={other?.avatar} name={other?.name || active.otherName} size={34}/>
                  <button onClick={() => setView({ id: 'profile', userId: active.otherId })}
                    style={{
                      flex: 1, textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                    <div style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, fontSize: 14 }}>
                      {other?.name || active.otherName || 'Anonymous'}
                    </div>
                    <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>VIEW PROFILE</div>
                  </button>
                </div>

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
                          padding: '10px 14px', borderRadius: 6,
                          background: mine ? Mm.accent : 'rgba(10,18,16,0.65)',
                          color: mine ? Mm.bg : Mm.text,
                          border: `1px solid ${mine ? Mm.accent : Mm.hair2}`,
                          ...MmTY.body, fontSize: 13, lineHeight: 1.4,
                          boxShadow: mine ? `0 0 12px ${Mm.accent}33` : 'none',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {m.body}
                          <div style={{
                            ...MmTY.coord, fontSize: 8, marginTop: 4,
                            color: mine ? 'rgba(14,22,20,0.6)' : Mm.text3, opacity: 0.85,
                            textAlign: mine ? 'right' : 'left',
                          }}>{rel(m.at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  padding: 14, borderTop: `1px solid ${Mm.hair2}`,
                  background: 'rgba(10,18,16,0.4)',
                  display: 'flex', gap: 10, alignItems: 'flex-end',
                }}>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                    placeholder="Type a transmission… (Enter sends)"
                    rows={1} style={{
                      flex: 1, padding: '10px 12px', boxSizing: 'border-box',
                      background: 'rgba(15,30,25,0.55)', borderRadius: 4,
                      border: `1px solid ${Mm.hair2}`,
                      color: Mm.text, fontFamily: Mm.fontUI,
                      fontSize: 13, outline: 'none', resize: 'none', minHeight: 38, maxHeight: 120,
                    }}/>
                  <button onClick={submit} disabled={!draft.trim()} style={{
                    padding: '10px 16px', borderRadius: 4,
                    background: draft.trim() ? Mm.accent : 'transparent',
                    color: draft.trim() ? Mm.bg : Mm.text3,
                    border: `1px solid ${draft.trim() ? Mm.accent : Mm.hair2}`,
                    fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
                    cursor: draft.trim() ? 'pointer' : 'default',
                    boxShadow: draft.trim() ? `0 0 12px ${Mm.accent}33` : 'none',
                  }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CartographerModernMyLicensesView() {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
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
      setData({ loading: false, items: [], error: err?.message || 'load failed' });
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
      try { ElyNotify?.toast?.({ text: 'Devices reset', kind: 'success' }); } catch {}
      await load();
    } catch (err) {
      if (err?.status === 429) {
        const sec = Number(err?.body?.retry_after_sec || err?.retry_after_sec || 86400);
        setCooldowns((c) => ({ ...c, [lic.id]: sec }));
        try { ElyNotify?.toast?.({ text: `Reset available in ${Math.ceil(sec / 3600)}h`, kind: 'warn' }); } catch {}
      } else {
        try { ElyNotify?.toast?.({ text: `Reset failed: ${err?.message || 'unknown'}`, kind: 'warn' }); } catch {}
      }
    } finally { setBusy(null); }
  };

  if (data.loading) {
    return (
      <div style={{ position: 'relative', zIndex: 1, padding: '60px 24px', textAlign: 'center', ...MmTY.coord, color: Mm.text3 }}>
        ◌ FETCHING KEYS…
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}` }}>
        <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.licenses.eyebrow')}</div>
        <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>{tc('page.licenses.title')}<span style={{ color: Mm.accent }}>.</span></h1>
        <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
          {data.items.length} {data.items.length === 1 ? 'KEY ISSUED' : 'KEYS ISSUED'}
        </div>
      </div>

      {data.error && (
        <div style={{
          padding: 14, ...MmTY.body, color: Mm.danger, fontSize: 13,
          background: 'rgba(224,122,95,0.10)', border: `1px solid ${Mm.danger}`, borderRadius: 4,
        }}>⚠ {data.error}</div>
      )}

      {data.items.length === 0 && !data.error ? (
        <div style={{
          ...MmTY.body, color: Mm.text3, textAlign: 'center',
          padding: '60px 24px',
          background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`, borderRadius: 6,
        }}>
          <div style={{ ...MmTY.coord, color: Mm.text4, marginBottom: 10 }}>◌ NO KEYS</div>
          Keys appear here after acquiring listings.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
          {data.items.map((lic) => {
            const cd = cooldowns[lic.id];
            const expired = lic.status === 'expired' || lic.status === 'revoked';
            return (
              <div key={lic.id} style={{
                background: 'rgba(15,30,25,0.55)',
                border: `1px solid ${expired ? Mm.hair2 : Mm.hair3}`,
                borderRadius: 6, padding: '16px 18px',
                opacity: expired ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginBottom: 2 }}>
                      {String(lic.product_name || lic.product_id || 'KEY').toUpperCase()}
                    </div>
                    <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lic.product_name || lic.product_id}
                    </div>
                  </div>
                  <span style={{
                    ...MmTY.coord, fontSize: 9, color: expired ? Mm.text3 : Mm.accent,
                    padding: '3px 8px', borderRadius: 2,
                    border: `1px solid ${expired ? Mm.hair2 : Mm.hair3}`,
                    flexShrink: 0,
                  }}>{(lic.status || 'active').toUpperCase()}</span>
                </div>

                {lic.license_key || lic.key_preview ? (
                  <div style={{
                    ...MmTY.small, color: Mm.accent, fontSize: 11,
                    fontFamily: Mm.fontMono,
                    background: 'rgba(10,18,16,0.65)',
                    border: `1px solid ${Mm.hair2}`, borderRadius: 4,
                    padding: '8px 10px',
                    letterSpacing: '0.04em',
                    wordBreak: 'break-all',
                    marginBottom: 12,
                  }}>{lic.license_key || lic.key_preview}</div>
                ) : null}

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 10, borderTop: `1px solid ${Mm.hair}`,
                }}>
                  <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>
                    {lic.devices?.length || 0} {(lic.devices?.length || 0) === 1 ? 'DEVICE' : 'DEVICES'}
                  </div>
                  {!expired && (
                    cd ? (
                      <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>
                        {Math.ceil(cd / 3600)}H REMAINING
                      </span>
                    ) : (
                      <button onClick={() => resetDevices(lic)} disabled={busy === lic.id} style={{
                        padding: '5px 10px', borderRadius: 3,
                        background: 'transparent', color: Mm.accent,
                        border: `1px solid ${Mm.accent}`,
                        fontFamily: Mm.fontMono, fontSize: 9, fontWeight: 600,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        cursor: busy === lic.id ? 'default' : 'pointer',
                        opacity: busy === lic.id ? 0.6 : 1,
                      }}>{busy === lic.id ? 'RESETTING' : 'RESET DEVICES'}</button>
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

window.CartographerModernMessagesView   = CartographerModernMessagesView;
window.CartographerModernMyLicensesView = CartographerModernMyLicensesView;
