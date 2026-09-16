import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Pencapaian Materi Santri | e-Santri",
};

/**
 * Admin detail pencapaian materi: daftar kitab penuh + breakdown per halaman,
 * each kitab card linking to the editable per-page grid.
 */
export default async function AdminSantriPencapaianPage({
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
      <BackLink href={`/admin/santri/${id}`}>Kembali ke ringkasan santri</BackLink>
      <SantriProgressDetail
        mode="edit"
        data={data}
        kitabLinkPrefix={`/admin/santri/${id}/kitab`}
      />
    </div>
  );
}
