import { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Route, X, XCircle,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { cn } from '../lib/utils';

export type TripSummary = {
  id: number;
  pickup_location: string;
  dropoff_location: string;
  current_location: string;
  distance_miles: number | null;
  estimated_hours: number | null;
  carrier_name: string | null;
  truck_number: string | null;
  created_at: string;
  log_count: number;
  compliance?: { is_compliant: boolean; overall_score: number; violation_count: number };
};

export default function TripHistory({
  onClose,
  onOpenTrip,
  activeTripId,
}: {
  onClose: () => void;
  onOpenTrip: (tripId: number) => Promise<void> | void;
  activeTripId?: number;
}) {
  const { api } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get('/api/trips/');
        if (cancelled) return;
        // Tolerate both a plain list and a paginated {results: []} envelope.
        setTrips(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
      } catch (err) {
        if (cancelled) return;
        if ((err as { response?: { status?: number } }).response?.status !== 401) {
          setError(extractApiError(err, 'Could not load your trips.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleOpen = async (id: number) => {
    setOpeningId(id);
    try {
      await onOpenTrip(id);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full flex flex-col border-l border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="text-blue-400" size={16} />
            </div>
            <div>
              <h2 id="history-title" className="text-sm font-semibold text-zinc-100">
                Your Trips
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {loading ? 'Loading…' : `${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && trips.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-5">
                <Route size={28} className="text-zinc-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-1.5">No saved trips yet</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Generate a trip and it will be saved to your account automatically.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {trips.map(trip => {
              const compliant = trip.compliance?.is_compliant ?? true;
              const isActive = trip.id === activeTripId;
              return (
                <button
                  key={trip.id}
                  onClick={() => handleOpen(trip.id)}
                  disabled={openingId !== null}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all disabled:opacity-60',
                    isActive
                      ? 'bg-blue-500/[0.12] border-blue-500/40'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-100 truncate">
                        <MapPin size={12} className="shrink-0 text-zinc-500" />
                        <span className="truncate">{trip.pickup_location}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="truncate">{trip.dropoff_location}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 tabular-nums">
                        <span>{new Date(trip.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}</span>
                        {trip.distance_miles != null && <span>{trip.distance_miles.toFixed(0)} mi</span>}
                        <span>{trip.log_count} log{trip.log_count !== 1 ? 's' : ''}</span>
                        {trip.truck_number && <span className="truncate">{trip.truck_number}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {openingId === trip.id ? (
                        <Loader2 size={14} className="animate-spin text-zinc-400" />
                      ) : compliant ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
