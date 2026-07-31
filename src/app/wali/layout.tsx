import type { ReactNode } from "react";
import { requireRole } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import TopBar from "@/components/shared/top-bar";
import RoleNav from "@/components/shared/role-nav";

export default async function WaliLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["wali"]);
  return (
    <div className="flex min-h-full flex-col bg-background">
      <TopBar userName={session.user.name} role={session.user.role as Role} />
      <RoleNav role="wali" />
      {/* pb-24 keeps content clear of the fixed mobile bottom nav. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
