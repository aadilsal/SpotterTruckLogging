import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/utils';
import type { ComplianceReport } from '../types/compliance';

interface ComplianceViewProps {
  trip: any;
}

const ComplianceView: React.FC<ComplianceViewProps> = ({ trip }) => {
  if (!trip) return null;

  const compliance: ComplianceReport | undefined = trip.compliance;
  const score = compliance?.overall_score ?? 0;
  const isCompliant = compliance?.is_compliant ?? false;
  const rules = compliance?.rules ?? [];
  const violationCount = compliance?.violation_count ?? 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full px-6 py-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl border',
              isCompliant
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20'
            )}>
              <ShieldCheck className={isCompliant ? 'text-emerald-400' : 'text-red-400'} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">FMCSA Compliance</h2>
              <p className="text-sm text-zinc-500">
                {isCompliant
                  ? 'All Hours of Service rules verified for this trip.'
                  : `${violationCount} violation${violationCount !== 1 ? 's' : ''} detected across the schedule.`}
              </p>
            </div>
          </div>

          <div className={cn(
            'flex items-center gap-4 rounded-2xl px-6 py-4 border',
            isCompliant
              ? 'bg-emerald-500/[0.08] border-emerald-500/20'
              : 'bg-red-500/[0.08] border-red-500/20'
          )}>
            <div>
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Overall Score</div>
              <div className={cn(
                'text-3xl font-bold tabular-nums',
                isCompliant ? 'text-emerald-400' : 'text-red-400'
              )}>
                {score}%
              </div>
            </div>
            {isCompliant ? (
              <CheckCircle2 className="text-emerald-500/30" size={44} />
            ) : (
              <XCircle className="text-red-500/30" size={44} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map(rule => (
            <div
              key={rule.rule_id}
              className={cn(
                'rounded-xl p-5 border transition-all',
                rule.passed
                  ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                  : 'bg-red-500/[0.04] border-red-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-1 rounded-full shrink-0 mt-0.5',
                  rule.passed ? 'bg-emerald-500/15' : 'bg-red-500/15'
                )}>
                  {rule.passed ? (
                    <CheckCircle2 className="text-emerald-400" size={14} />
                  ) : (
                    <XCircle className="text-red-400" size={14} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn(
                    'font-semibold text-sm mb-1',
                    rule.passed ? 'text-zinc-200' : 'text-red-300'
                  )}>
                    {rule.rule_name}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">{rule.description}</p>

                  {!rule.passed && rule.violations.length > 0 && (
                    <div className="space-y-2">
                      {rule.violations.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/15"
                        >
                          <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-red-300 leading-relaxed">{v.message}</p>
                            <p className="text-[10px] text-red-400/60 mt-1 tabular-nums">
                              {new Date(v.occurred_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceView;
