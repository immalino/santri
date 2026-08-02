/** Skeleton loading placeholder, used by route-level loading.tsx files so the
    loading look is consistent. Callers pass size classes via `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-ink-secondary/15 ${className}`} aria-hidden />
  );
}
