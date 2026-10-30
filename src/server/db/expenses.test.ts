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
  merchantTotals,
  monthlyTotals,
  monthTotals,
  totalBetween,
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

  it("records where an expense came from, defaulting to manual", () => {
    const fileHash = "a".repeat(64);
    const scanned = createExpense(db, expense(), { source: "receipt", fileHash });
    expect(getExpense(db, scanned)).toMatchObject({ source: "receipt" });
    expect(getExpense(db, createExpense(db, expense()))).toMatchObject({ source: "manual" });
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

  it("searches Turkish text without caring about case or accents", () => {
    createExpense(db, expense({ merchant: "Kahve Dünyası" }));
    createExpense(db, expense({ merchant: "İGDAŞ", note: "Ekim faturası" }));
    const merchants = (search: string) => listExpenses(db, { month: "2026-10", search }).map((e) => e.merchant);
    expect(merchants("kahve dunyasi")).toEqual(["Kahve Dünyası"]);
    expect(merchants("DÜNYASI")).toEqual(["Kahve Dünyası"]);
    expect(merchants("igdas")).toEqual(["İGDAŞ"]);
    expect(merchants("ıgdaş")).toEqual(["İGDAŞ"]);
    expect(merchants("FATURASI")).toEqual(["İGDAŞ"]);
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
      { categoryId: groceries, name: "Groceries", color: "cat-1", totalMinor: 3050, count: 2 },
      { categoryId: dining, name: "Dining", color: "cat-2", totalMinor: 500, count: 1 },
      { categoryId: null, name: null, color: null, totalMinor: 300, count: 1 },
    ]);
  });

  it("sums a half-open date range for one currency", () => {
    expect(totalBetween(db, "2026-10-01", "2026-11-01", "TRY")).toBe(3850);
    expect(totalBetween(db, "2026-10-15", "2026-10-15", "TRY")).toBe(0);
    expect(totalBetween(db, "2026-11-01", "2026-11-02", "TRY")).toBe(7777);
    expect(totalBetween(db, "2020-01-01", "2020-02-01", "TRY")).toBe(0);
  });

  it("sums per month for one currency over a month range", () => {
    createExpense(db, expense({ amountMinor: 100, date: "2026-08-31" }));
    expect(monthlyTotals(db, "2026-08", "2026-11", "TRY")).toEqual([
      { month: "2026-08", totalMinor: 100 },
      { month: "2026-10", totalMinor: 3850 },
      { month: "2026-11", totalMinor: 7777 },
    ]);
    expect(monthlyTotals(db, "2026-09", "2026-10", "EUR")).toEqual([{ month: "2026-10", totalMinor: 999 }]);
  });

  it("sums per merchant spelling, skipping expenses without one", () => {
    createExpense(db, expense({ amountMinor: 400, merchant: "Migros" }));
    createExpense(db, expense({ amountMinor: 600, merchant: "MIGROS" }));
    createExpense(db, expense({ amountMinor: 250, merchant: "Migros" }));
    const rows = merchantTotals(db, "2026-10", "TRY").sort((a, b) => a.totalMinor - b.totalMinor);
    expect(rows).toEqual([
      { merchant: "MIGROS", totalMinor: 600, count: 1 },
      { merchant: "Migros", totalMinor: 650, count: 2 },
    ]);
  });

  it("returns empty arrays for an empty month", () => {
    expect(monthTotals(db, "2020-01")).toEqual([]);
    expect(categoryTotals(db, "2020-01", "TRY")).toEqual([]);
  });
});
