import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMyBooks, type MyBook } from "@/hooks/useMyBooks";

const STORAGE_KEY = "marketing-hub:active-book-id";
const ALL_BOOKS = "__all__";

export interface MarketingHubBookContext {
  /** All of this author's books (cached). */
  books: MyBook[];
  /** Currently selected book id, or null when "All Books" is active. */
  activeBookId: string | null;
  /** Convenience: the full book object, when a single book is selected. */
  activeBook: MyBook | null;
  /** True when the author owns 2+ books and the selector should render. */
  hasMultipleBooks: boolean;
  /** Update the active selection. Pass null for "All Books". */
  setActiveBookId: (id: string | null) => void;
  /** Still fetching the books list. */
  loading: boolean;
}

/**
 * Per-book scoping for the Marketing Hub.
 *
 * - Persists the user's pick across reloads via localStorage
 * - Mirrors the pick into the URL (?book=<id> or ?book=all) for shareable deep-links
 * - Defaults: 1 book → that book; 2+ books → "All Books" (matches today's behaviour)
 * - Auto-clears stored selection if the book no longer exists (e.g. deleted)
 */
export function useMarketingHubBookContext(userId: string | undefined): MarketingHubBookContext {
  const { books, loading } = useMyBooks(userId);
  const [searchParams, setSearchParams] = useSearchParams();

  const urlBook = searchParams.get("book"); // null | book-id | "all"

  // Resolve the active selection from URL → localStorage → default rule.
  const activeBookId = useMemo<string | null>(() => {
    if (loading) return null;

    // URL takes priority.
    if (urlBook === "all") return null;
    if (urlBook && books.some((b) => b.id === urlBook)) return urlBook;

    // Fall back to localStorage.
    let stored: string | null = null;
    try {
      stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    } catch { /* ignore */ }

    if (stored === ALL_BOOKS) return null;
    if (stored && books.some((b) => b.id === stored)) return stored;

    // Default rule: single book → auto-scope; multiple → All Books.
    if (books.length === 1) return books[0].id;
    return null;
  }, [loading, urlBook, books]);

  // Keep localStorage in sync with whatever we resolved (so refreshes are stable).
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, activeBookId ?? ALL_BOOKS);
    } catch { /* ignore */ }
  }, [activeBookId, loading]);

  const setActiveBookId = (id: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, id ?? ALL_BOOKS);
    } catch { /* ignore */ }
    const sp = new URLSearchParams(searchParams);
    sp.set("book", id ?? "all");
    setSearchParams(sp, { replace: true });
  };

  const activeBook = activeBookId ? books.find((b) => b.id === activeBookId) ?? null : null;

  return {
    books,
    activeBookId,
    activeBook,
    hasMultipleBooks: books.length > 1,
    setActiveBookId,
    loading,
  };
}
