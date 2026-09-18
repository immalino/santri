import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData, getWaliSantris } from "@/lib/santri-progress";
import { getKenaikanStatus } from "@/lib/kenaikan";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { KenaikanCard } from "@/components/shared/kenaikan-card";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Pencapaian Materi Santri | e-Santri",
};

/**
 * Wali detail pencapaian materi (read-only): daftar kitab penuh + expandable
 * per-page breakdown. Ownership is enforced — a wali may only view children
 * linked to their account; anything else 404s.
 */
export default async function WaliSantriPencapaianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["wali"]);
  const { id } = await params;

  const linked = await getWaliSantris(session.user.id);
  if (!linked.some((s) => s.id === id)) notFound();

  const data = await getSantriProgressData(id);
  if (!data) notFound();
  const kenaikan = await getKenaikanStatus(id);

  return (
    <div className="space-y-6">
      <BackLink href={`/wali/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      {kenaikan ? <KenaikanCard status={kenaikan} /> : null}
      {/* kitabLinkPrefix is only used in edit mode — irrelevant here. */}
      <SantriProgressDetail mode="read" data={data} kitabLinkPrefix="" />
    </div>
  );
}
