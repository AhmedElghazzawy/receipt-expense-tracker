import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-full" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      {[3, 2].map((rows, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-px overflow-hidden rounded-xl border">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-3 bg-card p-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
