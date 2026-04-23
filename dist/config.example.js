// ElyHub local config — copy to config.js and fill in real values.
// config.js is gitignored so your token never lands in git.
//
// ⚠️ SECURITY: config.js is bundled into the shipped app at build time.
// Anyone who installs ElyHub can extract the Turso token from the binary.
// For production the tursoToken MUST be a read-only token with row-level
// rules that prevent spoofing, OR the frontend should talk to a backend
// proxy instead of Turso directly. See the "Backend real" roadmap item.
window.ELYHUB_CONFIG = {
  tursoUrl: 'libsql://YOUR-DB-NAME.turso.io',
  tursoToken: 'eyJ...',
  // Optional: Discord user ID to treat as "me" on the home/profile views.
  // Leave empty to show the top member as "me". Overridden by the signed-in
  // user's id once OAuth is working.
  meUserId: '',
  // Discord OAuth2 client ID — same as your bot's Application ID. Required for
  // "Sign in with Discord". Also register http://127.0.0.1:53134/callback as
  // a redirect URI in the Discord Developer Portal.
  discordClientId: '',
  // Poll interval in ms. 5000 = every 5 seconds.
  pollInterval: 5000,
  // ElyHub backend URL. Dev = http://localhost:8787. Prod = the deployed
  // Workers URL. Used by dist/api.jsx for auth + marketplace endpoints.
  apiUrl: 'https://elyhub-api-prod.YOUR-SUBDOMAIN.workers.dev',
};
