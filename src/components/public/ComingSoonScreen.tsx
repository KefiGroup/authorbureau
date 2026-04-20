import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  authorSlug: string;
  authorName?: string;
  pageLabel?: string;
}

export default function ComingSoonScreen({ authorSlug, authorName, pageLabel = "This page" }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/${authorSlug}`} className="text-sm font-semibold hover:underline">
            {authorName || authorSlug}
          </Link>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Coming Soon</span>
        </div>
      </header>
      <section className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{pageLabel} is coming soon</h1>
        <p className="text-muted-foreground">
          {authorName || "The author"} is preparing something great. Check back soon!
        </p>
        <Button asChild size="lg">
          <Link to={`/${authorSlug}`}>Visit {authorName ? `${authorName}'s` : "Author's"} Page</Link>
        </Button>
      </section>
    </div>
  );
}
