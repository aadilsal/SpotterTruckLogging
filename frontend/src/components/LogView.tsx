import { useState, useEffect } from 'react';
import { Download, Loader2, Clock, Moon, Truck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getDailyCompliance } from '../types/compliance';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';

/** Pull the server-provided filename out of Content-Disposition, if present. */
function filenameFromHeaders(headers: unknown, fallback: string): string {
  const disposition = (headers as Record<string, string> | undefined)?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/);
  return match?.[1] ?? fallback;
}

export default function LogView({ trip }: { trip: any }) {
  const { api } = useAuth();
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  /** null = idle, 'all' = whole trip, otherwise the daily-log id being fetched. */
  const [downloading, setDownloading] = useState<string | number | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const logs = trip?.daily_logs ?? [];

  useEffect(() => {
    if (logs.length === 0) return;
    if (activeLogIndex >= logs.length) {
      setActiveLogIndex(0);
    }
  }, [logs.length, activeLogIndex]);

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No logs generated for this trip.
      </div>
    );
  }

  const safeIndex = Math.min(activeLogIndex, logs.length - 1);
  const activeLog = logs[safeIndex];

  if (!activeLog) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No log data available for this day.
      </div>
    );
  }

  const logCount = logs.length;

  /** Fetch a PDF from the API (needs the Bearer header, so not a plain <a href>). */
  const downloadPdf = async (
    path: string,
    fallbackName: string,
    key: string | number
  ) => {
    setDownloadError('');
    setDownloading(key);
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFromHeaders(res.headers, fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: unknown } }).response;
      // A 401 already dropped the session; the login screen takes over.
      if (response?.status !== 401) {
        // Error bodies come back as a Blob on blob requests, so unwrap it to
        // surface the server's message instead of a generic axios error.
        let detail: string | undefined;
        if (response?.data instanceof Blob) {
          try {
            detail = JSON.parse(await response.data.text())?.detail;
          } catch {
            detail = undefined;
          }
        }
        setDownloadError(
          detail ?? extractApiError(err, 'Could not download the PDF. Please try again.')
        );
      }
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = () =>
    downloadPdf(`/api/trips/${trip.id}/logs/pdf/`, `eld-logs-trip-${trip.id}.pdf`, 'all');

  const downloadDay = (log: { id: number }, index: number) =>
    downloadPdf(
      `/api/trips/${trip.id}/logs/${log.id}/pdf/`,
      `eld-log-trip-${trip.id}-day-${index + 1}.pdf`,
      log.id
    );

  const fmtHours = (val: number | undefined | null) =>
    typeof val === 'number' && !Number.isNaN(val) ? val.toFixed(1) : '0.0';

  const dayCompliance = activeLog.date
    ? getDailyCompliance(trip.compliance, activeLog.date)
    : undefined;
  const dayPassed = dayCompliance?.passed ?? trip.compliance?.is_compliant ?? true;

  const summaryStats = [
    {
      label: 'Driving',
      value: `${fmtHours(activeLog.total_driving_hours)}h`,
      icon: Truck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'On Duty',
      value: `${fmtHours(activeLog.total_on_duty_hours)}h`,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Sleeper',
      value: `${fmtHours(activeLog.total_off_duty_hours)}h`,
      icon: Moon,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Compliance',
      value: dayPassed ? 'Passing' : `${dayCompliance?.violation_count ?? 0} issue(s)`,
      icon: dayPassed ? CheckCircle2 : XCircle,
      color: dayPassed ? 'text-emerald-400' : 'text-red-400',
      bg: dayPassed
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : 'bg-red-500/10 border-red-500/20',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-white/[0.06] bg-zinc-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">ELD Log Sheets</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{logCount} daily log{logCount !== 1 ? 's' : ''} generated</p>
          </div>
          <button
            onClick={downloadAll}
            disabled={downloading !== null}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 px-4 py-2.5 rounded-xl border border-white/[0.08] transition-all font-medium text-sm whitespace-nowrap disabled:opacity-50 active:scale-[0.98]"
          >
            {downloading === 'all' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download all {logCount} day{logCount !== 1 ? 's' : ''}
          </button>
        </div>
        {downloadError && (
          <div className="max-w-5xl mx-auto px-6 pb-4 -mt-1">
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{downloadError}</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-white/[0.06] bg-zinc-950/40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex flex-wrap justify-center gap-2">
            {logs.map((log: any, index: number) => {
              const isActive = safeIndex === index;
              return (
                <div
                  key={index}
                  className="flex flex-col gap-1 min-w-[108px] flex-1 max-w-[140px]"
                >
                  <button
                    onClick={() => setActiveLogIndex(index)}
                    className={cn(
                      'flex flex-col items-center py-3 px-4 rounded-xl transition-all duration-200 border text-center',
                      isActive
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10'
                        : 'bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 hover:border-white/[0.1]'
                    )}
                  >
                    <span className={cn('text-xs font-bold', isActive ? 'text-blue-400' : 'text-zinc-400')}>
                      Day {index + 1}
                    </span>
                    <span className="text-[11px] mt-1 tabular-nums">
                      {log.date ? new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <span className={cn(
                      'text-[10px] mt-1.5 font-medium tabular-nums',
                      isActive ? 'text-blue-400/80' : 'text-zinc-600'
                    )}>
                      {fmtHours(log.total_driving_hours)}h drive
                    </span>
                  </button>
                  <button
                    onClick={() => downloadDay(log, index)}
                    disabled={downloading !== null}
                    title={`Download the Day ${index + 1} log sheet as PDF`}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:text-zinc-200 transition-colors disabled:opacity-40"
                  >
                    {downloading === log.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryStats.map(stat => (
              <div
                key={stat.label}
                className={cn('flex items-center gap-3 p-4 rounded-xl border', stat.bg)}
              >
                <stat.icon size={18} className={stat.color} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{stat.label}</div>
                  <div className={cn('text-lg font-semibold tabular-nums', stat.color)}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-[1000px]">
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40 bg-white">
                <div className="eld-log-sheet p-6 sm:p-8 flex justify-center items-start min-h-[200px]">
                  {activeLog.svg_content ? (
                    <div dangerouslySetInnerHTML={{ __html: activeLog.svg_content }} />
                  ) : (
                    <p className="text-zinc-400 text-sm">No log sheet available for this day.</p>
                  )}
                </div>
              </div>
              {activeLog.date && (
                <p className="text-center text-[11px] text-zinc-600 mt-3">
                  Day {safeIndex + 1} &mdash; {new Date(activeLog.date).toLocaleDateString(undefined, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
