import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookContext } from "@/hooks/useBookContext";

type HubKind = "brand" | "build" | "yield";

const TAB_BY_KIND: Record<HubKind, string> = {
  brand: "revenue-streams",
  build: "marketing-channels",
  yield: "authority-builders",
};

const LABEL_BY_KIND: Record<HubKind, string> = {
  brand: "Brand products",
  build: "Build authority",
  yield: "Yield revenue",
};

/**
 * Single redirect component for the legacy /brand-products, /build-authority,
 * and /yield-revenue routes. Sends the author to the matching tab inside the
 * unified Book Hub (or to /dashboard if no active book).
 *
 * Honours an explicit ?bookId= URL hint before falling back to useBookContext,
 * so callers (PublishSuccessScreen, builder back-buttons) can preserve the
 * active book even when author_context resolution races or returns null.
 */
export default function HubRedirect({ kind }: { kind: HubKind }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hintedBookId = searchParams.get("bookId");
  const { bookId: contextBookId, isLoading } = useBookContext();
  const bookId = hintedBookId || contextBookId;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // If we have an explicit hint, redirect immediately without waiting for
    // useBookContext (which can take 5–25s on cold sessions).
    if (hintedBookId) {
      navigate(`/book-hub/${hintedBookId}?tab=${TAB_BY_KIND[kind]}`, { replace: true });
      return;
    }
    if (isLoading) return;
    if (bookId) {
      navigate(`/book-hub/${bookId}?tab=${TAB_BY_KIND[kind]}`, { replace: true });
    } else {
      navigate("/dashboard?section=my-books", { replace: true });
    }
  }, [kind, bookId, hintedBookId, isLoading, navigate]);

  // Bound the wait: if the book context never resolves, show a recoverable state
  // instead of an endless spinner.
  useEffect(() => {
    if (hintedBookId || !isLoading) return;
    const timer = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(timer);
  }, [hintedBookId, isLoading]);

  if (timedOut) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-7 w-7 text-muted-foreground" />
        <div>
          <p className="font-medium">We couldn't open your {LABEL_BY_KIND[kind]} hub</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your book details are taking longer than expected to load. Check your connection and try again,
            or pick a book to continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard?section=my-books")}>
            Choose a book
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Opening your {LABEL_BY_KIND[kind]} hub…</span>
    </div>
  );
}

