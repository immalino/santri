import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { requireApiRole } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validations";

/**
 * Admin-only user management (task 4.10). Only the admin role can reach these
 * handlers; account creation goes through the better-auth admin plugin
 * (`auth.api.createUser`) because public sign-up is disabled.
 */

/** List ustadz/wali accounts (filter with `?role=ustadz|wali`). */
export async function GET(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const role = new URL(request.url).searchParams.get("role");
  const roles: ("ustadz" | "wali")[] =
    role === "ustadz" || role === "wali" ? [role] : ["ustadz", "wali"];

  const users = await db.query.user.findMany({
    where: (u, { inArray }) => inArray(u.role, roles),
    orderBy: (u, { asc }) => [asc(u.name)],
    columns: { id: true, name: true, email: true, role: true, banned: true },
  });
  return NextResponse.json(users);
}

/** Create a ustadz or wali account. */
export async function POST(request: Request) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;

  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parsed.data;
  try {
    await auth.api.createUser({
      // `role` goes through `data` so the custom RBAC role (ustadz/wali) is not
      // constrained by createUser's built-in `"user" | "admin"` typing.
      body: { email, password, name, data: { role } },
      headers: await headers(),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat akun. Email mungkin sudah terdaftar." },
      { status: 409 },
    );
  }
}
