import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, createDb, migrateDb } from "./client";
import { categories, expenses } from "./schema";
import { defaultCategories, seedDefaults } from "./seed";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
});

describe("schema", () => {
  it("seeds default categories idempotently", () => {
    seedDefaults(db);
    seedDefaults(db);
    const rows = db.select().from(categories).all();
    expect(rows).toHaveLength(defaultCategories.length);
    expect(rows.every((r) => r.isDefault)).toBe(true);
    expect(rows.every((r) => r.color.startsWith("cat-"))).toBe(true);
  });

  it("upgrades legacy default colours without touching user categories", () => {
    db.insert(categories).values({ name: "Groceries", color: "#117733", isDefault: true }).run();
    db.insert(categories).values({ name: "Pets", color: "cat-5" }).run();
    seedDefaults(db);
    const byName = new Map(db.select().from(categories).all().map((r) => [r.name, r]));
    expect(byName.get("Groceries")?.color).toBe("cat-1");
    expect(byName.get("Pets")).toMatchObject({ color: "cat-5", isDefault: false });
  });

  it("stores an expense in integer minor units with defaults", () => {
    seedDefaults(db);
    const groceries = db.select().from(categories).where(eq(categories.name, "Groceries")).get();
    const row = db
      .insert(expenses)
      .values({ amountMinor: 123456, date: "2026-10-28", merchant: "Migros", categoryId: groceries?.id })
      .returning()
      .get();
    expect(row).toMatchObject({ amountMinor: 123456, currency: "TRY", source: "manual" });
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("rejects non-positive amounts at the database level", () => {
    expect(() => db.insert(expenses).values({ amountMinor: 0, date: "2026-10-28" }).run()).toThrow(
      /CHECK constraint/,
    );
  });

  it("keeps expenses when their category is deleted", () => {
    const cat = db.insert(categories).values({ name: "Temp", color: "#000000" }).returning().get();
    db.insert(expenses).values({ amountMinor: 500, date: "2026-10-28", categoryId: cat.id }).run();
    db.delete(categories).where(eq(categories.id, cat.id)).run();
    expect(db.select().from(expenses).get()?.categoryId).toBeNull();
  });
});
