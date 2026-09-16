"use client";

import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  NONE_VALUE,
  type SantriFilters,
  type SantriListState,
  type SantriSortKey,
} from "@/lib/santri-filter";

const SORT_LABEL: Record<SantriSortKey, string> = {
  nama: "Nama",
  kelas: "Kelas",
  usia: "Kategori usia",
  progress: "Progress",
};

const EMPTY_FILTERS: SantriFilters = {
  query: "",
  kelas: "",
  status: "",
  usia: "",
  gender: "",
};

/**
 * Search + filter + sort toolbar shared by the admin santri list and the
 * ustadz/wali progress list. Controlled: the parent owns `state` so it can
 * reuse the same values for `filterAndSortSantri`.
 */
export function SantriListControls({
  state,
  onChange,
  kelasOptions,
  sortOptions,
  showUsia = false,
  showGender = false,
}: {
  state: SantriListState;
  onChange: (state: SantriListState) => void;
  /** Distinct kelas names available for the filter select. */
  kelasOptions: string[];
  /** Sort keys to expose; e.g. the progress list omits "usia". */
  sortOptions: SantriSortKey[];
  showUsia?: boolean;
  showGender?: boolean;
}) {
  const { filters, sortKey, sortDir } = state;

  const filterActive = Object.entries(filters).some(([, value]) => value !== "");

  function setFilters(patch: Partial<SantriFilters>) {
    onChange({ ...state, filters: { ...filters, ...patch } });
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-secondary"
            aria-hidden
          />
          <Input
            value={filters.query ?? ""}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder="Cari nama atau kelas..."
            aria-label="Cari santri"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-48">
          <div className="flex-1">
            <Select
              value={sortKey}
              onChange={(e) =>
                onChange({ ...state, sortKey: e.target.value as SantriSortKey })
              }
              aria-label="Urutkan berdasarkan"
            >
              {sortOptions.map((key) => (
                <option key={key} value={key}>
                  Urut: {SORT_LABEL[key]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => onChange({ ...state, sortDir: sortDir === "asc" ? "desc" : "asc" })}
            aria-label={sortDir === "asc" ? "Urutan menaik" : "Urutan menurun"}
            title={sortDir === "asc" ? "Menaik (A-Z)" : "Menurun (Z-A)"}
            className="shrink-0 px-3"
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowDown className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          value={filters.kelas ?? ""}
          onChange={(e) => setFilters({ kelas: e.target.value })}
          aria-label="Filter kelas"
        >
          <option value="">Semua kelas</option>
          {kelasOptions.map((nama) => (
            <option key={nama} value={nama}>
              {nama}
            </option>
          ))}
          <option value={NONE_VALUE}>Tanpa kelas</option>
        </Select>

        <Select
          value={filters.status ?? ""}
          onChange={(e) => setFilters({ status: e.target.value as SantriFilters["status"] })}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </Select>

        {showUsia && (
          <Select
            value={filters.usia ?? ""}
            onChange={(e) => setFilters({ usia: e.target.value })}
            aria-label="Filter kategori usia"
          >
            <option value="">Semua usia</option>
            <option value="pra_remaja">Pra-remaja</option>
            <option value="remaja">Remaja</option>
            <option value="pra_nikah">Pra-nikah</option>
            <option value={NONE_VALUE}>Usia belum diisi</option>
          </Select>
        )}

        {showGender && (
          <Select
            value={filters.gender ?? ""}
            onChange={(e) => setFilters({ gender: e.target.value })}
            aria-label="Filter jenis kelamin"
          >
            <option value="">Semua gender</option>
            <option value="laki_laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
            <option value={NONE_VALUE}>Belum diisi</option>
          </Select>
        )}
      </div>

      {filterActive && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...state, filters: EMPTY_FILTERS })}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset filter
          </Button>
        </div>
      )}
    </Card>
  );
}
