import { ChevronDown, GraduationCap } from "lucide-react";
import type { KenaikanStatus } from "@/lib/kenaikan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusText(s: KenaikanStatus): string {
  switch (s.status) {
    case "siap":
      return `Siap naik ke ${s.kelasBerikutNama ?? "kelas berikutnya"}`;
    case "kurang":
      return `Kurang ${s.kurangKitab} kitab, ${s.kurangHalaman} halaman untuk naik ke ${s.kelasBerikutNama ?? "kelas berikutnya"}`;
    case "lulus":
      return "Lulus, tidak ada kelas lanjutan";
    case "bebas":
      return "Bebas syarat (kelas lulus)";
    case "tanpa-kelas":
      return "Belum ditempatkan di kelas";
  }
}

/**
 * "Syarat naik kelas" card: one-line status plus the uncompleted kitab in
 * cumulative scope (expandable to uncompleted pages). Server component,
 * purely presentational; read-only for every role.
 */
export function KenaikanCard({ status }: { status: KenaikanStatus }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Syarat Naik Kelas</h2>
          <p className="text-xs text-ink-secondary">{statusText(status)}</p>
        </div>
      </div>

      {status.kitabBelum.length === 0 ? null : (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {status.kitabBelum.map((k) => (
            <details key={k.kitabId} className="group rounded-xl border border-border bg-background/60">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 select-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{k.namaKitab}</span>
                    <Badge variant="secondary">{k.kelasNama}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    Kurang {k.kurangHalaman} dari {k.totalHalaman} halaman
                  </p>
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-ink-secondary transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <ul className="divide-y divide-border border-t border-border px-3">
                {k.halamanBelum.map((h) => (
                  <li key={h.nomorHalaman} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-ink">Halaman {h.nomorHalaman}</span>
                    {h.persentase === null ? (
                      <span className="text-xs text-ink-secondary">Belum dinilai</span>
                    ) : (
                      <Badge variant="secondary">{h.persentase}%</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
