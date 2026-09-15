import { NextResponse } from "next/server";
import { db } from "@/db";
import { kegiatanSesi } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { sesiInputSchema } from "@/lib/validations";
import { getKegiatanDetail } from "@/lib/absensi-stats";

/** List sesi of one kegiatan (ordered by date) + create a new sesi. */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(detail.sesi);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = sesiInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

  const { tanggal, judul, catatan } = parsed.data;
  const [sesi] = await db
    .insert(kegiatanSesi)
    .values({
      kegiatanId: id,
      tanggal,
      judul: judul || null,
      catatan: catatan || null,
    })
    .returning();

  return NextResponse.json(sesi, { status: 201 });
}
