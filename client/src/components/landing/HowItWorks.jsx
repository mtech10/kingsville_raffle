import { CalendarDays, MailCheck, Ticket } from "lucide-react";

const STEPS = [
  {
    icon: MailCheck,
    title: "Register",
    text: "Enter your name, phone number and email. Each phone number and email can be used once.",
  },
  {
    icon: Ticket,
    title: "Get your raffle number",
    text: "After your email is verified, you instantly receive your unique number, like KV-000.",
  },
  {
    icon: CalendarDays,
    title: "Watch the live draw",
    text: "Winners are drawn live on launch day, 21 November. Keep your number handy!",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-emerald-950/[.04] py-10 sm:py-14"
    >
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mt-1 font-display text-3xl font-bold text-emerald-950 sm:text-4xl">
            How it works
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="relative rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-sm"
            >
              <span className="absolute -top-4 left-7 flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 font-display text-lg font-bold text-emerald-950 shadow">
                {i + 1}
              </span>
              <Icon
                className="mt-3 h-9 w-9 text-emerald-700"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-lg font-bold text-emerald-950">
                {title}
              </h3>
              <p className="mt-1.5 text-emerald-900/70">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
