import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Global query client so serverless environments reuse connections.
const queryClient = postgres(process.env.DATABASE_URL!);

// Pass the schema so relational queries and the better-auth Drizzle adapter
// have access to the full table definitions.
export const db = drizzle({ client: queryClient, schema });

export { schema };
