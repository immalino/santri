import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitab, halaman } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabUpdateSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

async function findKitab(id: string) {
  return db.query.kitab.findFirst({
    where: (k, { eq }) => eq(k.id, id),
    columns: { id: true, namaKitab: true, jumlahHalaman: true, deskripsi: true, status: true },
  });
}

/** Get a single kitab. */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const existing = await findKitab(id);
  if (!existing) {
    return NextResponse.json({ error: "Kitab tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(existing);
}

/**
 * Update a kitab. Increasing `jumlahHalaman` only INSERTs new halaman rows
 * beyond the current max — existing halaman and their `pencapaian` are never
 * touched (ARCHITECTURE.md §4). Decreasing is rejected to protect data.
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = kitabUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const existing = await findKitab(id);
  if (!existing) {
    return NextResponse.json({ error: "Kitab tidak ditemukan." }, { status: 404 });
  }

  const { namaKitab, jumlahHalaman, deskripsi, status } = parsed.data;

  if (jumlahHalaman !== undefined && jumlahHalaman < existing.jumlahHalaman) {
    return NextResponse.json(
      {
        error:
          "Jumlah halaman tidak bisa dikurangi karena akan menghapus data pencapaian lama. Buat kitab baru bila perlu.",
      },
      { status: 400 },
    );
  }

  const updated = await db.transaction(async (tx) => {
    const [u] = await tx
      .update(kitab)
      .set({
        ...(namaKitab !== undefined ? { namaKitab } : {}),
        ...(jumlahHalaman !== undefined ? { jumlahHalaman } : {}),
        ...(deskripsi !== undefined ? { deskripsi: deskripsi || null } : {}),
        ...(status !== undefined ? { status } : {}),
      })
      .where(eq(kitab.id, id))
      .returning();

    if (jumlahHalaman !== undefined && jumlahHalaman > existing.jumlahHalaman) {
      const existingPages = await tx
        .select({ nomorHalaman: halaman.nomorHalaman })
        .from(halaman)
        .where(eq(halaman.kitabId, id));
      const max = existingPages.reduce((m, p) => Math.max(m, p.nomorHalaman), 0);
      await tx.insert(halaman).values(
        Array.from({ length: jumlahHalaman - max }, (_, i) => ({
          kitabId: id,
          nomorHalaman: max + i + 1,
        })),
      );
    }

    return u;
  });

  return NextResponse.json(updated);
}

/** Soft delete: flip status to nonaktif (never DELETE a kitab with data). */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const existing = await findKitab(id);
  if (!existing) {
    return NextResponse.json({ error: "Kitab tidak ditemukan." }, { status: 404 });
  }

  await db.update(kitab).set({ status: "nonaktif" }).where(eq(kitab.id, id));
  return NextResponse.json({ ok: true });
}
