import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { santriUpdateSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

/** Update a santri (name, kelas, status aktif, kategori usia, jenis kelamin). */
export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = santriUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { nama, kelasId, statusAktif, kategoriUsia, jenisKelamin } = parsed.data;
  const [updated] = await db
    .update(santri)
    .set({
      ...(nama !== undefined ? { nama } : {}),
      ...(kelasId !== undefined ? { kelasId: kelasId ?? null } : {}),
      ...(statusAktif !== undefined ? { statusAktif } : {}),
      ...(kategoriUsia !== undefined ? { kategoriUsia: kategoriUsia ?? null } : {}),
      ...(jenisKelamin !== undefined ? { jenisKelamin: jenisKelamin ?? null } : {}),
    })
    .where(eq(santri.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Santri tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

/** Soft delete: deactivate the santri (records + relations are kept). */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const [existing] = await db
    .select({ id: santri.id })
    .from(santri)
    .where(eq(santri.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Santri tidak ditemukan." }, { status: 404 });
  }

  await db.update(santri).set({ statusAktif: false }).where(eq(santri.id, id));
  return NextResponse.json({ ok: true });
}
