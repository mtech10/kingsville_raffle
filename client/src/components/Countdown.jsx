const pad = (n) => String(n).padStart(2, '0');

/**
 * Presentational countdown. Pass the object returned by useCountdown().
 * `tone="dark"` for emerald backgrounds, `tone="light"` for white cards.
 */
export default function Countdown({ countdown, tone = 'light' }) {
  const { days, hours, minutes, seconds } = countdown;
  const units = [
    ['Days', String(days)],
    ['Hours', pad(hours)],
    ['Minutes', pad(minutes)],
    ['Seconds', pad(seconds)],
  ];
  const dark = tone === 'dark';

  return (
    <div
      role="timer"
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds remaining`}
      className="grid grid-cols-4 gap-2 sm:gap-4"
    >
      {units.map(([label, value]) => (
        <div
          key={label}
          className={`rounded-2xl px-2 py-3 text-center sm:px-4 sm:py-4 ${
            dark ? 'bg-emerald-900/70 ring-1 ring-gold-400/30' : 'bg-emerald-950 ring-1 ring-gold-400/40'
          }`}
        >
          <div className="font-display text-3xl font-bold tabular-nums text-gold-300 sm:text-5xl" aria-hidden="true">
            {value}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-100/80 sm:text-xs">{label}</div>
        </div>
      ))}
    </div>
  );
}
