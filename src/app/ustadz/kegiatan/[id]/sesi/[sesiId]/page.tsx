import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { AbsensiSheet } from "@/components/shared/absensi-sheet";
import { getSesiAbsensi } from "@/lib/absensi-stats";

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

  const data = await getSesiAbsensi(sesiId);
  if (!data || data.kegiatanId !== id) notFound();

  return (
    <AbsensiSheet
      initialData={data}
      postUrl={`/api/kegiatan/${id}/sesi/${sesiId}/absensi`}
      backHref={`/ustadz/kegiatan/${id}`}
    />
  );
}
