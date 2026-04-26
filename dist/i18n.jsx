// i18n — tiny translation layer.
//
// How it works:
//   1. Dictionary below maps keys → { en, pt } strings.
//   2. t(key) reads current lang from window.ElyI18N.lang, falls back to EN
//      if a key is missing in the current locale, and returns the key itself
//      as a last resort (so missing strings are visually obvious but don't
//      crash).
//   3. setLang(code) persists to localStorage and notifies subscribers.
//   4. App.jsx subscribes and forceUpdates on change — no per-component wiring.
//
// Scope: covers the chrome the user sees most (nav, homepage, profile,
// settings, modal titles, common buttons). Deep-nested labels stay English —
// adding them is safe and incremental; just add a key and use t('...').

(() => {
  const LS_KEY = 'elyhub.lang.v1';
  const SUPPORTED = ['en', 'pt'];

  const dict = {
    // ── Sidebar ──
    'nav.home':        { en: 'Home',         pt: 'Início' },
    'nav.leaderboard': { en: 'Leaderboard',  pt: 'Classificação' },
    'nav.store':       { en: 'Marketplace',  pt: 'Marketplace' },
    'nav.discover':    { en: 'For you',      pt: 'Para você' },
    'nav.claim':       { en: 'Claim',        pt: 'Resgatar' },
    'nav.zephyro':     { en: 'Hugin',        pt: 'Hugin' },
    'nav.saved':       { en: 'Saved',        pt: 'Salvos' },
    'nav.feed':        { en: 'Feed',         pt: 'Novidades' },
    'nav.messages':    { en: 'Messages',     pt: 'Mensagens' },
    'nav.trophies':    { en: 'Trophies',     pt: 'Troféus' },
    'nav.licenses':    { en: 'My Licenses',  pt: 'Minhas Licenças' },
    'nav.maker':       { en: 'Maker Studio', pt: 'Estúdio Maker' },
    'nav.profile':     { en: 'Profile',      pt: 'Perfil' },
    'shortcuts.title': { en: 'Keyboard shortcuts', pt: 'Atalhos de teclado' },
    'shortcuts.nav':   { en: 'Navigation',   pt: 'Navegação' },
    'shortcuts.search':{ en: 'Search',       pt: 'Busca' },
    'shortcuts.general':{en: 'General',      pt: 'Geral' },
    'shortcuts.hint':  { en: 'Press ? anywhere', pt: 'Pressione ? em qualquer lugar' },

    // ── Top bar ──
    'top.search':      { en: 'Search listings, creators, rewards…', pt: 'Pesquisar listagens, criadores, recompensas…' },
    'top.gift':        { en: 'Gift',         pt: 'Presentear' },
    'top.signin':      { en: 'Sign in with Discord', pt: 'Entrar com Discord' },
    'top.signingIn':   { en: 'Signing in…',  pt: 'Entrando…' },

    // ── Intro sequence (first-launch cinematic) ──
    'intro.tagline':   { en: 'A home for the community.', pt: 'Um lar para a comunidade.' },
    'intro.skip':      { en: 'CLICK TO CONTINUE', pt: 'CLIQUE PARA CONTINUAR' },

    // ── Login gate (pre-auth splash) ──
    'gate.blurb':      { en: 'Sign in with Discord to access your aura, leaderboard, and rewards.', pt: 'Entre com Discord para acessar sua aura, ranking e recompensas.' },
    'gate.cta':        { en: 'Continue with Discord', pt: 'Continuar com Discord' },
    'gate.hint':       { en: 'You must be a member of the ElyHub Discord server.', pt: 'Você precisa ser membro do servidor ElyHub no Discord.' },
    'top.inbox':       { en: 'Inbox',        pt: 'Caixa de entrada' },
    'top.unread':      { en: 'unread',       pt: 'não lidas' },

    // ── Profile menu ──
    'menu.myProfile':  { en: 'My profile',   pt: 'Meu perfil' },
    'menu.giftAura':   { en: 'Gift aura',    pt: 'Presentear aura' },
    'menu.settings':   { en: 'Settings',     pt: 'Configurações' },
    'menu.signOut':    { en: 'Sign out',     pt: 'Sair' },
    'menu.account':    { en: 'Account menu', pt: 'Menu da conta' },
    'menu.signOutConfirm': { en: 'Sign out of ElyHub?', pt: 'Sair do ElyHub?' },

    // ── Home ──
    'home.auraFeed':    { en: 'Aura feed',   pt: 'Feed de aura' },
    'home.live':        { en: 'Live',        pt: 'Ao vivo' },
    'home.dailyBonus':  { en: 'Daily bonus', pt: 'Bônus diário' },
    'home.dailyClaims': { en: 'Daily claims', pt: 'Resgates diários' },
    'home.claimsAvail': { en: 'available',   pt: 'disponível' },
    'home.tagBonus':    { en: 'ELY tag bonus', pt: 'Bônus tag ELY' },
    'home.serverBoost': { en: 'Server boost', pt: 'Boost do servidor' },
    'home.ranking':     { en: 'Ranking',     pt: 'Classificação' },
    'home.today':       { en: 'Today',       pt: 'Hoje' },
    'home.viewAll':     { en: 'View all',    pt: 'Ver tudo' },
    'home.yourTrophies': { en: 'Your trophies', pt: 'Seus troféus' },
    'home.all':         { en: 'All',         pt: 'Todos' },
    'home.noFeed':      { en: 'No aura activity yet', pt: 'Nenhuma atividade de aura ainda' },

    'conn.offline':     { en: 'Reconnecting…', pt: 'Reconectando…' },

    // ── Welcome (first-time sign-in) ──
    'welcome.kicker':   { en: 'Welcome to ElyHub', pt: 'Bem-vindo ao ElyHub' },
    'welcome.hi':       { en: "Hey {name}.",       pt: 'E aí, {name}.' },
    'welcome.blurb':    { en: "Here's the short version of what you can do.", pt: 'A versão curta do que dá pra fazer aqui.' },
    'welcome.level':    { en: 'Level',             pt: 'Nível' },
    'welcome.rank':     { en: 'Rank',              pt: 'Ranking' },
    'welcome.s1Title':  { en: 'Claim & gift aura', pt: 'Reivindique e presenteie aura' },
    'welcome.s1Body':   { en: 'Daily bonuses for boosters and tag-wearers. Send aura to friends anytime.', pt: 'Bônus diários para boosters e quem usa a tag. Presenteie aura quando quiser.' },
    'welcome.s2Title':  { en: 'Redeem rewards',    pt: 'Resgate recompensas' },
    'welcome.s2Body':   { en: 'Software, gift cards, 1:1s with founders. Bot DMs you on delivery.', pt: 'Software, cartões, 1:1 com founders. O bot te chama na DM na entrega.' },
    'welcome.s3Title':  { en: 'Climb the board',   pt: 'Suba no ranking' },
    'welcome.s3Body':   { en: 'Voice, gym posts, and deals all count. Unlock trophies as you go.', pt: 'Voz, posts de academia e deals contam tudo. Desbloqueie troféus no caminho.' },
    'welcome.notifTitle': { en: 'Get pinged in real time', pt: 'Receba pings em tempo real' },
    'welcome.notifBody':  { en: 'Level-ups, gifts and new drops — right on your desktop.', pt: 'Level-ups, presentes e novos drops — direto no desktop.' },
    'welcome.enable':   { en: 'Enable',            pt: 'Ativar' },
    'welcome.start':    { en: "Let's go",          pt: 'Bora' },
    'home.noFeedSub':   { en: 'Gifts, daily claims, and gym posts will appear here.', pt: 'Presentes, resgates diários e posts da academia aparecerão aqui.' },
    'home.week':        { en: 'Week',        pt: 'Semana' },
    'home.identity':    { en: 'Identity',    pt: 'Identidade' },
    'home.updatedWeekly': { en: 'Updated weekly', pt: 'Atualizado semanalmente' },
    'home.live2':       { en: 'Live · auto-syncs', pt: 'Ao vivo · sincroniza automaticamente' },
    'home.level':       { en: 'Level',       pt: 'Nível' },
    'home.to':          { en: 'to',          pt: 'para' },
    'home.streak':      { en: 'day streak',  pt: 'dias seguidos' },
    'home.rank':        { en: 'Rank',        pt: 'Posição' },
    'home.aura':        { en: 'aura',        pt: 'aura' },

    // Claim cards
    'claim.tagLabel':      { en: 'Wear the ELY tag', pt: 'Use a tag ELY' },
    'claim.boosterLabel':  { en: 'Boost the server', pt: 'Impulsione o servidor' },
    'claim.available':     { en: 'Available',        pt: 'Disponível' },
    'claim.claimed':       { en: 'Claimed',          pt: 'Resgatado' },
    'claim.claiming':      { en: 'Claiming…',        pt: 'Resgatando…' },
    'claim.tryAgain':      { en: 'Try again',        pt: 'Tentar novamente' },
    'claim.claim':         { en: 'Claim',            pt: 'Resgatar' },

    // ── Leaderboard ──
    'lb.ranking':      { en: 'Ranking',      pt: 'Classificação' },
    'lb.title':        { en: 'The climb',    pt: 'A escalada' },
    'lb.overall':      { en: 'Overall',      pt: 'Geral' },
    'lb.gym':          { en: 'Gym',          pt: 'Academia' },
    'lb.jumpToMe':     { en: 'Jump to you',  pt: 'Ir para ti' },
    'lb.empty':        { en: 'Nobody on the board yet', pt: 'Ninguém no ranking ainda' },
    'lb.emptySub':     { en: 'Earn aura in Discord to show up here.', pt: 'Ganhe aura no Discord para aparecer aqui.' },
    'lb.emptyGym':     { en: 'No gym posts this week', pt: 'Nenhum post de academia esta semana' },
    'lb.emptyGymSub':  { en: 'Post your workout in #gym to claim a spot.', pt: 'Publique seu treino em #gym para entrar.' },

    // ── Store ──
    'store.kicker':    { en: 'Store',        pt: 'Loja' },
    'store.title':     { en: 'Redeem your aura', pt: 'Resgate sua aura' },
    'store.balance':   { en: 'Balance',      pt: 'Saldo' },
    'store.redeem':    { en: 'Redeem',       pt: 'Resgatar' },
    'store.allCat':    { en: 'All',          pt: 'Tudo' },
    'store.left':      { en: 'left',         pt: 'restantes' },
    'store.available': { en: 'AVAILABLE',    pt: 'DISPONÍVEL' },
    'store.empty':     { en: 'Nothing in this category yet', pt: 'Nada nesta categoria ainda' },
    'store.emptySub':  { en: 'New drops show up here first. Check back soon.', pt: 'Novos drops aparecem aqui primeiro. Volte em breve.' },

    // ── Gift modal ──
    'gift.title':      { en: 'Gift aura',    pt: 'Presentear aura' },
    'gift.to':         { en: 'To',           pt: 'Para' },
    'gift.back':       { en: 'Back',         pt: 'Voltar' },
    'gift.amount':     { en: 'Amount',       pt: 'Quantidade' },
    'gift.note':       { en: 'Add a note (optional)', pt: 'Adicione uma nota (opcional)' },
    'gift.send':       { en: 'Send',         pt: 'Enviar' },
    'gift.sending':    { en: 'Sending…',     pt: 'Enviando…' },
    'gift.sent':       { en: 'Sent',         pt: 'Enviado' },
    'gift.done':       { en: 'Done',         pt: 'Pronto' },
    'gift.search':     { en: 'Search members…', pt: 'Buscar membros…' },
    'gift.noMatches':  { en: 'No matches',    pt: 'Sem resultados' },
    'gift.custom':     { en: 'CUSTOM',        pt: 'PERSONALIZADO' },
    'gift.balance':    { en: 'Balance',       pt: 'Saldo' },
    'gift.overLimit':  { en: 'Over your current aura',  pt: 'Acima da sua aura atual' },

    // ── Redeem modal ──
    'redeem.title':        { en: 'Redeem',           pt: 'Resgatar' },
    'redeem.price':        { en: 'Price',            pt: 'Preço' },
    'redeem.balanceAfter': { en: 'Balance after',    pt: 'Saldo depois' },
    'redeem.delivery':     { en: 'Delivery',         pt: 'Entrega' },
    'redeem.deliveryVal':  { en: 'Discord DM from the bot', pt: 'DM do bot no Discord' },
    'redeem.confirm':      { en: 'Confirm redemption', pt: 'Confirmar resgate' },
    'redeem.success':      { en: 'Redeemed',         pt: 'Resgatado' },
    'redeem.successSub':   { en: "The bot just DM'd you on Discord. An admin will follow up with delivery shortly.", pt: 'O bot te enviou uma DM no Discord. Um admin vai confirmar a entrega em breve.' },
    'redeem.errSignIn':    { en: 'Sign in to redeem.', pt: 'Entre para resgatar.' },
    'redeem.errInsuff':    { en: 'Not enough aura — your balance may have changed.', pt: 'Aura insuficiente — seu saldo pode ter mudado.' },
    'redeem.errInvalid':   { en: 'Invalid reward request.', pt: 'Solicitação de recompensa inválida.' },
    'redeem.errTimeout':   { en: "Bot didn't respond in time. Try again in a moment.", pt: 'O bot não respondeu a tempo. Tente de novo em um instante.' },

    // ── Inbox / notif drawer ──
    'inbox.title':        { en: 'Inbox',            pt: 'Caixa de entrada' },
    'inbox.signin':       { en: 'Sign in to see your inbox', pt: 'Entre para ver sua caixa de entrada' },
    'inbox.signinSub':    { en: 'Your notifications show up once you link Discord.', pt: 'Suas notificações aparecem quando você vincular o Discord.' },
    'inbox.caughtUp':     { en: "You're all caught up", pt: 'Tudo em dia' },
    'inbox.caughtUpSub':  { en: 'Gifts, daily claims, and redemptions show up here.', pt: 'Presentes, resgates diários e trocas aparecem aqui.' },
    'inbox.giftedYou':    { en: 'gifted you',       pt: 'te presenteou com' },
    'inbox.redeemedFor':  { en: 'Redeemed',         pt: 'Resgatou' },
    'inbox.forAmount':    { en: 'for',              pt: 'por' },
    'inbox.postJob':      { en: 'aura for posting a job', pt: 'aura por postar uma vaga' },
    'inbox.avail':        { en: 'aura for marking available', pt: 'aura por marcar disponível' },
    'inbox.gymPost':      { en: 'gym post',         pt: 'post de academia' },
    'inbox.dailyTag':     { en: 'daily ELY tag bonus', pt: 'bônus diário tag ELY' },
    'inbox.dailyBooster': { en: 'daily booster bonus', pt: 'bônus diário de booster' },

    // ── Level Up Takeover ──
    'levelup.kicker':     { en: 'LEVEL UP',         pt: 'SUBIU DE NÍVEL' },
    'levelup.reached':    { en: 'You reached L',    pt: 'Você chegou ao N' },
    'levelup.newPerks':   { en: 'New perks unlocked', pt: 'Novas vantagens desbloqueadas' },
    'levelup.continue':   { en: 'Continue',         pt: 'Continuar' },
    'levelup.hoodie':     { en: 'Unlocked · ElyHub Hoodie', pt: 'Desbloqueado · Moletom ElyHub' },
    'levelup.bonus':      { en: '+500 aura bonus',  pt: '+500 aura de bônus' },
    'levelup.roleColor':  { en: 'Custom role color', pt: 'Cor de cargo personalizada' },

    // ── Feed entry kinds ──
    'feed.claimedTag':     { en: 'claimed ELY tag',     pt: 'resgatou tag ELY' },
    'feed.claimedBooster': { en: 'claimed booster',     pt: 'resgatou booster' },
    'feed.gymPost':        { en: 'gym post',            pt: 'post de academia' },
    'feed.postedJob':      { en: 'posted a job',        pt: 'postou uma vaga' },
    'feed.markedAvailable':{ en: 'marked available',    pt: 'marcou disponível' },
    'feed.redeemed':       { en: 'redeemed',            pt: 'resgatou' },

    // ── Profile ──
    'profile.signIn':       { en: 'Sign in',                  pt: 'Entrar' },
    'profile.linkHint':     { en: 'Link your Discord to appear on the leaderboard', pt: 'Vincule seu Discord para aparecer na classificação' },
    'profile.auraFlow':     { en: 'Aura flow',                pt: 'Fluxo de aura' },
    'profile.gifted':       { en: 'Gifted',                   pt: 'Dados' },
    'profile.received':     { en: 'Received',                 pt: 'Recebidos' },
    'profile.lifetime':     { en: 'Lifetime · across all gifts', pt: 'Total · em todos os presentes' },
    'profile.activity':     { en: 'Activity',                 pt: 'Atividade' },
    'profile.gymPosts':     { en: 'Gym posts',                pt: 'Posts academia' },
    'profile.voice':        { en: 'Voice',                    pt: 'Voz' },
    'profile.bestStreak':   { en: 'Best gym streak',          pt: 'Melhor sequência' },
    'profile.days':         { en: 'days',                     pt: 'dias' },
    'profile.day':          { en: 'day',                      pt: 'dia' },
    'profile.rank':         { en: 'Rank',                     pt: 'Posição' },
    'profile.level':        { en: 'Level',                    pt: 'Nível' },
    'profile.aura':         { en: 'Aura',                     pt: 'Aura' },
    'profile.streak':       { en: 'Gym streak',               pt: 'Sequência' },
    'profile.trophyProgress': { en: 'Trophy progress',        pt: 'Progresso dos troféus' },
    'profile.redeems':        { en: 'Recent redeems',          pt: 'Resgates recentes' },
    'profile.item':           { en: 'item',                    pt: 'item' },
    'profile.items':          { en: 'items',                   pt: 'itens' },
    'profile.ago':            { en: 'ago',                     pt: 'atrás' },
    'profile.earned':       { en: 'earned',                   pt: 'conquistados' },

    // ── Trophies ──
    'trophies.title':      { en: 'Earned on the way up',      pt: 'Conquistados no caminho' },
    'trophies.trophies':   { en: 'Trophies',                  pt: 'Troféus' },
    'trophies.earnedCount':{ en: 'earned',                    pt: 'conquistados' },
    'trophies.earnedBadge':{ en: 'Earned',                    pt: 'Conquistado' },

    // ── Settings ──
    'settings.title':      { en: 'Settings',          pt: 'Configurações' },
    'settings.account':    { en: 'Account',           pt: 'Conta' },
    'settings.notifications': { en: 'Notifications',  pt: 'Notificações' },
    'settings.appearance': { en: 'Appearance',        pt: 'Aparência' },
    'settings.privacy':    { en: 'Privacy',           pt: 'Privacidade' },
    'settings.about':      { en: 'About',             pt: 'Sobre' },
    'settings.theme':      { en: 'Theme',             pt: 'Tema' },
    'settings.language':   { en: 'Language',          pt: 'Idioma' },
    'settings.reducedMotion': { en: 'Reduced motion', pt: 'Movimento reduzido' },
    'settings.reducedMotionSub': { en: 'Minimize animations and parallax', pt: 'Minimizar animações e paralaxe' },

    // Account section
    'settings.changeAvatar': { en: 'Change',          pt: 'Alterar' },
    'settings.displayName':  { en: 'Display name',    pt: 'Nome de exibição' },
    'settings.bio':          { en: 'Bio',             pt: 'Bio' },
    'settings.timezone':     { en: 'Timezone',        pt: 'Fuso horário' },
    'settings.disconnect':   { en: 'Disconnect Discord', pt: 'Desconectar Discord' },
    'settings.deleteAccount': { en: 'Delete account', pt: 'Excluir conta' },
    'settings.signIn':       { en: 'Sign in',         pt: 'Entrar' },
    'settings.signInSub':    { en: 'Sign in with Discord to edit your account.', pt: 'Entre com Discord para editar sua conta.' },
    'settings.saved':        { en: 'Saved',           pt: 'Salvo' },
    'settings.save':         { en: 'Save',            pt: 'Salvar' },
    'settings.discSignOutTitle': { en: 'Sign out of ElyHub?', pt: 'Sair do ElyHub?' },
    'settings.discSignOutSub':   { en: 'Your Discord link will be removed from this device. You can sign back in anytime.', pt: 'Seu vínculo com o Discord será removido deste dispositivo. Você pode entrar novamente a qualquer momento.' },
    'settings.discSignOutOk':    { en: 'Sign out',    pt: 'Sair' },
    'settings.cancel':           { en: 'Cancel',      pt: 'Cancelar' },

    // Notifications section
    'settings.notif.push':      { en: 'Push notifications', pt: 'Notificações push' },
    'settings.notif.pushSub':   { en: 'Receive alerts on this device', pt: 'Receber alertas neste dispositivo' },
    'settings.notif.sound':     { en: 'Sound effects',        pt: 'Efeitos sonoros' },
    'settings.notif.soundSub':  { en: 'Play a sound on aura events', pt: 'Tocar um som em eventos de aura' },
    'settings.notif.eventTypes': { en: 'Event types',         pt: 'Tipos de evento' },
    'settings.notif.gifts':     { en: 'Aura gifts',           pt: 'Presentes de aura' },
    'settings.notif.drops':     { en: 'New drops & rewards',  pt: 'Novidades e recompensas' },
    'settings.notif.lb':        { en: 'Leaderboard changes',  pt: 'Mudanças no ranking' },
    'settings.notif.lbSub':     { en: 'When you move up or down', pt: 'Quando você sobe ou desce' },

    // Privacy section
    'settings.priv.visibility': { en: 'Profile visibility',   pt: 'Visibilidade do perfil' },
    'settings.priv.public':     { en: 'Public',               pt: 'Público' },
    'settings.priv.publicSub':  { en: 'Anyone in ElyHub can see your profile', pt: 'Qualquer um no ElyHub pode ver seu perfil' },
    'settings.priv.members':    { en: 'Members only',         pt: 'Somente membros' },
    'settings.priv.membersSub': { en: 'Only verified members', pt: 'Somente membros verificados' },
    'settings.priv.private':    { en: 'Private',              pt: 'Privado' },
    'settings.priv.privateSub': { en: 'Only you',             pt: 'Somente você' },
    'settings.priv.showLb':     { en: 'Show on leaderboard',  pt: 'Mostrar no ranking' },
    'settings.priv.allowGifts': { en: 'Allow aura gifts from anyone', pt: 'Aceitar presentes de qualquer um' },

    // About section rows
    'settings.about.terms':    { en: 'Terms of Service',  pt: 'Termos de Serviço' },
    'settings.about.privacy':  { en: 'Privacy Policy',    pt: 'Política de Privacidade' },
    'settings.about.support':  { en: 'Support',           pt: 'Suporte' },
    'settings.about.credits':  { en: 'Credits',           pt: 'Créditos' },
  };

  function detectInitial() {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch {}
    // Best-effort: match browser to 'pt' if Portuguese, else 'en'.
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('pt') ? 'pt' : 'en';
  }

  const subs = new Set();
  let currentLang = detectInitial();

  function t(key, fallback) {
    const entry = dict[key];
    if (!entry) return fallback != null ? fallback : key;
    return entry[currentLang] || entry.en || fallback || key;
  }

  function setLang(code) {
    if (!SUPPORTED.includes(code) || code === currentLang) return;
    currentLang = code;
    try { localStorage.setItem(LS_KEY, code); } catch {}
    for (const fn of subs) {
      try { fn(code); } catch (e) { console.error('[i18n] subscriber error', e); }
    }
  }

  function getLang() { return currentLang; }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  window.ElyI18N = { t, setLang, getLang, subscribe, SUPPORTED };
  // Shorthand that doesn't require destructuring on every use.
  window.t = t;
})();
