// ElyHub — Cartographer (vintage) leaderboard + trophies views.
//
// Mounted only when T.cartographer is true. Hosts two full-page views that
// the host home.jsx delegates to:
//   • CartographerLeaderboardView — "Tábua dos Navegantes" with period tabs
//   • CartographerTrophiesView    — vintage achievement cartouches

// ─── CartographerLeaderboardView ─────────────────────────────────────────
// Equivalent of LeaderboardView in home.jsx. Five categories (overall, gym,
// daily, weekly, monthly) — same data the host view uses. Top 1 is a hero
// row with full wax seal, ranks II/III on a podium strip, IV+ in a
// bordered ledger table. Owner already filtered server-side via
// LEADERBOARD_HIDDEN_IDS.
function CartographerLeaderboardView({ state, focusId, onQuick }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const bearingOf = window.bearingOf || (() => 0);
  const coordsOf = window.coordsOf || (() => ({ lat: '0.00', lon: '0.00', latDir: 'N', lonDir: 'E' }));
  const elevationOf = window.elevationOf || (() => 0);
  const romanOf = window.romanOf || ((n) => String(n));

  // Same five tabs as the host. "Period" tabs hit /me/leaderboard which
  // returns aura-gained-in-window (after our timestamp fix).
  const [category, setCategory] = React.useState('overall');
  const [periodData, setPeriodData] = React.useState({});
  const [periodLoading, setPeriodLoading] = React.useState(false);

  const isPeriod = category === 'daily' || category === 'weekly' || category === 'monthly';

  React.useEffect(() => {
    if (!isPeriod || periodData[category]) return;
    setPeriodLoading(true);
    (window.ElyAPI?.get?.(`/me/leaderboard?period=${category}`) || Promise.resolve(null))
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setPeriodData((prev) => ({ ...prev, [category]: res.items }));
        }
      })
      .catch(() => {})
      .finally(() => setPeriodLoading(false));
  }, [category, isPeriod, periodData]);

  // Build the working list. Period tabs use the API response; overall/gym
  // use the local MEMBERS snapshot (which the poll keeps fresh).
  const members = window.MEMBERS || [];
  const ordered = React.useMemo(() => {
    if (isPeriod) {
      const items = periodData[category] || [];
      return items.map((r) => ({
        id: r.id, name: r.name, avatar: r.avatar_url,
        aura: r.gained, level: r.level, _gained: r.gained,
      }));
    }
    if (category === 'gym') {
      return [...members].sort((a, b) => (b.gymPosts || 0) - (a.gymPosts || 0));
    }
    return [...members].sort((a, b) => (b.aura || 0) - (a.aura || 0));
  }, [category, isPeriod, periodData, members]);

  const tabs = [
    { id: 'overall', label: tc('lb.tab.overall') },
    { id: 'gym',     label: tc('lb.tab.gym') },
    { id: 'daily',   label: tc('lb.tab.daily') },
    { id: 'weekly',  label: tc('lb.tab.weekly') },
    { id: 'monthly', label: tc('lb.tab.monthly') },
  ];

  const periodLabel = tc(`lb.period.${category}`);

  const Top1 = ordered[0];
  const Rest = ordered.slice(1, 24);   // II–XXIV

  // Mock today's elevation per row — Modern's idea ported to vintage flavor.
  // Real "elevation" (gain since yesterday) would need historical data; for
  // now we render a deterministic mock so the badges populate consistently.
  const elev = (m) => isPeriod ? (m._gained || 0) : elevationOf(m.name || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1 }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingBottom: 22, borderBottom: `1px solid ${M.hair2}`,
      }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.lb.eyebrow')}</div>
          <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>
            {tc('page.lb.title')}<span style={{ color: M.wax }}>.</span>
          </h1>
          <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
            {tc('lb.sub', { periodLabel, n: ordered.length, category: periodLabel })}
          </div>
        </div>

        {/* segmented tabs — paper pill */}
        <div style={{
          display: 'flex', gap: 0,
          background: M.surface, border: `1px solid ${M.hair2}`,
          padding: 3, boxShadow: '2px 3px 8px rgba(59,38,22,0.10)',
        }}>
          {tabs.map((t) => {
            const on = category === t.id;
            return (
              <button key={t.id} onClick={() => setCategory(t.id)}
                style={{
                  ...MTY.capsSm, padding: '8px 16px', cursor: 'pointer',
                  border: 'none', background: on ? M.wax : 'transparent',
                  color: on ? M.surface : M.ink2, fontWeight: 600,
                  letterSpacing: '0.22em',
                  transition: 'all 0.15s',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {periodLoading && !ordered.length && (
        <div style={{ ...MTY.hand, color: M.ink3, textAlign: 'center', padding: '40px 0' }}>
          {tc('lb.empty.loading')}
        </div>
      )}

      {!periodLoading && !ordered.length && (
        <div style={{
          ...MTY.body, color: M.ink3, textAlign: 'center',
          padding: '60px 24px', background: M.surface,
          border: `1px dashed ${M.hair2}`,
        }}>
          {tc('lb.empty.none')}
          <div style={{ ...MTY.hand, color: M.ink4, marginTop: 8 }}>
            — hic sunt dracones —
          </div>
        </div>
      )}

      {/* ── Top 1 hero row — full-width wax seal pedestal ── */}
      {Top1 && (
        <div style={{
          position: 'relative',
          background: 'linear-gradient(90deg, rgba(200,162,78,0.20), rgba(139,36,24,0.10) 70%, rgba(200,162,78,0.05))',
          border: `1px solid ${M.hair3}`,
          padding: '28px 36px',
          boxShadow: '3px 5px 18px rgba(139,36,24,0.18)',
          display: 'flex', alignItems: 'center', gap: 24,
        }}>
          {/* Roman "I" big plaque on the left edge */}
          <div style={{
            ...MTY.display, fontSize: 56, color: M.wax, lineHeight: 1,
            opacity: 0.85, fontWeight: 700, flex: 'none',
          }}>I</div>

          {window.WaxSeal && React.createElement(window.WaxSeal, {
            src: Top1.avatar, name: Top1.name, size: 84, ring: 8,
          })}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...MTY.h2, color: M.ink, margin: 0, fontSize: 26 }}>
              {Top1.name || '—'}
            </div>
            <div style={{ ...MTY.hand, color: M.ink3, fontSize: 14, marginTop: 4 }}>
              L{Top1.level || 0} · {tc('podium.bearing', { n: bearingOf(Top1.name || '') })} · {coordsOf(Top1.name || '').lat}°{coordsOf(Top1.name || '').latDir} · {coordsOf(Top1.name || '').lon}°{coordsOf(Top1.name || '').lonDir}
            </div>
          </div>

          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>
              {tc(isPeriod ? 'lb.col.gained' : 'lb.col.aura')}
            </div>
            <div style={{ ...MTY.num, fontSize: 36, color: M.wax, lineHeight: 1 }}>
              {isPeriod && '+'}{fmt(Top1.aura || 0)}
            </div>
            <div style={{ ...MTY.capsSm, color: M.ink3, marginTop: 6 }}>
              {isPeriod ? `↑ ${fmt(elev(Top1))}` : tc('home.elev.today', { n: `↑ ${elev(Top1)}` })}
            </div>
          </div>
        </div>
      )}

      {/* ── Ledger: II–XXIV ── */}
      {Rest.length > 0 && (
        <div style={{
          background: M.surface, border: `1px solid ${M.hair2}`,
          boxShadow: '3px 5px 16px rgba(59,38,22,0.10)',
        }}>
          {/* table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px 56px 1fr 110px 130px',
            gap: 14, padding: '12px 24px',
            borderBottom: `1px solid ${M.hair}`,
            ...MTY.capsSm, color: M.ink3, fontWeight: 600,
          }}>
            <span>{tc('lb.col.rank')}</span>
            <span/>
            <span>{tc('lb.col.surveyor')}</span>
            <span style={{ textAlign: 'right' }}>{tc('lb.col.bearing')}</span>
            <span style={{ textAlign: 'right' }}>{tc(isPeriod ? 'lb.col.gained' : 'lb.col.aura')}</span>
          </div>

          {Rest.map((m, i) => {
            const rank = i + 2;
            const focus = focusId && m.id === focusId;
            const bearing = bearingOf(m.name || '');
            return (
              <div key={m.id || rank} data-focus-id={m.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 56px 1fr 110px 130px',
                  gap: 14, padding: '14px 24px',
                  borderBottom: i === Rest.length - 1 ? 'none' : `1px dashed ${M.hair}`,
                  alignItems: 'center',
                  background: focus ? 'rgba(200,162,78,0.18)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                <span style={{
                  ...MTY.caps, fontSize: 13, color: M.ink2, letterSpacing: '0.18em',
                }}>{romanOf(rank) || rank}</span>
                {window.WaxSeal && React.createElement(window.WaxSeal, {
                  src: m.avatar, name: m.name, size: 40, ring: 5,
                })}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    ...MTY.h3, color: M.ink, fontSize: 15, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{m.name || '—'}</div>
                  <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 2 }}>
                    L{m.level || 0}
                    {!isPeriod && ` · ↑ ${elev(m)}m`}
                  </div>
                </div>
                <span style={{
                  ...MTY.capsSm, color: M.ink3, textAlign: 'right',
                }}>{bearing}°</span>
                <span style={{
                  ...MTY.num, color: M.ink, fontSize: 18, textAlign: 'right',
                }}>{isPeriod && '+'}{fmt(m.aura || 0)}</span>
              </div>
            );
          })}

          {/* Easter egg footer */}
          <div style={{
            padding: '12px 24px',
            ...MTY.hand, color: M.wax, fontSize: 12, fontStyle: 'italic',
            opacity: 0.55, textAlign: 'right',
            borderTop: `1px solid ${M.hair}`,
            background: 'rgba(200,162,78,0.04)',
          }}>
            — hic sunt dracones —
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CartographerTrophiesView ────────────────────────────────────────────
// Vintage achievement cartouches. Each trophy is a parchment card with
// ornate corners, a wax seal in the top-right when unlocked, and a
// gold→wax progress vine.
function CartographerTrophiesView({ focusId }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const me = window.ME || {};

  // Reuse the host's deriveTrophies if present so labels/progress stay
  // consistent. Falls back to a minimal local set if it's missing.
  const trophies = (typeof window.deriveTrophies === 'function')
    ? window.deriveTrophies(me)
    : (typeof deriveTrophies === 'function' ? deriveTrophies(me) : []);

  // Trophy labels now come from the i18n dict (trophy.t1.name etc.) so they
  // follow the app language switch. Keys mirror tr.id from deriveTrophies.
  const trophyLabel = (id, fallback) => ({
    name: tc(`trophy.${id}.name`) === `trophy.${id}.name` ? fallback?.name : tc(`trophy.${id}.name`),
    desc: tc(`trophy.${id}.desc`) === `trophy.${id}.desc` ? fallback?.desc : tc(`trophy.${id}.desc`),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{
        paddingBottom: 22, borderBottom: `1px solid ${M.hair2}`,
      }}>
        <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.trophies.eyebrow')}</div>
        <h1 style={{ ...MTY.h1, color: M.ink, margin: 0 }}>
          {tc('page.trophies.title')}<span style={{ color: M.wax }}>.</span>
        </h1>
        <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 14 }}>
          {tc('trophies.sub', { u: trophies.filter((t) => t.unlocked).length, t: trophies.length })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18,
      }}>
        {trophies.map((tr) => {
          const pt = trophyLabel(tr.id, { name: tr.name, desc: tr.desc });
          const pct = tr.total ? Math.min(100, Math.round((tr.progress / tr.total) * 100)) : 0;
          return (
            <div key={tr.id}
              style={{
                position: 'relative',
                background: tr.unlocked
                  ? 'linear-gradient(180deg, rgba(200,162,78,0.18), rgba(232,220,192,0.5)), #EFE3C8'
                  : '#EFE3C8',
                border: `1px solid ${tr.unlocked ? M.hair3 : M.hair2}`,
                padding: '24px 22px 22px',
                boxShadow: tr.unlocked
                  ? '3px 5px 18px rgba(200,162,78,0.18)'
                  : '2px 4px 12px rgba(59,38,22,0.08)',
                opacity: tr.unlocked ? 1 : 0.78,
              }}>
              {/* corner ornaments */}
              {window.OrnateCorner && (
                <>
                  {React.createElement(window.OrnateCorner, {
                    size: 28, style: { position: 'absolute', top: 4, left: 4 },
                    opacity: 0.4,
                  })}
                  {React.createElement(window.OrnateCorner, {
                    size: 28, style: { position: 'absolute', top: 4, right: 4, transform: 'scaleX(-1)' },
                    opacity: 0.4,
                  })}
                </>
              )}

              {/* unlocked seal */}
              {tr.unlocked && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset -2px -3px 5px rgba(0,0,0,0.35), 2px 2px 4px rgba(59,38,22,0.3)',
                  zIndex: 2,
                }}>
                  <span style={{ color: '#E8DCC0', fontSize: 14, lineHeight: 1 }}>✦</span>
                </div>
              )}

              <div style={{ ...MTY.capsSm, color: tr.unlocked ? M.wax : M.ink3, marginBottom: 10 }}>
                {tc('trophies.label')}
              </div>
              <h3 style={{ ...MTY.h3, color: M.ink, margin: '0 0 6px', fontSize: 17 }}>
                {pt.name}
              </h3>
              <p style={{ ...MTY.body, color: M.ink2, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                {pt.desc}
              </p>

              {/* progress vine */}
              {tr.total > 1 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    ...MTY.capsSm, color: M.ink3, marginBottom: 6,
                  }}>
                    <span>{tr.unlocked ? tc('trophies.completed') : tc('trophies.progress')}</span>
                    <span style={{ color: tr.unlocked ? M.wax : M.ink2 }}>
                      {fmt(tr.progress)} / {fmt(tr.total)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(59,38,22,0.12)', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: `linear-gradient(90deg, ${M.gold}, ${tr.unlocked ? M.wax : M.gold})`,
                    }}/>
                  </div>
                </div>
              )}

              {tr.total === 1 && !tr.unlocked && (
                <div style={{ ...MTY.hand, color: M.ink4, fontSize: 12, marginTop: 14, fontStyle: 'italic' }}>
                  {tc('trophies.awaiting')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.CartographerLeaderboardView = CartographerLeaderboardView;
window.CartographerTrophiesView    = CartographerTrophiesView;
