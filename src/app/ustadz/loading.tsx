import { Skeleton } from "@/components/ui/skeleton";

/** Ustadz page loading skeleton (renders inside the ustadz layout, nav visible). */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
