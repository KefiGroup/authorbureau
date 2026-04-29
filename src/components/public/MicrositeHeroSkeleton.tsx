import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";

export default function MicrositeHeroSkeleton() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="border-b border-border bg-primary py-16">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-10 w-3/4 bg-white/10" />
              <Skeleton className="h-6 w-2/3 bg-white/10" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-5/6 bg-white/10" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="h-11 w-36 rounded-lg bg-white/10" />
                <Skeleton className="h-11 w-32 rounded-lg bg-white/10" />
              </div>
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-80 w-56 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
      </section>
      <section className="py-12">
        <div className="container grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
