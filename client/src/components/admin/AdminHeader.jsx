import { LayoutDashboard, LogOut, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../Logo';

const link = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-gold-400/15 text-gold-200' : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
  }`;

export default function AdminHeader() {
  const { email, logout } = useAuth();
  return (
    <header className="bg-estate sticky top-0 z-40 border-b border-gold-400/20">
      <div className="container-x flex flex-wrap items-center justify-between gap-3 py-3">
        <Logo />
        <nav aria-label="Admin" className="flex items-center gap-1">
          <NavLink to="/admin" end className={link}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard
          </NavLink>
          <NavLink to="/admin/draw" className={link}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Live Draw
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[16rem] truncate text-sm text-emerald-100/70 md:inline">{email}</span>
          <button type="button" onClick={logout} className="btn-outline-gold px-4 py-2 text-sm">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
