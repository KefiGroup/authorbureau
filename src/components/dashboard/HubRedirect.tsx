import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-[60vh] flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Opening your {LABEL_BY_KIND[kind]} hub…</span>
    </div>
  );
}

