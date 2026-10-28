import { addDays, monthRange, shiftMonth } from "./dates";

/**
 * Month-to-date window and the same days of the previous month, so mid-month
 * comparisons are fair. Both are half-open [start, end).
 */
export function comparisonWindows(today: string) {
  const month = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const prev = monthRange(shiftMonth(month, -1));
  const prevEnd = addDays(prev.start, day);
  return {
    current: { start: `${month}-01`, end: addDays(today, 1) },
    previous: { start: prev.start, end: prevEnd < prev.end ? prevEnd : prev.end },
  };
}

export type Change = { direction: "up" | "down" | "same"; percent: number };

/** Null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): Change | null {
  if (previous <= 0) return null;
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (percent === 0) return { direction: "same", percent: 0 };
  return { direction: current > previous ? "up" : "down", percent };
}

export type CategoryInput = { categoryId: number | null; name: string | null; color: string | null; totalMinor: number };
export type Segment = {
  key: string;
  categoryId: number | null;
  name: string;
  color: string;
  totalMinor: number;
  percent: number;
};

/**
 * Top coloured categories plus one neutral "Other" bucket (the Other category,
 * uncategorised spend, and everything past the cap). At most `maxColored + 1` segments.
 */
export function foldCategories(totals: CategoryInput[], maxColored = 5): Segment[] {
  const sorted = [...totals].sort((a, b) => b.totalMinor - a.totalMinor);
  const colored: Omit<Segment, "percent">[] = [];
  let other = 0;

  for (const t of sorted) {
    const isOther = t.categoryId === null || t.color === "cat-other" || !t.color;
    if (!isOther && colored.length < maxColored) {
      colored.push({ key: `c${t.categoryId}`, categoryId: t.categoryId, name: t.name ?? "Unknown", color: t.color!, totalMinor: t.totalMinor });
    } else {
      other += t.totalMinor;
    }
  }

  const all = other > 0 ? [...colored, { key: "other", categoryId: null, name: "Other", color: "cat-other", totalMinor: other }] : colored;
  const percents = roundedShares(all.map((s) => s.totalMinor));
  return all.map((s, i) => ({ ...s, percent: percents[i]! }));
}

/** Whole-number percentages that always sum to 100 (largest remainder). */
export function roundedShares(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    floors[i]! += 1;
  }
  return floors;
}
