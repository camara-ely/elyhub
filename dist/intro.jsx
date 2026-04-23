// intro.jsx — first-launch cinematic.
//
// Self-contained: shows once per machine (elyhub.introSeen.v1), then flips
// localStorage and stays out of the way. Extracted from app.jsx in the
// modularization pass. App.jsx consumes IntroSequence by name after checking
// hasSeenIntro() / markIntroSeen().

// ──────────────── Intro sequence ────────────────
// First-time-launch cinematic. Arc-browser-ish vibe: deep black → ambient
// orbs bloom → "ElyHub." wordmark scales in with expo-out easing → tagline
// fades under it → whole thing scales up and dissolves into the LoginGate.
// Runs ONCE per install (localStorage flag) unless the user nukes it.
// Skippable with any click or key press — never trap people in the intro.
//
// Audio: tries to play assets/intro.mp3 at low volume. WKWebView on first
// launch blocks autoplay without user gesture, so we also wire the
// first-interaction listener to kick playback — if the user clicks to skip,
// the sound starts for the remainder. File is optional; missing/unavailable
// just means silent intro. Drop a soft ambient track at assets/intro.mp3.
const INTRO_KEY = 'ely:introPlayed';
function hasSeenIntro() { try { return !!localStorage.getItem(INTRO_KEY); } catch { return true; } }
function markIntroSeen() { try { localStorage.setItem(INTRO_KEY, '1'); } catch {} }

// Dev shortcut: Shift+R clears the intro flag and reloads, so you can
// iterate on the animation without DevTools gymnastics. Harmless in
// production — users discover it only by accident, and worst case they
// see the intro once more. Also exposes a global helper in case someone
// prefers the console: window.replayIntro().
if (typeof window !== 'undefined' && !window.__introDevHooked) {
  window.__introDevHooked = true;
  window.replayIntro = () => { try { localStorage.removeItem(INTRO_KEY); } catch {} location.reload(); };
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'R' || e.key === 'r') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Only if nothing editable has focus — don't hijack shift+r inside inputs
      const t = document.activeElement;
      const tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      window.replayIntro();
    }
  });
}

// Expo-out easing — same curve Arc & Apple use for "reveal" motions. Starts
// fast, decelerates into place. The 0.19,1,0.22,1 knot keeps the last ~30%
// of the animation smooth enough to read as "settling" rather than stopping.
const EASE_EXPO_OUT = 'cubic-bezier(0.19, 1, 0.22, 1)';

function IntroSequence({ onFadeStart, onDone }) {
  // Phases drive the CSS transitions:
  //   0 — black frame (pre-paint, 1 rAF)
  //   1 — orbs bloom in
  //   2 — wordmark scales up + fades
  //   3 — tagline fades under wordmark
  //   4 — whole composition scales + fades, gate takes over
  //
  // Phase 4 is split from the unmount: onFadeStart fires when we enter it,
  // letting the parent mount the LoginGate UNDERNEATH the intro. Since the
  // gate has its own ~900ms entrance animation and the intro takes ~900ms
  // to dissolve, running them simultaneously gives a true crossfade instead
  // of a sequential "intro gone → gate appears" gap.
  const [phase, setPhase] = React.useState(0);
  const audioRef = React.useRef(null);
  const doneRef = React.useRef(false);
  const fadeStartedRef = React.useRef(false);
  const FADE_MS = 900; // keep in sync with the composite transition below

  // Keep the latest callbacks in refs. The main timer useEffect MUST have
  // [] deps — otherwise when the parent re-renders (e.g. onFadeStart fires
  // and sets state up there), fresh callback identities would invalidate
  // useCallback deps, retrigger the timer effect, and restart the intro
  // animation mid-flight. This pattern is the canonical "stable callback"
  // escape hatch.
  const onFadeStartRef = React.useRef(onFadeStart);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => { onFadeStartRef.current = onFadeStart; }, [onFadeStart]);
  React.useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Kick off the dissolve. Safe to call twice — second call is a no-op.
  // Used both by the auto-play timer and by the click/key skip path, so the
  // skip also gets a smooth fade instead of a hard cut. Stable identity
  // (empty deps) so consumers don't cascade re-runs.
  const beginFade = React.useCallback(() => {
    if (fadeStartedRef.current) return;
    fadeStartedRef.current = true;
    setPhase(4);
    try { onFadeStartRef.current?.(); } catch {}
  }, []);

  const finish = React.useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      const a = audioRef.current;
      if (a) {
        // Fade audio out over ~400ms — abrupt cut on a cinematic intro feels
        // cheap. Clamp volume to 0 then pause when done.
        const start = a.volume;
        const steps = 8;
        let i = 0;
        const iv = setInterval(() => {
          i += 1;
          a.volume = Math.max(0, start * (1 - i / steps));
          if (i >= steps) { clearInterval(iv); try { a.pause(); } catch {} }
        }, 50);
      }
    } catch {}
    try { onDoneRef.current?.(); } catch {}
  }, []);

  // Master timeline — runs exactly once on mount. Any props change on the
  // parent does NOT retrigger this effect (all callbacks above are stable),
  // so phase transitions proceed in real time from mount with no resets.
  React.useEffect(() => {
    try {
      const a = new Audio('assets/intro.mp3');
      a.volume = 0.32;
      a.preload = 'auto';
      audioRef.current = a;
      a.play().catch(() => { /* autoplay blocked — fine, stays silent */ });
    } catch {}

    // Auto-advance only through phases 1-3 (bloom → wordmark → tagline).
    // The dissolve/unmount is user-driven — intro sits on phase 3
    // indefinitely until the user clicks or presses a key. Gives people
    // time to actually read the tagline and makes the transition feel
    // intentional rather than a fleeting splash.
    const timers = [
      setTimeout(() => setPhase(1),  40),             // orbs bloom
      setTimeout(() => setPhase(2), 900),             // wordmark
      setTimeout(() => setPhase(3), 2400),            // tagline
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps — refs make these stable, [] is correct
  }, []);

  // Skip handler — any click or key. Also doubles as a gesture that unlocks
  // audio playback if the autoplay was blocked earlier. On skip we still
  // run the dissolve (just immediately) so the transition into the gate
  // stays smooth — no hard cut to a cold gate screen.
  const tryUnlockAudio = () => {
    const a = audioRef.current;
    if (a && a.paused && !doneRef.current) {
      a.play().catch(() => {});
    }
  };
  const skip = React.useCallback(() => {
    if (doneRef.current) return;
    beginFade();
    setTimeout(() => finish(), FADE_MS + 100);
  }, [beginFade, finish]);
  React.useEffect(() => {
    const onKey = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  // Global-scale dissolve: in phase 4 we scale the whole scene up by a hair
  // and fade opacity. Feels like the view is "zooming past" the wordmark
  // rather than just fading, which is what Arc does on their intro.
  // pointerEvents turns off during the fade so the gate mounted underneath
  // is immediately clickable — otherwise the transparent intro overlay
  // would swallow the first click on the Continue with Discord button.
  const composite = {
    opacity: phase >= 4 ? 0 : 1,
    transform: phase >= 4 ? 'scale(1.06)' : 'scale(1)',
    transition: `opacity 900ms ${EASE_EXPO_OUT}, transform 1000ms ${EASE_EXPO_OUT}`,
    pointerEvents: phase >= 4 ? 'none' : 'auto',
  };

  // Letter-stagger reveal for the wordmark. Each char animates with its own
  // delay, giving the hero text a "typing" feel without actually typing.
  // The period gets a separate accent color + looping pulse once everything
  // has landed — it's the heartbeat of the scene.
  const WORDMARK = 'ElyHub.';

  return (
    <div
      onClick={() => { tryUnlockAudio(); skip(); }}
      style={{
        position: 'fixed', inset: 0,
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 10000,
        overflow: 'hidden',
        ...composite,
      }}
    >
      {/* Keyframes for continuous ambient motion. Scoped inside the intro so
          they don't leak into the rest of the app. orbDriftA/B are offset so
          the two orbs breathe out-of-phase — one inhales while the other
          exhales, producing constant but non-repetitive motion.
          periodPulse gives the trailing "." a slow heartbeat once the
          wordmark has settled. */}
      <style>{`
        @keyframes orbDriftA {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(40px, -30px) scale(1.08); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes orbDriftB {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-35px, 25px) scale(1.06); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes periodPulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%      { transform: scale(1.18); opacity: 0.82; }
        }
        @keyframes lineDraw {
          0%   { transform: scaleX(0); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>

      {/* Ambient orbs — outer wrapper handles phase-based bloom (opacity +
          initial scale). Inner child runs a continuous infinite drift
          animation independent of React state, so the scene keeps breathing
          while the user reads. Two orbs with offset cycles (13s vs 17s) so
          the combined motion never exactly repeats during the intro. */}
      <div style={{
        position: 'absolute', top: '25%', left: '30%',
        width: 560, height: 560,
        opacity: phase >= 1 ? 0.9 : 0,
        transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
        transition: `opacity 1400ms ${EASE_EXPO_OUT}, transform 1800ms ${EASE_EXPO_OUT}`,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: `radial-gradient(circle, ${T.accentGlow}, transparent 70%)`,
          filter: 'blur(120px)',
          animation: phase >= 1 ? 'orbDriftA 13s ease-in-out infinite' : 'none',
        }}/>
      </div>
      <div style={{
        position: 'absolute', bottom: '18%', right: '22%',
        width: 480, height: 480,
        opacity: phase >= 1 ? 0.75 : 0,
        transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
        transition: `opacity 1600ms ${EASE_EXPO_OUT} 150ms, transform 2000ms ${EASE_EXPO_OUT}`,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,157,255,0.55), transparent 70%)',
          filter: 'blur(130px)',
          animation: phase >= 1 ? 'orbDriftB 17s ease-in-out infinite' : 'none',
        }}/>
      </div>

      {/* Subtle vignette — keeps attention centred on the wordmark. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }}/>

      <div style={{
        position: 'relative',
        textAlign: 'center',
        padding: 24,
      }}>
        {/* Cinematic accent line — thin accent-colored bar that scales from
            center outward just before the wordmark lands. 160ms earlier than
            the first letter so it reads as a "curtain rising". */}
        <div style={{
          height: 1,
          width: 120,
          margin: '0 auto 48px',
          background: `linear-gradient(90deg, transparent, ${T.accentHi}, transparent)`,
          transform: phase >= 2 ? 'scaleX(1)' : 'scaleX(0)',
          opacity: phase >= 2 ? 1 : 0,
          transition: `transform 1000ms ${EASE_EXPO_OUT}, opacity 600ms ${EASE_EXPO_OUT}`,
          boxShadow: phase >= 2 ? `0 0 12px ${T.accentGlow}` : 'none',
        }}/>

        {/* Letter-stagger wordmark. Each char gets its own delay off the
            phase-2 trigger — the serif period at the end keeps the accent
            color and, once settled, loops a slow heartbeat pulse. */}
        <div style={{
          ...TY.display,
          fontSize: 140,
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
          display: 'inline-block',
          // Ambient text glow, fades in with the first letter.
          textShadow: phase >= 2 ? `0 0 80px rgba(255,255,255,0.18)` : 'none',
          transition: `text-shadow 1200ms ${EASE_EXPO_OUT}`,
        }}>
          {WORDMARK.split('').map((ch, i) => {
            const isPeriod = ch === '.';
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: isPeriod ? T.accentHi : T.text,
                  opacity: phase >= 2 ? 1 : 0,
                  transform: phase >= 2 ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.9)',
                  transition: `opacity 900ms ${EASE_EXPO_OUT} ${i * 85}ms, transform 1100ms ${EASE_EXPO_OUT} ${i * 85}ms`,
                  // Heartbeat pulse on the period once it's in place. Starts
                  // after the tagline phase so the earlier motion doesn't
                  // compete with it.
                  animation: isPeriod && phase >= 3 ? 'periodPulse 2.6s ease-in-out infinite 400ms' : 'none',
                  willChange: 'transform, opacity',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* Tagline — fades in later, quieter. */}
        <div style={{
          ...TY.body,
          color: T.text3,
          marginTop: 36,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity 1200ms ${EASE_EXPO_OUT}, transform 1200ms ${EASE_EXPO_OUT}`,
          letterSpacing: '0.04em',
        }}>
          {t('intro.tagline') || 'A home for the community.'}
        </div>
      </div>

      {/* "Skip" hint — appears with tagline so people know it's skippable
          without being part of the first-impression frames. */}
      <div style={{
        position: 'absolute', bottom: 32, left: 0, right: 0,
        textAlign: 'center',
        ...TY.micro, color: T.text4,
        opacity: phase >= 3 ? 1 : 0,
        transition: `opacity 800ms ${EASE_EXPO_OUT}`,
      }}>
        {t('intro.skip') || 'CLICK TO CONTINUE'}
      </div>
    </div>
  );
}
