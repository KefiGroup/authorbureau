import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

/**
 * Resolves the public slug of the book a builder is currently working on.
 *
 * Every public module page lives at /{author}/{book}/{node}. Screens that show
 * an author "your page is live at" link must therefore know the book slug, or
 * the link collapses to the ambiguous 2-segment shape and can open a different
 * book's page with the same module.
 *
 * The book id comes from the `bookId` query parameter that every builder route
 * carries. Resolution goes through the `get-author-book` edge function (the
 * standard ownership-safe lookup) rather than a direct table read.
 */
export function useBookSlug(explicitBookId?: string | null): string | null {
  const [searchParams] = useSearchParams();
  const bookId = explicitBookId ?? searchParams.get("bookId");
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setSlug(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!projectId || !anonKey) return;
        const token = (await getActiveToken()) ?? anonKey;
        const res = await fetchWithTimeout(
          `https://${projectId}.supabase.co/functions/v1/get-author-book?bookId=${encodeURIComponent(bookId)}`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
          20000,
        );
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && typeof json?.book?.slug === "string") {
          setSlug(json.book.slug);
        }
      } catch {
        /* no link is shown until the exact book slug is known */
      }
    })();

    return () => { cancelled = true; };
  }, [bookId]);

  return slug;
}
