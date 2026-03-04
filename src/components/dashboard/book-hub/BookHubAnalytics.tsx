import { BarChart3 } from "lucide-react";

export default function BookHubAnalytics({ bookId }: { bookId: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      <h3 className="font-heading font-bold text-lg mb-1">Analytics</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Revenue, traffic, and conversion metrics for all products of this book will appear here once you start building and selling.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground mt-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
        </span>
        Coming Soon
      </div>
    </div>
  );
}
