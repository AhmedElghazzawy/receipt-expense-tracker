import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock";
import { ProviderError } from "./types";
import { parseProviderOutput } from "./validate";

const valid = {
  amountMinor: { value: 123456, confidence: 0.95 },
  currency: { value: "TRY", confidence: 0.9 },
  date: { value: "2026-10-28", confidence: 0.8 },
  merchant: { value: "Migros", confidence: 0.85 },
  category: { value: null, confidence: 0 },
};

describe("parseProviderOutput", () => {
  it("accepts well-formed output, including null fields", () => {
    expect(parseProviderOutput(valid)).toEqual(valid);
  });

  it.each([
    ["float amount", { ...valid, amountMinor: { value: 12.5, confidence: 1 } }],
    ["negative amount", { ...valid, amountMinor: { value: -100, confidence: 1 } }],
    ["lowercase currency", { ...valid, currency: { value: "try", confidence: 1 } }],
    ["Turkish date format", { ...valid, date: { value: "28.10.2026", confidence: 1 } }],
    ["confidence above 1", { ...valid, merchant: { value: "Migros", confidence: 1.2 } }],
    ["missing field", { amountMinor: valid.amountMinor }],
    ["not an object", "the total is 1234,56 TL"],
    ["null", null],
  ])("rejects %s as invalid_output", (_label, raw) => {
    expect(() => parseProviderOutput(raw)).toThrow(
      expect.objectContaining({ name: "ProviderError", kind: "invalid_output" }),
    );
  });
});

describe("MockProvider", () => {
  it("replays responses in order, throws queued errors, and records inputs", async () => {
    const limited = new ProviderError("rate_limited", "429");
    const provider = new MockProvider([valid, limited]);
    const input = { text: "TOPLAM 1.234,56", categories: ["Groceries"] };

    await expect(provider.extract(input)).resolves.toEqual(valid);
    await expect(provider.extract(input)).rejects.toBe(limited);
    await expect(provider.extract(input)).rejects.toThrow("no responses left");
    expect(provider.calls).toHaveLength(3);
  });
});
