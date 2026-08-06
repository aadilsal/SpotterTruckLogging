import { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';

/** Generic "are you sure" modal for destructive actions (currently: trip
 * deletion). Kept deliberately small — one job, reused wherever a delete
 * button shows up so every destructive action in the app confirms the same way. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-zinc-950 p-6 shadow-2xl shadow-black/60 animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className={cn(
            'p-2.5 rounded-xl border',
            danger
              ? 'bg-danger-muted border-red-500/20'
              : 'bg-accent-muted border-blue-500/20'
          )}>
            <AlertTriangle size={18} className={danger ? 'text-danger' : 'text-accent'} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cancel"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <h2 id="confirm-title" className="mt-4 text-sm font-semibold text-zinc-100">
          {title}
        </h2>
        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60',
              danger
                ? 'bg-red-500/90 hover:bg-red-500 text-white'
                : 'bg-blue-500/90 hover:bg-blue-500 text-white'
            )}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
