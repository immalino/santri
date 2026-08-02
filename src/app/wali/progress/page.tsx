import { ChevronDown } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import {
  getSantriProgressData,
  getWaliSantris,
  type WaliKitabProgress,
} from "@/lib/santri-progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SantriSwitch } from "@/components/wali/santri-switch";

export const metadata = {
  title: "Progress | Sistem Pendataan Pencapaian Santri",
};

/** Accent color for a single page's score badge (task 6.2 breakdown). */
function pageVariant(persentase: number | null): "success" | "warning" | "danger" | "secondary" {
  if (persentase === null) return "secondary";
  if (persentase >= 75) return "success";
  if (persentase >= 40) return "warning";
  return "danger";
}

/** Expandable per-kitab card: summary shows average bar, tap expands per-page. */
function KitabCard({ kitab }: { kitab: WaliKitabProgress }) {
  return (
    <details className="group rounded-2xl border border-border bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 select-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{kitab.namaKitab}</span>
            {kitab.status === "nonaktif" && <Badge variant="secondary">Nonaktif</Badge>}
            <Badge variant="secondary">{kitab.jumlahHalaman} halaman</Badge>
          </div>
          <div className="mt-2 max-w-sm">
            <ProgressBar value={kitab.rataRata} showLabel />
          </div>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-ink-secondary transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="border-t border-border px-5 py-3">
        {kitab.halaman.length === 0 ? (
          <p className="py-2 text-sm text-ink-secondary">Tidak ada halaman.</p>
        ) : (
          <ul className="divide-y divide-border">
            {kitab.halaman.map((h) => (
              <li key={h.halamanId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">Halaman {h.nomorHalaman}</span>
                {h.persentase === null ? (
                  <span className="text-xs text-ink-secondary">Belum dinilai</span>
                ) : (
                  <Badge variant={pageVariant(h.persentase)}>{h.persentase}%</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

/**
 * Wali progress page (tasks 6.2–6.4). Fully server-rendered and driven by the
 * `?santriId=` search param, so the child switch only navigates between URLs
 * and this component re-renders with the fresh data.
 */
export default async function WaliProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ santriId?: string | string[] }>;
}) {
  const session = await requireRole(["wali"]);
  const sp = await searchParams;
  const requested = typeof sp.santriId === "string" ? sp.santriId : undefined;

  const santris = await getWaliSantris(session.user.id);

  if (santris.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Progress Anak</h1>
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

  const selected = santris.find((s) => s.id === requested) ?? santris[0];
  // selected always exists via getWaliSantris, so data is non-null.
  const data = (await getSantriProgressData(selected.id))!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Progress Anak</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Pencapaian per kitab dan rincian per halaman.
        </p>
      </div>

      {santris.length > 1 && (
        <SantriSwitch santris={santris} currentId={selected.id} />
      )}

      {!data.hasPenilaian && (
        <Card className="p-5 text-sm text-ink-secondary">
          Belum ada penilaian untuk <span className="font-medium text-ink">{data.nama}</span>.
          Nilai akan otomatis tampil setelah ustadz menginput.
        </Card>
      )}

      {data.kitab.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">Belum ada kitab.</Card>
      ) : (
        <div className="space-y-3">
          {data.kitab.map((kitab) => (
            <KitabCard key={kitab.kitabId} kitab={kitab} />
          ))}
        </div>
      )}
    </div>
  );
}