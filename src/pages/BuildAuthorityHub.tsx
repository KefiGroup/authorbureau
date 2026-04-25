import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useBookContext } from "@/hooks/useBookContext";

/**
 * Legacy /build-authority route.
 *
 * The standalone Build Authority Hub has been retired in favour of the
 * unified Book Hub → Build tab so the user only ever sees one canonical
 * grid of BA nodes (instead of the duplicated standalone hub + book hub tab
 * which made navigation feel inconsistent).
 *
 * This component preserves the route by redirecting any inbound traffic to
 * the active book's Build tab. If no active book exists yet, we send the
 * author to the dashboard so they can pick / add one.
 */
export default function BuildAuthorityHub() {
  const navigate = useNavigate();
  const { bookId, isLoading } = useBookContext();

  useEffect(() => {
    if (isLoading) return;
    if (bookId) {
      navigate(`/book-hub/${bookId}?tab=marketing-channels`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [bookId, isLoading, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Opening your Build Authority products…</span>
    </div>
  );
}
