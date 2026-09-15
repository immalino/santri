import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import { KegiatanDetailManager } from "@/components/shared/kegiatan-detail-manager";
import { getKegiatanDetail } from "@/lib/absensi-stats";
import type { PickerSantri } from "@/components/shared/peserta-picker";

export const metadata = {
  title: "Detail Kegiatan | e-Santri",
};

/** Ustadz kegiatan detail (Fase 10): peserta + sesi management. */
export default async function UstadzKegiatanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id } = await params;

  const [detail, santris] = await Promise.all([
    getKegiatanDetail(id),
    db.query.santri.findMany({
      columns: { id: true, nama: true, statusAktif: true, kategoriUsia: true, jenisKelamin: true },
      with: { kelas: { columns: { namaKelas: true } } },
      orderBy: (s, { asc }) => [asc(s.nama)],
    }),
  ]);
  if (!detail) notFound();

  const allSantri: PickerSantri[] = santris.map((s) => ({
    id: s.id,
    nama: s.nama,
    kelasNama: s.kelas?.namaKelas ?? null,
    statusAktif: s.statusAktif,
    kategoriUsia: s.kategoriUsia,
    jenisKelamin: s.jenisKelamin,
  }));

  return (
    <KegiatanDetailManager
      initialDetail={detail}
      allSantri={allSantri}
      basePath="/ustadz/kegiatan"
    />
  );
}
