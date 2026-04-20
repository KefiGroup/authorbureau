import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import type { AuthorBook, BookMissingField } from "@/hooks/useAuthorBook";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const HOOK_VERSION = "v3.5-2026-04-20-gate-diagnostic";

export interface BookContextResult {
  bookTitle: string;
  bookId: string | null;
  book: AuthorBook | null;
  authorId: string | null;
  hasSubscription: boolean;
  hasContext: boolean;
  hasBook: boolean;
  missingFields: BookMissingField[];
  isComplete: boolean;
  isLoading: boolean;
  /**
   * Hard-gate condition. True ONLY when:
   *  - author_context row does not exist (ABBY analysis never run)
   * Missing book fields (title/cover/etc) are NEVER hard gates.
   */
  shouldGate: boolean;
}

interface FetchedContext {
  bookTitle: string;
  bookId: string | null;
  book: AuthorBook | null;
  hasContext: boolean;
  missingFields: BookMissingField[];
  isComplete: boolean;
}

async function fetchBookContext(): Promise<FetchedContext> {
  console.log("[useBookContext] queryFn START");
  const token = await getActiveToken();
  if (!token) {
    console.warn("[useBookContext] no active token");
    return {
      bookTitle: "your book",
      bookId: null,
      book: null,
      hasContext: false,
      missingFields: [],
      isComplete: false,
    };
  }

  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/get-author-book`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-hook-version": HOOK_VERSION,
      },
    },
    25000
  );

  if (!res.ok) {
    console.error("[useBookContext] edge function error:", res.status);
    return {
      bookTitle: "your book",
      bookId: null,
      book: null,
      hasContext: false,
      missingFields: [],
      isComplete: false,
    };
  }

  const json = await res.json();
  const book: AuthorBook | null = json.book ?? null;
  const bookTitle: string =
    (json.bookTitle && String(json.bookTitle).trim()) ||
    book?.title ||
    "your book";

  console.log("[useBookContext] resolved title:", bookTitle);

  return {
    bookTitle,
    bookId: book?.id || null,
    book,
    hasContext: !!json.bookTitle,
    missingFields: json.missingFields ?? [],
    isComplete: !!json.isComplete,
  };
}

export function useBookContext(): BookContextResult {
  const { user } = useAuth();

  console.log("[useBookContext] mount", { hasUser: !!user, userId: user?.id, version: HOOK_VERSION });

  const { data, isLoading } = useQuery({
    queryKey: ["book-context-v3.4", user?.id ?? "anon"],
    queryFn: fetchBookContext,
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  if (!user) {
    return {
      bookTitle: "your book",
      bookId: null,
      book: null,
      authorId: null,
      hasSubscription: false,
      hasContext: false,
      hasBook: false,
      missingFields: [],
      isComplete: false,
      isLoading: false,
      shouldGate: false,
    };
  }

  const ctx = data;
  const hasContext = !!ctx?.hasContext;

  // Gate ONLY when author_context (curated ABBY title) is missing
  const shouldGate = !isLoading && !hasContext;

  return {
    bookTitle: ctx?.bookTitle ?? "your book",
    bookId: ctx?.bookId ?? null,
    book: ctx?.book ?? null,
    authorId: null,
    hasSubscription: true, // subscription gating handled elsewhere; not this hook's concern
    hasContext,
    hasBook: !!ctx?.book,
    missingFields: ctx?.missingFields ?? [],
    isComplete: !!ctx?.isComplete,
    isLoading,
    shouldGate,
  };
}
