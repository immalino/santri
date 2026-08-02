import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit only auto-loads `.env`, but this project keeps its secrets in
// `.env.local` (Next.js convention). Load it explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // This project only uses the `public` schema; scoping introspection here
  // avoids pulling unrelated schemas (pg_catalog, Supabase internals).
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
