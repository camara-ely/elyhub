// ElyHub — Cartographer (vintage) variants.
//
// Mounted only when T.cartographer is true (see theme.jsx). Mirrors the
// dist/zodiac/views.jsx pattern: defines a HomeView replacement and exposes
// it via window.CartographerHomeView, which home.jsx delegates to.

// ─── CartographerHomeView ────────────────────────────────────────────────
// Hero panel at the top (parchment + ornate corners + MCompass + stats),
// followed by a "Tábua dos Navegantes" podium of the top 3 with wax seals.
//
// Read-only of window.ME / window.MEMBERS — same source the default
// HomeView consumes, so all live data (aura, level, daily claim status)
// stays in sync without any extra plumbing.
function CartographerHomeView({ state, setState, setView, onQuick }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const ME = window.ME || {};
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const bearingOf = window.bearingOf || (() => 0);
  const coordsOf = window.coordsOf || (() => ({ lat: '0.00', lon: '0.00', latDir: 'N', lonDir: 'E' }));
  const elevationOf = window.elevationOf || (() => 0);
  const initialOf = window.initialOf || ((s) => (s || '?')[0]);
  const romanOf = window.romanOf || ((n) => String(n));

  const auraNow = Number(ME.aura ?? state?.aura ?? 0);
  const lvl = Number(ME.level ?? state?.level ?? 0);
  const prev = Number(ME.prevLevelAura ?? 0);
  const next = Number(ME.nextLevelAura ?? 1);
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));
  const remaining = Math.max(0, next - auraNow);

  const me = {
    name: ME.name || state?.name || 'Navegante',
    avatar: ME.avatar || null,
  };
  const meBearing = bearingOf(me.name);
  const meCoords = coordsOf(me.name);
  const meElev = elevationOf(me.name);

  // Top of the leaderboard for the "Tábua dos Navegantes" podium. Hidden
  // owners (LEADERBOARD_HIDDEN_IDS) already filtered server-side.
  const top = [...(window.MEMBERS || [])].sort((a, b) => (b.aura || 0) - (a.aura || 0)).slice(0, 3);

  // PT-BR weekday/date for the eyebrow line. Cinzel is all-caps so we
  // intentionally don't toUpperCase() ourselves — the styling handles it.
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const tagClaimed = !!ME.tagClaimedToday;
  const boosterClaimed = !!ME.boosterClaimedToday;

  // Claim flow — mirrors the host HomeView's handleClaim. Calls window.ElyOps
  // directly because onQuick is an object map (gift/redeem/settings/...) and
  // doesn't expose a daily-claim method. Loading/error state lives locally.
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
      const label = kind === 'tag' ? 'Selo ELY' : 'Bônus de Bordo';
      window.ElyNotify?.dispatch?.({
        kind: 'claim',
        title: `+${(window.fmtM || ((n) => n))(amount)} aura`,
        body: `${label} recolhido`,
      });
    } catch (err) {
      const msg = (err?.message || 'falha').replace(/^failed:/, '');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ───── Hero panel — parchment + ornate corners + compass + stats ───── */}
      <div style={{
        position: 'relative', display: 'grid', gridTemplateColumns: '1.3fr 1fr',
        minHeight: 420,
        background: 'linear-gradient(180deg, rgba(232,220,192,0.4), rgba(220,207,174,0.6)), #EFE3C8',
        border: '1px solid rgba(59,38,22,0.4)',
        boxShadow: '4px 6px 20px rgba(59,38,22,0.15)',
        overflow: 'hidden',
      }}>
        {/* 4 ornate corners — diagonal mirroring via transform */}
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 56, style: { position: 'absolute', top: 8, left: 8, zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 56, style: { position: 'absolute', top: 8, right: 8, transform: 'scaleX(-1)', zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 56, style: { position: 'absolute', bottom: 8, left: 8, transform: 'scaleY(-1)', zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 56, style: { position: 'absolute', bottom: 8, right: 8, transform: 'scale(-1,-1)', zIndex: 5 } })}
          </>
        )}
        {/* double inner border */}
        <div style={{ position: 'absolute', inset: 14, border: `1px solid ${M.ink}`, opacity: 0.35, pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 18, border: `0.5px solid ${M.ink}`, opacity: 0.18, pointerEvents: 'none' }}/>

        {/* ── LEFT: greeting + stats ── */}
        <div style={{ padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div>
            {/* eyebrow with live dot — wax-red pulsing pip + cinzel caption */}
            <div style={{
              ...MTY.capsSm, color: M.wax,
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: M.wax,
                boxShadow: `0 0 8px ${M.waxGlow}`,
                animation: 'mPulse 2s ease-in-out infinite',
              }}/>
              <span>{today}</span>
              <span style={{ flex: 'none', width: 40, height: 1, background: M.wax, opacity: 0.6 }}/>
            </div>

            {/* greeting */}
            <h2 style={{
              ...MTY.h1, color: M.ink, margin: 0,
            }}>
              {tc('home.welcome')}{' '}
              <em style={{
                fontStyle: 'italic', fontFamily: M.fontBody, fontWeight: 500,
                color: M.wax, textTransform: 'none', letterSpacing: '0.01em',
              }}>{me.name}</em>
            </h2>

            <p style={{ ...MTY.hand, color: M.ink3, margin: '6px 0 0' }}>
              {tc('home.wind.line', {
                dir: tc(meBearing < 90 ? 'home.wind.NE' : meBearing < 180 ? 'home.wind.SE' : meBearing < 270 ? 'home.wind.SW' : 'home.wind.NW'),
                bearing: meBearing,
              })}
            </p>
          </div>

          {/* stats + progress */}
          <div>
            <div style={{
              display: 'flex', gap: 36, alignItems: 'flex-end',
              marginTop: 24, paddingTop: 24, borderTop: `1px solid ${M.hair}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...MTY.capsSm, color: M.ink3 }}>{tc('home.aura.label')}</span>
                <span style={{ ...MTY.num, fontSize: 44, color: M.wax, lineHeight: 1 }}>{fmt(auraNow)}</span>
                <span style={{ ...MTY.hand, color: M.ink3, fontSize: 13 }}>
                  {tc('home.elev.today', { n: `↑ ${meElev}` })}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...MTY.capsSm, color: M.ink3 }}>{tc('home.rank.label')}</span>
                <span style={{ ...MTY.num, fontSize: 44, color: M.ink, lineHeight: 1 }}>L{lvl}</span>
              </div>
            </div>

            {/* progress bar — gold→wax fill with sigil tail */}
            <div style={{ marginTop: 22 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                ...MTY.capsSm, color: M.ink3, marginBottom: 8,
              }}>
                <span>{tc('home.ascent', { lvl: lvl + 1 })}</span>
                <span style={{ color: M.wax }}>{pct}% · {tc('home.toSummit', { n: fmt(remaining) })}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(59,38,22,0.12)', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${M.gold}, ${M.wax})`,
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', top: -10, right: -8, fontSize: 12, color: M.wax,
                  }}>✦</span>
                </div>
              </div>
            </div>

            {/* (Hero CTA buttons moved to the dedicated Daily Claims section
                below — see <CartoClaim/>. Keeping the hero focused on the
                aura/level/progress numbers and the rosa-dos-ventos.) */}
          </div>
        </div>

        {/* ── RIGHT: compass cartouche + caption ── */}
        <div style={{ position: 'relative', padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ position: 'relative' }}>
            {window.MCompass && React.createElement(window.MCompass, { size: 240, wax: true })}
            <div style={{
              position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)',
              ...MTY.hand, color: M.ink3, whiteSpace: 'nowrap', textAlign: 'center',
            }}>
              Rosa-dos-Ventos
              <span style={{
                display: 'block', marginTop: 2,
                ...MTY.capsSm, color: M.wax, fontStyle: 'normal',
              }}>
                {meCoords.lat}°{meCoords.latDir} · {meCoords.lon}°{meCoords.lonDir} · Rumo {meBearing}°
              </span>
            </div>
          </div>
        </div>

        {/* "hic sunt dracones" easter egg — bottom-left, tilted, low-opacity */}
        <div style={{
          position: 'absolute', bottom: 26, left: 84,
          ...MTY.hand, color: M.wax, opacity: 0.45,
          transform: 'rotate(-3deg)', zIndex: 4,
          pointerEvents: 'none',
        }}>hic sunt dracones</div>
      </div>

      {/* ───── Daily claims — paper certificates ───── */}
      <div>
        <div style={{
          ...MTY.capsSm, color: M.ink2, marginBottom: 16,
          display: 'flex', alignItems: 'baseline', gap: 14,
        }}>
          <span style={{ flex: 'none', width: 24, height: 1, background: M.hair2 }}/>
          <span>{tc('claim.section.title')}</span>
          <span style={{ ...MTY.hand, color: M.ink3, fontStyle: 'italic', fontSize: 12, letterSpacing: 0, textTransform: 'none' }}>
            {tc('claim.available', { n: (tagClaimed ? 0 : 1) + (boosterClaimed ? 0 : 1) })}
          </span>
          <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CartoClaim claimed={tagClaimed} label={tc('claim.label.tag')} amount={300}
                     hint={tc('claim.hint.tag')}
                     loading={claiming.tag} error={claimErr.tag}
                     onClaim={() => handleClaim('tag')}/>
          <CartoClaim claimed={boosterClaimed} label={tc('claim.label.booster')} amount={500}
                     hint={tc('claim.hint.booster')}
                     loading={claiming.booster} error={claimErr.booster}
                     onClaim={() => handleClaim('booster')}/>
        </div>
      </div>

      {/* ───── Tábua dos Navegantes — top 3 podium ───── */}
      {top.length > 0 && (
        <div>
          <div style={{
            ...MTY.capsSm, color: M.ink2, marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ flex: 'none', width: 24, height: 1, background: M.hair2 }}/>
            <span>{tc('podium.title')}</span>
            <button onClick={() => setView && setView({ id: 'leaderboard' })} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...MTY.capsSm, color: M.wax, fontSize: 9,
              letterSpacing: '0.20em', padding: 0, marginLeft: 'auto',
            }}>{tc('common.viewAll')} →</button>
            <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {top.map((m, i) => {
              const rank = i + 1;
              const isFirst = rank === 1;
              const bearing = bearingOf(m.name || '');
              const coords = coordsOf(m.name || '');
              return (
                <div key={m.id || rank} onClick={() => setView && setView({ id: 'profile', userId: m.id })}
                     style={{
                       position: 'relative', cursor: 'pointer',
                       background: isFirst
                         ? 'linear-gradient(180deg, rgba(200,162,78,0.18), rgba(139,36,24,0.06)), #EFE3C8'
                         : '#EFE3C8',
                       border: `1px solid ${isFirst ? M.hair3 : M.hair2}`,
                       padding: '22px 22px 20px',
                       boxShadow: isFirst
                         ? '3px 5px 18px rgba(139,36,24,0.18)'
                         : '2px 4px 12px rgba(59,38,22,0.10)',
                     }}>
                  {/* rank — roman numeral pill in top-right */}
                  <div style={{
                    position: 'absolute', top: 14, right: 16,
                    ...MTY.caps, fontSize: 13, color: isFirst ? M.wax : M.ink3,
                    letterSpacing: '0.18em',
                  }}>
                    {romanOf(rank)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    {window.WaxSeal && React.createElement(window.WaxSeal, {
                      src: m.avatar, name: m.name, size: isFirst ? 56 : 46,
                    })}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        ...MTY.h3, color: M.ink, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{m.name || '—'}</div>
                      <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 2 }}>
                        L{m.level || 0} · {tc('podium.bearing', { n: bearing })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                    <div>
                      <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>{tc('common.aura')}</div>
                      <div style={{ ...MTY.num, fontSize: 22, color: isFirst ? M.wax : M.ink }}>
                        {fmt(m.aura || 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>{tc('podium.position')}</div>
                      <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12 }}>
                        {coords.lat}°{coords.latDir}<br/>{coords.lon}°{coords.lonDir}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
    {/* ═══════════ RIGHT COLUMN — Featured + live feed ═══════════ */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{
          ...MTY.capsSm, color: M.ink2, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ flex: 'none', width: 16, height: 1, background: M.hair2 }}/>
          <span>{tc('featured.title')}</span>
          <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
        </div>
        <FeaturedTomo onQuick={onQuick} setView={setView}/>
      </div>
      <div>
        <div style={{
          ...MTY.capsSm, color: M.ink2, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ flex: 'none', width: 16, height: 1, background: M.hair2 }}/>
          <span>{tc('feed.title')}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            ...MTY.capsSm, color: M.wax, fontSize: 9,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: M.wax,
              boxShadow: `0 0 6px ${M.waxGlow}`,
              animation: 'mPulse 2s ease-in-out infinite',
            }}/>
            {tc('feed.live')}
          </span>
          <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
        </div>
        <ParchmentFeed onQuick={onQuick} setView={setView}/>
      </div>
    </div>

    {/* live-pulse keyframes — scoped global once */}
    <style>{`
      @keyframes mPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.85); }
      }
    `}</style>
    </div>
  );
}

// ─── CartoClaim — vintage daily-claim card ────────────────────────────────
// Paper certificate showing daily claim availability. Wax-red CTA when
// available, sepia ghost when already claimed. Renamed from ClaimCard to
// avoid colliding with the host's ClaimCard in modals.jsx (Babel scripts
// share global scope, so identical names overwrite each other).
function CartoClaim({ claimed, label, amount, hint, onClaim, loading, error }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  return (
    <div style={{
      position: 'relative',
      background: claimed ? 'rgba(232,220,192,0.5)' : '#EFE3C8',
      border: `1px solid ${claimed ? M.hair2 : M.hair3}`,
      padding: '20px 22px 18px',
      boxShadow: claimed ? 'none' : '2px 4px 12px rgba(59,38,22,0.10)',
      opacity: claimed ? 0.66 : 1,
    }}>
      {window.OrnateCorner && (
        <>
          {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', top: 4, left: 4 } })}
          {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)' } })}
        </>
      )}

      {/* status pill in top-right */}
      <span style={{
        position: 'absolute', top: 14, right: 16,
        ...MTY.capsSm, fontSize: 9, color: claimed ? M.ink3 : M.wax,
        padding: '3px 8px', border: `1px solid ${claimed ? M.hair2 : M.wax}`,
        letterSpacing: '0.18em',
      }}>{claimed ? tc('claim.status.claimed') : tc('common.available')}</span>

      <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 6 }}>{tc('claim.kind.label')}</div>
      <div style={{ ...MTY.h3, color: M.ink, fontSize: 17, margin: '0 0 6px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
        <span style={{ ...MTY.num, fontSize: 30, color: claimed ? M.ink3 : M.wax, lineHeight: 1 }}>+{fmt(amount)}</span>
        <span style={{ ...MTY.capsSm, color: M.ink3 }}>{tc('common.aura')}</span>
      </div>
      {hint && (
        <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginBottom: 14, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}
      {!claimed && (
        <button onClick={onClaim} disabled={loading} style={{
          padding: '10px 18px',
          background: loading ? 'transparent' : M.wax,
          color: loading ? M.ink2 : M.surface,
          border: `1px solid ${M.wax}`,
          fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          cursor: loading ? 'default' : 'pointer',
          boxShadow: loading ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.15), 2px 3px 6px rgba(139,36,24,0.3)',
          opacity: loading ? 0.7 : 1,
        }}>{loading ? tc('claim.cta.loading') : tc('claim.cta')}</button>
      )}
      {error && (
        <div style={{
          marginTop: 10, ...MTY.hand, color: M.wax, fontSize: 12,
          fontStyle: 'italic',
        }}>⚠ {error}</div>
      )}
    </div>
  );
}

// ─── FeaturedTomo — vintage drop card pulling from REWARDS ──────────────
function FeaturedTomo({ onQuick, setView }) {
  const M = window.M, MTY = window.MTY;
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
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
      position: 'relative', background: '#EFE3C8',
      border: `1px solid ${M.hair2}`,
      padding: 20, boxShadow: '2px 4px 12px rgba(59,38,22,0.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{
          ...MTY.capsSm, fontSize: 9, color: canUnlock ? M.wax : M.ink3,
          padding: '3px 8px', border: `1px solid ${canUnlock ? M.wax : M.hair2}`,
          letterSpacing: '0.18em',
        }}>{canUnlock ? 'Disponível' : `Faltam ${fmt(auraShort)}`}</span>
      </div>

      <div style={{
        height: 130, marginBottom: 12,
        background: featured.image
          ? `url("${featured.image}") center/cover`
          : `linear-gradient(135deg, rgba(200,162,78,0.30), rgba(232,220,192,0.5))`,
        border: `1px solid ${M.hair2}`,
        filter: canUnlock ? 'sepia(0.25)' : 'sepia(0.55) brightness(0.78)',
      }}/>

      <h3 style={{ ...MTY.h3, color: M.ink, fontSize: 17, margin: 0 }}>{featured.title}</h3>
      <p style={{ ...MTY.hand, color: M.ink3, fontSize: 13, margin: '4px 0 14px', fontStyle: 'italic' }}>
        {featured.sub}
      </p>

      {!canUnlock && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...MTY.capsSm, color: M.ink3, marginBottom: 5 }}>
            <span>Progresso</span>
            <span style={{ color: M.wax }}>{pct}%</span>
          </div>
          <div style={{ height: 2, background: 'rgba(59,38,22,0.12)' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${M.gold}, ${M.wax})`,
            }}/>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px dashed ${M.hair}` }}>
        <div>
          <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 9 }}>Custo</div>
          <div style={{ ...MTY.num, fontSize: 18, color: M.wax }}>{fmt(featured.price)}</div>
        </div>
        <button onClick={() => onQuick && onQuick.redeem && onQuick.redeem(featured)}
          disabled={!canUnlock}
          style={{
            padding: '9px 16px',
            background: canUnlock ? M.wax : 'transparent',
            color: canUnlock ? M.surface : M.ink3,
            border: `1px solid ${canUnlock ? M.wax : M.hair2}`,
            fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            cursor: canUnlock ? 'pointer' : 'not-allowed',
            boxShadow: canUnlock ? 'inset 0 1px 0 rgba(255,255,255,0.15), 2px 3px 6px rgba(139,36,24,0.3)' : 'none',
          }}>{canUnlock ? 'Resgatar' : 'Bloqueado'}</button>
      </div>
    </div>
  );
}

// ─── ParchmentFeed — last ~8 aura events ────────────────────────────────
function ParchmentFeed({ onQuick, setView }) {
  const M = window.M, MTY = window.MTY;
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const [, _tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    if (typeof window.__subscribeLive !== 'function') return undefined;
    return window.__subscribeLive(() => _tick());
  }, []);
  const feed = (Array.isArray(window.AURA_FEED) ? window.AURA_FEED : []).slice(0, 8);

  // Relative time PT-BR.
  const rel = (atMs) => {
    if (!atMs) return '';
    const ms = Date.now() - atMs;
    if (ms < 60_000) return 'agora';
    const m = Math.floor(ms / 60_000); if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  // Map an event kind to a vintage caption.
  const captionOf = (e) => {
    const from = (e.fromName || 'alguém').split(' ')[0];
    const to   = (e.toName   || 'alguém').split(' ')[0];
    switch (e.kind) {
      case 'gift':           return <><strong style={{ color: M.ink }}>{from}</strong> <span style={{ color: M.ink3 }}>→</span> <strong style={{ color: M.ink }}>{to}</strong></>;
      case 'redeem':         return <><strong style={{ color: M.ink }}>{from}</strong> <span style={{ color: M.ink3 }}>resgatou</span></>;
      case 'daily_tag':      return <><strong style={{ color: M.ink }}>{to}</strong> <span style={{ color: M.ink3 }}>recolheu selo</span></>;
      case 'daily_booster':  return <><strong style={{ color: M.ink }}>{to}</strong> <span style={{ color: M.ink3 }}>recolheu bônus</span></>;
      case 'gym_post':       return <><strong style={{ color: M.ink }}>{to}</strong> <span style={{ color: M.ink3 }}>treinou</span></>;
      case 'postjob':        return <><strong style={{ color: M.ink }}>{to}</strong> <span style={{ color: M.ink3 }}>publicou vaga</span></>;
      case 'admin':          return <><strong style={{ color: M.ink }}>{to}</strong> <span style={{ color: M.ink3 }}>almirantado</span></>;
      default:               return <><strong style={{ color: M.ink }}>{to || from}</strong> <span style={{ color: M.ink3 }}>{e.kind}</span></>;
    }
  };

  if (feed.length === 0) {
    return (
      <div style={{
        background: 'rgba(232,220,192,0.5)', border: `1px dashed ${M.hair2}`,
        padding: '32px 24px', textAlign: 'center',
        ...MTY.hand, color: M.ink3, fontSize: 14, fontStyle: 'italic',
      }}>Diário em silêncio.</div>
    );
  }

  return (
    <div style={{
      background: '#EFE3C8', border: `1px solid ${M.hair2}`,
      boxShadow: '2px 4px 12px rgba(59,38,22,0.08)',
    }}>
      {feed.map((e, i) => (
        <div key={e.id || i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 16px',
          borderBottom: i === feed.length - 1 ? 'none' : `1px dashed ${M.hair}`,
        }}>
          {window.WaxSeal && React.createElement(window.WaxSeal, {
            src: e.fromAvatar || e.toAvatar, name: e.fromName || e.toName, size: 30, ring: 4,
          })}
          <div style={{ flex: 1, minWidth: 0, ...MTY.body, color: M.ink2, fontSize: 13 }}>
            {captionOf(e)}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...MTY.num, fontSize: 14, color: M.wax }}>+{fmt(Math.abs(e.amount))}</div>
            <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8 }}>{rel(e.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.CartographerHomeView = CartographerHomeView;
