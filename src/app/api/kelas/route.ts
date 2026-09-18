import { NextResponse } from "next/server";
import { db } from "@/db";
import { kelas } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kelasInputSchema } from "@/lib/validations";

/** List all kelas with their santri count. */
export async function GET() {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const rows = await db.query.kelas.findMany({
    orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
    with: { santri: { columns: { id: true } } },
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      namaKelas: r.namaKelas,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      bebasSyarat: r.bebasSyarat,
      jumlahSantri: r.santri.length,
    })),
  );
}

/** Create a kelas. */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = kelasInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { namaKelas, deskripsi, urutan, bebasSyarat } = parsed.data;
  const [created] = await db
    .insert(kelas)
    .values({
      namaKelas,
      deskripsi: deskripsi || null,
      urutan: urutan ?? 0,
      bebasSyarat: bebasSyarat ?? false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
