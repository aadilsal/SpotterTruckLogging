import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, Route, Search } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { fetchTrips, deleteTrip } from '../lib/trips';
import type { TripSummary } from '../types/trip';
import TripListItem from './TripListItem';
import ConfirmDialog from './ConfirmDialog';

/** Full trip history — replaces the old slide-over panel. Every trip a user
 * has ever generated lives here with the same open/delete actions as the
 * dashboard's recent list, plus a search box once the list gets long. */
export default function TripsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      t =>
        t.pickup_location.toLowerCase().includes(q) ||
        t.dropoff_location.toLowerCase().includes(q) ||
        t.current_location.toLowerCase().includes(q) ||
        (t.carrier_name ?? '').toLowerCase().includes(q) ||
        (t.truck_number ?? '').toLowerCase().includes(q)
    );
  }, [trips, query]);

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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">My Trips</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {loading ? 'Loading…' : `${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/plan')}
            className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.97] shrink-0"
          >
            Plan a new trip
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {trips.length > 0 && (
          <div className="relative mt-6">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by location, carrier, or truck #"
              className="w-full bg-zinc-900/80 border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2 focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900"
            />
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

        {!loading && !error && trips.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-5">
              <Route size={28} className="text-zinc-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1.5">No saved trips yet</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
              Generate a trip and it will show up here automatically.
            </p>
          </div>
        )}

        {!loading && trips.length > 0 && filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm text-zinc-500">No trips match &quot;{query}&quot;.</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {filtered.map(trip => (
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
