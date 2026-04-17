import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

export interface AuthorBook {
  title: string;
  author?: string;
  genre?: string;
}

export interface AuthorBookResult {
  hasBook: boolean;
  bookTitle: string;
  book: AuthorBook | null;
  isLoading: boolean;
}

export function useAuthorBook(): AuthorBookResult {
  const { user, isReady } = useAuthReady();
  const [hasBook, setHasBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("your book");
  const [book, setBook] = useState<AuthorBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setHasBook(false);
      setBookTitle("your book");
      setBook(null);
      setIsLoading(false);
      return;
    }

    const fetchBook = async () => {
      setIsLoading(true);
      try {
        const authUserId = user.id;
        console.log("[useAuthorBook] auth user ready:", authUserId);

        // Use limit(1) + [0] to safely handle the case where multiple book rows exist
        // (.maybeSingle() throws PGRST116 when >1 row matches)
        const { data: booksData, error: bookError } = await supabase
          .from("books")
          .select("title, author_name, genre")
          .eq("author_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (bookError) {
          console.error("[useAuthorBook] Error querying books:", bookError);
        }
        const bookData = booksData?.[0] || null;

        // Fallback: check author_context using author_profiles.id
        let contextTitle: string | null = null;
        if (!bookData?.title) {
          const { data: profile } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", authUserId)
            .maybeSingle();

          if (profile?.id) {
            const { data: contextRows } = await supabase
              .from("author_context")
              .select("book_title")
              .eq("author_id", profile.id)
              .order("created_at", { ascending: false })
              .limit(1);
            contextTitle = contextRows?.[0]?.book_title || null;
          }
        }

        const detectedTitle = bookData?.title || contextTitle || null;
        console.log("[useAuthorBook] resolved title:", detectedTitle);

        if (detectedTitle) {
          setHasBook(true);
          setBookTitle(detectedTitle);
          setBook({
            title: detectedTitle,
            author: bookData?.author_name || undefined,
            genre: bookData?.genre || undefined,
          });
        } else {
          console.log("[useAuthorBook] No book found for user:", authUserId);
          setHasBook(false);
          setBookTitle("your book");
          setBook(null);
        }
      } catch (err) {
        console.error("[useAuthorBook] Unexpected error:", err);
        setHasBook(false);
        setBookTitle("your book");
        setBook(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [isReady, user]);

  return { hasBook, bookTitle, book, isLoading };
}
