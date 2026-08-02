import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

/**
 * Server-side better-auth instance.
 *
 * - Drizzle adapter backed by the shared Postgres connection (src/db).
 * - Email + password login only. Public sign-up is disabled: accounts are
 *   created by admins (Phase 4) or via the seed script.
 * - `role` is an additional field on `user` used for RBAC
 *   (admin | ustadz | wali), see SCHEMA.md §1.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // No public registration: /api/auth/sign-up returns 400.
    // Accounts are created by admins (Phase 4) via the admin plugin
    // (`auth.api.createUser`), never through the public sign-up route.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "wali",
        // Users must never be able to set their own role via public endpoints.
        input: false,
      },
    },
  },
  plugins: [
    // Admin-only management (create user, ban/unban, set role). `adminRoles`
    // makes role="admin" the privileged role; `defaultRole` matches our own
    // default. The ban column names are mapped to the snake_case schema.
    admin({
      adminRoles: ["admin"],
      defaultRole: "wali",
      schema: {
        user: {
          fields: {
            banReason: "ban_reason",
            banExpires: "ban_expires_at",
          },
        },
      },
    }),
    // nextCookies must stay the last plugin: it routes Set-Cookie through
    // Next.js `cookies()` so Server Actions / route handlers persist sessions.
    nextCookies(),
  ],
});
