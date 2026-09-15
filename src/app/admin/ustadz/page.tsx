import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import UserManager, { type UserAccount } from "@/components/admin/user-manager";

export const metadata = {
  title: "Kelola Ustadz | e-Santri",
};

/** Ustadz admin page (tasks 4.10–4.11). */
export default async function AdminUstadzPage() {
  await requireRole(["admin"]);

  const rows = await db.query.user.findMany({
    where: (u, { eq }) => eq(u.role, "ustadz"),
    orderBy: (u, { asc }) => [asc(u.name)],
    columns: { id: true, name: true, email: true, role: true, banned: true },
  });
  const initialUsers: UserAccount[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: "ustadz",
    banned: r.banned,
  }));

  return (
    <UserManager
      initialUsers={initialUsers}
      role="ustadz"
      title="Kelola Ustadz"
      description="Daftar akun ustadz yang menilai pencapaian santri."
    />
  );
}