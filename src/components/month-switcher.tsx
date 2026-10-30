import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { currentMonth, formatMonth, shiftMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Previous / next month arrows around the month name; no going past the current month. */
export function MonthSwitcher({ month, hrefFor }: { month: string; hrefFor: (month: string) => string }) {
  const isCurrent = month >= currentMonth();
  const arrow =
    "flex size-11 items-center justify-center rounded-full border bg-card transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={hrefFor(shiftMonth(month, -1))} aria-label="Previous month" className={arrow} scroll={false}>
        <ChevronLeft className="size-5" />
      </Link>
      <h2 className="text-xl font-semibold tracking-tight" aria-live="polite">
        {formatMonth(month)}
      </h2>
      {isCurrent ? (
        <span aria-hidden className={cn(arrow, "pointer-events-none opacity-40")}>
          <ChevronRight className="size-5" />
        </span>
      ) : (
        <Link href={hrefFor(shiftMonth(month, 1))} aria-label="Next month" className={arrow} scroll={false}>
          <ChevronRight className="size-5" />
        </Link>
      )}
    </div>
  );
}
