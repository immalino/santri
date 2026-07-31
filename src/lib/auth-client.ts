import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

/**
 * Client-side better-auth instance for use in client components
 * (login form, logout button).
 *
 * NOTE — Deviation from IMPLEMENTATION.md task 2.4: `nextCookies()` is a
 * server-side plugin (for Server Actions) and is configured in auth.ts.
 * The client only needs `inferAdditionalFields` so `user.role` is typed.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
