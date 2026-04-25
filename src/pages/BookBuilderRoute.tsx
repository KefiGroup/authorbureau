import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import AuthorDashboard from "@/pages/AuthorDashboard";
import { getNodeSection } from "@/config/abbyFrameworkConfig";
import type { DashboardSection } from "@/pages/AuthorDashboard";

/**
 * Nested route shell for /dashboard/book/:bookId/build/:node.
 *
 * Resolves the :node URL param to a dashboard section, ensures bookId is
 * present in the URL search params (so BookBuilderContextBar and downstream
 * builders keep working), and renders AuthorDashboard with the right
 * initialSection. Falls back to the Book Hub if the node is unknown.
 */
export default function BookBuilderRoute() {
  const { bookId, node } = useParams<{ bookId: string; node: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const entry = node ? getNodeSection(node) : null;

  // Make sure bookId is mirrored into the search params so existing builders
  // (which read it via useBookContext / useSearchParams) keep functioning.
  useEffect(() => {
    if (!bookId) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (next.get("bookId") !== bookId) {
      next.set("bookId", bookId);
      changed = true;
    }
    if (entry?.extraParams) {
      for (const [k, v] of Object.entries(entry.extraParams)) {
        if (next.get(k) !== v) {
          next.set(k, v);
          changed = true;
        }
      }
    }
    if (changed) setSearchParams(next, { replace: true });
  }, [bookId, entry, searchParams, setSearchParams]);

  if (!bookId || !node || !entry) {
    return <Navigate to={bookId ? `/dashboard/book/${bookId}` : "/dashboard"} replace />;
  }

  return <AuthorDashboard initialSection={entry.section as DashboardSection} />;
}
