// ElyHub — Cartographer (vintage) ProfileView.
//
// Mounted only when T.cartographer is true. A streamlined parchment profile:
// hero plaque with WaxSeal portrait + role chips, then ledger of stats,
// trophies preview, and (if seller) a list of own listings. Skips the host's
// in-place publish/unpublish edit flow — those still work via Settings.

function CartographerProfileView({ state, onQuick, setView, onPublish, onEdit, publishing, wishlist }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const bearingOf = window.bearingOf || (() => 0);
  const coordsOf = window.coordsOf || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));

  const me = window.ME || {};
  const _v = publishing?.version;
  const myListings = (window.LISTINGS || []).filter((l) => l.sellerId === me.id);

  const auraNow = Number(me.aura ?? state?.aura ?? 0);
  const lvl = Number(me.level ?? state?.level ?? 0);
  const prev = Number(me.prevLevelAura ?? 0);
  const next = Number(me.nextLevelAura ?? 1);
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));
  const remaining = Math.max(0, next - auraNow);

  const voiceHours = Math.floor((me.voiceSeconds || 0) / 3600);
  const voiceMins  = Math.floor(((me.voiceSeconds || 0) % 3600) / 60);

  // Bio from localStorage (same key the host writes via Settings)
  const [bio, setBio] = React.useState(() => {
    try { return localStorage.getItem('elyhub.bio.v1') || ''; } catch { return ''; }
  });
  React.useEffect(() => {
    const sync = () => { try { setBio(localStorage.getItem('elyhub.bio.v1') || ''); } catch {} };
    window.addEventListener('storage', sync);
    window.addEventListener('ely:bio-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ely:bio-changed', sync);
    };
  }, []);

  // Discord roles — synced by the bot. Falls back to default crewmember chip.
  const liveRoles = Array.isArray(me.discordRoles) ? me.discordRoles : [];
  const tags = liveRoles.length
    ? liveRoles.slice(0, 6).map((r) => ({
        name: r.name,
        hue: (r.color && r.color !== '#000000') ? r.color : null,
      }))
    : [{ name: tc('profile.role.default'), hue: null }];

  const myCoords = coordsOf(me.name || me.id || '');
  const myBearing = bearingOf(me.name || me.id || '');

  // Trophy peek — first 3 unlocked. Reuses host's deriveTrophies if present.
  const trophies = (typeof window.deriveTrophies === 'function')
    ? window.deriveTrophies(me)
    : (typeof deriveTrophies === 'function' ? deriveTrophies(me) : []);
  const trophyPeek = trophies.filter((t) => t.unlocked).slice(0, 3);

  // Trophy labels via i18n dict (synced with views2.jsx).
  const trophyName = (id, fallback) =>
    tc(`trophy.${id}.name`) === `trophy.${id}.name` ? fallback : tc(`trophy.${id}.name`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1 }}>

      {/* ── Hero plaque: portrait + name + tags ── */}
      <div style={{
        position: 'relative', display: 'grid', gridTemplateColumns: '180px 1fr',
        gap: 28, padding: '36px 36px 32px',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.55), rgba(220,207,174,0.7)), #EFE3C8',
        border: `1px solid ${M.hair3}`,
        boxShadow: '4px 6px 20px rgba(59,38,22,0.12)',
        overflow: 'hidden',
      }}>
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 48, style: { position: 'absolute', top: 8, left: 8 } })}
            {React.createElement(window.OrnateCorner, { size: 48, style: { position: 'absolute', top: 8, right: 8, transform: 'scaleX(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 48, style: { position: 'absolute', bottom: 8, left: 8, transform: 'scaleY(-1)' } })}
            {React.createElement(window.OrnateCorner, { size: 48, style: { position: 'absolute', bottom: 8, right: 8, transform: 'scale(-1,-1)' } })}
          </>
        )}
        <div style={{ position: 'absolute', inset: 14, border: `1px solid ${M.ink}`, opacity: 0.30, pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 18, border: `0.5px solid ${M.ink}`, opacity: 0.16, pointerEvents: 'none' }}/>

        {/* Portrait */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative', zIndex: 2 }}>
          {window.WaxSeal && React.createElement(window.WaxSeal, {
            src: me.avatar, name: me.name, size: 130, ring: 12,
          })}
          <div style={{ ...MTY.capsSm, color: M.wax, textAlign: 'center', fontSize: 9 }}>
            {myCoords.lat}°{myCoords.latDir} · {myCoords.lon}°{myCoords.lonDir}<br/>{tc('profile.coords.bearing', { n: myBearing })}
          </div>
        </div>

        {/* Identity */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('page.profile.eyebrow')}</div>
            <h1 style={{ ...MTY.h1, color: M.ink, margin: 0, fontSize: 36, lineHeight: 1.1 }}>
              {me.name || 'Navegante'}<span style={{ color: M.wax }}>.</span>
            </h1>
            {me.username && me.username !== me.name && (
              <div style={{ ...MTY.hand, color: M.ink3, marginTop: 4, fontSize: 15 }}>
                @{me.username}
              </div>
            )}

            {/* Role chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {tags.map((t, i) => (
                <span key={i} style={{
                  ...MTY.capsSm, fontSize: 10,
                  padding: '4px 10px',
                  background: t.hue ? `${t.hue}1F` : 'rgba(232,220,192,0.6)',
                  border: `1px solid ${t.hue || M.hair2}`,
                  color: t.hue || M.ink2,
                  letterSpacing: '0.18em',
                }}>{t.name}</span>
              ))}
            </div>

            {/* Bio */}
            {bio && (
              <div style={{
                ...MTY.body, color: M.ink2, marginTop: 18, fontSize: 15,
                fontStyle: 'italic', lineHeight: 1.55,
                paddingLeft: 14, borderLeft: `2px solid ${M.wax}`,
                opacity: 0.88,
              }}>{bio}</div>
            )}
          </div>

          {/* Aura/Level/Progress */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px dashed ${M.hair2}` }}>
            <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end' }}>
              <div>
                <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>{tc('common.aura')}</div>
                <div style={{ ...MTY.num, fontSize: 36, color: M.wax, lineHeight: 1 }}>{fmt(auraNow)}</div>
              </div>
              <div>
                <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4 }}>{tc('home.rank.label')}</div>
                <div style={{ ...MTY.num, fontSize: 36, color: M.ink, lineHeight: 1 }}>L{lvl}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  ...MTY.capsSm, color: M.ink3, marginBottom: 6,
                }}>
                  <span>{tc('profile.lvl.toSummit', { pct, lvl: lvl + 1 })}</span>
                  <span style={{ color: M.wax }}>{tc('profile.lvl.summitGap', { n: fmt(remaining) })}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(59,38,22,0.12)' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${M.gold}, ${M.wax})`,
                  }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ledger (3-up grid) ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
      }}>
        <StatCard label={tc('profile.stat.discipline.label')}
                  value={tc('profile.stat.discipline.value', { n: me.gymStreakCurrent || 0 })}
                  sub={tc('profile.stat.discipline.sub', { n: me.gymStreakBest || 0 })}/>
        <StatCard label={tc('profile.stat.voice.label')}
                  value={voiceHours > 0 ? `${voiceHours}h ${voiceMins}min` : `${voiceMins}min`}
                  sub={tc('profile.stat.voice.sub')}/>
        <StatCard label={tc('profile.stat.gifts.label')}
                  value={fmt(me.totalGiftsSent || 0)}
                  sub={tc('profile.stat.gifts.sub', { n: fmt(me.totalGiftsReceived || 0) })}/>
      </div>

      {/* ── Honrarias preview ── */}
      {trophyPeek.length > 0 && (
        <div>
          <div style={{
            ...MTY.capsSm, color: M.ink2, marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ flex: 'none', width: 24, height: 1, background: M.hair2 }}/>
            <span>{tc('profile.honors.title')}</span>
            <button onClick={() => setView({ id: 'trophies' })} style={{
              marginLeft: 'auto',
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...MTY.capsSm, color: M.wax, fontSize: 9,
              letterSpacing: '0.20em', padding: 0,
            }}>{tc('common.viewAll')} →</button>
            <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          }}>
            {trophyPeek.map((tr) => (
              <div key={tr.id} style={{
                position: 'relative',
                background: 'linear-gradient(180deg, rgba(200,162,78,0.18), rgba(232,220,192,0.5)), #EFE3C8',
                border: `1px solid ${M.hair3}`,
                padding: '18px 20px',
                boxShadow: '2px 4px 12px rgba(200,162,78,0.14)',
              }}>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset -2px -3px 4px rgba(0,0,0,0.3)',
                }}>
                  <span style={{ color: M.surface, fontSize: 11, lineHeight: 1 }}>✦</span>
                </div>
                <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 6 }}>{tc('profile.honors.label')}</div>
                <div style={{ ...MTY.h3, color: M.ink, fontSize: 15, margin: 0 }}>
                  {trophyName(tr.id, tr.name)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Own listings (seller card) ── */}
      {myListings.length > 0 && (
        <div>
          <div style={{
            ...MTY.capsSm, color: M.ink2, marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ flex: 'none', width: 24, height: 1, background: M.hair2 }}/>
            <span>{tc('profile.listings.title', { n: myListings.length })}</span>
            <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
          }}>
            {myListings.map((l) => (
              <div key={l.id} onClick={() => setView({ id: 'plugin', listingId: l.id })}
                   style={{
                     cursor: 'pointer',
                     background: '#EFE3C8',
                     border: `1px solid ${M.hair2}`,
                     padding: '16px 18px',
                     boxShadow: '2px 4px 10px rgba(59,38,22,0.08)',
                     transition: 'transform 0.15s, box-shadow 0.15s',
                   }}
                   onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '3px 6px 14px rgba(59,38,22,0.14)'; }}
                   onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '2px 4px 10px rgba(59,38,22,0.08)'; }}>
                <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 4, fontSize: 9 }}>
                  {(l.type || tc('profile.listings.type')).toUpperCase()}
                </div>
                <div style={{ ...MTY.h3, color: M.ink, fontSize: 15, margin: 0 }}>{l.title}</div>
                {l.tagline && (
                  <div style={{ ...MTY.hand, color: M.ink3, fontSize: 13, marginTop: 4 }}>
                    {l.tagline}
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${M.hair}`,
                }}>
                  <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 9 }}>{tc('common.price')}</span>
                  <span style={{ ...MTY.num, color: M.wax, fontSize: 16 }}>{fmt(l.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  const M = window.M, MTY = window.MTY;
  return (
    <div style={{
      background: '#EFE3C8',
      border: `1px solid ${M.hair2}`,
      padding: '18px 20px',
      boxShadow: '2px 4px 10px rgba(59,38,22,0.08)',
    }}>
      <div style={{ ...MTY.capsSm, color: M.ink3, marginBottom: 6 }}>{label}</div>
      <div style={{ ...MTY.num, fontSize: 22, color: M.ink, lineHeight: 1.1 }}>{value}</div>
      {sub && (
        <div style={{ ...MTY.hand, color: M.ink3, fontSize: 12, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

window.CartographerProfileView = CartographerProfileView;
