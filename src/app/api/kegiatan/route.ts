import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { kegiatan, kegiatanPeserta, kegiatanSesi, santri } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kegiatanCreateSchema } from "@/lib/validations";
import { getKegiatanList } from "@/lib/absensi-stats";
import { getWaliSantris } from "@/lib/santri-progress";

/**
 * Kegiatan API (Fase 10). Admin & ustadz manage everything; wali gets a
 * filtered read-only list (only kegiatan containing their children).
 */

/** List kegiatan with participant/session counts. */
export async function GET() {
  const session = await requireApiRole(["admin", "ustadz", "wali"]);
  if (session instanceof Response) return session;

  if (session.user.role === "wali") {
    const linked = await getWaliSantris(session.user.id);
    return NextResponse.json(
      await getKegiatanList({ santriIds: linked.map((s) => s.id) }),
    );
  }
  return NextResponse.json(await getKegiatanList());
}

/**
 * Create a kegiatan with its peserta set and the first sesi (from
 * tanggalPertama) in one transaction. A one-time event simply never gets a
 * second sesi; a recurring one adds more via POST .../sesi.
 */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const parsed = kegiatanCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { namaKegiatan, deskripsi, status, tanggalPertama, pesertaIds } = parsed.data;

  const created = await db.transaction(async (tx) => {
    const [k] = await tx
      .insert(kegiatan)
      .values({
        namaKegiatan,
        deskripsi: deskripsi || null,
        status: status ?? "aktif",
        dibuatOleh: session.user.id,
      })
      .returning();

    // Only link santri that actually exist (don't trust the client list).
    if (pesertaIds.length > 0) {
      const valid = await tx
        .select({ id: santri.id })
        .from(santri)
        .where(inArray(santri.id, pesertaIds));
      if (valid.length > 0) {
        await tx.insert(kegiatanPeserta).values(
          valid.map((s) => ({ kegiatanId: k.id, santriId: s.id })),
        );
      }
    }

    const [sesi] = await tx
      .insert(kegiatanSesi)
      .values({ kegiatanId: k.id, tanggal: tanggalPertama })
      .returning();

    return { ...k, sesiPertamaId: sesi.id };
  });

  return NextResponse.json(created, { status: 201 });
}
