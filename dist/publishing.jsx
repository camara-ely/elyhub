// publishing.jsx — user listings + publish/edit form.
//
// Extracted from app.jsx. Holds the publishing state hook (usePublishing)
// which lives on top of localStorage and syncs into window.LISTINGS, plus the
// PublishListingModal form for creating/editing a listing.
//
// Also houses makeDefaultCustom — a tiny seed helper for the theme tweaks
// system — because of where it physically sat in the original file. It's
// used by useTweaks (views.jsx). Script ordering makes this safe: both are
// top-level declarations available once all scripts have evaluated.

// ────────────── Tweaks ──────────────
// Tweaks hook — now backed by the theme engine above. Persists the full
// customization state (active preset, per-slot custom themes, active custom
// slot) to localStorage. Exposes `resolved` so Shell can pass it down to
// AmbientBG, and `updateCustom` / `setCustomSlots` for the editor UI.
function makeDefaultCustom() {
  // Seed new custom slots from the Nocturne preset so users see *something*
  // immediately instead of a blank canvas. They can nuke points and rebuild.
  return {
    id: 'c1',
    name: 'My theme',
    accent: THEME_PRESETS.nocturne.accent,
    accentHi: THEME_PRESETS.nocturne.accentHi,
    base: THEME_PRESETS.nocturne.base,
    bgImage: null,
    autoContrast: true,
    points: THEME_PRESETS.nocturne.points.map((p) => ({ ...p })),
  };
}

// ──── Publishing — user-created marketplace listings ────
// User listings are persisted under elyhub.userListings.v1 and merged into
// window.LISTINGS at app boot + whenever publish() fires. A version counter
// forces re-renders of views that read window.LISTINGS at render time.
const USER_LISTINGS_KEY = 'elyhub.userListings.v1';

function loadUserListings() {
  try {
    const raw = localStorage.getItem(USER_LISTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveUserListings(items) {
  try { localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(items)); } catch {}
}

// Seed window.LISTINGS with user-authored ones on first read. Idempotent.
function mergeUserListingsIntoWindow() {
  if (!Array.isArray(window.LISTINGS)) return;
  const user = loadUserListings();
  const have = new Set(window.LISTINGS.map((l) => l.id));
  for (const u of user) if (!have.has(u.id)) window.LISTINGS.push(u);
}

function usePublishing() {
  const [version, bump] = React.useReducer((x) => x + 1, 0);
  // Merge once on mount so cold boots pick up persisted listings.
  React.useEffect(() => { mergeUserListingsIntoWindow(); bump(); }, []);

  const publish = (draft) => {
    const me = window.ME || {};
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const listing = {
      id,
      type: draft.type,
      sellerId: me.id || 'me',
      title: draft.title.trim(),
      tagline: (draft.tagline || '').trim(),
      description: (draft.description || '').trim(),
      price: Math.max(0, Math.floor(Number(draft.price) || 0)),
      billing: draft.billing || 'one-time',
      category: listingTypeMeta(draft.type).label.replace(/s$/, ''),
      tags: (draft.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6),
      cover: draft.cover || '',
      rating: 0,
      reviewCount: 0,
      downloads: 0,
      level: 1,
      updatedAt: 'just now',
      createdAt: Date.now(),
    };
    const user = loadUserListings();
    user.unshift(listing);
    saveUserListings(user);
    if (Array.isArray(window.LISTINGS)) window.LISTINGS.unshift(listing);
    bump();
    try { window.dispatchEvent(new CustomEvent('ely:listings-changed')); } catch {}
    return listing;
  };

  const unpublish = (listingId) => {
    const user = loadUserListings().filter((l) => l.id !== listingId);
    saveUserListings(user);
    if (Array.isArray(window.LISTINGS)) {
      const i = window.LISTINGS.findIndex((l) => l.id === listingId);
      if (i >= 0) window.LISTINGS.splice(i, 1);
    }
    bump();
  };

  // Update an existing user-published listing in place. Only user-authored
  // listings (id prefixed with 'user-') are editable — the built-in seed data
  // is immutable from the UI.
  const update = (listingId, patch) => {
    const user = loadUserListings();
    const i = user.findIndex((l) => l.id === listingId);
    if (i < 0) return null;
    const next = { ...user[i], ...patch, updatedAt: 'just now' };
    // Re-normalize the mutable fields the modal can touch.
    if (patch.tags != null) next.tags = (patch.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);
    if (patch.price != null) next.price = Math.max(0, Math.floor(Number(patch.price) || 0));
    user[i] = next;
    saveUserListings(user);
    if (Array.isArray(window.LISTINGS)) {
      const wi = window.LISTINGS.findIndex((l) => l.id === listingId);
      if (wi >= 0) window.LISTINGS[wi] = next;
    }
    bump();
    try { window.dispatchEvent(new CustomEvent('ely:listings-changed')); } catch {}
    return next;
  };

  return { version, publish, unpublish, update };
}

// ──── PublishListingModal — form to publish or edit a listing ────
// If `editing` is passed, the modal prefills from it and calls onUpdate(id,patch)
// on submit; otherwise it calls onPublish(draft) and creates a new listing.
const PUBLISH_DRAFT_KEY = 'elyhub.publishDraft.v1';
const EMPTY_DRAFT = { type: 'theme', title: '', tagline: '', description: '', price: '5000', billing: 'one-time', tags: '', cover: '' };

function PublishListingModal({ open, onClose, onPublish, onUpdate, editing }) {
  const [type, setType] = React.useState(EMPTY_DRAFT.type);
  const [title, setTitle] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState(EMPTY_DRAFT.price);
  const [billing, setBilling] = React.useState(EMPTY_DRAFT.billing);
  const [tags, setTags] = React.useState('');
  const [cover, setCover] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const fileInputRef = React.useRef(null);
  // First-render flag — don't write a draft until the user has actually
  // started editing, so just opening+closing doesn't stamp an empty draft.
  const primed = React.useRef(false);

  // Hydrate state when the modal opens. Editing → from listing. New → from
  // persisted draft if any, otherwise the EMPTY_DRAFT defaults.
  React.useEffect(() => {
    if (!open) { primed.current = false; return; }
    if (editing) {
      setType(editing.type || 'theme');
      setTitle(editing.title || '');
      setTagline(editing.tagline || '');
      setDescription(editing.description || '');
      setPrice(String(editing.price ?? ''));
      setBilling(editing.billing || 'one-time');
      setTags(Array.isArray(editing.tags) ? editing.tags.join(', ') : '');
      setCover(editing.cover || '');
    } else {
      let draft = null;
      try {
        const raw = localStorage.getItem(PUBLISH_DRAFT_KEY);
        if (raw) draft = JSON.parse(raw);
      } catch {}
      const d = { ...EMPTY_DRAFT, ...(draft || {}) };
      setType(d.type); setTitle(d.title); setTagline(d.tagline); setDescription(d.description);
      setPrice(d.price); setBilling(d.billing); setTags(d.tags); setCover(d.cover);
    }
    // Let the subsequent effect start autosaving after this one settles.
    const id = setTimeout(() => { primed.current = true; }, 50);
    return () => clearTimeout(id);
  }, [open, editing]);

  // Autosave — debounced. Only for new listings, not for edits.
  React.useEffect(() => {
    if (!open || editing || !primed.current) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({ type, title, tagline, description, price, billing, tags, cover }));
        setSavedAt(Date.now());
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [open, editing, type, title, tagline, description, price, billing, tags, cover]);

  if (!open) return null;

  const isEdit = !!editing;
  const canPublish = title.trim().length >= 2 && Number(price) >= 0;
  const types = (window.LISTING_TYPES || []).map((t) => t.id);

  const clearDraft = () => { try { localStorage.removeItem(PUBLISH_DRAFT_KEY); } catch {} };

  const submit = () => {
    if (!canPublish) return;
    if (isEdit) {
      const updated = onUpdate(editing.id, { type, title: title.trim(), tagline: tagline.trim(), description: description.trim(), price, billing, tags, cover });
      try { ElyNotify?.toast?.({ text: `${updated?.title || 'Listing'} updated`, kind: 'success' }); } catch {}
    } else {
      const listing = onPublish({ type, title, tagline, description, price, billing, tags, cover });
      try { ElyNotify?.toast?.({ text: `${listing.title} is live on the marketplace`, kind: 'success' }); } catch {}
      clearDraft();
    }
    onClose();
  };

  // Read a File/Blob as data URL for inline cover storage. Size capped at
  // 2MB — anything bigger would balloon localStorage.
  const readCoverFile = (file) => {
    if (!file || !file.type?.startsWith('image/')) {
      try { ElyNotify?.toast?.({ text: 'Drop an image file', kind: 'warn' }); } catch {}
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      try { ElyNotify?.toast?.({ text: 'Image too large (max 2MB)', kind: 'warn' }); } catch {}
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCover(String(reader.result));
    reader.onerror = () => { try { ElyNotify?.toast?.({ text: 'Could not read image', kind: 'warn' }); } catch {} };
    reader.readAsDataURL(file);
  };

  const onFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) readCoverFile(file);
    e.target.value = ''; // allow re-picking the same file
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) readCoverFile(file);
  };

  // Build a preview listing that matches the real schema so the ListingCard
  // renders exactly like it will in the marketplace.
  const me = window.ME || {};
  const previewListing = {
    id: editing?.id || 'preview',
    type, sellerId: me.id || 'me',
    title: title || 'Untitled listing',
    tagline: tagline || 'Add a short tagline',
    price: Math.max(0, Math.floor(Number(price) || 0)),
    billing,
    tags: (tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    cover,
    rating: editing?.rating || 0,
    reviewCount: editing?.reviewCount || 0,
    downloads: editing?.downloads || 0,
    level: 1,
    createdAt: editing?.createdAt || Date.now(),
  };

  const input = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: T.r.md,
    background: 'rgba(255,255,255,0.04)',
    border: `0.5px solid ${T.glassBorder}`,
    color: T.text, fontFamily: T.fontSans, fontSize: 13,
    outline: 'none',
  };
  const label = { ...TY.micro, color: T.text3, marginBottom: 6, display: 'block' };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit listing' : 'Publish a listing'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}>
        <Glass style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ ...TY.h2, margin: 0 }}>{isEdit ? 'Edit listing' : 'Publish a listing'}</h2>
              {!isEdit && savedAt && (
                <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ee7a0', boxShadow: '0 0 6px #6ee7a0' }}/>
                  Draft saved
                </div>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.text3, fontSize: 20, padding: 0, lineHeight: 1,
            }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(260px, 1fr)', gap: 22, alignItems: 'start' }}>
            {/* ── Form ── */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <span style={label}>TYPE</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {types.map((k) => {
                    const meta = listingTypeMeta(k);
                    const active = type === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setType(k)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: T.r.pill,
                          background: active ? `${meta.hue}22` : 'rgba(255,255,255,0.04)',
                          border: `0.5px solid ${active ? meta.hue + '88' : T.glassBorder}`,
                          color: active ? meta.hue : T.text2,
                          cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                        }}
                      >
                        <ListingTypeIcon type={k} size={12}/>
                        {meta.label.replace(/s$/, '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>TITLE</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunset Wallpapers" style={input} maxLength={60}/>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>TAGLINE</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short one-liner" style={input} maxLength={80}/>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>DESCRIPTION</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                  placeholder="What's included, what it's for, any gotchas"
                  style={{ ...input, resize: 'vertical', fontFamily: T.fontSans }}/>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={label}>PRICE (aura)</label>
                  <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={input}/>
                </div>
                <div>
                  <label style={label}>BILLING</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['one-time', 'monthly'].map((b) => (
                      <button key={b} onClick={() => setBilling(b)} style={{
                        flex: 1, padding: '10px 12px', borderRadius: T.r.md,
                        background: billing === b ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
                        border: `0.5px solid ${billing === b ? T.accent + '88' : T.glassBorder}`,
                        color: billing === b ? T.accentHi : T.text2,
                        cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 600, fontSize: 12,
                      }}>{b === 'one-time' ? 'One-time' : 'Monthly'}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>TAGS (comma separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dark, minimal, pack" style={input}/>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>COVER</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: T.r.md, padding: 14,
                    border: `1px dashed ${dragOver ? T.accentHi : T.glassBorder}`,
                    background: dragOver ? `${T.accent}14` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', transition: 'all .15s',
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}
                >
                  {cover ? (
                    <>
                      <div style={{
                        width: 64, height: 40, borderRadius: T.r.sm, overflow: 'hidden', flexShrink: 0,
                        background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.glassBorder}`,
                      }}>
                        <img src={cover} alt="cover preview"
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                             onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...TY.small, color: T.text, fontWeight: 500 }}>
                          {cover.startsWith('data:') ? 'Uploaded image' : 'External URL'}
                        </div>
                        <div style={{ ...TY.small, fontSize: 11, color: T.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                          {cover.startsWith('data:') ? '(inline)' : cover}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCover(''); }}
                        style={{
                          padding: '6px 10px', borderRadius: T.r.pill,
                          border: `0.5px solid ${T.glassBorder}`, background: 'rgba(255,255,255,0.04)',
                          color: T.text3, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
                        }}
                      >Remove</button>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${T.glassBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: T.text3, flexShrink: 0,
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...TY.small, color: T.text }}>Drop an image, or <span style={{ color: T.accentHi }}>browse</span></div>
                        <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 2 }}>PNG, JPG, WebP · max 2 MB</div>
                      </div>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onFilePick} style={{ display: 'none' }}/>
                </div>
                <input
                  value={cover.startsWith('data:') ? '' : cover}
                  onChange={(e) => setCover(e.target.value)}
                  placeholder="…or paste an image URL"
                  style={{ ...input, marginTop: 8 }}
                />
              </div>
            </div>

            {/* ── Live preview ── */}
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>LIVE PREVIEW</div>
              <ListingCard
                l={previewListing}
                state={{ aura: 999999999, level: 99 }}
                onOpen={() => {}}
                onSeller={() => {}}
              />
              <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 10, lineHeight: 1.45 }}>
                This is how your listing will appear on the marketplace grid.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: `0.5px solid ${T.glassBorder}` }}>
            {!isEdit ? (
              <button
                onClick={() => {
                  if (confirm('Discard this draft?')) {
                    clearDraft();
                    setType(EMPTY_DRAFT.type); setTitle(''); setTagline(''); setDescription('');
                    setPrice(EMPTY_DRAFT.price); setBilling(EMPTY_DRAFT.billing); setTags(''); setCover('');
                    setSavedAt(null);
                  }
                }}
                style={{
                  padding: '10px 16px', borderRadius: T.r.pill,
                  border: 'none', background: 'transparent',
                  color: T.text3, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                }}
              >Discard draft</button>
            ) : <div/>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{
                padding: '10px 18px', borderRadius: T.r.pill,
                border: `0.5px solid ${T.glassBorder}`, background: 'rgba(255,255,255,0.04)',
                color: T.text2, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
              }}>{isEdit ? 'Cancel' : 'Close'}</button>
              <button
                onClick={submit}
                disabled={!canPublish}
                style={{
                  padding: '10px 22px', borderRadius: T.r.pill, border: 'none',
                  background: canPublish ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                  color: canPublish ? '#fff' : T.text3,
                  cursor: canPublish ? 'pointer' : 'not-allowed',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 13,
                  boxShadow: canPublish ? `0 4px 18px ${T.accent}66` : 'none',
                }}
              >{isEdit ? 'Save changes' : 'Publish'}</button>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

