import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { santriBulkUpdateSchema } from "@/lib/validations";

/**
 * Bulk update several santri at once (admin only). Only the fields present in
 * the body are changed, so callers can set just kelas or just status.
 */
export async function PATCH(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = santriBulkUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { ids, kelasId, statusAktif, kategoriUsia, jenisKelamin } = parsed.data;
  const updated = await db
    .update(santri)
    .set({
      ...(kelasId !== undefined ? { kelasId: kelasId ?? null } : {}),
      ...(statusAktif !== undefined ? { statusAktif } : {}),
      ...(kategoriUsia !== undefined ? { kategoriUsia: kategoriUsia ?? null } : {}),
      ...(jenisKelamin !== undefined ? { jenisKelamin: jenisKelamin ?? null } : {}),
    })
    .where(inArray(santri.id, ids))
    .returning({ id: santri.id });

  return NextResponse.json({ updated: updated.length });
}
