import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Wali page loading skeleton (renders inside the wali layout, nav visible). */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Memuat…
      </p>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
