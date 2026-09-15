import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { AbsensiSheet } from "@/components/shared/absensi-sheet";
import { getSesiAbsensi } from "@/lib/absensi-stats";

export const metadata = {
  title: "Input Absensi | Sistem Pendataan Pencapaian Santri",
};

/** Admin sesi absensi input (Fase 10). */
export default async function AdminSesiAbsensiPage({
  params,
}: {
  params: Promise<{ id: string; sesiId: string }>;
}) {
  await requireRole(["admin"]);
  const { id, sesiId } = await params;

  const data = await getSesiAbsensi(sesiId);
  if (!data || data.kegiatanId !== id) notFound();

  return (
    <AbsensiSheet
      initialData={data}
      postUrl={`/api/kegiatan/${id}/sesi/${sesiId}/absensi`}
      backHref={`/admin/kegiatan/${id}`}
    />
  );
}
