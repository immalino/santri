import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitab, kelas, halaman } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabCreateSchema } from "@/lib/validations";

/**
 * Kitab admin API (task 4.1). Every handler re-checks the admin role server-
 * side — the proxy is only an optimistic cookie check (CLAUDE.md).
 */

/** List all kitab (including nonaktif), newest first. */
export async function GET() {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const kitabs = await db.query.kitab.findMany({
    orderBy: (k, { desc }) => [desc(k.createdAt)],
    columns: { id: true, namaKitab: true, jumlahHalaman: true, deskripsi: true, status: true, kelasId: true },
  });
  return NextResponse.json(kitabs);
}

/** Create a kitab and auto-generate its halaman rows (1..jumlahHalaman). */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = kitabCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { namaKitab, jumlahHalaman, deskripsi, status, kelasId } = parsed.data;

  if (kelasId) {
    const [kelasRow] = await db
      .select({ id: kelas.id })
      .from(kelas)
      .where(eq(kelas.id, kelasId))
      .limit(1);
    if (!kelasRow) {
      return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    }
  }

  const created = await db.transaction(async (tx) => {
    const [k] = await tx
      .insert(kitab)
      .values({
        namaKitab,
        jumlahHalaman,
        deskripsi: deskripsi || null,
        status: status ?? "aktif",
        kelasId: kelasId ?? null,
      })
      .returning();
    await tx.insert(halaman).values(
      Array.from({ length: jumlahHalaman }, (_, i) => ({
        kitabId: k.id,
        nomorHalaman: i + 1,
      })),
    );
    return k;
  });

  return NextResponse.json(created, { status: 201 });
}
