import { ArrowLeft, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionTier } from "@/hooks/useAuth";

interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  cover_image_url?: string | null;
  genre?: string | null;
  published_at?: string | null;
  author_name?: string | null;
}

interface Props {
  book: Book;
  tier: SubscriptionTier;
  onBack: () => void;
}

const tierBadgeConfig: Record<SubscriptionTier, { label: string; bg: string; text: string; icon?: boolean }> = {
  free: { label: "Free", bg: "bg-[hsl(220,13%,95%)]", text: "text-[hsl(220,9%,46%)]" },
  brand: { label: "Brand", bg: "bg-[hsl(152,76%,96%)]", text: "text-[hsl(160,84%,39%)]" },
  pro: { label: "Pro", bg: "bg-[hsl(214,95%,93%)]", text: "text-[hsl(217,91%,60%)]" },
  yield: { label: "Yield", bg: "bg-[hsl(48,96%,89%)]", text: "text-secondary", icon: true },
};

export default function BookHubContextBar({ book, tier, onBack }: Props) {
  const badge = tierBadgeConfig[tier];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        My Books Hub
      </Button>

      <div className="w-px h-8 bg-border" />

      {/* Book thumbnail */}
      <div className="h-12 w-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border">
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      {/* Book info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-bold truncate leading-tight">{book.title}</h2>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-0.5 shrink-0 ${badge.bg} ${badge.text}`}>
            {badge.icon && <Sparkles className="h-3 w-3" />}
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {book.author_name && <span>{book.author_name}</span>}
          {book.author_name && book.genre && <span>·</span>}
          {book.genre && <span>{book.genre}</span>}
          {(book.author_name || book.genre) && book.published_at && <span>·</span>}
          {book.published_at && (
            <span>Published {new Date(book.published_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
          )}
        </div>
      </div>

      {/* View microsite */}
      {book.published_at && (
        <a
          href={`/books/${book.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Microsite
        </a>
      )}
    </div>
  );
}
