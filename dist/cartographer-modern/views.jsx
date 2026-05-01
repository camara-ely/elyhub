// ElyHub — Cartographer Modern (topographic dashboard) HomeView.

function CartographerModernHomeView({ state, setState, setView, onQuick }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const ME = window.ME || {};
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const coords = window.coordsModern || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));
  const bearing = window.bearingModern || (() => 0);
  const elev = window.elevationModern || (() => 0);

  const auraNow = Number(ME.aura ?? state?.aura ?? 0);
  const lvl = Number(ME.level ?? state?.level ?? 0);
  const prev = Number(ME.prevLevelAura ?? 0);
  const next = Number(ME.nextLevelAura ?? 1);
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));
  const remaining = Math.max(0, next - auraNow);

  const me = { name: ME.name || state?.name || 'Surveyor', avatar: ME.avatar || null };
  const myCoords = coords(me.name);
  const myBearing = bearing(me.name);
  const myElev = elev(me.name);

  const top = [...(window.MEMBERS || [])].sort((a, b) => (b.aura || 0) - (a.aura || 0)).slice(0, 3);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const tagClaimed = !!ME.tagClaimedToday;
  const boosterClaimed = !!ME.boosterClaimedToday;

  // Claim flow — direct call to ElyOps.claimDaily (onQuick is an object, not
  // a function — see app.jsx). Loading/error state local.
  const [claiming, setClaiming] = React.useState({ tag: false, booster: false });
  const [claimErr, setClaimErr] = React.useState({ tag: null, booster: null });
  async function handleClaim(kind) {
    if (claiming[kind]) return;
    if (!window.ElyOps?.claimDaily) {
      setClaimErr((e) => ({ ...e, [kind]: 'backend offline' }));
      return;
    }
    setClaiming((c) => ({ ...c, [kind]: true }));
    setClaimErr((e) => ({ ...e, [kind]: null }));
    try {
      await window.ElyOps.claimDaily(kind);
      const amount = kind === 'tag' ? 300 : 500;
      const label = kind === 'tag' ? 'ELY tag' : 'Server boost';
      window.ElyNotify?.dispatch?.({
        kind: 'claim',
        title: `+${(window.fmtMm || ((n) => n))(amount)} aura`,
        body: `${label} claimed`,
      });
    } catch (err) {
      const msg = (err?.message || 'claim failed').replace(/^failed:/, '');
      setClaimErr((e) => ({ ...e, [kind]: msg }));
    } finally {
      setClaiming((c) => ({ ...c, [kind]: false }));
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
      gap: 24, position: 'relative', zIndex: 1,
    }}>

    {/* ═══════════ MAIN COLUMN ═══════════ */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ────── Hero panel ────── */}
      <div style={{
        position: 'relative', display: 'grid', gridTemplateColumns: '1.3fr 1fr',
        minHeight: 420, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(20,38,32,0.7), rgba(15,24,22,0.85))',
        border: `1px solid ${Mm.hair2}`,
        borderRadius: Mm.r.md,
      }}>

        {/* ambient compass behind hero — very faint */}
        <div style={{
          position: 'absolute', right: -100, top: '50%', transform: 'translateY(-50%)',
          opacity: 0.06, pointerEvents: 'none', zIndex: 1,
        }}>
          <svg width="500" height="500" viewBox="0 0 500 500" fill="none" stroke={Mm.accent} strokeWidth="0.4">
            <circle cx="250" cy="250" r="240"/>
            <circle cx="250" cy="250" r="200"/>
            <circle cx="250" cy="250" r="160"/>
            <circle cx="250" cy="250" r="120"/>
            <circle cx="250" cy="250" r="80"/>
          </svg>
        </div>

        {/* Minimap inset top-right */}
        <div style={{
          position: 'absolute', top: 24, right: 24,
          width: 144, height: 96,
          background: 'rgba(10,18,16,0.85)',
          border: `1px solid ${Mm.hair2}`,
          borderRadius: 4, padding: 8,
          zIndex: 3, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            ...MmTY.coord, color: Mm.text3, marginBottom: 4,
          }}>
            <span>Sector 04</span>
            <span style={{ color: Mm.accent }}>● Live</span>
          </div>
          <svg viewBox="0 0 128 64" width="128" height="64">
            <defs>
              <pattern id="mm-mini-grid" patternUnits="userSpaceOnUse" width="8" height="8">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke={Mm.accent} strokeWidth="0.3" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="128" height="64" fill="url(#mm-mini-grid)"/>
            <path d="M 0 30 Q 30 20, 60 28 T 128 25" fill="none" stroke={Mm.contour} strokeWidth="0.5"/>
            <path d="M 0 40 Q 30 32, 60 38 T 128 36" fill="none" stroke={Mm.contour} strokeWidth="0.5"/>
            <path d="M 0 50 Q 30 42, 60 48 T 128 46" fill="none" stroke={Mm.contour} strokeWidth="0.5"/>
            <path d="M 12 50 Q 40 32, 70 36 T 116 18" fill="none" stroke={Mm.accent} strokeWidth="1" strokeDasharray="2 2"/>
            <circle cx="12" cy="50" r="2" fill={Mm.cyan}/>
            <circle cx="70" cy="36" r="1.5" fill={Mm.accent}/>
            <circle cx="116" cy="18" r="2.5" fill={Mm.accent}/>
          </svg>
        </div>

        {/* LEFT — greeting + stats */}
        <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div>
            {window.CoordBadge && React.createElement(window.CoordBadge, { name: me.name, style: { marginBottom: 18 } })}
            <div style={{ ...MmTY.caps, color: Mm.text3, marginBottom: 10 }}>{`Survey · ${today}`}</div>
            <h2 style={{ ...MmTY.h1, color: Mm.text, margin: 0, fontWeight: 500 }}>
              {tc('home.welcome')} <strong style={{ color: Mm.accent, fontWeight: 700 }}>{me.name}</strong>
            </h2>
          </div>

          <div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', marginTop: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ ...MmTY.caps, color: Mm.text3 }}>{tc('home.aura.label').toUpperCase()}</span>
                <span style={{ ...MmTY.numTab, fontSize: 44, color: Mm.accent, lineHeight: 1 }}>{fmt(auraNow)}</span>
                <span style={{ ...MmTY.coord, color: Mm.accent, marginTop: 2 }}>↑ +{fmt(elev(me.name))} · {tc('home.elev.today', { n: `↑ ${myElev}` }).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ ...MmTY.caps, color: Mm.text3 }}>{tc('home.rank.label').toUpperCase()}</span>
                <span style={{ ...MmTY.numTab, fontSize: 44, color: Mm.text, lineHeight: 1 }}>L{lvl}</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                ...MmTY.coord, color: Mm.text3, marginBottom: 8,
              }}>
                <span>{tc('home.ascent', { lvl: lvl + 1 })}</span>
                <span style={{ color: Mm.accent }}>{pct}% · {tc('home.toSummit', { n: fmt(remaining) })}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(155,214,107,0.08)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${Mm.accentLo}, ${Mm.accent}, ${Mm.cyan})`,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: -2, right: -1,
                    width: 1, height: 8, background: Mm.accent,
                    boxShadow: `0 0 8px ${Mm.accent}`,
                  }}/>
                </div>
              </div>
            </div>

            {/* (Hero CTA buttons moved to the dedicated Daily Claims section
                below. Hero stays focused on the aura/level numbers and MTopo.) */}
          </div>
        </div>

        {/* RIGHT — compass cartouche */}
        <div style={{ position: 'relative', padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          {window.MTopo && React.createElement(window.MTopo, { size: 240 })}
          <div style={{
            marginTop: 12,
            ...MmTY.coord, color: Mm.text3,
          }}>
            MTopo · {String(myBearing).padStart(3, '0')}° · BEARING {myBearing < 90 ? 'NE' : myBearing < 180 ? 'SE' : myBearing < 270 ? 'SW' : 'NW'}
          </div>
        </div>
      </div>

      {/* ────── Daily claims · telemetry cards ────── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16,
          ...MmTY.caps, color: Mm.text3,
        }}>
          <span style={{ width: 8, height: 8, background: Mm.cyan, borderRadius: 1, boxShadow: `0 0 6px ${Mm.cyan}` }}/>
          <span>{tc('claim.section.title')}</span>
          <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>
            {tc('claim.available', { n: (tagClaimed ? 0 : 1) + (boosterClaimed ? 0 : 1) })}
          </span>
          <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ModernClaimCard claimed={tagClaimed} label={tc('claim.label.tag')} amount={300}
                            cooldown={tc('claim.hint.tag')}
                            loading={claiming.tag} error={claimErr.tag}
                            onClaim={() => handleClaim('tag')}/>
          <ModernClaimCard claimed={boosterClaimed} label={tc('claim.label.booster')} amount={500}
                            cooldown={tc('claim.hint.booster')}
                            loading={claiming.booster} error={claimErr.booster}
                            onClaim={() => handleClaim('booster')}/>
        </div>
      </div>

      {/* ────── Top 3 leaderboard pins ────── */}
      {top.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
            ...MmTY.caps, color: Mm.text3,
          }}>
            <span style={{ width: 8, height: 8, background: Mm.accent, borderRadius: 1, boxShadow: `0 0 8px ${Mm.accent}` }}/>
            <span>{tc('podium.title')}</span>
            <button onClick={() => setView && setView({ id: 'leaderboard' })} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...MmTY.coord, color: Mm.accent, fontSize: 9, padding: 0, marginLeft: 'auto',
            }}>{tc('common.viewAll')} →</button>
            <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {top.map((m, i) => {
              const rank = i + 1;
              const isFirst = rank === 1;
              const c = coords(m.name || '');
              return (
                <div key={m.id || rank} onClick={() => setView && setView({ id: 'profile', userId: m.id })}
                     style={{
                       position: 'relative', cursor: 'pointer',
                       background: isFirst
                         ? 'linear-gradient(135deg, rgba(155,214,107,0.10), rgba(93,211,196,0.04))'
                         : 'rgba(15,30,25,0.55)',
                       border: `1px solid ${isFirst ? Mm.hair3 : Mm.hair2}`,
                       borderRadius: 6,
                       padding: '20px 22px 18px',
                       boxShadow: isFirst ? `0 0 24px rgba(155,214,107,0.15)` : 'none',
                       transition: 'transform 0.15s, border-color 0.15s',
                     }}
                     onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; }}
                     onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = isFirst ? Mm.hair3 : Mm.hair2; }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    {window.MPin && React.createElement(window.MPin, {
                      value: rank, size: isFirst ? 48 : 40,
                      tone: isFirst ? 'accent' : (rank === 2 ? 'cyan' : 'mute'),
                    })}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        ...MmTY.h3, color: Mm.text, margin: 0, fontSize: 15,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{m.name || '—'}</div>
                      <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 2 }}>
                        L{m.level || 0} · {c.lat}°{c.latDir}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    paddingTop: 12, borderTop: `1px solid ${Mm.hair}`,
                  }}>
                    <div>
                      <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 2 }}>Aura</div>
                      <div style={{ ...MmTY.numTab, fontSize: 22, color: isFirst ? Mm.accent : Mm.text }}>
                        {fmt(m.aura || 0)}
                      </div>
                    </div>
                    <div style={{ ...MmTY.coord, color: Mm.cyan }}>↑ {elev(m.name)}m</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
    {/* ═══════════ RIGHT COLUMN — Featured + live feed ═══════════ */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          ...MmTY.caps, color: Mm.text3,
        }}>
          <span style={{ width: 6, height: 6, background: Mm.cyan, borderRadius: 1, boxShadow: `0 0 6px ${Mm.cyan}` }}/>
          <span>{tc('featured.title')}</span>
          <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
        </div>
        <ModernFeaturedDrop onQuick={onQuick} setView={setView}/>
      </div>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          ...MmTY.caps, color: Mm.text3,
        }}>
          <span style={{ width: 6, height: 6, background: Mm.accent, borderRadius: 1, boxShadow: `0 0 8px ${Mm.accent}` }}/>
          <span>{tc('feed.title')}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            ...MmTY.coord, color: Mm.accent, fontSize: 9,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: Mm.accent,
              boxShadow: `0 0 6px ${Mm.accent}`,
              animation: 'mmPulse 2s ease-in-out infinite',
            }}/>
            {tc('feed.live')}
          </span>
          <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
        </div>
        <ModernAuraFeed/>
      </div>
    </div>
    </div>
  );
}

// ─── ModernClaimCard ────────────────────────────────────────────────────
function ModernClaimCard({ claimed, label, amount, cooldown, onClaim, loading, error }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  return (
    <div style={{
      position: 'relative',
      background: claimed ? 'rgba(15,30,25,0.35)' : 'rgba(15,30,25,0.55)',
      border: `1px solid ${claimed ? Mm.hair : Mm.hair2}`, borderRadius: 6,
      padding: '20px 22px',
      opacity: claimed ? 0.66 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 4,
          background: claimed ? 'rgba(155,214,107,0.06)' : `linear-gradient(135deg, ${Mm.accent}33, ${Mm.cyan}11)`,
          border: `1px solid ${claimed ? Mm.hair : Mm.hair3}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: claimed ? Mm.text3 : Mm.accent,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3"/>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line key={a} x1="12" y1="3" x2="12" y2="6" transform={`rotate(${a} 12 12)`}/>
            ))}
          </svg>
        </div>
        <span style={{
          ...MmTY.coord, fontSize: 9, color: claimed ? Mm.text3 : Mm.accent,
          padding: '3px 8px', border: `1px solid ${claimed ? Mm.hair : Mm.hair3}`,
          borderRadius: 2,
        }}>{claimed ? tc('claim.status.claimed') : tc('common.available').toUpperCase()}</span>
      </div>
      <h3 style={{ ...MmTY.h3, color: Mm.text, margin: '0 0 4px', fontSize: 16 }}>{label}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <span style={{ ...MmTY.numTab, fontSize: 32, color: claimed ? Mm.text2 : Mm.accent, lineHeight: 1 }}>+{fmt(amount)}</span>
        <span style={{ ...MmTY.coord, color: Mm.text3 }}>{tc('common.aura')}</span>
      </div>
      {cooldown && (
        <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginBottom: 14 }}>
          {cooldown}
        </div>
      )}
      {!claimed && (
        <button onClick={onClaim} disabled={loading} style={{
          padding: '8px 16px', borderRadius: 4,
          background: loading ? 'transparent' : Mm.accent,
          color: loading ? Mm.text2 : Mm.bg,
          border: `1px solid ${Mm.accent}`,
          fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          boxShadow: loading ? 'none' : `0 0 12px ${Mm.accent}33`,
        }}>{loading ? tc('claim.cta.loading') : tc('claim.cta')}</button>
      )}
      {error && (
        <div style={{
          marginTop: 10, ...MmTY.coord, color: Mm.danger, fontSize: 9,
        }}>⚠ {error.toUpperCase()}</div>
      )}
    </div>
  );
}

// ─── ModernFeaturedDrop ─────────────────────────────────────────────────
function ModernFeaturedDrop({ onQuick, setView }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const me = window.ME || {};
  const myAura = me.aura || 0;
  const myLevel = me.level || 0;
  const REWARDS = window.REWARDS || [];

  const featured = REWARDS.find((x) => x.featured) || REWARDS[0];
  if (!featured) return null;
  const canUnlock = myLevel >= (featured.level || 0) && myAura >= (featured.price || 0);
  const auraShort = Math.max(0, (featured.price || 0) - myAura);
  const pct = featured.price ? Math.min(100, Math.round((myAura / featured.price) * 100)) : 0;

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(15,30,25,0.55)',
      border: `1px solid ${Mm.hair2}`, borderRadius: 6,
      padding: 18, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <span style={{
          ...MmTY.coord, fontSize: 9, color: canUnlock ? Mm.accent : Mm.text3,
          padding: '3px 8px', border: `1px solid ${canUnlock ? Mm.hair3 : Mm.hair}`,
          borderRadius: 2,
        }}>{canUnlock ? 'AVAILABLE' : `${fmt(auraShort)} SHORT`}</span>
        {typeof featured.stock === 'number' && featured.stock <= 10 && (
          <span style={{
            ...MmTY.coord, fontSize: 9, color: Mm.cyan,
            padding: '3px 8px', border: `1px solid ${Mm.cyan}66`, borderRadius: 2,
          }}>{featured.stock} LEFT</span>
        )}
      </div>

      <div style={{
        height: 130, marginBottom: 12, borderRadius: 4,
        background: featured.image
          ? `url("${featured.image}") center/cover`
          : `linear-gradient(135deg, ${Mm.accent}22, ${Mm.cyan}11)`,
        border: `1px solid ${Mm.hair}`,
        filter: canUnlock ? 'none' : 'grayscale(0.45) brightness(0.72)',
      }}/>

      <h3 style={{ ...MmTY.h3, color: Mm.text, margin: 0, fontSize: 16 }}>{featured.title}</h3>
      <p style={{ ...MmTY.small, color: Mm.text3, margin: '4px 0 14px' }}>{featured.sub}</p>

      {!canUnlock && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...MmTY.coord, color: Mm.text3, marginBottom: 5 }}>
            <span>PROGRESS</span>
            <span style={{ color: Mm.accent }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(155,214,107,0.08)', borderRadius: 1 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${Mm.accentLo}, ${Mm.accent}, ${Mm.cyan})`,
            }}/>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${Mm.hair}` }}>
        <div>
          <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>COST</div>
          <div style={{ ...MmTY.numTab, fontSize: 20, color: Mm.accent }}>{fmt(featured.price)}</div>
        </div>
        <button onClick={() => onQuick && onQuick.redeem && onQuick.redeem(featured)}
          disabled={!canUnlock} style={{
            padding: '9px 18px', borderRadius: 4,
            background: canUnlock ? Mm.accent : 'transparent',
            color: canUnlock ? Mm.bg : Mm.text3,
            border: `1px solid ${canUnlock ? Mm.accent : Mm.hair2}`,
            fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 600,
            cursor: canUnlock ? 'pointer' : 'not-allowed',
            boxShadow: canUnlock ? `0 0 14px ${Mm.accent}33` : 'none',
          }}>{canUnlock ? 'Redeem' : 'Locked'}</button>
      </div>
    </div>
  );
}

// ─── ModernAuraFeed ─────────────────────────────────────────────────────
function ModernAuraFeed() {
  const Mm = window.Mm, MmTY = window.MmTY;
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const [, _tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    if (typeof window.__subscribeLive !== 'function') return undefined;
    return window.__subscribeLive(() => _tick());
  }, []);
  const feed = (Array.isArray(window.AURA_FEED) ? window.AURA_FEED : []).slice(0, 8);

  const rel = (atMs) => {
    if (!atMs) return '';
    const ms = Date.now() - atMs;
    if (ms < 60_000) return 'now';
    const m = Math.floor(ms / 60_000); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const captionOf = (e) => {
    const from = (e.fromName || 'someone').split(' ')[0];
    const to   = (e.toName   || 'someone').split(' ')[0];
    switch (e.kind) {
      case 'gift':           return <><strong style={{ color: Mm.text }}>{from}</strong> <span style={{ color: Mm.text3 }}>→</span> <strong style={{ color: Mm.text }}>{to}</strong></>;
      case 'redeem':         return <><strong style={{ color: Mm.text }}>{from}</strong> <span style={{ color: Mm.text3 }}>redeemed</span></>;
      case 'daily_tag':      return <><strong style={{ color: Mm.text }}>{to}</strong> <span style={{ color: Mm.text3 }}>claimed ELY tag</span></>;
      case 'daily_booster':  return <><strong style={{ color: Mm.text }}>{to}</strong> <span style={{ color: Mm.text3 }}>claimed booster</span></>;
      case 'gym_post':       return <><strong style={{ color: Mm.text }}>{to}</strong> <span style={{ color: Mm.text3 }}>gym post</span></>;
      case 'postjob':        return <><strong style={{ color: Mm.text }}>{to}</strong> <span style={{ color: Mm.text3 }}>job posted</span></>;
      case 'admin':          return <><strong style={{ color: Mm.text }}>{to}</strong> <span style={{ color: Mm.text3 }}>admin grant</span></>;
      default:               return <><strong style={{ color: Mm.text }}>{to || from}</strong> <span style={{ color: Mm.text3 }}>{e.kind}</span></>;
    }
  };

  if (feed.length === 0) {
    return (
      <div style={{
        background: 'rgba(15,30,25,0.4)', border: `1px dashed ${Mm.hair2}`,
        padding: '32px 24px', textAlign: 'center', borderRadius: 6,
        ...MmTY.body, color: Mm.text3,
      }}>No telemetry yet.</div>
    );
  }

  return (
    <div style={{
      background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
      borderRadius: 6, overflow: 'hidden',
    }}>
      {feed.map((e, i) => {
        const initial = ((e.fromName || e.toName || '?')[0] || '?').toUpperCase();
        const avatar = e.fromAvatar || e.toAvatar;
        return (
          <div key={e.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 16px',
            borderBottom: i === feed.length - 1 ? 'none' : `1px solid ${Mm.hair}`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4, flexShrink: 0,
              background: avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
              border: `1px solid ${Mm.hair2}`, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatar
                ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 11, fontWeight: 700 }}>{initial}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0, ...MmTY.body, fontSize: 13 }}>
              {captionOf(e)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...MmTY.numTab, fontSize: 13, color: Mm.accent }}>+{fmt(Math.abs(e.amount))}</div>
              <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>{rel(e.at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.CartographerModernHomeView = CartographerModernHomeView;
