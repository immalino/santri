import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/permissions";
import { getAdminRecap } from "@/lib/admin-stats";

/** Admin dashboard recap (task 4.14). */
export async function GET() {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  return NextResponse.json(await getAdminRecap());
}
