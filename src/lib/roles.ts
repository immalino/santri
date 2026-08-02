/**
 * Role definitions shared by server and client code.
 *
 * Kept in its own module (no auth/db imports) so client components can
 * import it without pulling the server Postgres client into the bundle.
 */

/** User roles used across the app (must match the SCHEMA.md role enum). */
export type Role = "admin" | "ustadz" | "wali";

/** Landing page per role after login (IMPLEMENTATION.md task 2.7). */
export const roleHome: Record<Role, string> = {
  admin: "/admin/dashboard",
  ustadz: "/ustadz/input",
  wali: "/wali/santri",
};

/** Human-readable label per role (UI text is Bahasa Indonesia). */
export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  ustadz: "Ustadz",
  wali: "Wali Santri",
};
