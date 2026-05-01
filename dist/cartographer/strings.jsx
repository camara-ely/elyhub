// ElyHub — Cartographer themes shared i18n dict.
//
// Both Cartographer (vintage) and Cartographer Modern share the same set of
// keys here so a single `tc(key)` helper can serve both themes. Keeps the
// theme-specific flavor text (PT-BR vintage / EN modern) toggleable via
// the app's main language switch.
//
// Reads current lang from window.ElyI18N.getLang() — same source the host
// app's t() uses, so theme strings track the language switch automatically.
//
// Structure:
//   - Each key has `vintage: { en, pt }` and/or `modern: { en, pt }`.
//   - Some keys are shared between themes (just `{ en, pt }`) when the
//     wording is identical.
//   - tc('key') auto-picks vintage vs modern based on T.cartographerModern.
//
// Adding new strings: append below; don't sprinkle inline literals in views.

(() => {
  const DICT = {
    // ═══════════════ Sidebar nav labels ═══════════════
    'nav.home': {
      vintage: { en: 'Deck',         pt: 'Bordo' },
      modern:  { en: 'Home',         pt: 'Início' },
    },
    'nav.leaderboard': {
      vintage: { en: 'Logbook',      pt: 'Tábua' },
      modern:  { en: 'Climb',        pt: 'Subida' },
    },
    'nav.store': {
      vintage: { en: 'Market',       pt: 'Mercado' },
      modern:  { en: 'Market',       pt: 'Mercado' },
    },
    'nav.discover': {
      vintage: { en: 'Explore',      pt: 'Descobrir' },
      modern:  { en: 'Discover',     pt: 'Descobrir' },
    },
    'nav.claim': {
      vintage: { en: 'Collect',      pt: 'Recolher' },
      modern:  { en: 'Claim',        pt: 'Coletar' },
    },
    'nav.zephyro': {
      vintage: { en: 'Hugin',        pt: 'Hugin' },
      modern:  { en: 'Hugin',        pt: 'Hugin' },
    },
    'nav.saved': {
      vintage: { en: 'Bookmarks',    pt: 'Salvos' },
      modern:  { en: 'Saved',        pt: 'Salvos' },
    },
    'nav.feed': {
      vintage: { en: 'Bulletin',     pt: 'Boletim' },
      modern:  { en: 'Feed',         pt: 'Feed' },
    },
    'nav.members': {
      vintage: { en: 'Crew',         pt: 'Tripulação' },
      modern:  { en: 'Surveyors',    pt: 'Membros' },
    },
    'nav.messages': {
      vintage: { en: 'Letters',      pt: 'Cartas' },
      modern:  { en: 'Signals',      pt: 'Sinais' },
    },
    'nav.trophies': {
      vintage: { en: 'Honors',       pt: 'Honrarias' },
      modern:  { en: 'Awards',       pt: 'Prêmios' },
    },
    'nav.licenses': {
      vintage: { en: 'Seals',        pt: 'Selos' },
      modern:  { en: 'Keys',         pt: 'Chaves' },
    },
    'nav.maker': {
      vintage: { en: 'Shipyard',     pt: 'Estaleiro' },
      modern:  { en: 'Studio',       pt: 'Estúdio' },
    },
    'nav.profile': {
      vintage: { en: 'Profile',      pt: 'Perfil' },
      modern:  { en: 'Profile',      pt: 'Perfil' },
    },
    'nav.admin.owner': {
      vintage: { en: 'Admiral',      pt: 'Almirante' },
      modern:  { en: 'Admin',        pt: 'Admin' },
    },
    'nav.admin.mod': {
      vintage: { en: 'Captain',      pt: 'Capitão' },
      modern:  { en: 'Mod',          pt: 'Mod' },
    },
    'nav.settings': {
      en: 'Settings', pt: 'Ajustes',
    },
    'nav.brand.balance': {
      vintage: { en: 'Vault',        pt: 'Cofre' },
      modern:  { en: 'Balance',      pt: 'Saldo' },
    },

    // ═══════════════ Common chrome ═══════════════
    'common.aura':      { en: 'aura',     pt: 'aura' },
    'common.level':     { vintage: { en: 'Rank',  pt: 'Posto' },  modern: { en: 'Level',     pt: 'Nível' } },
    'common.search':    { en: 'Search',   pt: 'Buscar' },
    'common.viewAll':   { vintage: { en: 'VIEW ALL', pt: 'VER TUDO' }, modern: { en: 'VIEW ALL', pt: 'VER TUDO' } },
    'common.back':      { vintage: { en: '← Back to market', pt: '← Voltar ao mercado' }, modern: { en: '← BACK TO MARKET', pt: '← VOLTAR AO MERCADO' } },
    'common.cost':      { vintage: { en: 'Price',  pt: 'Preço' },  modern: { en: 'COST',  pt: 'CUSTO' } },
    'common.price':     { vintage: { en: 'Price',  pt: 'Preço' },  modern: { en: 'PRICE', pt: 'PREÇO' } },
    'common.locked':    { vintage: { en: 'Locked', pt: 'Bloqueado' }, modern: { en: 'Locked', pt: 'Bloqueado' } },
    'common.lockedShort':{ vintage: { en: 'Lock',   pt: 'Bloq' },    modern: { en: 'LOCKED', pt: 'BLOQ' } },
    'common.available': { vintage: { en: 'Available', pt: 'Disponível' }, modern: { en: 'AVAILABLE', pt: 'DISPONÍVEL' } },
    'common.availableShort': { vintage: { en: 'Avail',pt: 'Disp' }, modern: { en: 'AVAIL', pt: 'DISP' } },
    'common.send':      { vintage: { en: 'Send',  pt: 'Enviar' },   modern: { en: 'Send',     pt: 'Enviar' } },
    'common.cancel':    { en: 'Cancel', pt: 'Cancelar' },
    'common.close':     { en: 'Close',  pt: 'Fechar' },
    'common.done':      { en: 'Done',   pt: 'Concluir' },
    'common.cmdK':      { en: '⌘K',     pt: '⌘K' },

    // ═══════════════ Home — hero ═══════════════
    'home.welcome': {
      vintage: { en: 'Welcome,', pt: 'Bem-vindo,' },
      modern:  { en: 'Welcome,', pt: 'Bem-vindo,' },
    },
    'home.aura.label': {
      vintage: { en: 'Aura in vault',      pt: 'Aura no cofre' },
      modern:  { en: 'Aura accumulated',   pt: 'Aura acumulada' },
    },
    'home.rank.label': {
      vintage: { en: 'Rank',               pt: 'Posto' },
      modern:  { en: 'Level',              pt: 'Nível' },
    },
    'home.ascent': {
      vintage: { en: 'Ascent to L{lvl}',   pt: 'Ascensão a L{lvl}' },
      modern:  { en: 'Ascent to L{lvl}',   pt: 'Ascensão a L{lvl}' },
    },
    'home.toSummit': {
      vintage: { en: '{n} to summit',      pt: '{n} ao cume' },
      modern:  { en: '{n} to summit',      pt: '{n} ao cume' },
    },
    'home.elev.today': {
      vintage: { en: 'elev. {n}m today',   pt: 'elevação {n}m hoje' },
      modern:  { en: 'elev. {n}m today',   pt: 'elev. {n}m hoje' },
    },
    'home.wind.line': {
      // Vintage flavor — wind direction. Modern uses the CoordBadge instead.
      vintage: {
        en: 'Wind from the {dir} · {bearing}° · favorable tide until dusk',
        pt: 'O vento sopra de {dir} · {bearing}° · maré favorável até o crepúsculo',
      },
    },
    'home.wind.NE':  { en: 'northeast', pt: 'nordeste' },
    'home.wind.SE':  { en: 'southeast', pt: 'sudeste' },
    'home.wind.SW':  { en: 'southwest', pt: 'sudoeste' },
    'home.wind.NW':  { en: 'northwest', pt: 'noroeste' },

    // ═══════════════ Home — daily claims ═══════════════
    'claim.section.title': {
      vintage: { en: 'Daily collections', pt: 'Recolhimentos diários' },
      modern:  { en: 'Daily claims',      pt: 'Bônus diários' },
    },
    'claim.available': { vintage: { en: '{n} available', pt: '{n} disponíveis' }, modern: { en: '{n} AVAILABLE', pt: '{n} DISPONÍVEIS' } },
    'claim.label.tag': {
      vintage: { en: 'ELY seal',          pt: 'Selo ELY' },
      modern:  { en: 'ELY tag bonus',     pt: 'Bônus ELY tag' },
    },
    'claim.label.booster': {
      vintage: { en: 'Bridge bonus',      pt: 'Bônus de Bordo' },
      modern:  { en: 'Server boost',      pt: 'Boost do servidor' },
    },
    'claim.hint.tag': {
      vintage: { en: 'Available every 24h at port', pt: 'Recolhe-se a cada 24h ao porto' },
      modern:  { en: 'Resets daily 00:00 UTC',      pt: 'Reseta diário às 00:00 UTC' },
    },
    'claim.hint.booster': {
      vintage: { en: 'A nod to server supporters',  pt: 'Doação aos servidores apoiadores' },
      modern:  { en: 'Granted to active boosters',  pt: 'Concedido a boosters ativos' },
    },
    'claim.kind.label': {
      vintage: { en: 'Collection', pt: 'Recolhimento' },
      modern:  { en: 'CLAIM',      pt: 'BÔNUS' },
    },
    'claim.cta':        { vintage: { en: 'Collect',     pt: 'Recolher' },     modern: { en: 'Claim',     pt: 'Coletar' } },
    'claim.cta.loading':{ vintage: { en: 'Collecting…', pt: 'Recolhendo…' },  modern: { en: 'Claiming…', pt: 'Coletando…' } },
    'claim.status.claimed': { vintage: { en: 'Collected', pt: 'Recolhido' },   modern: { en: 'CLAIMED',   pt: 'COLETADO' } },

    // ═══════════════ Top 3 podium ═══════════════
    'podium.title': {
      vintage: { en: 'Logbook of Navigators', pt: 'Tábua dos Navegantes' },
      modern:  { en: 'Top surveyors',         pt: 'Top membros' },
    },
    'podium.bearing': {
      vintage: { en: 'bearing {n}°', pt: 'rumo {n}°' },
      modern:  { en: '{n}°',         pt: '{n}°' },
    },
    'podium.position': {
      vintage: { en: 'Position', pt: 'Posição' },
      modern:  { en: 'POSITION', pt: 'POSIÇÃO' },
    },

    // ═══════════════ Featured drop + Aura feed ═══════════════
    'featured.title': {
      vintage: { en: 'Featured tome',   pt: 'Tomo em destaque' },
      modern:  { en: 'Featured drop',   pt: 'Em destaque' },
    },
    'feed.title': {
      vintage: { en: 'Live journal',    pt: 'Diário ao vivo' },
      modern:  { en: 'Aura feed',       pt: 'Feed de aura' },
    },
    'feed.live':       { vintage: { en: 'LIVE', pt: 'AO VIVO' }, modern: { en: 'LIVE', pt: 'AO VIVO' } },
    'feed.empty': {
      vintage: { en: 'Journal is silent.', pt: 'Diário em silêncio.' },
      modern:  { en: 'No telemetry yet.',  pt: 'Sem dados ainda.' },
    },

    // ═══════════════ Page H1s ═══════════════
    'page.lb.eyebrow':   { vintage: { en: 'Logbook of Navigators', pt: 'Tábua dos Navegantes' }, modern: { en: 'RANKING · TELEMETRY', pt: 'RANKING · TELEMETRIA' } },
    'page.lb.title':     { vintage: { en: 'The climb', pt: 'A subida' }, modern: { en: 'The climb', pt: 'A subida' } },
    'page.trophies.eyebrow': { vintage: { en: 'Hall of Honors', pt: 'Galeria de Honrarias' }, modern: { en: 'ACHIEVEMENTS', pt: 'CONQUISTAS' } },
    'page.trophies.title':   { vintage: { en: 'Trophies', pt: 'Troféus' }, modern: { en: 'Awards', pt: 'Prêmios' } },
    'page.members.eyebrow':  { vintage: { en: 'Logbook · Volume IV', pt: 'Diário de Bordo · Volume IV' }, modern: { en: 'SURVEY · DIRECTORY', pt: 'PESQUISA · DIRETÓRIO' } },
    'page.members.title':    { vintage: { en: 'Crew',   pt: 'Tripulação' }, modern: { en: 'Surveyors', pt: 'Membros' } },
    'page.profile.eyebrow':  { vintage: { en: 'Master Roll', pt: 'Carteira de Bordo' }, modern: { en: 'SURVEYOR · PROFILE', pt: 'PERFIL · MEMBRO' } },
    'page.store.eyebrow':    { vintage: { en: 'Market Square', pt: 'Praça do Mercado' }, modern: { en: 'MARKETPLACE · CATALOG', pt: 'MARKETPLACE · CATÁLOGO' } },
    'page.store.title':      { vintage: { en: 'Redeem your aura', pt: 'Resgate sua aura' }, modern: { en: 'Redeem aura', pt: 'Resgatar aura' } },
    'page.discover.eyebrow': { vintage: { en: 'Uncharted Routes', pt: 'Rotas Inexploradas' }, modern: { en: 'UNCHARTED · TERRITORY', pt: 'TERRITÓRIO · NOVO' } },
    'page.discover.title':   { vintage: { en: 'Discover', pt: 'Descobrir' }, modern: { en: 'Discover', pt: 'Descobrir' } },
    'page.saved.eyebrow':    { vintage: { en: 'Personal Bookmarks', pt: 'Marcadores Pessoais' }, modern: { en: 'WAYPOINTS · BOOKMARKED', pt: 'PONTOS · SALVOS' } },
    'page.saved.title':      { vintage: { en: 'Saved', pt: 'Salvos' }, modern: { en: 'Saved', pt: 'Salvos' } },
    'page.feed.eyebrow':     { vintage: { en: 'Letters from those followed', pt: 'Cartas dos seguidos' }, modern: { en: 'SUBSCRIBED · CHANNELS', pt: 'CANAIS · SEGUIDOS' } },
    'page.feed.title':       { vintage: { en: 'Bulletin', pt: 'Boletim' }, modern: { en: 'Feed', pt: 'Feed' } },
    'page.messages.eyebrow': { vintage: { en: 'Correspondence', pt: 'Correspondência' }, modern: { en: 'SIGNAL · DM', pt: 'SINAL · DM' } },
    'page.messages.title':   { vintage: { en: 'Letters', pt: 'Cartas' }, modern: { en: 'Signals', pt: 'Sinais' } },
    'page.licenses.eyebrow': { vintage: { en: 'Personal Seals', pt: 'Selos pessoais' }, modern: { en: 'VAULT · KEYS', pt: 'COFRE · CHAVES' } },
    'page.licenses.title':   { vintage: { en: 'Seals', pt: 'Selos' }, modern: { en: 'Keys', pt: 'Chaves' } },

    // ═══════════════ Leaderboard ═══════════════
    'lb.sub':                { vintage: { en: '{periodLabel} · {n} navigators logged', pt: '{periodLabel} · {n} navegantes registrados' }, modern: { en: '{n} surveyors logged · {category}', pt: '{n} membros registrados · {category}' } },
    'lb.tab.overall': { vintage: { en: 'Overall', pt: 'Geral' },     modern: { en: 'OVERALL', pt: 'GERAL' } },
    'lb.tab.gym':     { vintage: { en: 'Gym',     pt: 'Academia' },  modern: { en: 'GYM',     pt: 'GINÁSTICA' } },
    'lb.tab.daily':   { vintage: { en: 'Today',   pt: 'Hoje' },      modern: { en: 'DAY',     pt: 'DIA' } },
    'lb.tab.weekly':  { vintage: { en: 'Week',    pt: 'Semana' },    modern: { en: 'WEEK',    pt: 'SEMANA' } },
    'lb.tab.monthly': { vintage: { en: 'Month',   pt: 'Mês' },       modern: { en: 'MONTH',   pt: 'MÊS' } },
    'lb.period.daily':   { vintage: { en: 'Aura gained today',     pt: 'Aura ganha hoje' },     modern: { en: 'AURA TODAY',  pt: 'AURA HOJE' } },
    'lb.period.weekly':  { vintage: { en: 'Aura gained this week', pt: 'Aura ganha esta semana' }, modern: { en: 'AURA WEEK', pt: 'AURA SEMANA' } },
    'lb.period.monthly': { vintage: { en: 'Aura gained this month',pt: 'Aura ganha este mês' },  modern: { en: 'AURA MONTH', pt: 'AURA MÊS' } },
    'lb.period.overall': { vintage: { en: 'Accumulated aura',      pt: 'Aura acumulada' },       modern: { en: 'TOTAL',      pt: 'TOTAL' } },
    'lb.period.gym':     { vintage: { en: 'Workouts logged',       pt: 'Treinos registrados' },  modern: { en: 'WORKOUTS',   pt: 'TREINOS' } },
    'lb.empty.loading':  { vintage: { en: 'Surveying logs of the master navigator…', pt: 'Coletando registros do navegador-mor…' }, modern: { en: '◌ SURVEYING…', pt: '◌ COLETANDO…' } },
    'lb.empty.none':     { vintage: { en: 'No records in this period.', pt: 'Sem registros neste período.' }, modern: { en: 'No data in this period yet.', pt: 'Sem dados neste período ainda.' } },
    'lb.col.rank':       { vintage: { en: 'Rank',      pt: 'Posto' },     modern: { en: 'RANK',     pt: 'POSTO' } },
    'lb.col.surveyor':   { vintage: { en: 'Navigator', pt: 'Navegante' }, modern: { en: 'SURVEYOR', pt: 'MEMBRO' } },
    'lb.col.bearing':    { vintage: { en: 'Bearing',   pt: 'Rumo' },      modern: { en: 'BEARING',  pt: 'RUMO' } },
    'lb.col.elev':       { vintage: { en: 'Elev',      pt: 'Elev' },      modern: { en: 'ELEV',     pt: 'ELEV' } },
    'lb.col.gained':     { vintage: { en: 'Gained',    pt: 'Ganhou' },    modern: { en: 'GAINED',   pt: 'GANHOU' } },
    'lb.col.aura':       { vintage: { en: 'Aura',      pt: 'Aura' },      modern: { en: 'AURA',     pt: 'AURA' } },

    // ═══════════════ Trophies ═══════════════
    'trophies.sub':           { vintage: { en: '{u} of {t} honors earned', pt: '{u} de {t} honrarias conquistadas' }, modern: { en: '{u} OF {t} UNLOCKED', pt: '{u} DE {t} CONQUISTADOS' } },
    'trophies.label':         { vintage: { en: 'Honor', pt: 'Honraria' }, modern: { en: 'AWARD', pt: 'CONQUISTA' } },
    'trophies.progress':      { vintage: { en: 'Progress', pt: 'Progresso' }, modern: { en: 'PROGRESS', pt: 'PROGRESSO' } },
    'trophies.completed':     { vintage: { en: 'Completed', pt: 'Conquistada' }, modern: { en: 'COMPLETE', pt: 'COMPLETA' } },
    'trophies.awaiting':      { vintage: { en: 'Awaiting the feat.', pt: 'Aguardando o feito.' }, modern: { en: 'Awaiting unlock.', pt: 'Aguardando desbloqueio.' } },
    // Trophy items (PT-BR vintage flavor → EN flavor)
    'trophy.t1.name':         { vintage: { en: 'First Venture',     pt: 'Primeira Empreitada' }, modern: { en: 'First Deal',     pt: 'Primeiro Negócio' } },
    'trophy.t1.desc':         { vintage: { en: 'Post a job in #hiring', pt: 'Publique uma vaga em #hiring' }, modern: { en: 'Post a job in #hiring', pt: 'Publicar uma vaga em #hiring' } },
    'trophy.t2.name':         { vintage: { en: 'Iron Discipline',   pt: 'Disciplina de Ferro' }, modern: { en: 'Iron Streak',    pt: 'Sequência de Ferro' } },
    'trophy.t2.desc':         { vintage: { en: '30 consecutive gym days', pt: '30 dias de academia em sequência' }, modern: { en: '30-day gym streak', pt: 'Sequência de 30 dias na academia' } },
    'trophy.t3.name':         { vintage: { en: 'Crown of the Gym',  pt: 'Coroa da Ginástica' }, modern: { en: 'Gym Royalty',    pt: 'Realeza da Academia' } },
    'trophy.t3.desc':         { vintage: { en: 'Top 3 of the Athletic Logbook', pt: 'Top 3 da Tábua Atlética' }, modern: { en: 'Top 3 in gym leaderboard', pt: 'Top 3 no ranking de academia' } },
    'trophy.t4.name':         { vintage: { en: 'Philanthropist',    pt: 'Filantropo' }, modern: { en: 'Philanthropist', pt: 'Filantropo' } },
    'trophy.t4.desc':         { vintage: { en: 'Donate 50,000 aura in total', pt: 'Doe 50.000 aura ao todo' }, modern: { en: 'Gift 50,000 aura total', pt: 'Doar 50.000 aura no total' } },
    'trophy.t5.name':         { vintage: { en: 'Voice Veteran',     pt: 'Veterano da Voz' }, modern: { en: 'Voice Veteran',  pt: 'Veterano da Voz' } },
    'trophy.t5.desc':         { vintage: { en: '100h in voice channels', pt: '100h em canais de voz' }, modern: { en: '100h in voice channels', pt: '100h em canais de voz' } },
    'trophy.t6.name':         { vintage: { en: "Founder's Table",   pt: 'Mesa do Fundador' }, modern: { en: "Founder's Table", pt: 'Mesa do Fundador' } },
    'trophy.t6.desc':         { vintage: { en: 'Reserved audience with the master cartographer', pt: 'Audiência reservada com o cartógrafo-mor' }, modern: { en: '1:1 with Diogo', pt: 'Reunião 1:1 com Diogo' } },

    // ═══════════════ Members ═══════════════
    'members.sub':           { vintage: { en: '{n} navigators logged in route', pt: '{n} navegantes registrados em rota' }, modern: { en: '{n} REGISTERED IN SECTOR 04', pt: '{n} REGISTRADOS NO SETOR 04' } },
    'members.search':        { vintage: { en: 'Search navigator by name…', pt: 'Buscar navegante por nome…' }, modern: { en: 'Search by callsign…', pt: 'Buscar por identificação…' } },
    'members.sort.aura':     { vintage: { en: 'Aura',     pt: 'Aura' },     modern: { en: 'AURA',   pt: 'AURA' } },
    'members.sort.name':     { vintage: { en: 'Name',     pt: 'Nome' },     modern: { en: 'NAME',   pt: 'NOME' } },
    'members.sort.joined':   { vintage: { en: 'Newest',   pt: 'Mais recentes' }, modern: { en: 'NEWEST', pt: 'MAIS RECENTES' } },
    'members.sort.oldest':   { vintage: { en: 'Veterans', pt: 'Veteranos' }, modern: { en: 'OLDEST', pt: 'MAIS ANTIGOS' } },
    'members.sort.active':   { vintage: { en: 'Active',   pt: 'Ativos agora' }, modern: { en: 'ACTIVE', pt: 'ATIVOS' } },
    'members.empty.loading': { vintage: { en: 'Reading the logbook…', pt: 'Consultando o diário de bordo…' }, modern: { en: '◌ SURVEYING…', pt: '◌ COLETANDO…' } },
    'members.empty.none':    { vintage: { en: 'No navigators in these waters.', pt: 'Nenhum navegante por estas paragens.' }, modern: { en: 'No surveyors in range.', pt: 'Nenhum membro no alcance.' } },

    // ═══════════════ Profile ═══════════════
    'profile.role.default':  { vintage: { en: 'Crewmember', pt: 'Tripulante' }, modern: { en: 'Surveyor', pt: 'Membro' } },
    'profile.stat.discipline.label': { vintage: { en: 'Discipline', pt: 'Disciplina' }, modern: { en: 'DISCIPLINE', pt: 'DISCIPLINA' } },
    'profile.stat.voice.label':      { vintage: { en: 'Voice', pt: 'Voz' },        modern: { en: 'VOICE TIME', pt: 'TEMPO EM VOZ' } },
    'profile.stat.gifts.label':      { vintage: { en: 'Donation', pt: 'Doação' },  modern: { en: 'GIFTS', pt: 'PRESENTES' } },
    'profile.stat.discipline.value': { vintage: { en: '{n} days', pt: '{n} dias' }, modern: { en: '{n} DAYS', pt: '{n} DIAS' } },
    'profile.stat.discipline.sub':   { vintage: { en: 'best: {n}', pt: 'melhor: {n}' }, modern: { en: 'BEST {n}', pt: 'MELHOR {n}' } },
    'profile.stat.voice.sub':        { vintage: { en: 'in audience', pt: 'em audiência' }, modern: { en: 'ON CHANNEL', pt: 'EM CANAL' } },
    'profile.stat.gifts.sub':        { vintage: { en: '{n} received', pt: '{n} recebida' }, modern: { en: '{n} RECEIVED', pt: '{n} RECEBIDOS' } },
    'profile.honors.title':          { vintage: { en: 'Honors earned', pt: 'Honrarias conquistadas' }, modern: { en: 'Awards unlocked', pt: 'Conquistas desbloqueadas' } },
    'profile.honors.label':          { vintage: { en: 'Honor', pt: 'Honraria' }, modern: { en: 'AWARD', pt: 'CONQUISTA' } },
    'profile.listings.title':        { vintage: { en: 'Published tomes · {n}', pt: 'Tomos publicados · {n}' }, modern: { en: 'Published listings · {n}', pt: 'Listagens publicadas · {n}' } },
    'profile.listings.type':         { vintage: { en: 'Tome', pt: 'Tomo' }, modern: { en: 'Listing', pt: 'Listagem' } },
    'profile.lvl.toSummit':          { vintage: { en: '{pct}% to L{lvl}',     pt: '{pct}% a L{lvl}' },     modern: { en: '{pct}% TO L{lvl}',     pt: '{pct}% A L{lvl}' } },
    'profile.lvl.summitGap':         { vintage: { en: '{n} to summit', pt: '{n} ao cume' }, modern: { en: '{n} TO SUMMIT', pt: '{n} AO CUME' } },
    'profile.coords.bearing':        { vintage: { en: 'Bearing {n}°', pt: 'Rumo {n}°' }, modern: { en: 'BEARING {n}°', pt: 'RUMO {n}°' } },

    // ═══════════════ Store ═══════════════
    'store.sub':             { vintage: { en: '{n} {label} available', pt: '{n} {label} disponíveis' }, modern: { en: '{n} {label} · LIVE', pt: '{n} {label} · ATIVOS' } },
    'store.kind.singular':   { vintage: { en: 'reward', pt: 'recompensa' }, modern: { en: 'REWARD',  pt: 'RECOMPENSA' } },
    'store.kind.plural':     { vintage: { en: 'rewards', pt: 'recompensas' }, modern: { en: 'REWARDS', pt: 'RECOMPENSAS' } },
    'store.empty':           { vintage: { en: 'The market is quiet today.', pt: 'A praça está calma hoje.' }, modern: { en: 'Catalog is offline.', pt: 'Catálogo offline.' } },
    'store.empty.sub':       { vintage: { en: '— come back at dusk —', pt: '— volte ao crepúsculo —' }, modern: { en: '◌ NO INVENTORY', pt: '◌ SEM INVENTÁRIO' } },
    'store.cat.all':         { vintage: { en: 'All',      pt: 'Tudo' },      modern: { en: 'ALL',      pt: 'TUDO' } },
    'store.cat.software':    { vintage: { en: 'Tomes',    pt: 'Tomos' },     modern: { en: 'SOFTWARE', pt: 'SOFTWARE' } },
    'store.cat.club':        { vintage: { en: 'Society',  pt: 'Sociedade' }, modern: { en: 'CLUB',     pt: 'CLUBE' } },
    'store.cat.merch':       { vintage: { en: 'Goods',    pt: 'Trastes' },   modern: { en: 'MERCH',    pt: 'PRODUTOS' } },
    'store.cat.cards':       { vintage: { en: 'Vouchers', pt: 'Vouchers' },  modern: { en: 'CARDS',    pt: 'CARTÕES' } },
    'store.cat.events':      { vintage: { en: 'Events',   pt: 'Eventos' },   modern: { en: 'EVENTS',   pt: 'EVENTOS' } },
    'store.card.req':        { vintage: { en: 'L{lvl} req',     pt: 'L{lvl} req' },    modern: { en: 'L{lvl} REQ',  pt: 'L{lvl} REQ' } },
    'store.card.short':      { vintage: { en: 'Short {n}',      pt: 'Falta {n}' },     modern: { en: '{n} SHORT',   pt: '{n} FALTAM' } },
    'store.card.cta':        { vintage: { en: 'Redeem', pt: 'Resgatar' }, modern: { en: 'REDEEM', pt: 'RESGATAR' } },
    'store.card.locked':     { vintage: { en: '—', pt: '—' }, modern: { en: '—', pt: '—' } },

    // ═══════════════ Discover / Saved / Feed ═══════════════
    'discover.empty.title':  { vintage: { en: 'No new routes', pt: 'Nenhuma rota nova' }, modern: { en: 'No new signals', pt: 'Sem novos sinais' } },
    'discover.empty.sub':    { vintage: { en: 'Come back when the winds shift.', pt: 'Volte quando os ventos mudarem.' }, modern: { en: 'Check back when winds shift.', pt: 'Volte quando o vento mudar.' } },
    'saved.sub':             { vintage: { en: '{n} {kind} · {a} within reach · {p} aura total', pt: '{n} {kind} · {a} ao alcance · {p} aura no total' }, modern: { en: '{n} {kind} · {a} IN RANGE · {p} TOTAL AURA', pt: '{n} {kind} · {a} NO ALCANCE · {p} AURA TOTAL' } },
    'saved.kind.s':          { vintage: { en: 'tome',  pt: 'tomo' },    modern: { en: 'WAYPOINT',  pt: 'PONTO' } },
    'saved.kind.p':          { vintage: { en: 'tomes', pt: 'tomos' },   modern: { en: 'WAYPOINTS', pt: 'PONTOS' } },
    'saved.empty.title':     { vintage: { en: 'Nothing bookmarked', pt: 'Nada marcado' }, modern: { en: 'No bookmarks', pt: 'Sem marcadores' } },
    'saved.empty.sub':       { vintage: { en: 'Heart tomes to keep them here.', pt: 'Marque tomos com o coração para guardá-los aqui.' }, modern: { en: 'Heart listings to pin them here.', pt: 'Curta listagens para marcar aqui.' } },
    'saved.cta':             { vintage: { en: 'To the market', pt: 'Ir ao mercado' }, modern: { en: 'Browse market', pt: 'Ver mercado' } },
    'feed.sub':              { vintage: { en: '{c} {ckind} · {n} recent letters', pt: '{c} {ckind} · {n} cartas recentes' }, modern: { en: '{c} {ckind} · {n} BROADCASTS', pt: '{c} {ckind} · {n} TRANSMISSÕES' } },
    'feed.creator.s':        { vintage: { en: 'cartographer',  pt: 'cartógrafo' },  modern: { en: 'CHANNEL',  pt: 'CANAL' } },
    'feed.creator.p':        { vintage: { en: 'cartographers', pt: 'cartógrafos' }, modern: { en: 'CHANNELS', pt: 'CANAIS' } },
    'feed.empty.title':      { vintage: { en: 'Bulletin is silent', pt: 'Boletim em silêncio' }, modern: { en: 'No transmissions', pt: 'Sem transmissões' } },
    'feed.empty.sub':        { vintage: { en: 'Follow creators to track releases.', pt: 'Siga criadores para acompanhar lançamentos.' }, modern: { en: 'Follow creators to receive broadcasts.', pt: 'Siga criadores para receber transmissões.' } },
    'feed.empty.hint':       { vintage: { en: 'Follow cartographers from their profile to receive letters here.', pt: 'Siga cartógrafos no perfil deles para receber cartas aqui.' }, modern: { en: 'FOLLOW CREATORS TO RECEIVE BROADCASTS HERE', pt: 'SIGA CRIADORES PARA RECEBER TRANSMISSÕES AQUI' } },
    'feed.bySeller':         { vintage: { en: 'BY {name}', pt: 'POR {name}' }, modern: { en: 'BY {name}', pt: 'POR {name}' } },

    // ═══════════════ ListingDetail ═══════════════
    'listing.notFound':      { vintage: { en: 'Tome not found.', pt: 'Tomo não encontrado.' }, modern: { en: 'Listing not found.', pt: 'Listagem não encontrada.' } },
    'listing.about':         { vintage: { en: 'About the tome', pt: 'Sobre o tomo' }, modern: { en: 'ABOUT', pt: 'SOBRE' } },
    'listing.related':       { vintage: { en: 'Related tomes', pt: 'Tomos relacionados' }, modern: { en: 'Related listings', pt: 'Listagens relacionadas' } },
    'listing.bySeller':      { vintage: { en: 'BY', pt: 'POR' }, modern: { en: 'BY', pt: 'POR' } },
    'listing.subRequires':   { vintage: { en: 'Requires Level {lvl}.',  pt: 'Requer Nível {lvl}.' },  modern: { en: 'Requires Level {lvl}.',  pt: 'Requer Nível {lvl}.' } },
    'listing.auraShort':     { vintage: { en: '{n} aura short.', pt: 'Faltam {n} aura.' }, modern: { en: '{n} aura short.', pt: 'Faltam {n} aura.' } },
    'listing.cta.acquire':   { vintage: { en: 'Acquire',     pt: 'Adquirir' },     modern: { en: 'Acquire',   pt: 'Adquirir' } },
    'listing.cta.subscribe': { vintage: { en: 'Subscribe',   pt: 'Assinar' },      modern: { en: 'Subscribe', pt: 'Assinar' } },
    'listing.cta.openTome':  { vintage: { en: 'Open tome',   pt: 'Abrir tomo' },   modern: { en: 'Open',      pt: 'Abrir' } },
    'listing.cta.viewLib':   { vintage: { en: 'View library',pt: 'Ver biblioteca'},modern: { en: 'Library',   pt: 'Biblioteca' } },
    'listing.cta.locked':    { vintage: { en: 'Locked', pt: 'Bloqueado' }, modern: { en: 'Locked', pt: 'Bloqueado' } },
    'listing.cta.processing':{ vintage: { en: 'Sealing…',pt: 'Selando…' }, modern: { en: 'Processing…', pt: 'Processando…' } },
    'listing.wishlist.in':   { vintage: { en: '♥ Bookmarked', pt: '♥ Marcado' }, modern: { en: '♥ Saved', pt: '♥ Salvo' } },
    'listing.wishlist.out':  { vintage: { en: '♡ Bookmark',   pt: '♡ Marcar' },  modern: { en: '♡ Save',  pt: '♡ Salvar' } },
    'listing.toast.acquired':{ vintage: { en: '{title} added to library', pt: '{title} adicionado à biblioteca' }, modern: { en: '{title} added to library', pt: '{title} adicionado à biblioteca' } },
    'listing.toast.subscribed':{vintage:{ en: '{title} subscribed', pt: '{title} assinado' }, modern: { en: '{title} subscribed', pt: '{title} assinado' } },
    'listing.toast.short':   { vintage: { en: 'Insufficient aura', pt: 'Aura insuficiente' }, modern: { en: 'Insufficient aura', pt: 'Aura insuficiente' } },

    // ═══════════════ Topbar ═══════════════
    'topbar.search':         { vintage: { en: 'Search listings, creators, rewards…', pt: 'Buscar listagens, criadores, recompensas…' }, modern: { en: 'Search listings, surveyors, rewards…', pt: 'Buscar listagens, membros, recompensas…' } },
    'topbar.gift':           { vintage: { en: 'Seal',   pt: 'Selar' },   modern: { en: 'Send',  pt: 'Enviar' } },
    'topbar.notif':          { vintage: { en: 'Notices',pt: 'Avisos' },  modern: { en: 'Notifications', pt: 'Avisos' } },

    // ═══════════════ Modals ═══════════════
    // GiftModal
    'gift.eyebrow':          { vintage: { en: 'Aura letter',         pt: 'Carta de aura' }, modern: { en: 'TRANSMIT · AURA', pt: 'TRANSMITIR · AURA' } },
    'gift.title':            { vintage: { en: 'Send a gift',         pt: 'Enviar presente' }, modern: { en: 'Send gift',       pt: 'Enviar presente' } },
    'gift.recipient':        { vintage: { en: 'Recipient',           pt: 'Destinatário' },     modern: { en: 'RECIPIENT',       pt: 'DESTINATÁRIO' } },
    'gift.searchMember':     { vintage: { en: 'Search navigator…',   pt: 'Buscar navegante…' }, modern: { en: 'Search surveyor…', pt: 'Buscar membro…' } },
    'gift.noMatches':        { vintage: { en: 'No navigator found.', pt: 'Nenhum navegante encontrado.' }, modern: { en: 'No matches.', pt: 'Sem resultados.' } },
    'gift.changeRecipient':  { vintage: { en: '‹ Change recipient',  pt: '‹ Trocar destinatário' }, modern: { en: '‹ CHANGE',        pt: '‹ TROCAR' } },
    'gift.amount':           { vintage: { en: 'Amount',              pt: 'Quantia' },           modern: { en: 'AMOUNT',          pt: 'QUANTIA' } },
    'gift.note':             { vintage: { en: 'Note (optional)',     pt: 'Bilhete (opcional)' },modern: { en: 'NOTE (OPTIONAL)', pt: 'NOTA (OPCIONAL)' } },
    'gift.notePlaceholder':  { vintage: { en: 'Write by hand…',      pt: 'Escreva à mão livre…' }, modern: { en: 'Add a transmission note…', pt: 'Adicione uma nota…' } },
    'gift.cta.send':         { vintage: { en: 'Seal and send {n} aura', pt: 'Selar e enviar {n} aura' }, modern: { en: 'Transmit {n} aura', pt: 'Transmitir {n} aura' } },
    'gift.cta.sending':      { vintage: { en: 'Sealing…', pt: 'Selando…' }, modern: { en: 'Transmitting…', pt: 'Transmitindo…' } },
    'gift.success.title':    { vintage: { en: 'Letter sealed', pt: 'Carta selada' }, modern: { en: 'Transmitted', pt: 'Transmitido' } },
    'gift.success.body':     { vintage: { en: '{n} aura delivered to {name}', pt: '{n} aura entregue a {name}' }, modern: { en: '{n} aura → {name}', pt: '{n} aura → {name}' } },

    // RedeemModal
    'redeem.eyebrow':        { vintage: { en: 'Market reward', pt: 'Recompensa do mercado' }, modern: { en: 'MARKETPLACE', pt: 'MARKETPLACE' } },
    'redeem.title':          { vintage: { en: 'Confirm redeem', pt: 'Confirmar resgate' }, modern: { en: 'Confirm redeem', pt: 'Confirmar resgate' } },
    'redeem.row.cost':       { vintage: { en: 'Cost',          pt: 'Custo' },             modern: { en: 'COST',          pt: 'CUSTO' } },
    'redeem.row.balance':    { vintage: { en: 'Balance after', pt: 'Saldo após' },        modern: { en: 'BALANCE AFTER', pt: 'SALDO APÓS' } },
    'redeem.row.delivery':   { vintage: { en: 'Delivery',      pt: 'Entrega' },           modern: { en: 'DELIVERY',      pt: 'ENTREGA' } },
    'redeem.delivery.value': { vintage: { en: 'Cartographer will reach out', pt: 'Cartógrafo entrará em contato' }, modern: { en: 'Team will contact you', pt: 'Equipe entrará em contato' } },
    'redeem.cta.confirm':    { vintage: { en: 'Seal redeem', pt: 'Selar resgate' }, modern: { en: 'Confirm redeem', pt: 'Confirmar resgate' } },
    'redeem.cta.sending':    { vintage: { en: 'Sealing…',   pt: 'Selando…' },     modern: { en: 'Logging…',      pt: 'Registrando…' } },
    'redeem.cta.retry':      { vintage: { en: 'Try again',  pt: 'Tentar novamente' }, modern: { en: 'Try again',  pt: 'Tentar novamente' } },
    'redeem.success.title':  { vintage: { en: 'Reward inscribed', pt: 'Recompensa lavrada' }, modern: { en: 'Logged', pt: 'Registrado' } },
    'redeem.success.body':   { vintage: { en: 'The master cartographer will contact you for delivery.', pt: 'O cartógrafo-mor entrará em contato para a entrega.' }, modern: { en: 'The team will reach out for delivery.', pt: 'A equipe entrará em contato para a entrega.' } },
    'redeem.err.signin':     { en: 'Sign in required.', pt: 'Faça login pra resgatar.' },
    'redeem.err.insufficient': { en: 'Insufficient aura.', pt: 'Aura insuficiente.' },
    'redeem.err.invalid':    { en: 'Reward unavailable.', pt: 'Recompensa indisponível.' },
    'redeem.err.timeout':    { en: 'Timed out, try again.', pt: 'Tempo esgotado, tente novamente.' },

    // NotifDrawer
    'notif.eyebrow':         { vintage: { en: 'Notice journal', pt: 'Diário de Avisos' }, modern: { en: 'SIGNAL · INBOX', pt: 'SINAL · CAIXA' } },
    'notif.title':           { vintage: { en: 'Inbox', pt: 'Caixa' }, modern: { en: 'Notifications', pt: 'Notificações' } },
    'notif.clearAll':        { vintage: { en: 'Clear', pt: 'Limpar' }, modern: { en: 'CLEAR', pt: 'LIMPAR' } },
    'notif.empty.title':     { vintage: { en: 'No pending notices.', pt: 'Nenhum aviso pendente.' }, modern: { en: '◌ NO SIGNAL', pt: '◌ SEM SINAL' } },
    'notif.empty.sub':       { vintage: { en: '— journal in silence —', pt: '— diário em silêncio —' }, modern: { en: 'All clear.', pt: 'Tudo limpo.' } },

    // SettingsModal
    'settings.eyebrow':      { vintage: { en: 'Settings', pt: 'Configurações' }, modern: { en: 'SETTINGS', pt: 'CONFIGURAÇÕES' } },
    'settings.title':        { vintage: { en: 'Adjustments', pt: 'Ajustes' }, modern: { en: 'Config', pt: 'Configuração' } },
    'settings.section.account': { vintage: { en: 'Account', pt: 'Conta' }, modern: { en: 'ACCOUNT', pt: 'CONTA' } },
    'settings.section.notif':   { vintage: { en: 'Notices', pt: 'Avisos' }, modern: { en: 'SIGNALS', pt: 'SINAIS' } },
    'settings.section.appear':  { vintage: { en: 'Appearance', pt: 'Aparência' }, modern: { en: 'APPEARANCE', pt: 'APARÊNCIA' } },
    'settings.section.downloads':{ vintage: { en: 'Volumes', pt: 'Tomos' }, modern: { en: 'DOWNLOADS', pt: 'DOWNLOADS' } },
    'settings.section.about':   { vintage: { en: 'Logbook', pt: 'Diário' }, modern: { en: 'ABOUT', pt: 'SOBRE' } },
    'settings.about.title':     { vintage: { en: 'Logbook', pt: 'Diário de Bordo' }, modern: { en: 'About', pt: 'Sobre' } },
    'settings.about.version':   { vintage: { en: 'v0.1.0 · early voyage', pt: 'v0.1.0 · expedição inicial' }, modern: { en: 'v0.1.0 · EARLY ACCESS', pt: 'v0.1.0 · ACESSO ANTECIPADO' } },
    'settings.about.body':      { vintage: { en: 'Travel companion for the {server} community — leaderboards, daily claims, aura letters and reward seals, all synced live.', pt: 'Companheiro de viagem da comunidade {server} — tábuas dos navegantes, recolhimentos diários, cartas de aura e selos de recompensa, todos sincronizados em tempo real.' }, modern: { en: 'Companion app for the {server} Discord community — leaderboards, daily claims, aura gifts and reward redemptions, all synced live.', pt: 'App companheiro da comunidade {server} — rankings, bônus diários, presentes de aura e resgates, sincronizados em tempo real.' } },
    'settings.about.footer':    { vintage: { en: 'Inscribed by the master cartographer · MMXXVI', pt: 'Lavrado pelo cartógrafo-mor · MMXXVI' }, modern: { en: 'MADE WITH ♥ BY THE ELY CORE TEAM', pt: 'FEITO COM ♥ PELO TIME ELY CORE' } },

    // ShortcutsModal
    'shortcuts.eyebrow':     { vintage: { en: 'Keyboard shortcuts', pt: 'Atalhos do teclado' }, modern: { en: 'KEYBOARD', pt: 'TECLADO' } },
    'shortcuts.title':       { vintage: { en: 'Key manuscript', pt: 'Manuscrito de teclas' }, modern: { en: 'Shortcuts', pt: 'Atalhos' } },
    'shortcuts.group.search':  { vintage: { en: 'Search',     pt: 'Busca' },      modern: { en: 'SEARCH',     pt: 'BUSCA' } },
    'shortcuts.group.nav':     { vintage: { en: 'Navigation', pt: 'Navegação' }, modern: { en: 'NAVIGATION', pt: 'NAVEGAÇÃO' } },
    'shortcuts.group.general': { vintage: { en: 'General',    pt: 'Geral' },      modern: { en: 'GENERAL',    pt: 'GERAL' } },
    'shortcuts.label.focusSearch':  { en: 'Focus search',     pt: 'Focar busca' },
    'shortcuts.label.navigateRes':  { en: 'Navigate results', pt: 'Navegar resultados' },
    'shortcuts.label.openHighlt':   { en: 'Open highlighted', pt: 'Abrir destacado' },
    'shortcuts.label.closeDropdown':{ en: 'Close dropdown',   pt: 'Fechar dropdown' },
    'shortcuts.label.toggleSheet':  { en: 'Toggle this sheet',pt: 'Abrir/fechar esta folha' },
    'shortcuts.label.closeModal':   { en: 'Close modal / dropdown', pt: 'Fechar modal / dropdown' },
    'shortcuts.label.reloadApp':    { en: 'Reload app',       pt: 'Recarregar app' },
    'shortcuts.label.replayIntro':  { en: 'Replay intro (dev)', pt: 'Reabrir intro (dev)' },
    'shortcuts.footer':      { vintage: { en: 'Press {key} on any screen to reopen.', pt: 'Tecle {key} em qualquer tela para reabrir.' }, modern: { en: 'PRESS {key} ANYWHERE TO REOPEN', pt: 'TECLE {key} EM QUALQUER LUGAR' } },

    // ReportModal
    'report.eyebrow':        { vintage: { en: 'Report {kind}', pt: 'Denunciar {kind}' }, modern: { en: 'REPORT · {kind}', pt: 'DENÚNCIA · {kind}' } },
    'report.title.new':      { vintage: { en: "What's wrong?", pt: 'Qual o problema?' }, modern: { en: "What's wrong?", pt: 'Qual o problema?' } },
    'report.title.already':  { vintage: { en: 'Already reported', pt: 'Já registrado' }, modern: { en: 'Already reported', pt: 'Já reportado' } },
    'report.body.new':       { vintage: { en: 'Mods will review. Abuse can result in restrictions.', pt: 'Mods irão revisar. Abuso do sistema pode resultar em restrições.' }, modern: { en: 'Mods will review. Abuse of the report system can limit your account.', pt: 'Mods irão revisar. Abuso do sistema pode limitar sua conta.' } },
    'report.body.already':   { vintage: { en: 'Already flagged — a moderator will review.', pt: 'Já foi sinalizado — um moderador irá analisar.' }, modern: { en: 'Already flagged — a moderator will review.', pt: 'Já reportado — um moderador irá revisar.' } },
    'report.kind.user':      { vintage: { en: 'navigator', pt: 'navegante' }, modern: { en: 'USER', pt: 'USUÁRIO' } },
    'report.detailLabel':    { vintage: { en: 'More detail (optional)', pt: 'Mais detalhes (opcional)' }, modern: { en: 'MORE DETAIL (OPTIONAL)', pt: 'MAIS DETALHES (OPCIONAL)' } },
    'report.detailPlaceholder':{ vintage:{en:'Tell the moderator what happened…',pt:'Conte ao moderador o que aconteceu…'}, modern:{en:'Tell the mods what happened…',pt:'Conte aos mods o que aconteceu…'} },
    'report.cta.cancel':     { vintage: { en: 'Cancel', pt: 'Cancelar' }, modern: { en: 'Cancel', pt: 'Cancelar' } },
    'report.cta.submit':     { vintage: { en: 'Seal report', pt: 'Selar denúncia' }, modern: { en: 'Submit report', pt: 'Enviar denúncia' } },
    'report.cta.submitted':  { vintage: { en: 'Sent', pt: 'Enviado' },     modern: { en: 'Submitted', pt: 'Enviado' } },
    'report.cta.close':      { vintage: { en: 'Close', pt: 'Fechar' },     modern: { en: 'Close', pt: 'Fechar' } },
    'report.toast.success':  { vintage: { en: 'Report logged — thanks for flagging', pt: 'Denúncia registrada — obrigado por sinalizar' }, modern: { en: 'Report submitted — thanks for flagging', pt: 'Denúncia enviada — obrigado por sinalizar' } },

    // Messages
    'msg.sub':               { vintage: { en: '{n} {k}', pt: '{n} {k}' }, modern: { en: '{n} {k}', pt: '{n} {k}' } },
    'msg.kind.s':            { vintage: { en: 'correspondent',  pt: 'correspondente' },  modern: { en: 'CONTACT',  pt: 'CONTATO' } },
    'msg.kind.p':            { vintage: { en: 'correspondents', pt: 'correspondentes' }, modern: { en: 'CONTACTS', pt: 'CONTATOS' } },
    'msg.empty.title':       { vintage: { en: 'No letters yet', pt: 'Nenhuma carta ainda' }, modern: { en: 'No signals yet', pt: 'Sem sinais ainda' } },
    'msg.empty.sub':         { vintage: { en: 'Send one from another navigator\'s profile.', pt: 'Envie uma do perfil de outro navegante.' }, modern: { en: 'Send one from another surveyor\'s profile.', pt: 'Envie um do perfil de outro membro.' } },
    'msg.thread.empty':      { vintage: { en: 'Select a letter on the left', pt: 'Selecione uma carta à esquerda' }, modern: { en: 'SELECT A CHANNEL', pt: 'SELECIONE UM CANAL' } },
    'msg.thread.viewProfile':{ vintage: { en: 'VIEW PROFILE', pt: 'VER PERFIL' }, modern: { en: 'VIEW PROFILE', pt: 'VER PERFIL' } },
    'msg.list.noBody':       { vintage: { en: '— no letters —', pt: '— sem cartas —' }, modern: { en: '— no messages —', pt: '— sem mensagens —' } },
    'msg.composer':          { vintage: { en: 'Write by hand… (Enter sends)', pt: 'Escreva à mão livre… (Enter envia)' }, modern: { en: 'Type a transmission… (Enter sends)', pt: 'Digite uma mensagem… (Enter envia)' } },
    'msg.send':              { vintage: { en: 'Send', pt: 'Enviar' }, modern: { en: 'Send', pt: 'Enviar' } },
    'msg.anonymous':         { vintage: { en: 'Anonymous', pt: 'Anônimo' }, modern: { en: 'Anonymous', pt: 'Anônimo' } },

    // Licenses
    'lic.sub':               { vintage: { en: '{n} {k}', pt: '{n} {k}' }, modern: { en: '{n} {k}', pt: '{n} {k}' } },
    'lic.kind.s':            { vintage: { en: 'seal issued', pt: 'selo emitido' }, modern: { en: 'KEY ISSUED', pt: 'CHAVE EMITIDA' } },
    'lic.kind.p':            { vintage: { en: 'seals issued', pt: 'selos emitidos' }, modern: { en: 'KEYS ISSUED', pt: 'CHAVES EMITIDAS' } },
    'lic.loading':           { vintage: { en: 'Looking up seals…', pt: 'Consultando os selos…' }, modern: { en: '◌ FETCHING KEYS…', pt: '◌ BUSCANDO CHAVES…' } },
    'lic.empty.title':       { vintage: { en: 'No seals yet', pt: 'Nenhum selo ainda' }, modern: { en: 'No keys', pt: 'Sem chaves' } },
    'lic.empty.sub':         { vintage: { en: 'Seals appear here after acquiring tomes from the market.', pt: 'Selos aparecem aqui após adquirir tomos do mercado.' }, modern: { en: 'Keys appear here after acquiring listings.', pt: 'Chaves aparecem aqui após adquirir listagens.' } },
    'lic.empty.cta':         { vintage: { en: 'No keys yet', pt: 'Nenhuma chave ainda' }, modern: { en: '◌ NO KEYS', pt: '◌ SEM CHAVES' } },
    'lic.product.fallback':  { vintage: { en: 'TOME', pt: 'TOMO' }, modern: { en: 'KEY', pt: 'CHAVE' } },
    'lic.devices.s':         { vintage: { en: 'device',  pt: 'dispositivo' },  modern: { en: 'DEVICE',  pt: 'DISPOSITIVO' } },
    'lic.devices.p':         { vintage: { en: 'devices', pt: 'dispositivos' }, modern: { en: 'DEVICES', pt: 'DISPOSITIVOS' } },
    'lic.cooldown':          { vintage: { en: '{h}h remaining', pt: '{h}h restantes' }, modern: { en: '{h}H REMAINING', pt: '{h}H RESTANTES' } },
    'lic.cta.reset':         { vintage: { en: 'Reset devices', pt: 'Resetar dispositivos' }, modern: { en: 'RESET DEVICES', pt: 'RESETAR DISPOSITIVOS' } },
    'lic.cta.resetting':     { vintage: { en: 'Resetting',     pt: 'Resetando' },           modern: { en: 'RESETTING',     pt: 'RESETANDO' } },
    'lic.toast.reset':       { vintage: { en: 'Devices reset', pt: 'Dispositivos resetados' }, modern: { en: 'Devices reset', pt: 'Dispositivos resetados' } },
    'lic.toast.cooldown':    { vintage: { en: 'Reset available in {h}h', pt: 'Reset disponível em {h}h' }, modern: { en: 'Reset available in {h}h', pt: 'Reset disponível em {h}h' } },
    'lic.toast.failed':      { vintage: { en: 'Failed: {msg}', pt: 'Falha: {msg}' }, modern: { en: 'Reset failed: {msg}', pt: 'Reset falhou: {msg}' } },

    // Sidebar premium pill
    'sidebar.premium.pro':   { vintage: { en: 'Pro',  pt: 'Pro' }, modern: { en: 'PRO',  pt: 'PRO' } },
    'sidebar.premium.locked':{ vintage: { en: 'Lock', pt: 'Bloq' }, modern: { en: 'LOCK', pt: 'BLOQ' } },
    // Topbar selar
    'topbar.cmdK':           { en: '⌘K', pt: '⌘K' },
  };

  // Look up a key. Falls back through:
  //   1. theme-specific (vintage/modern) for current lang
  //   2. theme-specific for English
  //   3. shared for current lang
  //   4. shared for English
  //   5. the key itself
  function tc(key, vars) {
    const lang = (window.ElyI18N?.getLang?.() || 'en');
    const isModern = !!(window.T && window.T.cartographerModern);
    const themeKey = isModern ? 'modern' : 'vintage';
    const entry = DICT[key];
    if (!entry) return key;
    let s;
    // Theme-specific
    if (entry[themeKey]) {
      s = entry[themeKey][lang] || entry[themeKey].en;
    }
    // Shared (no theme split)
    if (s == null && entry[lang]) s = entry[lang];
    if (s == null && entry.en)    s = entry.en;
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
    return s;
  }

  window.tc = tc;
  window.__CARTO_DICT = DICT; // exposed for dev inspection / extending later
})();
