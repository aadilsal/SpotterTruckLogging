import { Calendar, Clock, MapPin } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/utils';

interface Event {
  id: number;
  status: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface ScheduleViewProps {
  trip: any;
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  DRIVING: { color: 'text-blue-400', dot: 'bg-blue-500', label: 'Driving' },
  ON_DUTY_NOT_DRIVING: { color: 'text-amber-400', dot: 'bg-amber-500', label: 'On Duty' },
  SLEEPER_BERTH: { color: 'text-indigo-400', dot: 'bg-indigo-500', label: 'Sleeper Berth' },
  OFF_DUTY: { color: 'text-zinc-400', dot: 'bg-zinc-500', label: 'Off Duty' },
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ trip }) => {
  if (!trip || !trip.duty_events) return null;

  const events = trip.duty_events;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto w-full px-6 py-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Calendar className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Trip Schedule</h2>
            <p className="text-sm text-zinc-500">{events.length} duty events across the trip</p>
          </div>
        </div>

        <div className="relative pl-8 space-y-4">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.08]" />

          {events.map((event: Event, idx: number) => {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const durationMs = end.getTime() - start.getTime();
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.round((durationMs % 3600000) / 60000);
            const config = STATUS_CONFIG[event.status] ?? { color: 'text-zinc-400', dot: 'bg-zinc-600', label: event.status };

            const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div key={idx} className="relative">
                <div className={cn(
                  'absolute -left-8 top-4 w-[10px] h-[10px] rounded-full ring-4 ring-[#0a0a0c]',
                  config.dot
                )} />

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className={cn('font-semibold text-sm', config.color)}>{config.label}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1.5">
                        <Clock size={12} />
                        <span>{dateStr} &middot; {timeStr}</span>
                      </div>
                      {event.location && (
                        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs font-semibold text-zinc-300 tabular-nums">
                      {hours > 0 ? `${hours}h ` : ''}{minutes}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
