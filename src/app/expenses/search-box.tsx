"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

/** Debounced search that keeps the other filters in the URL. */
export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const updated = new URLSearchParams(params);
      if (next.trim()) updated.set("q", next.trim());
      else updated.delete("q");
      const qs = updated.toString();
      startTransition(() => router.replace(qs ? `/expenses?${qs}` : "/expenses", { scroll: false }));
    }, 250);
  };

  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search merchant or note"
        placeholder="Search merchant or note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-full bg-card pl-9"
      />
    </div>
  );
}
