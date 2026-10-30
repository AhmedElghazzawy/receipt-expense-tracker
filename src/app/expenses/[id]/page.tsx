import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/empty-state";
import { todayIso } from "@/lib/dates";
import { minorToDecimalString } from "@/lib/money";
import { getDb } from "@/server/db/client";
import { getExpense, listCategories } from "@/server/db/expenses";
import { ExpenseForm } from "../expense-form";
import { FormSkeleton } from "../skeletons";

export const metadata: Metadata = { title: "Edit expense" };

export default function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Edit expense" />
      <Suspense fallback={<FormSkeleton />}>
        <EditExpenseForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditExpenseForm({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  await connection();
  const id = Number(rawId);
  const db = getDb();
  const expense = Number.isSafeInteger(id) && id > 0 ? getExpense(db, id) : undefined;
  if (!expense) notFound();

  return (
    <ExpenseForm
      expenseId={expense.id}
      categories={listCategories(db)}
      today={todayIso()}
      initial={{
        // Edit in the Turkish format the user typed, e.g. "1234,56".
        amount: minorToDecimalString(expense.amountMinor).replace(".", ","),
        currency: expense.currency,
        date: expense.date,
        merchant: expense.merchant ?? "",
        categoryId: expense.categoryId ? String(expense.categoryId) : "",
        note: expense.note ?? "",
      }}
    />
  );
}
