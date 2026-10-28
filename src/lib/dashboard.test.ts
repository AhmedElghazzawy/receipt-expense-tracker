import { describe, expect, it } from "vitest";
import { comparisonWindows, foldCategories, percentChange, roundedShares } from "./dashboard";

describe("comparisonWindows", () => {
  it("compares month-to-date with the same days last month", () => {
    expect(comparisonWindows("2026-10-29")).toEqual({
      current: { start: "2026-10-01", end: "2026-10-30" },
      previous: { start: "2026-09-01", end: "2026-09-30" },
    });
  });

  it("clamps to the end of a shorter previous month", () => {
    expect(comparisonWindows("2026-03-31").previous).toEqual({ start: "2026-02-01", end: "2026-03-01" });
    expect(comparisonWindows("2026-01-15").previous).toEqual({ start: "2025-12-01", end: "2025-12-16" });
  });
});

describe("percentChange", () => {
  it.each([
    [1200, 1000, { direction: "up", percent: 20 }],
    [800, 1000, { direction: "down", percent: 20 }],
    [1001, 1000, { direction: "same", percent: 0 }],
    [0, 1000, { direction: "down", percent: 100 }],
  ])("%i vs %i", (current, previous, expected) => {
    expect(percentChange(current, previous)).toEqual(expected);
  });

  it("returns null without a baseline", () => {
    expect(percentChange(500, 0)).toBeNull();
  });
});

describe("roundedShares", () => {
  it("always sums to 100", () => {
    expect(roundedShares([1, 1, 1])).toEqual([34, 33, 33]);
    expect(roundedShares([3, 3, 3, 1]).reduce((a, b) => a + b)).toBe(100);
  });

  it("handles empty totals", () => {
    expect(roundedShares([0, 0])).toEqual([0, 0]);
  });
});

describe("foldCategories", () => {
  const cat = (id: number, total: number, color = `cat-${id}`) => ({
    categoryId: id,
    name: `C${id}`,
    color,
    totalMinor: total,
  });

  it("keeps the top coloured categories and folds the rest into Other", () => {
    const segments = foldCategories([cat(1, 100), cat(2, 600), cat(3, 50), cat(4, 400), cat(5, 300), cat(6, 200), cat(7, 10)]);
    expect(segments.map((s) => s.name)).toEqual(["C2", "C4", "C5", "C6", "C1", "Other"]);
    expect(segments.at(-1)).toMatchObject({ color: "cat-other", totalMinor: 60 });
    expect(segments.reduce((a, s) => a + s.percent, 0)).toBe(100);
  });

  it("puts uncategorised spend and the Other category in the Other bucket", () => {
    const segments = foldCategories([
      cat(1, 100),
      { categoryId: null, name: null, color: null, totalMinor: 30 },
      cat(9, 20, "cat-other"),
    ]);
    expect(segments).toEqual([
      expect.objectContaining({ name: "C1", totalMinor: 100, percent: 67 }),
      expect.objectContaining({ name: "Other", totalMinor: 50, percent: 33 }),
    ]);
  });

  it("keeps entity colours regardless of rank", () => {
    const segments = foldCategories([cat(3, 10), cat(1, 99)]);
    expect(segments.map((s) => s.color)).toEqual(["cat-1", "cat-3"]);
  });

  it("returns nothing for an empty month", () => {
    expect(foldCategories([])).toEqual([]);
  });
});
