import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { kegiatanTemplate } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { templateUpdateSchema } from "@/lib/validations";

/** Edit atau hapus satu template. Template harus milik kegiatan di URL. */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, templateId } = await params;
  const parsed = templateUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(kegiatanTemplate)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(kegiatanTemplate.id, templateId), eq(kegiatanTemplate.kegiatanId, id)))
    .returning();
  if (!updated)
    return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, templateId } = await params;
  const [row] = await db
    .select({ id: kegiatanTemplate.id })
    .from(kegiatanTemplate)
    .where(and(eq(kegiatanTemplate.id, templateId), eq(kegiatanTemplate.kegiatanId, id)))
    .limit(1);
  if (!row)
    return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  await db.delete(kegiatanTemplate).where(eq(kegiatanTemplate.id, templateId));
  return NextResponse.json({ ok: true });
}
