import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("No DIRECT_URL or DATABASE_URL set.");
  process.exit(1);
}

function describe(name: string, raw: string | undefined) {
  if (!raw) {
    console.log(`  ${name}: (not set)`);
    return;
  }
  const m = raw.match(/^(postgresql?:\/\/[^:]+):([^@]+)@(.+)$/);
  if (!m) {
    console.log(`  ${name}: (could not parse)`);
    return;
  }
  const [, userPart, pwd, hostPart] = m;
  const pwdFingerprint =
    pwd.length <= 4
      ? `${pwd.length} chars (too short to fingerprint)`
      : `${pwd.length} chars · starts "${pwd.slice(0, 2)}" · ends "${pwd.slice(-2)}"`;
  const whitespace = /\s/.test(raw) ? "  ⚠ WHITESPACE in value" : "";
  console.log(`  ${name}:`);
  console.log(`    user/host: ${userPart}:***@${hostPart}`);
  console.log(`    password : ${pwdFingerprint}${whitespace}`);
}

console.log("Env URLs:");
describe("DATABASE_URL", process.env.DATABASE_URL);
describe("DIRECT_URL  ", process.env.DIRECT_URL);
console.log("\nConnecting via:", url.replace(/:[^:@]+@/, ":***@"));

async function main() {
  const sql = postgres(url!, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log("\nTables in public schema:");
    if (tables.length === 0) {
      console.log("  (none)");
    } else {
      for (const t of tables) console.log("  ·", t.tablename);
    }

    const cols = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'profiles' AND column_name = 'is_admin')
          OR (table_name = 'reviews'  AND column_name IN ('status','moderated_at','moderated_by')))
      ORDER BY table_name, column_name
    `;
    console.log("\nModeration columns present:");
    if (cols.length === 0) {
      console.log("  (none) — migration 0001 has NOT been applied");
    } else {
      for (const c of cols) console.log("  ·", c.table_name + "." + c.column_name);
    }
  } catch (err) {
    console.error("\nConnection or query error:");
    console.error(err);
    process.exitCode = 2;
  } finally {
    await sql.end();
  }
}

main();
