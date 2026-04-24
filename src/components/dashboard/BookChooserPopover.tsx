import { BookOpen } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MyBook } from "@/hooks/useMyBooks";
import type { PerBookStats } from "@/hooks/useAuthorStats";

interface Props {
  /** Trigger element (e.g. the sidebar button). */
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: MyBook[];
  perBook?: Record<string, PerBookStats>;
  /** Human label for the destination — appears in the popover title. */
  destinationLabel: string;
  onPick: (bookId: string) => void;
}

/**
 * Lightweight popover used by the sidebar when an author has multiple books and
 * tries to enter a per-book builder (Brand / Build / Yield / Review) without an
 * active book context. Forces them to pick which book the work is for.
 */
export default function BookChooserPopover({
  children,
  open,
  onOpenChange,
  books,
  perBook,
  destinationLabel,
  onPick,
}: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Which book is this for?
          </p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            {destinationLabel} is built per book.
          </p>
        </div>
        <div className="max-h-[320px] overflow-y-auto py-1">
          {books.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">No books yet.</p>
          )}
          {books.map((b) => {
            const s = perBook?.[b.id];
            const total = s?.total ?? 0;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onPick(b.id);
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                {b.cover_image_url ? (
                  <img
                    src={b.cover_image_url}
                    alt=""
                    className="h-9 w-7 rounded object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="h-9 w-7 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground">{total}/28 streams built</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
