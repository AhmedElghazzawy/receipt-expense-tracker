import { describe, expect, it } from "vitest";
import { formatMoney, minorToDecimalString, parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1234,56", 123456],
    ["1234.56", 123456],
    ["12,5", 1250],
    ["12.5", 1250],
    ["1.234", 123400],
    ["1,234", 123400],
    ["1.234.567", 123456700],
    ["1.234.567,89", 123456789],
    ["0,99", 99],
    [",50", 50],
    ["0", 0],
    ["42", 4200],
    ["₺1.234,56", 123456],
    ["1.234,56 TL", 123456],
    ["TRY 45,00", 4500],
    ["$ 1,234.56", 123456],
    ["€12", 1200],
  ])("%s -> %i", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["abc", "letters"],
    ["-5", "negative"],
    ["1,2345", "fraction too long / bad group"],
    ["12.34.56", "bad grouping"],
    ["1.23,4,5", "mixed garbage"],
    ["12,34.5,6", "two decimals"],
    ["99999999999999", "over max"],
  ])("rejects %s (%s)", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("minorToDecimalString", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [99, "0.99"],
    [100, "1.00"],
    [123456, "1234.56"],
    [-250, "-2.50"],
  ])("%i -> %s", (minor, expected) => {
    expect(minorToDecimalString(minor)).toBe(expected);
  });
});

describe("formatMoney", () => {
  it("formats Turkish lira in tr-TR", () => {
    expect(formatMoney(123456, "TRY")).toBe("₺1.234,56");
  });

  it("formats other currencies and locales exactly", () => {
    expect(formatMoney(123456, "USD", "en-US")).toBe("$1,234.56");
    expect(formatMoney(1, "EUR", "en-US")).toBe("€0.01");
  });
});
