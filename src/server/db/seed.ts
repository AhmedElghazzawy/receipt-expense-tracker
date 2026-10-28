import type { Db } from "./client";
import { categories } from "./schema";

// Paul Tol "muted" palette: colour-blind-safe, tune visually in Phase 1.
export const defaultCategories = [
  { name: "Groceries", color: "#117733" },
  { name: "Dining", color: "#CC6677" },
  { name: "Transport", color: "#332288" },
  { name: "Bills & Utilities", color: "#DDCC77" },
  { name: "Housing", color: "#882255" },
  { name: "Shopping", color: "#AA4499" },
  { name: "Health", color: "#44AA99" },
  { name: "Entertainment", color: "#88CCEE" },
  { name: "Travel", color: "#999933" },
  { name: "Other", color: "#DDDDDD" },
] as const;

/** Inserts missing default categories; safe to run repeatedly. */
export function seedDefaults(db: Db) {
  db.insert(categories)
    .values(defaultCategories.map((c) => ({ ...c, isDefault: true })))
    .onConflictDoNothing({ target: categories.name })
    .run();
}
