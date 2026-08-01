import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

/** A still of the real compliance result screen, built from the same markup as
 * ComplianceView so it can never drift out of style with the product. Swap for
 * a real screenshot or GIF by replacing this block with an <img>. */
function CompliancePreview() {
  const rules = [
    { name: '11-Hour Driving Limit', passed: true },
    { name: '14-Hour Duty Window', passed: true },
    { name: '30-Minute Break Rule', passed: false },
    { name: '70-Hour/8-Day Cycle', passed: true },
  ];

  return (
    <div
      aria-label="Preview of the compliance result screen"
      className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 shadow-2xl shadow-black/50 overflow-hidden"
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
        <span className="ml-3 text-[11px] text-zinc-600">Compliance — Dallas, TX → Los Angeles, CA</span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-red-500/10 border-red-500/20">
              <ShieldCheck className="text-red-400" size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">FMCSA Compliance</h3>
              <p className="text-sm text-zinc-500">1 violation detected across the schedule.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl px-5 py-3.5 border bg-red-500/[0.08] border-red-500/20">
            <div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                Overall Score
              </div>
              <div className="text-3xl font-bold tabular-nums text-red-400">82%</div>
            </div>
            <XCircle className="text-red-500/30" size={40} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rules.map(rule => (
            <div
              key={rule.name}
              className={cn(
                'rounded-xl p-4 border',
                rule.passed
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-red-500/[0.04] border-red-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'p-1 rounded-full shrink-0 mt-0.5',
                    rule.passed ? 'bg-emerald-500/15' : 'bg-red-500/15'
                  )}
                >
                  {rule.passed ? (
                    <CheckCircle2 className="text-emerald-400" size={13} />
                  ) : (
                    <XCircle className="text-red-400" size={13} />
                  )}
                </div>
                <div className="min-w-0">
                  <h4
                    className={cn(
                      'font-semibold text-[13px]',
                      rule.passed ? 'text-zinc-200' : 'text-red-300'
                    )}
                  >
                    {rule.name}
                  </h4>
                  {!rule.passed && (
                    <p className="text-[11px] text-red-300/80 leading-relaxed mt-1.5">
                      Driving 8.5h without a 30-minute interruption, starting 06:00 on day 2.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/[0.03] rounded-full blur-[100px]" />
      </div>

      <header className="relative z-20 h-14 shrink-0 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-md" />
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <Truck size={18} className="text-white" />
              </div>
            </div>
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-zinc-50">
                SpotterTruckLogger
              </span>
              <span className="block text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
                FMCSA Compliance Suite
              </span>
            </div>
          </div>

          <Link
            to="/app"
            className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-zinc-50 leading-[1.1]">
              Know if a trip is HOS-legal before you dispatch it.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
              Enter a route and your current cycle hours, and SpotterTruckLogger plans the drive
              against the FMCSA Hours of Service rules — the 11-hour limit, the 14-hour window, the
              30-minute break and the 70-hour cycle. You get a pass/fail verdict with the exact
              violation and when it happens, plus FMCSA-style daily log sheets ready to download as
              PDFs.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to="/app?signup=1"
                className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
              >
                Try it free
              </Link>
              <span className="text-xs text-zinc-600">
                No credit card. Your trips stay private to your account.
              </span>
            </div>
          </div>

          <div className="mt-14 sm:mt-16">
            <CompliancePreview />
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} SpotterTruckLogger
          </p>
          <p className="text-[11px] text-zinc-600">
            A trip-planning aid, not a certified ELD. Drivers remain responsible for their records.
          </p>
        </div>
      </footer>
    </div>
  );
}
