"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LubangKitab } from "@/lib/kenaikan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SortMode = "kosong" | "halaman";

function rataVariant(rataRata: number): "success" | "warning" | "danger" {
  if (rataRata >= 75) return "success";
  if (rataRata >= 40) return "warning";
  return "danger";
}

/**
 * Per-kitab mastery report grouped by curriculum kelas. Each kitab is a
 * collapsed accordion (native <details>); opening it lists every page's
 * average across all santri (0% = everybody empty). A global toggle switches
 * all blocks between page order and emptiest-first (ties break by page
 * number). Client component — data is fetched once on the server, sorting
 * happens in the browser.
 */
export function LubangReport({ data }: { data: LubangKitab[] }) {
  const [mode, setMode] = useState<SortMode>("kosong");

  if (data.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-ink-secondary">
        Belum ada materi yang dipetakan ke kelas.
      </Card>
    );
  }

  // Group consecutive kitab by kelas (the helper already orders by kelas
  // urutan then kitab name, so equal names are always adjacent).
  const groups: { kelasNama: string; kitab: LubangKitab[] }[] = [];
  for (const kitab of data) {
    const last = groups[groups.length - 1];
    if (last && last.kelasNama === kitab.kelasNama) last.kitab.push(kitab);
    else groups.push({ kelasNama: kitab.kelasNama, kitab: [kitab] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-secondary">Urutkan halaman:</span>
        <Button
          type="button"
          size="sm"
          variant={mode === "halaman" ? "primary" : "secondary"}
          onClick={() => setMode("halaman")}
        >
          Nomor halaman
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "kosong" ? "primary" : "secondary"}
          onClick={() => setMode("kosong")}
        >
          Paling kosong
        </Button>
      </div>

      {groups.map((grup) => (
        <section key={grup.kelasNama} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-secondary">
            Materi {grup.kelasNama}
          </h3>

          {grup.kitab.map((kitab) => {
            const halaman =
              mode === "kosong"
                ? [...kitab.halaman].sort(
                    (a, b) => a.rataRata - b.rataRata || a.nomorHalaman - b.nomorHalaman,
                  )
                : kitab.halaman;
            return (
              <details
                key={kitab.bagianId ?? kitab.kitabId}
                className="group rounded-2xl border border-border bg-surface shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-5 select-none [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        {kitab.namaKitab}
                        {kitab.labelRentang ? <span className="text-ink-secondary"> — {kitab.labelRentang}</span> : null}
                      </span>
                      <Badge variant="secondary">{kitab.halaman.length} halaman</Badge>
                    </div>
                  </div>
                  <Badge variant={rataVariant(kitab.rataRata)}>{kitab.rataRata}%</Badge>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-ink-secondary transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>

                <ul className="divide-y divide-border border-t border-border px-5">
                  {halaman.map((h) => (
                    <li
                      key={h.nomorHalaman}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">
                          Halaman {h.nomorHalaman}
                        </span>
                        <span className="block text-xs text-ink-secondary">
                          {h.dinilaiCount}/{h.totalSantri} santri dinilai
                        </span>
                      </span>
                      <Badge variant={rataVariant(h.rataRata)}>{h.rataRata}%</Badge>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}
