import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardCheck,
  Gauge, Loader2, MapPin, Route, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { fetchTrips, deleteTrip, isCompliant } from '../lib/trips';
import type { TripSummary } from '../types/trip';
import { useDriverProfile } from './AppShell';
import TripListItem from './TripListItem';
import ConfirmDialog from './ConfirmDialog';
import { cn } from '../lib/utils';

const ONBOARDING_STEPS = [
  {
    icon: MapPin,
    title: 'Enter a route',
    description: 'Current location, pickup, dropoff, and the hours already on the clock.',
  },
  {
    icon: ShieldCheck,
    title: 'Get a verdict',
    description: 'Every FMCSA rule checked in one pass — pass, fail, and exactly why.',
  },
  {
    icon: ClipboardCheck,
    title: 'Dispatch with proof',
    description: 'The check is logged automatically, so you have a record you ran it.',
  },
];

/** Post-login home. Replaces the old "drop the user straight into a blank
 * form" behavior — first-time users get a guided empty state instead of an
 * unlabeled sidebar, returning users get a snapshot of their trips plus a
 * clear next action. */
export default function Dashboard() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const { hasDefaults, loading: profileLoading, openCarrierSettings } = useDriverProfile();

  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTrips(api)
      .then(rows => {
        if (!cancelled) setTrips(rows);
      })
      .catch(err => {
        if (cancelled) return;
        if ((err as { response?: { status?: number } }).response?.status !== 401) {
          setError(extractApiError(err, 'Could not load your trips.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const stats = useMemo(() => {
    const total = trips.length;
    const compliant = trips.filter(isCompliant).length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = trips.filter(t => new Date(t.created_at).getTime() >= weekAgo).length;
    return {
      total,
      compliantPct: total > 0 ? Math.round((compliant / total) * 100) : null,
      thisWeek,
    };
  }, [trips]);

  const openTrip = (id: number) => {
    setOpeningId(id);
    navigate(`/app/trips/${id}`);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteTrip(api, id);
      setTrips(prev => prev.filter(t => t.id !== id));
      setConfirmId(null);
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status !== 401) {
        setError(extractApiError(err, 'Could not delete that trip.'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const firstName = user?.username ?? 'there';
  const recentTrips = trips.slice(0, 5);
  const showOnboarding = !loading && trips.length === 0;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-50">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {showOnboarding
                ? "Let's run your first pre-dispatch check."
                : 'Here is where things stand across your trips.'}
            </p>
          </div>
          {!showOnboarding && (
            <button
              type="button"
              onClick={() => navigate('/app/plan')}
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.97] shrink-0"
            >
              Plan a new trip
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>

        {!profileLoading && !hasDefaults && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                <Building2 size={14} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Set up your carrier defaults</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Save your carrier name, truck number, and office address once — they&apos;ll
                  pre-fill on every trip you plan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCarrierSettings}
              className="shrink-0 self-start sm:self-center px-3.5 py-2 rounded-lg text-xs font-semibold text-accent border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/[0.16] transition-colors"
            >
              Set up
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="mt-16 flex items-center justify-center text-zinc-500">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {showOnboarding && (
          <div className="mt-10">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-10 gradient-border relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/[0.08] rounded-full blur-3xl" />
              <div className="relative flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
                  <Route size={28} className="text-accent" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">No trips yet — let&apos;s fix that.</h2>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  Every trip you plan runs through the full FMCSA rules engine and comes back with
                  a pass/fail verdict, ELD-style log sheets, and a route map.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/plan')}
                  className="group mt-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.97]"
                >
                  Plan your first trip
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ONBOARDING_STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className={cn(
                    'rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-fade-in-up',
                    `stagger-${i + 1}`
                  )}
                >
                  <span className="text-[11px] font-bold text-zinc-600 tabular-nums">
                    0{i + 1}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <step.icon size={15} className="text-accent" />
                    <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Route} label="Total trips" value={String(stats.total)} />
              <StatCard
                icon={CheckCircle2}
                label="Compliant"
                value={stats.compliantPct != null ? `${stats.compliantPct}%` : '—'}
                accent={stats.compliantPct != null && stats.compliantPct === 100}
                warning={stats.compliantPct != null && stats.compliantPct < 100}
              />
              <StatCard icon={Sparkles} label="This week" value={String(stats.thisWeek)} />
              <StatCard
                icon={Building2}
                label="Carrier setup"
                value={hasDefaults ? 'Done' : 'Pending'}
                accent={hasDefaults}
                warning={!hasDefaults}
              />
            </div>

            <div className="mt-10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Recent trips</h2>
              <button
                type="button"
                onClick={() => navigate('/app/trips')}
                className="text-xs font-medium text-accent hover:text-blue-300 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {recentTrips.map(trip => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  onOpen={openTrip}
                  onDelete={setConfirmId}
                  opening={openingId === trip.id}
                  deleting={deletingId === trip.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this trip?"
        description="This permanently removes the trip, its route, schedule, and log sheets. This can't be undone."
        confirmLabel="Delete trip"
        loading={deletingId !== null}
        onConfirm={() => confirmId !== null && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
  warning = false,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border',
        accent
          ? 'bg-emerald-500/[0.06] border-emerald-500/20'
          : warning
            ? 'bg-amber-500/[0.06] border-amber-500/20'
            : 'bg-white/[0.03] border-white/[0.06]'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg shrink-0',
          accent ? 'bg-emerald-500/15' : warning ? 'bg-amber-500/15' : 'bg-white/[0.05]'
        )}
      >
        {warning ? (
          <AlertTriangle size={15} className="text-amber-400" />
        ) : (
          <Icon size={15} className={accent ? 'text-emerald-400' : 'text-zinc-400'} />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold truncate">
          {label}
        </div>
        <div
          className={cn(
            'text-lg font-semibold tabular-nums',
            accent ? 'text-emerald-400' : warning ? 'text-amber-400' : 'text-zinc-100'
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
