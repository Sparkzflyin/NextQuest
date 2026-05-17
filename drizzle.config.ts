import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Match Next.js precedence: .env.local overrides .env. `next dev` reads these automatically;
// drizzle-kit is a standalone CLI, so we load them ourselves.
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("Set DIRECT_URL (preferred) or DATABASE_URL in .env.local before running drizzle-kit.");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  schemaFilter: ["public"],
} satisfies Config;
