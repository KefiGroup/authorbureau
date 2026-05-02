import { supabase } from "@/integrations/supabase/client";

/**
 * Per-book resolution of a book's title for builder intro screens.
 *
 * If `activeBookId` is provided:
 *   1. author_context for (author_id, book_id)
 *   2. books.title for that exact id
 *
 * Else fall back to the author's "latest" book:
 *   3. author_context most recent for author
 *   4. books most recent for author (by ownerUserId if provided, else authorId)
 *
 * Returns the resolved title, or "" if nothing matched. Never throws.
 */
export async function resolveBookTitle(
  authorId: string,
  activeBookId: string | null | undefined,
  ownerUserId?: string | null
): Promise<string> {
  try {
    if (activeBookId) {
      const { data: ctx } = await supabase
        .from("author_context")
        .select("book_title")
        .eq("author_id", authorId)
        .eq("book_id", activeBookId)
        .maybeSingle();
      if (ctx?.book_title) return ctx.book_title;

      const { data: book } = await supabase
        .from("books")
        .select("title")
        .eq("id", activeBookId)
        .maybeSingle();
      if (book?.title) return book.title;
      return "";
    }

    const { data: ctx } = await supabase
      .from("author_context")
      .select("book_title")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ctx?.book_title) return ctx.book_title;

    const { data: book } = await supabase
      .from("books")
      .select("title")
      .eq("author_id", ownerUserId || authorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (book?.title) return book.title;
  } catch {
    /* swallow */
  }
  return "";
}
