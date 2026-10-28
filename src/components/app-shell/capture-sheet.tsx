"use client";

import { Camera, FileUp, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const options = [
  { label: "Take a photo", hint: "Snap a receipt", icon: Camera, href: null },
  { label: "Upload a file", hint: "Receipt or bank dekont, PDF or image", icon: FileUp, href: null },
  { label: "Enter manually", hint: "Type the amount and details", icon: PencilLine, href: "/expenses/new" },
] as const;

/** The always-available capture action (docs/DESIGN.md principle 1). */
export function CaptureSheet({ variant }: { variant: "fab" | "button" }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "fab" ? (
          <button
            type="button"
            aria-label="Add expense"
            className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        ) : (
          <Button size="lg" className="h-10 rounded-full px-4">
            <Plus strokeWidth={2.5} />
            Add expense
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Add an expense</SheetTitle>
          <SheetDescription>Scan it, upload it, or type it in.</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-2 px-4">
          {options.map(({ label, hint, icon: Icon, href }) => {
            const content = (
              <>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="truncate text-sm text-muted-foreground">{hint}</span>
                </span>
                {!href && <Badge variant="secondary">Soon</Badge>}
              </>
            );
            const className = cn(
              "flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
              href
                ? "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-accent"
                : "cursor-not-allowed opacity-60",
            );
            return (
              <li key={label}>
                {href ? (
                  <Link href={href} className={className} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div className={className} aria-disabled="true">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
