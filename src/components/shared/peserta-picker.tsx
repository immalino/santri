"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface PickerSantri {
  id: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  kategoriUsia: "pra_remaja" | "remaja" | "pra_nikah" | null;
  jenisKelamin: "laki_laki" | "perempuan" | null;
}

const KATEGORI_USIA_LABEL: Record<string, string> = {
  pra_remaja: "Pra-remaja",
  remaja: "Remaja",
  pra_nikah: "Pra-nikah",
};

const JENIS_KELAMIN_LABEL: Record<string, string> = {
  laki_laki: "Laki-laki",
  perempuan: "Perempuan",
};

function santriMeta(s: PickerSantri): string {
  const parts = [
    s.kelasNama ?? "Tanpa kelas",
    s.kategoriUsia ? KATEGORI_USIA_LABEL[s.kategoriUsia] : "Usia belum diisi",
    s.jenisKelamin ? JENIS_KELAMIN_LABEL[s.jenisKelamin] : "Belum diisi",
  ];
  if (!s.statusAktif) parts.push("Nonaktif");
  return parts.join(" • ");
}

/**
 * Participant picker (Fase 10, extended Fase 11): searchable checklist with
 * "Pilih Semua" / "Bersihkan" shortcuts plus kategori-usia & jenis-kelamin
 * filters with a "Pilih hasil filter" shortcut — e.g. select all
 * pra-nikah perempuan santri for one pengajian without tapping one by one.
 * Inactive santri are still listed (badged) so historical participants stay
 * visible.
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
  const [usiaFilter, setUsiaFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filterActive = usiaFilter !== "" || genderFilter !== "" || query.trim() !== "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allSantri.filter((s) => {
      if (q) {
        const hit =
          s.nama.toLowerCase().includes(q) ||
          (s.kelasNama ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (usiaFilter === "null" ? s.kategoriUsia !== null : usiaFilter && s.kategoriUsia !== usiaFilter)
        return false;
      if (genderFilter === "null" ? s.jenisKelamin !== null : genderFilter && s.jenisKelamin !== genderFilter)
        return false;
      return true;
    });
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [allSantri, query, usiaFilter, genderFilter]);

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

  /** Add only the santri matching the current usia/gender/search filter. */
  function selectFiltered() {
    selectAll();
  }

  function clearFilter() {
    setQuery("");
    setUsiaFilter("");
    setGenderFilter("");
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="sm:flex-1">
            <Select
              value={usiaFilter}
              onChange={(e) => setUsiaFilter(e.target.value)}
              aria-label="Filter kategori usia"
            >
              <option value="">Semua usia</option>
              <option value="pra_remaja">Pra-remaja</option>
              <option value="remaja">Remaja</option>
              <option value="pra_nikah">Pra-nikah</option>
              <option value="null">Usia belum diisi</option>
            </Select>
          </div>
          <div className="sm:flex-1">
            <Select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              aria-label="Filter jenis kelamin"
            >
              <option value="">Semua gender</option>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
              <option value="null">Belum diisi</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          {filterActive ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={selectFiltered}
              className="flex-1 sm:flex-none"
            >
              Pilih hasil filter ({filtered.length})
            </Button>
          ) : null}
          {filterActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              className="flex-1 sm:flex-none"
            >
              Reset filter
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-ink-secondary" aria-live="polite">
        {selected.length} dari {allSantri.length} santri dipilih
        {filterActive ? ` (menampilkan ${filtered.length})` : ""}.
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
                  <span className="block text-xs text-ink-secondary">{santriMeta(s)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
