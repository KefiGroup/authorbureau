import { Skeleton } from "@/components/ui/skeleton";

export default function BookHubSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Context bar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-amber-100/50" />
        <Skeleton className="h-5 w-48 bg-amber-100/50" />
        <Skeleton className="h-5 w-16 rounded-full bg-amber-100/50" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-border pb-2">
        {[80, 60, 60, 50, 70].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded bg-amber-100/50" style={{ width: w }} />
        ))}
      </div>

      {/* Abby Business Snapshot skeleton */}
      <div className="rounded-2xl border-2 border-secondary/20 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-full bg-amber-100/50 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-56 bg-amber-100/50" />
            <Skeleton className="h-4 w-full bg-amber-100/50" />
            <Skeleton className="h-4 w-3/4 bg-amber-100/50" />
          </div>
        </div>
        {/* Recommendation rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40 bg-amber-100/50" />
              <Skeleton className="h-3 w-28 bg-amber-100/50" />
            </div>
            <Skeleton className="h-7 w-20 rounded bg-amber-100/50" />
          </div>
        ))}
      </div>

      {/* Build My Business button skeleton */}
      <Skeleton className="h-16 w-full rounded-xl bg-amber-100/50" />

      {/* Monetization Map skeleton — 3 cards */}
      <div className="space-y-3">
        <div className="text-center space-y-1">
          <Skeleton className="h-5 w-36 mx-auto rounded-full bg-amber-100/50" />
          <Skeleton className="h-4 w-64 mx-auto bg-amber-100/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-9 h-9 rounded-full bg-amber-100/50" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24 bg-amber-100/50" />
                  <Skeleton className="h-3 w-32 bg-amber-100/50" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 5 + i * 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-16 rounded-md bg-amber-100/50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
