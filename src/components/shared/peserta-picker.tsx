"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface PickerSantri {
  id: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
}

/**
 * Participant picker (Fase 10): searchable checklist with "Pilih Semua" /
 * "Bersihkan" shortcuts. Inactive santri are still listed (badged) so
 * historical participants stay visible.
 */
export function PesertaPicker({
  allSantri,
  selected,
  onChange,
}: {
  allSantri: PickerSantri[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? allSantri.filter(
          (s) =>
            s.nama.toLowerCase().includes(q) ||
            (s.kelasNama ?? "").toLowerCase().includes(q),
        )
      : allSantri;
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [allSantri, query]);

  function toggle(id: string) {
    if (selectedSet.has(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }

  // "Pilih Semua" applies to the currently filtered list so the admin can
  // scope by search first (e.g. one kelas) — empty search means everyone.
  function selectAll() {
    const next = new Set(selected);
    for (const s of filtered) next.add(s.id);
    onChange([...next]);
  }

  function clear() {
    const filteredIds = new Set(filtered.map((s) => s.id));
    onChange(selected.filter((id) => !filteredIds.has(id)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-secondary"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari santri atau kelas..."
            aria-label="Cari santri"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={selectAll} className="flex-1 sm:flex-none">
            Pilih Semua
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="flex-1 sm:flex-none">
            Bersihkan
          </Button>
        </div>
      </div>

      <p className="text-xs text-ink-secondary" aria-live="polite">
        {selected.length} dari {allSantri.length} santri dipilih
        {query.trim() ? ` (menampilkan ${filtered.length})` : ""}.
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-ink-secondary">
          Tidak ada santri yang cocok.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-background">
                <input
                  type="checkbox"
                  checked={selectedSet.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 shrink-0 accent-(--color-primary)"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{s.nama}</span>
                  <span className="block text-xs text-ink-secondary">
                    {s.kelasNama ?? "Tanpa kelas"}
                    {!s.statusAktif ? " • Nonaktif" : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
