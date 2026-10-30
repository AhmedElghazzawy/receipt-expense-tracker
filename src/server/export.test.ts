import { beforeEach, describe, expect, it } from "vitest";
import { type Db, createDb, migrateDb } from "./db/client";
import { createExpense, listCategories } from "./db/expenses";
import { seedDefaults } from "./db/seed";
import { exportExpenses } from "./export";

const NOW = new Date("2026-10-30T12:00:00");
let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  const groceries = listCategories(db).find((c) => c.name === "Groceries")!.id;
  const add = (date: string, merchant: string, categoryId: number | null = null) =>
    createExpense(db, { amountMinor: 1000, currency: "TRY", date, merchant, categoryId, note: null });
  add("2026-10-20", "Migros", groceries);
  add("2026-10-05", "Kahve Dünyası");
  add("2026-09-30", "Old shop");
});

const lines = (body: string) => body.slice(1).trim().split("\r\n").slice(1);

describe("exportExpenses", () => {
  it("exports the current month by default, oldest first", () => {
    const out = exportExpenses(db, new URLSearchParams(), NOW);
    expect(out.filename).toBe("expenses-2026-10.csv");
    expect(lines(out.body)).toEqual([
      "2026-10-05,10.00,TRY,Kahve Dünyası,,,manual",
      "2026-10-20,10.00,TRY,Migros,Groceries,,manual",
    ]);
  });

  it("follows the list filters: month, category, Turkish-aware search", () => {
    expect(exportExpenses(db, new URLSearchParams("month=2026-09"), NOW).count).toBe(1);
    const groceries = listCategories(db).find((c) => c.name === "Groceries")!.id;
    expect(exportExpenses(db, new URLSearchParams(`category=${groceries}`), NOW).count).toBe(1);
    expect(lines(exportExpenses(db, new URLSearchParams("q=dunyasi"), NOW).body)).toHaveLength(1);
  });

  it("exports everything with all=1", () => {
    const out = exportExpenses(db, new URLSearchParams("all=1&month=2026-09"), NOW);
    expect(out.filename).toBe("expenses-all-2026-10-30.csv");
    expect(out.count).toBe(3);
  });
});
