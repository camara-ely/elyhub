// Notification pipeline — one entry point for everything that should "nudge"
// the user: sound, native desktop notification, and in-app toast.
//
// Prefs persist in localStorage so they survive app restarts. Each dispatch()
// call checks the per-kind filter (gifts / drops / ranking) before anything
// fires, so the user's toggles actually matter.
//
// The audio element is created lazily on first play — Tauri's WKWebView still
// respects autoplay gates, so trying before user interaction just no-ops. Our
// ToastStack component uses subscribeToasts() to render the on-screen cards.

(() => {
  const STORAGE_KEY = 'ely:notif-prefs';
  const defaults = {
    sound: true,
    push: true,
    gifts: true,
    drops: true,
    ranking: false, // opt-in — can get noisy on a busy leaderboard
    messages: true,  // DM notifications — on by default
  };

  let prefs = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    prefs = { ...defaults, ...saved };
  } catch {
    // corrupt JSON — stick with defaults
  }

  const prefSubs = new Set();
  const toastSubs = new Set();
  const eventSubs = new Set();
  let audio = null;

  // Synthetic event log — for notification kinds that don't live in the bot's
  // aura_log (level-ups, achievement-style things). Persisted in localStorage
  // so they survive reloads; capped at 200 entries. Each row:
  //   { id, kind, title, at, data? }
  // The inbox merges these with live aura_log rows when rendering.
  const EVENT_LOG_KEY = 'ely:notif-events';
  const EVENT_CAP = 200;
  function loadEvents() {
    try {
      const raw = localStorage.getItem(EVENT_LOG_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveEvents(arr) {
    try { localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(arr.slice(-EVENT_CAP))); } catch {}
  }
  function notifyEventSubs() {
    for (const fn of eventSubs) { try { fn(); } catch (e) { console.error(e); } }
  }

  function getAudio() {
    if (!audio) {
      audio = new Audio('assets/notify.mp3');
      audio.volume = 0.55;
      audio.preload = 'auto';
    }
    return audio;
  }

  function notifyPrefSubs() {
    for (const fn of prefSubs) { try { fn(); } catch (e) { console.error(e); } }
  }

  function emitToast(toast) {
    for (const fn of toastSubs) { try { fn(toast); } catch (e) { console.error(e); } }
  }

  const api = {
    get prefs() { return { ...prefs }; },

    setPref(key, value) {
      if (!(key in defaults)) return;
      prefs[key] = !!value;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
      notifyPrefSubs();
      // When user flips on "push", proactively request permission so the next
      // event actually surfaces — no silent failure the first time.
      if (key === 'push' && value) api.requestPermission();
    },

    subscribe(fn) {
      prefSubs.add(fn);
      return () => prefSubs.delete(fn);
    },

    subscribeToasts(fn) {
      toastSubs.add(fn);
      return () => toastSubs.delete(fn);
    },

    // Public toast() — fire-and-forget in-app toast for ad-hoc UI feedback
    // (copy-to-clipboard, save success, form errors). Unlike dispatch(), this
    // bypasses the prefs gate because the user initiated the action and
    // expects immediate confirmation. Accepts either { text } or { title, body }.
    toast(input) {
      if (!input) return;
      const kind = input.kind || 'info';
      const title = input.title || input.text || '';
      const body = input.body || (input.title ? input.text || '' : '');
      emitToast({ id: Date.now() + Math.random(), kind, title, body, at: Date.now() });
    },

    // Synthetic event log API — for events that don't originate from aura_log.
    // The inbox calls getEvents() and subscribeEvents() to keep the drawer in
    // sync. pushEvent dedups by id so retriggering is idempotent.
    getEvents() { return loadEvents(); },
    subscribeEvents(fn) {
      eventSubs.add(fn);
      return () => eventSubs.delete(fn);
    },
    pushEvent(ev) {
      if (!ev || !ev.id) return;
      const arr = loadEvents();
      if (arr.some((e) => e.id === ev.id)) return;
      arr.push({ at: Date.now(), ...ev });
      saveEvents(arr);
      notifyEventSubs();
    },
    clearEvents() {
      saveEvents([]);
      notifyEventSubs();
    },

    async requestPermission() {
      // Prefer the Tauri native plugin — the web Notification API inside
      // WKWebView doesn't actually surface on macOS Notification Center.
      const invoke = window.__TAURI__?.core?.invoke;
      if (invoke) {
        try {
          const granted = await invoke('plugin:notification|is_permission_granted');
          if (granted) return 'granted';
          const state = await invoke('plugin:notification|request_permission');
          return state; // 'granted' | 'denied' | 'default'
        } catch (e) {
          console.warn('[notify] tauri permission failed', e);
        }
      }
      if (typeof Notification === 'undefined') return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      try { return await Notification.requestPermission(); }
      catch { return 'error'; }
    },

    async _nativeNotify(title, body) {
      const invoke = window.__TAURI__?.core?.invoke;
      if (invoke) {
        try {
          const granted = await invoke('plugin:notification|is_permission_granted');
          if (!granted) {
            const state = await invoke('plugin:notification|request_permission');
            if (state !== 'granted') return false;
          }
          await invoke('plugin:notification|notify', {
            options: { title, body },
          });
          return true;
        } catch (e) {
          console.warn('[notify] tauri notify failed, falling back', e);
        }
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body,
            silent: true,
            icon: window.SERVER?.iconUrl || undefined,
          });
          setTimeout(() => { try { n.close(); } catch {} }, 5000);
          return true;
        } catch {}
      }
      return false;
    },

    // kind: 'gift' | 'drop' | 'rank'
    dispatch({ kind, title, body }) {
      const kindToPref = { gift: 'gifts', drop: 'drops', rank: 'ranking', message: 'messages' };
      const prefKey = kindToPref[kind];
      if (prefKey && !prefs[prefKey]) return;

      // 1. Toast always fires for enabled kinds — it's the in-app channel.
      emitToast({ id: Date.now() + Math.random(), kind, title, body, at: Date.now() });

      // 2. Sound effect, independent toggle.
      if (prefs.sound) {
        try {
          const a = getAudio();
          a.currentTime = 0;
          a.play().catch(() => {}); // autoplay-blocked is fine
        } catch {}
      }

      // 3. Native desktop notification — Tauri plugin on desktop, web API otherwise.
      if (prefs.push) {
        api._nativeNotify(title, body).catch(() => {});
      }
    },
  };

  window.ElyNotify = api;
})();
