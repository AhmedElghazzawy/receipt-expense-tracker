import { currentMonth, isValidMonth } from "./dates";

export type ListFilters = { month: string; categoryId?: number; search?: string };

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** URL search params -> filters; anything invalid falls back to "no filter". */
export function parseListFilters(params: RawParams, now = new Date()): ListFilters {
  const month = first(params.month);
  const category = Number(first(params.category));
  const search = first(params.q)?.trim().slice(0, 100);
  return {
    month: month && isValidMonth(month) ? month : currentMonth(now),
    ...(Number.isSafeInteger(category) && category > 0 && { categoryId: category }),
    ...(search && { search }),
  };
}

/** CSV download of exactly what the list shows (see /api/export). */
export function exportHref(filters: ListFilters, now = new Date()): string {
  return listHref(filters, {}, now).replace(/^\/expenses/, "/api/export");
}

/** Builds /expenses?… for the given filters, omitting defaults. */
export function listHref(filters: ListFilters, changes: Partial<ListFilters> = {}, now = new Date()): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.month !== currentMonth(now)) params.set("month", next.month);
  if (next.categoryId) params.set("category", String(next.categoryId));
  if (next.search) params.set("q", next.search);
  const qs = params.toString();
  return qs ? `/expenses?${qs}` : "/expenses";
}
