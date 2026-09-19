import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitab, kitabBagian, kelas } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabBagianInputSchema } from "@/lib/validations";

interface Params { params: Promise<{ id: string }> }

async function cekOverlap(kitabId: string, dari: number, sampai: number, excludeId?: string) {
  const rows = await db.select().from(kitabBagian).where(eq(kitabBagian.kitabId, kitabId));
  return rows.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    return dari <= r.halamanSampai && sampai >= r.halamanDari;
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { id } = await params;
  const rows = await db.query.kitabBagian.findMany({
    where: (b, { eq }) => eq(b.kitabId, id),
    with: { kelas: { columns: { namaKelas: true, urutan: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { id: kitabId } = await params;
  const parsed = kitabBagianInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const [kitabRow] = await db.select().from(kitab).where(eq(kitab.id, kitabId)).limit(1);
  if (!kitabRow) return NextResponse.json({ error: "Kitab tidak ditemukan." }, { status: 404 });
  const [kelasRow] = await db.select().from(kelas).where(eq(kelas.id, parsed.data.kelasId)).limit(1);
  if (!kelasRow) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  if (parsed.data.halamanSampai > kitabRow.jumlahHalaman) return NextResponse.json({ error: `Halaman akhir maksimal ${kitabRow.jumlahHalaman}.` }, { status: 400 });
  if (await cekOverlap(kitabId, parsed.data.halamanDari, parsed.data.halamanSampai)) return NextResponse.json({ error: "Rentang bertabrakan dengan bagian lain kitab ini." }, { status: 400 });
  const [created] = await db.insert(kitabBagian).values({ kitabId, ...parsed.data }).returning();
  return NextResponse.json(created, { status: 201 });
}
