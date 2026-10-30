import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/empty-state";
import { todayIso } from "@/lib/dates";
import { getDb } from "@/server/db/client";
import { listCategories } from "@/server/db/expenses";
import { FormSkeleton } from "../skeletons";
import { ScanFlow } from "./scan-flow";

export const metadata: Metadata = { title: "Review expense" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Review expense" />
      <Suspense fallback={<FormSkeleton />}>
        <Scan />
      </Suspense>
    </div>
  );
}

async function Scan() {
  await connection();
  return <ScanFlow categories={listCategories(getDb())} today={todayIso()} />;
}
