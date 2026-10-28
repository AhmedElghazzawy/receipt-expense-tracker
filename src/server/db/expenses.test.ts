import { beforeEach, describe, expect, it } from "vitest";
import type { ExpenseInput } from "@/lib/expense-input";
import { type Db, createDb, migrateDb } from "./client";
import {
  categoryTotals,
  createExpense,
  deleteExpense,
  getExpense,
  listCategories,
  listExpenses,
  monthTotals,
  updateExpense,
} from "./expenses";
import { seedDefaults } from "./seed";

let db: Db;
let groceries: number;
let dining: number;

const expense = (overrides: Partial<ExpenseInput> = {}): ExpenseInput => ({
  amountMinor: 1000,
  currency: "TRY",
  date: "2026-10-15",
  merchant: null,
  categoryId: null,
  note: null,
  ...overrides,
});

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  const cats = listCategories(db);
  groceries = cats.find((c) => c.name === "Groceries")!.id;
  dining = cats.find((c) => c.name === "Dining")!.id;
});

describe("expense CRUD", () => {
  it("creates, reads with category, updates, and deletes", () => {
    const id = createExpense(db, expense({ merchant: "Migros", categoryId: groceries }));
    expect(getExpense(db, id)).toMatchObject({ merchant: "Migros", categoryName: "Groceries" });

    expect(updateExpense(db, id, expense({ amountMinor: 2500, categoryId: dining }))).toBe(true);
    expect(getExpense(db, id)).toMatchObject({ amountMinor: 2500, categoryName: "Dining", merchant: null });

    expect(deleteExpense(db, id)).toBe(true);
    expect(getExpense(db, id)).toBeUndefined();
  });

  it("reports missing ids instead of throwing", () => {
    expect(updateExpense(db, 999, expense())).toBe(false);
    expect(deleteExpense(db, 999)).toBe(false);
  });
});

describe("listExpenses", () => {
  beforeEach(() => {
    createExpense(db, expense({ date: "2026-09-30", merchant: "Old" }));
    createExpense(db, expense({ date: "2026-10-01", merchant: "Migros", categoryId: groceries }));
    createExpense(db, expense({ date: "2026-10-31", merchant: "Kahve 50%", categoryId: dining }));
    createExpense(db, expense({ date: "2026-11-01", merchant: "Next", note: "migros run" }));
  });

  it("orders newest first", () => {
    expect(listExpenses(db).map((e) => e.date)).toEqual(["2026-11-01", "2026-10-31", "2026-10-01", "2026-09-30"]);
  });

  it("filters by month using inclusive start and exclusive end", () => {
    expect(listExpenses(db, { month: "2026-10" }).map((e) => e.merchant)).toEqual(["Kahve 50%", "Migros"]);
  });

  it("filters by category", () => {
    expect(listExpenses(db, { categoryId: dining }).map((e) => e.merchant)).toEqual(["Kahve 50%"]);
  });

  it("searches merchant and note, case-insensitively", () => {
    expect(listExpenses(db, { search: "MIGROS" }).map((e) => e.merchant)).toEqual(["Next", "Migros"]);
  });

  it("treats % and _ in search literally", () => {
    expect(listExpenses(db, { search: "50%" }).map((e) => e.merchant)).toEqual(["Kahve 50%"]);
    expect(listExpenses(db, { search: "%" })).toHaveLength(1);
  });

  it("applies a limit", () => {
    expect(listExpenses(db, {}, 2)).toHaveLength(2);
  });
});

describe("totals", () => {
  beforeEach(() => {
    createExpense(db, expense({ amountMinor: 1050, categoryId: groceries }));
    createExpense(db, expense({ amountMinor: 2000, categoryId: groceries }));
    createExpense(db, expense({ amountMinor: 500, categoryId: dining }));
    createExpense(db, expense({ amountMinor: 300 }));
    createExpense(db, expense({ amountMinor: 999, currency: "EUR", categoryId: dining }));
    createExpense(db, expense({ amountMinor: 7777, date: "2026-11-01" }));
  });

  it("totals per currency, never mixing currencies", () => {
    expect(monthTotals(db, "2026-10")).toEqual([
      { currency: "TRY", totalMinor: 3850, count: 4 },
      { currency: "EUR", totalMinor: 999, count: 1 },
    ]);
  });

  it("totals per category for one currency, including uncategorised", () => {
    expect(categoryTotals(db, "2026-10", "TRY")).toEqual([
      { categoryId: groceries, name: "Groceries", color: "#117733", totalMinor: 3050, count: 2 },
      { categoryId: dining, name: "Dining", color: "#CC6677", totalMinor: 500, count: 1 },
      { categoryId: null, name: null, color: null, totalMinor: 300, count: 1 },
    ]);
  });

  it("returns empty arrays for an empty month", () => {
    expect(monthTotals(db, "2020-01")).toEqual([]);
    expect(categoryTotals(db, "2020-01", "TRY")).toEqual([]);
  });
});
