import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BookOpen, Plus, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { resolveActiveBookId, rememberActiveBookId } from "@/lib/book-nav";

interface BookSummary {
  id: string;
  title: string;
  cover_image_url: string | null;
}

/**
 * Persistent header dropdown for switching between an author's books.
 *
 * Visibility rules:
 *  - Inside /dashboard/book/:bookId/* — always visible
 *  - Inside /node-builder/:nodeId?bookId=... — visible
 *  - Elsewhere — hidden (book selection happens on the Books Hub page)
 */
export default function HeaderBookSwitcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const inBookContext = useMemo(() => {
    if (location.pathname.startsWith("/dashboard/book/")) return true;
    if (location.pathname.startsWith("/node-builder/")) return true;
    return false;
  }, [location.pathname]);

  const activeBookId = useMemo(() => {
    return (params as any)?.bookId || resolveActiveBookId();
  }, [params, location.search, location.pathname]);

  useEffect(() => {
    if (activeBookId) rememberActiveBookId(activeBookId);
  }, [activeBookId]);

  useEffect(() => {
    if (!user || !inBookContext) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getActiveToken();
        if (!token) return;
        const res = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }
        );
        const result = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(result.books)) {
          setBooks(
            result.books.map((b: any) => ({
              id: b.id,
              title: b.title,
              cover_image_url: b.cover_image_url || null,
            }))
          );
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, inBookContext]);

  if (!inBookContext) return null;

  const activeBook = books.find((b) => b.id === activeBookId) || null;

  const switchTo = (bookId: string) => {
    // Preserve current tab if we're inside book hub
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab") || "overview";
    navigate(`/dashboard/book/${bookId}?tab=${tab}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 max-w-[220px]"
          title="Switch book"
        >
          {activeBook?.cover_image_url ? (
            <img
              src={activeBook.cover_image_url}
              alt=""
              className="h-5 w-4 rounded-sm object-cover border border-border"
            />
          ) : (
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="truncate text-xs font-medium">
            {activeBook?.title || (loading ? "Loading…" : "Select book")}
          </span>
          <ChevronsUpDown className="h-3 w-3 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Your books</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <div className="px-2 py-3 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Loading
          </div>
        )}
        {!loading && books.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            No books yet
          </div>
        )}
        {books.map((book) => (
          <DropdownMenuItem
            key={book.id}
            onClick={() => switchTo(book.id)}
            className="cursor-pointer gap-2"
          >
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt=""
                className="h-6 w-5 rounded-sm object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-6 w-5 rounded-sm bg-muted border border-border shrink-0 flex items-center justify-center">
                <BookOpen className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs flex-1 truncate">{book.title}</span>
            {book.id === activeBookId && (
              <Check className="h-3 w-3 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/dashboard?section=my-books")}
          className="cursor-pointer text-xs gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Add a new book
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
