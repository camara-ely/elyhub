// ElyHub local config — copy to config.js and fill in real values.
// config.js is gitignored so your token never lands in git.
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
};
