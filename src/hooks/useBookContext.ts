import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { resolveScopedBookId } from "@/lib/active-book-scope";
import type { AuthorBook, BookMissingField } from "@/hooks/useAuthorBook";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const HOOK_VERSION = "v4-2026-09-30-book-scoped";


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

async function fetchBookContext(scopeBookId: string | null): Promise<FetchedContext> {
  console.log("[useBookContext] queryFn START", { scopeBookId });
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

  const url = new URL(`${SUPABASE_URL}/functions/v1/get-author-book`);
  if (scopeBookId) url.searchParams.set("bookId", scopeBookId);

  const res = await fetchWithTimeout(
    url.toString(),
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
  console.log("[useBookContext] edge response:", json);
  const book: AuthorBook | null = json.book ?? null;
  const resolvedTitle: string | null =
    (json.bookTitle && String(json.bookTitle).trim()) ||
    (book?.title && String(book.title).trim()) ||
    null;

  console.log("[useBookContext] resolved title:", resolvedTitle);

  return {
    bookTitle: resolvedTitle ?? "your book",
    bookId: book?.id || null,
    book,
    hasContext: !!resolvedTitle,
    missingFields: json.missingFields ?? [],
    isComplete: !!json.isComplete,
  };
}

export function useBookContext(overrideBookId?: string | null): BookContextResult {
  const { user } = useAuth();
  const scopeBookId = resolveScopedBookId(overrideBookId);

  const { data, isLoading } = useQuery({
    queryKey: ["book-context-v4", user?.id ?? "anon", scopeBookId ?? "none"],
    queryFn: () => fetchBookContext(scopeBookId),
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });


  console.log("[useBookContext] render", {
    userId: user?.id,
    isLoading,
    data,
    hasContext: !!data?.hasContext,
    shouldGate: !isLoading && !data?.hasContext,
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

  if (isLoading) {
    return {
      bookTitle: "your book",
      bookId: scopeBookId,
      book: null,
      authorId: null,
      hasSubscription: true,
      hasContext: false,
      hasBook: false,
      missingFields: [],
      isComplete: false,
      isLoading: true,
      shouldGate: false,
    };
  }

  const ctx = data;
  const hasContext = !!ctx?.hasContext;

  // Gate ONLY when author_context (curated ABBY title) is missing
  const shouldGate = !hasContext;

  return {
    bookTitle: ctx?.bookTitle ?? "your book",
    bookId: ctx?.bookId ?? scopeBookId,

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
