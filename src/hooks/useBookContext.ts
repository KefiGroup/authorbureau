import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import type { AuthorBook, BookMissingField } from "@/hooks/useAuthorBook";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const HOOK_VERSION = "v3-2026-04-20-context-first";

const ACTIVE_TIERS = new Set(["brand", "build", "yield"]);

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
   *  - Subscription is inactive, OR
   *  - author_context row does not exist (ABBY analysis never run)
   * Missing book fields (title/cover/etc) are NEVER hard gates.
   */
  shouldGate: boolean;
}

interface FetchedContext {
  authorId: string | null;
  bookTitle: string;
  bookId: string | null;
  book: AuthorBook | null;
  hasSubscription: boolean;
  hasContext: boolean;
  missingFields: BookMissingField[];
  isComplete: boolean;
}

async function fetchBookContext(userId: string): Promise<FetchedContext> {
  // 1) Resolve author_profiles → id + subscription_tier
  const { data: profile } = await supabase
    .from("author_profiles")
    .select("id, subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();

  const authorId = profile?.id ?? null;
  const tier = (profile?.subscription_tier ?? "").toLowerCase();
  const hasSubscription = ACTIVE_TIERS.has(tier);

  if (!authorId) {
    return {
      authorId: null,
      bookTitle: "your book",
      bookId: null,
      book: null,
      hasSubscription,
      hasContext: false,
      missingFields: [],
      isComplete: false,
    };
  }

  // 2) Read author_context (primary source for onboarded authors)
  const { data: ctx } = await supabase
    .from("author_context")
    .select("book_title")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasContext = !!ctx;

  if (ctx?.book_title) {
    return {
      authorId,
      bookTitle: ctx.book_title,
      bookId: null,
      book: { id: "", title: ctx.book_title } as AuthorBook,
      hasSubscription,
      hasContext: true,
      missingFields: [],
      isComplete: true,
    };
  }

  // 3) Fallback: get-author-book edge function (edge cases / migration)
  try {
    const token = await getActiveToken();
    if (token) {
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
        20000
      );
      if (res.ok) {
        const json = await res.json();
        const book: AuthorBook | null = json.book ?? null;
        return {
          authorId,
          bookTitle: book?.title ?? "your book",
          bookId: book?.id ?? null,
          book,
          hasSubscription,
          hasContext,
          missingFields: json.missingFields ?? [],
          isComplete: !!json.isComplete,
        };
      }
    }
  } catch (err) {
    console.error("[useBookContext] edge fallback failed:", err);
  }

  return {
    authorId,
    bookTitle: "your book",
    bookId: null,
    book: null,
    hasSubscription,
    hasContext,
    missingFields: [],
    isComplete: false,
  };
}

export function useBookContext(): BookContextResult {
  const { user, isReady } = useAuthReady();

  const { data, isLoading } = useQuery({
    queryKey: ["book-context", user?.id ?? "anon"],
    queryFn: () => fetchBookContext(user!.id),
    enabled: isReady && !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (!isReady || !user) {
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
      isLoading: !isReady,
      shouldGate: false, // don't gate while auth resolving
    };
  }

  const ctx = data;
  const hasSubscription = !!ctx?.hasSubscription;
  const hasContext = !!ctx?.hasContext;

  // Approved gating rule: ONLY gate on inactive subscription OR no author_context row
  const shouldGate = !isLoading && (!hasSubscription || !hasContext);

  return {
    bookTitle: ctx?.bookTitle ?? "your book",
    bookId: ctx?.bookId ?? null,
    book: ctx?.book ?? null,
    authorId: ctx?.authorId ?? null,
    hasSubscription,
    hasContext,
    hasBook: !!ctx?.book,
    missingFields: ctx?.missingFields ?? [],
    isComplete: !!ctx?.isComplete,
    isLoading,
    shouldGate,
  };
}
