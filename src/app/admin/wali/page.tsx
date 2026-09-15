import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import UserManager, { type UserAccount } from "@/components/admin/user-manager";
import WaliSantriManager from "@/components/admin/wali-santri-manager";

export const metadata = {
  title: "Kelola Wali | e-Santri",
};

/** Wali admin page (tasks 4.10–4.12): account management + santri relations. */
export default async function AdminWaliPage() {
  await requireRole(["admin"]);

  const rows = await db.query.user.findMany({
    where: (u, { eq }) => eq(u.role, "wali"),
    orderBy: (u, { asc }) => [asc(u.name)],
    columns: { id: true, name: true, email: true, role: true, banned: true },
  });
  const initialUsers: UserAccount[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: "wali",
    banned: r.banned,
  }));

  return (
    <div className="space-y-8">
      <UserManager
        initialUsers={initialUsers}
        role="wali"
        title="Kelola Wali"
        description="Daftar akun wali dan relasi wali ↔ santri."
      />
      <WaliSantriManager />
    </div>
  );
}