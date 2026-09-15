import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Detail Santri | e-Santri",
};

/**
 * Ustadz santri detail (Fase 8): header + per-kitab progress, each kitab card
 * linking to the editable per-page grid.
 */
export default async function UstadzSantriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id } = await params;
  const data = await getSantriProgressData(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/ustadz/santri" />
      <SantriProgressDetail
        mode="edit"
        data={data}
        kitabLinkPrefix={`/ustadz/santri/${id}/kitab`}
      />
    </div>
  );
}
