/**
 * Attendance aggregates (Fase 10). Shared by the kegiatan API routes and the
 * server component pages so numbers always match.
 *
 * Semantics: a sesi that has no absensi row for a santri counts as
 * "belum diabsen" (not as any status). Removing a peserta never deletes
 * historical absensi rows — old sesi keep their records, new sesi simply
 * stop listing that santri.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  absensi,
  kegiatan,
  kegiatanPeserta,
  kegiatanSesi,
  santri,
} from "@/db/schema";

export type AbsensiStatus = "hadir" | "izin" | "tanpa_keterangan";

export type KategoriUsia = "pra_remaja" | "remaja" | "pra_nikah";
export type JenisKelamin = "laki_laki" | "perempuan";

export interface KegiatanListItem {
  id: string;
  namaKegiatan: string;
  deskripsi: string | null;
  status: "aktif" | "nonaktif";
  jumlahPeserta: number;
  jumlahSesi: number;
  /** ISO string of the latest sesi date, or null when no sesi exists. */
  tanggalTerakhir: string | null;
}

export async function getKegiatanList(opts?: {
  santriIds?: string[];
}): Promise<KegiatanListItem[]> {
  const allKegiatan = await db.query.kegiatan.findMany({
    orderBy: (k, { desc }) => [desc(k.createdAt)],
    columns: { id: true, namaKegiatan: true, deskripsi: true, status: true },
  });
  if (allKegiatan.length === 0) return [];

  const kegiatanIds = allKegiatan.map((k) => k.id);
  const [pesertaRows, sesiRows] = await Promise.all([
    db
      .select({ kegiatanId: kegiatanPeserta.kegiatanId, santriId: kegiatanPeserta.santriId })
      .from(kegiatanPeserta)
      .where(inArray(kegiatanPeserta.kegiatanId, kegiatanIds)),
    db
      .select({ kegiatanId: kegiatanSesi.kegiatanId, tanggal: kegiatanSesi.tanggal })
      .from(kegiatanSesi)
      .where(inArray(kegiatanSesi.kegiatanId, kegiatanIds)),
  ]);

  const pesertaByKegiatan = new Map<string, Set<string>>();
  for (const p of pesertaRows) {
    const set = pesertaByKegiatan.get(p.kegiatanId) ?? new Set<string>();
    set.add(p.santriId);
    pesertaByKegiatan.set(p.kegiatanId, set);
  }
  const sesiByKegiatan = new Map<string, Date[]>();
  for (const s of sesiRows) {
    const arr = sesiByKegiatan.get(s.kegiatanId) ?? [];
    arr.push(s.tanggal);
    sesiByKegiatan.set(s.kegiatanId, arr);
  }

  const filter =
    opts?.santriIds !== undefined ? new Set(opts.santriIds) : null;

  const items: KegiatanListItem[] = [];
  for (const k of allKegiatan) {
    const peserta = pesertaByKegiatan.get(k.id) ?? new Set<string>();
    if (filter && ![...peserta].some((id) => filter.has(id))) continue;
    const sesi = sesiByKegiatan.get(k.id) ?? [];
    const latest = sesi.length > 0 ? new Date(Math.max(...sesi.map((d) => d.getTime()))) : null;
    items.push({
      id: k.id,
      namaKegiatan: k.namaKegiatan,
      deskripsi: k.deskripsi,
      status: k.status,
      jumlahPeserta: peserta.size,
      jumlahSesi: sesi.length,
      tanggalTerakhir: latest ? latest.toISOString() : null,
    });
  }
  return items;
}

export interface KegiatanPesertaItem {
  santriId: string;
  nama: string;
  kelasNama: string | null;
  statusAktif: boolean;
  kategoriUsia: KategoriUsia | null;
  jenisKelamin: JenisKelamin | null;
}

export interface KegiatanSesiItem {
  id: string;
  tanggal: string;
  judul: string | null;
  catatan: string | null;
  jumlahDiabsen: number;
  jumlahHadir: number;
}

export interface KegiatanDetail {
  id: string;
  namaKegiatan: string;
  deskripsi: string | null;
  status: "aktif" | "nonaktif";
  peserta: KegiatanPesertaItem[];
  sesi: KegiatanSesiItem[];
}

export interface KegiatanTemplateItem {
  id: string;
  kegiatanId: string;
  nama: string;
  isi: string;
  /** ISO string. */
  updatedAt: string;
}

export async function getKegiatanTemplates(kegiatanId: string): Promise<KegiatanTemplateItem[]> {
  const rows = await db.query.kegiatanTemplate.findMany({
    where: (t, { eq }) => eq(t.kegiatanId, kegiatanId),
    columns: { id: true, kegiatanId: true, nama: true, isi: true, updatedAt: true },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

export async function getKegiatanDetail(kegiatanId: string): Promise<KegiatanDetail | null> {
  const [row] = await db
    .select({
      id: kegiatan.id,
      namaKegiatan: kegiatan.namaKegiatan,
      deskripsi: kegiatan.deskripsi,
      status: kegiatan.status,
    })
    .from(kegiatan)
    .where(eq(kegiatan.id, kegiatanId))
    .limit(1);
  if (!row) return null;

  const pesertaRows = await db
    .select({
      santriId: santri.id,
      nama: santri.nama,
      statusAktif: santri.statusAktif,
      kategoriUsia: santri.kategoriUsia,
      jenisKelamin: santri.jenisKelamin,
    })
    .from(kegiatanPeserta)
    .innerJoin(santri, eq(kegiatanPeserta.santriId, santri.id))
    .where(eq(kegiatanPeserta.kegiatanId, kegiatanId));

  // Resolve kelas names in one extra query (keeps the join simple).
  const santriIds = pesertaRows.map((p) => p.santriId);
  const kelasBySantri = new Map<string, string | null>();
  if (santriIds.length > 0) {
    const withKelas = await db.query.santri.findMany({
      where: (s, { inArray }) => inArray(s.id, santriIds),
      columns: { id: true },
      with: { kelas: { columns: { namaKelas: true } } },
    });
    for (const s of withKelas) kelasBySantri.set(s.id, s.kelas?.namaKelas ?? null);
  }
  const peserta: KegiatanPesertaItem[] = pesertaRows
    .map((p) => ({
      santriId: p.santriId,
      nama: p.nama,
      kelasNama: kelasBySantri.get(p.santriId) ?? null,
      statusAktif: p.statusAktif,
      kategoriUsia: p.kategoriUsia,
      jenisKelamin: p.jenisKelamin,
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const sesiRows = await db.query.kegiatanSesi.findMany({
    where: (s, { eq }) => eq(s.kegiatanId, kegiatanId),
    columns: { id: true, tanggal: true, judul: true, catatan: true },
    orderBy: (s, { asc }) => [asc(s.tanggal)],
  });
  const sesiIds = sesiRows.map((s) => s.id);
  const absensiRows =
    sesiIds.length > 0
      ? await db
          .select({ sesiId: absensi.sesiId, status: absensi.status })
          .from(absensi)
          .where(inArray(absensi.sesiId, sesiIds))
      : [];
  const bySesi = new Map<string, { total: number; hadir: number }>();
  for (const a of absensiRows) {
    const cur = bySesi.get(a.sesiId) ?? { total: 0, hadir: 0 };
    cur.total += 1;
    if (a.status === "hadir") cur.hadir += 1;
    bySesi.set(a.sesiId, cur);
  }
  const sesi: KegiatanSesiItem[] = sesiRows.map((s) => ({
    id: s.id,
    tanggal: s.tanggal.toISOString(),
    judul: s.judul,
    catatan: s.catatan,
    jumlahDiabsen: bySesi.get(s.id)?.total ?? 0,
    jumlahHadir: bySesi.get(s.id)?.hadir ?? 0,
  }));

  return {
    id: row.id,
    namaKegiatan: row.namaKegiatan,
    deskripsi: row.deskripsi,
    status: row.status,
    peserta,
    sesi,
  };
}

export interface SesiPesertaAbsensi {
  santriId: string;
  nama: string;
  kelasNama: string | null;
  kategoriUsia: KategoriUsia | null;
  jenisKelamin: JenisKelamin | null;
  /** null = not yet recorded for this sesi. */
  status: AbsensiStatus | null;
  keterangan: string | null;
}

export interface SesiAbsensiData {
  sesiId: string;
  kegiatanId: string;
  namaKegiatan: string;
  tanggal: string;
  judul: string | null;
  catatan: string | null;
  /** Jumlah sesi di kegiatan ini (untuk konteks laporan). */
  totalSesi: number;
  peserta: SesiPesertaAbsensi[];
}

export async function getSesiAbsensi(sesiId: string): Promise<SesiAbsensiData | null> {
  const sesiRows = await db.query.kegiatanSesi.findMany({
    where: (s, { eq }) => eq(s.id, sesiId),
    columns: { id: true, kegiatanId: true, tanggal: true, judul: true, catatan: true },
    with: { kegiatan: { columns: { namaKegiatan: true } } },
    limit: 1,
  });
  const sesi = sesiRows[0];
  if (!sesi) return null;

  const detail = await getKegiatanDetail(sesi.kegiatanId);
  const recorded = await db.query.absensi.findMany({
    where: (a, { eq }) => eq(a.sesiId, sesiId),
    columns: { santriId: true, status: true, keterangan: true },
  });
  const bySantri = new Map(recorded.map((r) => [r.santriId, r]));

  const totalSesi = detail?.sesi.length ?? 0;

  return {
    sesiId: sesi.id,
    kegiatanId: sesi.kegiatanId,
    namaKegiatan: sesi.kegiatan.namaKegiatan,
    tanggal: sesi.tanggal.toISOString(),
    judul: sesi.judul,
    catatan: sesi.catatan,
    totalSesi,
    peserta: (detail?.peserta ?? []).map((p) => ({
      santriId: p.santriId,
      nama: p.nama,
      kelasNama: p.kelasNama,
      kategoriUsia: p.kategoriUsia,
      jenisKelamin: p.jenisKelamin,
      status: bySantri.get(p.santriId)?.status ?? null,
      keterangan: bySantri.get(p.santriId)?.keterangan ?? null,
    })),
  };
}

export interface SantriSesiStatus {
  sesiId: string;
  tanggal: string;
  judul: string | null;
  /** null = not yet recorded. */
  status: AbsensiStatus | null;
  keterangan: string | null;
}

export interface SantriAbsensiKegiatan {
  kegiatanId: string;
  namaKegiatan: string;
  statusKegiatan: "aktif" | "nonaktif";
  totalSesi: number;
  hadir: number;
  izin: number;
  tanpaKeterangan: number;
  belumDiabsen: number;
  sesi: SantriSesiStatus[];
}

/** Attendance history of one santri across every kegiatan they participate in. */
export async function getSantriAbsensi(santriId: string): Promise<SantriAbsensiKegiatan[]> {
  const links = await db
    .select({ kegiatanId: kegiatanPeserta.kegiatanId })
    .from(kegiatanPeserta)
    .where(eq(kegiatanPeserta.santriId, santriId));
  if (links.length === 0) return [];

  const ids = links.map((l) => l.kegiatanId);
  const kegiatanRows = await db.query.kegiatan.findMany({
    where: (k, { inArray }) => inArray(k.id, ids),
    columns: { id: true, namaKegiatan: true, status: true },
    orderBy: (k, { asc }) => [asc(k.namaKegiatan)],
  });
  const sesiRows = await db.query.kegiatanSesi.findMany({
    where: (s, { inArray }) => inArray(s.kegiatanId, ids),
    columns: { id: true, kegiatanId: true, tanggal: true, judul: true },
    orderBy: (s, { asc }) => [asc(s.tanggal)],
  });
  const sesiIds = sesiRows.map((s) => s.id);
  const recorded =
    sesiIds.length > 0
      ? await db
          .select({
            sesiId: absensi.sesiId,
            status: absensi.status,
            keterangan: absensi.keterangan,
          })
          .from(absensi)
          .where(eq(absensi.santriId, santriId))
      : [];
  const bySesi = new Map(recorded.map((r) => [r.sesiId, r]));
  const sesiByKegiatan = new Map<string, typeof sesiRows>();
  for (const s of sesiRows) {
    const arr = sesiByKegiatan.get(s.kegiatanId) ?? [];
    arr.push(s);
    sesiByKegiatan.set(s.kegiatanId, arr);
  }

  return kegiatanRows.map((k) => {
    const sesi = (sesiByKegiatan.get(k.id) ?? []).map((s) => ({
      sesiId: s.id,
      tanggal: s.tanggal.toISOString(),
      judul: s.judul,
      status: bySesi.get(s.id)?.status ?? null,
      keterangan: bySesi.get(s.id)?.keterangan ?? null,
    }));
    let hadir = 0;
    let izin = 0;
    let tanpaKeterangan = 0;
    let belumDiabsen = 0;
    for (const s of sesi) {
      if (s.status === "hadir") hadir += 1;
      else if (s.status === "izin") izin += 1;
      else if (s.status === "tanpa_keterangan") tanpaKeterangan += 1;
      else belumDiabsen += 1;
    }
    return {
      kegiatanId: k.id,
      namaKegiatan: k.namaKegiatan,
      statusKegiatan: k.status,
      totalSesi: sesi.length,
      hadir,
      izin,
      tanpaKeterangan,
      belumDiabsen,
      sesi,
    };
  });
}
