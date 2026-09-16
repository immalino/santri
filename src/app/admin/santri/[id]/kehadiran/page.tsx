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
 * Admin detail kehadiran: riwayat absensi penuh per kegiatan per sesi
 * (read-only).
 */
export default async function AdminSantriKehadiranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const [data, absensi] = await Promise.all([
    getSantriProgressData(id),
    getSantriAbsensi(id),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/admin/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      <AbsensiHistory data={absensi} />
    </div>
  );
}
