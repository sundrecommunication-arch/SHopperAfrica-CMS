// Turns on Row-Level Security for every table in the public schema.
//
// Why: Supabase auto-exposes public tables through its REST API (PostgREST)
// to anyone holding the project's anon key. Shopper never uses that API -- it
// connects directly as the `postgres` role, which owns these tables and has
// BYPASSRLS -- so RLS with *no policies* blocks the public API completely
// while leaving the app untouched. Every table is also marked .enableRLS() in
// src/db/schema so `db:push` keeps it on. Safe to re-run.
//
//   npm run db:secure
import { sql } from "drizzle-orm";
import { db } from "../index";

async function main() {
  const tables = (await db.execute(
    sql`select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1`
  )) as unknown as { tablename: string }[];

  for (const { tablename } of tables) {
    await db.execute(sql.raw(`alter table public."${tablename.replace(/"/g, '""')}" enable row level security`));
    console.log(`RLS on: ${tablename}`);
  }
  console.log(tables.length ? `\nDone: ${tables.length} table(s) secured.` : "All public tables already have RLS on.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
