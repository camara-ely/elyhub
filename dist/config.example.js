// ElyHub local config — copy to config.js and fill in real values.
// config.js is gitignored so any local-only secrets never land in git.
//
// As of the security refactor, the client no longer talks to Turso directly.
// All reads/writes flow through the Worker (apiUrl below) which holds the
// server-side Turso token in its env (TURSO_URL + TURSO_TOKEN secrets via
// `wrangler secret put`). Nothing sensitive ships with the binary.
window.ELYHUB_CONFIG = {
  // Optional: Discord user ID to treat as "me" on the home/profile views.
  // Leave empty to show the top member as "me". Overridden by the signed-in
  // user's id once OAuth is working.
  meUserId: '',
  // Discord OAuth2 client ID — same as your bot's Application ID. Required for
  // "Sign in with Discord". Also register http://127.0.0.1:53134/callback as
  // a redirect URI in the Discord Developer Portal.
  discordClientId: '',
  // Poll interval in ms for /me/poll. 5000 = every 5 seconds.
  pollInterval: 5000,
  // ElyHub backend URL. Dev = http://localhost:8787. Prod = the deployed
  // Workers URL. Used by dist/api.jsx for auth + marketplace endpoints
  // and by dist/data.jsx for the consolidated /me/poll snapshot.
  apiUrl: 'https://elyhub-api-prod.YOUR-SUBDOMAIN.workers.dev',
};
