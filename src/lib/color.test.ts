import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color";

describe("contrastRatio", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#2a78d6", "#000000")).toBe(contrastRatio("#000000", "#2a78d6"));
  });
});
