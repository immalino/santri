/**
 * Wali progress aggregates (task 6.1). Shared by the santri progress API route
 * and the wali page so the per-kitab numbers always match.
 *
 * Progress semantics (PRD §6 Umum — same as admin-stats): per-kitab average =
 * average across ALL pages of that kitab, where ungraded pages count as 0.
 * Every kitab is listed (including nonaktif, PRD #9); per-page breakdown shows
 * each page's value or null when not yet graded.
 */
import { eq } from "drizzle-orm";
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
  kitab: WaliKitabProgress[];
  /** True when at least one page across any kitab has been graded. */
  hasPenilaian: boolean;
}

export async function getSantriProgressData(santriId: string): Promise<SantriProgressData | null> {
  const [santriRow] = await db.query.santri.findMany({
    where: (s, { eq }) => eq(s.id, santriId),
    columns: { id: true, nama: true },
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

  return { santriId, nama: santriRow.nama, kitab: kitabRows, hasPenilaian };
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