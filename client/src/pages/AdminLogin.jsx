import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/admin" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <div className="bg-estate flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <form onSubmit={onSubmit} className="w-full max-w-md animate-pop-in rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <h1 className="font-display text-2xl font-bold text-emerald-950">Admin sign in</h1>
        <p className="mt-1 text-sm text-emerald-900/65">Authorised Kingsville Estate staff only.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/60" aria-hidden="true" />
              <input id="email" type="email" required autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-11" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/60" aria-hidden="true" />
              <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-11 pr-12" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-emerald-800/70 hover:bg-emerald-50">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-gold mt-6 w-full py-3.5">
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Signing in…</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
