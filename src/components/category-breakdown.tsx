import Link from "next/link";
import { categoryFill } from "@/lib/category-color";
import type { Segment } from "@/lib/dashboard";
import { listHref } from "@/lib/expense-filters";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Part-to-whole: one stacked bar plus a labelled list that doubles as legend and table. */
export function CategoryBreakdown({ segments, currency, month }: { segments: Segment[]; currency: string; month: string }) {
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

