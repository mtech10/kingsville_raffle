import { Clock } from 'lucide-react';
import { formatDateTime } from '../../lib/format';
import Countdown from '../Countdown';

export default function CountdownBand({ countdown, deadline, onRegister }) {
  const closed = countdown.expired;

  return (
    <section aria-labelledby="countdown-title" className="relative z-10 -mt-14">
      <div className="container-x">
        <div className="grid items-center gap-6 rounded-3xl border border-gold-400/40 bg-white p-6 shadow-2xl shadow-emerald-950/20 sm:p-8 lg:grid-cols-[.8fr_1.2fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-gold-700">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {closed ? 'Registration closed' : 'Registration closes in'}
            </p>
            <h2 id="countdown-title" className="mt-2 font-display text-2xl font-bold text-emerald-950">
              {closed ? 'Thank you for entering' : "Don't miss your chance"}
            </h2>
            <p className="mt-1 text-sm text-emerald-900/65">
              {closed ? 'See you at the live draw.' : `Closes ${formatDateTime(deadline)} (WAT)`}
            </p>
          </div>

          <Countdown countdown={countdown} />

          <button type="button" onClick={onRegister} disabled={closed} className="btn-gold w-full px-7 py-3.5 lg:w-auto">
            {closed ? 'Closed' : 'Register now'}
          </button>
        </div>
      </div>
    </section>
  );
}
