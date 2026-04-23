// ElyAPI — thin wrapper around the ElyHub backend (Cloudflare Workers).
//
// Purpose:
//   - Centralize fetches to the backend so every caller gets retries, the
//     correct base URL, and auto-attached Authorization header.
//   - Keep a session JWT (separate from the Discord access_token) in
//     localStorage. The backend mints this when we exchange the Discord
//     token via POST /auth/discord/exchange.
//
// Why a separate session token and not the Discord token?
//   - Discord tokens live 7d and expose identify scope only. Our backend
//     needs to sign its OWN session so it can attach user_id to every
//     authed call without re-verifying with Discord each time. This is
//     also what lets the plugin hold a pairing-minted JWT that's NOT a
//     Discord token at all.
//
// Usage:
//   await ElyAPI.get('/listings')          → { items: [...] }
//   await ElyAPI.post('/me/wishlist/abc')  → { ok: true }
//   ElyAPI.isSignedIn()                    → boolean (have a valid JWT)
//   ElyAPI.signOut()                       → clears the JWT
//
// Errors throw with a .status prop so callers can branch on 401/403.

(() => {
  const LS_KEY = 'elyhub.api.session.v1';

  function getBase() {
    const url = window.ELYHUB_CONFIG?.apiUrl;
    if (!url) {
      throw new Error('ELYHUB_CONFIG.apiUrl not set — edit dist/config.js');
    }
    return url.replace(/\/$/, '');
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // Backend tokens have a 7d expiry; we refresh on the 6d mark during
      // a normal sign-in cycle. If expired, treat as signed-out.
      if (s.expires_at && s.expires_at * 1000 < Date.now()) {
        localStorage.removeItem(LS_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }

  function writeSession(s) {
    if (!s || !s.token) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  }

  let session = readSession();

  // Retry policy mirrors dist/data.jsx — transient (5xx, 429, network) get
  // exponential backoff; 4xx fail fast (the body of a 401 won't improve on
  // retry). Three attempts max so we don't tie up the UI on a long outage.
  async function withRetry(fn, { attempts = 3 } = {}) {
    let last;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        last = err;
        const s = err?.status;
        const transient = !s || s >= 500 || s === 429;
        if (!transient || i === attempts - 1) throw err;
        const wait = 300 * Math.pow(2, i) * (0.75 + Math.random() * 0.5);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw last;
  }

  async function request(method, path, body) {
    const base = getBase();
    const headers = { 'Content-Type': 'application/json' };
    if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

    return withRetry(async () => {
      let res;
      try {
        res = await fetch(`${base}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (e) {
        // Network error — throw a synthetic 0 so retry kicks in.
        const err = new Error(`network: ${e.message || e}`);
        err.status = 0;
        throw err;
      }

      // 401 = JWT rejected. Clear the local session so the UI re-prompts
      // for sign-in instead of looping on a dead token.
      if (res.status === 401) {
        session = null;
        writeSession(null);
      }

      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }

      if (!res.ok) {
        const err = new Error(data?.error || `http ${res.status}`);
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    });
  }

  // ─── Public API ────────────────────────────────────────────────────────

  const ElyAPI = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),

    // Called by dist/auth.jsx after a successful Discord OAuth. Exchanges
    // the Discord access_token for a backend JWT + stores it. Returns the
    // backend user record ({ id, username, global_name, avatar_url, aura,
    // level }) so callers can use it directly.
    async exchangeDiscord(accessToken) {
      const base = getBase();
      const res = await fetch(`${base}/auth/discord/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (!res.ok) {
        const err = new Error(`exchange failed: http ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      session = { token: data.token, expires_at: data.expires_at, user: data.user };
      writeSession(session);
      return data.user;
    },

    isSignedIn: () => !!session?.token,
    getToken: () => session?.token || null,
    getUser: () => session?.user || null,
    signOut: () => { session = null; writeSession(null); },
  };

  window.ElyAPI = ElyAPI;
})();
