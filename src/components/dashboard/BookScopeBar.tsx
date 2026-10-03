import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMyBooks } from "@/hooks/useMyBooks";
import { resolveWorkspaceBookId, rememberWorkspaceBookId } from "@/lib/active-book-scope";

export const ALL_BOOKS_SCOPE = "all";

/**
 * Shared book scope state for author workspaces (Funnels, CRM, etc.).
 * Defaults to the book in the URL, else the book last opened in this tab, else "all".
 * Choosing a book mirrors it into ?book= so links and refreshes stay on that book.
 */
export function useBookScope(userId: string | undefined) {
  const { books } = useMyBooks(userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [scope, setScopeState] = useState<string>(() => resolveWorkspaceBookId() ?? ALL_BOOKS_SCOPE);
  const setScope = (id: string) => {
    setScopeState(id);
    rememberWorkspaceBookId(id === ALL_BOOKS_SCOPE || id === "unattributed" ? null : id);
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
  className?: string;
  /** Extra scope options, e.g. [{ id: "unattributed", label: "Unattributed" }]. */
  extraOptions?: { id: string; label: string }[];
}

export default function BookScopeBar({ books, scope, onChange, className, extraOptions = [] }: Props) {
  // A single-book author still needs "All books" to recover older or
  // unattributed records that do not match the remembered book scope.
  if (books.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground mr-1">Showing:</span>
      {books.map((b) => (
        <Button
          key={b.id}
          size="sm"
          variant={scope === b.id ? "default" : "outline"}
          onClick={() => onChange(b.id)}
          className="h-auto max-w-[260px] whitespace-normal break-words py-2 text-center leading-snug"
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
      {extraOptions.map((o) => (
        <Button key={o.id} size="sm" variant={scope === o.id ? "default" : "outline"} onClick={() => onChange(o.id)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
