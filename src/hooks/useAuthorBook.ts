import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

export interface AuthorBook {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  description?: string;
  coverUrl?: string;
}

export type BookMissingField = "title" | "description" | "genre" | "cover";

export interface AuthorBookResult {
  hasBook: boolean;
  bookTitle: string;
  book: AuthorBook | null;
  bookId: string | null;
  missingFields: BookMissingField[];
  isComplete: boolean;
  isLoading: boolean;
}

function computeMissing(row: {
  title?: string | null;
  description?: string | null;
  genre?: string | null;
  cover_image_url?: string | null;
}): BookMissingField[] {
  const missing: BookMissingField[] = [];
  if (!row.title?.trim()) missing.push("title");
  if (!row.description?.trim()) missing.push("description");
  if (!row.genre?.trim()) missing.push("genre");
  if (!row.cover_image_url?.trim()) missing.push("cover");
  return missing;
}

export function useAuthorBook(): AuthorBookResult {
  const { user, isReady } = useAuthReady();
  const [hasBook, setHasBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("your book");
  const [book, setBook] = useState<AuthorBook | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<BookMissingField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setHasBook(false);
      setBookTitle("your book");
      setBook(null);
      setBookId(null);
      setMissingFields([]);
      setIsLoading(false);
      return;
    }

    const fetchBook = async () => {
      setIsLoading(true);
      try {
        const authUserId = user.id;
        console.log("[useAuthorBook] auth user ready:", authUserId);

        // Primary lookup: books.author_id = auth.users.id
        const { data: primary, error: primaryErr } = await supabase
          .from("books")
          .select("id, title, author_name, genre, description, cover_image_url")
          .eq("author_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (primaryErr) console.error("[useAuthorBook] primary query error:", primaryErr);

        let row = primary?.[0] ?? null;

        // Sequential fallback ONLY if primary returned zero rows.
        // Some legacy rows may use a different id reference; verify via author_profiles.user_id.
        if (!row) {
          const { data: profile } = await supabase
            .from("author_profiles")
            .select("id, user_id")
            .eq("user_id", authUserId)
            .maybeSingle();

          if (profile?.user_id && profile.user_id !== authUserId) {
            const { data: fallback } = await supabase
              .from("books")
              .select("id, title, author_name, genre, description, cover_image_url")
              .eq("author_id", profile.user_id)
              .order("created_at", { ascending: false })
              .limit(1);
            row = fallback?.[0] ?? null;
          }

          // Final fallback: author_context book_title (no full book row)
          if (!row && profile?.id) {
            const { data: ctxRows } = await supabase
              .from("author_context")
              .select("book_title")
              .eq("author_id", profile.id)
              .order("created_at", { ascending: false })
              .limit(1);
            const ctxTitle = ctxRows?.[0]?.book_title;
            if (ctxTitle) {
              setHasBook(true);
              setBookTitle(ctxTitle);
              setBook({ id: "", title: ctxTitle });
              setBookId(null);
              setMissingFields(["description", "genre", "cover"]);
              return;
            }
          }
        }

        if (row?.title) {
          const missing = computeMissing(row);
          console.log("[useAuthorBook] resolved:", row.title, "missing:", missing);
          setHasBook(true);
          setBookTitle(row.title);
          setBookId(row.id);
          setMissingFields(missing);
          setBook({
            id: row.id,
            title: row.title,
            author: row.author_name || undefined,
            genre: row.genre || undefined,
            description: row.description || undefined,
            coverUrl: row.cover_image_url || undefined,
          });
        } else {
          console.log("[useAuthorBook] No book found for user:", authUserId);
          setHasBook(false);
          setBookTitle("your book");
          setBook(null);
          setBookId(null);
          setMissingFields([]);
        }
      } catch (err) {
        console.error("[useAuthorBook] Unexpected error:", err);
        setHasBook(false);
        setBookTitle("your book");
        setBook(null);
        setBookId(null);
        setMissingFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [isReady, user]);

  // "Complete enough" for builder generation: title + (description OR genre)
  const isComplete =
    hasBook &&
    !missingFields.includes("title") &&
    !(missingFields.includes("description") && missingFields.includes("genre"));

  return { hasBook, bookTitle, book, bookId, missingFields, isComplete, isLoading };
}
