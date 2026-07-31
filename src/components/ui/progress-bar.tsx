interface ProgressBarProps {
  /** 0-100 percentage (clamped defensively). */
  value: number;
  className?: string;
  /** Renders the numeric label next to the bar. */
  showLabel?: boolean;
}

/**
 * Achievement progress bar — DESIGN.md §5/§2: 8px rounded bar that fills with
 * a green → gold gradient as the value rises. At 0% only the gray track is
 * visible; at 100% the full gradient ends in gold.
 */
export function ProgressBar({ value, className = "", showLabel = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-secondary/15"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${clamped}%`,
            background: "linear-gradient(90deg, var(--success), var(--accent))",
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums text-ink-secondary">{clamped}%</span>
      )}
    </div>
  );
}
