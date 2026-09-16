import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { AbsensiSheet } from "@/components/shared/absensi-sheet";
import { LaporanCard } from "@/components/shared/laporan-card";
import { getKegiatanTemplates, getSesiAbsensi } from "@/lib/absensi-stats";

export const metadata = {
  title: "Input Absensi | e-Santri",
};

/** Ustadz sesi absensi input (Fase 10). */
export default async function UstadzSesiAbsensiPage({
  params,
}: {
  params: Promise<{ id: string; sesiId: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id, sesiId } = await params;

  const [data, templates] = await Promise.all([
    getSesiAbsensi(sesiId),
    getKegiatanTemplates(id),
  ]);
  if (!data || data.kegiatanId !== id) notFound();

  return (
    <AbsensiSheet
      initialData={data}
      postUrl={`/api/kegiatan/${id}/sesi/${sesiId}/absensi`}
      backHref={`/ustadz/kegiatan/${id}`}
      laporanSlot={<LaporanCard sesi={data} templates={templates} detailHref={`/ustadz/kegiatan/${id}`} />}
    />
  );
}
