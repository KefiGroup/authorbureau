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

export function resolveScopedBookId(
  override?: string | null,
  search?: string,
  pathname?: string,
): string | null {
  if (override && UUID_RE.test(override)) return override;
  return readRouteBookId(search, pathname);
}

