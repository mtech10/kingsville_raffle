import { Clock, Trophy, Users, UserCheck } from 'lucide-react';
import { formatNumber } from '../../lib/format';

function Card({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-emerald-900/70">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums text-emerald-950">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-emerald-900/60">{sub}</p>}
    </div>
  );
}

export default function StatsCards({ stats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[118px] rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card icon={Users} label="Total registrations" value={formatNumber(stats.totalRegistrations)} accent="bg-emerald-100 text-emerald-700" />
      <Card icon={UserCheck} label="Eligible for draw" value={formatNumber(stats.eligible)} sub="Not yet won" accent="bg-gold-100 text-gold-700" />
      <Card icon={Trophy} label="Winners drawn" value={formatNumber(stats.winners)} sub={`${stats.prizesAwarded} of ${stats.prizesTotal} prizes awarded`} accent="bg-gold-100 text-gold-700" />
      <Card icon={Clock} label="Last 24 hours" value={formatNumber(stats.last24h)} sub={stats.registrationOpen ? 'Registration open' : 'Registration closed'} accent="bg-emerald-100 text-emerald-700" />
    </div>
  );
}
