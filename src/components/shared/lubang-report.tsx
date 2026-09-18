"use client";

import { useState } from "react";
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
 * Per-kitab mastery report: one block per kitab with every page's average
 * across all santri (0% = everybody empty). A global toggle switches all
 * blocks between page order and emptiest-first (ties always break by page
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-secondary">Urutkan:</span>
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

      {data.map((kitab) => {
        const halaman =
          mode === "kosong"
            ? [...kitab.halaman].sort(
                (a, b) => a.rataRata - b.rataRata || a.nomorHalaman - b.nomorHalaman,
              )
            : kitab.halaman;
        return (
          <Card key={kitab.kitabId} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="font-semibold text-ink">{kitab.namaKitab}</h3>
                <Badge variant="secondary">{kitab.kelasNama}</Badge>
              </div>
              <Badge variant={rataVariant(kitab.rataRata)}>{kitab.rataRata}%</Badge>
            </div>
            <ul className="mt-2 divide-y divide-border">
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
          </Card>
        );
      })}
    </div>
  );
}
