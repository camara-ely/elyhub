// Download manager — streamed progress + in-app panel + Save dialog + native
// completion toast. Tauri 2 doesn't have a filesystem plugin wired here, so
// we can't write to disk ourselves; instead we stream into memory with real
// progress, then hand the resulting Blob to an <a download> anchor so WebKit
// triggers the native Save dialog (Downloads folder by default).
//
// Global API — publish `window.ElyDownloads`:
//   start({ id, title, url, filename, onDone? })   → queues + begins streaming
//   subscribe(fn)                                  → notified on any task change
//   tasks()                                        → current snapshot
//
// Task shape:
//   { id, title, filename, loaded, total, status, error?, blobUrl? }
//   status: 'streaming' | 'done' | 'error' | 'saved'

(() => {
  const subs = new Set();
  const tasks = new Map(); // id → task

  function notify() {
    for (const fn of subs) { try { fn(); } catch (e) { console.error(e); } }
  }

  function upsert(id, patch) {
    const prev = tasks.get(id) || { id };
    tasks.set(id, { ...prev, ...patch });
    notify();
  }

  async function start({ id, title, url, filename, onDone, headers, listingId, version }) {
    const taskId = id || (Date.now() + ':' + Math.random().toString(36).slice(2));
    upsert(taskId, {
      title: title || filename || 'Download',
      filename: filename || 'download.bin',
      loaded: 0,
      total: 0,
      status: 'streaming',
    });

    try {
      // headers — used by the github-release proxy (Authorization: Bearer …
      // so the Worker can verify entitlement). Plain R2 presigned URLs don't
      // need any headers; passing undefined is a no-op for fetch().
      const res = await fetch(url, headers ? { headers } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('Content-Length')) || 0;
      upsert(taskId, { total });

      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      // Throttle UI updates — one repaint per ~100ms is plenty, more causes
      // visible jank on large files with tiny chunk sizes.
      let lastPaint = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        const nowT = performance.now();
        if (nowT - lastPaint > 80) {
          upsert(taskId, { loaded });
          lastPaint = nowT;
        }
      }
      upsert(taskId, { loaded, total: total || loaded });

      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      upsert(taskId, { status: 'done', blobUrl });

      // Kick the native Save dialog. Anchor with download attribute +
      // blob: URL is same-origin, so WebKit respects the download hint
      // rather than navigating. User picks destination (Downloads by default).
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'download.bin';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Best-effort guess of where WebKit's save dialog dropped the file:
      //   1. The user's configured download dir (Settings → Downloads), if any
      //   2. Tauri's default_download_dir (~/Downloads on mac/linux)
      // If the user picked a different location in the Save dialog, the
      // "Show in Finder" reveal will 404 and fall back to opening the dir.
      let guessedPath = null;
      let guessedDir = null;
      try {
        const inv = window.__TAURI__?.core?.invoke;
        const userPref = (() => {
          try { return localStorage.getItem('elyhub.downloadDir') || ''; } catch { return ''; }
        })();
        if (userPref) {
          guessedDir = userPref;
        } else if (inv) {
          guessedDir = await inv('default_download_dir');
        }
        if (guessedDir) guessedPath = `${guessedDir}/${filename || 'download.bin'}`;
      } catch {}

      upsert(taskId, { status: 'saved', savedPath: guessedPath, savedDir: guessedDir });

      // Mark this listing as installed locally — the Launch CTA reads this.
      // Reuse the existing `elyhub:installed:<lid>` key (same one the My Library
      // Update-vs-Download check uses) so both views agree on install state.
      if (listingId) {
        try { localStorage.setItem(`elyhub:installed:${listingId}`, version || '1'); } catch {}
        try { window.dispatchEvent(new Event('elyhub:installed-changed')); } catch {}
      }

      // Native system notification (Tauri plugin or web Notification).
      try {
        window.ElyNotify?._nativeNotify?.(
          'Download ready',
          `${filename || 'File'} — saved`,
        );
      } catch {}

      // Auto-dismiss the panel card after 12s — gives the user time to read
      // the path and click Show in Finder / Open Folder.
      setTimeout(() => {
        const t = tasks.get(taskId);
        if (t?.blobUrl) { try { URL.revokeObjectURL(t.blobUrl); } catch {} }
        tasks.delete(taskId);
        notify();
      }, 12000);

      if (onDone) { try { onDone(null, blob); } catch {} }
    } catch (err) {
      console.warn('[downloads] failed', err);
      upsert(taskId, { status: 'error', error: err?.message || String(err) });
      setTimeout(() => { tasks.delete(taskId); notify(); }, 8000);
      if (onDone) { try { onDone(err); } catch {} }
    }

    return taskId;
  }

  window.ElyDownloads = {
    start,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    tasks: () => [...tasks.values()],
  };

  // Lightweight "is installed" registry — anything that downloads a listing
  // calls start({ listingId }), which writes localStorage[`elyhub.installed.{id}`]
  // and fires `elyhub:installed-changed`. UIs read this to flip Download → Launch.
  window.ElyInstalled = {
    is(listingId) {
      if (!listingId) return false;
      try { return !!localStorage.getItem(`elyhub:installed:${listingId}`); } catch { return false; }
    },
    version(listingId) {
      if (!listingId) return null;
      try { return localStorage.getItem(`elyhub:installed:${listingId}`) || null; } catch { return null; }
    },
    clear(listingId) {
      try { localStorage.removeItem(`elyhub:installed:${listingId}`); } catch {}
      try { window.dispatchEvent(new Event('elyhub:installed-changed')); } catch {}
    },
  };

  // React hook: subscribes to install-state changes for a single listing.
  window.useInstalled = function useInstalled(listingId) {
    const [v, setV] = React.useState(() => window.ElyInstalled.is(listingId));
    React.useEffect(() => {
      const sync = () => setV(window.ElyInstalled.is(listingId));
      sync();
      window.addEventListener('elyhub:installed-changed', sync);
      return () => window.removeEventListener('elyhub:installed-changed', sync);
    }, [listingId]);
    return v;
  };
})();

// ──── DownloadStack — floating panel, bottom-right ────
// Mirrors the ToastStack visual language but lives in a distinct corner so a
// download doesn't clobber a toast landing at the same moment. Cards show a
// progress bar, byte count, and a status line.
function DownloadStack() {
  const [list, setList] = React.useState([]);
  React.useEffect(() => {
    const sync = () => setList(window.ElyDownloads?.tasks?.() || []);
    sync();
    return window.ElyDownloads?.subscribe?.(sync);
  }, []);
  if (!list.length) return null;

  const fmtBytes = (n) => {
    if (!n) return '0 B';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {list.map((t) => {
        const pct = t.total > 0 ? Math.min(100, (t.loaded / t.total) * 100) : 0;
        const showBar = t.status === 'streaming' || (t.status === 'done' && pct < 100);
        const statusLabel =
          t.status === 'streaming' ? `${fmtBytes(t.loaded)}${t.total ? ` / ${fmtBytes(t.total)}` : ''}` :
          t.status === 'done'      ? 'Preparing save…' :
          t.status === 'saved'     ? 'Saved' :
          t.status === 'error'     ? `Failed: ${t.error || 'unknown'}` :
          '';
        const accent =
          t.status === 'error' ? '#ef6b7c' :
          t.status === 'saved' ? '#6ee7a0' :
          T.accentHi;
        return (
          <div key={t.id} style={{
            ...glass(1, {
              padding: '12px 16px 12px 18px', borderRadius: T.r.md,
              minWidth: 280, maxWidth: 360,
              animation: 'slideInR .25s cubic-bezier(.2,.9,.3,1.15)',
              pointerEvents: 'auto',
              position: 'relative', overflow: 'hidden',
            }),
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: accent, boxShadow: `0 0 12px ${accent}66`,
            }}/>
            <div style={{ ...TY.body, color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.title}
            </div>
            <div style={{ ...TY.small, color: T.text2, fontSize: 11, marginBottom: showBar ? 8 : 0 }}>
              {statusLabel}
              {t.status === 'streaming' && t.total > 0 && ` · ${pct.toFixed(0)}%`}
            </div>
            {showBar && (
              <div style={{
                height: 4, borderRadius: 2, overflow: 'hidden',
                background: 'rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: t.total > 0 ? `${pct}%` : '40%',
                  height: '100%',
                  background: `linear-gradient(90deg, ${T.accentHi}, ${T.accent})`,
                  boxShadow: `0 0 8px ${T.accent}88`,
                  transition: 'width .18s linear',
                  // When total is unknown, pulse instead of a fake position.
                  animation: t.total === 0 ? 'fadeIn 1.2s ease-in-out infinite alternate' : 'none',
                }}/>
              </div>
            )}
            {t.status === 'saved' && (t.savedPath || t.savedDir) && (
              <div style={{ marginTop: 10 }}>
                {t.savedPath && (
                  <div style={{
                    ...TY.micro, color: T.text3, fontSize: 10,
                    fontFamily: T.fontMono || 'ui-monospace, monospace',
                    marginBottom: 8, wordBreak: 'break-all',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '5px 7px', borderRadius: 4,
                  }}>
                    {t.savedPath}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      const inv = window.__TAURI__?.core?.invoke;
                      if (!inv) return;
                      // Try reveal first; if file isn't where we guessed (user
                      // picked a different folder), fall through to opening
                      // the Downloads folder.
                      const target = t.savedPath || t.savedDir;
                      inv('reveal_in_finder', { path: target }).catch(() => {
                        if (t.savedDir) inv('open_path', { path: t.savedDir }).catch(() => {});
                      });
                    }}
                    style={{
                      flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      background: 'rgba(255,255,255,0.08)',
                      color: T.text, border: `0.5px solid ${T.glassBorder}`,
                      borderRadius: T.r.sm, cursor: 'pointer',
                      fontFamily: T.fontSans,
                    }}
                  >Show in Finder</button>
                  <button
                    onClick={() => {
                      const inv = window.__TAURI__?.core?.invoke;
                      if (inv && t.savedDir) inv('open_path', { path: t.savedDir }).catch(() => {});
                    }}
                    style={{
                      flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      background: 'rgba(255,255,255,0.08)',
                      color: T.text, border: `0.5px solid ${T.glassBorder}`,
                      borderRadius: T.r.sm, cursor: 'pointer',
                      fontFamily: T.fontSans,
                    }}
                  >Open Folder</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
