import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/empty-state";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    </div>
  );
}
