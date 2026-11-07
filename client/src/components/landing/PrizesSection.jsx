import { Crown } from "lucide-react";
import { GRAND_PRIZE, PRIZES } from "../../lib/prizes";

export default function PrizesSection() {
  return (
    <section id="prizes" className="scroll-mt-20 py-10 sm:py-14">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mt-1 font-display text-3xl font-bold text-emerald-950 sm:text-4xl">
            Ten prizes. One launch day.
          </h2>
          <p className="mt-3 text-emerald-900/70">
            Every verified registration gets a unique raffle number and an equal
            chance in the live draw.
          </p>
        </div>

        {/* Grand prize */}
        <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 p-8 text-white shadow-glow sm:p-12">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <img
              src={GRAND_PRIZE.image}
              alt={GRAND_PRIZE.alt}
              className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-gold-300/60"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[.2em] text-gold-200">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Grand Prize
              </span>
              <h3 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                {GRAND_PRIZE.name}
              </h3>
              <p className="mt-1 text-emerald-50/75">
                Drawn last, live, in front of everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Other prizes */}
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRIZES.map(({ name, image, alt }, i) => (
            <li
              key={name}
              className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-white text-center shadow-sm transition hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-lg"
            >
              <div className="overflow-hidden bg-emerald-50">
                <img
                  src={image}
                  alt={alt}
                  className="h-32 w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-700">
                  Prize {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-0.5 font-semibold text-emerald-950">{name}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
