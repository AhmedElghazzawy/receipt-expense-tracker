import { todayIso } from "@/lib/dates";
import { expensesCsv, exportFilename } from "@/lib/csv";
import { parseListFilters } from "@/lib/expense-filters";
import type { Db } from "./db/client";
import { type ExpenseFilters, listExpenses } from "./db/expenses";

/**
 * `?all=1` exports everything; otherwise the same month/category/search filters as the
 * expense list, so "Export" downloads exactly what is on screen. Oldest first.
 */
export function exportExpenses(db: Db, params: URLSearchParams, now = new Date()) {
  const filters: ExpenseFilters = params.has("all") ? {} : parseListFilters(Object.fromEntries(params), now);
  const rows = listExpenses(db, filters).reverse();
  return { filename: exportFilename(filters, todayIso(now)), body: expensesCsv(rows), count: rows.length };
}
