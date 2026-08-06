import { useState } from 'react';
import { Calendar, Clock, MapPin, Pencil, Plus, Trash2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import type { DutyEvent, DutyEventInput, DutyStatus, Trip } from '../types/trip';

interface ScheduleViewProps {
  trip: Trip | null;
  onTripUpdated: (trip: Trip) => void;
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  DRIVING: { color: 'text-blue-400', dot: 'bg-blue-500', label: 'Driving' },
  ON_DUTY_NOT_DRIVING: { color: 'text-amber-400', dot: 'bg-amber-500', label: 'On Duty' },
  SLEEPER_BERTH: { color: 'text-indigo-400', dot: 'bg-indigo-500', label: 'Sleeper Berth' },
  OFF_DUTY: { color: 'text-zinc-400', dot: 'bg-zinc-500', label: 'Off Duty' },
};

const STATUS_OPTIONS: { value: DutyStatus; label: string }[] = [
  { value: 'DRIVING', label: 'Driving' },
  { value: 'ON_DUTY_NOT_DRIVING', label: 'On Duty (Not Driving)' },
  { value: 'SLEEPER_BERTH', label: 'Sleeper Berth' },
  { value: 'OFF_DUTY', label: 'Off Duty' },
];

/** ISO datetime -> value a <input type="datetime-local"> expects, in local time. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO datetime for the API. */
function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

interface EventFormState {
  status: DutyStatus;
  start_time: string; // datetime-local value
  end_time: string; // datetime-local value
  location: string;
}

function eventToFormState(event: DutyEvent): EventFormState {
  return {
    status: event.status,
    start_time: toLocalInputValue(event.start_time),
    end_time: toLocalInputValue(event.end_time),
    location: event.location ?? '',
  };
}

function EventForm({
  form,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: EventFormState;
  saving: boolean;
  error: string;
  onChange: (form: EventFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="bg-white/[0.04] border border-blue-500/30 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Status</span>
          <select
            value={form.status}
            onChange={e => onChange({ ...form, status: e.target.value as DutyStatus })}
            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Location</span>
          <input
            type="text"
            value={form.location}
            onChange={e => onChange({ ...form, location: e.target.value })}
            placeholder="Optional"
            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Start</span>
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={e => onChange({ ...form, start_time: e.target.value })}
            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">End</span>
          <input
            type="datetime-local"
            value={form.end_time}
            onChange={e => onChange({ ...form, end_time: e.target.value })}
            className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          <X size={13} /> Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ trip, onTripUpdated }) => {
  const { api } = useAuth();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EventFormState | null>(null);
  const [editError, setEditError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<EventFormState | null>(null);
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  if (!trip || !trip.duty_events) return null;

  const events = trip.duty_events;
  const baseUrl = `/api/trips/${trip.id}/duty-events/`;

  async function refreshTrip() {
    const res = await api.get(`/api/trips/${trip!.id}/`);
    onTripUpdated(res.data);
  }

  function startEdit(event: DutyEvent) {
    setEditingId(event.id);
    setEditForm(eventToFormState(event));
    setEditError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError('');
  }

  async function saveEdit(eventId: number) {
    if (!editForm) return;
    setSavingId(eventId);
    setEditError('');
    try {
      const payload: DutyEventInput = {
        status: editForm.status,
        start_time: fromLocalInputValue(editForm.start_time),
        end_time: fromLocalInputValue(editForm.end_time),
        location: editForm.location,
      };
      await api.patch(`${baseUrl}${eventId}/`, payload);
      await refreshTrip();
      cancelEdit();
    } catch (err) {
      setEditError(extractApiError(err, 'Could not save this change.'));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteEvent(eventId: number) {
    if (!window.confirm('Remove this duty event? Compliance and the daily logs will be recalculated.')) {
      return;
    }
    setDeletingId(eventId);
    try {
      await api.delete(`${baseUrl}${eventId}/`);
      await refreshTrip();
    } catch (err) {
      window.alert(extractApiError(err, 'Could not delete this event.'));
    } finally {
      setDeletingId(null);
    }
  }

  function startAdd() {
    const last = events[events.length - 1];
    const start = last ? last.end_time : new Date().toISOString();
    const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    setAddForm({
      status: 'ON_DUTY_NOT_DRIVING',
      start_time: toLocalInputValue(start),
      end_time: toLocalInputValue(end),
      location: '',
    });
    setAddError('');
    setAdding(true);
  }

  function cancelAdd() {
    setAdding(false);
    setAddForm(null);
    setAddError('');
  }

  async function saveAdd() {
    if (!addForm) return;
    setAddSaving(true);
    setAddError('');
    try {
      const payload: DutyEventInput = {
        status: addForm.status,
        start_time: fromLocalInputValue(addForm.start_time),
        end_time: fromLocalInputValue(addForm.end_time),
        location: addForm.location,
      };
      await api.post(baseUrl, payload);
      await refreshTrip();
      cancelAdd();
    } catch (err) {
      setAddError(extractApiError(err, 'Could not add this event.'));
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto w-full px-6 py-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Calendar className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Trip Schedule</h2>
              <p className="text-sm text-zinc-500">
                {events.length} duty event{events.length !== 1 ? 's' : ''} — edit to reflect what actually happened
              </p>
            </div>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={startAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-300 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors shrink-0"
            >
              <Plus size={14} /> Add Event
            </button>
          )}
        </div>

        <div className="relative pl-8 space-y-4">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.08]" />

          {events.map(event => {
            const isEditing = editingId === event.id;
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const durationMs = end.getTime() - start.getTime();
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.round((durationMs % 3600000) / 60000);
            const config = STATUS_CONFIG[event.status] ?? { color: 'text-zinc-400', dot: 'bg-zinc-600', label: event.status };

            const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div key={event.id} className="relative">
                <div className={cn(
                  'absolute -left-8 top-4 w-[10px] h-[10px] rounded-full ring-4 ring-[#0a0a0c]',
                  config.dot
                )} />

                {isEditing && editForm ? (
                  <EventForm
                    form={editForm}
                    saving={savingId === event.id}
                    error={editError}
                    onChange={setEditForm}
                    onSave={() => saveEdit(event.id)}
                    onCancel={cancelEdit}
                    saveLabel="Save"
                  />
                ) : (
                  <div className="group bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs font-semibold text-zinc-300 tabular-nums">
                          {hours > 0 ? `${hours}h ` : ''}{minutes}m
                        </span>
                        <button
                          type="button"
                          onClick={() => startEdit(event)}
                          aria-label="Edit event"
                          className="p-1.5 rounded-lg text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvent(event.id)}
                          disabled={deletingId === event.id}
                          aria-label="Delete event"
                          className="p-1.5 rounded-lg text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                          {deletingId === event.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {adding && addForm && (
            <div className="relative">
              <div className="absolute -left-8 top-4 w-[10px] h-[10px] rounded-full ring-4 ring-[#0a0a0c] bg-blue-500" />
              <EventForm
                form={addForm}
                saving={addSaving}
                error={addError}
                onChange={setAddForm}
                onSave={saveAdd}
                onCancel={cancelAdd}
                saveLabel="Add"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
