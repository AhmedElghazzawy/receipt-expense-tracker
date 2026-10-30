import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

export const migrationsFolder = "src/server/db/migrations";

export function createDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

export function migrateDb(db: Db) {
  migrate(db, { migrationsFolder });
}

let instance: Db | undefined;

export function getDb(): Db {
  instance ??= createDb(getEnv().DATABASE_PATH);
  return instance;
}
