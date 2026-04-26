// My Licenses — user-facing license management. Lists every Kassa license the
// signed-in user owns, with status, device usage, expiry, and self-service
// reset-devices (rate-limited server-side to 1/24h per license).
//
// Unlike admin.jsx, this view is ALWAYS available to authenticated users —
// it just shows an empty state if the user hasn't bought any Kassa products
// yet. The Worker /me/licenses endpoint internally calls the admin Supabase
// fn with a forced user_id filter, so we can't leak other users' data even
// if someone spoofs the client.

(() => {
  const api = () => window.ElyAPI;
  const toast = (msg, kind = 'info') => { try { window.ElyNotify?.toast?.({ text: msg, kind }); } catch {} };

  function formatDate(d) {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return String(d); }
  }

  // Relative-time string for expires_at — "in 12 days", "expired 3 days ago".
  // Used to push the user toward renewal when a license is close to running
  // out. Returns null if no expiry (perpetual).
  function relativeExpiry(d) {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (!Number.isFinite(t)) return null;
    const deltaMs = t - Date.now();
    const days = Math.round(deltaMs / 86_400_000);
    if (days > 30) return `in ${days} days`;
    if (days > 1)  return `in ${days} days`;
    if (days === 1) return 'tomorrow';
    if (days === 0) return 'today';
    if (days === -1) return 'yesterday';
    return `${Math.abs(days)} days ago`;
  }

  // ───────── License Card ────────────────────────────────────────────────────

  function LicenseCard({ lic, onReset, busy, cooldownSec }) {
    const active = lic.is_active && !lic.revoked_at;
    // Admins sometimes set max_devices to a huge number as a "no device limit"
    // signal. Treat anything > 999 as "Unlimited" — the counter is useless
    // at those scales and looks silly ("0/99999999").
    const unlimited = (lic.max_devices ?? 0) > 999;
    const devicesLabel = unlimited
      ? `${lic.activation_count ?? 0} · Unlimited`
      : `${lic.activation_count ?? 0}/${lic.max_devices ?? 0}`;
    const devicesPct = !unlimited && lic.max_devices > 0
      ? Math.min(100, Math.round(((lic.activation_count ?? 0) / lic.max_devices) * 100))
      : 0;
    const devicesFull = !unlimited && (lic.activation_count ?? 0) >= (lic.max_devices ?? 0);
    const expRel = relativeExpiry(lic.expires_at);
    const expWarn = lic.expires_at && (new Date(lic.expires_at).getTime() - Date.now()) < 7 * 86_400_000;
    const expired = lic.expires_at && new Date(lic.expires_at).getTime() < Date.now();

    // Reveal state — plaintext is in lic.license_key when the Worker matched
    // it via user_library. When null, we hide the reveal button entirely (no
    // "Reveal" that can't reveal anything).
    const [revealed, setRevealed] = React.useState(false);
    const hasPlaintext = !!lic.license_key;
    const shownKey = revealed && hasPlaintext ? lic.license_key : lic.key_preview;

    const copyKey = async () => {
      const text = hasPlaintext ? lic.license_key : (lic.key_preview || '');
      try {
        await navigator.clipboard.writeText(text);
        toast(hasPlaintext ? 'License key copied' : 'Key preview copied', 'success');
      } catch { toast('Copy failed', 'warn'); }
    };

    return (
      <Glass style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title row — product + status chip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: T.r.md, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.lilac}, ${T.accentHi})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20,
            boxShadow: `0 4px 14px ${T.lilac}44`,
          }}>
            {(lic.product_id || '?').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 15 }}>
              {lic.product_name || lic.product_id || 'Kassa product'}
              {lic.tier && <span style={{ color: T.text3, fontWeight: 400 }}> · {lic.tier}</span>}
            </div>
            <div style={{
              ...TY.small, color: T.text3, fontFamily: T.fontMono,
              fontSize: 11, marginTop: 4,
              wordBreak: 'break-all', // long revealed keys need to wrap
            }}>
              {shownKey}
            </div>
          </div>
          {active
            ? <Tag color={T.green} glow>active</Tag>
            : expired
              ? <Tag color={T.red}>expired</Tag>
              : <Tag color={T.red}>revoked</Tag>}
        </div>

        {/* Stats row — devices + expiry */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          padding: '12px 14px',
          borderRadius: T.r.md,
          background: 'rgba(255,255,255,0.025)',
          border: `0.5px solid ${T.glassBorder}`,
        }}>
          <div>
            <div style={{ ...TY.micro, color: T.text3, letterSpacing: '0.08em', fontSize: 10 }}>DEVICES</div>
            <div style={{ ...TY.body, color: devicesFull ? '#f5c451' : T.text, fontWeight: 600, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {devicesLabel}
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${devicesPct}%`,
                background: devicesFull ? '#f5c451' : T.accentHi, borderRadius: 2,
                transition: 'width 240ms ease',
              }}/>
            </div>
          </div>
          <div>
            <div style={{ ...TY.micro, color: T.text3, letterSpacing: '0.08em', fontSize: 10 }}>EXPIRES</div>
            <div style={{ ...TY.body, color: expWarn ? '#f5c451' : T.text, fontWeight: 600, marginTop: 3 }}>
              {lic.expires_at ? formatDate(lic.expires_at) : 'Perpetual'}
            </div>
            {expRel && (
              <div style={{ ...TY.small, color: expWarn ? '#f5c451' : T.text3, fontSize: 11, marginTop: 2 }}>
                {expired ? `${expRel}` : `expires ${expRel}`}
              </div>
            )}
          </div>
        </div>

        {/* Actions — Copy/Reveal only show when we have the plaintext. The
            preview alone ("KC-FC96-…-B983") can't activate the plugin, so
            offering "Copy preview" would just confuse users who try to paste
            it. Admin-granted licenses have no user_library row and therefore
            no plaintext — for those we surface a hint about where to get the
            key instead of a button that copies garbage. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasPlaintext && (
            <>
              <Btn size="sm" variant="secondary" onClick={() => setRevealed((v) => !v)}>
                {revealed ? 'Hide key' : 'Reveal key'}
              </Btn>
              <Btn size="sm" variant="secondary" onClick={copyKey}>Copy key</Btn>
            </>
          )}
          <Btn size="sm" variant="ghost"
               onClick={() => onReset(lic)}
               disabled={busy === lic.id || !active || cooldownSec > 0}>
            {busy === lic.id
              ? 'Resetting…'
              : cooldownSec > 0
                ? `Wait ${Math.ceil(cooldownSec / 3600)}h`
                : 'Reset devices'}
          </Btn>
        </div>
        {!hasPlaintext && active && (
          <div style={{ ...TY.small, color: T.text3, fontSize: 12 }}>
            This license was granted manually and the full key isn't stored here — contact support to receive it.
          </div>
        )}
        {!active && (
          <div style={{ ...TY.small, color: T.text3, fontSize: 12 }}>
            {expired
              ? 'This license has expired. Renewal coming soon.'
              : 'This license has been revoked. Contact support if you think this is a mistake.'}
          </div>
        )}
      </Glass>
    );
  }

  // ───────── Main view ───────────────────────────────────────────────────────

  function MyLicensesView() {
    const [data, setData] = React.useState({ loading: true, items: [], error: null });
    const [busy, setBusy] = React.useState(null);
    // Per-license cooldown map, key = license_id → seconds remaining. Set
    // when the server returns 429 so we show a timer instead of a button.
    const [cooldowns, setCooldowns] = React.useState({});

    const load = React.useCallback(async () => {
      setData((d) => ({ ...d, loading: true }));
      try {
        const res = await api().get('/me/licenses');
        const items = Array.isArray(res?.items) ? res.items : [];
        setData({ loading: false, items, error: null });
      } catch (err) {
        setData({ loading: false, items: [], error: err?.message || 'load_failed' });
      }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    // Tick cooldowns every second so the "Wait 12h" button label stays live.
    React.useEffect(() => {
      if (Object.keys(cooldowns).length === 0) return undefined;
      const id = setInterval(() => {
        setCooldowns((prev) => {
          const next = {};
          let changed = false;
          for (const [k, v] of Object.entries(prev)) {
            if (v > 1) next[k] = v - 1; else changed = true;
          }
          if (!changed && Object.keys(next).length === Object.keys(prev).length) return prev;
          return next;
        });
      }, 1000);
      return () => clearInterval(id);
    }, [cooldowns]);

    const resetDevices = async (lic) => {
      if (busy) return;
      setBusy(lic.id);
      try {
        const res = await api().post(`/me/licenses/${lic.id}/reset-devices`, {});
        const cleared = typeof res?.cleared === 'number' ? res.cleared : null;
        toast(cleared !== null ? `Devices reset (${cleared} cleared)` : 'Devices reset', 'success');
        await load();
      } catch (err) {
        // 429 → surface cooldown. The Worker returns retry_after_sec.
        if (err?.status === 429) {
          const sec = Number(err?.body?.retry_after_sec || err?.retry_after_sec || 86400);
          setCooldowns((c) => ({ ...c, [lic.id]: sec }));
          toast(`You can reset again in ${Math.ceil(sec / 3600)}h`, 'warn');
        } else {
          toast(`Reset failed: ${err?.message || 'unknown'}`, 'warn');
        }
      } finally {
        setBusy(null);
      }
    };

    if (data.loading) {
      return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <h1 style={{ ...TY.h1, margin: 0, marginBottom: 6 }}>My Licenses</h1>
          <div style={{ color: T.text2, marginBottom: 24 }}>Loading your licenses…</div>
          <Glass style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Loading…</Glass>
        </div>
      );
    }

    if (data.error) {
      return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <h1 style={{ ...TY.h1, margin: 0, marginBottom: 6 }}>My Licenses</h1>
          <Glass style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2, marginBottom: 12 }}>Couldn't load licenses.</div>
            <Btn size="sm" variant="secondary" onClick={load}>Try again</Btn>
          </Glass>
        </div>
      );
    }

    const activeCount = data.items.filter((l) => l.is_active && !l.revoked_at).length;

    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ ...TY.h1, margin: 0 }}>My Licenses</h1>
            <div style={{ ...TY.body, color: T.text2, marginTop: 6 }}>
              {data.items.length === 0
                ? 'Licenses from Kassa plugins you own will show up here.'
                : `${activeCount} active · ${data.items.length} total`}
            </div>
          </div>
          <Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn>
        </div>

        {data.items.length === 0 ? (
          <Glass style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 14 }}>🔑</div>
            <div style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 16 }}>No licenses yet</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
              Subscribe to Hugin or any other Kassa plugin from the marketplace to get started.
            </div>
          </Glass>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {data.items.map((lic) => (
              <LicenseCard key={lic.id}
                           lic={lic}
                           onReset={resetDevices}
                           busy={busy}
                           cooldownSec={cooldowns[lic.id] || 0}/>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.MyLicensesView = MyLicensesView;
})();
