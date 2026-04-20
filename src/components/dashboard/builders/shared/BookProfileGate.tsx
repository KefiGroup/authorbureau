import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BookOpen } from "lucide-react";
import type { BookMissingField, AuthorBook } from "@/hooks/useAuthorBook";

interface Props {
  /**
   * Hard-gate flag from useBookContext. When false, this component renders nothing.
   * shouldGate=true ONLY when subscription is inactive OR author_context row missing.
   */
  shouldGate?: boolean;
  hasBook: boolean;
  bookId: string | null;
  book: AuthorBook | null;
  missingFields: BookMissingField[];
  returnTo: string;
  onProceedAnyway?: () => void;
}

const FIELD_LABELS: Record<BookMissingField, string> = {
  title: "title",
  description: "book description",
  genre: "genre",
  cover: "cover image",
};

export default function BookProfileGate({
  shouldGate,
  hasBook,
  bookId,
  book,
  missingFields,
  returnTo,
  onProceedAnyway,
}: Props) {
  const navigate = useNavigate();

  // If caller explicitly passed shouldGate=false, render nothing (subscribed + onboarded).
  if (shouldGate === false) return null;

  // Hard gate — no book row at all
  if (!hasBook) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-muted-foreground">
            I couldn't find a book linked to your account. Please add your book
            in My Books Hub first so I can build something tailored to it.
          </p>
        </div>
        <Button onClick={() => navigate(`/my-books?returnTo=${encodeURIComponent(returnTo)}`)}>
          Add Your Book
        </Button>
      </div>
    );
  }

  // Soft gate — book exists but missing key fields (only critical ones)
  const critical = missingFields.filter((f) => f === "description" || f === "cover" || f === "genre");
  if (critical.length > 0) {
    const labels = critical.map((f) => FIELD_LABELS[f]).join(", ");
    const focus = critical[0];
    const deepLink = bookId
      ? `/my-books?bookId=${bookId}&focus=${focus}&returnTo=${encodeURIComponent(returnTo)}`
      : `/my-books?returnTo=${encodeURIComponent(returnTo)}`;
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <p className="text-muted-foreground">
            I found <span className="font-semibold text-foreground">'{book?.title}'</span> in your library, but a few details are missing: <span className="font-semibold text-foreground">{labels}</span>. Adding them helps me build something stronger for your readers.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate(deepLink)}>
            Complete '{book?.title}'
          </Button>
          {onProceedAnyway && (
            <Button variant="outline" onClick={onProceedAnyway}>
              Build with current info anyway
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
