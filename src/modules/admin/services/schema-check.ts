import "server-only";
import { sql } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import * as schema from "@/db/schema";

// Compares the live database with the app's schema (src/db/schema): lists
// tables and columns the code expects but the database doesn't have -- i.e.
// `npm run db:push` hasn't been run (or was cancelled) since a schema change.
// Pages that touch those columns fail, so the admin shows this up front.

let cache: { at: number; missing: string[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function findMissingSchema(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.missing;
  try {
    const rows = await db.execute<{ table_name: string; column_name: string }>(
      sql`select table_name, column_name from information_schema.columns where table_schema = current_schema()`
    );
    const have = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!have.has(r.table_name)) have.set(r.table_name, new Set());
      have.get(r.table_name)!.add(r.column_name);
    }
    const missing: string[] = [];
    for (const value of Object.values(schema)) {
      if (!(value instanceof PgTable)) continue;
      const { name, columns } = getTableConfig(value);
      const cols = have.get(name);
      if (!cols) {
        missing.push(`table ${name}`);
        continue;
      }
      for (const c of columns) if (!cols.has(c.name)) missing.push(`${name}.${c.name}`);
    }
    cache = { at: Date.now(), missing };
    return missing;
  } catch (error) {
    console.error("schema check failed", error);
    return [];
  }
}

