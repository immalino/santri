/**
 * Kenaikan helpers: which kitab/halaman a santri still owes before moving
 * up, and which pages are emptiest per curriculum kelas. Aggregates are
 * computed server-side on each page load (same pattern as santri-progress
 * and admin-stats). Khatam is strict: a page counts only at persentase 100.
 */
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { pencapaian } from "@/db/schema";
import { getSantriProgressData } from "./santri-progress";

export interface KenaikanHalamanBelum {
  nomorHalaman: number;
  /** null = not yet graded. */
  persentase: number | null;
}

export interface KenaikanKitabKurang {
  kitabId: string;
  /** null = kitab tanpa bagian (fallback virtual full). */
  bagianId: string | null;
  namaKitab: string;
  /** "hal 1-300" atau null bila full kitab. */
  labelRentang: string | null;
  kelasNama: string;
  kurangHalaman: number;
  totalHalaman: number;
  halamanBelum: KenaikanHalamanBelum[];
}

export type KenaikanState = "siap" | "kurang" | "lulus" | "bebas" | "tanpa-kelas";

export interface KenaikanStatus {
  santriId: string;
  kelasNama: string | null;
  status: KenaikanState;
  /** Next kelas by urutan, null when terminal / exempt / classless. */
  kelasBerikutNama: string | null;
  kurangKitab: number;
  kurangHalaman: number;
  /** Only uncompleted kitab in cumulative scope, ordered by kelas urutan then name. */
  kitabBelum: KenaikanKitabKurang[];
}

export async function getKenaikanStatus(santriId: string): Promise<KenaikanStatus | null> {
  const data = await getSantriProgressData(santriId);
  if (!data) return null;

  const kelasRows = await db.query.kelas.findMany({
    columns: { id: true, namaKelas: true, urutan: true, bebasSyarat: true },
    orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
  });
  const kitabRows = await db.query.kitab.findMany({
    columns: { id: true, namaKitab: true, status: true, kelasId: true },
  });

  const santriKelas = kelasRows.find((k) => k.namaKelas === data.kelasNama) ?? null;
  const kosong: KenaikanStatus = {
    santriId,
    kelasNama: data.kelasNama,
    status: "tanpa-kelas",
    kelasBerikutNama: null,
    kurangKitab: 0,
    kurangHalaman: 0,
    kitabBelum: [],
  };
  if (!santriKelas) return kosong;
  if (santriKelas.bebasSyarat) return { ...kosong, kelasNama: santriKelas.namaKelas, status: "bebas" };

  const berikut = kelasRows.find((k) => k.urutan > santriKelas.urutan) ?? null;
  const kelasBerikutNama = berikut ? berikut.namaKelas : null;

  // Cumulative scope: active kitab whose kelas.urutan <= U, excluding kitab
  // owned by exempt (bebas) kelas and unmapped kitab.
  const urutanByKelas = new Map(kelasRows.map((k) => [k.id, k]));
  const bagianRows = await db.query.kitabBagian.findMany({
    columns: { id: true, kitabId: true, kelasId: true, halamanDari: true, halamanSampai: true },
  });
  const bagianByKitab = new Map<string, typeof bagianRows>();
  for (const b of bagianRows) {
    const list = bagianByKitab.get(b.kitabId) ?? [];
    list.push(b);
    bagianByKitab.set(b.kitabId, list);
  }
  interface ScopeBagian { kitabId: string; bagianId: string | null; dari: number; sampai: number; kelasNama: string; urutan: number }
  const scope: ScopeBagian[] = [];
  for (const kb of kitabRows) {
    if (kb.status !== "aktif") continue;
    const daftar = bagianByKitab.get(kb.id) ?? [];
    if (daftar.length === 0) {
      if (!kb.kelasId) continue;
      const pemilik = urutanByKelas.get(kb.kelasId);
      if (!pemilik || pemilik.bebasSyarat || pemilik.urutan > santriKelas.urutan) continue;
      const jumlah = data.kitab.find((k) => k.kitabId === kb.id)?.jumlahHalaman ?? 0;
      scope.push({ kitabId: kb.id, bagianId: null, dari: 1, sampai: jumlah, kelasNama: pemilik.namaKelas, urutan: pemilik.urutan });
    } else {
      for (const b of daftar) {
        const pemilik = urutanByKelas.get(b.kelasId);
        if (!pemilik || pemilik.bebasSyarat || pemilik.urutan > santriKelas.urutan) continue;
        scope.push({ kitabId: kb.id, bagianId: b.id, dari: b.halamanDari, sampai: b.halamanSampai, kelasNama: pemilik.namaKelas, urutan: pemilik.urutan });
      }
    }
  }

  const kitabBelum: KenaikanKitabKurang[] = [];
  const urutanByKey = new Map<string, number>();
  const dariByKey = new Map<string, number>();
  for (const s of scope) {
    const prog = data.kitab.find((k) => k.kitabId === s.kitabId);
    if (!prog) continue;
    const halamanBelum = prog.halaman
      .filter((h) => h.persentase !== 100 && h.nomorHalaman >= s.dari && h.nomorHalaman <= s.sampai)
      .map((h) => ({ nomorHalaman: h.nomorHalaman, persentase: h.persentase }))
      .sort((a, b) => a.nomorHalaman - b.nomorHalaman);
    if (halamanBelum.length === 0) continue;
    const key = s.bagianId ?? s.kitabId;
    urutanByKey.set(key, s.urutan);
    dariByKey.set(key, s.dari);
    kitabBelum.push({
      kitabId: s.kitabId,
      bagianId: s.bagianId,
      namaKitab: prog.namaKitab,
      labelRentang: s.bagianId ? `hal ${s.dari}-${s.sampai}` : null,
      kelasNama: s.kelasNama,
      kurangHalaman: halamanBelum.length,
      totalHalaman: s.sampai - s.dari + 1,
      halamanBelum,
    });
  }
  kitabBelum.sort((a, b) => {
    const ua = urutanByKey.get(a.bagianId ?? a.kitabId)!;
    const ub = urutanByKey.get(b.bagianId ?? b.kitabId)!;
    if (ua !== ub) return ua - ub;
    const nama = a.namaKitab.localeCompare(b.namaKitab, "id");
    if (nama !== 0) return nama;
    return dariByKey.get(a.bagianId ?? a.kitabId)! - dariByKey.get(b.bagianId ?? b.kitabId)!;
  });

  const kurangHalaman = kitabBelum.reduce((s, k) => s + k.kurangHalaman, 0);
  if (kitabBelum.length === 0) {
    return {
      santriId,
      kelasNama: santriKelas.namaKelas,
      status: berikut ? "siap" : "lulus",
      kelasBerikutNama,
      kurangKitab: 0,
      kurangHalaman: 0,
      kitabBelum: [],
    };
  }
  return {
    santriId,
    kelasNama: santriKelas.namaKelas,
    status: "kurang",
    kelasBerikutNama,
    kurangKitab: kitabBelum.length,
    kurangHalaman,
    kitabBelum,
  };
}

export interface LubangHalaman {
  nomorHalaman: number;
  /** Mean persentase across denominator santri (ungraded counts as 0), rounded. */
  rataRata: number;
  /** Denominator santri with any score on this page. */
  dinilaiCount: number;
  totalSantri: number;
}

export interface LubangKitab {
  kitabId: string;
  bagianId: string | null;
  namaKitab: string;
  labelRentang: string | null;
  kelasNama: string;
  /** Mean of page averages, rounded. */
  rataRata: number;
  /** All pages in natural order; the client toggle sorts them. */
  halaman: LubangHalaman[];
}

export async function getLubangReport(): Promise<LubangKitab[]> {
  const kelasRows = await db.query.kelas.findMany({
    columns: { id: true, namaKelas: true, urutan: true, bebasSyarat: true },
    orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
  });
  const bebasIds = new Set(kelasRows.filter((k) => k.bebasSyarat).map((k) => k.id));
  const santriRows = await db.query.santri.findMany({
    where: (s, { eq }) => eq(s.statusAktif, true),
    columns: { id: true, kelasId: true },
  });
  const denomIds = new Set(
    santriRows.filter((s) => !s.kelasId || !bebasIds.has(s.kelasId)).map((s) => s.id),
  );

  const kitabRows = await db.query.kitab.findMany({
    columns: { id: true, namaKitab: true, status: true, kelasId: true, jumlahHalaman: true },
  });
  const urutanByKelas = new Map(kelasRows.map((k) => [k.id, k]));
  const bagianRows = await db.query.kitabBagian.findMany({
    columns: { id: true, kitabId: true, kelasId: true, halamanDari: true, halamanSampai: true },
  });
  const bagianByKitab = new Map<string, typeof bagianRows>();
  for (const b of bagianRows) {
    const list = bagianByKitab.get(b.kitabId) ?? [];
    list.push(b);
    bagianByKitab.set(b.kitabId, list);
  }
  interface BlokDef {
    kitabId: string;
    bagianId: string | null;
    dari: number;
    sampai: number;
    pemilik: (typeof kelasRows)[number];
    namaKitab: string;
  }
  const blokDef: BlokDef[] = [];
  for (const kb of kitabRows) {
    if (kb.status !== "aktif") continue;
    const daftar = bagianByKitab.get(kb.id) ?? [];
    if (daftar.length === 0) {
      if (!kb.kelasId) continue;
      const pemilik = urutanByKelas.get(kb.kelasId);
      if (!pemilik || pemilik.bebasSyarat) continue;
      blokDef.push({
        kitabId: kb.id,
        bagianId: null,
        dari: 1,
        sampai: kb.jumlahHalaman,
        pemilik,
        namaKitab: kb.namaKitab,
      });
    } else {
      for (const b of daftar) {
        const pemilik = urutanByKelas.get(b.kelasId);
        if (!pemilik || pemilik.bebasSyarat) continue;
        blokDef.push({
          kitabId: kb.id,
          bagianId: b.id,
          dari: b.halamanDari,
          sampai: b.halamanSampai,
          pemilik,
          namaKitab: kb.namaKitab,
        });
      }
    }
  }

  const kitabIds = [...new Set(blokDef.map((b) => b.kitabId))];
  const halamanRows =
    kitabIds.length > 0
      ? await db.query.halaman.findMany({
          where: (h, { inArray }) => inArray(h.kitabId, kitabIds),
          columns: { id: true, kitabId: true, nomorHalaman: true },
        })
      : [];

  // Sum + graded-count per halaman within the denominator (ungraded = 0).
  const sumByHalaman = new Map<string, number>();
  const dinilaiByHalaman = new Map<string, number>();
  if (halamanRows.length > 0 && denomIds.size > 0) {
    const nilai = await db
      .select({
        halamanId: pencapaian.halamanId,
        santriId: pencapaian.santriId,
        persentase: pencapaian.persentase,
      })
      .from(pencapaian)
      .where(
        inArray(
          pencapaian.halamanId,
          halamanRows.map((h) => h.id),
        ),
      );
    for (const n of nilai) {
      if (!denomIds.has(n.santriId)) continue;
      sumByHalaman.set(n.halamanId, (sumByHalaman.get(n.halamanId) ?? 0) + n.persentase);
      dinilaiByHalaman.set(n.halamanId, (dinilaiByHalaman.get(n.halamanId) ?? 0) + 1);
    }
  }

  const totalSantri = denomIds.size;
  const statByHalamanId = new Map<string, LubangHalaman>();
  for (const h of halamanRows) {
    const sum = sumByHalaman.get(h.id) ?? 0;
    statByHalamanId.set(h.id, {
      nomorHalaman: h.nomorHalaman,
      rataRata: totalSantri > 0 ? Math.round(sum / totalSantri) : 0,
      dinilaiCount: dinilaiByHalaman.get(h.id) ?? 0,
      totalSantri,
    });
  }

  // Blok ordered by owner urutan then kitab name then dari (stable base order).
  const scoped = [...blokDef].sort((a, b) => {
    if (a.pemilik.urutan !== b.pemilik.urutan) return a.pemilik.urutan - b.pemilik.urutan;
    const nama = a.namaKitab.localeCompare(b.namaKitab, "id");
    if (nama !== 0) return nama;
    return a.dari - b.dari;
  });

  return scoped.map((blok) => {
    const halaman = halamanRows
      .filter((h) => h.kitabId === blok.kitabId && h.nomorHalaman >= blok.dari && h.nomorHalaman <= blok.sampai)
      .map((h) => statByHalamanId.get(h.id)!)
      .sort((a, b) => a.nomorHalaman - b.nomorHalaman);
    const rataRata =
      halaman.length > 0
        ? Math.round(halaman.reduce((s, h) => s + h.rataRata, 0) / halaman.length)
        : 0;
    return {
      kitabId: blok.kitabId,
      bagianId: blok.bagianId,
      namaKitab: blok.namaKitab,
      labelRentang: blok.bagianId ? `hal ${blok.dari}-${blok.sampai}` : null,
      kelasNama: blok.pemilik.namaKelas,
      rataRata,
      halaman,
    };
  });
}
