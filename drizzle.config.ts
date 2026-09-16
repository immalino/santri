import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit only auto-loads `.env`, but this project keeps its secrets in
// `.env.local` (local dev) and `.env.prod` (production). Pick the file with
// `DRIZZLE_ENV_FILE`, e.g. `DRIZZLE_ENV_FILE=.env.prod npm run db:push`.
config({ path: process.env.DRIZZLE_ENV_FILE ?? ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // This project only uses the `public` schema; scoping introspection here
  // avoids pulling unrelated schemas (pg_catalog, Supabase internals).
  schemaFilter: ["public"],
  dbCredentials: {
    // Migrations need a direct/session connection. Hosted poolers in
    // transaction mode (e.g. Supabase port 6543) break drizzle-kit
    // introspection, so prefer MIGRATE_DATABASE_URL when present.
    url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
});
