import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { getSantriAbsensi } from "@/lib/absensi-stats";
import { AbsensiHistory } from "@/components/shared/absensi-history";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Kehadiran Santri | e-Santri",
};

/**
 * Ustadz detail kehadiran: riwayat absensi penuh per kegiatan per sesi
 * (read-only).
 */
export default async function UstadzSantriKehadiranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id } = await params;
  const [data, absensi] = await Promise.all([
    getSantriProgressData(id),
    getSantriAbsensi(id),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/ustadz/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      <AbsensiHistory data={absensi} />
    </div>
  );
}
