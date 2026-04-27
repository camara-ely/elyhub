// profile.jsx — Profile, Creator Dashboard, Creator Public Profile.
//
// Extracted from app.jsx. The user's own profile page (ProfileView), the
// analytics/ops surface they see if they publish (CreatorDashboardView) plus
// its coupon manager (CouponsPanel), and the public profile anyone else sees
// (CreatorProfileView).
//
// Contents:
//   • Sparkline, synthSales30d  — analytics helpers
//   • CouponsPanel              — creator-facing coupon editor
//   • CreatorDashboardView      — the dashboard shell
//   • ProfileView               — signed-in-user's own profile
//   • CreatorProfileView, memberSinceLabel — public profile page
//   • RedeemHistory, StatCell   — profile sub-blocks

// ────────────── Profile ──────────────
// Reads everything from window.ME — the data.jsx poll keeps it fresh, and the
// App-level __subscribeLive hook force-updates when ME mutates. No mock data.
//
// What's shown vs. what's NOT:
//   ✓ name, tag, avatar, level, rank, streak, aura, gym posts, voice hours
//   ✓ gifts sent / received (sum from aura_log)
//   ✓ top 3 trophies (closest to unlock, unlocked-first)
//   ✗ "Joined" date — we don't store it. Could decode from Discord snowflake
//     (millis since 2015-01-01) but it's not worth the complexity; omit.
//   ✗ Level-history chart — we don't time-series XP; chart was always fake.
//     Replaced with a stat row that's actually meaningful.
// ──── Sparkline — lightweight SVG line+area chart for stat cards ────
// No external deps. Takes an array of numbers and draws them proportionally
// across the viewBox. Handles all-zero / single-point inputs gracefully.
function Sparkline({ data = [], width = 180, height = 40, color = T.accentHi, fill = true }) {
  if (!Array.isArray(data) || data.length < 2) {
    return <div style={{ width, height, opacity: 0.3 }}/>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gradId})`}/>}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Synthesize a deterministic 30-day sales sequence for a listing. Seeds off
// the listing id so the same listing always shows the same shape. Scaled so
// the sum approximates listing.sales; shape has a mild upward drift.
function synthSales30d(listing) {
  const id = String(listing?.id || '');
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const total = Math.max(0, listing?.sales || 0);
  if (total === 0) return Array.from({ length: 30 }, () => 0);
  const out = [];
  let remaining = total;
  for (let i = 0; i < 30; i++) {
    // Small LCG-style pseudo random seeded by hash + i.
    h = (h * 1103515245 + 12345 + i * 17) | 0;
    const base = Math.abs(h % 100) / 100; // 0..1
    // Mild drift upward in the latter half.
    const drift = 0.4 + (i / 30) * 0.8;
    const raw = base * drift;
    out.push(raw);
  }
  const sum = out.reduce((a, b) => a + b, 0) || 1;
  // Rescale to approx total.
  const scaled = out.map((v) => Math.floor((v / sum) * total));
  // Distribute rounding leftover to the last bucket.
  const delta = total - scaled.reduce((a, b) => a + b, 0);
  if (delta !== 0) scaled[scaled.length - 1] += delta;
  return scaled;
}

// ──── CouponsPanel — creator-facing promo code manager ────
// Embedded in the CreatorDashboardView. Lets the creator mint codes, scope
// them to all-of-theirs or a single listing, set usage caps, and disable /
// delete codes on demand. Seed codes get the same edit controls but are
// labeled with a "seed" dot so the user knows they came pre-populated.
function CouponsPanel({ coupons, listings }) {
  const me = window.ME?.id || 'me';
  const [creating, setCreating] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [percentOff, setPercentOff] = React.useState('15');
  const [listingId, setListingId] = React.useState('');
  const [maxUses, setMaxUses] = React.useState('');
  const [expiresDays, setExpiresDays] = React.useState('');
  const [notes, setNotes] = React.useState('');
  // Arm+commit for delete (window.confirm is a no-op in Tauri's WKWebView —
  // see shell.jsx:769). First click arms the code; second within 3s commits.
  const [armedDeleteCode, setArmedDeleteCode] = React.useState(null);
  React.useEffect(() => {
    if (!armedDeleteCode) return;
    const t = setTimeout(() => setArmedDeleteCode(null), 3000);
    return () => clearTimeout(t);
  }, [armedDeleteCode]);

  const resetForm = () => {
    setCode(''); setPercentOff('15'); setListingId('');
    setMaxUses(''); setExpiresDays(''); setNotes('');
  };

  const mine = coupons.mine();

  const onCreate = () => {
    const pct = parseInt(percentOff, 10);
    if (!pct || pct < 1 || pct > 90) {
      try { ElyNotify?.toast?.({ text: 'Percent must be between 1 and 90', kind: 'warn' }); } catch {}
      return;
    }
    const exp = expiresDays && parseInt(expiresDays, 10) > 0
      ? Date.now() + parseInt(expiresDays, 10) * 24 * 60 * 60 * 1000
      : null;
    const res = coupons.create({
      code, percentOff: pct,
      listingId: listingId || null,
      maxUses: maxUses || null,
      expiresAt: exp,
      notes,
    });
    if (res.error === 'exists') {
      try { ElyNotify?.toast?.({ text: 'That code already exists', kind: 'warn' }); } catch {}
      return;
    }
    if (res.error) {
      try { ElyNotify?.toast?.({ text: 'Could not create code', kind: 'warn' }); } catch {}
      return;
    }
    try { ElyNotify?.toast?.({ text: `Code ${res.entry.code} live — ${res.entry.percentOff}% off`, kind: 'success' }); } catch {}
    resetForm();
    setCreating(false);
  };

  return (
    <Glass style={{ padding: 22, marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ ...TY.micro, color: T.text3 }}>PROMO CODES</div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: '5px 12px', borderRadius: T.r.pill,
              background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
              border: 'none', color: '#fff', cursor: 'pointer',
              fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
              boxShadow: `0 2px 10px ${T.accent}55`,
            }}
          >+ New code</button>
        )}
      </div>

      {creating && (
        <div style={{
          padding: 14, marginBottom: 14,
          background: 'rgba(255,255,255,0.02)',
          border: `0.5px solid ${T.glassBorder}`,
          borderRadius: T.r.md,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>CODE (optional)</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="auto-generate"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontMono, fontSize: 12, outline: 'none',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}
              />
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>% OFF</div>
              <input
                value={percentOff} type="number" min={1} max={90}
                onChange={(e) => setPercentOff(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontMono, fontSize: 12, outline: 'none',
                }}
              />
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>SCOPE</div>
              <select
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontSans, fontSize: 12, outline: 'none',
                }}
              >
                <option value="">All my listings</option>
                {listings.filter((l) => String(l.id).startsWith('user-')).map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>MAX USES</div>
              <input
                value={maxUses} type="number" min={1}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="unlimited"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontMono, fontSize: 12, outline: 'none',
                }}
              />
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>EXPIRES (DAYS)</div>
              <input
                value={expiresDays} type="number" min={1}
                onChange={(e) => setExpiresDays(e.target.value)}
                placeholder="never"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontMono, fontSize: 12, outline: 'none',
                }}
              />
            </div>
            <div>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 4 }}>NOTE</div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={80}
                placeholder="internal label"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: T.r.sm,
                  background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.glassBorder}`,
                  color: T.text, fontFamily: T.fontSans, fontSize: 12, outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { resetForm(); setCreating(false); }}
              style={{
                padding: '7px 14px', borderRadius: T.r.pill,
                background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                color: T.text2, cursor: 'pointer',
                fontFamily: T.fontSans, fontSize: 12,
              }}
            >Cancel</button>
            <button
              onClick={onCreate}
              style={{
                padding: '7px 16px', borderRadius: T.r.pill,
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                border: 'none', color: '#fff', cursor: 'pointer',
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                boxShadow: `0 2px 10px ${T.accent}55`,
              }}
            >Create code</button>
          </div>
        </div>
      )}

      {mine.length === 0 ? (
        <div style={{ ...TY.body, color: T.text3, padding: '14px 0', textAlign: 'center', fontSize: 12 }}>
          No promo codes yet. Mint one to reward followers or drive launch-week sales.
        </div>
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.1fr 70px 1.5fr 90px 90px 90px',
            gap: 12, padding: '8px 6px', ...TY.micro, color: T.text3,
            borderBottom: `0.5px solid ${T.glassBorder}`,
          }}>
            <span>CODE</span>
            <span style={{ textAlign: 'right' }}>% OFF</span>
            <span>SCOPE</span>
            <span style={{ textAlign: 'right' }}>USES</span>
            <span style={{ textAlign: 'right' }}>EXPIRES</span>
            <span style={{ textAlign: 'right' }}></span>
          </div>
          {mine.sort((a, b) => b.createdAt - a.createdAt).map((c) => {
            const scoped = c.listingId ? (listings.find((l) => l.id === c.listingId)?.title || '—') : 'All listings';
            const expLabel = c.expiresAt
              ? (c.expiresAt < Date.now() ? 'expired' : new Date(c.expiresAt).toLocaleDateString())
              : '—';
            const usesLabel = c.maxUses != null ? `${c.uses}/${c.maxUses}` : `${c.uses}`;
            const faded = c.disabled || (c.expiresAt && c.expiresAt < Date.now()) || (c.maxUses != null && c.uses >= c.maxUses);
            return (
              <div key={c.code} style={{
                display: 'grid', gridTemplateColumns: '1.1fr 70px 1.5fr 90px 90px 90px',
                gap: 12, padding: '10px 6px', alignItems: 'center',
                borderBottom: `0.5px solid ${T.glassBorder}`,
                opacity: faded ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {c.seed && <span title="Seeded demo code" style={{ width: 5, height: 5, borderRadius: '50%', background: T.text3, flexShrink: 0 }}/>}
                  <span
                    title="Click to copy"
                    onClick={() => {
                      try { navigator.clipboard.writeText(c.code); ElyNotify?.toast?.({ text: `Copied ${c.code}`, kind: 'success' }); } catch {}
                    }}
                    style={{
                      fontFamily: T.fontMono, fontSize: 12, fontWeight: 600,
                      color: T.text, letterSpacing: 0.4,
                      background: 'rgba(255,255,255,0.04)',
                      padding: '3px 8px', borderRadius: T.r.sm,
                      border: `0.5px solid ${T.glassBorder}`,
                      cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >{c.code}</span>
                </div>
                <div style={{ textAlign: 'right', ...TY.numSm, color: T.text, fontSize: 12 }}>{c.percentOff}%</div>
                <div style={{ ...TY.small, color: T.text2, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.notes || scoped}>
                  {scoped}{c.notes ? <span style={{ color: T.text3 }}> · {c.notes}</span> : null}
                </div>
                <div style={{ textAlign: 'right', ...TY.numSm, color: T.text2, fontSize: 12 }}>{usesLabel}</div>
                <div style={{ textAlign: 'right', ...TY.small, fontSize: 11, color: T.text3 }}>{expLabel}</div>
                <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => coupons.setDisabled(c.code, !c.disabled)}
                    title={c.disabled ? 'Enable' : 'Disable'}
                    style={{
                      padding: '3px 9px', borderRadius: T.r.pill,
                      background: 'rgba(255,255,255,0.04)',
                      border: `0.5px solid ${T.glassBorder}`,
                      color: T.text2, cursor: 'pointer',
                      fontFamily: T.fontSans, fontSize: 10,
                    }}
                  >{c.disabled ? 'Enable' : 'Pause'}</button>
                  <button
                    onClick={() => {
                      if (armedDeleteCode !== c.code) {
                        setArmedDeleteCode(c.code);
                        try { ElyNotify?.toast?.({ text: `Click again to delete ${c.code}`, kind: 'warn' }); } catch {}
                        return;
                      }
                      setArmedDeleteCode(null);
                      coupons.remove(c.code);
                    }}
                    title={armedDeleteCode === c.code ? 'Click again to confirm' : 'Delete'}
                    style={{
                      padding: '3px 9px', borderRadius: T.r.pill,
                      background: armedDeleteCode === c.code ? 'rgba(220,50,70,0.9)' : 'rgba(255,255,255,0.04)',
                      border: `0.5px solid ${armedDeleteCode === c.code ? 'rgba(255,160,170,0.6)' : T.glassBorder}`,
                      color: armedDeleteCode === c.code ? '#fff' : T.text2, cursor: 'pointer',
                      fontFamily: T.fontSans, fontSize: 10,
                      transition: 'background 120ms ease, color 120ms ease',
                    }}
                  >{armedDeleteCode === c.code ? 'Confirm' : 'Delete'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}

// ──── CreatorDashboardView — analytics panel for publishers ────
// Accessible from ProfileView when the user has at least one listing. Pulls
// live data from window.LISTINGS, window.REVIEWS, and the user's library
// items. No backend — aura earned is computed client-side as sales × price,
// matching the same approximation used by `getCreatorStats`.
function CreatorDashboardView({ state, setView, publishing, onEdit, reviews, messages, coupons }) {
  if (T.zodiac && window.ZodiacCreatorDashboardView) {
    return <window.ZodiacCreatorDashboardView state={state} setView={setView} publishing={publishing} onEdit={onEdit} reviews={reviews} messages={messages} coupons={coupons}/>;
  }
  const me = window.ME || {};
  // Pull version so the panel refreshes after publish/unpublish.
  const _v = publishing?.version;
  const _rv = reviews?.version;
  const listings = dedupTieredListings((window.LISTINGS || []).filter((l) => l.sellerId === (me.id || 'me')));

  if (!listings.length) {
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>You haven't published anything yet.</div>
        <button onClick={() => setView({ id: 'profile' })} style={{ ...linkStyle(), marginTop: 12 }}>← Back to profile</button>
      </Glass>
    );
  }

  // Per-listing stats — sales, downloads, rating, aura earned, 30d sparkline.
  const rows = listings.map((l) => {
    const rStats = reviewStatsForListing(l.id);
    return {
      listing: l,
      sales: l.sales || 0,
      downloads: l.downloads || 0,
      earned: (l.sales || 0) * (l.price || 0),
      avg: rStats.count > 0 ? rStats.avg : (l.rating || 0),
      reviews: rStats.count,
      trend: synthSales30d(l),
    };
  });

  // Totals across all listings.
  const totals = rows.reduce((a, r) => ({
    sales:     a.sales + r.sales,
    downloads: a.downloads + r.downloads,
    earned:    a.earned + r.earned,
    reviews:   a.reviews + r.reviews,
  }), { sales: 0, downloads: 0, earned: 0, reviews: 0 });

  // Weighted avg rating across all listings (by review count).
  const totalAvg = totals.reviews > 0
    ? rows.reduce((a, r) => a + r.avg * r.reviews, 0) / totals.reviews
    : 0;

  // 30d aggregated trend — sum every listing's series element-wise.
  const aggTrend = Array.from({ length: 30 }, (_, i) =>
    rows.reduce((a, r) => a + (r.trend[i] || 0), 0));

  // Recent reviews received (across all listings), newest first.
  const received = reviewsForSeller(me.id || 'me').slice(0, 8);

  // Sort table by sales desc.
  const sortedRows = [...rows].sort((a, b) => b.earned - a.earned);

  const StatCard = ({ label, value, sub, spark, sparkColor }) => (
    <Glass style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden' }}>
      <div style={{ ...TY.micro, color: T.text3 }}>{label}</div>
      <div style={{ ...TY.numMed, color: T.text, fontSize: 26 }}>{value}</div>
      {sub && <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>{sub}</div>}
      {spark && (
        <div style={{ marginTop: 6, marginLeft: -2, marginRight: -2 }}>
          <Sparkline data={spark} color={sparkColor || T.accentHi} width={240} height={36}/>
        </div>
      )}
    </Glass>
  );

  return (
    <div>
      <button onClick={() => setView({ id: 'profile' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        ...TY.small, color: T.textOnBg2, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
      }}>← Profile</button>

      <div style={{ marginBottom: 22 }}>
        <div style={{ ...TY.micro, color: T.textOnBg3, marginBottom: 10 }}>CREATOR DASHBOARD</div>
        <h1 style={{ ...TY.h1, margin: 0, color: T.textOnBg }}>Your listings<span style={{ color: T.accentHi }}>.</span></h1>
        <div style={{ ...TY.body, color: T.textOnBg2, marginTop: 8 }}>
          Live stats across {listings.length} {listings.length === 1 ? 'listing' : 'listings'}. Updated on every purchase and review.
        </div>
      </div>

      {/* ── Top stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard
          label="AURA EARNED"
          value={fmt(totals.earned)}
          sub="Lifetime · sales × price"
          spark={aggTrend}
          sparkColor={T.accentHi}
        />
        <StatCard
          label="TOTAL SALES"
          value={fmt(totals.sales)}
          sub={`${fmt(totals.downloads)} downloads`}
          spark={aggTrend}
          sparkColor={T.lilac}
        />
        <StatCard
          label="AVG RATING"
          value={totalAvg > 0 ? totalAvg.toFixed(2) : '—'}
          sub={`${totals.reviews} ${totals.reviews === 1 ? 'review' : 'reviews'}`}
        />
        <StatCard
          label="LISTINGS LIVE"
          value={String(listings.length)}
          sub={`${listings.filter((l) => String(l.id).startsWith('user-')).length} published by you`}
        />
      </div>

      {/* ── Listings table ── */}
      <Glass style={{ padding: 22, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ ...TY.micro, color: T.text3 }}>PER LISTING</div>
          <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>Ranked by aura earned</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.6fr 140px 120px 90px 140px 80px',
            gap: 14, padding: '8px 6px', ...TY.micro, color: T.text3,
            borderBottom: `0.5px solid ${T.glassBorder}`,
          }}>
            <span>LISTING</span>
            <span>30-DAY TREND</span>
            <span style={{ textAlign: 'right' }}>AURA EARNED</span>
            <span style={{ textAlign: 'right' }}>SALES</span>
            <span style={{ textAlign: 'right' }}>RATING</span>
            <span style={{ textAlign: 'right' }}></span>
          </div>
          {sortedRows.map(({ listing: l, earned, sales, avg, reviews: rvCount, trend }) => {
            const meta = listingTypeMeta(l.type);
            const isMine = String(l.id).startsWith('user-');
            return (
              <div key={l.id} style={{
                display: 'grid', gridTemplateColumns: '1.6fr 140px 120px 90px 140px 80px',
                gap: 14, padding: '12px 6px', alignItems: 'center',
                borderBottom: `0.5px solid ${T.glassBorder}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: T.r.sm, flexShrink: 0,
                    background: `linear-gradient(135deg, ${meta.hue}55, rgba(255,255,255,0.04))`,
                    border: `0.5px solid ${meta.hue}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: meta.hue,
                  }}>
                    <ListingTypeIcon type={l.type} size={15}/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      onClick={() => setView({ id: 'listing', focusId: l.id })}
                      style={{
                        ...TY.body, color: T.text, fontSize: 13, fontWeight: 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                      title={l.title}
                    >{l.title}</div>
                    <div style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
                      {meta.label.replace(/s$/, '')} · {fmt(l.price)} aura{l.billing === 'monthly' && ' /mo'}
                    </div>
                  </div>
                </div>
                <div><Sparkline data={trend} width={130} height={28} color={meta.hue}/></div>
                <div style={{ textAlign: 'right', ...TY.numSm, color: T.text, fontSize: 13 }}>{fmt(earned)}</div>
                <div style={{ textAlign: 'right', ...TY.numSm, color: T.text2, fontSize: 13 }}>{fmt(sales)}</div>
                <div style={{ textAlign: 'right', ...TY.small, fontSize: 12, color: T.text2 }}>
                  {avg > 0 ? (
                    <span>
                      <span style={{ color: '#FFD166' }}>★</span> {avg.toFixed(2)}
                      {rvCount > 0 && <span style={{ color: T.text3 }}> ({rvCount})</span>}
                    </span>
                  ) : <span style={{ color: T.text3 }}>—</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isMine ? (
                    <button
                      onClick={() => onEdit?.(l)}
                      style={{
                        padding: '5px 12px', borderRadius: T.r.pill,
                        background: 'rgba(255,255,255,0.04)',
                        border: `0.5px solid ${T.glassBorder}`,
                        color: T.text2, cursor: 'pointer',
                        fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
                      }}
                    >Edit</button>
                  ) : (
                    <span style={{ ...TY.small, fontSize: 10, color: T.text3 }}>seed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Glass>

      {/* ── Buyer inbox ── */}
      {messages && messages.list && messages.list.length > 0 && (
        <Glass style={{ padding: 22, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...TY.micro, color: T.text3 }}>BUYER INBOX</div>
            <button
              onClick={() => setView({ id: 'messages' })}
              style={{
                background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                color: T.text2, cursor: 'pointer',
                padding: '5px 12px', borderRadius: T.r.pill,
                fontFamily: T.fontSans, fontSize: 11,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Open all
              {messages.unreadCount > 0 && (
                <span style={{
                  background: T.accentHi, color: '#fff',
                  borderRadius: T.r.pill, padding: '1px 7px',
                  fontSize: 10, fontWeight: 600,
                }}>{messages.unreadCount}</span>
              )}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.list.slice(0, 4).map((th) => {
              const other = (window.MEMBERS || []).find((m) => m.id === th.otherId);
              const last = th.messages[th.messages.length - 1];
              const unread = messages.unreadForThread ? messages.unreadForThread(th.id) : 0;
              if (!other || !last) return null;
              return (
                <button
                  key={th.id}
                  onClick={() => setView({ id: 'messages', threadId: th.id })}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    gap: 12, alignItems: 'center',
                    padding: '12px 6px',
                    borderBottom: `0.5px solid ${T.glassBorder}`,
                    background: 'transparent', border: 'none',
                    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <Avatar name={other.name} src={other.avatar} size={36}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...TY.body, color: T.text, fontSize: 13, fontWeight: unread ? 600 : 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {other.name}
                      {unread > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.accentHi }}/>}
                    </div>
                    <div style={{ ...TY.small, color: T.text3, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {last.authorId === (window.ME?.id || 'me') ? 'You: ' : ''}{last.text}
                    </div>
                  </div>
                  <div style={{ ...TY.small, color: T.text3, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {relTime ? relTime(last.ts) : new Date(last.ts).toLocaleDateString()}
                  </div>
                </button>
              );
            })}
          </div>
        </Glass>
      )}

      {/* ── Coupons / promo codes ── */}
      {coupons && <CouponsPanel coupons={coupons} listings={listings}/>}

      {/* ── Recent reviews ── */}
      <Glass style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ ...TY.micro, color: T.text3 }}>RECENT REVIEWS</div>
          <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>
            {totals.reviews} {totals.reviews === 1 ? 'review' : 'reviews'} lifetime
          </span>
        </div>
        {received.length === 0 ? (
          <div style={{ ...TY.body, color: T.text3, padding: '14px 0', textAlign: 'center', fontSize: 12 }}>
            No reviews yet. First buyer gets the first word.
          </div>
        ) : (
          <div>
            {received.map((r) => {
              const l = (window.LISTINGS || []).find((x) => x.id === r.listingId);
              return (
                <div key={r.id}>
                  <ReviewItem review={r} onSeller={(auth) => setView({ id: 'profile', userId: auth.id })}/>
                  {l && (
                    <div style={{ marginLeft: 48, marginTop: -8, marginBottom: 4 }}>
                      <button
                        onClick={() => setView({ id: 'listing', focusId: l.id })}
                        style={{
                          background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                          color: T.text3, cursor: 'pointer',
                          padding: '3px 10px', borderRadius: T.r.pill,
                          fontFamily: T.fontSans, fontSize: 10,
                        }}
                      >on {l.title}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Glass>
    </div>
  );
}

function ProfileView({ state, onQuick, setView, onPublish, onEdit, publishing, wishlist }) {
  // Zodiac gate — delegates to the celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacProfileView) {
    return <window.ZodiacProfileView state={state} onQuick={onQuick} setView={setView} onPublish={onPublish} onEdit={onEdit} publishing={publishing} wishlist={wishlist}/>;
  }
  const me = window.ME || {};
  // Read publishing.version to re-derive when user publishes/unpublishes.
  const _v = publishing?.version;
  const myListings = (window.LISTINGS || []).filter((l) => l.sellerId === me.id);
  const myStats = myListings.length ? getCreatorStats(me.id) : null;
  // Two-step unpublish confirm. Tauri's WKWebView silently no-ops
  // window.confirm(), so we can't use the native dialog. Instead: first
  // click arms the button (id lands in this state + auto-clears after 3s),
  // second click actually removes. The button swaps label/colour when armed
  // so the user sees exactly what'll happen.
  const [armedUnpublishId, setArmedUnpublishId] = React.useState(null);
  React.useEffect(() => {
    if (!armedUnpublishId) return;
    const t = setTimeout(() => setArmedUnpublishId(null), 3000);
    return () => clearTimeout(t);
  }, [armedUnpublishId]);
  const voiceHours = Math.floor((me.voiceSeconds || 0) / 3600);
  const voiceMins  = Math.floor(((me.voiceSeconds || 0) % 3600) / 60);
  // Bio is saved to localStorage by the Account settings pane. Read it on
  // every render so it updates live as the user types (re-render is triggered
  // by the parent poll or by the settings modal closing).
  const [bio, setBio] = React.useState(() => {
    try { return localStorage.getItem('elyhub.bio.v1') || ''; } catch { return ''; }
  });
  React.useEffect(() => {
    // Listen for changes from other tabs AND from the Settings modal in this
    // tab (we dispatch a 'storage'-like custom event on save).
    const sync = () => {
      try { setBio(localStorage.getItem('elyhub.bio.v1') || ''); } catch {}
    };
    window.addEventListener('storage', sync);
    window.addEventListener('ely:bio-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ely:bio-changed', sync);
    };
  }, []);
  // Server tags — prefer the real Discord roles synced by the bot (array of
  // { id, name, color, position }). If the user hasn't been role-synced yet
  // (empty column), fall back to the derived tags so the strip isn't blank.
  // Dim colourless roles get a neutral hue so "uncolored" Discord roles like
  // plain "Member" still read as a chip instead of invisible text.
  const liveRoles = Array.isArray(me.discordRoles) ? me.discordRoles : [];
  const tagsToShow = liveRoles.length
    ? liveRoles.map((r) => ({
        name: r.name,
        // Discord uses #000000 to mean "no color set" — treat that as neutral.
        hue: (r.color && r.color !== '#000000') ? r.color : T.text2,
      }))
    : (deriveServerTags(me).length ? deriveServerTags(me) : [{ name: 'Member', hue: T.text2 }]);

  return (
    <div>
      <Glass style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <HoverOrbs restX={18} restY={25} size={440} color={T.accent} colorHi={T.accentHi}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', flexWrap: 'wrap' }}>
          <Avatar name={me.name || 'You'} src={me.avatar} size={96} ring/>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ ...TY.h1, margin: 0 }}>{me.name || t('profile.signIn')}</h1>
            <div style={{ ...TY.body, color: T.text3, marginTop: 4 }}>
              {me.tag ? `@${me.tag}` : t('profile.linkHint')}
            </div>
            {/* Bio — pulled from the Account settings pane via localStorage.
                Only rendered when set so the card stays clean for new users;
                max-width caps line length so long bios don't break the layout. */}
            {bio && bio.trim() && (
              <div style={{
                ...TY.body, color: T.text2, marginTop: 10,
                maxWidth: 560, lineHeight: 1.5,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {bio}
              </div>
            )}
            {/* Discord-style role strip — one colored dot + role name per pill.
                Dark glass chip keeps them readable on any gradient; the hue
                only lives in the dot + text so multi-tag rows don't turn into
                a rainbow fence. */}
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {tagsToShow.map((tg) => (
                <span key={tg.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 4px 8px',
                  borderRadius: T.r.pill,
                  background: 'rgba(8,10,18,0.55)',
                  border: `0.5px solid ${tg.hue}33`,
                  backdropFilter: 'blur(10px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                  color: tg.hue,
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                  letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: tg.hue,
                    boxShadow: `0 0 6px ${tg.hue}88`,
                  }}/>
                  {tg.name}
                </span>
              ))}
            </div>
          </div>
          <Btn variant="primary" icon={<IGift size={15}/>} onClick={onQuick.gift}>Gift aura</Btn>
        </div>
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCell label={t('profile.aura')} value={fmt(state.aura || 0)}/>
        <StatCell label={t('profile.level')} value={state.level} suffix={`→${state.level+1}`}/>
        <StatCell label={t('profile.rank')} value={state.rank ? `#${state.rank}` : '—'}/>
        <StatCell label={t('profile.streak')} value={state.streak || 0} suffix={state.streak === 1 ? t('profile.day') : t('profile.days')}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <Glass style={{ padding: 28 }}>
          <h3 style={{ ...TY.h3, margin: '0 0 18px' }}>{t('profile.auraFlow')}</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text2, marginBottom: 4 }}>{t('profile.gifted')}</div>
              <div style={{ ...TY.numMed, color: T.text }}>{fmt(me.totalGiftsSent || 0)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text2, marginBottom: 4 }}>{t('profile.received')}</div>
              <div style={{ ...TY.numMed, color: T.accentHi }}>{fmt(me.totalGiftsReceived || 0)}</div>
            </div>
          </div>
          {/* Footer caption — was T.text4 (alpha 0.22), basically invisible on
              the glass bg. Bumped to T.text2 (0.68) so it actually reads. */}
          <div style={{ ...TY.small, color: T.text2, marginTop: 14, fontSize: 11 }}>
            {t('profile.lifetime')}
          </div>
        </Glass>

        <Glass style={{ padding: 28 }}>
          <h3 style={{ ...TY.h3, margin: '0 0 18px' }}>{t('profile.activity')}</h3>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text2, marginBottom: 4 }}>{t('profile.gymPosts')}</div>
              <div style={{ ...TY.numMed, color: T.text }}>{fmt(me.gymPosts || 0)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...TY.small, color: T.text2, marginBottom: 4 }}>{t('profile.voice')}</div>
              <div style={{ ...TY.numMed, color: T.text }}>
                {voiceHours}<span style={{ ...TY.small, color: T.text2, marginLeft: 3 }}>h</span>
                {voiceMins > 0 && <> {voiceMins}<span style={{ ...TY.small, color: T.text2, marginLeft: 3 }}>m</span></>}
              </div>
            </div>
          </div>
          <div style={{ ...TY.small, color: T.text2, marginTop: 14, fontSize: 11 }}>
            {t('profile.bestStreak')} · {fmt(me.gymStreakBest || 0)} {t('profile.days')}
          </div>
        </Glass>
      </div>

      <RedeemHistory me={me}/>

      <Glass style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ ...TY.h3, margin: 0 }}>{t('profile.trophyProgress')}</h3>
          <span style={{ ...TY.small, color: T.text2 }}>
            {deriveTrophies(window.ME).filter(tr => tr.unlocked).length} {t('profile.earned')}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {deriveTrophies(window.ME)
            .sort((a, b) => (b.unlocked - a.unlocked) || (b.progress / b.total - a.progress / a.total))
            .slice(0, 3)
            .map(t => <MiniTrophy key={t.id} t={t}/>)}
        </div>
      </Glass>

      <Glass style={{ padding: 28, marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ ...TY.h3, margin: 0 }}>My Listings</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {myListings.length > 0 && <span style={{ ...TY.small, color: T.text3 }}>{myListings.length} {myListings.length === 1 ? 'item' : 'items'}</span>}
            {myListings.length > 0 && (
              <button
                onClick={() => setView?.({ id: 'dashboard' })}
                style={{
                  padding: '8px 14px', borderRadius: T.r.pill,
                  background: 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${T.glassBorder}`,
                  color: T.text2, cursor: 'pointer',
                  fontFamily: T.fontSans, fontWeight: 500, fontSize: 12,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                title="Open creator dashboard"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 6-6"/>
                </svg>
                Dashboard
              </button>
            )}
            <button
              onClick={onPublish}
              style={{
                padding: '8px 16px', borderRadius: T.r.pill, border: 'none',
                background: `linear-gradient(135deg, ${T.accentHi}, ${T.accent})`,
                color: '#fff', cursor: 'pointer',
                fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                boxShadow: `0 3px 14px ${T.accent}55`,
              }}
            >+ Publish</button>
          </div>
        </div>
        {myStats && myListings.length > 0 && (
          <div style={{ display: 'flex', gap: 22, marginBottom: 16, marginTop: 10 }}>
            <div><div style={{ ...TY.numSm, color: T.text }}>{fmt(myStats.sales)}</div><div style={{ ...TY.micro, color: T.text3 }}>Sales</div></div>
            <div><div style={{ ...TY.numSm, color: T.text }}>{fmt(myStats.downloads)}</div><div style={{ ...TY.micro, color: T.text3 }}>Downloads</div></div>
            <div><div style={{ ...TY.numSm, color: T.text }}>{myStats.avgRating?.toFixed(1) || '—'}</div><div style={{ ...TY.micro, color: T.text3 }}>Avg rating</div></div>
          </div>
        )}
        {myListings.length === 0 ? (
          <div style={{ ...TY.body, color: T.text3, padding: '18px 0 6px', textAlign: 'center' }}>
            You haven't published anything yet. Pick a type, set a price — it shows up on the marketplace instantly.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
            {myListings.map((l) => (
              <div key={l.id} style={{ position: 'relative' }}>
                <ListingCard
                  l={l}
                  state={state}
                  onOpen={() => setView?.({ id: 'listing', focusId: l.id })}
                  onSeller={() => {}}
                  compact
                  wishlist={wishlist}
                />
                {publishing && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 2,
                    display: 'flex', gap: 6,
                  }}>
                    {/* Edit only works for local `user-…` listings — the backend
                        doesn't have a PATCH route yet, so hide the pencil for
                        server-owned ids (uuids). Unpublish works for both. */}
                    {l.id.startsWith('user-') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(l); }}
                      title="Edit"
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(8,10,18,0.75)',
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                        border: `0.5px solid ${T.glassBorder}`,
                        color: T.text2, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // First click: arm. Second click within 3s: commit.
                        if (armedUnpublishId !== l.id) {
                          setArmedUnpublishId(l.id);
                          try { ElyNotify?.toast?.({ text: `Click × again to unpublish "${l.title}"`, kind: 'info' }); } catch {}
                          return;
                        }
                        setArmedUnpublishId(null);
                        try {
                          await publishing.unpublish(l.id);
                          try { ElyNotify?.toast?.({ text: `${l.title} unpublished`, kind: 'info' }); } catch {}
                        } catch (err) {
                          try { ElyNotify?.toast?.({ text: `Unpublish failed: ${err?.message || 'error'}`, kind: 'error' }); } catch {}
                        }
                      }}
                      title={armedUnpublishId === l.id ? 'Click again to confirm' : 'Unpublish'}
                      aria-label="Unpublish listing"
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: armedUnpublishId === l.id ? 'rgba(220,50,70,0.9)' : 'rgba(8,10,18,0.75)',
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                        border: `0.5px solid ${armedUnpublishId === l.id ? 'rgba(255,160,170,0.6)' : T.glassBorder}`,
                        color: armedUnpublishId === l.id ? '#fff' : T.text2,
                        cursor: 'pointer',
                        fontFamily: T.fontSans, fontSize: 14, lineHeight: 1, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 120ms ease, color 120ms ease',
                      }}
                    >×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
}

// ──── CreatorProfileView — public page for any other seller/member ────
// Synthetic "member since" label. Seeds off the member id so each person gets
// a stable date, descending with leaderboard position (older members listed
// first). Purely decorative until we get real join timestamps from the bot.
function memberSinceLabel(memberId) {
  const members = window.MEMBERS || [];
  const i = members.findIndex((m) => m.id === memberId);
  if (i < 0) return '';
  const now = new Date();
  const monthsAgo = 36 - Math.min(30, i * 3); // higher on list = older
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function CreatorProfileView({ userId, state, setView, onQuick, reviews, wishlist, follows, messages, reports, blocks }) {
  if (T.zodiac && window.ZodiacCreatorProfileView) {
    return <window.ZodiacCreatorProfileView userId={userId} state={state} setView={setView} onQuick={onQuick} reviews={reviews} wishlist={wishlist} follows={follows} messages={messages} reports={reports} blocks={blocks}/>;
  }
  // Try local MEMBERS first (populated from xp table). New members who signed in
  // but haven't earned XP yet won't be there — fall back to /users/:id which
  // queries the users table (created on first sign-in).
  const fromMembers = (window.MEMBERS || []).find((x) => x.id === userId);
  const [fetchedMember, setFetchedMember] = React.useState(null);
  const [fetching, setFetching] = React.useState(false);
  const [fetchFailed, setFetchFailed] = React.useState(false);
  React.useEffect(() => {
    if (fromMembers || fetching || fetchedMember || fetchFailed) return;
    if (!userId) return;
    setFetching(true);
    window.ElyAPI?.get?.(`/users/${encodeURIComponent(userId)}`)
      .then((u) => {
        const built = {
          id: u.id,
          name: u.name || u.username || `User ${String(u.id).slice(-4)}`,
          tag: u.username || String(u.id).slice(-4),
          avatar: u.avatar_url || null,
          aura: 0, level: 1, delta: 0, role: null, discordRoles: [],
          voiceSeconds: 0, gymPosts: 0, gymStreakCurrent: 0, gymStreakBest: 0,
        };
        // Splice into MEMBERS so subsequent lookups (listings byline, etc.) resolve.
        if (!Array.isArray(window.MEMBERS)) window.MEMBERS = [];
        if (!window.MEMBERS.some((x) => x.id === built.id)) window.MEMBERS.push(built);
        setFetchedMember(built);
      })
      .catch(() => setFetchFailed(true))
      .finally(() => setFetching(false));
  }, [userId, fromMembers, fetching, fetchedMember, fetchFailed]);
  const m = fromMembers || fetchedMember;
  const [tab, setTab] = React.useState('listings');
  if (!m) {
    if (fetching) {
      return (
        <Glass style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }}/>
          <div style={{ ...TY.small, color: T.text3 }}>Loading profile…</div>
        </Glass>
      );
    }
    return (
      <Glass style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>Member not found.</div>
        <button onClick={() => setView({ id: 'leaderboard' })} style={{ ...linkStyle(), marginTop: 12 }}>← Back</button>
      </Glass>
    );
  }
  const listings = dedupTieredListings((window.LISTINGS || []).filter((l) => l.sellerId === m.id));
  const stats = listings.length ? getCreatorStats(m.id) : null;
  const joined = memberSinceLabel(m.id);
  // Reviews received across all listings — used by the Reviews tab + the "avg
  // rating" stat in the hero. Recomputed on every render so new reviews show up.
  const receivedReviews = reviewsForSeller(m.id);
  const receivedAvg = receivedReviews.length
    ? receivedReviews.reduce((a, r) => a + r.rating, 0) / receivedReviews.length
    : 0;

  // Activity feed — anything involving this member, newest first.
  const feed = (window.AURA_FEED || []);
  const activity = feed
    .filter((e) => e.fromId === m.id || e.toId === m.id)
    .slice(0, 10);

  const tabStyle = (active, hue = T.accent) => ({
    padding: '10px 16px', borderRadius: T.r.pill, border: 'none',
    background: active ? `linear-gradient(135deg, ${hue}40, ${hue}22)` : 'transparent',
    color: active ? T.text : T.text3,
    cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500, fontSize: 13,
    boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${hue}33` : 'none',
    transition: 'all .18s',
  });

  return (
    <div>
      <button onClick={() => setView({ id: 'store' })} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        ...TY.small, color: T.textOnBg2, display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
      }}>← Marketplace</button>

      <Glass style={{ padding: 32, marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <HoverOrbs restX={20} restY={30} size={440} color={T.accent} colorHi={T.accentHi}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', flexWrap: 'wrap' }}>
          <Avatar name={m.name} src={m.avatar} size={96} ring/>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ ...TY.h1, margin: 0 }}>{m.name}</h1>
            <div style={{ ...TY.body, color: T.text3, marginTop: 4 }}>
              @{m.tag}{joined && <> · <span>Member since {joined}</span></>}
            </div>
            {/* Discord role strip — mirrors the user's own ProfileView. Falls
                back to derived tags if the member hasn't been role-synced. */}
            {(() => {
              const liveRoles = Array.isArray(m.discordRoles) ? m.discordRoles : [];
              const tagsToShow = liveRoles.length
                ? liveRoles.map((r) => ({
                    name: r.name,
                    hue: (r.color && r.color !== '#000000') ? r.color : T.text2,
                  }))
                : (deriveServerTags(m).length ? deriveServerTags(m) : (m.role ? [{ name: m.role, hue: T.text2 }] : []));
              if (!tagsToShow.length) return null;
              return (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {tagsToShow.map((tg) => (
                    <span key={tg.name} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px 4px 8px',
                      borderRadius: T.r.pill,
                      background: 'rgba(8,10,18,0.55)',
                      border: `0.5px solid ${tg.hue}33`,
                      backdropFilter: 'blur(10px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                      color: tg.hue,
                      fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                      letterSpacing: '-0.005em',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: tg.hue,
                        boxShadow: `0 0 6px ${tg.hue}88`,
                      }}/>
                      {tg.name}
                    </span>
                  ))}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
              <div><div style={{ ...TY.numSm, color: T.text }}>Lv {m.level}</div><div style={{ ...TY.micro, color: T.text3 }}>Level</div></div>
              <div><div style={{ ...TY.numSm, color: T.text }}>{fmt(m.aura)}</div><div style={{ ...TY.micro, color: T.text3 }}>Aura</div></div>
              {stats && <>
                <div><div style={{ ...TY.numSm, color: T.text }}>{stats.listings}</div><div style={{ ...TY.micro, color: T.text3 }}>Listings</div></div>
                <div><div style={{ ...TY.numSm, color: T.text }}>{fmt(stats.sales)}</div><div style={{ ...TY.micro, color: T.text3 }}>Sales</div></div>
                <div><div style={{ ...TY.numSm, color: T.text }}>{receivedAvg > 0 ? receivedAvg.toFixed(1) : (stats.avgRating?.toFixed(1) || '—')}</div><div style={{ ...TY.micro, color: T.text3 }}>Avg ★</div></div>
              </>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {follows && (
              <FollowButton
                followed={follows.has(m.id)}
                onToggle={() => {
                  const wasFollowing = follows.has(m.id);
                  follows.toggle(m.id);
                  try {
                    ElyNotify?.toast?.({
                      text: wasFollowing ? `Unfollowed ${m.name.split(' ')[0]}` : `Following ${m.name.split(' ')[0]} — new listings show up in your feed`,
                      kind: wasFollowing ? 'info' : 'success',
                    });
                  } catch {}
                }}
                size="md"
                stopPropagation={false}
              />
            )}
            {messages && (
              <Btn
                icon={<IMessage size={15}/>}
                onClick={() => {
                  const tid = messages.startThread(m.id);
                  if (tid) setView({ id: 'messages', threadId: tid });
                }}
              >Message</Btn>
            )}
            <Btn variant="primary" icon={<IGift size={15}/>} onClick={() => onQuick.gift(m)}>Gift aura</Btn>
            {/* Overflow: Block / Report. Glass chip with icon; only rendered
                when the viewer isn't looking at their own profile. */}
            {m.id !== (window.ME?.id || 'me') && (blocks || reports) && (
              <ProfileOverflowMenu m={m} blocks={blocks} reports={reports}/>
            )}
          </div>
        </div>
      </Glass>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, padding: 6, width: 'fit-content' }}>
        <button style={tabStyle(tab === 'listings')} onClick={() => setTab('listings')}>Listings <span style={{ color: T.text3, marginLeft: 4, fontSize: 11 }}>{listings.length}</span></button>
        <button style={tabStyle(tab === 'reviews')} onClick={() => setTab('reviews')}>Reviews <span style={{ color: T.text3, marginLeft: 4, fontSize: 11 }}>{receivedReviews.length}</span></button>
        <button style={tabStyle(tab === 'about')} onClick={() => setTab('about')}>About</button>
        <button style={tabStyle(tab === 'activity')} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {tab === 'listings' && (
        listings.length > 0 ? (
          <Glass style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <h3 style={{ ...TY.h3, margin: 0 }}>Listings by {m.name.split(' ')[0]}</h3>
              <span style={{ ...TY.small, color: T.text3 }}>{listings.length} {listings.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  l={l}
                  state={state}
                  onOpen={() => setView({ id: 'listing', focusId: l.id })}
                  onSeller={() => {}}
                  compact
                  wishlist={wishlist}
                />
              ))}
            </div>
          </Glass>
        ) : (
          <Glass style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2 }}>
              {m.name.split(' ')[0]} hasn't published anything yet.
            </div>
          </Glass>
        )
      )}

      {tab === 'reviews' && (
        receivedReviews.length > 0 ? (
          <Glass style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ ...TY.micro, color: T.text3 }}>REVIEWS RECEIVED</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StarRow rating={Math.round(receivedAvg)} size={14}/>
                <span style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 14 }}>{receivedAvg.toFixed(2)}</span>
                <span style={{ ...TY.small, color: T.text3, fontSize: 11 }}>· {receivedReviews.length} {receivedReviews.length === 1 ? 'review' : 'reviews'}</span>
              </div>
            </div>
            <div>
              {receivedReviews.slice(0, 20).map((r) => {
                const l = (window.LISTINGS || []).find((x) => x.id === r.listingId);
                return (
                  <div key={r.id}>
                    <ReviewItem review={r} onSeller={(auth) => setView?.({ id: 'profile', userId: auth.id })}/>
                    {l && (
                      <div style={{ marginLeft: 48, marginTop: -8, marginBottom: 4 }}>
                        <button
                          onClick={() => setView({ id: 'listing', focusId: l.id })}
                          style={{
                            background: 'transparent', border: `0.5px solid ${T.glassBorder}`,
                            color: T.text3, cursor: 'pointer',
                            padding: '3px 10px', borderRadius: T.r.pill,
                            fontFamily: T.fontSans, fontSize: 10,
                          }}
                        >on {l.title}</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {receivedReviews.length > 20 && (
                <div style={{ ...TY.small, color: T.text3, textAlign: 'center', paddingTop: 12, fontSize: 11 }}>
                  Showing 20 of {receivedReviews.length}
                </div>
              )}
            </div>
          </Glass>
        ) : (
          <Glass style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ ...TY.body, color: T.text2 }}>
              {m.name.split(' ')[0]} hasn't received any reviews yet.
            </div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              Buyers leave reviews from the listing page.
            </div>
          </Glass>
        )
      )}

      {tab === 'about' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <Glass style={{ padding: 22 }}>
            <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>ROLE</div>
            <div style={{ ...TY.h3, color: T.text, margin: 0 }}>{m.role}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              One of the regulars — rank based on lifetime aura.
            </div>
          </Glass>
          <Glass style={{ padding: 22 }}>
            <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>JOINED</div>
            <div style={{ ...TY.h3, color: T.text, margin: 0 }}>{joined || '—'}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              Community since the early days.
            </div>
          </Glass>
          {stats && (
            <Glass style={{ padding: 22 }}>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>CREATOR</div>
              <div style={{ ...TY.body, color: T.text, margin: 0 }}>
                {stats.listings} {stats.listings === 1 ? 'listing' : 'listings'} · {fmt(stats.sales)} sales
              </div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
                {stats.avgRating > 0 ? `Avg rating ${stats.avgRating.toFixed(1)} ★ across ${fmt(stats.downloads)} downloads.` : 'No ratings yet.'}
              </div>
            </Glass>
          )}
          <Glass style={{ padding: 22 }}>
            <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>MOMENTUM</div>
            <div style={{ ...TY.h3, color: m.delta > 0 ? '#6ee7a0' : m.delta < 0 ? '#ef6b7c' : T.text2, margin: 0 }}>
              {m.delta > 0 ? `↑ ${m.delta}` : m.delta < 0 ? `↓ ${Math.abs(m.delta)}` : '— flat'}
            </div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
              Leaderboard shift this week.
            </div>
          </Glass>
        </div>
      )}

      {tab === 'activity' && (
        <Glass style={{ padding: 22 }}>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 14 }}>RECENT AURA FLOW</div>
          {activity.length === 0 ? (
            <div style={{ ...TY.body, color: T.text3, textAlign: 'center', padding: '20px 0' }}>
              No recent activity.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((e, i) => {
                const outgoing = e.fromId === m.id;
                const counterparty = (window.MEMBERS || []).find((x) => x.id === (outgoing ? e.toId : e.fromId));
                const label = e.kind === 'redeem' ? 'Redeemed' : outgoing ? 'Gifted' : 'Received';
                const amountColor = outgoing || e.kind === 'redeem' ? '#ef6b7c' : '#6ee7a0';
                return (
                  <div key={e.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i === activity.length - 1 ? 'none' : `0.5px solid ${T.glassBorder}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...TY.small, color: T.text }}>
                        <span style={{ color: T.text3 }}>{label}</span>
                        {counterparty && <> <span style={{ color: T.text2 }}>{outgoing ? '→' : '←'} {counterparty.name}</span></>}
                      </div>
                      {e.note && <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 2 }}>{e.note}</div>}
                    </div>
                    <div style={{ ...TY.numSm, color: amountColor, fontSize: 13 }}>
                      {outgoing || e.kind === 'redeem' ? '−' : '+'}{fmt(Math.abs(e.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}

// Redeem history panel — filters window.AURA_FEED for this user's redeems,
// resolves each to its REWARDS entry for image/title, and shows a compact
// list. The aura_log only keeps the last 30 rows server-side (by query LIMIT),
// so this is inherently recent-only — which is fine for a profile page. If we
// ever need full history, it would be a separate dedicated query.
function RedeemHistory({ me }) {
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];
  const [expanded, setExpanded] = React.useState(false);
  if (!me?.id) return null;

  const rewardsById = {};
  for (const r of (window.REWARDS || [])) rewardsById[r.id] = r;

  // Pull out redeems issued by me. `note` is stored as "<rewardId>:<title>"
  // (see data.jsx redeemReward). Split once, tolerate missing title.
  const items = feed
    .filter((e) => e.kind === 'redeem' && e.fromId === me.id)
    .map((e) => {
      const [rewardId, ...rest] = String(e.note || '').split(':');
      const title = rest.join(':') || rewardId || 'Reward';
      return {
        id: e.id,
        rewardId,
        title,
        amount: Math.abs(e.amount || 0),
        at: e.at,
        reward: rewardsById[rewardId] || null,
      };
    });

  if (items.length === 0) return null;

  const INITIAL = 3;
  const visible = expanded ? items : items.slice(0, INITIAL);
  const hidden = items.length - visible.length;

  return (
    <Glass style={{ padding: 28, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <h3 style={{ ...TY.h3, margin: 0 }}>{t('profile.redeems')}</h3>
        <span style={{ ...TY.small, color: T.text3 }}>{items.length} {items.length === 1 ? t('profile.item') : t('profile.items')}</span>
      </div>
      <div>
        {visible.map((it, i) => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 0',
            borderBottom: i === visible.length - 1 && hidden === 0 ? 'none' : `0.5px solid ${T.glassBorder}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: T.r.sm, flexShrink: 0, overflow: 'hidden',
              background: `linear-gradient(135deg, ${T.accent}33, rgba(255,255,255,0.04))`,
              border: `0.5px solid ${T.glassBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {it.reward?.image
                ? <img src={it.reward.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <IStore size={16} color={T.accentHi}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...TY.body, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>
                {relTime(it.at)} {t('profile.ago')} · {t('redeem.deliveryVal')}
              </div>
            </div>
            <div style={{ ...TY.numSm, color: T.text3, fontFamily: T.fontMono, flexShrink: 0 }}>
              −{fmt(it.amount)}
            </div>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginTop: 8, width: '100%', textAlign: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.text3, fontFamily: T.fontSans, fontSize: 12,
            padding: '10px 0', transition: 'color .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
        >
          Show {hidden} more
        </button>
      )}
      {expanded && items.length > INITIAL && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            marginTop: 8, width: '100%', textAlign: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.text3, fontFamily: T.fontSans, fontSize: 12,
            padding: '10px 0', transition: 'color .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
        >
          Show less
        </button>
      )}
    </Glass>
  );
}

function StatCell({ label, value, suffix }) {
  // Subtext contrast bump — the kicker label and the suffix were on T.text3
  // (alpha 0.45) which reads as "half-disabled" against the dark glass. Moved
  // to T.text2 (0.68) so kickers like "AURA" and suffixes like "→39" / "day"
  // are clearly legible without stealing focus from the big number.
  return (
    <Glass style={{ padding: 20 }}>
      <div style={{ ...TY.micro, color: T.text2, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ ...TY.numMed, color: T.text }}>{value}</span>
        {suffix && <span style={{ ...TY.small, color: T.text2 }}>{suffix}</span>}
      </div>
    </Glass>
  );
}


