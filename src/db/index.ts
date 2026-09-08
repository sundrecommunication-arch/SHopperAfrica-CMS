import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres database."
  );
}

// A single shared connection pool for the app. In dev, Next.js hot-reloads
// modules, so we stash the client on `globalThis` to avoid exhausting
// connections on every reload.
const globalForDb = globalThis as unknown as {
  _shopperPgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb._shopperPgClient ??
  postgres(connectionString, { max: process.env.NODE_ENV === "production" ? 10 : 1 });

if (process.env.NODE_ENV !== "production") {
  globalForDb._shopperPgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
