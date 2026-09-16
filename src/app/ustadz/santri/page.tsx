import Link from "next/link";
import { UserRound } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressList } from "@/lib/santri-progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

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

      {santris.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">Belum ada santri.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {santris.map((s) => (
            <Link
              key={s.id}
              href={`/ustadz/santri/${s.id}`}
              className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-background active:border-primary active:bg-background"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{s.nama}</p>
                    <p className="truncate text-sm text-ink-secondary">
                      {s.kelasNama ?? "Tanpa kelas"}
                    </p>
                  </div>
                </div>
                <Badge variant={s.statusAktif ? "success" : "secondary"}>
                  {s.statusAktif ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-secondary">
                  <span>Rata-rata keseluruhan</span>
                  <span>{s.progress}%</span>
                </div>
                <ProgressBar value={s.progress} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
