// ElyHub — Cartographer Modern Members + Profile + Settings.

// ─── ModernMembersView ───────────────────────────────────────────────────
function CartographerModernMembersView({ state, focusId, setView }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const coords = window.coordsModern || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));
  const bearing = window.bearingModern || (() => 0);

  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('aura');
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!window.ElyAPI?.isSignedIn?.()) {
      const id = setInterval(() => {
        if (window.ElyAPI?.isSignedIn?.()) { clearInterval(id); load(); }
      }, 600);
      return () => clearInterval(id);
    }
    load();
  }, [sort]);

  function load() {
    setLoading(true);
    window.ElyAPI.get(`/members?sort=${sort}&limit=200`)
      .then((res) => {
        const list = (res.items || []).map((r) => ({
          id: r.id, name: r.name || r.id,
          avatar: r.avatar_url || null,
          aura: r.aura || 0, level: r.level || 0,
        }));
        setMembers(list);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }

  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normalize(search);
  const filtered = members.filter((m) => !q || normalize(m.name).includes(q));

  const sorts = [
    { id: 'aura',   label: tc('members.sort.aura') },
    { id: 'name',   label: tc('members.sort.name') },
    { id: 'joined', label: tc('members.sort.joined') },
    { id: 'oldest', label: tc('members.sort.oldest') },
    { id: 'active', label: tc('members.sort.active') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
      <div style={{
        paddingBottom: 18, borderBottom: `1px solid ${Mm.hair2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 18,
      }}>
        <div>
          <div style={{ ...MmTY.caps, color: Mm.accent, marginBottom: 6 }}>{tc('page.members.eyebrow')}</div>
          <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0 }}>
            {tc('page.members.title')}<span style={{ color: Mm.accent }}>.</span>
          </h1>
          <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 6 }}>
            {tc('members.sub', { n: filtered.length })}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 0,
          background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
          padding: 3, borderRadius: 4,
        }}>
          {sorts.map((s) => {
            const on = sort === s.id;
            return (
              <button key={s.id} onClick={() => setSort(s.id)} style={{
                ...MmTY.coord, padding: '6px 12px', cursor: 'pointer',
                border: 'none', background: on ? Mm.accent : 'transparent',
                color: on ? Mm.bg : Mm.text2, fontWeight: 600, borderRadius: 2,
              }}>{s.label}</button>
            );
          })}
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={tc('members.search')}
             style={{
               width: '100%', padding: '12px 18px', boxSizing: 'border-box',
               background: 'rgba(10,18,16,0.65)', border: `1px solid ${Mm.hair2}`,
               borderRadius: 4, color: Mm.text,
               fontFamily: Mm.fontUI, fontSize: 14, outline: 'none',
             }}/>

      {loading && (
        <div style={{ ...MmTY.coord, color: Mm.text3, textAlign: 'center', padding: '40px 0' }}>
          {tc('members.empty.loading')}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          ...MmTY.body, color: Mm.text3, textAlign: 'center',
          padding: '40px 24px', background: 'rgba(15,30,25,0.4)',
          border: `1px dashed ${Mm.hair2}`, borderRadius: 6,
        }}>{tc('members.empty.none')}</div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
        }}>
          {filtered.map((m) => {
            const c = coords(m.name || '');
            const focus = focusId && m.id === focusId;
            return (
              <div key={m.id} data-focus-id={m.id}
                onClick={() => setView && setView({ id: 'profile', userId: m.id })}
                style={{
                  cursor: 'pointer',
                  background: focus ? 'rgba(155,214,107,0.08)' : 'rgba(15,30,25,0.55)',
                  border: `1px solid ${focus ? Mm.hair3 : Mm.hair2}`, borderRadius: 6,
                  padding: '18px 20px',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; }}
                onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = focus ? Mm.hair3 : Mm.hair2; }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
                    background: m.avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
                    border: `1px solid ${Mm.hair2}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {m.avatar
                      ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 14, fontWeight: 700 }}>{m.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginTop: 1 }}>L{m.level} · {bearing(m.name)}°</div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  paddingTop: 10, borderTop: `1px solid ${Mm.hair}`,
                }}>
                  <div>
                    <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>{tc('podium.position')}</div>
                    <div style={{ ...MmTY.coord, color: Mm.text2, fontSize: 10, marginTop: 2 }}>
                      {c.lat}°{c.latDir}<br/>{c.lon}°{c.lonDir}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>{tc('common.aura').toUpperCase()}</div>
                    <div style={{ ...MmTY.numTab, fontSize: 16, color: Mm.text }}>{fmt(m.aura)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ModernProfileView ────────────────────────────────────────────────────
function CartographerModernProfileView({ state, onQuick, setView, onPublish, onEdit, publishing, wishlist }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const coords = window.coordsModern || (() => ({ lat: '0', lon: '0', latDir: 'N', lonDir: 'E' }));
  const bearing = window.bearingModern || (() => 0);

  const me = window.ME || {};
  const _v = publishing?.version;
  const myListings = (window.LISTINGS || []).filter((l) => l.sellerId === me.id);

  const auraNow = Number(me.aura ?? state?.aura ?? 0);
  const lvl = Number(me.level ?? state?.level ?? 0);
  const prev = Number(me.prevLevelAura ?? 0);
  const next = Number(me.nextLevelAura ?? 1);
  const span = Math.max(1, next - prev);
  const pct = Math.max(0, Math.min(100, Math.round(((auraNow - prev) / span) * 100)));

  const voiceHours = Math.floor((me.voiceSeconds || 0) / 3600);
  const voiceMins  = Math.floor(((me.voiceSeconds || 0) % 3600) / 60);

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

  const liveRoles = Array.isArray(me.discordRoles) ? me.discordRoles : [];
  const tags = liveRoles.length
    ? liveRoles.slice(0, 6).map((r) => ({ name: r.name, hue: (r.color && r.color !== '#000000') ? r.color : null }))
    : [{ name: tc('profile.role.default'), hue: null }];

  const myCoords = coords(me.name || me.id || '');
  const myBearing = bearing(me.name || me.id || '');

  const trophies = (typeof window.deriveTrophies === 'function')
    ? window.deriveTrophies(me)
    : (typeof deriveTrophies === 'function' ? deriveTrophies(me) : []);
  const trophyPeek = trophies.filter((t) => t.unlocked).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
      {/* Hero plaque */}
      <div style={{
        position: 'relative', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28,
        padding: '32px 36px', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(20,38,32,0.65), rgba(15,24,22,0.85))',
        border: `1px solid ${Mm.hair2}`, borderRadius: 6,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 130, height: 130, borderRadius: 6, overflow: 'hidden',
            background: me.avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
            border: `2px solid ${Mm.hair3}`,
            boxShadow: `0 0 24px rgba(155,214,107,0.20)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {me.avatar
              ? <img src={me.avatar} alt={me.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 50, fontWeight: 700 }}>{(me.name || 'M')[0]?.toUpperCase()}</span>}
          </div>
          <div style={{ ...MmTY.coord, color: Mm.accent, textAlign: 'center', fontSize: 9 }}>
            {myCoords.lat}°{myCoords.latDir} · {myCoords.lon}°{myCoords.lonDir}<br/>
            <span style={{ color: Mm.cyan }}>{tc('profile.coords.bearing', { n: String(myBearing).padStart(3, '0') })}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 8 }}>{tc('page.profile.eyebrow')}</div>
            <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0, fontSize: 36 }}>
              {me.name || 'Surveyor'}<span style={{ color: Mm.accent }}>.</span>
            </h1>
            {me.username && me.username !== me.name && (
              <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 4 }}>@{me.username}</div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {tags.map((t, i) => (
                <span key={i} style={{
                  ...MmTY.coord, fontSize: 10,
                  padding: '4px 10px', borderRadius: 2,
                  background: t.hue ? `${t.hue}1F` : 'rgba(10,18,16,0.65)',
                  border: `1px solid ${t.hue || Mm.hair2}`,
                  color: t.hue || Mm.text2,
                }}>{t.name}</span>
              ))}
            </div>

            {bio && (
              <div style={{
                ...MmTY.body, color: Mm.text2, marginTop: 18, fontSize: 14,
                lineHeight: 1.55, paddingLeft: 14,
                borderLeft: `2px solid ${Mm.accent}`,
              }}>{bio}</div>
            )}
          </div>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${Mm.hair}` }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
              <div>
                <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 4 }}>{tc('common.aura').toUpperCase()}</div>
                <div style={{ ...MmTY.numTab, fontSize: 36, color: Mm.accent, lineHeight: 1 }}>{fmt(auraNow)}</div>
              </div>
              <div>
                <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 4 }}>{tc('home.rank.label').toUpperCase()}</div>
                <div style={{ ...MmTY.numTab, fontSize: 36, color: Mm.text, lineHeight: 1 }}>L{lvl}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...MmTY.coord, color: Mm.text3, marginBottom: 6 }}>
                  <span>{tc('profile.lvl.toSummit', { pct, lvl: lvl + 1 })}</span>
                  <span style={{ color: Mm.accent }}>{tc('profile.lvl.summitGap', { n: fmt(Math.max(0, next - auraNow)) })}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(155,214,107,0.08)', borderRadius: 1 }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${Mm.accentLo}, ${Mm.accent}, ${Mm.cyan})`,
                  }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <ModernStatCard label={tc('profile.stat.discipline.label')}
                        value={tc('profile.stat.discipline.value', { n: me.gymStreakCurrent || 0 })}
                        sub={tc('profile.stat.discipline.sub', { n: me.gymStreakBest || 0 })}/>
        <ModernStatCard label={tc('profile.stat.voice.label')}
                        value={voiceHours > 0 ? `${voiceHours}H ${voiceMins}M` : `${voiceMins}M`}
                        sub={tc('profile.stat.voice.sub')}/>
        <ModernStatCard label={tc('profile.stat.gifts.label')}
                        value={fmt(me.totalGiftsSent || 0)}
                        sub={tc('profile.stat.gifts.sub', { n: fmt(me.totalGiftsReceived || 0) })}/>
      </div>

      {/* Trophies peek */}
      {trophyPeek.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
            ...MmTY.caps, color: Mm.text3,
          }}>
            <span style={{ width: 8, height: 8, background: Mm.accent, borderRadius: 1, boxShadow: `0 0 6px ${Mm.accent}` }}/>
            <span>{tc('profile.honors.title')}</span>
            <button onClick={() => setView({ id: 'trophies' })} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...MmTY.coord, color: Mm.accent, fontSize: 9, padding: 0, marginLeft: 'auto',
            }}>{tc('common.viewAll')} →</button>
            <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {trophyPeek.map((tr) => (
              <div key={tr.id} style={{
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(155,214,107,0.10), rgba(93,211,196,0.04))',
                border: `1px solid ${Mm.hair3}`, borderRadius: 6,
                padding: '16px 18px',
                boxShadow: `0 0 14px rgba(155,214,107,0.12)`,
              }}>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22, borderRadius: 4,
                  background: Mm.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 8px ${Mm.accent}`,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={Mm.bg} strokeWidth="3"><path d="m5 12 5 5 9-10"/></svg>
                </div>
                <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 6 }}>{tc('profile.honors.label')}</div>
                <div style={{ ...MmTY.h3, color: Mm.text, margin: 0, fontSize: 14 }}>
                  {tc(`trophy.${tr.id}.name`) === `trophy.${tr.id}.name` ? tr.name : tc(`trophy.${tr.id}.name`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Own listings */}
      {myListings.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
            ...MmTY.caps, color: Mm.text3,
          }}>
            <span style={{ width: 8, height: 8, background: Mm.cyan, borderRadius: 1, boxShadow: `0 0 6px ${Mm.cyan}` }}/>
            <span>{tc('profile.listings.title', { n: myListings.length })}</span>
            <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
          }}>
            {myListings.map((l) => (
              <div key={l.id} onClick={() => setView({ id: 'plugin', listingId: l.id })} style={{
                cursor: 'pointer',
                background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`, borderRadius: 6,
                padding: '16px 18px',
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; }}
              onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = Mm.hair2; }}>
                <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 4, fontSize: 9 }}>
                  {(l.type || tc('profile.listings.type')).toUpperCase()}
                </div>
                <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 14 }}>{l.title}</div>
                {l.tagline && <div style={{ ...MmTY.small, color: Mm.text3, marginTop: 4 }}>{l.tagline}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${Mm.hair}` }}>
                  <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9 }}>{tc('common.price')}</span>
                  <span style={{ ...MmTY.numTab, color: Mm.accent, fontSize: 14 }}>{fmt(l.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModernStatCard({ label, value, sub }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  return (
    <div style={{
      background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
      borderRadius: 6, padding: '16px 18px',
    }}>
      <div style={{ ...MmTY.coord, color: Mm.text3, marginBottom: 6 }}>{label}</div>
      <div style={{ ...MmTY.numTab, fontSize: 22, color: Mm.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 9, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── ModernSettingsModal ──────────────────────────────────────────────────
function CartographerModernSettingsModal({ onClose, tweaks, tweak, resolvedTheme, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride, library }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const tc = window.tc || ((k) => k);
  const [section, setSection] = React.useState('account');
  const lang = window.ElyI18N?.getLang?.() || 'en';
  const setLang = (code) => window.ElyI18N?.setLang?.(code);

  const sections = [
    { id: 'account',   label: tc('settings.section.account') },
    { id: 'notif',     label: tc('settings.section.notif') },
    { id: 'appear',    label: tc('settings.section.appear') },
    { id: 'downloads', label: tc('settings.section.downloads') },
    { id: 'about',     label: tc('settings.section.about') },
  ];

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const _Account   = (typeof AccountPane   === 'function') ? AccountPane   : null;
  const _Notif     = (typeof NotifPane     === 'function') ? NotifPane     : null;
  const _Downloads = (typeof DownloadsPane === 'function') ? DownloadsPane : null;
  const _Appear    = (typeof AppearancePane === 'function') ? AppearancePane : null;

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: section === 'appear' ? 920 : 800, maxWidth: '100%',
        height: section === 'appear' ? 660 : 580, maxHeight: '90vh',
        background: 'linear-gradient(180deg, rgba(20,38,32,0.97), rgba(15,24,22,0.99))',
        border: `1px solid ${Mm.hair2}`, borderRadius: 8,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
        display: 'flex', overflow: 'hidden',
        animation: 'mmSlideUp 0.3s cubic-bezier(.2,.9,.3,1.15)',
        transition: 'width .25s ease, height .25s ease',
      }}>
        <div style={{
          width: 200, padding: 24,
          borderRight: `1px solid ${Mm.hair2}`,
          background: 'rgba(10,18,16,0.5)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 4 }}>{tc('settings.eyebrow').toUpperCase()}</div>
              <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 16 }}>{tc('settings.title')}<span style={{ color: Mm.accent }}>.</span></div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: Mm.text3,
              cursor: 'pointer', fontSize: 16, padding: 4,
            }}>✕</button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sections.map((s) => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px', cursor: 'pointer',
                  background: active ? `${Mm.accent}1A` : 'transparent',
                  border: `1px solid ${active ? Mm.hair3 : 'transparent'}`, borderRadius: 4,
                  color: active ? Mm.accent : Mm.text2,
                  fontFamily: Mm.fontMono, fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  transition: 'all 0.15s', textAlign: 'left',
                }}>{s.label}</button>
              );
            })}
          </nav>

          <div style={{ flex: 1 }}/>
          <div style={{
            ...MmTY.coord, color: Mm.text4, fontSize: 9,
            textAlign: 'center', paddingTop: 10, borderTop: `1px solid ${Mm.hair}`,
          }}>
            ELYHUB · v0.1
          </div>
        </div>

        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {section === 'account'   && _Account   && <_Account onAfterSignOut={onClose}/>}
          {section === 'notif'     && _Notif     && <_Notif/>}
          {section === 'downloads' && _Downloads && <_Downloads/>}
          {section === 'appear'    && _Appear    && (
            <_Appear tweaks={tweaks} tweak={tweak} resolved={resolvedTheme}
              updateCustom={updateCustom} selectCustom={selectCustom}
              addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot}
              updatePresetOverride={updatePresetOverride}
              library={library} lang={lang} setLang={setLang}/>
          )}
          {section === 'about' && (
            <div>
              <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 8 }}>{tc('settings.section.about').toUpperCase()}</div>
              <h3 style={{ ...MmTY.h2, color: Mm.text, margin: '0 0 22px', fontSize: 24 }}>
                {tc('settings.about.title')}<span style={{ color: Mm.accent }}>.</span>
              </h3>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                padding: 16,
                background: 'rgba(10,18,16,0.65)',
                border: `1px solid ${Mm.hair2}`, borderRadius: 4,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 6,
                  background: `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 22, fontWeight: 700,
                }}>E</div>
                <div>
                  <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 16 }}>ElyHub</div>
                  <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 2 }}>{tc('settings.about.version')}</div>
                </div>
              </div>
              <div style={{ ...MmTY.body, color: Mm.text2, lineHeight: 1.6, fontSize: 14 }}>
                {tc('settings.about.body', { server: window.SERVER?.name || 'Ely' })}
              </div>
              <div style={{ ...MmTY.coord, color: Mm.text3, marginTop: 28, textAlign: 'center', fontSize: 9 }}>
                {tc('settings.about.footer')}
              </div>
            </div>
          )}
        </div>

        <style>{`@keyframes mmSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      </div>
    </div>
  );
}

window.CartographerModernMembersView   = CartographerModernMembersView;
window.CartographerModernProfileView   = CartographerModernProfileView;
window.CartographerModernSettingsModal = CartographerModernSettingsModal;
