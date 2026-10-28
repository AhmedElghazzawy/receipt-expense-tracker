import { describe, expect, it } from "vitest";
import { type RouteContext, cloudBudgetLeft, cloudPolicy } from "./router";

const base: RouteContext = {
  privacyMode: "smart",
  documentType: "receipt",
  inputKind: "image",
  cloudCallsToday: 0,
  cloudDailyCap: 500,
  cloudConfigured: true,
};

describe("cloudPolicy", () => {
  it.each<[string, Partial<RouteContext>, string]>([
    ["smart receipt photo", {}, "fallback"],
    ["smart scanned receipt", { inputKind: "scanned_pdf" }, "fallback"],
    ["smart text-layer PDF", { inputKind: "text_pdf" }, "never"],
    ["cloud_first receipt photo", { privacyMode: "cloud_first" }, "first"],
    ["cloud_first text-layer PDF", { privacyMode: "cloud_first", inputKind: "text_pdf" }, "fallback"],
    ["local_only", { privacyMode: "local_only" }, "never"],
    ["dekont in smart", { documentType: "dekont" }, "never"],
    ["dekont image in cloud_first", { documentType: "dekont", privacyMode: "cloud_first" }, "never"],
    ["no cloud configured", { cloudConfigured: false }, "never"],
    ["at 80% of cap", { cloudCallsToday: 400 }, "never"],
    ["just under 80% of cap", { cloudCallsToday: 399 }, "fallback"],
    ["zero cap", { cloudDailyCap: 0 }, "never"],
  ])("%s -> %s", (_label, overrides, expected) => {
    expect(cloudPolicy({ ...base, ...overrides }).policy).toBe(expected);
  });
});

describe("cloudBudgetLeft", () => {
  it("floors 80% of the cap", () => {
    expect(cloudBudgetLeft(7, 10)).toBe(true);
    expect(cloudBudgetLeft(8, 10)).toBe(false);
    expect(cloudBudgetLeft(0, 1)).toBe(false);
  });
});
