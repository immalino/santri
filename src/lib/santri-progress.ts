/**
 * Wali progress aggregates (task 6.1). Shared by the santri progress API route
 * and the wali page so the per-kitab numbers always match.
 *
 * Progress semantics (PRD §6 Umum — same as admin-stats): per-kitab average =
 * average across ALL pages of that kitab, where ungraded pages count as 0.
 * Every kitab is listed (including nonaktif, PRD #9); per-page breakdown shows
 * each page's value or null when not yet graded.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  halaman as halamanTable,
  kitab,
  pencapaian,
  santri,
  waliSantri,
} from "@/db/schema";

export interface HalamanScore {
  halamanId: string;
  nomorHalaman: number;
  /** null = not yet graded. */
  persentase: number | null;
}

export interface WaliKitabProgress {
  kitabId: string;
  namaKitab: string;
  jumlahHalaman: number;
  status: "aktif" | "nonaktif";
  /** 0-100 average across all pages (ungraded count as 0). */
  rataRata: number;
  halaman: HalamanScore[];
}

export interface SantriProgressData {
  santriId: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  /** 0-100 overall across ALL pages of ALL kitab (ungraded count as 0). */
  rataRataKeseluruhan: number;
  kitab: WaliKitabProgress[];
  /** True when at least one page across any kitab has been graded. */
  hasPenilaian: boolean;
}

export async function getSantriProgressData(santriId: string): Promise<SantriProgressData | null> {
  const [santriRow] = await db.query.santri.findMany({
    where: (s, { eq }) => eq(s.id, santriId),
    columns: { id: true, nama: true, statusAktif: true },
    with: { kelas: { columns: { namaKelas: true } } },
    limit: 1,
  });
  if (!santriRow) return null;

  // Every page of every kitab, joined to its kitab and ordered so per-kitab
  // grouping below stays stable. All kitab included, regardless of status.
  const pages = await db
    .select({
      halamanId: halamanTable.id,
      nomorHalaman: halamanTable.nomorHalaman,
      kitabId: halamanTable.kitabId,
      namaKitab: kitab.namaKitab,
      jumlahHalaman: kitab.jumlahHalaman,
      status: kitab.status,
    })
    .from(halamanTable)
    .innerJoin(kitab, eq(halamanTable.kitabId, kitab.id))
    .orderBy(kitab.namaKitab, halamanTable.nomorHalaman);

  const scores =
    pages.length > 0
      ? await db
          .select({
            halamanId: pencapaian.halamanId,
            persentase: pencapaian.persentase,
          })
          .from(pencapaian)
          .where(eq(pencapaian.santriId, santriId))
      : [];

  const scoreByHalaman = new Map<string, number>();
  for (const s of scores) scoreByHalaman.set(s.halamanId, s.persentase);

  // Group pages per kitab, preserving the first-encountered kitab order.
  const kitabOrder: string[] = [];
  const grouped = new Map<string, WaliKitabProgress>();
  for (const p of pages) {
    let entry = grouped.get(p.kitabId);
    if (!entry) {
      entry = {
        kitabId: p.kitabId,
        namaKitab: p.namaKitab,
        jumlahHalaman: p.jumlahHalaman,
        status: p.status,
        rataRata: 0,
        halaman: [],
      };
      grouped.set(p.kitabId, entry);
      kitabOrder.push(p.kitabId);
    }
    entry.halaman.push({
      halamanId: p.halamanId,
      nomorHalaman: p.nomorHalaman,
      persentase: scoreByHalaman.get(p.halamanId) ?? null,
    });
  }

  let hasPenilaian = false;
  const kitabRows: WaliKitabProgress[] = kitabOrder.map((id) => {
    const entry = grouped.get(id)!;
    // Round AFTER summing the real (non-null) scores.
    const graded = entry.halaman.filter((h) => h.persentase !== null);
    if (graded.length > 0) hasPenilaian = true;
    const total = graded.reduce((sum, h) => sum + (h.persentase ?? 0), 0);
    // persentase is already on a 0-100 scale, so the mean is 0-100 directly.
    return {
      ...entry,
      rataRata: entry.jumlahHalaman > 0 ? Math.round(total / entry.jumlahHalaman) : 0,
    };
  });

  // Overall progress = mean of every page of every kitab (ungraded = 0),
  // matching the admin-stats semantics. persentase is already 0-100.
  const totalHalaman = kitabRows.reduce((sum, k) => sum + k.jumlahHalaman, 0);
  const skorTotal = scores.reduce((sum, sc) => sum + sc.persentase, 0);
  const rataRataKeseluruhan = totalHalaman > 0 ? Math.round(skorTotal / totalHalaman) : 0;

  return {
    santriId,
    nama: santriRow.nama,
    kelasNama: santriRow.kelas?.namaKelas ?? null,
    statusAktif: santriRow.statusAktif,
    rataRataKeseluruhan,
    kitab: kitabRows,
    hasPenilaian,
  };
}

/**
 * List of santri with their overall progress (0-100 across all kitab), used by
 * the ustadz/wali daftar pages. Reuses the admin-stats aggregation semantics:
 * ungraded pages count as 0, and every kitab counts (incl. nonaktif).
 *
 * When `santriIds` is provided (wali), only those santri are returned; an empty
 * array short-circuits to [] because an empty `inArray` is invalid SQL.
 */
export interface SantriListProgress {
  id: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  progress: number;
}

export async function getSantriProgressList(opts?: {
  santriIds?: string[];
}): Promise<SantriListProgress[]> {
  const santriIds = opts?.santriIds;
  if (santriIds && santriIds.length === 0) return [];

  const santris = await db.query.santri.findMany({
    where: santriIds ? inArray(santri.id, santriIds) : undefined,
    columns: { id: true, nama: true, statusAktif: true },
    with: { kelas: { columns: { namaKelas: true } } },
    orderBy: (s, { asc }) => [asc(s.nama)],
  });
  if (santris.length === 0) return [];

  const kitabs = await db.query.kitab.findMany({
    columns: { id: true, jumlahHalaman: true },
  });
  const totalHalaman = kitabs.reduce((sum, k) => sum + k.jumlahHalaman, 0);

  const scores = await db
    .select({ santriId: pencapaian.santriId, persentase: pencapaian.persentase })
    .from(pencapaian)
    .where(santriIds ? inArray(pencapaian.santriId, santriIds) : undefined);

  const scoreBySantri = new Map<string, number>();
  for (const s of scores) {
    scoreBySantri.set(s.santriId, (scoreBySantri.get(s.santriId) ?? 0) + s.persentase);
  }

  return santris.map((s) => ({
    id: s.id,
    nama: s.nama,
    kelasNama: s.kelas?.namaKelas ?? null,
    statusAktif: s.statusAktif,
    progress: totalHalaman > 0 ? Math.round((scoreBySantri.get(s.id) ?? 0) / totalHalaman) : 0,
  }));
}

/**
 * The santri ids+names linked to one wali, ordered by name. Used by the wali
 * progress page to build the child switch and by the API route for ownership.
 */
export async function getWaliSantris(waliId: string) {
  return db
    .select({
      id: santri.id,
      nama: santri.nama,
    })
    .from(waliSantri)
    .innerJoin(santri, eq(waliSantri.santriId, santri.id))
    .where(eq(waliSantri.waliId, waliId))
    .orderBy(santri.nama);
}