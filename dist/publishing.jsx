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
// Backend-first, localStorage as fallback.
//
// Happy path (signed into ElyAPI):
//   1. POST /listings            → creates a draft, returns { id }
//   2. if cover:
//        POST /uploads/request   → returns { asset_id, put_url }
//        PUT file to R2 directly → (HTTP 200)
//        POST /uploads/complete  → asset registered, listing.cover_key set
//   3. POST /listings/:id/publish → flips status to 'published'
//   The data.jsx /listings poll picks the new row up within ~30s and
//   merges it into window.LISTINGS; we also optimistically push locally
//   so the creator sees their new listing right away.
//
// Fallback (ElyAPI not signed in, or backend failure):
//   - Persists to elyhub.userListings.v1 (legacy behavior)
//   - Next successful publish with backend auth migrates naturally because
//     we key on backend ids; local-only rows just keep their `user-…` id.
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

// Convert a data: URL to a Blob for upload. The PublishListingModal stores
// cover images as data URLs (so the draft autosave works across reloads),
// so when we're ready to upload we reverse the encoding.
function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl).split(',');
  const m = /data:([^;]+)(?:;base64)?/.exec(header || '');
  const contentType = m?.[1] || 'application/octet-stream';
  const bin = atob(base64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

// Upload a Blob as a cover/asset for a listing. Returns { asset_id } on
// success, throws on failure. Caller should catch and decide whether to
// abort the publish or continue without a cover.
async function uploadAsset({ listingId, kind, blob, filename }) {
  // 1. Ask the backend for a presigned PUT URL.
  const reqRes = await window.ElyAPI.post('/uploads/request', {
    listing_id: listingId,
    kind,
    filename,
    content_type: blob.type || 'application/octet-stream',
    size_bytes: blob.size,
  });
  // 2. PUT the bytes directly to R2. Note: no Authorization header here —
  // the presigned URL embeds the signature.
  const putRes = await fetch(reqRes.put_url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`r2 PUT failed: ${putRes.status}`);
  }
  // 3. Tell the backend the upload finished so it can promote cover_key
  // (for kind='cover') and mark the asset row as ready.
  await window.ElyAPI.post('/uploads/complete', { asset_id: reqRes.asset_id });
  return { asset_id: reqRes.asset_id, r2_key: reqRes.r2_key };
}

function usePublishing() {
  const [version, bump] = React.useReducer((x) => x + 1, 0);
  // Merge once on mount so cold boots pick up persisted listings.
  React.useEffect(() => { mergeUserListingsIntoWindow(); bump(); }, []);

  // Publish is now async — callers should await. Signed-in users go through
  // the backend; pre-auth users (or on backend failure) fall back to a local
  // listing with a `user-…` id.
  const publish = async (draft) => {
    const me = window.ME || {};
    const tagsArr = (draft.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);
    const price = Math.max(0, Math.floor(Number(draft.price) || 0));
    const title = draft.title.trim();
    const tagline = (draft.tagline || '').trim();
    const description = (draft.description || '').trim();
    const billing = draft.billing || 'one-time';
    const type = draft.type;

    // ─── Backend path ──────────────────────────────────────────────────
    // CRITICAL: when the user is signed in, a backend failure must NOT fall
    // through to the local-only path silently. The maker would see a "live
    // on marketplace" toast and think it worked, while the listing only
    // exists in their localStorage. We only fall back to local for signed-
    // out users (pre-auth onboarding flow).
    const signedIn = !!window.ElyAPI?.isSignedIn?.();
    if (signedIn) {
      // Step name tracks which API call is currently running so a thrown
      // error can describe exactly where the publish broke (e.g.
      // "publish failed at: cover upload — r2 PUT failed: 403").
      let step = 'create draft';
      try {
        // 1. Create the draft. Kassa fields are optional; sending empty
        // strings would fail backend regex, so we only include them when the
        // maker actually filled them in.
        const payload = {
          type, title, tagline, description,
          price_aura: price,
          billing,
          level_req: 1,
          tags: tagsArr,
        };
        if (draft.kassaProductId) payload.kassa_product_id = draft.kassaProductId;
        if (draft.kassaTier) payload.kassa_tier = draft.kassaTier;
        const created = await window.ElyAPI.post('/listings', payload);
        const id = created.id;

        // 2. Upload cover if present. A data: URL needs decoding; an http(s)
        // URL is an external reference we can't proxy into R2, so we skip
        // the upload and just hang on to the URL client-side.
        let coverUrl = '';
        let coverWarning = null; // surfaced in the success toast if set
        if (draft.cover && draft.cover.startsWith('data:')) {
          step = 'cover upload';
          try {
            const blob = dataUrlToBlob(draft.cover);
            // Infer a sensible filename from the content type; R2 doesn't
            // care but browsers / downloads later will.
            const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
            await uploadAsset({
              listingId: id,
              kind: 'cover',
              blob,
              filename: `cover.${ext}`,
            });
            // The data URL itself is fine for in-app display until the
            // next /listings poll rewrites the row with the server's
            // signed cover URL. Keep it so the UI doesn't flash empty.
            coverUrl = draft.cover;
          } catch (err) {
            // Non-fatal — publish without a cover rather than lose the
            // entire draft. Surface to the user so they can retry, but
            // don't abort: the listing will still be created.
            console.warn('[publish] cover upload failed:', err.message);
            coverWarning = err.message || 'cover upload failed';
          }
        } else if (draft.cover) {
          coverUrl = draft.cover; // external URL, use as-is
        }

        // 3. Upload the pack file (the actual purchasable asset) if provided.
        // Unlike cover, failing here is fatal — a paid listing with no asset
        // defrauds the buyer. We abort the whole publish, leaving the draft
        // in place so the creator can retry.
        if (draft.packFile instanceof Blob) {
          step = 'pack upload';
          await uploadAsset({
            listingId: id,
            kind: 'pack',
            blob: draft.packFile,
            filename: draft.packFile.name || 'pack.bin',
          });
        }

        // 4. Flip to published.
        step = 'publish flip';
        await window.ElyAPI.post(`/listings/${id}/publish`);

        // Build a UI-shaped listing to push into window.LISTINGS right
        // away — same shape data.jsx's mapBackendListing produces, so the
        // next poll's upsert is a no-op rather than a mutation.
        const listing = {
          id,
          type,
          sellerId: me.id || 'me',
          title,
          tagline,
          description,
          price,
          billing,
          category: listingTypeMeta(type).label.replace(/s$/, ''),
          tags: tagsArr,
          cover: coverUrl,
          screenshots: [],
          rating: 0,
          reviewCount: 0,
          downloads: 0,
          level: 1,
          updatedAt: 'just now',
          createdAt: Date.now(),
          publishedAt: new Date().toISOString().slice(0, 10),
          featured: false,
        };
        if (Array.isArray(window.LISTINGS)) window.LISTINGS.unshift(listing);
        bump();
        try { window.dispatchEvent(new CustomEvent('ely:listings-changed')); } catch {}
        console.log('[publish] backend ok', { id, coverWarning });
        // Attach the cover warning so the modal can show a softer toast
        // ("published, but cover upload failed") instead of plain success.
        if (coverWarning) listing._coverWarning = coverWarning;
        return listing;
      } catch (err) {
        // Backend failure for a SIGNED-IN user — propagate so the modal
        // shows a real error toast. Do NOT fall through to the local-only
        // path: that path silently creates a localStorage-only listing,
        // which fooled makers into thinking publish worked when it hadn't.
        const msg = err?.message || 'unknown';
        console.warn(`[publish] backend failed at "${step}":`, msg);
        const wrapped = new Error(`Publish failed at: ${step} — ${msg}`);
        wrapped.publishStep = step;
        wrapped.cause = err;
        throw wrapped;
      }
    }

    // ─── Local fallback ────────────────────────────────────────────────
    // Only reachable when the user is fully signed-out. Historically this
    // was used as a pre-auth onboarding demo, but in production it confused
    // makers whose session had silently expired — they'd publish, see a
    // success toast, and the listing would only exist in localStorage. The
    // signed-in branch above now throws on backend failure; here, if the
    // user lost their session, surface that explicitly so they can re-auth
    // instead of creating a phantom listing.
    if (window.ElyAPI && typeof window.ElyAPI.isSignedIn === 'function') {
      // We already checked once at the top, but the user may have signed
      // out (or token expired) since the modal opened. Either way, don't
      // pretend a publish worked.
      throw new Error('You\'re signed out — please log in and try again.');
    }
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const listing = {
      id,
      type,
      sellerId: me.id || 'me',
      title,
      tagline,
      description,
      price,
      billing,
      category: listingTypeMeta(type).label.replace(/s$/, ''),
      tags: tagsArr,
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

  const unpublish = async (listingId) => {
    // Two flavors of listing can reach this:
    //   - `user-…` ids: local-only (fallback publish when signed-out). Just
    //     drop from the localStorage mirror.
    //   - backend ids (uuid): DELETE /listings/:id soft-removes server-side
    //     (status='removed'), so the next /listings poll won't bring it back.
    //     We also optimistically drop it from window.LISTINGS so the UI
    //     refreshes immediately.
    const isLocal = typeof listingId === 'string' && listingId.startsWith('user-');
    if (!isLocal && window.ElyAPI?.isSignedIn?.() && window.ElyAPI?.del) {
      try {
        await window.ElyAPI.del(`/listings/${encodeURIComponent(listingId)}`);
      } catch (err) {
        // 404 = already gone; treat as success. Anything else bubbles up so
        // the caller can toast it.
        if (err?.status !== 404) throw err;
      }
    }
    // Always clean the local mirror, regardless of flavor.
    const user = loadUserListings().filter((l) => l.id !== listingId);
    saveUserListings(user);
    if (Array.isArray(window.LISTINGS)) {
      const i = window.LISTINGS.findIndex((l) => l.id === listingId);
      if (i >= 0) window.LISTINGS.splice(i, 1);
    }
    bump();
    try { window.dispatchEvent(new CustomEvent('ely:listings-changed')); } catch {}
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
const EMPTY_DRAFT = { type: 'theme', title: '', tagline: '', description: '', price: '5000', billing: 'one-time', tags: '', cover: '', kassaProductId: '', kassaTier: '', githubRepo: '', githubToken: '' };

function PublishListingModal({ open, onClose, onPublish, onUpdate, editing }) {
  if (T.zodiac && window.ZodiacPublishListingModal) {
    return <window.ZodiacPublishListingModal open={open} onClose={onClose} onPublish={onPublish} onUpdate={onUpdate} editing={editing}/>;
  }
  const [type, setType] = React.useState(EMPTY_DRAFT.type);
  const [title, setTitle] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState(EMPTY_DRAFT.price);
  const [billing, setBilling] = React.useState(EMPTY_DRAFT.billing);
  const [tags, setTags] = React.useState('');
  const [cover, setCover] = React.useState('');
  // Kassa-backed listing — optional. When kassaProductId is set, the backend
  // wires this listing to kc_issue_license on purchase. Tier is free-form
  // (basic/pro/team); blank = single-tier product.
  const [kassaProductId, setKassaProductId] = React.useState('');
  const [kassaTier, setKassaTier] = React.useState('');
  // Auto-update via GitHub Releases. When githubRepo is set, the backend
  // cron polls /repos/:owner/:repo/releases/latest every 15min and surfaces
  // an Update button in My Library when the cached version diverges.
  // Token is only needed for private repos (PAT with `Contents: read`).
  const [githubRepo, setGithubRepo] = React.useState('');
  const [githubToken, setGithubToken] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  // Pack file (the actual purchasable asset — zip, plugin bundle, sample
  // pack, etc.). Stored as a File object rather than a data URL since these
  // can be hundreds of MB and localStorage-encoding them would be insane.
  // Consequence: pack selection does NOT survive a page reload the way the
  // cover does. That's fine — users rarely leave mid-publish, and forcing a
  // re-pick on reload is safer than silently losing a huge Blob.
  const [packFile, setPackFile] = React.useState(null);
  const packInputRef = React.useRef(null);
  // Publishing is async (backend round-trip + optional R2 upload); the flag
  // disables the button and shows "Publishing…". Declared up here with all
  // the other hooks so we stay compliant with the rules-of-hooks even when
  // the early `if (!open) return null` later skips rendering.
  const [publishing, setPublishing] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const fileInputRef = React.useRef(null);
  // First-render flag — don't write a draft until the user has actually
  // started editing, so just opening+closing doesn't stamp an empty draft.
  const primed = React.useRef(false);
  // Arm+commit for discard (window.confirm is a no-op in Tauri's WKWebView —
  // see shell.jsx:769). First click arms; second within 3s commits.
  const [armedDiscard, setArmedDiscard] = React.useState(false);
  React.useEffect(() => {
    if (!armedDiscard) return;
    const t = setTimeout(() => setArmedDiscard(false), 3000);
    return () => clearTimeout(t);
  }, [armedDiscard]);

  // Hydrate state when the modal opens. Editing → from listing. New → from
  // persisted draft if any, otherwise the EMPTY_DRAFT defaults.
  React.useEffect(() => {
    if (!open) { primed.current = false; setPackFile(null); return; }
    if (editing) {
      setType(editing.type || 'theme');
      setTitle(editing.title || '');
      setTagline(editing.tagline || '');
      setDescription(editing.description || '');
      setPrice(String(editing.price ?? ''));
      setBilling(editing.billing || 'one-time');
      setTags(Array.isArray(editing.tags) ? editing.tags.join(', ') : '');
      setCover(editing.cover || '');
      setKassaProductId(editing.kassaProductId || editing.kassa_product_id || '');
      setKassaTier(editing.kassaTier || editing.kassa_tier || '');
      setGithubRepo(editing.githubRepo || editing.github_repo || '');
      setGithubToken(''); // Never echo tokens back from server.
    } else {
      let draft = null;
      try {
        const raw = localStorage.getItem(PUBLISH_DRAFT_KEY);
        if (raw) draft = JSON.parse(raw);
      } catch {}
      const d = { ...EMPTY_DRAFT, ...(draft || {}) };
      setType(d.type); setTitle(d.title); setTagline(d.tagline); setDescription(d.description);
      setPrice(d.price); setBilling(d.billing); setTags(d.tags); setCover(d.cover);
      setKassaProductId(d.kassaProductId || ''); setKassaTier(d.kassaTier || '');
      setGithubRepo(d.githubRepo || ''); setGithubToken(d.githubToken || '');
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
        localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({ type, title, tagline, description, price, billing, tags, cover, kassaProductId, kassaTier, githubRepo, githubToken }));
        setSavedAt(Date.now());
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [open, editing, type, title, tagline, description, price, billing, tags, cover, kassaProductId, kassaTier, githubRepo, githubToken]);

  if (!open) return null;

  const isEdit = !!editing;
  const canPublish = title.trim().length >= 2 && Number(price) >= 0;
  const types = (window.LISTING_TYPES || []).map((t) => t.id);

  const clearDraft = () => { try { localStorage.removeItem(PUBLISH_DRAFT_KEY); } catch {} };

  const submit = async () => {
    if (!canPublish || publishing) return;
    if (isEdit) {
      const updated = onUpdate(editing.id, { type, title: title.trim(), tagline: tagline.trim(), description: description.trim(), price, billing, tags, cover, kassaProductId: kassaProductId.trim(), kassaTier: kassaTier.trim() });
      // Sync github_repo separately — it's a backend-only field, not part of
      // the local listing record. Editing case only; new listings sync after
      // backend create returns the id (see post-onPublish block below).
      if (window.ElyAPI?.post && (editing.id || '').length > 0 && !editing.id.startsWith('user-')) {
        const repoTrim = githubRepo.trim();
        const tokenTrim = githubToken.trim();
        try {
          await window.ElyAPI.post(`/listings/${editing.id}/github`, {
            github_repo: repoTrim || null,
            // Only send token if non-empty (empty = keep existing on server).
            ...(tokenTrim ? { github_token: tokenTrim } : {}),
          });
        } catch (err) {
          console.warn('[publish] github sync failed:', err);
        }
      }
      try { ElyNotify?.toast?.({ text: `${updated?.title || 'Listing'} updated`, kind: 'success' }); } catch {}
      onClose();
      return;
    }
    setPublishing(true);
    try {
      const listing = await onPublish({ type, title, tagline, description, price, billing, tags, cover, packFile, kassaProductId: kassaProductId.trim(), kassaTier: kassaTier.trim() });
      // After publish, attach github_repo if provided. Listing.id is the
      // server-assigned id when the backend was contacted; for local-only
      // mock listings this is a no-op.
      const repoTrim = githubRepo.trim();
      if (repoTrim && window.ElyAPI?.post && listing?.id && !String(listing.id).startsWith('user-')) {
        try {
          await window.ElyAPI.post(`/listings/${listing.id}/github`, {
            github_repo: repoTrim,
            github_token: githubToken.trim() || null,
          });
        } catch (err) {
          console.warn('[publish] github attach failed:', err);
        }
      }
      try {
        if (listing._coverWarning) {
          ElyNotify?.toast?.({
            text: `${listing.title} published — but cover upload failed (${listing._coverWarning}). Edit later to retry.`,
            kind: 'warn',
            duration: 6000,
          });
        } else {
          ElyNotify?.toast?.({ text: `${listing.title} is live on the marketplace`, kind: 'success' });
        }
      } catch {}
      clearDraft();
      onClose();
    } catch (err) {
      console.warn('[publish] failed:', err);
      const msg = err?.message || 'unknown error';
      try { ElyNotify?.toast?.({
        text: `Publish failed: ${msg}`,
        kind: 'warn',
        duration: 8000,
      }); } catch {}
    } finally {
      setPublishing(false);
    }
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

              {/* Licensing block — optional. Fill in for paid plugins that
                  should emit a license key on purchase (Kassa). Leave blank
                  for plain assets (themes, packs, samples). */}
              <div style={{ marginBottom: 14, padding: 12, borderRadius: T.r.md, border: `0.5px dashed ${T.glassBorder}`, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ ...TY.small, color: T.text2, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔑 LICENSING</span>
                  <span style={{ fontWeight: 400, color: T.text3, fontSize: 10 }}>— optional (Kassa)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ ...label, fontSize: 10 }}>PRODUCT ID</label>
                    <input
                      value={kassaProductId}
                      onChange={(e) => setKassaProductId(e.target.value.toLowerCase())}
                      placeholder="my-plugin"
                      style={input}
                    />
                  </div>
                  <div>
                    <label style={{ ...label, fontSize: 10 }}>TIER <span style={{ color: T.text3, fontWeight: 400 }}>(opt)</span></label>
                    <input
                      value={kassaTier}
                      onChange={(e) => setKassaTier(e.target.value.toLowerCase())}
                      placeholder="basic"
                      style={input}
                    />
                  </div>
                </div>
                <div style={{ ...TY.small, fontSize: 10, color: T.text3, marginTop: 6, lineHeight: 1.4 }}>
                  When set, every purchase issues a license key the buyer can see in My Licenses. kebab-case, 2–40 chars. Must be unique across the marketplace.
                </div>
              </div>

              {/* Auto-update via GitHub Releases. Optional — when set, the
                  backend cron polls the repo every 15min and pushes update
                  notifications + an Update button to buyers' My Library. */}
              <div style={{ marginBottom: 14, padding: 12, borderRadius: T.r.md, border: `0.5px dashed ${T.glassBorder}`, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ ...TY.small, color: T.text2, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔄 AUTO-UPDATE</span>
                  <span style={{ fontWeight: 400, color: T.text3, fontSize: 10 }}>— optional (GitHub Releases)</span>
                </div>
                <div>
                  <label style={{ ...label, fontSize: 10 }}>GITHUB REPO</label>
                  <input
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="owner/repo  (e.g. kassa/hugin)"
                    style={input}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ ...label, fontSize: 10 }}>
                    PAT <span style={{ color: T.text3, fontWeight: 400 }}>(only for private repos — leave blank otherwise)</span>
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_… (Contents: read scope)"
                    style={input}
                    autoComplete="new-password"
                  />
                </div>
                <div style={{ ...TY.small, fontSize: 10, color: T.text3, marginTop: 6, lineHeight: 1.4 }}>
                  Push a release with <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>gh release create v0.2.0 plugin.zip</code> on the repo. Buyers get an Update button in My Library within ~15min.
                </div>
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

              {/* ── Pack file ── */}
              {/* The actual purchasable asset. Distinct picker from the cover
                  because (a) it's any content-type, (b) it goes straight to
                  R2 without being inlined as base64, (c) it's optional for
                  "link-only" or free-price listings. Not shown in edit mode
                  yet — swapping the underlying asset is a separate flow we
                  haven't designed. */}
              {!isEdit && (
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>PACK FILE <span style={{ color: T.text3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <div
                    onClick={() => packInputRef.current?.click()}
                    style={{
                      borderRadius: T.r.md, padding: 14,
                      border: `1px dashed ${T.glassBorder}`,
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', transition: 'all .15s',
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}
                  >
                    {packFile ? (
                      <>
                        <div style={{
                          width: 40, height: 40, borderRadius: T.r.sm,
                          background: `linear-gradient(135deg, ${T.accentHi}22, ${T.accent}22)`,
                          border: `0.5px solid ${T.accent}55`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: T.accentHi, flexShrink: 0, fontWeight: 700, fontSize: 11,
                        }}>
                          {((packFile.name || '').split('.').pop() || 'FILE').slice(0, 4).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...TY.small, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {packFile.name}
                          </div>
                          <div style={{ ...TY.small, fontSize: 11, color: T.text3 }}>
                            {(packFile.size / 1024 / 1024).toFixed(2)} MB · {packFile.type || 'unknown'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPackFile(null); }}
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
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...TY.small, color: T.text }}>Pick the file buyers will download</div>
                          <div style={{ ...TY.small, fontSize: 11, color: T.text3, marginTop: 2 }}>ZIP, plugin bundle, sample pack… up to 2 GB</div>
                        </div>
                      </>
                    )}
                    <input
                      ref={packInputRef}
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 2 * 1024 * 1024 * 1024) {
                          try { ElyNotify?.toast?.({ text: 'File too large (max 2 GB)', kind: 'warn' }); } catch {}
                        } else {
                          setPackFile(f);
                        }
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}
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
                  if (!armedDiscard) {
                    setArmedDiscard(true);
                    try { ElyNotify?.toast?.({ text: 'Click again to discard this draft', kind: 'warn' }); } catch {}
                    return;
                  }
                  setArmedDiscard(false);
                  clearDraft();
                  setType(EMPTY_DRAFT.type); setTitle(''); setTagline(''); setDescription('');
                  setPrice(EMPTY_DRAFT.price); setBilling(EMPTY_DRAFT.billing); setTags(''); setCover('');
                  setKassaProductId(''); setKassaTier('');
                  setSavedAt(null);
                }}
                style={{
                  padding: '10px 16px', borderRadius: T.r.pill,
                  border: 'none', background: armedDiscard ? 'rgba(220,50,70,0.15)' : 'transparent',
                  color: armedDiscard ? '#ff6b7a' : T.text3, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >{armedDiscard ? 'Click again to discard' : 'Discard draft'}</button>
            ) : <div/>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{
                padding: '10px 18px', borderRadius: T.r.pill,
                border: `0.5px solid ${T.glassBorder}`, background: 'rgba(255,255,255,0.04)',
                color: T.text2, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
              }}>{isEdit ? 'Cancel' : 'Close'}</button>
              <button
                onClick={submit}
                disabled={!canPublish || publishing}
                style={{
                  padding: '10px 22px', borderRadius: T.r.pill, border: 'none',
                  background: canPublish && !publishing ? `linear-gradient(135deg, ${T.accentHi}, ${T.accent})` : 'rgba(255,255,255,0.06)',
                  color: canPublish && !publishing ? '#fff' : T.text3,
                  cursor: canPublish && !publishing ? 'pointer' : 'not-allowed',
                  fontFamily: T.fontSans, fontWeight: 600, fontSize: 13,
                  boxShadow: canPublish && !publishing ? `0 4px 18px ${T.accent}66` : 'none',
                }}
              >{isEdit ? 'Save changes' : (publishing ? 'Publishing…' : 'Publish')}</button>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

