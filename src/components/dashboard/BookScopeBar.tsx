import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMyBooks } from "@/hooks/useMyBooks";
import { resolveScopedBookId } from "@/lib/active-book-scope";

export const ALL_BOOKS_SCOPE = "all";

/**
 * Shared book scope state for author workspaces (Funnels, CRM, etc.).
 * Defaults to the book in the URL (?book= / ?bookId= / /book/<id>/), else "all".
 * Choosing a book mirrors it into ?book= so links and refreshes stay on that book.
 */
export function useBookScope(userId: string | undefined) {
  const { books } = useMyBooks(userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [scope, setScopeState] = useState<string>(() => resolveScopedBookId() ?? ALL_BOOKS_SCOPE);
  const setScope = (id: string) => {
    setScopeState(id);
    const sp = new URLSearchParams(searchParams);
    sp.set("book", id);
    setSearchParams(sp, { replace: true });
  };
  return { books, scope, setScope };
}

interface Props {
  books: { id: string; title: string }[];
  scope: string;
  onChange: (id: string) => void;
  /** Optional label shown for rows with no book recorded. */
  className?: string;
}

export default function BookScopeBar({ books, scope, onChange, className }: Props) {
  if (books.length < 2) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground mr-1">Showing:</span>
      {books.map((b) => (
        <Button
          key={b.id}
          size="sm"
          variant={scope === b.id ? "default" : "outline"}
          onClick={() => onChange(b.id)}
          className="max-w-[260px] truncate"
        >
          {b.title}
        </Button>
      ))}
      <Button
        size="sm"
        variant={scope === ALL_BOOKS_SCOPE ? "default" : "outline"}
        onClick={() => onChange(ALL_BOOKS_SCOPE)}
      >
        All books
      </Button>
    </div>
  );
}
