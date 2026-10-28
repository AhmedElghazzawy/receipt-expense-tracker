import { describe, expect, it } from "vitest";
import { defaultCategories } from "@/server/db/seed";
import { contrastRatio, readableTextColor } from "./color";

describe("readableTextColor", () => {
  it.each([
    ["#000000", "#ffffff"],
    ["#ffffff", "#000000"],
    ["#332288", "#ffffff"],
    ["#DDDDDD", "#000000"],
    ["#88CCEE", "#000000"],
  ])("%s -> %s", (bg, expected) => {
    expect(readableTextColor(bg)).toBe(expected);
  });

  it("falls back to white for invalid input", () => {
    expect(readableTextColor("red")).toBe("#ffffff");
  });

  it("gives every default category at least 4.5:1 contrast", () => {
    for (const { color } of defaultCategories) {
      expect(contrastRatio(color, readableTextColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
