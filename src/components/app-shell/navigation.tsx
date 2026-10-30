"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { CaptureSheet } from "./capture-sheet";
import { isActive, navItems } from "./nav-items";

// usePathname is request-time data; the fallback (no active tab) keeps the shell prerendered.
function withPathname(View: (props: { pathname: string | null }) => React.ReactNode) {
  function Live() {
    return <View pathname={usePathname()} />;
  }
  return function Nav() {
    return (
      <Suspense fallback={<View pathname={null} />}>
        <Live />
      </Suspense>
    );
  };
}

/** Mobile: bottom tab bar in the thumb zone with the capture button in the middle. */
export const BottomNav = withPathname(function BottomNavView({ pathname }) {
  const [left, right] = [navItems.slice(0, 2), navItems.slice(2)];

  const tab = ({ href, label, icon: Icon }: (typeof navItems)[number]) => {
    const active = pathname !== null && isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center px-2">
        {left.map(tab)}
        <div className="flex w-18 justify-center">
          <div className="-mt-7">
            <CaptureSheet variant="fab" />
          </div>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
});

/** Tablet and desktop: top bar with the same destinations. */
export const TopNav = withPathname(function TopNavView({ pathname }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b bg-background/85 backdrop-blur-lg md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          Expense Tracker
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-1">
          {navItems.map(({ href, label }) => {
            const active = pathname !== null && isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <CaptureSheet variant="button" />
      </div>
    </header>
  );
});
