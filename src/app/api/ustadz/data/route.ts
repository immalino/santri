import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireApiRole } from "@/lib/permissions";

/**
 * Dropdown data for the ustadz grading page (task 5.2): the active santri
 * list and the kitab list. Only ustadz (and admin) may read this.
 */
export async function GET() {
  const session = await requireApiRole(["ustadz", "admin"]);
  if (session instanceof Response) return session;

  const [santris, kitabs] = await Promise.all([
    db.query.santri.findMany({
      where: (s, { eq }) => eq(s.statusAktif, true),
      columns: { id: true, nama: true },
      with: { kelas: { columns: { namaKelas: true } } },
      orderBy: (s, { asc }) => [asc(s.nama)],
    }),
    db.query.kitab.findMany({
      columns: { id: true, namaKitab: true, jumlahHalaman: true },
      orderBy: (k, { asc }) => [asc(k.namaKitab)],
    }),
  ]);

  return NextResponse.json({
    santri: santris.map((s) => ({
      id: s.id,
      nama: s.nama,
      kelasNama: s.kelas?.namaKelas ?? null,
    })),
    kitab: kitabs.map((k) => ({
      id: k.id,
      namaKitab: k.namaKitab,
      jumlahHalaman: k.jumlahHalaman,
    })),
  });
}