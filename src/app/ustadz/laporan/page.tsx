import { requireRole } from "@/lib/permissions";
import { getLubangReport } from "@/lib/kenaikan";
import { LubangReport } from "@/components/shared/lubang-report";

export const metadata = {
  title: "Laporan Materi | e-Santri",
};

/** Ustadz lubang report: per-kitab page averages across all santri. */
export default async function UstadzLaporanPage() {
  await requireRole(["ustadz"]);
  const lubang = await getLubangReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Laporan Materi</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Rata-rata penguasaan per halaman dari semua santri.
        </p>
      </div>
      <LubangReport data={lubang} />
    </div>
  );
}
