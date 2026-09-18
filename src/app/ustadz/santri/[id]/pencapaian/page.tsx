import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { getKenaikanStatus } from "@/lib/kenaikan";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { KenaikanCard } from "@/components/shared/kenaikan-card";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Pencapaian Materi Santri | e-Santri",
};

/**
 * Ustadz detail pencapaian materi: daftar kitab penuh + breakdown per halaman,
 * each kitab card linking to the editable per-page grid.
 */
export default async function UstadzSantriPencapaianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id } = await params;
  const data = await getSantriProgressData(id);
  if (!data) notFound();
  const kenaikan = await getKenaikanStatus(id);

  return (
    <div className="space-y-6">
      <BackLink href={`/ustadz/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      {kenaikan ? <KenaikanCard status={kenaikan} /> : null}
      <SantriProgressDetail
        mode="edit"
        data={data}
        kitabLinkPrefix={`/ustadz/santri/${id}/kitab`}
      />
    </div>
  );
}
