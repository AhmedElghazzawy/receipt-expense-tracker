// `pnpm db:migrate`: apply migrations, then seed default categories.
import { getDb, migrateDb } from "./client";
import { seedDefaults } from "./seed";

const db = getDb();
migrateDb(db);
seedDefaults(db);
console.log("Database migrated and seeded.");
