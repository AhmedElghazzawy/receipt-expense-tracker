import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
});

export const expenseSources = ["manual", "receipt", "dekont"] as const;

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // Integer minor units (kuruş, cents). Never floats.
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency", { length: 3 }).notNull().default("TRY"),
    // Calendar date as ISO yyyy-mm-dd; no time zone ambiguity.
    date: text("date").notNull(),
    merchant: text("merchant"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    note: text("note"),
    source: text("source", { enum: expenseSources }).notNull().default("manual"),
    fileHash: text("file_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amountMinor} > 0`),
    index("expenses_date_idx").on(t.date),
    index("expenses_category_idx").on(t.categoryId),
  ],
);

// Learned merchant -> category mapping from user corrections.
export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  normalizedName: text("normalized_name").notNull().unique(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  hits: integer("hits").notNull().default(0),
});

// Extraction cache keyed by file hash, plus eval/audit trail.
export const extractions = sqliteTable("extractions", {
  fileHash: text("file_hash").primaryKey(),
  resultJson: text("result_json", { mode: "json" }).notNull(),
  provider: text("provider").notNull(),
  tier: integer("tier").notNull(),
  createdAt: createdAt(),
});

// Daily cloud call counter for CLOUD_DAILY_CAP (docs/MODEL_ROUTING.md).
export const cloudUsage = sqliteTable("cloud_usage", {
  day: text("day").primaryKey(),
  calls: integer("calls").notNull().default(0),
});
