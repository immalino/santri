import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import KitabManager, { type KitabItem } from "@/components/admin/kitab-manager";

export const metadata = {
  title: "Kelola Kitab | e-Santri",
};

export interface KelasOption {
  id: string;
  namaKelas: string;
  urutan: number;
}

/**
 * Kitab admin page (tasks 4.5–4.6). Server component: guard role, query the
 * DB directly, then hand the (JSON-serializable) list to the client manager.
 */
export default async function AdminKitabPage() {
  await requireRole(["admin"]);

  const [kitabRows, kelasRows] = await Promise.all([
    db.query.kitab.findMany({
      orderBy: (k, { desc }) => [desc(k.createdAt)],
      columns: {
        id: true,
        namaKitab: true,
        jumlahHalaman: true,
        deskripsi: true,
        status: true,
        kelasId: true,
      },
      with: { kelas: { columns: { namaKelas: true } } },
    }),
    db.query.kelas.findMany({
      orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
      columns: { id: true, namaKelas: true, urutan: true },
    }),
  ]);
  const initialKitabs: KitabItem[] = kitabRows.map((r) => ({
    id: r.id,
    namaKitab: r.namaKitab,
    jumlahHalaman: r.jumlahHalaman,
    deskripsi: r.deskripsi,
    status: r.status,
    kelasId: r.kelasId,
    kelasNama: r.kelas?.namaKelas ?? null,
  }));
  const kelasOptions: KelasOption[] = kelasRows.map((k) => ({
    id: k.id,
    namaKelas: k.namaKelas,
    urutan: k.urutan,
  }));

  return <KitabManager initialKitabs={initialKitabs} kelasOptions={kelasOptions} />;
}
