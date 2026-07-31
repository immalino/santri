import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { roleHome, type Role } from "./roles";

// Re-export role helpers so server code can import them from one place.
export { roleHome, roleLabel } from "./roles";
export type { Role } from "./roles";

/** Returns the current session + user, or null when unauthenticated. */
export async function getCurrentUser() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Guard for Server Components. Redirects to /login when unauthenticated and
 * to the user's own home page when their role is not allowed.
 * Returns the session on success.
 */
export async function requireRole(roles: Role[]) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const role = session.user.role as Role;
  if (!roles.includes(role)) redirect(roleHome[role]);
  return session;
}

/**
 * Guard for API route handlers. Returns the session on success, or a
 * 401/403 Response the caller must return:
 *
 *   const session = await requireApiRole(["admin"]);
 *   if (session instanceof Response) return session;
 */
export async function requireApiRole(roles: Role[]) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!roles.includes(role)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  return session;
}
