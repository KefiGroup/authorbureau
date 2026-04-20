import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function fetchAuthorBook(): Promise<{
  book: AuthorBook | null;
  missingFields: BookMissingField[];
  isComplete: boolean;
}> {
  const token = await getActiveToken();
  if (!token) {
    return { book: null, missingFields: [], isComplete: false };
  }

  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/get-author-book`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
    20000
  );

  if (!res.ok) {
    console.error("[useAuthorBook] edge function error:", res.status);
    return { book: null, missingFields: [], isComplete: false };
  }

  const json = await res.json();
  return {
    book: json.book ?? null,
    missingFields: json.missingFields ?? [],
    isComplete: !!json.isComplete,
  };
}

export function useAuthorBook(): AuthorBookResult {
  const { user, isReady } = useAuthReady();

  const { data, isLoading } = useQuery({
    queryKey: ["author-book", user?.id ?? "anon"],
    queryFn: fetchAuthorBook,
    enabled: isReady && !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  if (!isReady || !user) {
    return {
      hasBook: false,
      bookTitle: "your book",
      book: null,
      bookId: null,
      missingFields: [],
      isComplete: false,
      isLoading: !isReady,
    };
  }

  const book = data?.book ?? null;
  const missingFields = data?.missingFields ?? [];

  return {
    hasBook: !!book,
    bookTitle: book?.title ?? "your book",
    book,
    bookId: book?.id ?? null,
    missingFields,
    isComplete: !!data?.isComplete,
    isLoading,
  };
}
