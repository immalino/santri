import { NextResponse } from "next/server";
import { db } from "@/db";
import { santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { santriInputSchema } from "@/lib/validations";

/** List all santri (incl. nonaktif) with their kelas name. */
export async function GET() {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const rows = await db.query.santri.findMany({
    orderBy: (s, { asc }) => [asc(s.nama)],
    with: { kelas: { columns: { namaKelas: true } } },
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      kelasId: r.kelasId,
      kelasNama: r.kelas?.namaKelas ?? null,
      statusAktif: r.statusAktif,
    })),
  );
}

/** Create a santri. */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = santriInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { nama, kelasId, statusAktif } = parsed.data;
  const [created] = await db
    .insert(santri)
    .values({
      nama,
      kelasId: kelasId ?? null,
      statusAktif: statusAktif ?? true,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
