/**
 * CANONICAL COUNTER RULES for the "X / 28" module counters.
 *
 * Both the `author-stats` edge function and the frontend hooks
 * (`useBookNodeProgress`, `useNodeLiveStats`) must obey these rules so the
 * number shown on a book always equals the number of modules truly built for
 * that book.
 *
 * Rule 1 — only finished product rows count. Drafts and in-review rows are
 *          work in progress, never "built".
 * Rule 2 — a row counts for exactly one book: its own `book_id`. There is no
 *          fallback to the oldest book, so an unstamped legacy row can never
 *          inflate another book's count.
 */

/** Statuses that mean a product row is finished and counts toward X / 28. */
export const BUILT_PRODUCT_STATUSES = new Set(["published", "active", "live"]);

export function isBuiltProductStatus(status: string | null | undefined): boolean {
  return !!status && BUILT_PRODUCT_STATUSES.has(status);
}

/**
 * Resolve which book a row counts for.
 * Returns null when the row must not be counted against any specific book.
 */
export function bookForCountedRow(
  rowBookId: string | null | undefined,
  selectedBookId?: string | null,
): string | null {
  if (!rowBookId) return null;
  if (selectedBookId && rowBookId !== selectedBookId) return null;
  return rowBookId;
}

export interface CountableNodeRow {
  node_id: string | null | undefined;
  status: string | null | undefined;
  book_id: string | null | undefined;
  ready: boolean;
}

/**
 * Build the authoritative per-book completion ledger from author_nodes only.
 * Duplicate rows for the same (book, node) count once. Legacy product tables,
 * author slugs, drafts, and unstamped rows are deliberately excluded.
 */
export function countBuiltNodesByBook(
  bookIds: string[],
  rows: CountableNodeRow[],
): Record<string, string[]> {
  const knownBooks = new Set(bookIds);
  const sets = Object.fromEntries(bookIds.map((id) => [id, new Set<string>()])) as Record<string, Set<string>>;
  for (const row of rows) {
    if (!row.node_id || !row.book_id || !knownBooks.has(row.book_id)) continue;
    if (row.status !== "live" || !row.ready) continue;
    sets[row.book_id].add(row.node_id);
  }
  return Object.fromEntries(
    Object.entries(sets).map(([bookId, nodeIds]) => [bookId, Array.from(nodeIds).sort()]),
  );
}
