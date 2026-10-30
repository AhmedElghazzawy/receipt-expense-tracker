import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/empty-state";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiStatus, AiStatusSkeleton } from "./ai-status";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>System follows your phone or computer setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Privacy and AI</CardTitle>
          <CardDescription>How receipts are read. Change these in your .env file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AiStatusSkeleton />}>
            <AiStatus />
          </Suspense>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Expenses live only on this computer. Download a copy as CSV to back them up or open them in a spreadsheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="lg" className="h-11 rounded-full">
            <a href="/api/export?all=1" download>
              <Download />
              Download all expenses (CSV)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
