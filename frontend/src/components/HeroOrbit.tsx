import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlarmClock, Coffee, Gauge, RotateCcw, ShieldCheck } from 'lucide-react';

type Badge = {
  icon: typeof Gauge;
  label: string;
  angle: number; // degrees, 0 = due right, clockwise
};

const BADGES: Badge[] = [
  { icon: Gauge, label: '11-Hr Driving', angle: -55 },
  { icon: AlarmClock, label: '14-Hr Window', angle: 35 },
  { icon: Coffee, label: '30-Min Break', angle: 125 },
  { icon: RotateCcw, label: '70-Hr Cycle', angle: 215 },
];

const RADIUS = 168; // px, distance of each badge from center

/** Hero centerpiece: a "verified compliant" badge with the four core FMCSA
 * rules orbiting it, plus a single pinged dot standing in for a truck moving
 * along its route. Purely decorative — no product data — so it can rotate
 * forever without implying anything is "live". Slow enough (56s/turn) to read
 * as ambient rather than busy, matching the aurora-drift timing elsewhere on
 * this page. */
export default function HeroOrbit() {
  const reduceMotion = useReducedMotion();

  const positioned = useMemo(
    () =>
      BADGES.map(badge => {
        const rad = (badge.angle * Math.PI) / 180;
        return {
          ...badge,
          x: Math.cos(rad) * RADIUS,
          y: Math.sin(rad) * RADIUS,
        };
      }),
    []
  );

  return (
    <div
      className="relative mx-auto h-[380px] w-[380px] sm:h-[420px] sm:w-[420px] select-none"
      aria-hidden="true"
    >
      {/* Ambient glow behind the whole assembly — clipped to this box so the
          blur can never bleed across the gap into the hero text column. */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div className="absolute inset-0 rounded-full bg-blue-600/[0.1] blur-[80px]" />
      </div>

      {/* Static outer guide ring */}
      <div className="absolute inset-0 rounded-full border border-dashed border-white/[0.08]" />
      {/* Inner guide ring, slightly inset */}
      <div className="absolute inset-[15%] rounded-full border border-white/[0.06]" />

      {/* Rotating ring carrying the rule badges + route dot */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 50%' }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 56, repeat: Infinity, ease: 'linear' }}
      >
        {positioned.map(badge => (
          <div
            key={badge.label}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `translate(${badge.x}px, ${badge.y}px)` }}
          >
            {/* Counter-rotate so the label stays upright and legible as the ring turns */}
            <motion.div
              className="-translate-x-1/2 -translate-y-1/2"
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={{ duration: 56, repeat: Infinity, ease: 'linear' }}
            >
              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-zinc-950/90 px-3 py-1.5 shadow-lg shadow-black/40 backdrop-blur-sm">
                <badge.icon size={12} className="text-accent shrink-0" />
                <span className="text-[10px] font-medium text-zinc-300">{badge.label}</span>
              </div>
            </motion.div>
          </div>
        ))}

        {/* Route dot — a truck's position ticking around the ring */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(${RADIUS}px, 0px)` }}
        >
          <span className="relative -translate-x-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-400" />
          </span>
        </div>
      </motion.div>

      {/* Center: verified-compliant badge */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-blue-500/25 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl shadow-blue-600/20">
          <div className="absolute inset-0 rounded-full bg-blue-500/[0.08] blur-md" />
          <ShieldCheck size={34} className="relative text-accent" />
        </div>
      </div>
    </div>
  );
}
