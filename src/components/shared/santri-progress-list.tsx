"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SantriListControls } from "@/components/shared/santri-list-controls";
import {
  DEFAULT_SANTRI_LIST_STATE,
  filterAndSortSantri,
  uniqueKelasNames,
  type SantriListState,
} from "@/lib/santri-filter";

export interface SantriProgressListItem {
  id: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  progress: number;
}

/**
 * Read-only santri list with overall progress, shared by the ustadz and wali
 * pages. Adds client-side search/filter/sort; links to the per-santri detail.
 */
export function SantriProgressList({
  items,
  hrefPrefix,
  emptyText,
}: {
  items: SantriProgressListItem[];
  /** e.g. "/ustadz/santri" — the santri id is appended. */
  hrefPrefix: string;
  emptyText: string;
}) {
  const [state, setState] = useState<SantriListState>(DEFAULT_SANTRI_LIST_STATE);
  const kelasOptions = useMemo(() => uniqueKelasNames(items), [items]);
  const visible = useMemo(() => filterAndSortSantri(items, state), [items, state]);

  if (items.length === 0) {
    return <Card className="p-6 text-center text-sm text-ink-secondary">{emptyText}</Card>;
  }

  return (
    <div className="space-y-4">
      <SantriListControls
        state={state}
        onChange={setState}
        kelasOptions={kelasOptions}
        sortOptions={["nama", "kelas", "progress"]}
      />

      {visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Tidak ada santri yang cocok dengan filter.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((s) => (
            <Link
              key={s.id}
              href={`${hrefPrefix}/${s.id}`}
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
