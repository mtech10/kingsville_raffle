import { useEffect, useState } from 'react';
import Logo from '../Logo';

export default function Header({ onRegister, onLookupTicket, closed }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b transition ${scrolled ? 'border-gold-400/20 bg-emerald-950/95 shadow-lg backdrop-blur' : 'border-transparent bg-emerald-950'}`}>
      <div className="container-x flex h-auto min-h-[64px] flex-wrap items-center justify-between gap-3 py-2 sm:h-[72px] sm:min-h-[72px] sm:py-0">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-emerald-50/85 md:flex" aria-label="Primary">
          <a href="#prizes" className="transition hover:text-gold-300">Prizes</a>
          <a href="#how-it-works" className="transition hover:text-gold-300">How it works</a>
        </nav>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <button type="button" onClick={onLookupTicket} className="btn-outline px-3 py-2 text-xs font-semibold sm:text-sm">
            Find my ticket
          </button>
          <button type="button" onClick={onRegister} disabled={closed} className="btn-gold px-4 py-2 text-sm sm:px-5">
            {closed ? 'Registration closed' : 'Register for Raffle'}
          </button>
        </div>
      </div>
    </header>
  );
}
