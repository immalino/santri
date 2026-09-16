import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import type { SantriProgressData, WaliKitabProgress } from "@/lib/santri-progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

/** Accent color for a single page's score badge (shared read mode). */
function pageVariant(persentase: number | null): "success" | "warning" | "danger" | "secondary" {
  if (persentase === null) return "secondary";
  if (persentase >= 75) return "success";
  if (persentase >= 40) return "warning";
  return "danger";
}

/** Read-mode kitab card: summary shows the average bar, tap expands per page. */
function KitabReadCard({ kitab }: { kitab: WaliKitabProgress }) {
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

/** Edit-mode kitab card: whole card links to the per-page grading grid. */
function KitabEditCard({ kitab, href }: { kitab: WaliKitabProgress; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-background active:border-primary active:bg-background"
    >
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
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
        <Pencil className="h-4 w-4" aria-hidden />
        Edit nilai
      </span>
    </Link>
  );
}

/**
 * Shared santri progress detail (Fase 8). Header with the overall average,
 * then per-kitab progress. In edit mode (admin/ustadz) each kitab card links
 * to its grading grid; in read mode (wali) each card expands inline to the
 * per-page breakdown. Server component, purely presentational.
 */
export function SantriProgressDetail({
  mode,
  data,
  kitabLinkPrefix,
}: {
  mode: "edit" | "read";
  data: SantriProgressData;
  /** Base for edit-mode kitab links, e.g. `/admin/santri/{id}/kitab`. */
  kitabLinkPrefix: string;
}) {
  return (
    <div className="space-y-6">
      {/* Header card: identity + overall average. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{data.nama}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{data.kelasNama ?? "Tanpa kelas"}</p>
          </div>
          <Badge variant={data.statusAktif ? "success" : "secondary"}>
            {data.statusAktif ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Rata-rata keseluruhan</span>
            <span>{data.rataRataKeseluruhan}%</span>
          </div>
          <ProgressBar value={data.rataRataKeseluruhan} />
        </div>
      </Card>

      {!data.hasPenilaian && (
        <Card className="p-5 text-sm text-ink-secondary">
          Belum ada penilaian untuk <span className="font-medium text-ink">{data.nama}</span>.
          Nilai akan otomatis tampil setelah ustadz menginput.
        </Card>
      )}

      {data.kitab.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">Belum ada kitab.</Card>
      ) : mode === "edit" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.kitab.map((kitab) => (
            <KitabEditCard
              key={kitab.kitabId}
              kitab={kitab}
              href={`${kitabLinkPrefix}/${kitab.kitabId}`}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.kitab.map((kitab) => (
            <KitabReadCard key={kitab.kitabId} kitab={kitab} />
          ))}
        </div>
      )}
    </div>
  );
}
