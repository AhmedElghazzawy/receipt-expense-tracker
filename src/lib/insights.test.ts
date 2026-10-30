import { describe, expect, it } from "vitest";
import { dailyAverage, foldMerchants, monthSeries } from "./insights";

describe("monthSeries", () => {
  it("fills empty months with 0 and crosses year boundaries", () => {
    expect(monthSeries([{ month: "2026-01", totalMinor: 500 }], "2026-02", 4)).toEqual([
      { month: "2025-11", totalMinor: 0 },
      { month: "2025-12", totalMinor: 0 },
      { month: "2026-01", totalMinor: 500 },
      { month: "2026-02", totalMinor: 0 },
    ]);
  });
});

describe("foldMerchants", () => {
  it("merges spellings of the same merchant and ranks by spend", () => {
    const ranked = foldMerchants([
      { merchant: "Migros", totalMinor: 400, count: 2 },
      { merchant: "MİGROS TİC. A.Ş.", totalMinor: 900, count: 1 },
      { merchant: "A101", totalMinor: 1000, count: 3 },
      { merchant: "  ", totalMinor: 50, count: 1 },
    ]);
    expect(ranked).toEqual([
      { key: "migros", name: "MİGROS TİC. A.Ş.", totalMinor: 1300, count: 3 },
      { key: "a101", name: "A101", totalMinor: 1000, count: 3 },
    ]);
  });

  it("keeps the top few", () => {
    const rows = ["A", "B", "C", "D"].map((m, i) => ({ merchant: `Shop ${m}`, totalMinor: i + 1, count: 1 }));
    expect(foldMerchants(rows, 2).map((r) => r.name)).toEqual(["Shop D", "Shop C"]);
  });
});

describe("dailyAverage", () => {
  it("divides by the days so far this month, or the whole month before", () => {
    expect(dailyAverage(30000, "2026-10", "2026-10-10")).toBe(3000);
    expect(dailyAverage(28000, "2026-02", "2026-10-10")).toBe(1000);
    expect(dailyAverage(100, "2026-10", "2026-10-03")).toBe(33);
  });
});
