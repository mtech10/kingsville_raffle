import { AlertCircle, ArrowLeft, Check, Crown, Loader2, Maximize2, Minimize2, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Confetti from '../components/Confetti';
import SlotReveal from '../components/draw/SlotReveal';
import Logo from '../components/Logo';
import { useAdminApi } from '../hooks/useAuth';
import { formatNumber, maskPhone } from '../lib/format';
import { sound } from '../lib/sound';

/**
 * Live Draw stage — built to be projected.
 *
 * The server draws (crypto.randomInt) and commits the win BEFORE the animation finishes; the browser only
 * choreographs the reveal. Minimum spin time keeps the suspense even though the API answers in milliseconds.
 */
const MIN_SPIN_MS = 2800;
const CONFETTI_MS = 8000;
const ARM_MS = 4000; // grand prize needs a second click within this window
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function LiveDraw() {
  const adminApi = useAdminApi();

  const [state, setState] = useState(null); // { prizes, nextPrizeId, eligibleCount, ticketDigits, canDraw, blockedReason }
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | spinning | revealing | done
  const [result, setResult] = useState(null); // server response for the current draw
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(0);
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const armTimer = useRef(null);
  const confettiTimer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([adminApi.drawState(), adminApi.drawHistory()]);
      setState(s);
      setHistory(h.data);
      // Keep the current choice if it still has slots left, otherwise jump to the next prize in line.
      setSelectedId((cur) => (s.prizes.some((p) => p.id === cur && p.remaining > 0) ? cur : s.nextPrizeId));
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err.message || 'Could not load the draw.');
    }
  }, [adminApi]);

  useEffect(() => {
    refresh();
    return () => {
      sound.stopTicks();
      clearTimeout(armTimer.current);
      clearTimeout(confettiTimer.current);
    };
  }, [refresh]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const play = (fn) => {
    if (!mutedRef.current) fn();
  };

  const selected = state?.prizes.find((p) => p.id === selectedId) ?? null;
  const busy = phase === 'spinning' || phase === 'revealing';
  const canPress = Boolean(state?.canDraw && selected && selected.remaining > 0 && !busy);

  async function startDraw() {
    if (!canPress) return;

    // Grand prize: require a deliberate second click so nobody triggers it by accident on stage.
    if (selected.isGrand && !armed) {
      setArmed(true);
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    clearTimeout(armTimer.current);
    setArmed(false);

    setError('');
    setResult(null);
    setPhase('spinning');
    play(() => {
      sound.unlock();
      sound.click();
      sound.startTicks();
    });

    try {
      const [res] = await Promise.all([adminApi.draw(selected.id), sleep(MIN_SPIN_MS)]);
      setResult(res);
      setPhase('revealing');
    } catch (err) {
      sound.stopTicks();
      setPhase('idle');
      setError(err.message || 'The draw failed. Check the winners list before trying again.');
      refresh(); // the server is the source of truth, including after a dropped connection
    }
  }

  function onSettled() {
    sound.stopTicks();
    play(() => sound.fanfare());
    setPhase('done');
    setCelebrate((n) => n + 1);
    clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setCelebrate(0), CONFETTI_MS);
    refresh();
  }

  const winner = result?.winner;
  // After a draw, refresh() advances `selected` to the next prize; the headline must keep showing the prize just drawn.
  const headline = phase === 'done' && result?.prize ? result.prize : selected;
  const showWinner = phase === 'done' && winner;
  const buttonLabel = busy
    ? 'Drawing…'
    : armed
      ? 'Click again to draw the GRAND PRIZE'
      : selected?.isGrand
        ? 'Draw the Grand Prize'
        : phase === 'done'
          ? 'Draw next winner'
          : 'Draw winner';

  return (
    <div className="bg-estate relative flex min-h-screen flex-col text-white">
      {celebrate > 0 && <Confetti key={celebrate} pieces={140} />}

      {/* top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-emerald-100/70 hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
          </Link>
          <Logo className="hidden sm:flex" />
        </div>
        <div className="flex items-center gap-2">
          {state && (
            <span className="rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-sm font-semibold text-gold-200 tabular-nums">
              {formatNumber(state.eligibleCount)} tickets in the pool
            </span>
          )}
          <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'} className="rounded-lg p-2.5 text-emerald-100/80 hover:bg-white/10">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen for projector'} className="rounded-lg p-2.5 text-emerald-100/80 hover:bg-white/10">
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* stage */}
      <main className="flex flex-1 flex-col items-center px-4 pb-10 sm:px-8">
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[.35em] text-gold-300 sm:text-sm">Kingsville Estate · Raffle Draw</p>

        <div className="mt-6 text-center" aria-live="polite">
          {headline ? (
            <>
              <p className="text-sm uppercase tracking-[.25em] text-emerald-100/70">{phase === 'done' ? 'Winner of' : 'Now drawing'}</p>
              <h1 className={`mt-1 font-display font-bold ${headline.isGrand ? 'gold-text text-4xl sm:text-6xl' : 'text-3xl text-white sm:text-5xl'}`}>
                {headline.isGrand && <Crown className="mr-3 inline h-8 w-8 -translate-y-1 text-gold-300 sm:h-11 sm:w-11" aria-hidden="true" />}
                {headline.name}
              </h1>
            </>
          ) : state ? (
            <h1 className="font-display text-3xl font-bold text-gold-200 sm:text-5xl">{state.prizes.length && !state.nextPrizeId ? 'All prizes awarded 🎉' : 'Live Draw'}</h1>
          ) : (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold-300" aria-label="Loading" />
          )}
        </div>

        {/* the machine */}
        <div className="mt-8 w-full max-w-5xl rounded-[2rem] border border-gold-400/40 bg-gradient-to-b from-emerald-900/70 to-emerald-950/90 p-6 shadow-glow sm:p-10">
          <SlotReveal phase={phase} ticket={phase === 'revealing' || phase === 'done' ? winner?.ticketNumber : null} digits={state?.ticketDigits ?? 3} onSettled={onSettled} />
        </div>

        {/* winner card */}
        <div className="mt-6 flex min-h-[7.5rem] w-full max-w-3xl items-center justify-center">
          {showWinner && (
            <div className="animate-fade-up animate-winner-glow w-full rounded-2xl border border-gold-400/50 bg-emerald-950/70 px-6 py-5 text-center">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-gold-300">
                <Trophy className="h-4 w-4" aria-hidden="true" /> Congratulations
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-white sm:text-5xl">{winner.name}</p>
              <p className="mt-1 text-sm text-emerald-100/70">
                {winner.ticketNumber} · {maskPhone(winner.phone)} · wins <span className="font-semibold text-gold-200">{result.prize.name}</span>
              </p>
            </div>
          )}
          {busy && <p className="animate-pulse text-lg tracking-widest text-gold-200">{phase === 'spinning' ? 'Shuffling every ticket…' : 'And the winning ticket is…'}</p>}
        </div>

        {error && (
          <div role="alert" className="mt-2 flex max-w-xl items-start gap-2 rounded-xl border border-red-400/40 bg-red-950/60 p-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}
        {state?.blockedReason && !error && (
          <div role="status" className="mt-2 max-w-xl rounded-xl border border-gold-400/40 bg-gold-400/10 p-3 text-center text-sm text-gold-100">{state.blockedReason}</div>
        )}

        {/* controls */}
        <div className="mt-4 flex w-full max-w-4xl flex-col items-center gap-5">
          <button
            type="button"
            onClick={startDraw}
            disabled={!canPress}
            className={`btn-gold min-w-[16rem] px-10 py-4 text-lg ${armed ? 'animate-ring-pulse' : ''}`}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
            {buttonLabel}
          </button>

          {state && (
            <fieldset disabled={busy} className="w-full">
              <legend className="mb-3 w-full text-center text-xs font-semibold uppercase tracking-[.25em] text-emerald-100/60">Choose prize</legend>
              <div className="flex flex-wrap justify-center gap-2">
                {state.prizes.map((p) => {
                  const out = p.remaining === 0;
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedId(p.id);
                        setArmed(false);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        active
                          ? 'border-gold-300 bg-gold-400 text-emerald-950'
                          : out
                            ? 'border-white/10 bg-white/5 text-emerald-100/40 line-through'
                            : 'border-gold-400/30 bg-emerald-900/60 text-emerald-50 hover:border-gold-300'
                      }`}
                    >
                      {out ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : p.isGrand ? <Crown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      {p.name}
                      {p.quantity > 1 && <span className="opacity-70">×{p.remaining}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        {/* winners so far */}
        {history.length > 0 && (
          <section aria-labelledby="winners-title" className="mt-10 w-full max-w-4xl">
            <h2 id="winners-title" className="mb-3 text-center text-xs font-semibold uppercase tracking-[.25em] text-gold-300">Winners so far</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {history.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-gold-400/20 bg-emerald-950/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{w.winnerName}</p>
                    <p className="text-xs text-emerald-100/60">{w.prizeName}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-gold-400/15 px-2.5 py-1 font-mono text-sm font-bold text-gold-200">{w.ticketNumber}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
