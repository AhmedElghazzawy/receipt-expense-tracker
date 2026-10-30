import { describe, expect, it } from "vitest";
import { buildPrompt, outputJsonSchema, parseModelOutput } from "./prompt";
import { ProviderError } from "./types";

const categories = ["Groceries", "Dining"];
const f = (value: string | null, confidence = 0.9) => ({ value, confidence });

describe("parseModelOutput", () => {
  it("converts a decimal amount string to minor units without floats", () => {
    expect(parseModelOutput({ amount: f("297.40") }, categories)).toEqual({ amountMinor: { value: 29740, confidence: 0.9 } });
    expect(parseModelOutput({ amount: f("1.234,56") }, categories).amountMinor?.value).toBe(123456);
  });

  it("keeps good fields and drops bad ones one by one", () => {
    const out = parseModelOutput(
      {
        amount: f("about ten"),
        currency: f("try"),
        date: f("28.10.2026"),
        merchant: f("  Migros  "),
        category: f("Groceries", 0.8),
      },
      categories,
    );
    expect(out).toEqual({
      currency: { value: "TRY", confidence: 0.9 },
      merchant: { value: "Migros", confidence: 0.9 },
      category: { value: "Groceries", confidence: 0.8 },
    });
  });

  it("ignores categories the user does not have", () => {
    expect(parseModelOutput({ category: f("Pets") }, categories)).toEqual({});
  });

  it("rejects output that does not match the schema", () => {
    expect(() => parseModelOutput({ amount: { value: 297.4, confidence: 1 } }, categories)).toThrow(ProviderError);
    expect(() => parseModelOutput("nope", categories)).toThrow(ProviderError);
    expect(() => parseModelOutput({ date: f("2026-10-28", 3) }, categories)).toThrow(ProviderError);
  });
});

describe("buildPrompt and schema", () => {
  it("lists categories in the schema enum with null allowed", () => {
    const schema = outputJsonSchema(categories);
    expect(schema.properties.category.properties.value).toMatchObject({ enum: ["Groceries", "Dining", null] });
    expect(schema.properties.amount.properties.value.type).toEqual(["string", "null"]);
  });

  it("passes rule candidates as hints with the amount as a decimal string", () => {
    const prompt = buildPrompt({
      text: "TOPLAM 297,40",
      categories,
      candidates: { amountMinor: { value: 29740, confidence: 0.9 }, merchant: f("Migros"), date: f(null) },
    });
    expect(prompt).toContain('{"amount":"297.40","merchant":"Migros"}');
    expect(prompt).toContain("Groceries, Dining");
    expect(prompt).toContain("TOPLAM 297,40");
  });
});
