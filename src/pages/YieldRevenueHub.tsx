import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useBookContext } from "@/hooks/useBookContext";

/**
 * Legacy /yield-revenue route.
 *
 * The standalone Yield Revenue Hub has been retired in favour of the
 * unified Book Hub → Yield tab so the user only ever sees one canonical
 * grid of YR nodes.
 *
 * This component preserves the route by redirecting any inbound traffic to
 * the active book's Yield tab. If no active book exists yet, we send the
 * author to the dashboard so they can pick / add one.
 */
export default function YieldRevenueHub() {
  const navigate = useNavigate();
  const { bookId, isLoading } = useBookContext();

  useEffect(() => {
    if (isLoading) return;
    if (bookId) {
      navigate(`/book-hub/${bookId}?tab=authority-builders`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [bookId, isLoading, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Opening your Yield Revenue products…</span>
    </div>
  );
}
