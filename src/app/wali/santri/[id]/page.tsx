import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData, getWaliSantris } from "@/lib/santri-progress";
import { getSantriAbsensi } from "@/lib/absensi-stats";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { AbsensiHistory } from "@/components/shared/absensi-history";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Detail Santri | e-Santri",
};

/**
 * Wali santri detail (Fase 8): read-only, expandable per-page breakdown, no
 * edit affordance. Ownership is enforced — a wali may only view children
 * linked to their account; anything else 404s.
 */
export default async function WaliSantriDetailPage({
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
      <BackLink href="/wali/santri" />
      {/* kitabLinkPrefix is only used in edit mode — irrelevant here. */}
      <SantriProgressDetail mode="read" data={data} kitabLinkPrefix="" />
      <AbsensiHistory data={absensi} />
    </div>
  );
}
