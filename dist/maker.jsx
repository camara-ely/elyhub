// Maker Studio — dashboard for anyone selling plugins/assets on ElyHub.
// Scoped to the signed-in user's own listings (enforced server-side via
// seller_id = session.uid). Shows:
//   • Headline stats: active licenses, total issued, revenue (aura)
//   • Per-product cards with revenue + license count
//   • Recent license issuance feed (preview-only, never plaintext keys)
//
// If the user has no Kassa-backed listings, we show an empty state pointing
// them at the Publish modal with a hint about the new Licensing block.
//
// The nav item only surfaces when the /maker/overview response indicates at
// least one product — regular users never see the tab.

(() => {
  const api = () => window.ElyAPI;
  const toast = (msg, kind = 'info') => { try { window.ElyNotify?.toast?.({ text: msg, kind }); } catch {} };

  function fmtAura(n) { return (Number(n) || 0).toLocaleString(); }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return String(d); }
  }
  function relTime(d) {
    if (!d) return '';
    const ts = new Date(d).getTime();
    if (!Number.isFinite(ts)) return '';
    const delta = (Date.now() - ts) / 1000;
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.round(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.round(delta / 3600)}h ago`;
    return `${Math.round(delta / 86400)}d ago`;
  }

  // ───────── Product card ─────────────────────────────────────────────────────

  function ProductCard({ p }) {
    const T = window.T || {};
    const TY = window.TY || {};
    const tierLabel = p.tier ? ` · ${p.tier}` : '';
    const hasCounts = p.licenses_active != null && p.licenses_total != null;
    return (
      <div style={{
        padding: 14, borderRadius: T.r?.md || 10,
        background: 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${T.glassBorder}`,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...TY.body, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.title}
            </div>
            <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 2 }}>
              {p.product_id}{tierLabel}
            </div>
          </div>
          <span style={{
            padding: '2px 8px', borderRadius: T.r?.pill || 999,
            fontSize: 10, fontWeight: 600,
            background: p.status === 'published' ? `${T.accent}22` : 'rgba(255,255,255,0.06)',
            color: p.status === 'published' ? T.accentHi : T.text3,
            border: `0.5px solid ${p.status === 'published' ? T.accent + '55' : T.glassBorder}`,
            whiteSpace: 'nowrap',
          }}>{p.status}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Metric label="ACTIVE" value={hasCounts ? p.licenses_active : '—'} accent/>
          <Metric label="TOTAL" value={hasCounts ? p.licenses_total : '—'}/>
          <Metric label="REVENUE" value={fmtAura(p.revenue_aura)} suffix="aura"/>
        </div>
      </div>
    );
  }

  function Metric({ label, value, suffix, accent }) {
    const T = window.T || {};
    const TY = window.TY || {};
    return (
      <div style={{
        padding: '8px 10px', borderRadius: T.r?.sm || 8,
        background: 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${T.glassBorder}`,
      }}>
        <div style={{ ...TY.small, fontSize: 9, color: T.text3, fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
        <div style={{ ...TY.body, fontWeight: 700, color: accent ? T.accentHi : T.text, marginTop: 2 }}>
          {value}{suffix ? <span style={{ color: T.text3, fontWeight: 400, fontSize: 10, marginLeft: 4 }}>{suffix}</span> : null}
        </div>
      </div>
    );
  }

  // ───────── Recent licenses row ──────────────────────────────────────────────

  function LicenseRow({ lic }) {
    const T = window.T || {};
    const TY = window.TY || {};
    const revoked = !!lic.revoked_at;
    const expired = lic.expires_at && new Date(lic.expires_at).getTime() < Date.now();
    const status = revoked ? 'revoked' : expired ? 'expired' : 'active';
    const color = revoked ? T.red : expired ? '#f5c451' : T.accentHi;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
        borderBottom: `0.5px solid ${T.glassBorder}`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, flexShrink: 0,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TY.small, color: T.text, fontWeight: 600, fontSize: 12 }}>
            {lic.product_id}{lic.tier ? ` · ${lic.tier}` : ''}
          </div>
          <div style={{ ...TY.small, fontSize: 10, color: T.text3, fontFamily: T.fontMono || 'monospace' }}>
            {lic.key_preview || '—'}
          </div>
        </div>
        <div style={{ ...TY.small, fontSize: 10, color: T.text3, textAlign: 'right' }}>
          <div>{relTime(lic.issued_at)}</div>
          <div style={{ color, fontWeight: 600, marginTop: 1 }}>{status}</div>
        </div>
      </div>
    );
  }

  // ───────── Main view ────────────────────────────────────────────────────────

  function MakerView() {
    const T = window.T || {};
    const TY = window.TY || {};
    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState(null);
    const [licenses, setLicenses] = React.useState([]);
    const [err, setErr] = React.useState(null);

    const load = React.useCallback(async () => {
      setLoading(true); setErr(null);
      try {
        const [o, l] = await Promise.all([
          api().get('/maker/overview'),
          api().get('/maker/licenses?limit=20').catch(() => ({ items: [] })),
        ]);
        setData(o);
        setLicenses(Array.isArray(l?.items) ? l.items : []);
      } catch (e) {
        setErr(e?.message || 'Failed to load');
        toast('Failed to load maker overview', 'warn');
      } finally { setLoading(false); }
    }, []);
    React.useEffect(() => { load(); }, [load]);

    if (loading) {
      return (
        <div style={{ padding: 24, color: T.text3 }}>Loading maker dashboard…</div>
      );
    }
    if (err) {
      return (
        <div style={{ padding: 24 }}>
          <div style={{ ...TY.body, color: T.red }}>Error: {err}</div>
          <button onClick={load} style={{
            marginTop: 10, padding: '8px 14px', borderRadius: T.r?.pill || 999,
            background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${T.glassBorder}`,
            color: T.text, cursor: 'pointer',
          }}>Retry</button>
        </div>
      );
    }

    const products = data?.products || [];
    const totals = data?.totals || { products: 0, licenses_active: 0, licenses_total: 0, revenue_aura: 0 };

    // Empty state — user has no Kassa-backed listings yet.
    if (!products.length) {
      return (
        <div style={{ padding: 28, maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ ...TY.h2, marginBottom: 8 }}>Maker Studio</h2>
          <div style={{ ...TY.body, color: T.text3, marginBottom: 20 }}>
            Nothing here yet. To start selling plugins with license keys, publish a listing and fill the <b>🔑 Licensing</b> block with a product id like <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>my-plugin</code>.
          </div>
          <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
            Every purchase will automatically issue a license your buyer can view in <b>My Licenses</b>. You'll see sales, revenue and active installs here.
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px 24px 40px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ ...TY.h2, margin: 0 }}>Maker Studio</h2>
          <button onClick={load} title="Refresh" style={{
            padding: '6px 12px', borderRadius: T.r?.pill || 999,
            background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
            color: T.text2, fontSize: 12, cursor: 'pointer',
          }}>↻ Refresh</button>
        </div>

        {/* Headline totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
          <Metric label="PRODUCTS" value={totals.products}/>
          <Metric label="ACTIVE LICENSES" value={totals.licenses_active} accent/>
          <Metric label="TOTAL ISSUED" value={totals.licenses_total}/>
          <Metric label="REVENUE" value={fmtAura(totals.revenue_aura)} suffix="aura" accent/>
        </div>

        {/* Product cards */}
        <div style={{ ...TY.small, color: T.text3, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, fontSize: 11 }}>
          PRODUCTS ({products.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
          {products.map((p) => <ProductCard key={p.listing_id} p={p}/>)}
        </div>

        {/* Recent licenses */}
        <div style={{ ...TY.small, color: T.text3, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, fontSize: 11 }}>
          RECENT LICENSES ({licenses.length})
        </div>
        <div style={{
          padding: '0 14px', borderRadius: T.r?.md || 10,
          background: 'rgba(255,255,255,0.02)',
          border: `0.5px solid ${T.glassBorder}`,
        }}>
          {licenses.length === 0
            ? <div style={{ padding: 14, ...TY.small, color: T.text3, textAlign: 'center' }}>No licenses issued yet.</div>
            : licenses.map((lic) => <LicenseRow key={lic.id} lic={lic}/>)}
        </div>
      </div>
    );
  }

  window.MakerView = MakerView;

  // Hook for shell.jsx to decide whether to show the Maker nav item. Probes
  // /maker/overview once per mount and caches on window so the nav stays
  // stable across re-renders. Falsy if request fails or user has 0 products.
  function useHasMakerProducts() {
    const [has, setHas] = React.useState(!!window.__HAS_MAKER_PRODUCTS);
    React.useEffect(() => {
      if (window.__MAKER_PROBE_DONE) return;
      window.__MAKER_PROBE_DONE = true;
      (async () => {
        try {
          if (!api()?.isSignedIn?.()) return;
          const res = await api().get('/maker/overview');
          const hasProducts = (res?.products?.length || 0) > 0;
          window.__HAS_MAKER_PRODUCTS = hasProducts;
          setHas(hasProducts);
        } catch { /* not signed in or 401 — stay hidden */ }
      })();
    }, []);
    return has;
  }
  window.useHasMakerProducts = useHasMakerProducts;
})();
