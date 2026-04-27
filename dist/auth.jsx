// Discord OAuth — front-end side.
//
// Flow:
//   1. User clicks "Sign in with Discord"
//   2. We call invoke('discord_oauth_listen') on the Rust side — spins up
//      a tiny HTTP listener on 127.0.0.1:53134 and awaits the callback.
//   3. We open Discord's authorize URL in the system browser.
//   4. User authorizes → Discord redirects to http://127.0.0.1:53134/callback
//      → our Rust listener captures the access_token.
//   5. Promise from step 2 resolves with the token.
//   6. We call Discord's /users/@me to get { id, username, global_name, avatar }.
//   7. Save { token, user, expiresAt } to localStorage.
//   8. Notify subscribers so the app re-renders with "me" = this user.

(() => {
  const LS_KEY = 'elyhub.auth.v1';
  const subs = new Set();

  function readStored() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.expiresAt && data.expiresAt < Date.now()) {
        localStorage.removeItem(LS_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  let current = readStored();

  function notify() {
    for (const fn of subs) {
      try { fn(); } catch (e) { console.error('[auth] subscriber error', e); }
    }
  }

  function avatarUrl(userId, avatarHash, size = 128) {
    if (!avatarHash) {
      // Discord default avatar — derived from (id >> 22) % 6 for the new system
      const idBig = BigInt(userId);
      const idx = Number((idBig >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  }

  async function signIn() {
    const cfg = window.ELYHUB_CONFIG;
    if (!cfg?.discordClientId) {
      alert('Discord client ID not configured. Edit dist/config.js and add discordClientId.');
      return null;
    }
    if (!window.__TAURI__?.core?.invoke) {
      alert('This feature requires the desktop app — not available in a regular browser.');
      return null;
    }
    const { invoke } = window.__TAURI__.core;

    const oauthState = Math.random().toString(36).slice(2);

    // Phase 1 — bind a free port (scans 53134-53200, avoids WSAEADDRINUSE on
    // Windows when a previous attempt left the port occupied).
    let port;
    try {
      port = await invoke('discord_oauth_start');
    } catch (e) {
      console.error('[auth] failed to start OAuth listener:', e);
      alert('Sign in failed: ' + e);
      return null;
    }

    const redirect = `http://127.0.0.1:${port}/callback`;
    const authUrl =
      'https://discord.com/api/oauth2/authorize' +
      `?client_id=${encodeURIComponent(cfg.discordClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}` +
      '&response_type=token' +
      '&scope=identify' +
      `&state=${oauthState}`;

    // Open browser AFTER the listener is ready.
    // NOTE: no window.open fallback — on Windows that caused a second Discord
    // instance to open (browser + app) leading to a confused double-auth flow.
    try {
      await invoke('open_url', { url: authUrl });
    } catch (e) {
      console.error('[auth] failed to open browser:', e);
      alert('Could not open the browser. Please open this URL manually:\n\n' + authUrl);
    }

    // Phase 2 — wait for the callback token (up to 5 min).
    let accessToken;
    try {
      accessToken = await invoke('discord_oauth_await');
    } catch (e) {
      console.error('[auth] auth flow failed:', e);
      alert('Sign in failed: ' + e);
      return null;
    }

    // Fetch user profile
    let profile;
    try {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Discord API returned ${res.status}`);
      profile = await res.json();
    } catch (e) {
      console.error('[auth] failed to fetch profile', e);
      alert('Signed in but failed to fetch your profile. Please try again.');
      return null;
    }

    const user = {
      id: profile.id,
      username: profile.username,
      globalName: profile.global_name || profile.username,
      avatarUrl: avatarUrl(profile.id, profile.avatar),
    };

    // Implicit grant tokens last 7 days — refresh forced after that.
    const record = {
      token: accessToken,
      user,
      expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000, // 6d, 1d safety buffer
    };
    localStorage.setItem(LS_KEY, JSON.stringify(record));
    current = record;

    // Exchange the Discord token for an ElyHub backend JWT. Non-fatal —
    // if the backend is down we still let the user in with Discord-only
    // identity; marketplace writes will just 401 until the backend is
    // reachable and the next sign-in gets a fresh JWT.
    if (window.ElyAPI?.exchangeDiscord) {
      try {
        await window.ElyAPI.exchangeDiscord(accessToken);
      } catch (e) {
        console.warn('[auth] backend exchange failed — continuing Discord-only:', e.message);
      }
    }

    notify();
    return user;
  }

  function signOut() {
    localStorage.removeItem(LS_KEY);
    current = null;
    // Also drop the backend JWT so the next request doesn't attach a stale
    // token — the two are paired; you can't "partially" sign out.
    try { window.ElyAPI?.signOut?.(); } catch {}
    notify();
  }

  function getCurrentUser() {
    return current?.user || null;
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  // Re-verify the stored token against Discord on boot. Catches revoked or
  // invalidated tokens that would otherwise leave the UI looking signed-in.
  // Also refreshes the cached username / avatar if they changed on Discord.
  // Non-blocking — if the network is down the user stays signed in on the
  // cached record; a real 401 triggers a clean signOut.
  async function verifyCurrentToken() {
    if (!current?.token) return;
    try {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (res.status === 401 || res.status === 403) {
        console.warn('[auth] stored token rejected — signing out');
        signOut();
        return;
      }
      if (!res.ok) return; // transient; leave cached record alone
      const profile = await res.json();
      const freshUser = {
        id: profile.id,
        username: profile.username,
        globalName: profile.global_name || profile.username,
        avatarUrl: avatarUrl(profile.id, profile.avatar),
      };
      // Only notify if something actually changed — avoids an unnecessary render.
      const same =
        current.user.id === freshUser.id &&
        current.user.username === freshUser.username &&
        current.user.globalName === freshUser.globalName &&
        current.user.avatarUrl === freshUser.avatarUrl;
      if (!same) {
        current = { ...current, user: freshUser };
        try { localStorage.setItem(LS_KEY, JSON.stringify(current)); } catch {}
        notify();
      }
      // Always push the latest profile to the backend so the users table
      // stays current — name/avatar changes propagate to everyone's poll
      // within one cycle without requiring a full sign-out/sign-in.
      if (window.ElyAPI?.exchangeDiscord && current?.token) {
        window.ElyAPI.exchangeDiscord(current.token).catch(() => {});
      }
    } catch (err) {
      // Network error — leave cached record, try again next boot.
      console.warn('[auth] verify failed (keeping cached):', err.message);
    }
  }

  window.ElyAuth = { signIn, signOut, getCurrentUser, subscribe };

  // Fire once after load + repeat every hour so profile changes on Discord
  // (name, avatar) propagate automatically without requiring sign-out/sign-in.
  if (current) {
    setTimeout(verifyCurrentToken, 1000);
    setInterval(verifyCurrentToken, 60 * 60 * 1000); // every 1 h
  }
})();
