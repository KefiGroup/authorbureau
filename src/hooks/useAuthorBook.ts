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

export function useAuthorBook(authorProfileId: string | null | undefined): AuthorBookResult {
  const [hasBook, setHasBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("your book");
  const [book, setBook] = useState<AuthorBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authorProfileId) {
      setHasBook(false);
      setBookTitle("your book");
      setBook(null);
      setIsLoading(false);
      return;
    }

    const fetchBook = async () => {
      setIsLoading(true);
      try {
        // Step 1: Get the auth.users.id from author_profiles
        const { data: profile, error: profileError } = await supabase
          .from("author_profiles")
          .select("user_id")
          .eq("id", authorProfileId)
          .single();

        if (profileError || !profile?.user_id) {
          console.error("[useAuthorBook] Could not fetch user_id from author_profiles:", profileError);
          setHasBook(false);
          setBookTitle("your book");
          setBook(null);
          setIsLoading(false);
          return;
        }

        const authUserId = profile.user_id;
        console.log("[useAuthorBook] author_profile_id:", authorProfileId, "auth_user_id:", authUserId);

        // Step 2: Get user email for owner_email fallback
        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData?.user?.email?.toLowerCase() || null;

        // Step 3: Query books using auth.users.id (NOT author_profiles.id)
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

        // Step 4: Fallback to author_context
        const { data: contextData } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", authorProfileId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const detectedTitle = bookData?.title || contextData?.book_title || null;

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
  }, [authorProfileId]);

  return { hasBook, bookTitle, book, isLoading };
}
