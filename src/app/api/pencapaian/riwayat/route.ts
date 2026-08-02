import { NextResponse } from "next/server";
import { eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { pencapaian, halaman, kitab, santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";

/**
 * Grading history (task 5.5): one row per (santri, kitab) that has any score,
 * with the kitab average and the most recent grading date. Since `pencapaian`
 * keeps only the latest value per page, "history" is the snapshot of every
 * (santri, kitab) combo that has been graded (optionally filtered per santri).
 */
export async function GET(request: Request) {
  const session = await requireApiRole(["ustadz", "admin"]);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const santriId = url.searchParams.get("santriId");

  const rows = await db
    .select({
      santriId: pencapaian.santriId,
      santriNama: santri.nama,
      kitabId: kitab.id,
      kitabNama: kitab.namaKitab,
      jumlahHalaman: kitab.jumlahHalaman,
      rataRata: sql<number>`round(avg(${pencapaian.persentase}))`,
      terakhirDinilai: max(pencapaian.tanggalDinilai),
    })
    .from(pencapaian)
    .innerJoin(santri, eq(pencapaian.santriId, santri.id))
    .innerJoin(halaman, eq(pencapaian.halamanId, halaman.id))
    .innerJoin(kitab, eq(halaman.kitabId, kitab.id))
    .where(santriId ? eq(pencapaian.santriId, santriId) : undefined)
    .groupBy(santri.id, kitab.id)
    .orderBy(sql`max(${pencapaian.tanggalDinilai}) desc`);

  return NextResponse.json(rows);
}