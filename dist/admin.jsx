// Admin panel — Kassa licenses & clients.
//
// Fetches role via GET /admin/whoami on mount. If 403 (not admin/owner),
// the caller (app.jsx) won't render this view at all — but we double-check
// here anyway so a stale nav doesn't leak content.
//
// Three tabs:
//   • Licenses — paginated table; Modify / Disable / Re-enable / Reset-devices
//   • Clients  — rollup by customer (admin sees channel=elyhub; owner sees all)
//   • Grant    — manual emission (admin: gift/admin only; owner: all channels)
//
// Role comes from the Worker side (resolveRole) — we just render accordingly.

(() => {
  const api = () => window.ElyAPI;
  const toast = (msg, kind = 'info') => { try { window.ElyNotify?.toast?.({ text: msg, kind }); } catch {} };

  // ───────── Role hook ────────────────────────────────────────────────────

  function useAdminRole() {
    const [state, setState] = React.useState({ loading: true, role: null, error: null });
    React.useEffect(() => {
      let alive = true;
      (async () => {
        try {
          const res = await api().get('/admin/whoami');
          if (!alive) return;
          setState({ loading: false, role: res?.role || null, error: null });
        } catch (err) {
          if (!alive) return;
          setState({ loading: false, role: null, error: err?.status === 403 ? 'forbidden' : (err?.message || 'error') });
        }
      })();
      return () => { alive = false; };
    }, []);
    return state;
  }

  // Exposed globally so shell.jsx can conditionally render the nav item.
  window.useAdminRole = useAdminRole;

  // ───────── Shared bits ──────────────────────────────────────────────────

  const Header = ({ title, subtitle, right }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
      <div>
        <h1 style={{ ...TY.h1, margin: 0 }}>{title}<span style={{ color: T.accentHi }}>.</span></h1>
        {subtitle && <div style={{ ...TY.body, color: T.text2, marginTop: 6 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );

  const Input = ({ value, onChange, placeholder, type = 'text', style }) => (
    <input type={type} value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 38, padding: '0 14px', borderRadius: T.r.md,
        background: 'rgba(255,255,255,0.04)',
        color: T.text, fontFamily: T.fontSans, fontSize: 14,
        border: `0.5px solid ${T.glassBorder2}`,
        outline: 'none', minWidth: 0,
        ...style,
      }}/>
  );

  const Select = ({ value, onChange, options, style }) => (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
      style={{
        height: 38, padding: '0 12px', borderRadius: T.r.md,
        background: 'rgba(255,255,255,0.04)',
        color: T.text, fontFamily: T.fontSans, fontSize: 14,
        border: `0.5px solid ${T.glassBorder2}`, outline: 'none',
        ...style,
      }}>
      {options.map(o => (
        <option key={o.value ?? '__'} value={o.value ?? ''} style={{ background: '#0a0f1c' }}>{o.label}</option>
      ))}
    </select>
  );

  const Field = ({ label, children }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ ...TY.small, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );

  const EmptyState = ({ text }) => (
    <div style={{ padding: 40, textAlign: 'center', color: T.text3, fontFamily: T.fontSans, fontSize: 14 }}>
      {text}
    </div>
  );

  const Spinner = () => (
    <div style={{ padding: 40, textAlign: 'center', color: T.text3, fontFamily: T.fontSans, fontSize: 13 }}>
      Loading…
    </div>
  );

  function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
  }

  // Compact relative time for "Created" column. Recent → "2h ago" / "3d ago",
  // older than 30d → falls back to absolute date.
  function formatRelative(d) {
    if (!d) return '—';
    try {
      const t = new Date(d).getTime();
      if (!Number.isFinite(t)) return formatDate(d);
      const diff = Date.now() - t;
      if (diff < 0) return formatDate(d);
      const m = Math.floor(diff / 60_000);
      if (m < 1) return 'just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const days = Math.floor(h / 24);
      if (days < 30) return `${days}d ago`;
      return formatDate(d);
    } catch { return formatDate(d); }
  }

  // ───────── Licenses Tab ─────────────────────────────────────────────────

  function LicensesTab({ role }) {
    const [filters, setFilters] = React.useState({ search: '', status: 'all', product_id: '', sales_channel: '' });
    const [page, setPage] = React.useState(0);
    const [data, setData] = React.useState({ loading: true, items: [], total: 0 });
    const [busy, setBusy] = React.useState(null); // license_id of pending action
    const LIMIT = 25;

    const load = React.useCallback(async () => {
      setData((d) => ({ ...d, loading: true }));
      try {
        const body = {
          status: filters.status,
          limit: LIMIT,
          offset: page * LIMIT,
        };
        if (filters.search.trim()) body.search = filters.search.trim();
        if (filters.product_id) body.product_id = filters.product_id;
        if (filters.sales_channel) body.sales_channel = filters.sales_channel;
        const res = await api().post('/admin/licenses/list', body);
        setData({ loading: false, items: res?.items || [], total: res?.total || 0 });
      } catch (err) {
        setData({ loading: false, items: [], total: 0 });
        toast(`Load failed: ${err?.message || 'unknown'}`, 'warn');
      }
    }, [filters, page]);

    React.useEffect(() => { load(); }, [load]);

    const setActive = async (lic, active) => {
      if (busy) return;
      setBusy(lic.id);
      try {
        // _display hints let the server populate a reactivation event without
        // a second Supabase lookup. Server ignores these for auth — they're
        // pure render metadata for the Discord embed.
        await api().post('/admin/licenses/set-active', {
          license_id: lic.id,
          active,
          reason: active ? undefined : 'admin action',
          _display: {
            product_id: lic.product_id,
            tier: lic.tier,
            key_preview: lic.key_preview,
            user_id: lic.user_id,
          },
        });
        toast(active ? 'License re-enabled' : 'License disabled', 'success');
        await load();
      } catch (err) {
        toast(`Failed: ${err?.message || 'unknown'}`, 'warn');
      } finally { setBusy(null); }
    };

    // Tauri's WKWebView silently no-ops window.confirm(), so a native confirm
    // made Reset look broken. Action is safe (admin-only, idempotent, customer
    // just re-binds), so we skip confirmation and rely on the toast + refetch
    // for feedback. If accidental resets become an issue we can swap in an
    // in-app Glass modal like ModifyModal.
    const resetDevices = async (lic) => {
      if (busy) return;
      setBusy(lic.id);
      try {
        const res = await api().post('/admin/licenses/reset-devices', { license_id: lic.id, reason: 'admin reset' });
        const cleared = typeof res?.cleared === 'number' ? res.cleared : null;
        toast(cleared !== null ? `Devices reset (${cleared} cleared)` : 'Devices reset', 'success');
        await load();
      } catch (err) {
        toast(`Reset failed: ${err?.message || 'unknown'}`, 'warn');
      } finally { setBusy(null); }
    };

    const [editing, setEditing] = React.useState(null);

    const pages = Math.ceil(data.total / LIMIT);

    return (
      <div>
        <Glass style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={filters.search} onChange={(v) => { setPage(0); setFilters((f) => ({ ...f, search: v })); }}
                 placeholder="Search by key preview, email, name…" style={{ flex: 1, minWidth: 200 }}/>
          <Select value={filters.status} onChange={(v) => { setPage(0); setFilters((f) => ({ ...f, status: v || 'all' })); }}
                  options={[{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'revoked', label: 'Revoked' }]}/>
          <Select value={filters.product_id} onChange={(v) => { setPage(0); setFilters((f) => ({ ...f, product_id: v || '' })); }}
                  options={[{ value: '', label: 'All products' }, { value: 'gleipnir', label: 'Gleipnir' }, { value: 'star', label: 'Star' }]}/>
          {role === 'owner' && (
            <Select value={filters.sales_channel} onChange={(v) => { setPage(0); setFilters((f) => ({ ...f, sales_channel: v || '' })); }}
                    options={[
                      { value: '', label: 'All channels' },
                      { value: 'elyhub', label: 'ElyHub' },
                      { value: 'admin', label: 'Admin grant' },
                      { value: 'gift', label: 'Gift' },
                      { value: 'gumroad', label: 'Gumroad' },
                      { value: 'stripe', label: 'Stripe' },
                      { value: 'direct', label: 'Direct' },
                      { value: 'legacy', label: 'Legacy' },
                    ]}/>
          )}
          {/* Manual refresh — no websocket / live-poll yet, so admins who are
              mutating state via Supabase or another tab use this to pull the
              latest snapshot. Cheap (one POST) and idempotent. */}
          <Btn size="sm" variant="secondary" onClick={load} disabled={data.loading}>
            {data.loading ? 'Loading…' : 'Refresh'}
          </Btn>
        </Glass>

        <Glass style={{ padding: 0, overflow: 'hidden' }}>
          {data.loading ? <Spinner/> : data.items.length === 0 ? <EmptyState text="No licenses match these filters."/> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontSans, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `0.5px solid ${T.glassBorder}`, color: T.text3 }}>
                    {['Key', 'Product', 'Customer', 'Channel', 'Status', 'Devices', 'Expires', 'Created', ''].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lic) => {
                    const active = lic.is_active && !lic.revoked_at;
                    const who = lic.user_id ? `Discord: ${lic.user_id}` : (lic.customer_email || lic.customer_name || lic.customer_key || '—');
                    return (
                      <tr key={lic.id} style={{ borderBottom: `0.5px solid ${T.glassBorder}` }}>
                        <td style={{ padding: '10px 14px', fontFamily: T.fontMono, fontSize: 12, color: T.text2 }}>{lic.key_preview}</td>
                        <td style={{ padding: '10px 14px' }}>{lic.product_id}{lic.tier ? ` / ${lic.tier}` : ''}</td>
                        <td style={{ padding: '10px 14px', color: T.text2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</td>
                        <td style={{ padding: '10px 14px' }}><Tag muted>{lic.sales_channel || '—'}</Tag></td>
                        <td style={{ padding: '10px 14px' }}>
                          {active ? <Tag color={T.green} glow>active</Tag> : <Tag color={T.red}>revoked</Tag>}
                        </td>
                        <td style={{ padding: '10px 14px', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>{lic.activation_count}/{lic.max_devices}</td>
                        <td style={{ padding: '10px 14px', color: T.text2 }}>{formatDate(lic.expires_at)}</td>
                        <td style={{ padding: '10px 14px', color: T.text3, fontSize: 12, whiteSpace: 'nowrap' }} title={lic.created_at || lic.issued_at || ''}>
                          {formatRelative(lic.created_at || lic.issued_at)}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Btn size="sm" variant="ghost" onClick={() => setEditing(lic)} disabled={busy === lic.id}>Modify</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setActive(lic, !active)} disabled={busy === lic.id}>{active ? 'Disable' : 'Enable'}</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => resetDevices(lic)} disabled={busy === lic.id}>Reset</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Glass>

        {pages > 1 && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Btn size="sm" variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</Btn>
            <span style={{ color: T.text2, fontSize: 13 }}>Page {page + 1} of {pages} · {data.total} total</span>
            <Btn size="sm" variant="secondary" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Next →</Btn>
          </div>
        )}

        {editing && <ModifyModal license={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }}/>}
      </div>
    );
  }

  function ModifyModal({ license, onClose, onDone }) {
    const [changes, setChanges] = React.useState({
      tier: license.tier || '',
      max_devices: license.max_devices,
      expires_at: license.expires_at ? license.expires_at.slice(0, 10) : '',
    });
    const [saving, setSaving] = React.useState(false);

    const save = async () => {
      setSaving(true);
      try {
        const delta = {};
        if (changes.tier !== (license.tier || '')) delta.tier = changes.tier || null;
        if (Number(changes.max_devices) !== license.max_devices) delta.max_devices = Number(changes.max_devices);
        if (changes.expires_at !== (license.expires_at ? license.expires_at.slice(0, 10) : '')) {
          delta.expires_at = changes.expires_at ? new Date(changes.expires_at).toISOString() : null;
        }
        if (Object.keys(delta).length === 0) { onClose(); return; }
        await api().post('/admin/licenses/modify', { license_id: license.id, changes: delta, note: 'admin modify via panel' });
        toast('License updated', 'success');
        onDone();
      } catch (err) {
        toast(`Failed: ${err?.message || 'unknown'}`, 'warn');
      } finally { setSaving(false); }
    };

    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 50000, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(8px)',
      }}>
        <Glass onClick={(e) => e.stopPropagation()} style={{ padding: 28, maxWidth: 480, width: '100%' }}>
          <h2 style={{ ...TY.h2, margin: 0, marginBottom: 4 }}>Modify license</h2>
          <div style={{ color: T.text3, fontFamily: T.fontMono, fontSize: 12, marginBottom: 20 }}>{license.key_preview}</div>

          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Tier">
              <Input value={changes.tier} onChange={(v) => setChanges(c => ({ ...c, tier: v }))} placeholder="basic / pro / team"/>
            </Field>
            <Field label="Max devices">
              <Input type="number" value={changes.max_devices} onChange={(v) => setChanges(c => ({ ...c, max_devices: v }))}/>
            </Field>
            <Field label="Expires (leave blank = perpetual)">
              <Input type="date" value={changes.expires_at} onChange={(v) => setChanges(c => ({ ...c, expires_at: v }))}/>
            </Field>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Btn>
          </div>
        </Glass>
      </div>
    );
  }

  // ───────── Clients Tab ──────────────────────────────────────────────────

  function ClientsTab({ role }) {
    const [scope, setScope] = React.useState(role === 'owner' ? 'all' : 'elyhub');
    const [q, setQ] = React.useState('');
    const [data, setData] = React.useState({ loading: true, items: [], total: 0 });
    const [detail, setDetail] = React.useState(null);

    const load = React.useCallback(async () => {
      setData((d) => ({ ...d, loading: true }));
      try {
        const body = { scope, limit: 50 };
        if (q.trim()) body.q = q.trim();
        const res = await api().post('/admin/clients/list', body);
        setData({ loading: false, items: res?.items || [], total: res?.total || 0 });
      } catch (err) {
        setData({ loading: false, items: [], total: 0 });
        toast(`Load failed: ${err?.message || 'unknown'}`, 'warn');
      }
    }, [scope, q]);

    React.useEffect(() => { load(); }, [load]);

    const openDetail = async (client) => {
      if (role !== 'owner') {
        toast('Client detail is owner-only', 'warn');
        return;
      }
      try {
        const res = await api().post('/admin/clients/get', { customer_key: client.client_id });
        setDetail(res);
      } catch (err) {
        toast(`Failed: ${err?.message || 'unknown'}`, 'warn');
      }
    };

    return (
      <div>
        <Glass style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input value={q} onChange={setQ} placeholder="Search by email, name, Discord id…" style={{ flex: 1, minWidth: 200 }}/>
          {role === 'owner' && (
            <Segmented options={[{ value: 'elyhub', label: 'ElyHub' }, { value: 'all', label: 'All channels' }]}
                       value={scope} onChange={setScope}/>
          )}
          <Btn size="sm" variant="secondary" onClick={load} disabled={data.loading}>
            {data.loading ? 'Loading…' : 'Refresh'}
          </Btn>
        </Glass>

        <Glass style={{ padding: 0, overflow: 'hidden' }}>
          {data.loading ? <Spinner/> : data.items.length === 0 ? <EmptyState text="No clients yet."/> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontSans, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `0.5px solid ${T.glassBorder}`, color: T.text3 }}>
                    {['Customer', 'Products', 'Channels', 'Licenses', 'LTV', 'Last active', ''].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => {
                    const who = c.discord_id ? `Discord: ${c.discord_id}` : (c.email || c.name || c.client_id);
                    return (
                      <tr key={c.client_id} style={{ borderBottom: `0.5px solid ${T.glassBorder}` }}>
                        <td style={{ padding: '10px 14px', color: T.text2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</td>
                        <td style={{ padding: '10px 14px' }}>{(c.products || []).join(', ')}</td>
                        <td style={{ padding: '10px 14px' }}>{(c.channels || []).map(ch => <Tag key={ch} muted>{ch}</Tag>)}</td>
                        <td style={{ padding: '10px 14px', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>{c.active_licenses}/{c.total_licenses}</td>
                        <td style={{ padding: '10px 14px', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>
                          {c.lifetime_value_cents ? `${(c.lifetime_value_cents / 100).toFixed(0)} ${c.primary_currency || ''}` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: T.text2 }}>{formatDate(c.last_active_at)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          {role === 'owner' && <Btn size="sm" variant="ghost" onClick={() => openDetail(c)}>Details</Btn>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Glass>

        {detail && <ClientDetail data={detail} onClose={() => setDetail(null)}/>}
      </div>
    );
  }

  function ClientDetail({ data, onClose }) {
    const client = data.client || {};
    const licenses = data.licenses || [];
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 50000, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(8px)',
      }}>
        <Glass onClick={(e) => e.stopPropagation()} style={{ padding: 28, maxWidth: 680, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
          <h2 style={{ ...TY.h2, margin: 0, marginBottom: 4 }}>{client.name || client.email || client.discord_id || client.client_id}</h2>
          <div style={{ color: T.text3, fontFamily: T.fontMono, fontSize: 12, marginBottom: 16 }}>{client.client_id}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Glass level={2} style={{ padding: 14 }}>
              <div style={{ ...TY.small, color: T.text3 }}>Licenses</div>
              <div style={{ ...TY.h2, margin: 0 }}>{client.active_licenses}/{client.total_licenses}</div>
            </Glass>
            <Glass level={2} style={{ padding: 14 }}>
              <div style={{ ...TY.small, color: T.text3 }}>LTV</div>
              <div style={{ ...TY.h2, margin: 0 }}>{client.lifetime_value_cents ? (client.lifetime_value_cents / 100).toFixed(0) : 0} {client.primary_currency || ''}</div>
            </Glass>
            <Glass level={2} style={{ padding: 14 }}>
              <div style={{ ...TY.small, color: T.text3 }}>First</div>
              <div style={{ ...TY.body }}>{formatDate(client.first_purchase_at)}</div>
            </Glass>
          </div>

          <h3 style={{ ...TY.h3, marginBottom: 10 }}>Licenses</h3>
          {licenses.map((lic) => (
            <Glass key={lic.id} level={2} style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 12 }}>{lic.key_preview}</div>
              <div style={{ flex: 1, color: T.text2 }}>{lic.product_id}{lic.tier ? ` / ${lic.tier}` : ''}</div>
              <Tag color={lic.is_active ? T.green : T.red}>{lic.is_active ? 'active' : 'revoked'}</Tag>
            </Glass>
          ))}

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Btn variant="secondary" onClick={onClose}>Close</Btn>
          </div>
        </Glass>
      </div>
    );
  }

  // ───────── Grant Tab ────────────────────────────────────────────────────

  function GrantTab({ role }) {
    const [form, setForm] = React.useState({
      product_id: 'gleipnir',
      tier: 'basic',
      sales_channel: 'admin',
      user_id: '',
      customer_email: '',
      customer_name: '',
      external_ref: '',
      external_platform: '',
      amount_cents: '',
      currency: 'AURA',
      expires_at: '',
      max_devices: 2,
      note: '',
    });
    const [busy, setBusy] = React.useState(false);
    const [result, setResult] = React.useState(null);

    const isExternal = ['gumroad', 'stripe', 'direct', 'pix'].includes(form.sales_channel);
    const canPickExternal = role === 'owner';

    // Server needs SOME customer identity to attach the license to — either a
    // Discord id (internal grant) or an email (external channels). Without
    // either it would create an unreachable orphan. Validate client-side so
    // the user gets a clear message instead of a generic server error.
    const hasIdentity = !!(form.user_id.trim() || form.customer_email.trim());

    const submit = async () => {
      if (busy) return;
      if (!hasIdentity) {
        toast('Need a Discord id or customer email to attach the license to', 'warn');
        return;
      }
      setBusy(true);
      setResult(null);
      try {
        const body = {
          product_id: form.product_id,
          sales_channel: form.sales_channel,
          tier: form.tier || undefined,
          max_devices: Number(form.max_devices) || undefined,
        };
        if (form.user_id.trim()) body.user_id = form.user_id.trim();
        if (form.customer_email.trim()) body.customer_email = form.customer_email.trim();
        if (form.customer_name.trim()) body.customer_name = form.customer_name.trim();
        if (form.external_ref.trim()) body.external_ref = form.external_ref.trim();
        if (form.external_platform.trim()) body.external_platform = form.external_platform.trim();
        if (form.amount_cents) body.amount_cents = Number(form.amount_cents);
        if (form.currency) body.currency = form.currency;
        if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
        if (form.note.trim()) body.note = form.note.trim();

        const res = await api().post('/admin/licenses/grant', body);
        if (res?.ok && res.license_key) {
          setResult(res);
          toast('License granted', 'success');
        } else {
          toast(`Failed: ${res?.error || 'unknown'}`, 'warn');
        }
      } catch (err) {
        toast(`Failed: ${err?.message || 'unknown'}`, 'warn');
      } finally { setBusy(false); }
    };

    const channelOpts = [
      { value: 'admin', label: 'Admin (internal)' },
      { value: 'gift', label: 'Gift' },
      ...(canPickExternal ? [
        { value: 'direct', label: 'Direct' },
        { value: 'gumroad', label: 'Gumroad' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'pix', label: 'PIX' },
      ] : []),
    ];

    return (
      <Glass style={{ padding: 24, maxWidth: 680 }}>
        <h2 style={{ ...TY.h2, margin: 0, marginBottom: 4 }}>Grant license</h2>
        <div style={{ ...TY.body, color: T.text2, marginBottom: 24 }}>
          {role === 'admin'
            ? 'Issue internal licenses (admin / gift). External channels are owner-only.'
            : 'Issue any license type. External channels capture PII for audit.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <Field label="Product">
            <Select value={form.product_id} onChange={(v) => setForm(f => ({ ...f, product_id: v }))}
                    options={[{ value: 'gleipnir', label: 'Gleipnir' }, { value: 'star', label: 'Star' }]}/>
          </Field>
          <Field label="Tier">
            <Select value={form.tier} onChange={(v) => setForm(f => ({ ...f, tier: v }))}
                    options={[{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }, { value: 'team', label: 'Team' }]}/>
          </Field>
          <Field label="Channel">
            <Select value={form.sales_channel} onChange={(v) => setForm(f => ({ ...f, sales_channel: v }))} options={channelOpts}/>
          </Field>
          <Field label="Max devices">
            <Input type="number" value={form.max_devices} onChange={(v) => setForm(f => ({ ...f, max_devices: v }))}/>
          </Field>
          <Field label={isExternal ? 'Discord user id (optional)' : 'Discord user id'}>
            <Input value={form.user_id} onChange={(v) => setForm(f => ({ ...f, user_id: v }))} placeholder="e.g. 264327419027128320"/>
            {!isExternal && (
              <div style={{ ...TY.small, color: T.text3, marginTop: 4, fontSize: 11 }}>
                Required for internal grants — licenses need a Discord id or customer email.
              </div>
            )}
          </Field>
          <Field label="Expires (blank = perpetual)">
            <Input type="date" value={form.expires_at} onChange={(v) => setForm(f => ({ ...f, expires_at: v }))}/>
          </Field>
          {isExternal && (
            <>
              <Field label="Customer email">
                <Input type="email" value={form.customer_email} onChange={(v) => setForm(f => ({ ...f, customer_email: v }))}/>
              </Field>
              <Field label="Customer name">
                <Input value={form.customer_name} onChange={(v) => setForm(f => ({ ...f, customer_name: v }))}/>
              </Field>
              <Field label="External ref">
                <Input value={form.external_ref} onChange={(v) => setForm(f => ({ ...f, external_ref: v }))} placeholder="Gumroad purchase id etc"/>
              </Field>
              <Field label="External platform">
                <Input value={form.external_platform} onChange={(v) => setForm(f => ({ ...f, external_platform: v }))}/>
              </Field>
              <Field label="Amount (cents)">
                <Input type="number" value={form.amount_cents} onChange={(v) => setForm(f => ({ ...f, amount_cents: v }))}/>
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onChange={(v) => setForm(f => ({ ...f, currency: v }))}
                        options={[{ value: 'AURA', label: 'AURA' }, { value: 'BRL', label: 'BRL' }, { value: 'USD', label: 'USD' }]}/>
              </Field>
            </>
          )}
          <Field label="Note (audit only)">
            <Input value={form.note} onChange={(v) => setForm(f => ({ ...f, note: v }))} placeholder="reason / context"/>
          </Field>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="primary" onClick={submit} disabled={busy || !hasIdentity}>{busy ? 'Granting…' : 'Grant license'}</Btn>
        </div>

        {result && (
          <Glass level={2} style={{ padding: 16, marginTop: 20 }}>
            <div style={{ ...TY.small, color: T.text3, marginBottom: 4 }}>License issued</div>
            <div style={{ fontFamily: T.fontMono, fontSize: 14, userSelect: 'all' }}>{result.license_key}</div>
            <div style={{ color: T.text2, fontSize: 12, marginTop: 4 }}>
              id: {result.license_id} · expires: {result.expires_at ? formatDate(result.expires_at) : 'perpetual'}
            </div>
          </Glass>
        )}
      </Glass>
    );
  }

  // ───────── Aura Tab — owner-only inject / deduct ────────────────────────

  function AuraTab() {
    const [members, setMembers]   = React.useState([]);
    const [search, setSearch]     = React.useState('');
    const [selected, setSelected] = React.useState(null); // { id, name, avatar_url, aura }
    const [delta, setDelta]       = React.useState('');
    const [note, setNote]         = React.useState('');
    const [busy, setBusy]         = React.useState(false);
    const [result, setResult]     = React.useState(null); // { ok, delta, name }

    // Load full member list once on mount.
    React.useEffect(() => {
      api().get('/members?sort=name&limit=300')
        .then((r) => setMembers(r.items || []))
        .catch(() => {});
    }, []);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? members.filter((m) => (m.name || '').toLowerCase().includes(q) || m.id.includes(q))
      : members;

    async function handleSubmit() {
      const d = Number(delta);
      if (!selected || !Number.isFinite(d) || d === 0) return;
      setBusy(true);
      setResult(null);
      try {
        const res = await api().post('/admin/aura', { userId: selected.id, delta: d, note: note || undefined });
        if (res.ok) {
          const dir = d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString();
          toast(`${dir} aura → ${selected.name}`, 'success');
          setResult({ ok: true, delta: d, name: selected.name });
          setDelta('');
          setNote('');
          setSelected(null);
          setSearch('');
        }
      } catch (e) {
        toast(e.message || 'Failed', 'error');
      } finally {
        setBusy(false);
      }
    }

    const deltaNum = Number(delta);
    const valid = selected && Number.isFinite(deltaNum) && deltaNum !== 0;

    return (
      <Glass style={{ padding: 28, maxWidth: 560 }}>
        <div style={{ ...TY.h3, marginBottom: 4 }}>Aura Adjustment</div>
        <div style={{ ...TY.small, color: T.text3, marginBottom: 24 }}>
          Positive = inject, negative = deduct. Logged to aura_log with kind=admin.
        </div>

        {/* Member picker */}
        {!selected ? (
          <div style={{ marginBottom: 20 }}>
            <Field label="Member">
              <Input value={search} onChange={setSearch} placeholder="Search by name or ID…" style={{ width: '100%', boxSizing: 'border-box' }}/>
            </Field>
            <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.slice(0, 40).map((m) => (
                <button key={m.id} onClick={() => { setSelected(m); setSearch(m.name); }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '8px 10px', borderRadius: T.r.sm, display: 'flex',
                    alignItems: 'center', gap: 10, color: T.text, textAlign: 'left',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  {m.avatar_url
                    ? <img src={m.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%' }} alt=""/>
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{(m.name||'?')[0].toUpperCase()}</div>}
                  <div>
                    <div style={{ ...TY.small, color: T.text, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ ...TY.micro, color: T.text3 }}>{m.aura?.toLocaleString()} aura · L{m.level}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: T.r.md }}>
            {selected.avatar_url
              ? <img src={selected.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%' }} alt=""/>
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>{(selected.name||'?')[0].toUpperCase()}</div>}
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.body, fontWeight: 500 }}>{selected.name}</div>
              <div style={{ ...TY.micro, color: T.text3 }}>{selected.aura?.toLocaleString()} aura · L{selected.level}</div>
            </div>
            <button onClick={() => { setSelected(null); setSearch(''); setDelta(''); setNote(''); }}
              style={{ background: 'transparent', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Amount + note */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <Field label="Delta (+ inject  /  − deduct)" style={{ flex: 1 }}>
            <Input type="number" value={delta} onChange={setDelta} placeholder="e.g. 5000 or -2000" style={{ width: '100%', boxSizing: 'border-box' }}/>
          </Field>
        </div>
        <Field label="Note (optional)">
          <Input value={note} onChange={setNote} placeholder="Reason…" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}/>
        </Field>

        {/* Preview */}
        {valid && (
          <div style={{
            padding: '10px 14px', borderRadius: T.r.md, marginBottom: 16,
            background: deltaNum > 0 ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
            border: `0.5px solid ${deltaNum > 0 ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
            ...TY.small, color: deltaNum > 0 ? '#4ade80' : '#f87171',
          }}>
            {deltaNum > 0 ? '+' : ''}{deltaNum.toLocaleString()} aura → {selected?.name}
            {selected && typeof selected.aura === 'number' && (
              <span style={{ color: T.text3 }}>
                {' '}(new balance: ~{Math.max(0, selected.aura + deltaNum).toLocaleString()})
              </span>
            )}
          </div>
        )}

        <button
          disabled={!valid || busy}
          onClick={handleSubmit}
          style={{
            width: '100%', height: 40, borderRadius: T.r.md, border: 'none',
            background: valid ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
            color: valid ? '#fff' : T.text3, fontFamily: T.fontSans, fontWeight: 600,
            fontSize: 14, cursor: valid ? 'pointer' : 'not-allowed', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Sending…' : 'Apply'}
        </button>

        {result?.ok && (
          <div style={{ marginTop: 14, ...TY.small, color: '#4ade80', textAlign: 'center' }}>
            ✓ {result.delta > 0 ? '+' : ''}{result.delta.toLocaleString()} applied to {result.name}
          </div>
        )}
      </Glass>
    );
  }

  // ───────── Main AdminView ───────────────────────────────────────────────

  function AdminView() {
    const { loading, role, error } = useAdminRole();
    const [tab, setTab] = React.useState('licenses');

    if (loading) return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
        <Header title="Admin" subtitle="Resolving access…"/>
        <Spinner/>
      </div>
    );

    if (!role || error) return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
        <Header title="Admin"/>
        <Glass style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ ...TY.h3, marginBottom: 8 }}>Forbidden</h2>
          <div style={{ color: T.text2 }}>You don't have admin access. This tab shouldn't be visible to you — please refresh.</div>
        </Glass>
      </div>
    );

    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
        <Header
          title="Admin"
          subtitle={`Kassa licenses · role: ${role}`}
          right={
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'licenses', label: 'Licenses' },
                { value: 'clients',  label: 'Clients' },
                { value: 'grant',    label: 'Grant' },
                ...(role === 'owner' ? [{ value: 'aura', label: 'Aura ✦' }] : []),
              ]}
            />
          }
        />
        {tab === 'licenses' && <LicensesTab role={role}/>}
        {tab === 'clients'  && <ClientsTab role={role}/>}
        {tab === 'grant'    && <GrantTab role={role}/>}
        {tab === 'aura'     && role === 'owner' && <AuraTab/>}
      </div>
    );
  }

  // Expose so app.jsx can route to it.
  window.AdminView = AdminView;
})();
