import { ChartPie } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/empty-state";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" />
      <EmptyState icon={ChartPie} title="Nothing to chart yet">
        Category breakdowns, trends, and top merchants appear once you have a few expenses.
      </EmptyState>
    </>
  );
}
