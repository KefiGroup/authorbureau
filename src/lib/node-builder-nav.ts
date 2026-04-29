/**
 * Canonical helper for navigating between /node-builder/:nodeId routes.
 *
 * Why this exists
 * ---------------
 * Node builders rely on `bookId` (and optionally `bookTitle`, `bookCoverUrl`)
 * being present in the URL search params. When code does
 *   navigate("/node-builder/BP-03")
 * those params are stripped, the BookBuilderContextBar disappears, and the
 * back link reverts to "Back to Dashboard" instead of
 * "Back to Book Hub · Brand". This is the cross-cutting bug class fixed in
 * Audit #6.
 *
 * Always use `buildNodeBuilderHref(targetNodeId)` (or the React-Router
 * variant) for in-app sibling-node navigation.
 */
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Pure helper: returns "/node-builder/<NODE>?<preserved query>"
 * Pass in the current location's search string (e.g. window.location.search
 * or a router-provided value).
 */
export function buildNodeBuilderHref(
  targetNodeId: string,
  currentSearch: string,
  /** Optional path used to recover bookId from /dashboard/book/:bookId/build/... */
  currentPathname: string = "",
): string {
  const params = new URLSearchParams(currentSearch);
  const pathBookId = /\/dashboard\/book\/([^/]+)\/build\//.exec(currentPathname)?.[1];
  if (pathBookId && !params.get("bookId")) params.set("bookId", pathBookId);
  const qs = params.toString();
  return `/node-builder/${targetNodeId}${qs ? `?${qs}` : ""}`;
}

/**
 * React hook returning a stable navigator that preserves bookId/bookTitle
 * when jumping between /node-builder/:nodeId routes.
 */
export function useNodeBuilderNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (targetNodeId: string) => {
      navigate(buildNodeBuilderHref(targetNodeId, location.search, location.pathname));
    },
    [navigate, location.search, location.pathname],
  );
}
