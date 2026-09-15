import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Detail Santri | e-Santri",
};

/**
 * Admin santri detail (Fase 8): header + per-kitab progress, each kitab card
 * linking to the editable per-page grid. Reached from the santri list and the
 * dashboard "Progress per Santri" cards.
 */
export default async function AdminSantriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const data = await getSantriProgressData(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/admin/santri">Kembali ke daftar santri</BackLink>
      <SantriProgressDetail
        mode="edit"
        data={data}
        kitabLinkPrefix={`/admin/santri/${id}/kitab`}
      />
    </div>
  );
}
