import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { KitabGradeSheet } from "@/components/shared/kitab-grade-sheet";
import { BackLink } from "@/components/shared/back-link";

export const metadata = {
  title: "Nilai Kitab | e-Santri",
};

/**
 * Ustadz per-kitab grading for one santri (Fase 8). The page data already
 * includes the per-page values, so the sheet starts from them without refetch.
 */
export default async function UstadzKitabDetailPage({
  params,
}: {
  params: Promise<{ id: string; kitabId: string }>;
}) {
  await requireRole(["ustadz"]);
  const { id, kitabId } = await params;
  const data = await getSantriProgressData(id);
  if (!data) notFound();
  const kitab = data.kitab.find((k) => k.kitabId === kitabId);
  if (!kitab) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/ustadz/santri/${id}`}>Kembali ke detail santri</BackLink>
      <KitabGradeSheet
        santriId={id}
        santriNama={data.nama}
        kitabId={kitabId}
        kitabNama={kitab.namaKitab}
        initialPages={kitab.halaman}
      />
    </div>
  );
}
