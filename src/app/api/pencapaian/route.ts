import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { halaman, pencapaian } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { pencapaianInputSchema } from "@/lib/validations";

/**
 * Pencapaian (ustadz grading, task 5.1).
 *
 * - GET: the page-by-page scores for one santri in one kitab (all pages of the
 *   kitab, with `persentase: null` when that page is not yet graded).
 * - POST: batch upsert of per-page scores. One row per (santri, halaman) as
 *   required by PRD #9 — re-grading UPDATES the row, never duplicates it.
 *
 * Role: ustadz (and admin, who may also grade). Wali cannot POST here.
 */

/** Per-page scores for one santri + kitab, merged onto every page of the kitab. */
export async function GET(request: Request) {
  const session = await requireApiRole(["ustadz", "admin"]);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const santriId = url.searchParams.get("santriId");
  const kitabId = url.searchParams.get("kitabId");
  if (!santriId || !kitabId) {
    return NextResponse.json(
      { error: "Parameter santriId dan kitabId wajib." },
      { status: 400 },
    );
  }

  const pages = await db.query.halaman.findMany({
    where: (h, { eq }) => eq(h.kitabId, kitabId),
    columns: { id: true, nomorHalaman: true },
    orderBy: (h, { asc }) => [asc(h.nomorHalaman)],
  });

  const scores =
    pages.length > 0
      ? await db.query.pencapaian.findMany({
          where: (p, { and, eq, inArray }) =>
            and(eq(p.santriId, santriId), inArray(p.halamanId, pages.map((p) => p.id))),
          columns: { halamanId: true, persentase: true, tanggalDinilai: true },
        })
      : [];

  const scoreMap = new Map(scores.map((s) => [s.halamanId, s]));

  return NextResponse.json({
    santriId,
    kitabId,
    halaman: pages.map((p) => {
      const score = scoreMap.get(p.id);
      return {
        halamanId: p.id,
        nomorHalaman: p.nomorHalaman,
        persentase: score?.persentase ?? null,
        tanggalDinilai: score?.tanggalDinilai ?? null,
      };
    }),
  });
}

/**
 * Batch upsert per-page scores. Every page is saved as its own row
 * `onConflictDoUpdate` on the unique (santri_id, halaman_id) constraint, so
 * grading a page again UPDATES the existing row instead of inserting a new one.
 */
export async function POST(request: Request) {
  const session = await requireApiRole(["ustadz", "admin"]);
  if (session instanceof Response) return session;

  const parsed = pencapaianInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { santriId, kitabId, nilai } = parsed.data;

  // Only grade pages that actually belong to the selected kitab (idempotency +
  // don't trust the client to echo valid halaman ids).
  const validHalaman = await db
    .select({ id: halaman.id })
    .from(halaman)
    .where(and(eq(halaman.kitabId, kitabId), inArray(halaman.id, nilai.map((n) => n.halamanId))));
  const validIds = new Set(validHalaman.map((h) => h.id));

  const rows = nilai
    .filter((n) => validIds.has(n.halamanId))
    .map((n) => ({
      santriId,
      halamanId: n.halamanId,
      persentase: n.persentase,
      dinilaiOleh: session.user.id,
      tanggalDinilai: new Date(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Halaman yang dipilih tidak valid." }, { status: 400 });
  }

  await db
    .insert(pencapaian)
    .values(rows)
    .onConflictDoUpdate({
      target: [pencapaian.santriId, pencapaian.halamanId],
      set: {
        persentase: sql`excluded.persentase`,
        dinilaiOleh: sql`excluded.dinilai_oleh`,
        tanggalDinilai: sql`excluded.tanggal_dinilai`,
        updatedAt: sql`now()`,
      },
    });

  return NextResponse.json({ ok: true, saved: rows.length });
}