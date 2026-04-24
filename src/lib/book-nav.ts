/**
 * Book-scoped navigation helpers.
 *
 * After the BP/BA/YR sidebar removal, every builder back-button must return
 * the author to the correct book's hub tab — not a global hub.
 */

export type BookHubTab =
  | "overview"
  | "revenue-streams"      // 💰 Brand
  | "marketing-channels"   // 📈 Build
  | "authority-builders"   // 🏆 Yield
  | "analytics";

const LAST_BOOK_KEY = "ab_last_active_book_id";

/** Best-effort resolution of the active book id without React hooks. */
export function resolveActiveBookId(explicitBookId?: string | null): string | null {
  if (explicitBookId) return explicitBookId;
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("bookId");
    if (fromQuery) return fromQuery;
    // /dashboard/book/:bookId
    const match = url.pathname.match(/\/dashboard\/book\/([0-9a-f-]{36})/i);
    if (match) return match[1];
    return localStorage.getItem(LAST_BOOK_KEY);
  } catch {
    return null;
  }
}

export function rememberActiveBookId(bookId: string | null | undefined) {
  if (!bookId) return;
  try {
    localStorage.setItem(LAST_BOOK_KEY, bookId);
  } catch {
    /* ignore */
  }
}

/** Build a /dashboard/book/:id?tab=... URL, or fall back to the books hub. */
export function bookHubPath(bookId: string | null | undefined, tab: BookHubTab = "overview"): string {
  if (!bookId) return "/dashboard?section=my-books";
  return `/dashboard/book/${bookId}?tab=${tab}`;
}

/**
 * Convenience back-target for builders. Pass the builder's bookId prop and
 * the BBY tab the builder belongs to (brand/build/yield).
 */
export function builderBackTarget(
  bookId: string | null | undefined,
  category: "brand" | "build" | "yield"
): string {
  const tab: BookHubTab =
    category === "brand"
      ? "revenue-streams"
      : category === "build"
      ? "marketing-channels"
      : "authority-builders";
  return bookHubPath(resolveActiveBookId(bookId), tab);
}
