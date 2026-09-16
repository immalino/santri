import { NextResponse } from "next/server";
import { db } from "@/db";
import { kegiatanTemplate } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { templateCreateSchema } from "@/lib/validations";
import { getKegiatanDetail, getKegiatanTemplates } from "@/lib/absensi-stats";

/** List template laporan satu kegiatan (urut dibuat) + buat template baru. */

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
  return NextResponse.json(await getKegiatanTemplates(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = templateCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

  const [row] = await db
    .insert(kegiatanTemplate)
    .values({ kegiatanId: id, nama: parsed.data.nama, isi: parsed.data.isi })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
