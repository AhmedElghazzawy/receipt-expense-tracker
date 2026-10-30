import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { foldText } from "@/lib/normalize";
import { getEnv } from "@/server/env";
import * as schema from "./schema";
import { seedDefaults } from "./seed";

export const migrationsFolder = "src/server/db/migrations";

export function createDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // SQLite's lower()/LIKE only fold ASCII; fold() lets search ignore Turkish case and accents.
  sqlite.function("fold", { deterministic: true }, (v: unknown) => (typeof v === "string" ? foldText(v) : v));
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

export function migrateDb(db: Db) {
  migrate(db, { migrationsFolder });
}

let instance: Db | undefined;

/** App database, migrated and seeded on first use so a fresh clone just works. */
export function getDb(): Db {
  if (!instance) {
    instance = createDb(getEnv().DATABASE_PATH);
    migrateDb(instance);
    seedDefaults(instance);
  }
  return instance;
}
