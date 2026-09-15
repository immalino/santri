import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import KitabManager, { type KitabItem } from "@/components/admin/kitab-manager";

export const metadata = {
  title: "Kelola Kitab | e-Santri",
};

/**
 * Kitab admin page (tasks 4.5–4.6). Server component: guard role, query the
 * DB directly, then hand the (JSON-serializable) list to the client manager.
 */
export default async function AdminKitabPage() {
  await requireRole(["admin"]);

  const rows = await db.query.kitab.findMany({
    orderBy: (k, { desc }) => [desc(k.createdAt)],
    columns: { id: true, namaKitab: true, jumlahHalaman: true, deskripsi: true, status: true },
  });
  const initialKitabs: KitabItem[] = rows.map((r) => ({
    id: r.id,
    namaKitab: r.namaKitab,
    jumlahHalaman: r.jumlahHalaman,
    deskripsi: r.deskripsi,
    status: r.status,
  }));

  return <KitabManager initialKitabs={initialKitabs} />;
}
