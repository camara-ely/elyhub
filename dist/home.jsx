// home.jsx — Home, Leaderboard, Trophies.
//
// Extracted from app.jsx. The three "default" destinations: Home is the
// personal dashboard, Leaderboard is the community ranking, Trophies derives
// achievements from window.ME's live stats.
//
// Contents:
//   • Home             — rankTheme, deriveServerTags, todayKickerParts, HomeView,
//                         SectionTitle, ClaimCard, useUtcCooldown, RankRow,
//                         FeaturedDrop, relTime, AuraFeedList, FeedItem,
//                         AuraFeedEntry, MiniTrophy
//   • Leaderboard      — useFocusHighlight, JumpToMeButton, LeaderboardView
//   • Trophies         — deriveTrophies, TrophiesView

// ────────────── Home ──────────────
// Rank badge styling — top 3 get metallic tier colours (gold/silver/bronze)
// with a subtle glow and matching icon. Everyone else gets the muted grey
// pill. Keeps the "hero achievement" feel only where it's earned. The hex
// values are hand-picked for legibility against the dark glass bg — pure
// CSS gold (#FFD700) is too yellow and reads as neon, so we tone it.
function rankTheme(rank) {
  if (rank === 1) return { hue: '#FFC65C', glow: 'rgba(255,198,92,0.45)', label: '👑', weight: 700 };
  if (rank === 2) return { hue: '#D8DEE6', glow: 'rgba(216,222,230,0.35)', label: '🥈', weight: 600 };
  if (rank === 3) return { hue: '#D58C5F', glow: 'rgba(213,140,95,0.40)', label: '🥉', weight: 600 };
  return null; // falls back to <Tag muted/>
}

// Server tags — the Discord-style role pills shown on the profile header.
// We don't currently sync live Discord roles into the DB (the bot would need
// to write member_roles into xp on every GuildMemberUpdate), so these are
// derived from the *real* stats we already have: leaderboard rank, gym
// activity, generosity, level milestones, voice time, trophies earned. Each
// tag returns { name, hue } — the renderer turns that into a colored-dot
// pill that reads like a Discord role chip. Order matters: most prestigious
// first so the first pill carries the strongest signal.
function deriveServerTags(me) {
  const m = me || {};
  const tags = [];
  const hours = Math.floor((m.voiceSeconds || 0) / 3600);
  const trophies = (typeof deriveTrophies === 'function') ? deriveTrophies(m) : [];
  const earned = trophies.filter((tr) => tr.unlocked).length;

  // Leaderboard tier — metallic for top 3, accent for top 10, nothing below.
  if (m.rank === 1)                    tags.push({ name: '#1 Ace',       hue: '#FFC65C' });
  else if (m.rank === 2)               tags.push({ name: 'Silver',       hue: '#D8DEE6' });
  else if (m.rank === 3)               tags.push({ name: 'Bronze',       hue: '#D58C5F' });
  else if (m.rank && m.rank <= 10)     tags.push({ name: 'Top 10',       hue: T.accentHi });

  // Founder / staff — trophy t6 acts as our "has 1:1'd with Diogo" proxy.
  if (m.founderRedeemed)               tags.push({ name: 'Founder Circle', hue: T.lilac });

  // Level milestones — one tag, picked from the highest bucket reached.
  const lvl = m.level || 0;
  if (lvl >= 40)                       tags.push({ name: 'Lvl 40+',      hue: '#C89DFF' });
  else if (lvl >= 30)                  tags.push({ name: 'Lvl 30+',      hue: T.accentHi });
  else if (lvl >= 10)                  tags.push({ name: 'Member',       hue: T.text2 });
  else                                 tags.push({ name: 'Newcomer',     hue: T.text3 });

  // Gym Club — gym streak of 7+ or currently top 3 in gym leaderboard.
  if ((m.gymStreakBest || 0) >= 7 || (m.gymRank && m.gymRank <= 3)) {
    tags.push({ name: 'Gym Club',      hue: T.green });
  }

  // Dealmaker — posted at least one job in #hiring.
  if ((m.postjobCount || 0) >= 1)      tags.push({ name: 'Dealmaker',    hue: T.blue });

  // Philanthropist — gifted 10k+ (real trophy threshold is 50k, but the role
  // is a softer "you give a lot" signal, so we lower the bar).
  if ((m.totalGiftsSent || 0) >= 10000) tags.push({ name: 'Philanthropist', hue: T.lilac });

  // Voice veteran — 10+ hours total time in voice.
  if (hours >= 10)                     tags.push({ name: 'Voice',        hue: '#7FB0FF' });

  // Trophy count badge — earned 3+ trophies.
  if (earned >= 3)                     tags.push({ name: `${earned}× Trophy`, hue: '#FFC65C' });

  return tags;
}

// Format today's date in the user's current locale, producing a line like
// "TODAY · TUESDAY, APRIL 22" (or "HOJE · TERÇA-FEIRA, 22 DE ABRIL" in PT).
// Uses the i18n dictionary for the "TODAY" prefix so the two halves match
// instead of being half-PT/half-EN like the old hardcoded string.
function todayKickerParts() {
  const lang = window.ElyI18N?.getLang?.() || 'en';
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const now = new Date();
  const weekday = now.toLocaleDateString(locale, { weekday: 'long' });
  const rest = now.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
  return {
    today: t('home.today') || 'TODAY',
    date: `${weekday}, ${rest}`.toUpperCase(),
  };
}

function HomeView({ state, setState, setView, onQuick }) {
  // Zodiac theme gate — when active, delegate to the celestial variant in
  // dist/zodiac/views.jsx. Original HomeView below is untouched for every
  // other theme.
  if (T.zodiac && window.ZodiacHomeView) {
    return <window.ZodiacHomeView state={state} setState={setState} setView={setView} onQuick={onQuick}/>;
  }
  // Daily claim state is per-kind: 'tag' or 'booster'. Tracks in-flight
  // request + any error message returned by the bot worker (e.g. the user
  // stopped boosting, removed the tag, or Turso was unreachable).
  const [claiming, setClaiming] = React.useState({ tag: false, booster: false });
  const [claimErr, setClaimErr] = React.useState({ tag: null, booster: null });
  const cooldown = useUtcCooldown();

  // Read authoritative claim state from ME (set by data.jsx from the
  // last_daily_claim_day / last_booster_claim_day columns). This is what
  // the bot sees, so the UI stays honest even across app restarts.
  const tagClaimed = !!ME.tagClaimedToday;
  const boosterClaimed = !!ME.boosterClaimedToday;

  async function handleClaim(kind) {
    if (!window.ElyOps?.claimDaily) {
      setClaimErr((e) => ({ ...e, [kind]: 'backend not ready' }));
      return;
    }
    setClaiming((c) => ({ ...c, [kind]: true }));
    setClaimErr((e) => ({ ...e, [kind]: null }));
    try {
      await window.ElyOps.claimDaily(kind);
      // Optimistic is already applied in ElyOps (see applyOptimistic). Fire a
      // toast so the user gets explicit reinforcement beyond the card flipping
      // — easy to miss a silent state change. kind='claim' isn't in notify.jsx's
      // pref map, so it bypasses the gift/drop/ranking toggles — this is the
      // user's own action, not a notification they could want to mute.
      const amount = kind === 'tag' ? 300 : 500;
      const label = kind === 'tag' ? t('home.tagBonus') : t('home.serverBoost');
      window.ElyNotify?.dispatch({
        kind: 'claim',
        title: `+${fmt(amount)} ${t('home.aura')}`,
        body: `${label} claimed`,
      });
    } catch (err) {
      const msg = (err?.message || 'claim failed').replace(/^failed:/, '');
      setClaimErr((e) => ({ ...e, [kind]: msg }));
    } finally {
      setClaiming((c) => ({ ...c, [kind]: false }));
    }
  }

  // Progress bar: read aura from ME (authoritative, updated by poll) and
  // clamp to 0-100 so a mid-poll race (e.g. XP just granted but level cache
  // stale) can't show 114%. ME.prevLevelAura / ME.nextLevelAura are computed
  // in data.jsx from the MEE6 formula on ME.aura itself, so they track too.
  const auraNow = ME.aura ?? state.aura;
  const span = Math.max(1, (ME.nextLevelAura ?? 0) - (ME.prevLevelAura ?? 0));
  const pctRaw = Math.round(((auraNow - (ME.prevLevelAura ?? 0)) / span) * 100);
  const pct = Math.max(0, Math.min(100, pctRaw));
  const top = [...MEMBERS].sort((a,b) => b.aura - a.aura).slice(0, 6);
  const available = (tagClaimed ? 0 : 1) + (boosterClaimed ? 0 : 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }} className="ely-home-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Weekly identity banner */}
        <Glass style={{ padding: 0, position: 'relative', overflow: 'hidden', height: 200 }}>
          <img src="assets/ely-lettering.jpg" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(5,9,26,0.7) 100%)',
          }}/>
          <div style={{ position: 'absolute', left: 24, bottom: 20, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ ...TY.micro, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{t('home.week')} 17 · {t('home.identity')}</div>
              <div style={{ ...TY.h3, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Fluffy Ely</div>
            </div>
            <Tag muted>{t('home.updatedWeekly')}</Tag>
          </div>
        </Glass>
        {/* Hero */}
        <Glass style={{ padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <HoverOrbs restX={82} restY={18} size={420} color={T.accent} colorHi={T.accentHi}/>
          {/* Streak + rank floated to the top-right — the "identity strip" of
              the hero. Keeps them out of the level/progress row and balances
              the date kicker on the opposite corner. z-index 1 so the ambient
              glow orb above doesn't wash them out. */}
          <div style={{ position: 'absolute', top: 18, right: 20, display: 'flex', gap: 8, alignItems: 'center', zIndex: 1 }}>
            <Tag color={T.red}>{ME.streak ?? state.streak}-{t('home.streak')}</Tag>
            {(() => {
              const rankVal = ME.rank ?? state.rank;
              const theme = rankTheme(rankVal);
              if (!theme) return <Tag muted>{t('home.rank')} #{rankVal}</Tag>;
              return <Tag color={theme.hue}>{t('home.rank')} #{rankVal}</Tag>;
            })()}
          </div>
          {/* Date kicker — dynamic + localized. Before was hardcoded
              "Hoje · Tuesday, April 22" mixing PT prefix with EN body, which
              looked broken when lang was actually EN. Now the prefix reads
              from i18n and the weekday/month come from the matching locale. */}
          {(() => {
            const k = todayKickerParts();
            return (
              <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>
                {k.today} · {k.date}
              </div>
            );
          })()}
          {/* Hero row — number + label vertically centered so "aura" sits
              against the optical middle of the numeral instead of hugging
              the baseline. Tighter gap (12) keeps the pair reading as one
              unit. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {/* Negative margin pulls ONLY the big number leftward — the kicker,
                label stack and progress row keep the card's normal padding.
                Big display numerals have optical side-bearing that makes them
                feel indented even when flush; -10 compensates. */}
            <div style={{ ...TY.numLarge, color: T.text, textShadow: `0 0 40px ${T.accentGlow}`, lineHeight: 0.9, marginLeft: -10, marginTop: 8 }}>
              <Counter value={auraNow}/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ ...TY.body, color: T.text3 }}>{t('home.aura')}</div>
              {/* Live indicator — green dot with glow + green text reads as
                  "healthy live connection" at a glance. Matches the same
                  "● Live" convention used next to "Aura feed" below so the
                  app speaks one visual language for freshness signals. */}
              <div style={{ ...TY.small, color: T.green, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: T.green,
                  boxShadow: `0 0 8px ${T.green}, 0 0 0 2px rgba(95,217,154,0.15)`,
                  animation: 'livePulse 2s ease-in-out infinite',
                }}/>
                {t('home.live2')}
              </div>
              {/* Keyframes scoped inline — the dot "breathes" at the same
                  rhythm as a server heartbeat, reinforcing the live feel. */}
              <style>{`
                @keyframes livePulse {
                  0%, 100% { opacity: 1;    box-shadow: 0 0 8px ${T.green}, 0 0 0 2px rgba(95,217,154,0.15); }
                  50%      { opacity: 0.85; box-shadow: 0 0 14px ${T.green}, 0 0 0 4px rgba(95,217,154,0.05); }
                }
              `}</style>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...TY.small, color: T.text3, marginBottom: 8 }}>
                <span>{t('home.level')} {ME.level ?? state.level}</span>
                <span>{pct}% {t('home.to')} {(ME.level ?? state.level)+1}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${T.accent}, ${T.accentHi})`,
                  boxShadow: `0 0 12px ${T.accentGlow}`, transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                }}/>
              </div>
            </div>
          </div>
        </Glass>

        {/* Claims */}
        <section>
          <SectionTitle label={t('home.dailyClaims')} meta={`${available} ${t('home.claimsAvail')}`}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ClaimCard
              label={t('home.tagBonus')} icon={<ISparkle size={18}/>} amount={300} cooldown={cooldown}
              claimed={tagClaimed} loading={claiming.tag} error={claimErr.tag}
              onClaim={() => handleClaim('tag')}
            />
            <ClaimCard
              label={t('home.serverBoost')} icon={<IFlame size={18}/>} amount={500} cooldown={cooldown}
              claimed={boosterClaimed} loading={claiming.booster} error={claimErr.booster}
              onClaim={() => handleClaim('booster')}
            />
          </div>
        </section>

        {/* Leaderboard preview */}
        <section>
          <SectionTitle label={t('home.ranking')} meta={t('home.today')} action={<button onClick={() => setView({ id: 'leaderboard' })} style={linkStyle()}>{t('home.viewAll')} <IChevR size={12}/></button>}/>
          <Glass style={{ overflow: 'hidden', padding: 6 }}>
            {top.slice(0, 5).map((u, i) => (
              <RankRow key={u.id} rank={i+1} user={u} isMe={u.id === (window.ME?.id)} onGift={onQuick?.gift}/>
            ))}
          </Glass>
        </section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <FeaturedDrop onQuick={onQuick} setView={setView}/>
        <section>
          <SectionTitle size="sm" label={t('home.auraFeed')} meta={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.green }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }}/>{t('home.live')}</span>}/>
          <Glass style={{ padding: '4px 18px' }}>
            <AuraFeedList/>
          </Glass>
        </section>

        <section>
          <SectionTitle label={t('home.yourTrophies')} action={<button onClick={() => setView({ id: 'trophies' })} style={linkStyle()}>{t('home.all')} <IChevR size={12}/></button>}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* Prefer unlocked first, then closest-to-unlock, so the home card
                always looks like progress is being made. */}
            {deriveTrophies(window.ME)
              .sort((a, b) => (b.unlocked - a.unlocked) || (b.progress / b.total - a.progress / a.total))
              .slice(0, 3)
              .map(t => <MiniTrophy key={t.id} t={t}/>)}
          </div>
        </section>
      </div>
    </div>
  );
}

// Function instead of const: T mutates on theme change, and the action link
// sits directly on the wallpaper — so on light wallpapers we want dark text,
// not the accent tint (which on Fluffy/Ribbon is pastel and disappears).
const linkStyle = () => ({
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: T.isLight ? T.textOnBg : T.accentHi,
  fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 3, padding: 0,
});

function SectionTitle({ label, meta, action, size }) {
  // size="sm" shrinks the heading (used for secondary sections like the aura
  // feed) and switches the row to center alignment so inline-flex meta chips
  // (e.g. "Live" dot) sit on the visual middle of the text instead of its
  // baseline — baseline alignment makes pill indicators look like they're
  // floating below the heading.
  const small = size === 'sm';
  const titleStyle = small
    ? { fontSize: 15, lineHeight: 1.25, fontWeight: 500, letterSpacing: '-0.01em', fontFamily: T.fontSans }
    : TY.h3;
  const align = small ? 'center' : 'baseline';
  return (
    <div style={{ display: 'flex', alignItems: align, justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: align, gap: 10 }}>
        <h2 style={{ ...titleStyle, margin: 0, color: T.textOnBg }}>{label}</h2>
        {meta && <span style={{ ...TY.small, color: T.textOnBg3, display: 'inline-flex', alignItems: 'center' }}>{meta}</span>}
      </div>
      {action}
    </div>
  );
}

function ClaimCard({ label, icon, amount, cooldown, claimed, loading, error, onClaim }) {
  // Disabled when already claimed today or a request is in flight. We show
  // the error inline so users know why a click didn't register (e.g. they
  // removed the ELY tag or stopped boosting).
  const disabled = claimed || loading;
  const statusText = loading
    ? t('claim.claiming')
    : error
      ? t('claim.tryAgain')
      : claimed
        ? (cooldown ? `${t('claim.claimed')} · ${cooldown}` : t('claim.claimed'))
        : t('claim.available');
  const statusColor = error ? T.red || '#ff6b6b' : T.text3;
  return (
    <Glass hover={!disabled} onClick={disabled ? undefined : onClaim} style={{
      padding: 20, position: 'relative', overflow: 'hidden',
      opacity: claimed ? 0.55 : loading ? 0.75 : 1,
      cursor: disabled ? 'default' : 'pointer',
    }}>
      {!claimed && !loading && <HoverOrbs restX={82} restY={18} size={220} color={T.accent} colorHi={T.accentHi}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: claimed ? 'rgba(255,255,255,0.05)' : `${T.accent}33`,
          border: `0.5px solid ${claimed ? T.glassBorder : T.accent + '66'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: claimed ? T.text3 : T.accentHi,
        }}>{icon}</div>
        <span style={{ ...TY.small, color: statusColor, fontSize: 11 }}>{statusText}</span>
      </div>
      <div style={{ ...TY.body, color: T.text2, marginBottom: 6, position: 'relative' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, position: 'relative' }}>
        <span style={{ ...TY.numMed, color: claimed ? T.text3 : T.text }}>+{amount}</span>
        <span style={{ ...TY.small, color: T.text3 }}>aura</span>
      </div>
      {error && (
        <div style={{ ...TY.small, color: statusColor, marginTop: 8, fontSize: 11, position: 'relative' }}>
          {error}
        </div>
      )}
    </Glass>
  );
}

// Time until next UTC midnight, formatted like "18h 12m". Daily bonuses reset
// at UTC 00:00 in the bot (see xp.js todayUtcKey), so this is the cooldown the
// user is actually waiting on.
function useUtcCooldown() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    // Update every minute — second-by-second precision isn't needed for a daily.
    const t = setInterval(() => setTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const ms = next - now;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  // tick is unused but forces re-render so the displayed string stays current
  void tick;
  return `${h}h ${m}m`;
}

function RankRow({ rank, user, isMe, metricKey = 'aura', metricLabel = 'aura', onGift }) {
  const [hover, setHover] = React.useState(false);
  const canGift = !isMe && !!onGift && !!window.ME?.id;
  return (
    <div
      data-focus-id={user.id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 14px', borderRadius: 12,
        background: isMe ? `${T.accent}18` : hover && canGift ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: isMe ? `0.5px solid ${T.accent}44` : '0.5px solid transparent',
        marginBottom: 2, transition: 'all .15s',
    }}>
      <div style={{ width: 24, ...TY.mono, color: rank <= 3 ? T.accentHi : T.text3, fontSize: 11 }}>
        {String(rank).padStart(2, '0')}
      </div>
      <Avatar name={user.name} src={user.avatar} size={34} ring={rank === 1}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...TY.body, color: T.text, fontWeight: 500 }}>{user.name}</span>
          {isMe && <Tag color={T.accentHi} glow>You</Tag>}
        </div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 2 }}>
          L{user.level}{user.role ? ` · ${user.role}` : ''}
        </div>
      </div>
      {/* Hover-reveal gift shortcut — materializes on the right so the user can
          send aura without opening the sidebar gift flow and re-picking the
          recipient. Hidden on your own row (can't gift yourself) and when the
          user isn't signed in. Uses visibility over conditional mount so the
          row doesn't jitter on hover. */}
      <button
        onClick={(e) => { e.stopPropagation(); onGift?.(user); }}
        title={canGift ? `Gift ${user.name.split(' ')[0]}` : ''}
        style={{
          visibility: hover && canGift ? 'visible' : 'hidden',
          opacity: hover && canGift ? 1 : 0,
          transition: 'opacity .12s',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: T.r.pill,
          background: `${T.accent}22`, border: `0.5px solid ${T.accent}55`,
          color: T.accentHi, cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
        }}
      >
        <IGift size={12}/> Gift
      </button>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...TY.numSm, color: T.text }}>{fmt(user[metricKey] || 0)}</div>
        <div style={{ ...TY.small, color: T.text3, fontSize: 10, marginTop: 2 }}>{metricLabel}</div>
      </div>
    </div>
  );
}

function FeaturedDrop({ onQuick, setView }) {
  // Pick the hero reward based on what the user can *actually* redeem, not
  // just what tokens.jsx flagged as `featured`. Priority:
  //   1. Featured reward IF unlockable (level >= req AND price <= aura) — keep
  //      editorial control when the pick is genuinely useful.
  //   2. Otherwise, the best redeemable reward (most expensive one they can
  //      afford AND meet the level req for) — this gives them an aspirational
  //      "you unlocked this" moment on the home screen.
  //   3. Otherwise, fall back to the featured one with a clear "locked" UI
  //      showing whichever gate (level or aura) is closer to being cleared.
  //   4. Otherwise any reward → show locked.
  const me = window.ME || {};
  const myLevel = me.level ?? 0;
  const myAura = me.aura ?? 0;

  const featured = REWARDS.find((x) => x.featured) || null;
  const canUnlock = (r) => myLevel >= (r.level || 0) && myAura >= (r.price || 0);

  let r = null;
  if (featured && canUnlock(featured)) {
    r = featured;
  } else {
    // Pick the most expensive reward they can fully unlock — highest price
    // is the most "earned" and makes the hero card feel like a trophy.
    const unlocked = REWARDS.filter(canUnlock).sort((a, b) => (b.price || 0) - (a.price || 0));
    r = unlocked[0] || featured || REWARDS[0];
  }
  if (!r) return null;

  const levelLocked = myLevel < (r.level || 0);
  const auraShort = myAura < (r.price || 0);
  const locked = levelLocked || auraShort;

  // Progress — the level gate blocks redemption outright, so that's the main
  // bar. But aura deficit is useful info either way (users want to know how
  // much they need to farm), so we ALSO surface it as a secondary line when
  // there's a shortfall, regardless of which gate is primary.
  let progressLabel = null;
  let progressSub = null;
  let progressPct = 100;
  const auraShortBy = Math.max(0, (r.price || 0) - myAura);
  if (levelLocked) {
    progressLabel = `L${myLevel} → L${r.level}`;
    progressSub = `${r.level - myLevel} level${r.level - myLevel === 1 ? '' : 's'} to go`;
    progressPct = Math.min(100, Math.max(0, (myLevel / (r.level || 1)) * 100));
  } else if (auraShort) {
    progressLabel = `${fmt(myAura)} / ${fmt(r.price)}`;
    progressSub = `${fmt(auraShortBy)} aura to go`;
    progressPct = Math.min(100, Math.max(0, (myAura / (r.price || 1)) * 100));
  }

  const [hover, setHover] = React.useState(false);

  return (
    <Glass
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: 20, position: 'relative', overflow: 'hidden' }}
    >
      <HoverOrbs restX={20} restY={88} size={320} color={T.accent} colorHi={T.accentHi}/>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, position: 'relative' }}>
        {locked
          ? <Tag muted><ILock size={10}/>&nbsp;{levelLocked ? `Level ${r.level}` : 'Not enough aura'}</Tag>
          : r.featured
            ? <Tag color={T.accentHi} glow>Featured</Tag>
            : <Tag color={T.green} glow>Unlocked</Tag>}
        {typeof r.stock === 'number' && r.stock <= 10 && <Tag muted>{r.stock} left</Tag>}
      </div>
      <div style={{
        height: 140, borderRadius: T.r.md, marginBottom: 14,
        background: `linear-gradient(135deg, ${T.accent}44, rgba(255,255,255,0.04))`,
        border: `0.5px solid ${T.glassBorder}`,
        position: 'relative', overflow: 'hidden',
      }}>
        {r.image ? (
          <img src={r.image} alt={r.title} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            filter: locked ? 'grayscale(0.35) brightness(0.7)' : 'none',
            transition: 'filter .3s',
          }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,0.02) 18px 19px)` }}/>
        )}
      </div>
      <h3 style={{ ...TY.h3, margin: 0, color: T.text, position: 'relative' }}>{r.title}</h3>
      <p style={{ ...TY.small, color: T.text3, margin: '4px 0 14px', position: 'relative' }}>{r.sub}</p>

      {locked && (
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...TY.small, color: T.text3, fontSize: 11, marginBottom: 6 }}>
            <span>{levelLocked ? 'Level progress' : 'Aura progress'}</span>
            <span style={{ fontFamily: T.fontMono }}>{progressLabel}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: `linear-gradient(90deg, ${T.accent}, ${T.accentHi})`,
              transition: 'width .4s',
            }}/>
          </div>
          {/* Deficit lines — noisy by default, reveal on hover. max-height
              transition fakes a smooth expand (can't animate height: auto). */}
          <div style={{
            overflow: 'hidden',
            maxHeight: hover ? 40 : 0,
            opacity: hover ? 1 : 0,
            transition: 'max-height .25s ease, opacity .2s ease',
          }}>
            {progressSub && (
              <div style={{ ...TY.small, color: T.accentHi, fontSize: 11, marginTop: 6, fontFamily: T.fontMono }}>
                {progressSub}
              </div>
            )}
            {levelLocked && auraShortBy > 0 && (
              <div style={{ ...TY.small, color: T.text3, fontSize: 11, marginTop: 3, fontFamily: T.fontMono }}>
                + {fmt(auraShortBy)} aura to go
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div>
          <span style={{ ...TY.numSm, color: T.accentHi, fontSize: 18 }}>{fmt(r.price)}</span>
          <span style={{ ...TY.small, color: T.text3, marginLeft: 4 }}>aura</span>
        </div>
        {locked
          ? <Btn variant="secondary" size="sm" onClick={() => setView?.({ id: 'store', focusId: r.id })}>
              View in store
            </Btn>
          : <Btn variant="primary" size="sm" onClick={() => onQuick.redeem(r)}>Redeem</Btn>}
      </div>
    </Glass>
  );
}

// Short relative time: "12s", "4m", "2h", "3d". Anything older → fallback date.
function relTime(ms) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(ms).toLocaleDateString();
}

// Top-level feed list. Renders from window.AURA_FEED (populated by data.jsx on
// every poll). Shows an empty state if no events yet OR if Turso isn't ready,
// and falls back to the mock FEED when auth/data aren't configured at all.
function AuraFeedList() {
  const feed = Array.isArray(window.AURA_FEED) ? window.AURA_FEED : [];
  const live = window.__liveStatus?.ready;
  const INITIAL_LIMIT = 12;
  const [expanded, setExpanded] = React.useState(false);

  if (!live) {
    // Pre-config: still useful to show SOMETHING so the home page isn't blank.
    return FEED.map((f, i) => <FeedItem key={i} f={f} last={i === FEED.length - 1}/>);
  }
  if (feed.length === 0) {
    return (
      <div style={{ padding: '36px 12px', textAlign: 'center' }}>
        <div style={{ ...TY.body, color: T.text2 }}>{t('home.noFeed')}</div>
        <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
          {t('home.noFeedSub')}
        </div>
      </div>
    );
  }

  const visible = expanded ? feed : feed.slice(0, INITIAL_LIMIT);
  const hidden = feed.length - visible.length;

  return (
    <>
      {visible.map((e, i) => (
        <AuraFeedEntry key={e.id} e={e} last={i === visible.length - 1 && hidden === 0}/>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%', textAlign: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.text3, fontFamily: T.fontSans, fontSize: 12,
            padding: '14px 0', transition: 'color .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
        >
          Show {hidden} more
        </button>
      )}
      {expanded && feed.length > INITIAL_LIMIT && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            width: '100%', textAlign: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.text3, fontFamily: T.fontSans, fontSize: 12,
            padding: '14px 0', transition: 'color .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = T.text}
          onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
        >
          Show less
        </button>
      )}
    </>
  );
}

// Mock-shape item (tokens.jsx FEED). Kept for the pre-config fallback path only.
function FeedItem({ f, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 0',
      borderBottom: last ? 'none' : `0.5px solid ${T.glassBorder}`,
    }}>
      <Avatar name={f.who} size={30}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.small, color: T.text2, lineHeight: 1.35 }}>
          <span style={{ color: T.text, fontWeight: 500 }}>{f.who.split(' ')[0]}</span>
          <span style={{ margin: '0 4px' }}>→</span>
          <span style={{ color: T.text, fontWeight: 500 }}>{f.to.split(' ')[0]}</span>
        </div>
        {f.note && <div style={{ ...TY.small, color: T.text3, marginTop: 1, fontSize: 12 }}>"{f.note}"</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...TY.numSm, color: T.accentHi, fontSize: 13 }}>+{fmt(f.amount)}</div>
        <div style={{ ...TY.small, color: T.text4, fontSize: 10 }}>{f.time}</div>
      </div>
    </div>
  );
}

// Real-data feed entry. Shape from data.jsx fetchOnce:
// { kind, fromId, toId, amount, note, at (ms), fromName, fromAvatar, toName, toAvatar }
// Kind-specific rendering:
//   gift          → "Alex → Mari" with optional note
//   daily_tag     → "Mari claimed ELY tag bonus"
//   daily_booster → "Mari claimed server boost"
//   gym_post      → "Mari gym post" (+ streak note if any)
//   postjob       → "Mari posted a job"
//   available     → "Mari marked available"
//   redeem        → "Mari redeemed <title>" — shown as a spend (negative)
function AuraFeedEntry({ e, last }) {
  const toName = e.toName || 'User';
  const toFirst = toName.split(' ')[0];
  const fromName = e.fromName || 'User';
  const fromFirst = fromName.split(' ')[0];

  // The avatar + middle-line are kind-dependent.
  let avatar, line, subtitle;
  // Redemptions are a spend, not a grant — render the amount negative so the
  // feed reads like a ledger. Everything else (gifts, claims, gym) is +.
  let negative = false;
  switch (e.kind) {
    case 'gift':
      avatar = <Avatar name={fromName} src={e.fromAvatar} size={30}/>;
      line = (
        <>
          <span style={{ color: T.text, fontWeight: 500 }}>{fromFirst}</span>
          <span style={{ margin: '0 4px' }}>→</span>
          <span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span>
        </>
      );
      subtitle = e.note;
      break;
    case 'daily_tag':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.claimedTag')}</span></>;
      break;
    case 'daily_booster':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.claimedBooster')}</span></>;
      break;
    case 'gym_post':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.gymPost')}</span></>;
      subtitle = e.note; // streak milestone if any
      break;
    case 'postjob':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.postedJob')}</span></>;
      break;
    case 'available':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.markedAvailable')}</span></>;
      break;
    case 'redeem':
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {t('feed.redeemed')}</span>{e.note ? <span style={{ color: T.text, fontWeight: 500 }}> {e.note}</span> : null}</>;
      negative = true;
      break;
    default:
      avatar = <Avatar name={toName} src={e.toAvatar} size={30}/>;
      line = <><span style={{ color: T.text, fontWeight: 500 }}>{toFirst}</span><span style={{ color: T.text3 }}> {e.kind}</span></>;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 0',
      borderBottom: last ? 'none' : `0.5px solid ${T.glassBorder}`,
    }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TY.small, color: T.text2, lineHeight: 1.35 }}>{line}</div>
        {subtitle && <div style={{ ...TY.small, color: T.text3, marginTop: 1, fontSize: 12 }}>"{subtitle}"</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...TY.numSm, color: negative ? T.text3 : T.accentHi, fontSize: 13 }}>
          {negative ? '−' : '+'}{fmt(Math.abs(e.amount))}
        </div>
        <div style={{ ...TY.small, color: T.text4, fontSize: 10 }}>{relTime(e.at)}</div>
      </div>
    </div>
  );
}

// Destructuring renames the prop `t` (trophy) to `tr` so the global i18n `t()`
// isn't shadowed inside this component.
function MiniTrophy({ t: tr }) {
  return (
    <Glass style={{ padding: 14, opacity: tr.unlocked ? 1 : 0.45, overflow: 'hidden', position: 'relative' }}>
      {tr.unlocked && <HoverOrbs restX={85} restY={15} size={180} color={T.accent} colorHi={T.accentHi}/>}
      <div style={{
        width: 34, height: 34, borderRadius: 10, marginBottom: 12,
        background: tr.unlocked ? `${T.accent}33` : 'rgba(255,255,255,0.05)',
        border: `0.5px solid ${tr.unlocked ? T.accent + '66' : T.glassBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tr.unlocked ? T.accentHi : T.text3, position: 'relative',
      }}><ITrophy size={16}/></div>
      <div style={{ ...TY.small, color: T.text, fontWeight: 500, lineHeight: 1.25, position: 'relative' }}>{tr.name}</div>
      <div style={{ ...TY.small, color: T.text2, marginTop: 3, fontSize: 11 }}>{tr.unlocked ? t('trophies.earnedBadge') : `${Math.round(tr.progress/tr.total*100)}%`}</div>
    </Glass>
  );
}

// ────────────── Leaderboard ──────────────
// Scroll to + flash-highlight an element by [data-focus-id] when `focusId`
// changes. Used by search-driven navigation so clicking "Adobe CC" in the
// search dropdown takes you to Store AND visibly points the item out.
// The CSS keyframe `focusPulse` is defined inline in index.html.
function useFocusHighlight(focusId) {
  React.useEffect(() => {
    if (!focusId) return;
    // rAF so the view has painted its rows before we query for them.
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-focus-id="${CSS.escape(String(focusId))}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('focus-pulse');
      setTimeout(() => el.classList.remove('focus-pulse'), 2200);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusId]);
}

// Subtle "jump to you" pill — only visible when the viewer is ranked #4 or
// lower in the currently-shown ordering. Reuses the same [data-focus-id]
// selector + focus-pulse CSS class that the global search navigation uses,
// so the interaction feels consistent: smooth scroll + brief highlight.
function JumpToMeButton({ members }) {
  const myId = window.ME?.id;
  const [hover, setHover] = React.useState(false);
  if (!myId) return null;
  const myIdx = members.findIndex((m) => m.id === myId);
  if (myIdx < 3) return null; // on top-3 card grid already, button would be noise
  const rank = myIdx + 1;
  const onClick = () => {
    const el = document.querySelector(`[data-focus-id="${CSS.escape(String(myId))}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('focus-pulse');
    setTimeout(() => el.classList.remove('focus-pulse'), 2200);
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...TY.small,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        borderRadius: T.r.pill,
        border: `0.5px solid ${hover ? T.glassBorder2 : T.glassBorder}`,
        background: hover ? T.glassBg2 : T.glassBg,
        color: T.text,
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
      title="Scroll to your row"
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accentHi, boxShadow: `0 0 8px ${T.accentGlow}` }}/>
      <span style={{ color: T.text2 }}>{t('lb.jumpToMe') || 'Jump to you'}</span>
      <span style={{ ...TY.numSm, color: T.accentHi }}>#{rank}</span>
    </button>
  );
}

function LeaderboardView({ state, focusId, onQuick }) {
  // Zodiac gate — delegates to the celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacLeaderboardView) {
    return <window.ZodiacLeaderboardView state={state} focusId={focusId} onQuick={onQuick}/>;
  }
  useFocusHighlight(focusId);
  // Only categories we actually have data for: Overall (total xp) and Gym
  // (gym_posts). Deals and Voice were fake multipliers before — ripped them
  // out instead of lying. Time window removed for the same reason: we don't
  // log per-day XP history, only current totals.
  const [category, setCategory] = React.useState('overall');
  const metricKey = category === 'gym' ? 'gymPosts' : 'aura';
  const metricLabel = category === 'gym' ? 'posts' : 'aura';
  const ordered = React.useMemo(() => {
    const list = [...MEMBERS];
    list.sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
    // For Gym, only show people who've actually posted — otherwise a tail of
    // zeros dominates the board.
    return category === 'gym' ? list.filter((u) => (u.gymPosts || 0) > 0) : list;
  }, [category, metricKey]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>{t('lb.ranking')}</div>
          <h1 style={{ ...TY.h1, margin: 0 }}>{t('lb.title')}<span style={{ color: T.accentHi }}>.</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* "Jump to you" — only surfaces when you're off the initial fold
              (below top 3 card grid, so rank >= 4) so there's actual scrolling
              value. Clicking scrolls the row into view and triggers the pulse
              via the same data-focus-id selector the search uses. */}
          <JumpToMeButton members={ordered}/>
          <Segmented value={category} onChange={setCategory} options={[
            { value: 'overall', label: t('lb.overall') }, { value: 'gym', label: t('lb.gym') },
          ]}/>
        </div>
      </div>

      {ordered.length === 0 && (
        <Glass style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ ...TY.body, color: T.text2 }}>
            {category === 'gym' ? t('lb.emptyGym') : t('lb.empty')}
          </div>
          <div style={{ ...TY.small, color: T.text3, marginTop: 6 }}>
            {category === 'gym' ? t('lb.emptyGymSub') : t('lb.emptySub')}
          </div>
        </Glass>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        {ordered.slice(0,3).map((u, i) => {
          const medal = ['#FFB84D', '#D0D5DB', '#C77D4D'][i];
          return (
            <Glass key={u.id} data-focus-id={u.id} style={{
              padding: 22, position: 'relative', overflow: 'hidden',
              transform: i === 0 ? 'translateY(-6px)' : 'none',
              borderColor: i === 0 ? `${T.accent}55` : T.glassBorder,
            }}>
              {/* All three podium cards get a hover-tracking orb so the row
                  feels interactive as a unit. #1 uses the accent hue; #2/#3
                  use the medal hue so each card has its own identity. */}
              <HoverOrbs
                restX={80} restY={20}
                size={i === 0 ? 360 : 260}
                color={i === 0 ? T.accent : medal}
                colorHi={i === 0 ? T.accentHi : medal}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: medal, color: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.fontMono, fontSize: 12, fontWeight: 600,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px ${medal}55`,
                }}>{i+1}</div>
                <Delta value={u.delta}/>
              </div>
              <Avatar name={u.name} src={u.avatar} size={56} ring={i === 0}/>
              <div style={{ ...TY.h3, margin: '14px 0 4px', position: 'relative' }}>{u.name}</div>
              <div style={{ ...TY.small, color: T.text3, marginBottom: 16 }}>@{u.tag} · L{u.level}</div>
              <div style={{ ...TY.numMed, color: i === 0 ? T.accentHi : T.text, fontSize: 26, position: 'relative' }}>{fmt(u[metricKey] || 0)}</div>
              <div style={{ ...TY.small, color: T.text3 }}>{metricLabel}</div>
            </Glass>
          );
        })}
      </div>

      <Glass style={{ padding: 6, overflow: 'hidden' }}>
        {ordered.slice(3).map((u, i) => (
          <RankRow
            key={u.id}
            rank={i+4}
            user={u}
            isMe={u.id === (window.ME?.id)}
            metricKey={metricKey}
            metricLabel={metricLabel}
            onGift={onQuick?.gift}
          />
        ))}
      </Glass>
    </div>
  );
}


// ────────────── Trophies ──────────────
// Derive trophies from the signed-in user's real stats. Reads window.ME which
// data.jsx populates on every poll with voiceSeconds, gymPosts, gymStreakBest,
// gymRank, totalGiftsSent, postjobCount, founderRedeemed. Falls back to 0 for
// everything when ME isn't ready yet (pre-auth) so all trophies show as 0%.
//
// Each trophy returns { id, name, desc, progress, total, unlocked }. progress
// is clamped to total so the bar can't overflow; unlocked is derived.
function deriveTrophies(me) {
  const m = me || {};
  const voiceHours = Math.floor((m.voiceSeconds || 0) / 3600);
  const trophies = [
    {
      id: 't1', name: 'First Deal',
      desc: 'Post a job in #hiring',
      progress: Math.min(m.postjobCount || 0, 1),
      total: 1,
    },
    {
      id: 't2', name: 'Iron Streak',
      desc: '30-day gym streak',
      progress: Math.min(m.gymStreakBest || 0, 30),
      total: 30,
    },
    {
      id: 't3', name: 'Gym Royalty',
      desc: 'Top 3 in gym leaderboard',
      progress: (m.gymRank && m.gymRank <= 3) ? 1 : 0,
      total: 1,
    },
    {
      id: 't4', name: 'Philanthropist',
      desc: 'Gift 50,000 aura total',
      progress: Math.min(m.totalGiftsSent || 0, 50000),
      total: 50000,
    },
    {
      id: 't5', name: 'Voice Veteran',
      desc: '100h in voice channels',
      progress: Math.min(voiceHours, 100),
      total: 100,
    },
    {
      id: 't6', name: "Founder's Table",
      desc: '1:1 with Diogo',
      progress: m.founderRedeemed ? 1 : 0,
      total: 1,
    },
  ];
  return trophies.map((t) => ({ ...t, unlocked: t.total > 0 && t.progress >= t.total }));
}

function TrophiesView({ focusId }) {
  // Zodiac gate — delegates to the celestial variant. Original below untouched.
  if (T.zodiac && window.ZodiacTrophiesView) {
    return <window.ZodiacTrophiesView focusId={focusId}/>;
  }
  useFocusHighlight(focusId);
  // Re-read ME on every render. The App-level __subscribeLive hook force-updates
  // this component whenever window.ME is patched by data.jsx, so this stays in
  // sync with live data without needing local state.
  const trophies = deriveTrophies(window.ME);
  const earnedCount = trophies.filter((tr) => tr.unlocked).length;
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...TY.micro, color: T.text3, marginBottom: 10 }}>
          {t('trophies.trophies')} · {earnedCount}/{trophies.length} {t('trophies.earnedCount')}
        </div>
        <h1 style={{ ...TY.h1, margin: 0 }}>{t('trophies.title')}<span style={{ color: T.accentHi }}>.</span></h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {trophies.map(tr => (
          <Glass key={tr.id} data-focus-id={tr.id} hover style={{ padding: 20, opacity: tr.unlocked ? 1 : 0.5, overflow: 'hidden', position: 'relative' }}>
            {tr.unlocked && <HoverOrbs restX={85} restY={18} size={260} color={T.accent} colorHi={T.accentHi}/>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: tr.unlocked ? `linear-gradient(135deg, ${T.accent}44, ${T.accent}22)` : 'rgba(255,255,255,0.05)',
                border: `0.5px solid ${tr.unlocked ? `${T.accent}66` : T.glassBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tr.unlocked ? T.accentHi : T.text3,
                boxShadow: tr.unlocked ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px ${T.accentGlow}` : 'none',
              }}><ITrophy size={22}/></div>
              {!tr.unlocked && <ILock size={14} color={T.text3}/>}
            </div>
            <div style={{ ...TY.body, color: T.text, fontWeight: 500, position: 'relative' }}>{tr.name}</div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 4, marginBottom: 16, minHeight: 32 }}>{tr.desc}</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${(tr.progress/tr.total)*100}%`, height: '100%',
                background: tr.unlocked ? `linear-gradient(90deg, ${T.accent}, ${T.accentHi})` : T.text3,
                boxShadow: tr.unlocked ? `0 0 8px ${T.accentGlow}` : 'none',
              }}/>
            </div>
            <div style={{ ...TY.small, color: T.text3, marginTop: 8, fontFamily: T.fontMono, fontSize: 11 }}>
              {fmt(tr.progress)} / {fmt(tr.total)}
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

