import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { formatDateLong, formatNumber } from "../../lib/format";
import { GRAND_PRIZE, PRIZES } from "../../lib/prizes";

export default function Hero({
  onRegister,
  closed,
  eventDate,
  totalRegistered,
}) {
  return (
    <section id="top" className="bg-estate text-white">
      <div className="container-x grid items-center gap-12 pb-20 pt-10 sm:pt-14 lg:grid-cols-[1.15fr_.85fr] lg:pb-32 lg:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-gold-200 sm:px-4 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Grand launch raffle · {formatDateLong(eventDate)}
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Win a <span className="gold-text">300sqm plot</span> at Kingsville
            Estate
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-emerald-50/85 sm:text-lg">
            Kingsville Estate is launching, and you are invited. Register for
            the raffle draw for a chance to win a 300sqm Area of Land, plus nine
            premium home prizes, all drawn live on launch day.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onRegister}
              disabled={closed}
              className="btn-gold w-full px-6 py-3.5 text-base sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {closed ? "Registration Closed" : "Register for Raffle"}
              {!closed && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
            </button>
            <a href="#prizes" className="btn-outline-gold w-full px-6 py-3.5 text-base sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
              See the prizes
            </a>
          </div>

          {totalRegistered > 0 && (
            <p className="mt-6 text-sm text-gold-200">
              <span className="font-semibold">
                {formatNumber(totalRegistered)}
              </span>{" "}
              {totalRegistered === 1 ? "person has" : "people have"} already
              registered
            </p>
          )}
        </div>

        {/* Grand prize card */}
        <div
          className="relative animate-fade-up rounded-3xl border border-gold-400/40 bg-gradient-to-br from-emerald-900/80 to-emerald-950 p-7 shadow-glow sm:p-9"
          style={{ animationDelay: ".15s" }}
        >
          <span className="absolute -top-3 left-8 rounded-full bg-gold-400 px-3.5 py-1 text-xs font-bold uppercase tracking-[.2em] text-emerald-950">
            Grand Prize
          </span>
          <img
            src={GRAND_PRIZE.image}
            alt={GRAND_PRIZE.alt}
            className="mt-4 h-40 w-full rounded-2xl object-cover shadow-lg ring-2 ring-gold-300/50"
          />
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            {GRAND_PRIZE.name}
          </h2>
          <p className="mt-2 text-emerald-50/75">
            One lucky winner takes home a plot at Kingsville Estate.
          </p>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-300">
              Also to be won
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PRIZES.map((p) => (
                <li
                  key={p.name}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50/90"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
