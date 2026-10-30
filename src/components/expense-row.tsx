import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { categoryFill, categoryLabel } from "@/lib/category-color";
import { formatMoney } from "@/lib/money";
import type { ExpenseRow as Expense } from "@/server/db/expenses";

/** One tappable expense line: category badge, merchant, amount. */
export function ExpenseRow({ expense }: { expense: Expense }) {
  const title = expense.merchant ?? expense.categoryName ?? "Expense";
  const subtitle = [expense.merchant ? expense.categoryName : null, expense.note].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/expenses/${expense.id}`}
      className="flex min-h-16 items-center gap-3 bg-card px-3 py-2.5 transition-colors hover:bg-secondary/60 focus-visible:relative focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-secondary"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ backgroundColor: categoryFill(expense.categoryColor), color: categoryLabel(expense.categoryColor) }}
      >
        {(expense.categoryName ?? "?").charAt(0)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{title}</span>
        <span className="truncate text-sm text-muted-foreground">{subtitle || "Uncategorised"}</span>
      </span>
      <span className="shrink-0 text-right font-semibold tabular-nums">
        {formatMoney(expense.amountMinor, expense.currency)}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
