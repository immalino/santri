import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import KelasManager, { type KelasItem } from "@/components/admin/kelas-manager";

export const metadata = {
  title: "Kelola Kelas | e-Santri",
};

/** Kelas admin page (task 4.7). */
export default async function AdminKelasPage() {
  await requireRole(["admin"]);

  const rows = await db.query.kelas.findMany({
    orderBy: (k, { asc }) => [asc(k.namaKelas)],
    with: { santri: { columns: { id: true } } },
  });
  const initialKelas: KelasItem[] = rows.map((r) => ({
    id: r.id,
    namaKelas: r.namaKelas,
    deskripsi: r.deskripsi,
    urutan: r.urutan,
    bebasSyarat: r.bebasSyarat,
    jumlahSantri: r.santri.length,
  }));

  return <KelasManager initialKelas={initialKelas} />;
}