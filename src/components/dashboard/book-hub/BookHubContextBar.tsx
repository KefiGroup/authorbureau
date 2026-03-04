import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onBack: () => void;
}

export default function BookHubContextBar({ book, onBack }: Props) {
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
        My Books
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
        <h2 className="font-heading text-lg font-bold truncate leading-tight">{book.title}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {book.genre && <span>{book.genre}</span>}
          {book.genre && book.published_at && <span>·</span>}
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
