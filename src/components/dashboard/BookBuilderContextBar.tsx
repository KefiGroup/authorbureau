import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reusable book context bar for all product builders.
 * Reads bookId / bookTitle / bookCoverUrl from URL search params.
 * Shows the book at the top with a back button to the Book Hub.
 */
export function useBookContext() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") || "";
  const bookTitle = searchParams.get("bookTitle") || "";
  const rawBookCoverUrl = searchParams.get("bookCoverUrl");
  const bookCoverUrl = rawBookCoverUrl
    ? (() => {
        try {
          return decodeURIComponent(rawBookCoverUrl);
        } catch (error) {
          return rawBookCoverUrl;
        }
      })()
    : null;

  return { bookId, bookTitle, bookCoverUrl };
}

interface Props {
  /** Which Book Hub tab to navigate back to. Valid: overview | revenue-streams | marketing-channels | authority-builders | review-publish | analytics. Legacy aliases (automate/build/broadcast/yield) are remapped. */
  backTab?: string;
}

const BACK_TAB_ALIASES: Record<string, string> = {
  automate: "revenue-streams",
  build: "marketing-channels",
  broadcast: "marketing-channels",
  yield: "authority-builders",
};

export default function BookBuilderContextBar({ backTab = "overview" }: Props) {
  const navigate = useNavigate();
  const { bookId, bookTitle, bookCoverUrl } = useBookContext();
  const resolvedBackTab = BACK_TAB_ALIASES[backTab] || backTab;
  const [resolvedBookCoverUrl, setResolvedBookCoverUrl] = useState<string | null>(bookCoverUrl);

  useEffect(() => {
    setResolvedBookCoverUrl(bookCoverUrl);
    if (bookCoverUrl || !bookId) return;

    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("cover_image_url")
        .eq("id", bookId)
        .maybeSingle();

      if (isMounted && data?.cover_image_url) {
        setResolvedBookCoverUrl(data.cover_image_url);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [bookCoverUrl, bookId]);

  if (!bookId) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm mb-6">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
        onClick={() => navigate(`/dashboard/book/${bookId}?tab=${backTab}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Book Hub
      </Button>

      <div className="w-px h-8 bg-border" />

      <div className="h-10 w-7 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border">
        {resolvedBookCoverUrl ? (
          <img src={resolvedBookCoverUrl} alt={decodeURIComponent(bookTitle)} className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{decodeURIComponent(bookTitle)}</p>
        <p className="text-[10px] text-muted-foreground">Product Builder</p>
      </div>
    </div>
  );
}
