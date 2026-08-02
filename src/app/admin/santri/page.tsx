import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import SantriManager, {
  type SantriItem,
  type KelasOption,
} from "@/components/admin/santri-manager";

export const metadata = {
  title: "Kelola Santri | Sistem Pendataan Pencapaian Santri",
};

/** Santri admin page (tasks 4.8–4.9). */
export default async function AdminSantriPage() {
  await requireRole(["admin"]);

  const [santriRows, kelasRows] = await Promise.all([
    db.query.santri.findMany({
      orderBy: (s, { asc }) => [asc(s.nama)],
      with: { kelas: { columns: { namaKelas: true } } },
    }),
    db.query.kelas.findMany({
      orderBy: (k, { asc }) => [asc(k.namaKelas)],
      columns: { id: true, namaKelas: true },
    }),
  ]);

  const initialSantris: SantriItem[] = santriRows.map((r) => ({
    id: r.id,
    nama: r.nama,
    kelasId: r.kelasId,
    kelasNama: r.kelas?.namaKelas ?? null,
    statusAktif: r.statusAktif,
  }));
  const initialKelas: KelasOption[] = kelasRows.map((k) => ({
    id: k.id,
    namaKelas: k.namaKelas,
  }));

  return <SantriManager initialSantris={initialSantris} initialKelas={initialKelas} />;
}