import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/permissions";
import { getSantriProgressData, getWaliSantris } from "@/lib/santri-progress";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Santri progress (task 6.1). Read-only: returns the santri plus every kitab
 * (including nonaktif) with its per-kitab average and per-page breakdown.
 *
 * Access control (CLAUDE.md): a wali may only read a santri linked to their
 * own account via `wali_santri`; ustadz/admin may read any santri.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireApiRole(["wali", "ustadz", "admin"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const role = session.user.role as "wali" | "ustadz" | "admin";

  // Wali must own the requested santri; otherwise 403.
  if (role === "wali") {
    const linked = await getWaliSantris(session.user.id);
    if (!linked.some((s) => s.id === id)) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
  }

  const data = await getSantriProgressData(id);
  if (!data) {
    return NextResponse.json({ error: "Santri tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(data);
}