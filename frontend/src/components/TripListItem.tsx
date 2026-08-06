import { CheckCircle2, Loader2, MapPin, Trash2, XCircle } from 'lucide-react';
import type { TripSummary } from '../types/trip';
import { isCompliant } from '../lib/trips';
import { cn } from '../lib/utils';

/** One trip row — reused by the dashboard's "recent trips" list and the full
 * My Trips page, so open/delete behave identically everywhere a trip shows up. */
export default function TripListItem({
  trip,
  onOpen,
  onDelete,
  opening = false,
  deleting = false,
}: {
  trip: TripSummary;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  opening?: boolean;
  deleting?: boolean;
}) {
  const compliant = isCompliant(trip);
  const busy = opening || deleting;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 w-full text-left p-4 rounded-xl border transition-all',
        deleting
          ? 'bg-red-500/[0.04] border-red-500/20 opacity-60'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(trip.id)}
        disabled={busy}
        className="min-w-0 flex-1 text-left disabled:cursor-wait"
      >
        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-100 truncate">
          <MapPin size={12} className="shrink-0 text-zinc-500" />
          <span className="truncate">{trip.pickup_location}</span>
          <span className="text-zinc-600">→</span>
          <span className="truncate">{trip.dropoff_location}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 tabular-nums">
          <span>
            {new Date(trip.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {trip.distance_miles != null && <span>{trip.distance_miles.toFixed(0)} mi</span>}
          <span>
            {trip.log_count} log{trip.log_count !== 1 ? 's' : ''}
          </span>
          {trip.truck_number && <span className="truncate">{trip.truck_number}</span>}
        </div>
      </button>

      <div className="shrink-0 flex items-center gap-1">
        {opening ? (
          <Loader2 size={14} className="animate-spin text-zinc-400" />
        ) : compliant ? (
          <CheckCircle2 size={14} className="text-emerald-400" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
        <button
          type="button"
          onClick={() => onDelete(trip.id)}
          disabled={busy}
          aria-label="Delete trip"
          className="p-1.5 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}
