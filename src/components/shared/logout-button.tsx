"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="min-h-[44px] rounded-xl border border-[#E5DFD0] bg-white px-4 text-sm font-medium text-[#1F2A24] transition-colors hover:bg-[#FAF7F0] disabled:opacity-60"
    >
      {loading ? "..." : "Keluar"}
    </button>
  );
}
