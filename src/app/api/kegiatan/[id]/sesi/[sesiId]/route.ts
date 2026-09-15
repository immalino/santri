import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { absensi, kegiatanSesi } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { sesiInputSchema } from "@/lib/validations";

/** Edit or delete one sesi. Deleting a sesi cascades to its absensi rows. */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sesiId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, sesiId } = await params;
  const parsed = sesiInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { tanggal, judul, catatan } = parsed.data;
  const [updated] = await db
    .update(kegiatanSesi)
    .set({
      tanggal,
      judul: judul || null,
      catatan: catatan || null,
      updatedAt: new Date(),
    })
    .where(and(eq(kegiatanSesi.id, sesiId), eq(kegiatanSesi.kegiatanId, id)))
    .returning();
  if (!updated)
    return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sesiId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, sesiId } = await params;
  const [row] = await db
    .select({ id: kegiatanSesi.id })
    .from(kegiatanSesi)
    .where(and(eq(kegiatanSesi.id, sesiId), eq(kegiatanSesi.kegiatanId, id)))
    .limit(1);
  if (!row)
    return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });

  // Absensi rows cascade via FK; delete explicitly for clarity.
  await db.delete(absensi).where(eq(absensi.sesiId, sesiId));
  await db.delete(kegiatanSesi).where(eq(kegiatanSesi.id, sesiId));
  return NextResponse.json({ ok: true });
}
