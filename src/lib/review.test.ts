import { describe, expect, it } from "vitest";
import type { ExtractionResult } from "@/server/extraction/result";
import { reviewInitial, sourceLabel } from "./review";

const categories = [
  { id: 1, name: "Groceries" },
  { id: 2, name: "Dining" },
];

const result = (fields: Partial<ExtractionResult["fields"]> = {}): ExtractionResult => ({
  fields: {
    amountMinor: { value: 123456, confidence: 0.95 },
    currency: { value: "TRY", confidence: 0.9 },
    date: { value: "2026-10-28", confidence: 0.9 },
    merchant: { value: "Migros", confidence: 0.9 },
    category: { value: "Groceries", confidence: 0.8 },
    ...fields,
  },
  source: { provider: "rules", tier: 0 },
  document: { type: "receipt", input: "image" },
});

describe("reviewInitial", () => {
  it("prefills the form with a Turkish-style amount and the category id", () => {
    const { initial, uncertain } = reviewInitial(result(), categories, "2026-10-30");
    expect(initial).toEqual({
      amount: "1.234,56",
      currency: "TRY",
      date: "2026-10-28",
      merchant: "Migros",
      categoryId: "1",
      note: "",
    });
    expect(uncertain.size).toBe(0);
  });

  it("groups thousands so the form reads like a Turkish amount", () => {
    const big = reviewInitial(result({ amountMinor: { value: 250000000, confidence: 1 } }), categories, "2026-10-30");
    expect(big.initial.amount).toBe("2.500.000,00");
  });

  it("flags missing and low-confidence fields, with safe fallbacks", () => {
    const { initial, uncertain } = reviewInitial(
      result({
        amountMinor: { value: 29740, confidence: 0.4 },
        currency: { value: "CHF", confidence: 0.9 },
        date: { value: null, confidence: 0 },
        merchant: { value: null, confidence: 0 },
        category: { value: "Pets", confidence: 0.9 },
      }),
      categories,
      "2026-10-30",
    );
    expect(initial).toMatchObject({ amount: "297,40", currency: "TRY", date: "2026-10-30", merchant: "", categoryId: "" });
    expect([...uncertain].sort()).toEqual(["amount", "categoryId", "currency", "date", "merchant"]);
  });
});

describe("sourceLabel", () => {
  it("says whether the document left the device", () => {
    expect(sourceLabel({ provider: "rules", tier: 0 })).toEqual({ text: "Read on this device", cloud: false });
    expect(sourceLabel({ provider: "ollama:qwen3:4b", tier: 1 }).cloud).toBe(false);
    expect(sourceLabel({ provider: "gemini:x", tier: 2 }).cloud).toBe(true);
  });
});
