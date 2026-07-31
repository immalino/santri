import type { ReactNode } from "react";
import { requireRole } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import TopBar from "@/components/shared/top-bar";

export default async function WaliLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["wali"]);
  return (
    <div className="flex min-h-full flex-col bg-[#FAF7F0]">
      <TopBar userName={session.user.name} role={session.user.role as Role} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
