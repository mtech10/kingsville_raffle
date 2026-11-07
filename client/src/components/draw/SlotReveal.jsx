import { useEffect, useRef } from 'react';

/**
 * Slot-machine ticket reveal:  K V - [d] [d] [d]
 *
 * The winner is picked on the SERVER (crypto.randomInt) before this component ever sees it. These reels
 * only animate a result they are handed: they spin freely while `phase === 'spinning'`, then, once a `ticket`
 * arrives and `phase === 'revealing'`, each digit decelerates and locks onto its target left-to-right.
 *
 * Reels are driven by requestAnimationFrame writing `transform` straight to the DOM, so a 60fps spin never
 * triggers a React re-render. Phases:  idle -> spinning -> revealing -> done
 */

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]; // trailing 0 makes the wrap from 9 -> 0 seamless
const SPIN_SPEED = 30; // cells per second while free-spinning
const STAGGER_MS = 1100; // gap between one reel locking and the next
const BASE_STOP_MS = 1400; // first reel starts braking after this long
const BRAKE_MS = 2300; // how long each reel takes to decelerate onto its digit

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Reel({ phase, target, index, onStopped }) {
  const stripRef = useRef(null);
  const posRef = useRef(Math.random() * 10);
  const onStoppedRef = useRef(onStopped);
  onStoppedRef.current = onStopped;

  const paint = (pos, speed = 0) => {
    const el = stripRef.current;
    if (!el) return;
    const wrapped = ((pos % 10) + 10) % 10;
    el.style.transform = `translateY(${(-wrapped * 100) / CELLS.length}%)`;
    el.style.filter = speed > 4 ? `blur(${Math.min(2.5, speed * 0.07).toFixed(2)}px)` : 'none';
  };

  useEffect(() => {
    if (phase === 'idle') {
      posRef.current = 0;
      paint(0);
      return undefined;
    }
    if (phase === 'done') {
      posRef.current = target ?? 0;
      paint(posRef.current);
      return undefined;
    }

    // Reduced motion: no spinning, just land on the digit.
    if (prefersReducedMotion()) {
      if (phase === 'revealing' && target != null) {
        posRef.current = target;
        paint(target);
        const t = setTimeout(() => onStoppedRef.current?.(index), 0);
        return () => clearTimeout(t);
      }
      return undefined;
    }

    let raf = 0;
    let last = performance.now();
    const revealStart = last;
    let brake = null; // { start, from, to, duration }
    const stopAfter = BASE_STOP_MS + index * STAGGER_MS;
    const duration = BRAKE_MS + index * 250; // later reels brake a little longer: more suspense

    const frame = (now) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;

      if (phase === 'revealing' && target != null && !brake && now - revealStart >= stopAfter) {
        const from = posRef.current;
        const base = Math.ceil(from);
        // At least 20 more cells of travel, ending exactly on `target` (to % 10 === target).
        const to = base + 20 + ((target - (base % 10) + 10) % 10);
        brake = { start: now, from, to, duration };
      }

      if (brake) {
        const t = Math.min(1, (now - brake.start) / brake.duration);
        const next = brake.from + (brake.to - brake.from) * easeOutCubic(t);
        const speed = dt > 0 ? (next - posRef.current) / dt : 0;
        posRef.current = next;
        paint(next, speed);
        if (t >= 1) {
          paint(target);
          onStoppedRef.current?.(index);
          return; // reel is locked: stop the loop
        }
      } else {
        posRef.current += SPIN_SPEED * dt;
        paint(posRef.current, SPIN_SPEED);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, target, index]);

  return (
    <div
      className="relative overflow-hidden rounded-[.12em] border border-gold-400/60 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 shadow-[inset_0_0_.25em_rgba(0,0,0,.7)]"
      style={{ height: '1.1em', width: '.78em' }}
    >
      <div ref={stripRef} className="will-change-transform" style={{ height: `${CELLS.length * 1.1}em` }}>
        {CELLS.map((d, i) => (
          <div key={i} className="flex items-center justify-center font-display font-bold tabular-nums text-gold-300" style={{ height: '1.1em', lineHeight: 1 }}>
            {d}
          </div>
        ))}
      </div>
      {/* glass reflection + top/bottom shading for depth */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
    </div>
  );
}

/**
 * @param {'idle'|'spinning'|'revealing'|'done'} phase
 * @param {string|null} ticket  e.g. "KV-042" — required once phase is 'revealing'/'done'
 * @param {number} digits       how many digit reels to show before the ticket is known
 * @param {() => void} onSettled fired once, after the LAST reel has locked
 */
export default function SlotReveal({ phase, ticket, digits = 3, onSettled }) {
  const targetDigits = ticket ? ticket.replace(/\D/g, '').split('').map(Number) : null;
  const count = targetDigits ? targetDigits.length : digits;

  // Counts reels that have locked for THIS ticket. Keyed by ticket so no reset effect (and no effect-order race) is needed.
  const settled = useRef({ ticket: null, stopped: new Set() });
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const handleStopped = (index) => {
    if (settled.current.ticket !== ticket) settled.current = { ticket, stopped: new Set() };
    settled.current.stopped.add(index);
    if (settled.current.stopped.size === count) onSettledRef.current?.();
  };

  const glyph = 'font-display font-bold text-gold-200';
  return (
    <div
      role="img"
      aria-label={ticket ? `Winning ticket ${ticket}` : 'Winning ticket is being drawn'}
      className="flex items-center justify-center gap-[.08em]"
      style={{ fontSize: 'clamp(3.5rem, 13vw, 10.5rem)' }}
    >
      <span className={glyph} style={{ lineHeight: 1.1 }}>KV</span>
      <span className={`${glyph} mx-[.04em] opacity-70`} style={{ lineHeight: 1.1 }}>-</span>
      {Array.from({ length: count }, (_, i) => (
        <Reel key={`${count}-${i}`} index={i} phase={phase} target={targetDigits ? targetDigits[i] : null} onStopped={handleStopped} />
      ))}
    </div>
  );
}
