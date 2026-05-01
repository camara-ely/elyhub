// ElyHub — Cartographer Modern ListingDetailView.

function CartographerModernListingDetailView({ state, setView, onQuick, focusId, library, purchaseListing, reviews, wishlist, follows, recent, messages, coupons, reports, blocks }) {
  const Mm = window.Mm, MmTY = window.MmTY;
  const fmt = window.fmtMm || ((n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' '));
  const l = (window.LISTINGS || []).find((x) => x.id === focusId);

  const isHugin = l && (l.kassa_product_id || l.kassaProductId) === 'gleipnir';
  React.useEffect(() => { if (isHugin) setView({ id: 'zephyro' }); }, [isHugin]);
  if (isHugin) return null;

  if (!l) {
    return (
      <div style={{
        background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
        borderRadius: 6, padding: 40, textAlign: 'center',
      }}>
        <div style={{ ...MmTY.body, color: Mm.text2 }}>Listing not found.</div>
        <button onClick={() => setView({ id: 'store' })} style={{
          marginTop: 14, ...MmTY.coord, color: Mm.accent,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        }}>← BACK TO MARKET</button>
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
          try { ElyNotify?.toast?.({ text: `${l.title} ${isSub ? 'subscribed' : 'added to library'}`, kind: 'success' }); } catch {}
          setView(l.type === 'plugin' ? { id: `plugin:${l.id}` } : { id: 'library' });
        } else {
          try { ElyNotify?.toast?.({ text: 'Insufficient aura', kind: 'warn' }); } catch {}
        }
      }, 380);
    } else {
      onQuick.redeem({ ...l, sub: l.tagline });
    }
  };

  const inWishlist = (wishlist?.items || []).includes(l.id);
  const toggleWishlist = () => {
    if (!wishlist) return;
    if (inWishlist) wishlist.remove(l.id); else wishlist.add(l.id);
  };

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

  const ownedIds = new Set((library?.items || []).map((it) => it.listingId));
  const related = (window.LISTINGS || [])
    .filter((x) => x.id !== l.id && !ownedIds.has(x.id) && (x.type === l.type || x.sellerId === l.sellerId))
    .slice(0, 4);

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <button onClick={() => setView({ id: 'store' })} style={{
        ...MmTY.coord, color: Mm.accent,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, alignSelf: 'flex-start',
      }}>← BACK TO MARKET</button>

      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24 }}>
        <div>
          <div style={{
            position: 'relative', height: 360,
            background: heroImg
              ? `url("${heroImg.src}") center/cover`
              : `linear-gradient(135deg, ${Mm.accent}22, ${Mm.cyan}11)`,
            border: `1px solid ${Mm.hair3}`, borderRadius: 6,
            boxShadow: `0 0 24px rgba(155,214,107,0.10)`,
          }}/>
          {gallery.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {gallery.map((g, i) => (
                <button key={i} onClick={() => setGIdx(i)} style={{
                  width: 84, height: 56, padding: 0, cursor: 'pointer',
                  background: `url("${g.src}") center/cover`,
                  border: `1px solid ${i === gIdx ? Mm.accent : Mm.hair2}`,
                  borderRadius: 4,
                  filter: i === gIdx ? 'none' : 'brightness(0.65)',
                  transition: 'all 0.15s',
                }}/>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 6 }}>{String(l.type || 'listing').toUpperCase()}</div>
            <h1 style={{ ...MmTY.h1, color: Mm.text, margin: 0, fontSize: 30, lineHeight: 1.1 }}>
              {l.title}<span style={{ color: Mm.accent }}>.</span>
            </h1>
            {l.tagline && <div style={{ ...MmTY.small, color: Mm.text3, marginTop: 6, fontSize: 14 }}>{l.tagline}</div>}
          </div>

          {seller && (
            <div onClick={() => setView({ id: 'profile', userId: seller.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, cursor: 'pointer',
                background: 'rgba(10,18,16,0.65)',
                border: `1px solid ${Mm.hair2}`, borderRadius: 4,
                transition: 'border-color 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = Mm.accent)}
              onMouseOut={(e)  => (e.currentTarget.style.borderColor = Mm.hair2)}>
              <div style={{
                width: 32, height: 32, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
                background: seller.avatar ? '#1A2A24' : `linear-gradient(135deg, ${Mm.accent}, ${Mm.cyan})`,
                border: `1px solid ${Mm.hair2}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {seller.avatar
                  ? <img src={seller.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <span style={{ color: Mm.bg, fontFamily: Mm.fontDisp, fontSize: 12, fontWeight: 700 }}>{seller.name[0]?.toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>BY</div>
                <div style={{ ...MmTY.body, color: Mm.text, fontWeight: 500, fontSize: 13 }}>{seller.name}</div>
              </div>
              <span style={{ color: Mm.text3, fontSize: 14 }}>›</span>
            </div>
          )}

          {/* Pricing */}
          <div style={{
            background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair3}`,
            borderRadius: 6, padding: '20px 22px',
            boxShadow: `0 0 14px rgba(155,214,107,0.10)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ ...MmTY.numTab, fontSize: 36, color: alreadyHas ? Mm.text2 : Mm.accent, lineHeight: 1 }}>{fmt(l.price)}</span>
              <span style={{ ...MmTY.coord, color: Mm.text3 }}>aura{isSub ? ' / mo' : ''}</span>
            </div>

            {locked && (
              <div style={{
                ...MmTY.small, color: Mm.text3, marginBottom: 14,
                paddingBottom: 14, borderBottom: `1px solid ${Mm.hair}`,
              }}>
                {levelLocked && `Requires Level ${l.level}. `}
                {auraShort && `${fmt(l.price - state.aura)} aura short.`}
              </div>
            )}

            <button onClick={onPrimary} disabled={locked || pending} style={{
              width: '100%', padding: '11px 18px', borderRadius: 4,
              background: alreadyHas ? 'transparent' : (locked ? 'transparent' : Mm.accent),
              color: alreadyHas ? Mm.text : (locked ? Mm.text3 : Mm.bg),
              border: `1px solid ${alreadyHas ? Mm.text : (locked ? Mm.hair2 : Mm.accent)}`,
              fontFamily: Mm.fontUI, fontSize: 13, fontWeight: 600,
              cursor: (locked && !alreadyHas) ? 'not-allowed' : 'pointer',
              boxShadow: alreadyHas || locked ? 'none' : `0 0 14px ${Mm.accent}33`,
            }}>
              {pending ? 'Processing…'
                : alreadyHas ? (l.type === 'plugin' ? 'Open' : 'Library')
                : locked ? 'Locked'
                : isSub ? 'Subscribe' : 'Acquire'}
            </button>

            {!alreadyHas && (
              <button onClick={toggleWishlist} style={{
                marginTop: 10, width: '100%', padding: '9px 14px', borderRadius: 4,
                background: 'transparent',
                color: inWishlist ? Mm.accent : Mm.text2,
                border: `1px solid ${inWishlist ? Mm.accent : Mm.hair2}`,
                fontFamily: Mm.fontUI, fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
              }}>{inWishlist ? '♥ Saved' : '♡ Save'}</button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {l.description && (
        <div style={{
          background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
          borderRadius: 6, padding: '22px 26px',
        }}>
          <div style={{ ...MmTY.coord, color: Mm.accent, marginBottom: 12 }}>ABOUT</div>
          <div style={{ ...MmTY.body, color: Mm.text, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {l.description}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
            ...MmTY.caps, color: Mm.text3,
          }}>
            <span style={{ width: 8, height: 8, background: Mm.cyan, borderRadius: 1, boxShadow: `0 0 6px ${Mm.cyan}` }}/>
            <span>Related listings</span>
            <span style={{ flex: 1, height: 1, background: Mm.hair }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {related.map((r) => (
              <div key={r.id} onClick={() => setView({ id: 'plugin', listingId: r.id })}
                style={{
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  background: 'rgba(15,30,25,0.55)', border: `1px solid ${Mm.hair2}`,
                  borderRadius: 6,
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = Mm.accent; }}
                onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.borderColor = Mm.hair2; }}>
                <div style={{
                  height: 100,
                  background: r.image ? `url("${r.image}") center/cover` : `linear-gradient(135deg, ${Mm.accent}22, ${Mm.cyan}11)`,
                  borderBottom: `1px solid ${Mm.hair}`,
                }}/>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ ...MmTY.h3, color: Mm.text, fontSize: 13, lineHeight: 1.2 }}>{r.title}</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 8,
                    paddingTop: 8, borderTop: `1px solid ${Mm.hair}`,
                  }}>
                    <span style={{ ...MmTY.coord, color: Mm.text3, fontSize: 8 }}>PRICE</span>
                    <span style={{ ...MmTY.numTab, color: Mm.accent, fontSize: 13 }}>{fmt(r.price)}</span>
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

window.CartographerModernListingDetailView = CartographerModernListingDetailView;
