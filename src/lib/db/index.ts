import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// `prepare: false` — required when DATABASE_URL points at Supabase's transaction pooler (PgBouncer).
// `max: 1` — each serverless function instance keeps at most one connection alive.
const client = postgres(connectionString, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
