import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { waliSantri, user, santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { waliSantriReplaceSchema } from "@/lib/validations";

/**
 * Wali <-> Santri relations (task 4.12). A wali links to one or more santri;
 * the relation is unique per (wali, santri).
 */

/** List all relations with the wali and santri names. */
export async function GET() {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const rows = await db.query.waliSantri.findMany({
    with: {
      wali: { columns: { id: true, name: true } },
      santri: { columns: { id: true, nama: true } },
    },
    orderBy: (r, { asc }) => [asc(r.createdAt)],
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      waliId: r.waliId,
      waliName: r.wali.name,
      santriId: r.santriId,
      santriNama: r.santri.nama,
    })),
  );
}

/**
 * Replace the full set of santri linked to one wali (atomic): drop relations
 * for unselected santri, insert selected ones. Runs in one transaction.
 */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = waliSantriReplaceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { waliId, santriIds } = parsed.data;

  // Guard: the target user must exist and actually be a wali.
  const [wali] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, waliId))
    .limit(1);
  if (!wali || wali.role !== "wali") {
    return NextResponse.json({ error: "Wali tidak ditemukan." }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(waliSantri).where(eq(waliSantri.waliId, waliId));
    if (santriIds.length > 0) {
      const santriRows = await tx
        .select({ id: santri.id })
        .from(santri)
        .where(inArray(santri.id, santriIds));
      if (santriRows.length > 0) {
        await tx.insert(waliSantri).values(
          santriRows.map((s) => ({ waliId, santriId: s.id })),
        );
      }
    }
  });

  return NextResponse.json({ ok: true });
}
