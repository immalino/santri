/**
 * Pure client-side filter/sort helpers for the santri lists.
 *
 * Framework-free so the admin manager and the ustadz/wali progress list share
 * one implementation. `kategoriUsia`/`jenisKelamin`/`progress` are optional
 * because the progress list does not carry all of the admin fields.
 */

export type KategoriUsia = "pra_remaja" | "remaja" | "pra_nikah";
export type JenisKelamin = "laki_laki" | "perempuan";

/** Sentinel value for "tanpa kelas" / "belum diisi" select options. */
export const NONE_VALUE = "__none__";

export interface SantriFilterable {
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  kategoriUsia?: KategoriUsia | null;
  jenisKelamin?: JenisKelamin | null;
  progress?: number;
}

export interface SantriFilters {
  query?: string;
  /** Kelas name, `NONE_VALUE` for tanpa kelas, or "" for all. */
  kelas?: string;
  status?: "aktif" | "nonaktif" | "";
  /** Kategori usia, `NONE_VALUE` for belum diisi, or "" for all. */
  usia?: string;
  /** Jenis kelamin, `NONE_VALUE` for belum diisi, or "" for all. */
  gender?: string;
}

export type SantriSortKey = "nama" | "kelas" | "usia" | "progress";
export type SortDir = "asc" | "desc";

export interface SantriListState {
  filters: SantriFilters;
  sortKey: SantriSortKey;
  sortDir: SortDir;
}

export const DEFAULT_SANTRI_LIST_STATE: SantriListState = {
  filters: { query: "", kelas: "", status: "", usia: "", gender: "" },
  sortKey: "nama",
  sortDir: "asc",
};

export function filterSantri<T extends SantriFilterable>(
  items: T[],
  filters: SantriFilters,
): T[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  return items.filter((item) => {
    if (query) {
      const hit =
        item.nama.toLowerCase().includes(query) ||
        (item.kelasNama ?? "").toLowerCase().includes(query);
      if (!hit) return false;
    }

    if (filters.kelas) {
      if (filters.kelas === NONE_VALUE) {
        if (item.kelasNama !== null) return false;
      } else if (item.kelasNama !== filters.kelas) {
        return false;
      }
    }

    if (filters.status === "aktif" && !item.statusAktif) return false;
    if (filters.status === "nonaktif" && item.statusAktif) return false;

    if (filters.usia) {
      const usia = item.kategoriUsia ?? null;
      if (filters.usia === NONE_VALUE) {
        if (usia !== null) return false;
      } else if (usia !== filters.usia) {
        return false;
      }
    }

    if (filters.gender) {
      const gender = item.jenisKelamin ?? null;
      if (filters.gender === NONE_VALUE) {
        if (gender !== null) return false;
      } else if (gender !== filters.gender) {
        return false;
      }
    }

    return true;
  });
}

const USIA_ORDER: Record<KategoriUsia, number> = {
  pra_remaja: 0,
  remaja: 1,
  pra_nikah: 2,
};

function usiaRank(value: KategoriUsia | null | undefined): number {
  return value ? USIA_ORDER[value] : 3;
}

export function sortSantri<T extends SantriFilterable>(
  items: T[],
  key: SantriSortKey,
  dir: SortDir,
): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "nama":
        cmp = a.nama.localeCompare(b.nama, "id");
        break;
      case "kelas":
        cmp = (a.kelasNama ?? "").localeCompare(b.kelasNama ?? "", "id");
        break;
      case "usia":
        cmp = usiaRank(a.kategoriUsia) - usiaRank(b.kategoriUsia);
        break;
      case "progress":
        cmp = (a.progress ?? 0) - (b.progress ?? 0);
        break;
    }
    // Stable tie-break by name, always ascending.
    if (cmp === 0) return a.nama.localeCompare(b.nama, "id");
    return cmp * factor;
  });
}

export function filterAndSortSantri<T extends SantriFilterable>(
  items: T[],
  state: SantriListState,
): T[] {
  return sortSantri(filterSantri(items, state.filters), state.sortKey, state.sortDir);
}

/** Distinct, alphabetically sorted kelas names for the filter select. */
export function uniqueKelasNames(items: SantriFilterable[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (item.kelasNama) names.add(item.kelasNama);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "id"));
}
