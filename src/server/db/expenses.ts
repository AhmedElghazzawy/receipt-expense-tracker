import { and, asc, desc, eq, gte, like, lt, sql } from "drizzle-orm";
import { monthRange } from "@/lib/dates";
import type { ExpenseInput } from "@/lib/expense-input";
import type { Db } from "./client";
import { categories, expenses } from "./schema";

export type ExpenseFilters = { month?: string; categoryId?: number; search?: string };

export type ExpenseRow = {
  id: number;
  amountMinor: number;
  currency: string;
  date: string;
  merchant: string | null;
  note: string | null;
  source: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function filterWhere({ month, categoryId, search }: ExpenseFilters) {
  const range = month ? monthRange(month) : undefined;
  const term = search?.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  return and(
    range && gte(expenses.date, range.start),
    range && lt(expenses.date, range.end),
    categoryId !== undefined ? eq(expenses.categoryId, categoryId) : undefined,
    term ? sql`(${like(expenses.merchant, `%${term}%`)} escape '\\' or ${like(expenses.note, `%${term}%`)} escape '\\')` : undefined,
  );
}

function selectExpenseRows(db: Db) {
  return db
    .select({
      id: expenses.id,
      amountMinor: expenses.amountMinor,
      currency: expenses.currency,
      date: expenses.date,
      merchant: expenses.merchant,
      note: expenses.note,
      source: expenses.source,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id));
}

export function listExpenses(db: Db, filters: ExpenseFilters = {}, limit = -1): ExpenseRow[] {
  return selectExpenseRows(db)
    .where(filterWhere(filters))
    .orderBy(desc(expenses.date), desc(expenses.id))
    .limit(limit)
    .all();
}

export function getExpense(db: Db, id: number): ExpenseRow | undefined {
  return selectExpenseRows(db).where(eq(expenses.id, id)).get();
}

export function createExpense(db: Db, input: ExpenseInput): number {
  return db.insert(expenses).values(input).returning({ id: expenses.id }).get().id;
}

/** Returns false when no expense has that id. */
export function updateExpense(db: Db, id: number, input: ExpenseInput): boolean {
  return db.update(expenses).set(input).where(eq(expenses.id, id)).run().changes > 0;
}

export function deleteExpense(db: Db, id: number): boolean {
  return db.delete(expenses).where(eq(expenses.id, id)).run().changes > 0;
}

export type MonthTotal = { currency: string; totalMinor: number; count: number };

/** Totals per currency; amounts in different currencies are never summed together. */
export function monthTotals(db: Db, month: string): MonthTotal[] {
  return db
    .select({
      currency: expenses.currency,
      totalMinor: sql<number>`sum(${expenses.amountMinor})`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(filterWhere({ month }))
    .groupBy(expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amountMinor})`))
    .all();
}

export type CategoryTotal = {
  categoryId: number | null;
  name: string | null;
  color: string | null;
  totalMinor: number;
  count: number;
};

export function categoryTotals(db: Db, month: string, currency: string): CategoryTotal[] {
  return db
    .select({
      categoryId: expenses.categoryId,
      name: categories.name,
      color: categories.color,
      totalMinor: sql<number>`sum(${expenses.amountMinor})`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(and(filterWhere({ month }), eq(expenses.currency, currency)))
    .groupBy(expenses.categoryId)
    .orderBy(desc(sql`sum(${expenses.amountMinor})`))
    .all();
}

export function listCategories(db: Db) {
  return db.select().from(categories).orderBy(asc(categories.id)).all();
}

/** Sum for one currency over [start, end) ISO dates; 0 when empty. */
export function totalBetween(db: Db, start: string, end: string, currency: string): number {
  const row = db
    .select({ total: sql<number | null>`sum(${expenses.amountMinor})` })
    .from(expenses)
    .where(and(gte(expenses.date, start), lt(expenses.date, end), eq(expenses.currency, currency)))
    .get();
  return row?.total ?? 0;
}
