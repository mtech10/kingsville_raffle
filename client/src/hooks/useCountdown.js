import { useEffect, useMemo, useState } from 'react';

/**
 * Ticks once per second. Remaining time is recomputed from the clock on every tick (not decremented),
 * so it never drifts if the tab is throttled or the device sleeps.
 */
export function useCountdown(deadline, offsetMs = 0) {
  const target = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const [remaining, setRemaining] = useState(() => Math.max(0, target - (Date.now() + offsetMs)));

  useEffect(() => {
    const compute = () => Math.max(0, target - (Date.now() + offsetMs));
    setRemaining(compute());
    const id = setInterval(() => {
      const r = compute();
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target, offsetMs]);

  const total = Math.floor(remaining / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: remaining === 0,
  };
}
