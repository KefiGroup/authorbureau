import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Reusable book context bar for all product builders.
 * Reads bookId / bookTitle / bookCoverUrl from URL search params.
 * Shows the book at the top with a back button to the Book Hub.
 */
export function useBookContext() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") || "";
  const bookTitle = searchParams.get("bookTitle") || "";
  const bookCoverUrl = searchParams.get("bookCoverUrl") || null;
  return { bookId, bookTitle, bookCoverUrl };
}

interface Props {
  /** Which ABBY tab to navigate back to (automate, build, broadcast, yield) */
  backTab?: string;
}

export default function BookBuilderContextBar({ backTab = "automate" }: Props) {
  const navigate = useNavigate();
  const { bookId, bookTitle } = useBookContext();

  if (!bookId) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm mb-6">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
        onClick={() => navigate(`/dashboard/book/${bookId}?tab=${backTab}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Book Hub
      </Button>

      <div className="w-px h-8 bg-border" />

      <div className="h-10 w-7 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{decodeURIComponent(bookTitle)}</p>
        <p className="text-[10px] text-muted-foreground">Product Builder</p>
      </div>
    </div>
  );
}
