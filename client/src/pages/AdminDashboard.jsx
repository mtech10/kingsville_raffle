import { AlertCircle, ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import ParticipantsTable from '../components/admin/ParticipantsTable';
import StatsCards from '../components/admin/StatsCards';
import { useAdminApi } from '../hooks/useAuth';
import { formatNumber } from '../lib/format';

const POLL_MS = 30_000;

export default function AdminDashboard() {
  const adminApi = useAdminApi();
  const [stats, setStats] = useState(null);
  const [drawState, setDrawState] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumping this makes the table reload its current page

  const loadSummary = useCallback(
    async (signal) => {
      try {
        const [s, d] = await Promise.all([adminApi.stats(signal), adminApi.drawState(signal)]);
        setStats(s);
        setDrawState(d);
        setError('');
      } catch (err) {
        if (err?.name !== 'AbortError') setError(err.message || 'Could not load dashboard stats.');
      }
    },
    [adminApi],
  );

  // Initial load + light polling so the totals tick up while registration is open.
  useEffect(() => {
    const controller = new AbortController();
    loadSummary(controller.signal);
    const id = setInterval(() => loadSummary(controller.signal), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [loadSummary]);

  async function refreshAll() {
    setRefreshing(true);
    await loadSummary();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }

  const nextPrize = drawState?.prizes.find((p) => p.id === drawState.nextPrizeId);

  return (
    <div className="min-h-screen bg-ivory">
      <AdminHeader />

      <main className="container-x space-y-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-emerald-950">Raffle dashboard</h1>
            <p className="mt-1 text-sm text-emerald-900/65">Live view of registrations for the Kingsville Estate raffle draw.</p>
          </div>
          <button type="button" onClick={refreshAll} disabled={refreshing} className="btn-outline">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}

        <StatsCards stats={stats} />

        {/* Live Draw entry point */}
        <section aria-labelledby="draw-cta" className="bg-estate relative overflow-hidden rounded-2xl border border-gold-400/30 p-6 shadow-glow sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-gold-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Event day
              </p>
              <h2 id="draw-cta" className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Live Draw</h2>
              <p className="mt-1 max-w-xl text-sm text-emerald-100/80">
                {!drawState
                  ? 'Loading draw status…'
                  : drawState.blockedReason
                    ? drawState.blockedReason
                    : nextPrize
                      ? `${formatNumber(drawState.eligibleCount)} eligible tickets in the pool. Next up: ${nextPrize.name}.`
                      : 'Every prize has been awarded. 🎉'}
              </p>
            </div>
            <Link to="/admin/draw" className="btn-gold shrink-0 px-7 py-3.5">
              Open Live Draw <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <ParticipantsTable refreshKey={refreshKey} />
      </main>
    </div>
  );
}
