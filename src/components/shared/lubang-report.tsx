import type { LubangKelas } from "@/lib/kenaikan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * "Halaman paling kosong" report: one block per curriculum kelas with its
 * top-100 emptiest pages. Server component, purely presentational.
 */
export function LubangReport({ data }: { data: LubangKelas[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-ink-secondary">
        Belum ada materi yang dipetakan ke kelas.
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {data.map((blok) => (
        <Card key={blok.kelasId} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Materi {blok.namaKelas}</h3>
            <Badge variant="secondary">{blok.halaman.length} halaman</Badge>
          </div>
          {blok.halaman.length === 0 ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Semua materi kelas ini sudah khatam.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {blok.halaman.map((h) => (
                <li key={`${h.kitabId}-${h.nomorHalaman}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {h.namaKitab} — Halaman {h.nomorHalaman}
                    </span>
                    <span className="block text-xs text-ink-secondary">
                      {h.khatamCount}/{h.totalSantri} khatam • {h.totalSantri - h.khatamCount} belum
                    </span>
                  </span>
                  <Badge variant={h.persenKhatam >= 75 ? "success" : h.persenKhatam >= 40 ? "warning" : "danger"}>
                    {h.persenKhatam}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
