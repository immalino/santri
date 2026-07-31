import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 proxy (renamed from middleware.ts in Next 15).
 *
 * OPTIMISTIC CHECK ONLY — this is NOT authorization. The session cookie only
 * proves a session token exists; the user's role is always re-checked in each
 * page/API handler via src/lib/permissions.ts (CLAUDE.md).
 */
const PROTECTED_PREFIXES = ["/admin", "/ustadz", "/wali"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Not signed in → send to the login page (no role known from the cookie).
  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/ustadz/:path*", "/wali/:path*"],
};
