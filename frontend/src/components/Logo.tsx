/**
 * RunLegal brand mark.
 *
 * The glyph is a checkmark (compliant) drawn with a forward lean (running) —
 * one shape, two meanings, legible down to favicon size. Kept as a real
 * gradient badge (not lucide's generic Truck icon) so the brand has an
 * actual identity instead of borrowing a stock icon.
 */

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-blue-500/30 rounded-[28%] blur-md" />
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        className="relative"
        role="img"
        aria-label="RunLegal"
      >
        <defs>
          <linearGradient id="runlegal-badge" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#runlegal-badge)" />
        <path
          d="M8.5 16.5 L13.5 21.5 L24 9"
          stroke="white"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          transform="rotate(-8 16 16)"
        />
      </svg>
    </div>
  );
}

export default function Logo({
  size = 32,
  wordmarkClassName = 'text-[15px] font-semibold tracking-tight text-zinc-50',
  taglineClassName = 'hidden sm:block text-[10px] text-zinc-500 font-medium tracking-wide uppercase',
  showTagline = false,
}: {
  size?: number;
  wordmarkClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="min-w-0">
        <span className={`block ${wordmarkClassName} truncate`}>RunLegal</span>
        {showTagline && (
          <span className={`block ${taglineClassName} truncate`}>
            FMCSA Compliance Suite
          </span>
        )}
      </div>
    </div>
  );
}
