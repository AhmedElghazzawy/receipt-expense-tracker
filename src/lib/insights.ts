import { shiftMonth } from "./dates";
import { normalizeMerchant } from "./normalize";

export type MonthPoint = { month: string; totalMinor: number };

/** The `count` months ending at `end`, oldest first, with empty months as 0. */
export function monthSeries(rows: MonthPoint[], end: string, count = 6): MonthPoint[] {
  const byMonth = new Map(rows.map((r) => [r.month, r.totalMinor]));
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(end, i - count + 1);
    return { month, totalMinor: byMonth.get(month) ?? 0 };
  });
}

export type MerchantRank = { key: string; name: string; totalMinor: number; count: number };

/**
 * Folds spellings of one merchant together ("Migros", "MİGROS TİC. A.Ş.") and ranks by spend.
 * The display name is the spelling with the most spend.
 */
export function foldMerchants(rows: { merchant: string; totalMinor: number; count: number }[], limit = 5): MerchantRank[] {
  const groups = new Map<string, MerchantRank>();
  const bestSpelling = new Map<string, number>();
  for (const r of rows) {
    const key = normalizeMerchant(r.merchant);
    if (!key) continue;
    const g = groups.get(key) ?? { key, name: r.merchant, totalMinor: 0, count: 0 };
    g.totalMinor += r.totalMinor;
    g.count += r.count;
    if (r.totalMinor > (bestSpelling.get(key) ?? -1)) {
      g.name = r.merchant;
      bestSpelling.set(key, r.totalMinor);
    }
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.totalMinor - a.totalMinor || a.name.localeCompare(b.name)).slice(0, limit);
}

/**
 * Average spend per day in minor units, over the days that have passed:
 * the whole month for past months, up to today for the current one.
 */
export function dailyAverage(totalMinor: number, month: string, today: string): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = month === today.slice(0, 7) ? Number(today.slice(8, 10)) : daysInMonth;
  return Math.round(totalMinor / days);
}
