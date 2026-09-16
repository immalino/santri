/**
 * Template laporan teks (fase laporan): katalog variabel tetap + render murni.
 * Client-safe: tidak mengimpor apa pun dari server bundle.
 */

export interface LaporanPeserta {
  nama: string;
  status: "hadir" | "izin" | "tanpa_keterangan" | null;
  keterangan: string | null;
  kategoriUsia: "pra_remaja" | "remaja" | "pra_nikah" | null;
  jenisKelamin: "laki_laki" | "perempuan" | null;
}

export interface LaporanSesiInput {
  namaKegiatan: string;
  tanggal: string;
  judul: string | null;
  catatan: string | null;
  peserta: LaporanPeserta[];
}

export interface LaporanContext {
  namaKegiatan: string;
  judulSesi: string;
  catatanSesi: string;
  totalPeserta: number;
  totalSesi: number;
  hari: string;
  tanggal: string;
  tanggalPanjang: string;
  counts: Record<string, number>;
  lists: Record<string, string[]>;
}

export const VARIABLE_CATALOG: { name: string; description: string }[] = [
  { name: "nama_kegiatan", description: "Nama kegiatan" },
  { name: "judul_sesi", description: "Judul sesi (kosong bila tidak ada)" },
  { name: "catatan_sesi", description: "Catatan sesi (kosong bila tidak ada)" },
  { name: "total_peserta", description: "Jumlah santri terdaftar" },
  { name: "total_sesi", description: "Jumlah sesi di kegiatan ini" },
  { name: "hari", description: "Hari sesi, mis. Sabtu" },
  { name: "tanggal", description: "Tanggal pendek, mis. 12 Jan 2026" },
  { name: "tanggal_panjang", description: "Tanggal panjang, mis. Sabtu, 12 Januari 2026" },
  { name: "jumlah_hadir", description: "Yang hadir" },
  { name: "jumlah_izin", description: "Yang izin" },
  { name: "jumlah_tanpa_keterangan", description: "Yang tanpa keterangan" },
  { name: "jumlah_tidak_hadir", description: "Izin + tanpa keterangan" },
  { name: "jumlah_belum_diabsen", description: "Belum diabsen" },
  { name: "jumlah_hadir_laki_laki", description: "Hadir, laki-laki" },
  { name: "jumlah_hadir_perempuan", description: "Hadir, perempuan" },
  { name: "jumlah_hadir_pra_remaja", description: "Hadir, pra-remaja" },
  { name: "jumlah_hadir_remaja", description: "Hadir, remaja" },
  { name: "jumlah_hadir_pra_nikah", description: "Hadir, pra-nikah" },
  { name: "jumlah_hadir_pra_remaja_laki_laki", description: "Hadir, pra-remaja laki-laki" },
  { name: "jumlah_hadir_pra_remaja_perempuan", description: "Hadir, pra-remaja perempuan" },
  { name: "jumlah_hadir_remaja_laki_laki", description: "Hadir, remaja laki-laki" },
  { name: "jumlah_hadir_remaja_perempuan", description: "Hadir, remaja perempuan" },
  { name: "jumlah_hadir_pra_nikah_laki_laki", description: "Hadir, pra-nikah laki-laki" },
  { name: "jumlah_hadir_pra_nikah_perempuan", description: "Hadir, pra-nikah perempuan" },
  { name: "persen_hadir", description: "Persen hadir dari total peserta" },
  { name: "persen_izin", description: "Persen izin dari total peserta" },
  { name: "persen_tanpa_keterangan", description: "Persen tanpa keterangan" },
  { name: "persen_tidak_hadir", description: "Persen tidak hadir (izin + tanpa ket.)" },
  { name: "persen_belum_diabsen", description: "Persen belum diabsen" },
  { name: "daftar_hadir", description: "Daftar bernomor yang hadir" },
  { name: "daftar_izin", description: "Daftar bernomor yang izin (+ keterangan)" },
  { name: "daftar_tanpa_keterangan", description: "Daftar yang tanpa keterangan" },
  { name: "daftar_tidak_hadir", description: "Daftar izin + tanpa keterangan" },
  { name: "daftar_belum_diabsen", description: "Daftar yang belum diabsen" },
  { name: "daftar_hadir_laki_laki", description: "Daftar hadir laki-laki" },
  { name: "daftar_hadir_perempuan", description: "Daftar hadir perempuan" },
  { name: "daftar_hadir_pra_remaja", description: "Daftar hadir pra-remaja" },
  { name: "daftar_hadir_remaja", description: "Daftar hadir remaja" },
  { name: "daftar_hadir_pra_nikah", description: "Daftar hadir pra-nikah" },
];

const KNOWN = new Set(VARIABLE_CATALOG.map((v) => v.name));

function sortNama(list: LaporanPeserta[]): LaporanPeserta[] {
  return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

function formatNama(p: LaporanPeserta, withKeterangan: boolean): string {
  const ket = p.keterangan?.trim();
  return withKeterangan && p.status === "izin" && ket ? `${p.nama} (${ket})` : p.nama;
}

function numbered(list: LaporanPeserta[], opts?: { withKeterangan?: boolean }): string[] {
  const withKeterangan = opts?.withKeterangan ?? false;
  return sortNama(list).map((p, i) => `${i + 1}. ${formatNama(p, withKeterangan)}`);
}

function pct(n: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export function buildLaporanContext(sesi: LaporanSesiInput, totalSesi: number): LaporanContext {
  const d = new Date(sesi.tanggal);
  const hadir = sesi.peserta.filter((p) => p.status === "hadir");
  const izin = sesi.peserta.filter((p) => p.status === "izin");
  const tanpaKet = sesi.peserta.filter((p) => p.status === "tanpa_keterangan");
  const belum = sesi.peserta.filter((p) => p.status === null);
  const tidakHadir = [...izin, ...tanpaKet];
  const total = sesi.peserta.length;

  const hadirBy = (usia: LaporanPeserta["kategoriUsia"], gender: LaporanPeserta["jenisKelamin"]) =>
    hadir.filter((p) => (usia ? p.kategoriUsia === usia : true) && (gender ? p.jenisKelamin === gender : true));

  const counts: Record<string, number> = {
    jumlah_hadir: hadir.length,
    jumlah_izin: izin.length,
    jumlah_tanpa_keterangan: tanpaKet.length,
    jumlah_tidak_hadir: tidakHadir.length,
    jumlah_belum_diabsen: belum.length,
    jumlah_hadir_laki_laki: hadirBy(null, "laki_laki").length,
    jumlah_hadir_perempuan: hadirBy(null, "perempuan").length,
    jumlah_hadir_pra_remaja: hadirBy("pra_remaja", null).length,
    jumlah_hadir_remaja: hadirBy("remaja", null).length,
    jumlah_hadir_pra_nikah: hadirBy("pra_nikah", null).length,
    jumlah_hadir_pra_remaja_laki_laki: hadirBy("pra_remaja", "laki_laki").length,
    jumlah_hadir_pra_remaja_perempuan: hadirBy("pra_remaja", "perempuan").length,
    jumlah_hadir_remaja_laki_laki: hadirBy("remaja", "laki_laki").length,
    jumlah_hadir_remaja_perempuan: hadirBy("remaja", "perempuan").length,
    jumlah_hadir_pra_nikah_laki_laki: hadirBy("pra_nikah", "laki_laki").length,
    jumlah_hadir_pra_nikah_perempuan: hadirBy("pra_nikah", "perempuan").length,
  };

  const lists: Record<string, string[]> = {
    daftar_hadir: numbered(hadir),
    daftar_izin: numbered(izin, { withKeterangan: true }),
    daftar_tanpa_keterangan: numbered(tanpaKet),
    daftar_tidak_hadir: numbered(tidakHadir, { withKeterangan: true }),
    daftar_belum_diabsen: numbered(belum),
    daftar_hadir_laki_laki: numbered(hadirBy(null, "laki_laki")),
    daftar_hadir_perempuan: numbered(hadirBy(null, "perempuan")),
    daftar_hadir_pra_remaja: numbered(hadirBy("pra_remaja", null)),
    daftar_hadir_remaja: numbered(hadirBy("remaja", null)),
    daftar_hadir_pra_nikah: numbered(hadirBy("pra_nikah", null)),
  };

  return {
    namaKegiatan: sesi.namaKegiatan,
    judulSesi: sesi.judul ?? "",
    catatanSesi: sesi.catatan ?? "",
    totalPeserta: total,
    totalSesi,
    hari: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d),
    tanggal: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d),
    tanggalPanjang: new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
    counts,
    lists,
  };
}

function valueOf(name: string, ctx: LaporanContext): string | null {
  switch (name) {
    case "nama_kegiatan": return ctx.namaKegiatan;
    case "judul_sesi": return ctx.judulSesi;
    case "catatan_sesi": return ctx.catatanSesi;
    case "total_peserta": return String(ctx.totalPeserta);
    case "total_sesi": return String(ctx.totalSesi);
    case "hari": return ctx.hari;
    case "tanggal": return ctx.tanggal;
    case "tanggal_panjang": return ctx.tanggalPanjang;
    case "persen_hadir": return pct(ctx.counts.jumlah_hadir, ctx.totalPeserta);
    case "persen_izin": return pct(ctx.counts.jumlah_izin, ctx.totalPeserta);
    case "persen_tanpa_keterangan": return pct(ctx.counts.jumlah_tanpa_keterangan, ctx.totalPeserta);
    case "persen_tidak_hadir": return pct(ctx.counts.jumlah_tidak_hadir, ctx.totalPeserta);
    case "persen_belum_diabsen": return pct(ctx.counts.jumlah_belum_diabsen, ctx.totalPeserta);
    default: break;
  }
  if (Object.hasOwn(ctx.counts, name)) return String(ctx.counts[name]);
  if (Object.hasOwn(ctx.lists, name)) {
    const l = ctx.lists[name];
    return l.length > 0 ? l.join("\n") : "(tidak ada)";
  }
  return null;
}

/** Variabel `{{...}}` tak dikenal — dibiarkan apa adanya + dilaporkan. */
export function findUnknownVars(isi: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi)) !== null) {
    const name = m[1];
    if (!KNOWN.has(name) && !out.includes(name)) out.push(name);
  }
  return out;
}

export function renderTemplate(isi: string, ctx: LaporanContext): { text: string; unknownVars: string[] } {
  const unknownVars = findUnknownVars(isi);
  const text = isi.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, name: string) => {
    const v = valueOf(name, ctx);
    return v === null ? full : v;
  });
  return { text, unknownVars };
}
