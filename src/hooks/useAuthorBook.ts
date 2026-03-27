import { useEffect, useState } from "react";
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

export function useAuthorBook(authorId: string | null | undefined): AuthorBookResult {
  const [hasBook, setHasBook] = useState(false);
  const [bookTitle, setBookTitle] = useState("your book");
  const [book, setBook] = useState<AuthorBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authorId) {
      setHasBook(false);
      setBookTitle("your book");
      setBook(null);
      setIsLoading(false);
      return;
    }

    async function detectBook() {
      setIsLoading(true);
      try {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("id, user_id")
          .eq("id", authorId)
          .maybeSingle();

        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData?.user?.email?.toLowerCase() || null;
        const profileUserId = profile?.user_id || authorId;

        let booksQuery = supabase
          .from("books")
          .select("title, author_name, genre")
          .order("created_at", { ascending: false })
          .limit(1);

        if (userEmail) {
          booksQuery = booksQuery.or(`author_id.eq.${profileUserId},owner_email.eq.${userEmail}`);
        } else {
          booksQuery = booksQuery.eq("author_id", profileUserId);
        }

        const { data: bookData } = await booksQuery.maybeSingle();

        const { data: contextData } = await supabase
          .from("author_context")
          .select("book_title")
          .eq("author_id", profile?.id || authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const detectedTitle = bookData?.title || contextData?.book_title || null;

        if (detectedTitle) {
          setHasBook(true);
          setBookTitle(detectedTitle);
          setBook({
            title: detectedTitle,
            author: bookData?.author_name || undefined,
            genre: bookData?.genre || undefined,
          });
        } else {
          setHasBook(false);
          setBookTitle("your book");
          setBook(null);
        }
      } catch (err) {
        console.error("useAuthorBook error:", err);
        setHasBook(false);
        setBookTitle("your book");
        setBook(null);
      } finally {
        setIsLoading(false);
      }
    }

    detectBook();
  }, [authorId]);

  return { hasBook, bookTitle, book, isLoading };
}
