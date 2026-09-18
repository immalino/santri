import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { kelas, kitab, santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kelasInputSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

/** Update a kelas. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = kelasInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { namaKelas, deskripsi, urutan, bebasSyarat } = parsed.data;
  const [updated] = await db
    .update(kelas)
    .set({
      namaKelas,
      deskripsi: deskripsi || null,
      ...(urutan !== undefined ? { urutan } : {}),
      ...(bebasSyarat !== undefined ? { bebasSyarat } : {}),
    })
    .where(eq(kelas.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

/**
 * Delete a kelas. Hard-delete is only allowed when no santri or kitab references it;
 * otherwise reject so santri records (and their relations) stay intact.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const [existing] = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }

  const santriInKelas = await db
    .select({ id: santri.id })
    .from(santri)
    .where(eq(santri.kelasId, id))
    .limit(1);
  if (santriInKelas.length > 0) {
    return NextResponse.json(
      { error: "Kelas masih memiliki santri. Pindahkan atau hapus santri dulu." },
      { status: 400 },
    );
  }

  const [{ value: jumlahKitab }] = await db
    .select({ value: count() })
    .from(kitab)
    .where(eq(kitab.kelasId, id));
  if (jumlahKitab > 0) {
    return NextResponse.json(
      { error: `Kelas masih dipakai ${jumlahKitab} kitab. Pindahkan kitab dulu.` },
      { status: 400 },
    );
  }

  await db.delete(kelas).where(eq(kelas.id, id));
  return NextResponse.json({ ok: true });
}
