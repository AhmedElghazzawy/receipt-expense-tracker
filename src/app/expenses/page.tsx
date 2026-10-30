import { Download, ReceiptText, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, PageHeader } from "@/components/empty-state";
import { ExpenseRow } from "@/components/expense-row";
import { MonthSwitcher } from "@/components/month-switcher";
import { formatDayLabel, formatMonth, todayIso } from "@/lib/dates";
import { exportHref, listHref, parseListFilters } from "@/lib/expense-filters";
import { formatMoney } from "@/lib/money";
import { categoryFill } from "@/lib/category-color";
import { cn } from "@/lib/utils";
import { getDb } from "@/server/db/client";
import { type ExpenseRow as Expense, listCategories, listExpenses } from "@/server/db/expenses";
import { SearchBox } from "./search-box";
import { ListSkeleton } from "./skeletons";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <>
      <PageHeader title="Expenses" />
      <Suspense fallback={<ListSkeleton />}>
        <ExpensesView searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExpensesView({ searchParams }: { searchParams: PageProps<"/expenses">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  const filters = parseListFilters(params);
  const db = getDb();
  const categories = listCategories(db);
  const expenses = listExpenses(db, filters);
  const filtered = Boolean(filters.categoryId || filters.search);

  return (
    <div className="flex flex-col gap-5">
      <MonthSwitcher month={filters.month} hrefFor={(month) => listHref(filters, { month })} />
      <div className="flex flex-col gap-3">
        <SearchBox />
        <nav aria-label="Filter by category" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <ul className="flex w-max gap-2 pb-1">
            {[{ id: undefined, name: "All", color: null }, ...categories].map((c) => {
              const active = filters.categoryId === c.id;
              return (
                <li key={c.name}>
                  <Link
                    href={listHref(filters, { categoryId: c.id })}
                    aria-current={active ? "true" : undefined}
                    scroll={false}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-secondary",
                    )}
                  >
                    {c.color && <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: categoryFill(c.color) }} />}
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {expenses.length === 0 ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No matches">
            Nothing in {formatMonth(filters.month)} matches these filters.{" "}
            <Link href={listHref({ month: filters.month })} className="font-medium text-primary underline-offset-4 hover:underline">
              Clear filters
            </Link>
          </EmptyState>
        ) : (
          <EmptyState icon={ReceiptText} title={`No expenses in ${formatMonth(filters.month)}`}>
            Tap <span className="font-medium text-foreground">+</span> to add one.
          </EmptyState>
        )
      ) : (
        <>
          <Totals expenses={expenses} />
          <DayGroups expenses={expenses} />
          <a
            href={exportHref(filters)}
            download
            className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Download aria-hidden className="size-4" />
            Download {expenses.length === 1 ? "this expense" : `these ${expenses.length} expenses`} as CSV
          </a>
        </>
      )}
    </div>
  );
}

/** Sum per currency; different currencies are never added together. */
function sumByCurrency(expenses: Expense[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amountMinor);
  return [...totals].sort((a, b) => b[1] - a[1]);
}

function Totals({ expenses }: { expenses: Expense[] }) {
  const [main, ...others] = sumByCurrency(expenses);
  if (!main) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-xl border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">
        {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
      </span>
      <span className="text-right">
        <span className="block text-xl font-semibold tabular-nums">{formatMoney(main[1], main[0])}</span>
        {others.map(([currency, total]) => (
          <span key={currency} className="block text-sm text-muted-foreground tabular-nums">
            + {formatMoney(total, currency)}
          </span>
        ))}
      </span>
    </div>
  );
}

function DayGroups({ expenses }: { expenses: Expense[] }) {
  const today = todayIso();
  const days = new Map<string, Expense[]>();
  for (const e of expenses) days.set(e.date, [...(days.get(e.date) ?? []), e]);

  return (
    <div className="flex flex-col gap-5">
      {[...days].map(([date, items]) => (
        <section key={date} aria-labelledby={`day-${date}`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1 text-sm">
            <h3 id={`day-${date}`} className="font-medium text-muted-foreground">
              {formatDayLabel(date, today)}
            </h3>
            <span className="text-muted-foreground tabular-nums">
              {sumByCurrency(items)
                .map(([currency, total]) => formatMoney(total, currency))
                .join(" + ")}
            </span>
          </div>
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
            {items.map((e) => (
              <li key={e.id}>
                <ExpenseRow expense={e} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
