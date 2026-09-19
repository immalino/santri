import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitab, kitabBagian, kelas } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabBagianUpdateSchema } from "@/lib/validations";

interface Params { params: Promise<{ bagianId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { bagianId } = await params;
  const parsed = kitabBagianUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const [existing] = await db.select().from(kitabBagian).where(eq(kitabBagian.id, bagianId)).limit(1);
  if (!existing) return NextResponse.json({ error: "Bagian tidak ditemukan." }, { status: 404 });
  const [kitabRow] = await db.select().from(kitab).where(eq(kitab.id, existing.kitabId)).limit(1);
  if (parsed.data.kelasId) {
    const [k] = await db.select().from(kelas).where(eq(kelas.id, parsed.data.kelasId)).limit(1);
    if (!k) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }
  const dari = parsed.data.halamanDari ?? existing.halamanDari;
  const sampai = parsed.data.halamanSampai ?? existing.halamanSampai;
  if (sampai > (kitabRow?.jumlahHalaman ?? sampai)) return NextResponse.json({ error: `Halaman akhir maksimal ${kitabRow?.jumlahHalaman}.` }, { status: 400 });
  const rows = await db.select().from(kitabBagian).where(eq(kitabBagian.kitabId, existing.kitabId));
  const tabrakan = rows.some((r) => r.id !== bagianId && dari <= r.halamanSampai && sampai >= r.halamanDari);
  if (tabrakan) return NextResponse.json({ error: "Rentang bertabrakan dengan bagian lain kitab ini." }, { status: 400 });
  const [updated] = await db.update(kitabBagian).set({ ...parsed.data }).where(eq(kitabBagian.id, bagianId)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { bagianId } = await params;
  const [existing] = await db.select().from(kitabBagian).where(eq(kitabBagian.id, bagianId)).limit(1);
  if (!existing) return NextResponse.json({ error: "Bagian tidak ditemukan." }, { status: 404 });
  await db.delete(kitabBagian).where(eq(kitabBagian.id, bagianId));
  return NextResponse.json({ ok: true });
}
