import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit only auto-loads `.env`, but this project keeps its secrets in
// `.env.local` (Next.js convention). Load it explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
