import { describe, expect, it } from "vitest";
import { addDays, todayIso } from "./dates";
import { expenseFormSchema } from "./expense-input";

const form = {
  amount: "1.234,56",
  currency: "TRY",
  date: "2026-10-01",
  merchant: "  Migros  ",
  categoryId: "3",
  note: "",
};

describe("expenseFormSchema", () => {
  it("turns form strings into a stored expense", () => {
    expect(expenseFormSchema.parse(form)).toEqual({
      amountMinor: 123456,
      currency: "TRY",
      date: "2026-10-01",
      merchant: "Migros",
      categoryId: 3,
      note: null,
    });
  });

  it("allows no category and no merchant", () => {
    const parsed = expenseFormSchema.parse({ ...form, categoryId: "", merchant: " " });
    expect(parsed.categoryId).toBeNull();
    expect(parsed.merchant).toBeNull();
  });

  it.each([
    ["amount", { amount: "abc" }],
    ["amount", { amount: "0" }],
    ["currency", { currency: "XYZ" }],
    ["date", { date: "28.10.2026" }],
    ["date", { date: addDays(todayIso(), 1) }],
    ["categoryId", { categoryId: "-1" }],
  ])("rejects bad %s", (path, overrides) => {
    const result = expenseFormSchema.safeParse({ ...form, ...overrides });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([path]);
  });
});
