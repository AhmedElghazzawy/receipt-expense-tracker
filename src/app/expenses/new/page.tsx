import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/empty-state";
import { todayIso } from "@/lib/dates";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { getDb } from "@/server/db/client";
import { listCategories } from "@/server/db/expenses";
import { ExpenseForm } from "../expense-form";
import { FormSkeleton } from "../skeletons";

export const metadata: Metadata = { title: "New expense" };

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New expense" />
      <Suspense fallback={<FormSkeleton />}>
        <NewExpenseForm />
      </Suspense>
    </div>
  );
}

async function NewExpenseForm() {
  await connection();
  const today = todayIso();
  return (
    <ExpenseForm
      expenseId={null}
      categories={listCategories(getDb())}
      today={today}
      initial={{ amount: "", currency: DEFAULT_CURRENCY, date: today, merchant: "", categoryId: "", note: "" }}
    />
  );
}
