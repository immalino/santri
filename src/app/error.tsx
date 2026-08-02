"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-secondary">
        Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi.
      </p>
      <Button onClick={unstable_retry} className="mt-6">
        Coba Lagi
      </Button>
    </div>
  );
}
