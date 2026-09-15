import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/permissions";
import { getSantriAbsensi } from "@/lib/absensi-stats";
import { getWaliSantris } from "@/lib/santri-progress";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Santri attendance history (Fase 10). Read-only: every kegiatan the santri
 * participates in, with per-sesi status. A wali may only read children linked
 * to their own account via `wali_santri`.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireApiRole(["wali", "ustadz", "admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const role = session.user.role as "wali" | "ustadz" | "admin";

  if (role === "wali") {
    const linked = await getWaliSantris(session.user.id);
    if (!linked.some((s) => s.id === id)) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
  }

  return NextResponse.json(await getSantriAbsensi(id));
}
