import { CalendarDays } from "lucide-react";
import type { SantriAbsensiKegiatan, AbsensiStatus } from "@/lib/absensi-stats";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: AbsensiStatus): "success" | "warning" | "danger" {
  if (status === "hadir") return "success";
  if (status === "izin") return "warning";
  return "danger";
}

export function statusLabel(status: AbsensiStatus | null): string {
  if (status === "hadir") return "Hadir";
  if (status === "izin") return "Izin";
  if (status === "tanpa_keterangan") return "Tanpa Ket.";
  return "Belum diabsen";
}

function formatTanggal(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Read-only attendance history of one santri (Fase 10). Server component,
 * purely presentational — reused by the wali detail page (and later by
 * admin/ustadz detail pages if needed).
 */
export function AbsensiHistory({ data }: { data: SantriAbsensiKegiatan[] }) {
  return (
    <section aria-label="Riwayat absensi" className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Absensi Kegiatan</h2>

      {data.length === 0 ? (
        <Card className="p-5 text-sm text-ink-secondary">
          Belum terdaftar di kegiatan apa pun.
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((k) => (
            <details
              key={k.kegiatanId}
              className="group rounded-2xl border border-border bg-surface shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 select-none [&::-webkit-details-marker]:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{k.namaKegiatan}</span>
                    {k.statusKegiatan === "nonaktif" && (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-secondary">
                    {k.hadir} hadir • {k.izin} izin • {k.tanpaKeterangan} tanpa ket.
                    {k.belumDiabsen > 0 ? ` • ${k.belumDiabsen} belum diabsen` : ""} •{" "}
                    {k.totalSesi} sesi
                  </span>
                </span>
              </summary>

              <div className="border-t border-border px-5 py-3">
                {k.sesi.length === 0 ? (
                  <p className="py-2 text-sm text-ink-secondary">Belum ada sesi.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {k.sesi.map((s) => (
                      <li
                        key={s.sesiId}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0 text-sm text-ink">
                          {formatTanggal(s.tanggal)}
                          {s.judul ? (
                            <span className="block truncate text-xs text-ink-secondary">
                              {s.judul}
                            </span>
                          ) : null}
                          {s.status === "izin" && s.keterangan ? (
                            <span className="block truncate text-xs text-ink-secondary">
                              {s.keterangan}
                            </span>
                          ) : null}
                        </span>
                        {s.status === null ? (
                          <span className="shrink-0 text-xs text-ink-secondary">
                            Belum diabsen
                          </span>
                        ) : (
                          <Badge variant={statusVariant(s.status)} className="shrink-0">
                            {statusLabel(s.status)}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
