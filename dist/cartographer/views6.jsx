// ElyHub — Cartographer (vintage) SettingsModal.
//
// Mounted only when T.cartographer is true. We don't re-implement the inner
// panes (Account/Notif/Downloads/Appear) — those live in modals.jsx and use
// T.text/T.glassBorder tokens which the cartographer flag already mutates
// to sepia. We just wrap them in a parchment dialog with vintage chrome.

function CartographerSettingsModal({ onClose, tweaks, tweak, resolvedTheme, updateCustom, selectCustom, addCustomSlot, deleteCustomSlot, updatePresetOverride, library }) {
  const M = window.M, MTY = window.MTY;
  const tc = window.tc || ((k) => k);
  const [section, setSection] = React.useState('account');
  const lang = window.ElyI18N?.getLang?.() || 'en';
  const setLang = (code) => window.ElyI18N?.setLang?.(code);

  // Section labels via i18n dict — picks vintage/modern flavor automatically
  // and respects the app language.
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

  // Reference the host's pane components directly. Babel script tags share
  // global scope so AccountPane / NotifPane / etc. are visible here.
  const _Account   = (typeof AccountPane   === 'function') ? AccountPane   : null;
  const _Notif     = (typeof NotifPane     === 'function') ? NotifPane     : null;
  const _Downloads = (typeof DownloadsPane === 'function') ? DownloadsPane : null;
  const _Appear    = (typeof AppearancePane === 'function') ? AppearancePane : null;

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(20,12,5,0.55)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'mFadeIn 0.2s',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: section === 'appear' ? 920 : 800, maxWidth: '100%',
        height: section === 'appear' ? 660 : 580, maxHeight: '90vh',
        background: 'linear-gradient(180deg, rgba(232,220,192,0.97), rgba(220,207,174,0.99)), #EFE3C8',
        border: `1px solid ${M.hair3}`,
        boxShadow: '8px 12px 40px rgba(20,12,5,0.45)',
        display: 'flex', overflow: 'hidden',
        position: 'relative',
        animation: 'mSlideUp 0.3s cubic-bezier(.2,.9,.3,1.15)',
        transition: 'width .25s ease, height .25s ease',
      }}>
        {/* Corner ornaments outside the inner padding */}
        {window.OrnateCorner && (
          <>
            {React.createElement(window.OrnateCorner, { size: 36, opacity: 0.6, style: { position: 'absolute', top: 6, left: 6, zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 36, opacity: 0.6, style: { position: 'absolute', top: 6, right: 6, transform: 'scaleX(-1)', zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 36, opacity: 0.6, style: { position: 'absolute', bottom: 6, left: 6, transform: 'scaleY(-1)', zIndex: 5 } })}
            {React.createElement(window.OrnateCorner, { size: 36, opacity: 0.6, style: { position: 'absolute', bottom: 6, right: 6, transform: 'scale(-1,-1)', zIndex: 5 } })}
          </>
        )}

        {/* Sidebar */}
        <div style={{
          width: 220, padding: 24, position: 'relative',
          borderRight: `1px solid ${M.hair2}`,
          background: 'rgba(220,207,174,0.5)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 4 }}>{tc('settings.eyebrow')}</div>
              <div style={{ ...MTY.h3, color: M.ink, fontSize: 17 }}>
                {tc('settings.title')}<span style={{ color: M.wax }}>.</span>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: M.ink3,
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
            }}>✕</button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sections.map((s) => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', cursor: 'pointer',
                  background: active ? M.wax : 'transparent',
                  border: 'none',
                  color: active ? M.surface : M.ink2,
                  fontFamily: M.fontDisp, fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.20em', textTransform: 'uppercase',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'rgba(200,162,78,0.18)'; }}
                onMouseOut={(e)  => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Foot stamp */}
          <div style={{ flex: 1 }}/>
          <div style={{
            ...MTY.hand, color: M.ink4, fontSize: 11, fontStyle: 'italic',
            textAlign: 'center', paddingTop: 12,
            borderTop: `1px dashed ${M.hair}`,
          }}>
            ELYHUB · MMXXVI
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto', position: 'relative' }}>
          {section === 'account'  && _Account   && <_Account onAfterSignOut={onClose}/>}
          {section === 'notif'    && _Notif     && <_Notif/>}
          {section === 'downloads' && _Downloads && <_Downloads/>}
          {section === 'appear'   && _Appear    && (
            <_Appear
              tweaks={tweaks} tweak={tweak} resolved={resolvedTheme}
              updateCustom={updateCustom} selectCustom={selectCustom}
              addCustomSlot={addCustomSlot} deleteCustomSlot={deleteCustomSlot}
              updatePresetOverride={updatePresetOverride}
              library={library} lang={lang} setLang={setLang}
            />
          )}
          {section === 'about' && (
            <div>
              <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>{tc('settings.section.about')}</div>
              <h3 style={{ ...MTY.h2, color: M.ink, margin: '0 0 22px', fontSize: 24 }}>
                {tc('settings.about.title')}<span style={{ color: M.wax }}>.</span>
              </h3>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
                padding: 16,
                background: 'rgba(232,220,192,0.6)',
                border: `1px solid ${M.hair2}`,
              }}>
                {window.SERVER?.iconUrl ? (
                  <img src={window.SERVER.iconUrl}
                    alt={window.SERVER?.name || 'server'}
                    style={{
                      width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
                      border: `1px solid ${M.hair3}`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 1px 2px 4px rgba(59,38,22,0.2)',
                    }}/>
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #B33524, #8B2418 60%, #6A1810)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: M.surface, fontFamily: M.fontDisp, fontSize: 22, fontWeight: 700,
                  }}>E</div>
                )}
                <div>
                  <div style={{ ...MTY.h3, color: M.ink, fontSize: 17 }}>ElyHub</div>
                  <div style={{ ...MTY.hand, color: M.ink3, fontSize: 13 }}>
                    {tc('settings.about.version')}
                  </div>
                </div>
              </div>
              <div style={{ ...MTY.body, color: M.ink2, lineHeight: 1.6, fontSize: 15 }}>
                {tc('settings.about.body', { server: window.SERVER?.name || 'Ely' })}
              </div>
              <div style={{
                ...MTY.capsSm, color: M.ink3, marginTop: 32, textAlign: 'center', fontSize: 9,
              }}>
                {tc('settings.about.footer')}
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes mFadeIn  { from { opacity: 0; } to { opacity: 1; } }
          @keyframes mSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}

window.CartographerSettingsModal = CartographerSettingsModal;
