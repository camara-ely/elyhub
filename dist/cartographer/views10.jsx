// ElyHub — Cartographer (vintage) ListingDetailView.
//
// Streamlined parchment listing page: hero + gallery + description +
// pricing card + related. Reviews and coupon flow fall through to the
// host's existing components — they already adapt via shared T tokens.

function CartographerListingDetailView({ state, setView, onQuick, focusId, library, purchaseListing, reviews, wishlist, follows, recent, messages, coupons, reports, blocks }) {
  const M = window.M, MTY = window.MTY;
  const fmt = window.fmtM || ((n) => Number(n || 0).toLocaleString('pt-BR'));
  const l = (window.LISTINGS || []).find((x) => x.id === focusId);

  // Hugin (gleipnir) routes to its own dedicated view — match host behaviour.
  const isHugin = l && (l.kassa_product_id || l.kassaProductId) === 'gleipnir';
  React.useEffect(() => {
    if (isHugin) setView({ id: 'zephyro' });
  }, [isHugin]);
  if (isHugin) return null;

  if (!l) {
    return (
      <div style={{
        background: M.surface, border: `1px solid ${M.hair2}`,
        padding: 40, textAlign: 'center', position: 'relative', zIndex: 1,
      }}>
        <div style={{ ...MTY.body, color: M.ink2 }}>Tomo não encontrado.</div>
        <button onClick={() => setView({ id: 'store' })} style={{
          marginTop: 14, ...MTY.capsSm, color: M.wax,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        }}>← Voltar ao mercado</button>
      </div>
    );
  }

  const seller = (window.MEMBERS || []).find((m) => m.id === l.sellerId);
  const levelLocked = state.level < (l.level || 1);
  const auraShort = state.aura < l.price;
  const ownedEntry = library?.items.find((it) => it.listingId === l.id);
  const activeOwned = ownedEntry && ownedEntry.status === 'active' && (!ownedEntry.expiresAt || ownedEntry.expiresAt > Date.now());
  const isSub = l.billing === 'monthly';
  const alreadyHas = activeOwned;
  const locked = !alreadyHas && (levelLocked || auraShort);

  React.useEffect(() => {
    if (l && recent && l.sellerId !== (window.ME?.id || 'me')) recent.push(l.id);
  }, [l?.id]);

  const [pending, setPending] = React.useState(false);
  const onPrimary = () => {
    if (pending) return;
    if (alreadyHas) { setView(l.type === 'plugin' ? { id: `plugin:${l.id}` } : { id: 'library' }); return; }
    if (locked) return;
    if (purchaseListing) {
      setPending(true);
      setTimeout(() => {
        const res = purchaseListing(l, null);
        setPending(false);
        if (res.ok) {
          try { ElyNotify?.toast?.({ text: `${l.title} ${isSub ? 'assinado' : 'adicionado à biblioteca'}`, kind: 'success' }); } catch {}
          setView(l.type === 'plugin' ? { id: `plugin:${l.id}` } : { id: 'library' });
        } else {
          try { ElyNotify?.toast?.({ text: 'Aura insuficiente', kind: 'warn' }); } catch {}
        }
      }, 380);
    } else {
      onQuick.redeem({ ...l, sub: l.tagline });
    }
  };

  // Toggle wishlist
  const inWishlist = (wishlist?.items || []).includes(l.id);
  const toggleWishlist = () => {
    if (!wishlist) return;
    if (inWishlist) wishlist.remove(l.id); else wishlist.add(l.id);
  };

  // Gallery
  const gallery = React.useMemo(() => {
    const seen = new Set(); const out = [];
    if (l.image) { out.push({ src: l.image, kind: 'img' }); seen.add(l.image); }
    for (const s of (l.screenshots || [])) {
      if (!seen.has(s)) { out.push({ src: s, kind: 'img' }); seen.add(s); }
    }
    return out;
  }, [l]);
  const [gIdx, setGIdx] = React.useState(0);
  const heroImg = gallery[gIdx];

  // Related
  const ownedIds = new Set((library?.items || []).map((it) => it.listingId));
  const related = (window.LISTINGS || [])
    .filter((x) => x.id !== l.id && !ownedIds.has(x.id) && (x.type === l.type || x.sellerId === l.sellerId))
    .slice(0, 4);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Back link */}
      <button onClick={() => setView({ id: 'store' })} style={{
        ...MTY.capsSm, color: M.wax,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, alignSelf: 'flex-start',
      }}>← Voltar ao mercado</button>

      {/* Hero — gallery + identity + pricing as 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 28 }}>
        {/* Gallery */}
        <div>
          <div style={{
            position: 'relative', height: 360, overflow: 'hidden',
            background: heroImg
              ? `url("${heroImg.src}") center/cover`
              : `linear-gradient(135deg, rgba(200,162,78,0.25), rgba(232,220,192,0.5))`,
            border: `1px solid ${M.hair3}`,
            boxShadow: '3px 5px 16px rgba(59,38,22,0.14)',
            filter: 'sepia(0.20)',
          }}/>
          {gallery.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {gallery.map((g, i) => (
                <button key={i} onClick={() => setGIdx(i)} style={{
                  width: 84, height: 56, padding: 0, border: 'none', cursor: 'pointer',
                  background: `url("${g.src}") center/cover`,
                  borderTop: i === gIdx ? `2px solid ${M.wax}` : '2px solid transparent',
                  outline: i === gIdx ? `1px solid ${M.wax}` : `1px solid ${M.hair2}`,
                  filter: i === gIdx ? 'sepia(0.20)' : 'sepia(0.40) brightness(0.85)',
                  transition: 'all 0.15s',
                }}/>
              ))}
            </div>
          )}
        </div>

        {/* Identity + pricing card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 8 }}>
              {String(l.type || 'tomo').toUpperCase()}
            </div>
            <h1 style={{ ...MTY.h1, color: M.ink, margin: 0, fontSize: 32, lineHeight: 1.1 }}>
              {l.title}<span style={{ color: M.wax }}>.</span>
            </h1>
            {l.tagline && (
              <div style={{ ...MTY.hand, color: M.ink3, marginTop: 6, fontSize: 15, fontStyle: 'italic' }}>
                {l.tagline}
              </div>
            )}
          </div>

          {/* Seller */}
          {seller && (
            <div onClick={() => setView({ id: 'profile', userId: seller.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, cursor: 'pointer',
                background: 'rgba(232,220,192,0.6)',
                border: `1px solid ${M.hair2}`,
                transition: 'border-color 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = M.wax)}
              onMouseOut={(e)  => (e.currentTarget.style.borderColor = M.hair2)}>
              {window.WaxSeal && React.createElement(window.WaxSeal, { src: seller.avatar, name: seller.name, size: 36, ring: 4 })}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8 }}>POR</div>
                <div style={{ ...MTY.h3, color: M.ink, fontSize: 14 }}>{seller.name}</div>
              </div>
              <span style={{ color: M.ink3, fontSize: 14 }}>›</span>
            </div>
          )}

          {/* Pricing card */}
          <div style={{
            position: 'relative',
            background: '#EFE3C8', border: `1px solid ${M.hair3}`,
            padding: '22px 24px',
            boxShadow: '3px 5px 14px rgba(59,38,22,0.10)',
          }}>
            {window.OrnateCorner && (
              <>
                {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', top: 4, left: 4 } })}
                {React.createElement(window.OrnateCorner, { size: 22, opacity: 0.4, style: { position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)' } })}
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ ...MTY.num, fontSize: 38, color: alreadyHas ? M.ink2 : M.wax, lineHeight: 1 }}>{fmt(l.price)}</span>
              <span style={{ ...MTY.capsSm, color: M.ink3 }}>aura{isSub ? ' / mês' : ''}</span>
            </div>

            {locked && (
              <div style={{
                ...MTY.hand, color: M.ink3, fontSize: 13, fontStyle: 'italic',
                marginBottom: 14, paddingBottom: 14, borderBottom: `1px dashed ${M.hair}`,
              }}>
                {levelLocked && `Requer Nível ${l.level}. `}
                {auraShort && `Faltam ${fmt(l.price - state.aura)} aura.`}
              </div>
            )}

            <button onClick={onPrimary} disabled={locked || pending} style={{
              width: '100%', padding: '12px 18px',
              background: alreadyHas ? 'transparent' : (locked ? 'transparent' : M.wax),
              color: alreadyHas ? M.ink : (locked ? M.ink3 : M.surface),
              border: `1px solid ${alreadyHas ? M.ink : (locked ? M.hair2 : M.wax)}`,
              borderStyle: alreadyHas ? 'double' : 'solid',
              borderWidth: alreadyHas ? 3 : 1,
              fontFamily: M.fontDisp, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              cursor: (locked && !alreadyHas) ? 'not-allowed' : 'pointer',
              boxShadow: alreadyHas || locked ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.15), 2px 3px 6px rgba(139,36,24,0.3)',
            }}>
              {pending ? 'Selando…'
                : alreadyHas ? (l.type === 'plugin' ? 'Abrir tomo' : 'Ver biblioteca')
                : locked ? 'Bloqueado'
                : isSub ? 'Assinar' : 'Adquirir'}
            </button>

            {!alreadyHas && (
              <button onClick={toggleWishlist} style={{
                marginTop: 10, width: '100%', padding: '9px 14px',
                background: 'transparent',
                color: inWishlist ? M.wax : M.ink2,
                border: `1px solid ${inWishlist ? M.wax : M.hair2}`,
                fontFamily: M.fontDisp, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}>{inWishlist ? '♥ Marcado' : '♡ Marcar'}</button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {l.description && (
        <div style={{
          background: '#EFE3C8', border: `1px solid ${M.hair2}`,
          padding: '24px 28px', boxShadow: '2px 4px 10px rgba(59,38,22,0.08)',
        }}>
          <div style={{ ...MTY.capsSm, color: M.wax, marginBottom: 12 }}>Sobre o tomo</div>
          <div style={{ ...MTY.body, color: M.ink, fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {l.description}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
            ...MTY.capsSm, color: M.ink2,
          }}>
            <span style={{ flex: 'none', width: 24, height: 1, background: M.hair2 }}/>
            <span>Tomos relacionados</span>
            <span style={{ flex: 1, height: 1, background: M.hair2 }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {related.map((r) => (
              <div key={r.id} onClick={() => setView({ id: 'plugin', listingId: r.id })}
                style={{
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  background: '#EFE3C8', border: `1px solid ${M.hair2}`,
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = M.wax; }}
                onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = M.hair2; }}>
                <div style={{
                  height: 100,
                  background: r.image ? `url("${r.image}") center/cover` : `linear-gradient(135deg, rgba(200,162,78,0.20), rgba(232,220,192,0.5))`,
                  filter: 'sepia(0.20)',
                  borderBottom: `1px solid ${M.hair}`,
                }}/>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ ...MTY.h3, color: M.ink, fontSize: 13, lineHeight: 1.2 }}>{r.title}</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 8,
                    paddingTop: 8, borderTop: `1px dashed ${M.hair}`,
                  }}>
                    <span style={{ ...MTY.capsSm, color: M.ink3, fontSize: 8 }}>Preço</span>
                    <span style={{ ...MTY.num, color: M.wax, fontSize: 13 }}>{fmt(r.price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.CartographerListingDetailView = CartographerListingDetailView;
