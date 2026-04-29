import { Navigate, useParams, useSearchParams } from "react-router-dom";
import AuthorDashboard from "@/pages/AuthorDashboard";
import { getNodeSection } from "@/config/abbyFrameworkConfig";
import type { DashboardSection } from "@/pages/AuthorDashboard";

/**
 * Nested route shell for /dashboard/book/:bookId/build/:node.
 *
 * Resolves :node to a dashboard section, mirrors :bookId (and any
 * extraParams) into the URL search params SYNCHRONOUSLY before mounting
 * AuthorDashboard. The synchronous mirror is critical: AuthorDashboard's
 * section handlers (e.g. workbooks → /node-builder/BP-06) read
 * location.search at render time, so any deferral via useEffect would
 * cause the redirect to fire with bookId missing from the query string.
 */
export default function BookBuilderRoute() {
  const { bookId, node } = useParams<{ bookId: string; node: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const entry = node ? getNodeSection(node) : null;

  if (!bookId || !node || !entry) {
    return <Navigate to={bookId ? `/dashboard/book/${bookId}` : "/dashboard"} replace />;
  }

  // Compute whether the current search params already include everything we
  // need; if not, mirror in place during render and bail for one tick so the
  // re-render sees the corrected URL before AuthorDashboard mounts.
  const next = new URLSearchParams(searchParams);
  let changed = false;
  if (next.get("bookId") !== bookId) {
    next.set("bookId", bookId);
    changed = true;
  }
  if (entry.extraParams) {
    for (const [k, v] of Object.entries(entry.extraParams)) {
      if (next.get(k) !== v) {
        next.set(k, v);
        changed = true;
      }
    }
  }
  if (changed) {
    setSearchParams(next, { replace: true });
    return null;
  }

  return <AuthorDashboard initialSection={entry.section as DashboardSection} />;
}
