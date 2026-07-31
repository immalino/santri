/** Simple global loading skeleton while a route's server data is streaming. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6" role="status" aria-label="Memuat">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-ink-secondary/15" />
      <div className="h-4 w-72 animate-pulse rounded-lg bg-ink-secondary/10" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
