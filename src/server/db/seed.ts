import { sql } from "drizzle-orm";
import type { Db } from "./client";
import { categories } from "./schema";

// Slots follow the validated palette order; the most common categories get the leading slots.
// Eight coloured categories plus a neutral "Other" (no generated 9th hue).
export const defaultCategories = [
  { name: "Groceries", color: "cat-1" },
  { name: "Dining", color: "cat-2" },
  { name: "Transport", color: "cat-3" },
  { name: "Bills & Utilities", color: "cat-4" },
  { name: "Shopping", color: "cat-5" },
  { name: "Health", color: "cat-6" },
  { name: "Entertainment", color: "cat-7" },
  { name: "Travel", color: "cat-8" },
  { name: "Other", color: "cat-other" },
] as const;

/** Inserts missing default categories and refreshes their colours; safe to run repeatedly. */
export function seedDefaults(db: Db) {
  db.insert(categories)
    .values(defaultCategories.map((c) => ({ ...c, isDefault: true })))
    .onConflictDoUpdate({ target: categories.name, set: { color: sql`excluded.color`, isDefault: true } })
    .run();
}
