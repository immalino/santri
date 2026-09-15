-- Runs once on first container init (POSTGRES_DB database).
-- The Drizzle schema uses uuid("id").defaultRandom(), which compiles to
-- gen_random_uuid(). That function lives in the pgcrypto extension, which
-- vanilla postgres does not enable by default (Supabase does).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
