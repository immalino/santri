import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import { KegiatanManager } from "@/components/shared/kegiatan-manager";
import { getKegiatanList } from "@/lib/absensi-stats";
import type { PickerSantri } from "@/components/shared/peserta-picker";

export const metadata = {
  title: "Kegiatan Absensi | e-Santri",
};

/** Ustadz kegiatan list (Fase 10) — same manager as admin, own base path. */
export default async function UstadzKegiatanPage() {
  await requireRole(["ustadz"]);

  const [items, santris] = await Promise.all([
    getKegiatanList(),
    db.query.santri.findMany({
      columns: { id: true, nama: true, statusAktif: true, kategoriUsia: true, jenisKelamin: true },
      with: { kelas: { columns: { namaKelas: true } } },
      orderBy: (s, { asc }) => [asc(s.nama)],
    }),
  ]);
  const allSantri: PickerSantri[] = santris.map((s) => ({
    id: s.id,
    nama: s.nama,
    kelasNama: s.kelas?.namaKelas ?? null,
    statusAktif: s.statusAktif,
    kategoriUsia: s.kategoriUsia,
    jenisKelamin: s.jenisKelamin,
  }));

  return <KegiatanManager initialItems={items} allSantri={allSantri} basePath="/ustadz/kegiatan" />;
}
