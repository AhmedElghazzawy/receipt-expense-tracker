import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, ScanLine } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ExpenseRow } from "@/components/expense-row";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryFill } from "@/lib/category-color";
import { type Change, comparisonWindows, foldCategories, percentChange, type Segment } from "@/lib/dashboard";
import { currentMonth, formatMonth, todayIso } from "@/lib/dates";
import { listHref } from "@/lib/expense-filters";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getDb } from "@/server/db/client";
import { categoryTotals, listExpenses, monthTotals, totalBetween } from "@/server/db/expenses";

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  const db = getDb();
  const today = todayIso();
  const month = currentMonth();
  const totals = monthTotals(db, month);
  const recent = listExpenses(db, {}, 5);

  if (totals.length === 0) {
    return (
      <>
        <MonthLabel month={month} />
        <EmptyState icon={ScanLine} title={recent.length ? "Nothing yet this month" : "Track your first expense"}>
          Tap <span className="font-medium text-foreground">+</span> to snap a receipt, upload a dekont, or type it in.
          Your month at a glance shows up here.
        </EmptyState>
        {recent.length > 0 && <Recent expenses={recent} />}
      </>
    );
  }

  // Lead with lira when present; other currencies are listed, never summed in.
  const main = totals.find((t) => t.currency === DEFAULT_CURRENCY) ?? totals[0]!;
  const others = totals.filter((t) => t !== main);
  const windows = comparisonWindows(today);
  const change = percentChange(
    totalBetween(db, windows.current.start, windows.current.end, main.currency),
    totalBetween(db, windows.previous.start, windows.previous.end, main.currency),
  );
  const segments = foldCategories(categoryTotals(db, month, main.currency));

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="month-total" className="flex flex-col gap-2 pt-2">
        <MonthLabel month={month} id="month-total" />
        <p className="text-display font-semibold tracking-tight tabular-nums">{formatMoney(main.totalMinor, main.currency)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            {main.count} {main.count === 1 ? "expense" : "expenses"}
          </span>
          {change && <ChangeBadge change={change} />}
          {others.map((o) => (
            <span key={o.currency} className="tabular-nums">
              + {formatMoney(o.totalMinor, o.currency)}
            </span>
          ))}
        </div>
      </section>

      <CategoryBreakdown segments={segments} currency={main.currency} month={month} />
      <Recent expenses={recent} />
    </div>
  );
}

function MonthLabel({ month, id }: { month: string; id?: string }) {
  return (
    <h1 id={id} className="text-sm font-medium text-muted-foreground">
      {formatMonth(month)}
    </h1>
  );
}

/** Spending up is the cautionary direction; icon + words carry meaning, colour only supports it. */
function ChangeBadge({ change }: { change: Change }) {
  const { direction, percent } = change;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const text =
    direction === "same" ? "Same as this time last month" : `${percent}% ${direction === "up" ? "more" : "less"} than this time last month`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
        direction === "up" && "bg-expense/10 text-expense",
        direction === "down" && "bg-positive/10 text-positive",
        direction === "same" && "bg-secondary text-secondary-foreground",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {text}
    </span>
  );
}

/** Part-to-whole: one stacked bar plus a labelled list that doubles as legend and table. */
function CategoryBreakdown({ segments, currency, month }: { segments: Segment[]; currency: string; month: string }) {
  if (segments.length === 0) return null;
  return (
    <section aria-labelledby="by-category" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 id="by-category" className="font-semibold">
        Where it went
      </h2>
      <div aria-hidden className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.name}: ${formatMoney(s.totalMinor, currency)} (${s.percent}%)`}
            className="h-full min-w-1 first:rounded-l-full last:rounded-r-full"
            style={{ flexGrow: s.totalMinor, flexBasis: 0, backgroundColor: categoryFill(s.color) }}
          />
        ))}
      </div>
      <ul className="flex flex-col">
        {segments.map((s) => {
          const content = (
            <>
              <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: categoryFill(s.color) }} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="w-10 text-right text-sm text-muted-foreground tabular-nums">{s.percent}%</span>
              <span className="w-28 text-right font-medium tabular-nums">{formatMoney(s.totalMinor, currency)}</span>
            </>
          );
          const row = "flex min-h-11 items-center gap-3 rounded-lg px-2 -mx-2";
          return (
            <li key={s.key}>
              {s.categoryId ? (
                <Link
                  href={listHref({ month }, { categoryId: s.categoryId })}
                  className={cn(row, "transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}
                >
                  {content}
                </Link>
              ) : (
                <div className={row}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Recent({ expenses }: { expenses: Parameters<typeof ExpenseRow>[0]["expense"][] }) {
  return (
    <section aria-labelledby="recent" className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 id="recent" className="font-semibold">
          Recent
        </h2>
        <Link href="/expenses" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
          See all <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
        {expenses.map((e) => (
          <li key={e.id}>
            <ExpenseRow expense={e} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 pt-2" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
