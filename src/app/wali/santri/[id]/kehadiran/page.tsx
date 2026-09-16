import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData, getWaliSantris } from "@/lib/santri-progress";
import { getSantriAbsensi } from "@/lib/absensi-stats";
import { AbsensiHistory } from "@/components/shared/absensi-history";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Kehadiran Santri | e-Santri",
};

/**
 * Wali detail kehadiran (read-only): riwayat absensi penuh per kegiatan per
 * sesi. Ownership is enforced — a wali may only view children linked to their
 * account; anything else 404s.
 */
export default async function WaliSantriKehadiranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["wali"]);
  const { id } = await params;

  const linked = await getWaliSantris(session.user.id);
  if (!linked.some((s) => s.id === id)) notFound();

  const [data, absensi] = await Promise.all([
    getSantriProgressData(id),
    getSantriAbsensi(id),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/wali/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      <AbsensiHistory data={absensi} />
    </div>
  );
}
