import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { absensi, kegiatanPeserta, kegiatanSesi } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { absensiInputSchema } from "@/lib/validations";
import { getSesiAbsensi } from "@/lib/absensi-stats";

/**
 * Sesi absensi API (Fase 10).
 *
 * - GET: every registered peserta merged with their recorded status
 *   (`status: null` when not yet recorded).
 * - POST: batch upsert — one row per (sesi, santri), re-recording UPDATES
 *   the row instead of duplicating it (same pattern as pencapaian).
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sesiId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, sesiId } = await params;
  const data = await getSesiAbsensi(sesiId);
  if (!data || data.kegiatanId !== id) {
    return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sesiId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, sesiId } = await params;
  const parsed = absensiInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const [sesi] = await db
    .select({ id: kegiatanSesi.id, kegiatanId: kegiatanSesi.kegiatanId })
    .from(kegiatanSesi)
    .where(and(eq(kegiatanSesi.id, sesiId), eq(kegiatanSesi.kegiatanId, id)))
    .limit(1);
  if (!sesi) {
    return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  }

  // Only record santri registered as peserta (don't trust the client list).
  const peserta = await db
    .select({ santriId: kegiatanPeserta.santriId })
    .from(kegiatanPeserta)
    .where(eq(kegiatanPeserta.kegiatanId, id));
  const pesertaIds = new Set(peserta.map((p) => p.santriId));

  const rows = parsed.data.nilai
    .filter((n) => pesertaIds.has(n.santriId))
    .map((n) => ({
      sesiId,
      santriId: n.santriId,
      status: n.status,
      keterangan: n.keterangan || null,
      dicatatOleh: session.user.id,
      tanggalDicatat: new Date(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Santri yang dipilih tidak valid." }, { status: 400 });
  }

  await db
    .insert(absensi)
    .values(rows)
    .onConflictDoUpdate({
      target: [absensi.sesiId, absensi.santriId],
      set: {
        status: sql`excluded.status`,
        keterangan: sql`excluded.keterangan`,
        dicatatOleh: sql`excluded.dicatat_oleh`,
        tanggalDicatat: sql`excluded.tanggal_dicatat`,
        updatedAt: sql`now()`,
      },
    });

  return NextResponse.json({ ok: true, saved: rows.length });
}
