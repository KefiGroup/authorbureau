import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { resolveScopedBookId } from "@/lib/active-book-scope";


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

async function fetchAuthorBook(scopeBookId: string | null): Promise<{
  book: AuthorBook | null;
  missingFields: BookMissingField[];
  isComplete: boolean;
}> {
  const token = await getActiveToken();
  if (!token) {
    return { book: null, missingFields: [], isComplete: false };
  }

  const url = new URL(`${SUPABASE_URL}/functions/v1/get-author-book`);
  if (scopeBookId) url.searchParams.set("bookId", scopeBookId);

  const res = await fetchWithTimeout(
    url.toString(),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-hook-version": "v3-2026-09-30-book-scoped",
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

/**
 * @param overrideBookId when omitted the hook scopes itself to the book in the
 * current route (?bookId= or /book/<id>/). It never falls back to the author's
 * most recent book when a route book is present.
 */
export function useAuthorBook(overrideBookId?: string | null): AuthorBookResult {
  const { user, isReady } = useAuthReady();
  const scopeBookId = resolveScopedBookId(overrideBookId);

  const { data, isLoading } = useQuery({
    queryKey: ["author-book", user?.id ?? "anon", scopeBookId ?? "none"],
    queryFn: () => fetchAuthorBook(scopeBookId),
    enabled: isReady && !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  if (!isReady || !user) {
    return {
      hasBook: false,
      bookTitle: "your book",
      book: null,
      bookId: scopeBookId,
      missingFields: [],
      isComplete: false,
      isLoading: true,
    };
  }

  const book = data?.book ?? null;
  const missingFields = data?.missingFields ?? [];

  return {
    hasBook: !!book,
    bookTitle: book?.title ?? "your book",
    book,
    bookId: book?.id ?? scopeBookId,
    missingFields,
    isComplete: !!data?.isComplete,
    isLoading,
  };
}

