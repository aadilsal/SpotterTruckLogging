import { AlertCircle, AlertTriangle, CheckCircle2, Gauge, Loader2, Route as RouteIcon, ShieldCheck, X, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { TripCheckResult } from '../types/compliance';

interface QuickCheckModalProps {
  open: boolean;
  loading: boolean;
  error: string;
  result: TripCheckResult | null;
  onClose: () => void;
  onDispatch: () => void;
}

export default function QuickCheckModal({
  open,
  loading,
  error,
  result,
  onClose,
  onDispatch,
}: QuickCheckModalProps) {
  if (!open) return null;

  const isCompliant = result?.is_compliant ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/60 animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-check-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <ShieldCheck className="text-blue-400" size={16} />
            </div>
            <div>
              <h2 id="quick-check-title" className="text-sm font-semibold text-zinc-100">
                Pre-Dispatch Check
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                No trip is created or saved — this only checks HOS legality.
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

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-500">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">Routing the trip and running the HOS engine…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && result && (
            <>
              <div
                className={cn(
                  'flex items-center gap-4 rounded-2xl px-5 py-4 border',
                  isCompliant
                    ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                    : 'bg-red-500/[0.08] border-red-500/20'
                )}
              >
                {isCompliant ? (
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={32} />
                ) : (
                  <XCircle className="text-red-400 shrink-0" size={32} />
                )}
                <div className="min-w-0">
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      isCompliant ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {isCompliant ? 'Compliant — clear to dispatch' : 'NOT compliant as planned'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Overall score {result.overall_score}%
                    {result.violation_count > 0 &&
                      ` · ${result.violation_count} violation${result.violation_count !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <Gauge size={11} /> Distance
                  </div>
                  <div className="text-sm font-semibold text-zinc-100 mt-1 tabular-nums">
                    {result.distance_miles.toFixed(0)} mi
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <RouteIcon size={11} /> Drive time
                  </div>
                  <div className="text-sm font-semibold text-zinc-100 mt-1 tabular-nums">
                    {result.estimated_driving_hours.toFixed(1)} hrs
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <ShieldCheck size={11} /> Days
                  </div>
                  <div className="text-sm font-semibold text-zinc-100 mt-1 tabular-nums">
                    {result.projected_days}
                  </div>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">{result.reasoning.summary}</p>

              {result.reasoning.issues.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {result.reasoning.issues.map(issue => (
                    <div
                      key={issue.rule_id}
                      className="rounded-xl p-4 border bg-red-500/[0.04] border-red-500/20"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1 rounded-full shrink-0 mt-0.5 bg-red-500/15">
                          <AlertTriangle className="text-red-400" size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-red-300 mb-1">
                            {issue.rule_name}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                            {issue.plain_explanation}
                          </p>
                          <p className="text-xs text-emerald-300/90 leading-relaxed">
                            <span className="font-medium text-emerald-400">Fix: </span>
                            {issue.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
          >
            Close
          </button>
          {!loading && !error && result && (
            <button
              type="button"
              onClick={onDispatch}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
                'shadow-lg shadow-blue-600/25 active:scale-[0.98]'
              )}
            >
              Generate Full Trip &amp; Logs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
