import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Simple global loading skeleton while a route's server data is streaming. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6" role="status" aria-label="Memuat">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Memuat…
      </p>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="mt-6 h-24" />
    </div>
  );
}
