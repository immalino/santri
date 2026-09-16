import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import type { SantriProgressData, WaliKitabProgress } from "@/lib/santri-progress";
import type { SantriAbsensiKegiatan } from "@/lib/absensi-stats";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

/** Sorotan pencapaian: kitab tertinggi, terendah, dan yang perlu perhatian. */
export interface PencapaianSorotan {
  tertinggi: WaliKitabProgress | null;
  terendah: WaliKitabProgress | null;
  /** Kitab dengan rata-rata < 40 terendah, atau null bila tidak ada. */
  perluPerhatian: WaliKitabProgress | null;
  kitabDinilai: number;
  totalKitab: number;
  halamanDinilai: number;
  totalHalaman: number;
}

export function getPencapaianSorotan(data: SantriProgressData): PencapaianSorotan {
  const totalKitab = data.kitab.length;
  let kitabDinilai = 0;
  let halamanDinilai = 0;
  let totalHalaman = 0;
  for (const k of data.kitab) {
    totalHalaman += k.jumlahHalaman;
    if (k.halaman.some((h) => h.persentase !== null)) kitabDinilai += 1;
    halamanDinilai += k.halaman.filter((h) => h.persentase !== null).length;
  }
  if (totalKitab === 0) {
    return {
      tertinggi: null,
      terendah: null,
      perluPerhatian: null,
      kitabDinilai,
      totalKitab,
      halamanDinilai,
      totalHalaman,
    };
  }
  const sorted = [...data.kitab].sort((a, b) => b.rataRata - a.rataRata);
  const tertinggi = sorted[0];
  const terendah = sorted[sorted.length - 1];
  const perluPerhatian =
    [...data.kitab].filter((k) => k.rataRata < 40).sort((a, b) => a.rataRata - b.rataRata)[0] ??
    null;
  return { tertinggi, terendah, perluPerhatian, kitabDinilai, totalKitab, halamanDinilai, totalHalaman };
}

/** Agregat kehadiran lintas semua kegiatan. */
export interface KehadiranRingkasan {
  hadir: number;
  izin: number;
  tanpaKeterangan: number;
  belumDiabsen: number;
  totalSesi: number;
  totalDiabsen: number;
  /** % hadir dari sesi yang sudah diabsen (0 bila belum ada). */
  persenHadir: number;
}

export function getKehadiranRingkasan(absensi: SantriAbsensiKegiatan[]): KehadiranRingkasan {
  let hadir = 0;
  let izin = 0;
  let tanpaKeterangan = 0;
  let belumDiabsen = 0;
  let totalSesi = 0;
  for (const k of absensi) {
    hadir += k.hadir;
    izin += k.izin;
    tanpaKeterangan += k.tanpaKeterangan;
    belumDiabsen += k.belumDiabsen;
    totalSesi += k.totalSesi;
  }
  const totalDiabsen = hadir + izin + tanpaKeterangan;
  const persenHadir = totalDiabsen > 0 ? Math.round((hadir / totalDiabsen) * 100) : 0;
  return { hadir, izin, tanpaKeterangan, belumDiabsen, totalSesi, totalDiabsen, persenHadir };
}

function SorotanRow({
  label,
  kitab,
}: {
  label: string;
  kitab: WaliKitabProgress;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-secondary">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{kitab.namaKitab}</p>
        <div className="mt-1 max-w-xs">
          <ProgressBar value={kitab.rataRata} showLabel />
        </div>
      </div>
    </div>
  );
}

/**
 * Ringkasan santri (pengganti tampilan penuh di halaman `[id]`). Header
 * identitas + dua kartu ringkasan yang masing-masing menautkan ke halaman
 * detail (`pencapaianHref` / `kehadiranHref`). Server component, purely
 * presentational.
 */
export function SantriSummary({
  data,
  absensi,
  pencapaianHref,
  kehadiranHref,
}: {
  data: SantriProgressData;
  absensi: SantriAbsensiKegiatan[];
  pencapaianHref: string;
  kehadiranHref: string;
}) {
  const sorotan = getPencapaianSorotan(data);
  const ringkasan = getKehadiranRingkasan(absensi);
  const showTertinggiTerendah =
    sorotan.tertinggi !== null &&
    sorotan.terendah !== null &&
    sorotan.tertinggi.kitabId !== sorotan.terendah.kitabId;
  const showPerluPerhatian =
    sorotan.perluPerhatian !== null &&
    sorotan.perluPerhatian.kitabId !== sorotan.tertinggi?.kitabId &&
    sorotan.perluPerhatian.kitabId !== sorotan.terendah?.kitabId;

  return (
    <div className="space-y-6">
      {/* Header card: identity + overall average. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{data.nama}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{data.kelasNama ?? "Tanpa kelas"}</p>
          </div>
          <Badge variant={data.statusAktif ? "success" : "secondary"}>
            {data.statusAktif ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Rata-rata keseluruhan</span>
            <span>{data.rataRataKeseluruhan}%</span>
          </div>
          <ProgressBar value={data.rataRataKeseluruhan} />
        </div>
      </Card>

      {/* Ringkasan pencapaian materi (sorotan). */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Pencapaian Materi</h2>
              <p className="text-xs text-ink-secondary">
                {sorotan.totalKitab === 0
                  ? "Belum ada kitab."
                  : `${sorotan.kitabDinilai} dari ${sorotan.totalKitab} kitab dinilai • ${sorotan.halamanDinilai} dari ${sorotan.totalHalaman} halaman`}
              </p>
            </div>
          </div>
          <Link
            href={pencapaianHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Lihat detail
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-3 divide-y divide-border border-t border-border">
          {!data.hasPenilaian ? (
            <p className="py-3 text-sm text-ink-secondary">
              Belum ada penilaian untuk <span className="font-medium text-ink">{data.nama}</span>.
              Nilai akan otomatis tampil setelah ustadz menginput.
            </p>
          ) : sorotan.tertinggi === null ? (
            <p className="py-3 text-sm text-ink-secondary">Belum ada kitab.</p>
          ) : !showTertinggiTerendah ? (
            <SorotanRow label="Satu-satunya kitab" kitab={sorotan.tertinggi} />
          ) : (
            <>
              <SorotanRow label="Tertinggi" kitab={sorotan.tertinggi} />
              <SorotanRow label="Terendah" kitab={sorotan.terendah!} />
              {showPerluPerhatian && sorotan.perluPerhatian !== null && (
                <SorotanRow label="Perlu perhatian (< 40%)" kitab={sorotan.perluPerhatian} />
              )}
            </>
          )}
        </div>
      </Card>

      {/* Ringkasan kehadiran. */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-ink">Kehadiran</h2>
              <p className="text-xs text-ink-secondary">
                {ringkasan.totalSesi === 0
                  ? "Belum terdaftar di kegiatan apa pun."
                  : `${ringkasan.hadir} hadir • ${ringkasan.izin} izin • ${ringkasan.tanpaKeterangan} tanpa ket. • ${ringkasan.totalSesi} sesi`}
              </p>
            </div>
          </div>
          <Link
            href={kehadiranHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Lihat detail
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {absensi.length > 0 && (
          <div className="mt-3 border-t border-border">
            <div className="py-3">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-secondary">
                <span>Tingkat kehadiran (dari sesi yang sudah diabsen)</span>
                <span>{ringkasan.persenHadir}%</span>
              </div>
              <ProgressBar value={ringkasan.persenHadir} />
            </div>
            <ul className="divide-y divide-border">
              {absensi.map((k) => (
                <li key={k.kegiatanId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {k.namaKegiatan}
                      </span>
                      {k.statusKegiatan === "nonaktif" && (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-secondary">
                      {k.hadir} hadir • {k.izin} izin • {k.tanpaKeterangan} tanpa ket. •{" "}
                      {k.totalSesi} sesi
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
