import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Network,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import Logo from './Logo.tsx';
import HeroOrbit from './HeroOrbit.tsx';
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
            <div className="p-2.5 rounded-xl border bg-danger-muted border-red-500/20">
              <ShieldCheck className="text-danger" size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">FMCSA Compliance</h3>
              <p className="text-sm text-zinc-500">1 violation detected across the schedule.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl px-5 py-3.5 border bg-danger-muted border-red-500/20">
            <div>
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                Overall Score
              </div>
              <div className="text-3xl font-bold tabular-nums text-danger">82%</div>
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
                  : 'bg-danger-muted border-red-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'p-1 rounded-full shrink-0 mt-0.5',
                    rule.passed ? 'bg-success-muted' : 'bg-danger-muted'
                  )}
                >
                  {rule.passed ? (
                    <CheckCircle2 className="text-success" size={13} />
                  ) : (
                    <XCircle className="text-danger" size={13} />
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

        {/* Floating "fix" callout — the plain-English reasoning is the actual
            differentiator, so it gets pulled into the hero visual itself
            rather than staying buried in a features list. */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3.5">
          <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            <span className="font-medium text-blue-300">Fix: </span>
            Add a 30-minute break before 8 cumulative hours of driving.
          </p>
        </div>
      </div>
    </div>
  );
}

const SEGMENTS = [
  { icon: Truck, label: 'Owner-Operators' },
  { icon: Building2, label: 'Small Fleets' },
  { icon: Network, label: 'Dispatch Agencies' },
];

const RULES = [
  '11-Hour Driving Limit',
  '14-Hour Duty Window',
  '30-Minute Break Rule',
  '70-Hour/8-Day Cycle',
  '10-Hour Reset',
  '34-Hour Restart',
];

const STEPS = [
  {
    number: '01',
    title: 'Enter the trip',
    description: 'Current location, pickup, dropoff, and the hours already used in this cycle.',
  },
  {
    number: '02',
    title: 'Get an instant verdict',
    description:
      'Every FMCSA rule is checked in one pass — pass/fail, the exact violation, and when it happens.',
  },
  {
    number: '03',
    title: 'Dispatch with confidence',
    description: 'Every check is logged automatically, so you have proof of due diligence on file.',
  },
];

const OLD_WAY = [
  'Doing HOS math by hand or in a spreadsheet before every load',
  'Hoping the driver’s cycle hours add up correctly',
  'Finding out about a violation after the truck already left',
  'No record that anyone checked anything at all',
];

const NEW_WAY = [
  'Every FMCSA rule checked automatically, in seconds',
  'An exact verdict — pass, fail, and exactly why',
  'Caught before the truck ever leaves the yard',
  'Every check logged automatically for your records',
];

const SIDE_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Full FMCSA Rules Engine',
    description:
      '11-hour driving, 14-hour window, 30-minute break, 70-hour cycle, 10-hour reset, and 34-hour restart — all checked automatically.',
  },
  {
    icon: ClipboardCheck,
    title: 'Built-in Audit Trail',
    description:
      'Every check you run is logged — proof you verified compliance before the truck left the yard.',
  },
  {
    icon: FileText,
    title: 'FMCSA-Style Log Sheets',
    description:
      'Industry-standard daily log grids generated automatically and ready to download as PDF.',
  },
];

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-zinc-100 font-sans selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/4 w-[600px] h-[400px] bg-blue-600/[0.06] rounded-full blur-[120px] animate-aurora" />
        <div className="absolute top-[10%] right-[5%] w-[420px] h-[420px] bg-indigo-500/[0.05] rounded-full blur-[110px] animate-aurora-delayed" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[100px] animate-aurora" />
      </div>

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 relative z-20 h-16 shrink-0 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-6">
          <Logo size={30} />

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              to="/app"
              className="text-[13px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/app?signup=1"
              className="hidden sm:inline-flex items-center justify-center bg-white text-zinc-950 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all hover:bg-zinc-200 active:scale-[0.97]"
            >
              Try it free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative bg-grid">
          <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-8">
              {/* Text/CTA render at full opacity from the first paint — this is the
                  one block on the page that must never be caught mid-animation, so
                  it doesn't depend on a fade-in to become visible. */}
              <div className="max-w-xl relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] pl-2.5 pr-3.5 py-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
                  </span>
                  <span className="text-[11px] font-semibold text-blue-300 tracking-wide">
                    Pre-dispatch HOS compliance, checked instantly
                  </span>
                </div>

                <h1 className="mt-5 text-5xl sm:text-6xl lg:text-[60px] font-semibold tracking-tight text-zinc-50 leading-[1.05]">
                  Know if a trip is{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">
                    legal.
                  </span>
                  <br />
                  Before you dispatch it.
                </h1>

                <p className="mt-5 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
                  Enter a route and current cycle hours. Get a pass/fail HOS verdict in seconds —
                  with the exact rule, the exact moment, and the fix. No spreadsheets, no guessing.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link
                    to="/app?signup=1"
                    className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.97]"
                  >
                    Try it free
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center text-sm font-medium text-zinc-300 hover:text-white px-4 py-3.5 rounded-xl border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03] transition-all"
                  >
                    See how it works
                  </a>
                </div>

                <p className="mt-4 text-xs text-zinc-600">
                  No credit card required. Your trips stay private to your account.
                </p>
              </div>

              <div className="relative z-0 animate-fade-in-up stagger-2">
                <HeroOrbit />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Segment strip ---------- */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-center gap-x-10 gap-y-4">
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">
              Built for
            </span>
            {SEGMENTS.map(seg => (
              <div key={seg.label} className="flex items-center gap-2 text-zinc-400">
                <seg.icon size={15} className="text-zinc-600" />
                <span className="text-sm font-medium">{seg.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Rules marquee ---------- */}
        <section className="group border-b border-white/[0.06] overflow-hidden py-5 bg-white/[0.01]">
          <div className="flex w-max animate-marquee">
            {[...RULES, ...RULES].map((rule, i) => (
              <div
                key={`${rule}-${i}`}
                className="flex items-center gap-2 px-6 shrink-0 text-xs font-medium text-zinc-600 whitespace-nowrap"
              >
                <ShieldCheck size={13} className="text-zinc-700" />
                {rule}
                <span className="ml-6 text-zinc-800">/</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="scroll-mt-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
            <div className="max-w-xl">
              <span className="text-[11px] font-bold text-accent uppercase tracking-widest">
                How it works
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
                Three steps between a load and a legal trip.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className={cn('relative animate-fade-in-up', `stagger-${i + 1}`)}
                >
                  <span className="text-[13px] font-bold text-zinc-700 tabular-nums">
                    {step.number}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-100">{step.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-1.5 -right-3 w-6 h-px bg-white/[0.08]" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-14 max-w-3xl mx-auto animate-fade-in-up stagger-3">
              <CompliancePreview />
            </div>
          </div>
        </section>

        {/* ---------- Old way vs RunLegal ---------- */}
        <section className="border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
            <div className="max-w-xl">
              <span className="text-[11px] font-bold text-accent uppercase tracking-widest">
                Why it matters
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
                Spreadsheets don&apos;t catch violations. RunLegal does.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                  Without RunLegal
                </span>
                <ul className="mt-5 flex flex-col gap-4">
                  {OLD_WAY.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 p-0.5 rounded-full bg-danger-muted shrink-0">
                        <X size={13} className="text-danger" />
                      </span>
                      <span className="text-sm text-zinc-500 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-6 sm:p-7 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                <span className="relative text-[11px] font-bold text-accent uppercase tracking-widest">
                  With RunLegal
                </span>
                <ul className="relative mt-5 flex flex-col gap-4">
                  {NEW_WAY.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 p-0.5 rounded-full bg-success-muted shrink-0">
                        <CheckCircle2 size={13} className="text-success" />
                      </span>
                      <span className="text-sm text-zinc-200 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Feature bento ---------- */}
        <section id="features" className="scroll-mt-16 border-t border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
            <div className="max-w-xl">
              <span className="text-[11px] font-bold text-accent uppercase tracking-widest">
                What you get
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
                Everything a dispatcher needs to say yes with confidence.
              </h2>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              {/* Spotlight card — the plain-English reasoning is the real
                  differentiator, so it gets the widest, most detailed card
                  instead of competing for space in a uniform grid. */}
              <div className="group grid grid-cols-1 lg:grid-cols-2 gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 transition-all hover:bg-white/[0.035] hover:border-white/[0.1] animate-fade-in-up">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex w-fit p-2.5 rounded-xl bg-accent-muted border border-blue-500/20">
                    <MessageSquareText size={18} className="text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                    Plain-English Reasoning
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-sm">
                    Not just pass or fail. Every violation comes with why it happened and exactly
                    what to change — no FMCSA rulebook required.
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 sm:p-5">
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-danger-muted p-3">
                    <XCircle size={14} className="text-danger shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">
                      Drove 8.5 cumulative hours without a 30-minute interruption, starting 06:00
                      on day 2.
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-3">
                    <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <span className="font-medium text-blue-300">Fix: </span>
                      Add a 30-minute break before 8 cumulative hours of driving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SIDE_FEATURES.map((feature, i) => (
                  <div
                    key={feature.title}
                    className={cn(
                      'group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-white/[0.1] hover:-translate-y-0.5 animate-fade-in-up',
                      `stagger-${i + 1}`
                    )}
                  >
                    <div className="inline-flex p-2.5 rounded-xl bg-accent-muted border border-blue-500/20">
                      <feature.icon size={18} className="text-accent" />
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold text-zinc-100">{feature.title}</h3>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="relative border-t border-white/[0.06] bg-grid">
          <div className="relative max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-24 flex flex-col items-center text-center">
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-50 max-w-2xl">
              Every load, run legal.
            </h2>
            <p className="mt-4 text-base text-zinc-400 max-w-md">
              Run your first pre-dispatch check in under a minute.
            </p>
            <Link
              to="/app?signup=1"
              className="mt-8 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.97]"
            >
              Try it free
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
            <div className="max-w-xs">
              <Logo size={26} />
              <p className="mt-3 text-xs text-zinc-600 leading-relaxed">
                A pre-dispatch HOS compliance check for owner-operators, fleets, and dispatch
                agencies.
              </p>
            </div>

            <div className="flex gap-12">
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Product
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  <a href="#how-it-works" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    How it works
                  </a>
                  <a href="#features" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    Features
                  </a>
                  <Link to="/app" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">
              © {new Date().getFullYear()} RunLegal
            </p>
            <p className="text-[11px] text-zinc-600 text-center sm:text-right">
              A trip-planning aid, not a certified ELD. Drivers remain responsible for their records.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
