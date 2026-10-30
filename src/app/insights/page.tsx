import { ChartPie } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { EmptyState, PageHeader } from "@/components/empty-state";
import { MonthSwitcher } from "@/components/month-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { foldCategories } from "@/lib/dashboard";
import { currentMonth, formatDayLabel, formatMonth, isValidMonth, shiftMonth, todayIso } from "@/lib/dates";
import { listHref } from "@/lib/expense-filters";
import { dailyAverage, foldMerchants, type MerchantRank, type MonthPoint, monthSeries } from "@/lib/insights";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getDb } from "@/server/db/client";
import { categoryTotals, listExpenses, merchantTotals, monthlyTotals, monthTotals } from "@/server/db/expenses";

export const metadata: Metadata = { title: "Insights" };

const TREND_MONTHS = 6;

const insightsHref = (month: string) => (month === currentMonth() ? "/insights" : `/insights?month=${month}`);

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <>
      <PageHeader title="Insights" />
      <Suspense fallback={<InsightsSkeleton />}>
        <Insights searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Insights({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  const raw = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = raw && isValidMonth(raw) && raw <= currentMonth() ? raw : currentMonth();
  const today = todayIso();
  const db = getDb();
  const totals = monthTotals(db, month);

  if (totals.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <MonthSwitcher month={month} hrefFor={insightsHref} />
        <EmptyState icon={ChartPie} title={`Nothing to chart for ${formatMonth(month)}`}>
          Category breakdowns, trends, and top merchants appear once you add expenses.
        </EmptyState>
      </div>
    );
  }

  // One currency per chart; other currencies are mentioned, never summed in.
  const main = totals.find((t) => t.currency === DEFAULT_CURRENCY) ?? totals[0]!;
  const currency = main.currency;
  const others = totals.filter((t) => t !== main);
  const trend = monthSeries(monthlyTotals(db, shiftMonth(month, 1 - TREND_MONTHS), month, currency), month, TREND_MONTHS);
  const biggest = listExpenses(db, { month })
    .filter((e) => e.currency === currency)
    .reduce<ReturnType<typeof listExpenses>[number] | undefined>((max, e) => (!max || e.amountMinor > max.amountMinor ? e : max), undefined);

  return (
    <div className="flex flex-col gap-6">
      <MonthSwitcher month={month} hrefFor={insightsHref} />

      <section aria-label="Month summary" className="flex flex-col gap-1">
        <p className="text-display font-semibold tracking-tight">{formatMoney(main.totalMinor, currency)}</p>
        <p className="text-sm text-muted-foreground">
          {main.count} {main.count === 1 ? "expense" : "expenses"}
          {others.map((o) => ` + ${formatMoney(o.totalMinor, o.currency)}`).join("")}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Per day" value={formatMoney(dailyAverage(main.totalMinor, month, today), currency)} hint="on average" />
        {biggest && (
          <Link
            href={`/expenses/${biggest.id}`}
            className="rounded-xl transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <StatTile
              label="Biggest"
              value={formatMoney(biggest.amountMinor, currency)}
              hint={`${biggest.merchant ?? "No merchant"} · ${formatDayLabel(biggest.date, today)}`}
            />
          </Link>
        )}
      </div>

      <MonthTrend points={trend} selected={month} currency={currency} />
      <CategoryBreakdown segments={foldCategories(categoryTotals(db, month, currency))} currency={currency} month={month} />
      <TopMerchants merchants={foldMerchants(merchantTotals(db, month, currency))} currency={currency} month={month} />
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tracking-tight">{value}</span>
      <span className="truncate text-sm text-muted-foreground">{hint}</span>
    </div>
  );
}

const shortMonth = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

/**
 * Change over time for one currency: columns per month (single series, so no legend).
 * Only the selected month is labelled on its cap; hover, focus, and the table carry the rest.
 */
function MonthTrend({ points, selected, currency }: { points: MonthPoint[]; selected: string; currency: string }) {
  const max = Math.max(...points.map((p) => p.totalMinor), 1);
  return (
    <section aria-labelledby="trend" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 id="trend" className="font-semibold">
        Last {points.length} months
      </h2>
      <ol className="flex h-44 items-end justify-between gap-1 border-b border-border pt-6">
        {points.map((p, i) => {
          const isSelected = p.month === selected;
          const label = `${formatMonth(p.month)}: ${formatMoney(p.totalMinor, currency)}`;
          // Edge columns anchor their label inward so it never leaves the card.
          const align = i === 0 ? "left-0" : i === points.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
          const tip = isSelected ? (
            <span className={cn("absolute bottom-full mb-1 text-xs font-medium whitespace-nowrap text-foreground", align)}>
              {formatMoney(p.totalMinor, currency)}
            </span>
          ) : (
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-full z-10 mb-1.5 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-sm group-hover:block group-focus-visible:block",
                align,
              )}
            >
              {label}
            </span>
          );
          return (
            <li key={p.month} className="flex h-full flex-1 justify-center">
              <Link
                href={insightsHref(p.month)}
                aria-label={label}
                aria-current={isSelected ? "true" : undefined}
                scroll={false}
                className="group relative flex h-full w-full max-w-14 items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {/* The bar is the anchor for its label, so labels sit just above each cap. */}
                <span
                  className={cn(
                    "relative w-full max-w-6 rounded-t-[4px] transition-colors",
                    isSelected ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50 dark:bg-primary/45 dark:group-hover:bg-primary/65",
                  )}
                  style={{ height: p.totalMinor > 0 ? `max(2px, ${(p.totalMinor / max) * 100}%)` : 0 }}
                >
                  {tip}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <ol aria-hidden className="-mt-2 flex justify-between gap-1">
        {points.map((p) => (
          <li
            key={p.month}
            className={cn("flex-1 text-center text-xs", p.month === selected ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            {shortMonth(p.month)}
          </li>
        ))}
      </ol>
      <table className="sr-only">
        <caption>Spending per month in {currency}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.month}>
              <th scope="row">{formatMonth(p.month)}</th>
              <td>{formatMoney(p.totalMinor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Ranked magnitudes: one hue, bars relative to the top merchant. Each row opens the list searched for it. */
function TopMerchants({ merchants, currency, month }: { merchants: MerchantRank[]; currency: string; month: string }) {
  if (merchants.length === 0) return null;
  const max = merchants[0]!.totalMinor;
  return (
    <section aria-labelledby="top-merchants" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="top-merchants" className="font-semibold">
        Top merchants
      </h2>
      <ol className="flex flex-col">
        {merchants.map((m) => (
          <li key={m.key}>
            <Link
              href={listHref({ month }, { search: m.name })}
              className="-mx-2 flex min-h-14 flex-col justify-center gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-baseline gap-3">
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{m.count}×</span>
                <span className="w-28 text-right font-medium tabular-nums">{formatMoney(m.totalMinor, currency)}</span>
              </span>
              <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(m.totalMinor / max) * 100}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-11 rounded-full" />
      <Skeleton className="h-11 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
