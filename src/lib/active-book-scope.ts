/**
 * Canonical resolution of "which book is on screen right now".
 *
 * DATA-01 (audit 2026-09-30): every read/write must be scoped to the book in
 * the route. Never fall back to the author's "latest" book when the route
 * names one.
 *
 * Order of truth:
 *   1. explicit override passed by the caller
 *   2. ?bookId= / ?book= search param
 *   3. /book/<uuid>/ path segment
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readRouteBookId(search?: string, pathname?: string): string | null {
  try {
    const qs = search ?? (typeof window !== "undefined" ? window.location.search : "");
    const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");

    const params = new URLSearchParams(qs);
    const fromQuery = params.get("bookId") || params.get("book");
    if (fromQuery && UUID_RE.test(fromQuery)) return fromQuery;

    const segments = path.split("/").filter(Boolean);
    const idx = segments.indexOf("book");
    if (idx >= 0 && segments[idx + 1] && UUID_RE.test(segments[idx + 1])) {
      return segments[idx + 1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Funnel generation scope (FunnelsHub.generateForNode): the node's own
 * book_id wins when present; otherwise use the currently selected specific
 * book. "All books" and "Unattributed" scopes never invent a book_id.
 */
export function resolveFunnelBookId(
  nodeBookId: string | null | undefined,
  scope: string | null | undefined,
): string | null {
  if (nodeBookId && UUID_RE.test(nodeBookId)) return nodeBookId;
  if (scope && UUID_RE.test(scope)) return scope;
  return null;
}

export function resolveScopedBookId(
  override?: string | null,
  search?: string,
  pathname?: string,
): string | null {
  if (override && UUID_RE.test(override)) return override;
  return readRouteBookId(search, pathname);
}


/**
 * Workspace book scope (Review & Publish, Library, Funnels, CRM, Revenue).
 *
 * Audit 2026-10-01 P0-01: arriving from a book's hub must open these
 * workspaces on that book, even when the sidebar link carries no ?book=.
 * The route still wins; otherwise we use the book the author last opened
 * in this browser tab. Builders keep using `resolveScopedBookId` (route only).
 */
const WORKSPACE_KEY = "ab:workspace-book-id";

export function rememberWorkspaceBookId(id: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (id && UUID_RE.test(id)) window.sessionStorage.setItem(WORKSPACE_KEY, id);
    else window.sessionStorage.removeItem(WORKSPACE_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveWorkspaceBookId(): string | null {
  const fromRoute = readRouteBookId();
  if (fromRoute) {
    rememberWorkspaceBookId(fromRoute);
    return fromRoute;
  }
  try {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(WORKSPACE_KEY) : null;
    return stored && UUID_RE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}
