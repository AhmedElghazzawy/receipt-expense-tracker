import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/empty-state";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Expenses" />
      <EmptyState icon={ReceiptText} title="No expenses yet">
        Everything you add appears here, grouped by day.
      </EmptyState>
    </>
  );
}
