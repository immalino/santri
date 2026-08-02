"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await toast.promise(
        async () => {
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        },
        {
          loading: "Keluar...",
          success: "Berhasil keluar.",
          error: "Gagal keluar. Silakan coba lagi.",
        },
      );
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Keluar"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {loading ? "..." : "Keluar"}
    </Button>
  );
}
