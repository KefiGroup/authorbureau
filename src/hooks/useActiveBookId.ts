import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorBook } from "@/hooks/useAuthorBook";

/**
 * Canonical "which book is this builder working on?" hook — modelled on the
 * BP-06 reference pattern.
 *
 *  activeBookId = explicit prop (route param) ?? hookBookId (latest book) ?? null
 *
 * Also resolves a per-book title (preferring author_context for that exact
 * book, then the books table, then falling back to the hook's detected
 * title) so builders never show "Authors-Bureau" or "your book" while a
 * real title is sitting in the DB.
 */
export interface ActiveBookState {
  activeBookId: string | null;
  hasResolvedBook: boolean;
  effectiveBookTitle: string;
  isBookLoading: boolean;
}

export function useActiveBookId(
  authorId: string | null,
  propBookId?: string | null,
): ActiveBookState {
  const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading, bookId: hookBookId } =
    useAuthorBook();
  const activeBookId = propBookId ?? hookBookId ?? null;
  const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

  useEffect(() => {
    if (!authorId) return;
    let cancelled = false;
    (async () => {
      if (activeBookId) {
        const { data: ctx } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorId)
          .eq("book_id", activeBookId)
          .maybeSingle();
        if (!cancelled && ctx?.book_title) {
          setResolvedBookTitle(ctx.book_title);
          return;
        }
        const { data: book } = await supabase
          .from("books")
          .select("title")
          .eq("id", activeBookId)
          .maybeSingle();
        if (!cancelled && book?.title) setResolvedBookTitle(book.title);
        return;
      }
      // No explicit book in scope — use the latest author_context row.
      const { data: ctx } = await supabase
        .from("author_context")
        .select("book_title")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && ctx?.book_title) setResolvedBookTitle(ctx.book_title);
    })();
    return () => {
      cancelled = true;
    };
  }, [authorId, activeBookId]);

  const hasResolvedBook =
    hasBook ||
    Boolean(resolvedBookTitle) ||
    Boolean(detectedBookTitle && detectedBookTitle !== "your book");

  const effectiveBookTitle =
    resolvedBookTitle ||
    (detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : "") ||
    "your book";

  return { activeBookId, hasResolvedBook, effectiveBookTitle, isBookLoading };
}
