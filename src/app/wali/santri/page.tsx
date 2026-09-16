import { requireRole } from "@/lib/permissions";
import { getSantriProgressList, getWaliSantris } from "@/lib/santri-progress";
import { Card } from "@/components/ui/card";
import { SantriProgressList } from "@/components/shared/santri-progress-list";

export const metadata = {
  title: "Santri | e-Santri",
};

/**
 * Wali santri list (Fase 8): only the children linked to this wali, each with
 * their overall progress and a read-only detail link.
 */
export default async function WaliSantriPage() {
  const session = await requireRole(["wali"]);
  const linked = await getWaliSantris(session.user.id);

  if (linked.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Santri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Lihat pencapaian anak per kitab dan per halaman.
          </p>
        </div>
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada santri yang terhubung dengan akun ini.
        </Card>
      </div>
    );
  }

  const santris = await getSantriProgressList({ santriIds: linked.map((s) => s.id) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Santri</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Pencapaian anak per kitab dan per halaman. Pilih santri untuk melihat detail.
        </p>
      </div>

      <SantriProgressList
        items={santris}
        hrefPrefix="/wali/santri"
        emptyText="Belum ada santri."
      />
    </div>
  );
}
