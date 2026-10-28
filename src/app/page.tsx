import { ScanLine } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/empty-state";

// Dashboard (month total, categories, recent) lands in the next Phase 1 PRs.
export default function Home() {
  return (
    <>
      <PageHeader title="This month" />
      <EmptyState icon={ScanLine} title="Track your first expense">
        Tap <span className="font-medium text-foreground">+</span> to snap a receipt, upload a dekont, or type it in.
        Your month at a glance shows up here.
      </EmptyState>
    </>
  );
}
