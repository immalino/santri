import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { kegiatanPeserta, santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kegiatanPesertaReplaceSchema } from "@/lib/validations";
import { getKegiatanDetail } from "@/lib/absensi-stats";

/**
 * Kegiatan peserta API (Fase 10). Replaces the full participant set atomically.
 * Removing a peserta does NOT delete their historical absensi rows — old sesi
 * keep the records, new sesi simply stop listing them.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(detail.peserta);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = kegiatanPesertaReplaceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

  const { santriIds } = parsed.data;
  await db.transaction(async (tx) => {
    await tx.delete(kegiatanPeserta).where(eq(kegiatanPeserta.kegiatanId, id));
    if (santriIds.length > 0) {
      const valid = await tx
        .select({ id: santri.id })
        .from(santri)
        .where(inArray(santri.id, santriIds));
      if (valid.length > 0) {
        await tx.insert(kegiatanPeserta).values(
          valid.map((s) => ({ kegiatanId: id, santriId: s.id })),
        );
      }
    }
  });

  return NextResponse.json({ ok: true });
}
