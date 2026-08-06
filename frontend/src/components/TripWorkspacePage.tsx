/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, FileText, Fuel,
  Gauge, Loader2, MapPin, ScrollText, ShieldCheck, Trash2,
} from 'lucide-react';
import MapView from './Map.tsx';
import LogView from './LogView.tsx';
import ScheduleView from './ScheduleView.tsx';
import ComplianceView from './ComplianceView.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { deleteTrip } from '../lib/trips';
import type { Trip } from '../types/trip';
import { cn } from '../lib/utils';

const TABS = [
  { id: 'map', label: 'Route Map', icon: MapPin },
  { id: 'logs', label: 'ELD Logs', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
] as const;

/** A single trip's results — route map, ELD logs, schedule, and compliance
 * verdict — loaded by id (/app/trips/:id) instead of held in ambient state,
 * so a saved trip is a real, linkable, refreshable page. */
export default function TripWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('map');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/api/trips/${id}/`)
      .then(res => {
        if (!cancelled) setTrip(res.data);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status !== 401) {
          setError(
            err.response?.status === 404
              ? 'That trip does not exist, or has already been deleted.'
              : extractApiError(err, 'Could not load this trip.')
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const handleDelete = async () => {
    if (!trip) return;
    setDeleting(true);
    try {
      await deleteTrip(api, trip.id);
      navigate('/app/trips');
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError(extractApiError(err, 'Could not delete this trip.'));
      }
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertCircle size={24} className="text-danger" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-1.5">Trip not found</h3>
        <p className="text-sm text-zinc-500 max-w-sm">{error || 'Something went wrong.'}</p>
        <button
          type="button"
          onClick={() => navigate('/app/trips')}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03] transition-all"
        >
          <ArrowLeft size={14} />
          Back to my trips
        </button>
      </div>
    );
  }

  const fuelStops = trip.duty_events?.filter((e: any) => e.status === 'ON_DUTY_NOT_DRIVING').length ?? 0;
  const complianceScore = trip.compliance?.overall_score;
  const isCompliant = trip.compliance?.is_compliant ?? true;

  const kpis = [
    { label: 'Total Distance', value: `${trip.distance_miles?.toFixed(0) ?? '—'} mi`, icon: Gauge },
    { label: 'Est. Drive Time', value: `${trip.estimated_hours?.toFixed(1) ?? '—'} hrs`, icon: Activity },
    { label: 'Fuel Stops', value: String(fuelStops), icon: Fuel },
    { label: 'Log Sheets', value: String(trip.daily_logs?.length ?? 0), icon: ScrollText },
    {
      label: 'Compliance',
      value: complianceScore != null ? `${complianceScore}%` : '—',
      icon: CheckCircle2,
      accent: isCompliant,
      warning: complianceScore != null && !isCompliant,
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/trips')}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
          >
            <ArrowLeft size={13} />
            My Trips
          </button>
          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-sm text-zinc-300 truncate justify-center">
            <span className="truncate">{trip.pickup_location}</span>
            <span className="text-zinc-600">→</span>
            <span className="truncate">{trip.dropoff_location}</span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 overflow-x-auto custom-scrollbar">
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl border min-w-0 shrink-0',
                kpi.accent
                  ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                  : kpi.warning
                    ? 'bg-red-500/[0.08] border-red-500/20'
                    : 'bg-white/[0.03] border-white/[0.06]'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-lg',
                  kpi.accent ? 'bg-emerald-500/15' : kpi.warning ? 'bg-red-500/15' : 'bg-white/[0.05]'
                )}
              >
                <kpi.icon
                  size={14}
                  className={kpi.accent ? 'text-emerald-400' : kpi.warning ? 'text-red-400' : 'text-zinc-400'}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold truncate">
                  {kpi.label}
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    kpi.accent ? 'text-emerald-400' : kpi.warning ? 'text-red-400' : 'text-zinc-100'
                  )}
                >
                  {kpi.value}
                </div>
              </div>
              {i < kpis.length - 1 && <div className="hidden lg:block w-px h-8 bg-white/[0.06] ml-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] overflow-x-auto custom-scrollbar">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white/[0.1] text-zinc-50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <tab.icon size={15} className={activeTab === tab.id ? 'text-blue-400' : ''} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[420px] lg:min-h-0 overflow-hidden relative">
        {/* Absolute-fill instead of h-full: three stacked flex-grow ancestors
            above this node leave percentage heights unable to resolve in
            some browsers, so each tab view's own `h-full` root collapses to
            0. Anchoring via inset-0 sidesteps that percentage chain. */}
        <div className="absolute inset-0">
          {activeTab === 'map' && <MapView trip={trip} />}
          {activeTab === 'logs' && <LogView trip={trip} />}
          {activeTab === 'schedule' && <ScheduleView trip={trip} onTripUpdated={setTrip} />}
          {activeTab === 'compliance' && <ComplianceView trip={trip} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this trip?"
        description="This permanently removes the trip, its route, schedule, and log sheets. This can't be undone."
        confirmLabel="Delete trip"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
