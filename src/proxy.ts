import { NextResponse } from "next/server";

// Next.js 16: this file replaces the old middleware.ts.
// Route protection based on the session cookie (optimistic check only)
// will be implemented in Phase 2. For now it is a no-op pass-through.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  // Empty matcher: proxy does not run until routes are wired up in Phase 2.
  matcher: [],
};
