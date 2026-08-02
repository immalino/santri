/**
 * Admin dashboard aggregates (task 4.14). Shared by the dashboard API route
 * and the server component page so numbers always match.
 *
 * Progress semantics (PRD §6 Umum): progress per santri per kitab = average
 * across ALL pages of that kitab, where ungraded pages count as 0. Overall
 * progress per santri = average across all pages of all kitab.
 */
import { db } from "@/db";

export interface SantriProgress {
  santriId: string;
  nama: string;
  kelasNama: string | null;
  /** 0-100 overall across all kitab. */
  progress: number;
}

export interface KitabProgress {
  kitabId: string;
  namaKitab: string;
  jumlahHalaman: number;
  /** Average across active santri (0-100). */
  rataRata: number;
}

export interface AdminRecap {
  totalSantriAktif: number;
  totalKitab: number;
  /** Mean of per-santri overall progress (0-100). */
  rataRataProgress: number;
  santriProgress: SantriProgress[];
  perKitab: KitabProgress[];
}

export async function getAdminRecap(): Promise<AdminRecap> {
  const kitabs = await db.query.kitab.findMany({
    columns: { id: true, namaKitab: true, jumlahHalaman: true },
  });
  const santris = await db.query.santri.findMany({
    where: (s, { eq }) => eq(s.statusAktif, true),
    columns: { id: true, nama: true },
    with: { kelas: { columns: { namaKelas: true } } },
  });
  const halamans = await db.query.halaman.findMany({
    columns: { id: true, kitabId: true },
  });
  const pencapaian = await db.query.pencapaian.findMany({
    columns: { santriId: true, halamanId: true, persentase: true },
  });

  const totalHalaman = kitabs.reduce((sum, k) => sum + k.jumlahHalaman, 0);
  const santriIds = new Set(santris.map((s) => s.id));

  // Sum of persentase per santri across every page of every kitab.
  const santriScore = new Map<string, number>();
  for (const p of pencapaian) {
    if (!santriIds.has(p.santriId)) continue;
    santriScore.set(p.santriId, (santriScore.get(p.santriId) ?? 0) + p.persentase);
  }

  // persentase is on a 0-100 scale, so the mean is 0-100 directly (no *100).
  const santriProgress: SantriProgress[] = santris.map((s) => ({
    santriId: s.id,
    nama: s.nama,
    kelasNama: s.kelas?.namaKelas ?? null,
    progress: totalHalaman > 0 ? Math.round((santriScore.get(s.id) ?? 0) / totalHalaman) : 0,
  }));

  const totalSantriAktif = santris.length;
  const rataRataProgress =
    totalSantriAktif > 0
      ? Math.round(santriProgress.reduce((sum, s) => sum + s.progress, 0) / totalSantriAktif)
      : 0;

  // Per kitab: for each kitab, mean over active santri of their kitab score.
  const perKitab: KitabProgress[] = kitabs.map((k) => {
    const kitabPages = halamans.filter((h) => h.kitabId === k.id).map((h) => h.id);
    const kitabPageSet = new Set(kitabPages);
    let total = 0;
    for (const p of pencapaian) {
      if (santriIds.has(p.santriId) && kitabPageSet.has(p.halamanId)) total += p.persentase;
    }
    const denom = k.jumlahHalaman * totalSantriAktif;
    return {
      kitabId: k.id,
      namaKitab: k.namaKitab,
      jumlahHalaman: k.jumlahHalaman,
      // Mean of 0-100 persentase over (pages × active santri) — no *100.
      rataRata: denom > 0 ? Math.round(total / denom) : 0,
    };
  });

  return { totalSantriAktif, totalKitab: kitabs.length, rataRataProgress, santriProgress, perKitab };
}
