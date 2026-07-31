"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
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
