import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kegiatan } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kegiatanUpdateSchema } from "@/lib/validations";
import { getKegiatanDetail } from "@/lib/absensi-stats";
import { getWaliSantris } from "@/lib/santri-progress";

/**
 * Single-kegiatan API (Fase 10). DELETE is a soft delete (status nonaktif),
 * mirroring the kitab pattern — history stays visible.
 */

async function waliMayView(kegiatanId: string, waliId: string) {
  const linked = await getWaliSantris(waliId);
  const detail = await getKegiatanDetail(kegiatanId);
  if (!detail) return null;
  const own = new Set(linked.map((s) => s.id));
  return detail.peserta.some((p) => own.has(p.santriId)) ? detail : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz", "wali"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  if (session.user.role === "wali") {
    const detail = await waliMayView(id, session.user.id);
    if (!detail)
      return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    return NextResponse.json(detail);
  }

  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = kegiatanUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const patch: Partial<{ namaKegiatan: string; deskripsi: string | null; status: "aktif" | "nonaktif" }> = {};
  if (parsed.data.namaKegiatan !== undefined) patch.namaKegiatan = parsed.data.namaKegiatan;
  if (parsed.data.deskripsi !== undefined) patch.deskripsi = parsed.data.deskripsi || null;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const [updated] = await db
    .update(kegiatan)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(kegiatan.id, id))
    .returning();
  if (!updated)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}

/** Soft delete: set status nonaktif (history is preserved). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const [updated] = await db
    .update(kegiatan)
    .set({ status: "nonaktif", updatedAt: new Date() })
    .where(eq(kegiatan.id, id))
    .returning();
  if (!updated)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}
