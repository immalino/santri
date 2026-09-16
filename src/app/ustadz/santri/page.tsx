import { requireRole } from "@/lib/permissions";
import { getSantriProgressList } from "@/lib/santri-progress";
import { SantriProgressList } from "@/components/shared/santri-progress-list";

export const metadata = {
  title: "Daftar Santri | e-Santri",
};

/**
 * Ustadz santri list (Fase 8): every santri with their overall progress,
 * linking to the per-santri detail (which is editable).
 */
export default async function UstadzSantriPage() {
  await requireRole(["ustadz"]);
  const santris = await getSantriProgressList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Santri</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Pencapaian santri per kitab dan per halaman. Pilih santri untuk melihat detail.
        </p>
      </div>

      <SantriProgressList
        items={santris}
        hrefPrefix="/ustadz/santri"
        emptyText="Belum ada santri."
      />
    </div>
  );
}
