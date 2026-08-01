import { useEffect, useState } from 'react';
import { AlertCircle, Building2, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { cn } from '../lib/utils';
import {
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  saveProfile,
  type DriverProfile,
  type ProfileField,
} from '../lib/profile';

const inputBase =
  'w-full bg-zinc-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2 border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900';

export default function ProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: DriverProfile | null;
  onClose: () => void;
  onSaved: (profile: DriverProfile) => void;
}) {
  const { api } = useAuth();
  const [draft, setDraft] = useState<DriverProfile>(profile ?? EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (field: ProfileField, value: string) =>
    setDraft(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const saved = await saveProfile(api, draft);
      onSaved(saved);
      onClose();
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status !== 401) {
        setError(extractApiError(err, 'Could not save your carrier defaults.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/60 animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Building2 className="text-blue-400" size={16} />
            </div>
            <div>
              <h2 id="profile-title" className="text-sm font-semibold text-zinc-100">
                Carrier Defaults
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Saved once and pre-filled on every new trip.
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

        <div className="px-6 py-5 flex flex-col gap-4">
          {PROFILE_FIELDS.map(field => (
            <div key={field.name} className="space-y-1.5">
              <label htmlFor={`profile-${field.name}`} className="text-xs font-medium text-zinc-400">
                {field.label}
              </label>
              <input
                id={`profile-${field.name}`}
                value={draft[field.name] ?? ''}
                onChange={e => update(field.name, e.target.value)}
                placeholder={field.placeholder}
                className={inputBase}
              />
            </div>
          ))}

          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Editing these only affects future trips. Trips you have already generated keep the
            details they were created with.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
              'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
              'shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-50'
            )}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Save defaults
          </button>
        </div>
      </div>
    </div>
  );
}
