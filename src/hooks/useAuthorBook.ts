import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [hasBook, setHasBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("your book");
  const [book, setBook] = useState<AuthorBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      setIsLoading(true);
      try {
        // Get auth.users.id DIRECTLY from the session — no profile table needed
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user?.id) {
          console.error("[useAuthorBook] No authenticated user:", userError);
          setHasBook(false);
          setBookTitle("your book");
          setBook(null);
          setIsLoading(false);
          return;
        }

        const authUserId = user.id;
        const userEmail = user.email?.toLowerCase() || null;
        console.log("[useAuthorBook] auth.users.id from session:", authUserId);

        // Query books directly with auth.users.id
        let booksQuery = supabase
          .from("books")
          .select("title, author_name, genre")
          .order("created_at", { ascending: false })
          .limit(1);

        if (userEmail) {
          booksQuery = booksQuery.or(`author_id.eq.${authUserId},owner_email.eq.${userEmail}`);
        } else {
          booksQuery = booksQuery.eq("author_id", authUserId);
        }

        const { data: bookData, error: bookError } = await booksQuery.maybeSingle();

        if (bookError) {
          console.error("[useAuthorBook] Error querying books:", bookError);
        }

        // Fallback: check author_context using author_profiles.id
        let contextTitle: string | null = null;
        if (!bookData?.title) {
          const { data: profile } = await supabase
            .from("author_profiles")
            .select("id")
            .eq("user_id", authUserId)
            .maybeSingle();

          if (profile?.id) {
            const { data: contextData } = await supabase
              .from("author_context")
              .select("book_title")
              .eq("author_id", profile.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            contextTitle = contextData?.book_title || null;
          }
        }

        const detectedTitle = bookData?.title || contextTitle || null;

        if (detectedTitle) {
          console.log("[useAuthorBook] Book found:", detectedTitle);
          setHasBook(true);
          setBookTitle(detectedTitle);
          setBook({
            title: detectedTitle,
            author: bookData?.author_name || undefined,
            genre: bookData?.genre || undefined,
          });
        } else {
          console.log("[useAuthorBook] No book found for auth_user_id:", authUserId);
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
  }, []);

  return { hasBook, bookTitle, book, isLoading };
}
