import { BookOpen, Plus, ArrowRight, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import type { MyBook } from "@/hooks/useMyBooks";
import type { PerBookStats } from "@/hooks/useAuthorStats";

const STREAMS_BUILT_HELP =
  "Capabilities live for this book. Counts every node whose content has passed readiness checks. Each book has its own 28 revenue streams.";

interface Props {
  books: MyBook[];
  perBook?: Record<string, PerBookStats>;
  hasPlan: boolean;
  onAddBook: () => void;
}

function getNextStepForBook(book: MyBook, total: number, hasPlan: boolean): string {
  if (!book.published_at) return "Awaiting approval";
  if (!hasPlan) return "Analyze with Abby";
  if (total === 0) return "Build first product";
  if (total < 9) return "Complete Brand stage";
  if (total < 18) return "Move into Build stage";
  if (total < 28) return "Unlock Yield streams";
  return "All 28 streams live";
}

export default function BooksGrid({ books, perBook, hasPlan, onAddBook }: Props) {
  const navigate = useNavigate();
  const isMulti = books.length > 1;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-7 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl md:text-2xl font-bold">
            {isMulti ? `Your ${books.length} books` : "Your book"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isMulti
              ? "Each book has its own 28 revenue streams. Pick a book to keep building."
              : "Click your book to enter the Book Hub and build its 28 revenue streams."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAddBook}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add another book
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">You haven't added a book yet.</p>
          <Button onClick={onAddBook} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Add your first book
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {books.map((b) => {
            const s = perBook?.[b.id];
            const total = s?.total ?? 0;
            const pct = Math.min(100, Math.round((total / 28) * 100));
            const nextStep = getNextStepForBook(b, total, hasPlan);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(`/dashboard/book/${b.id}`)}
                className="group flex flex-col rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-amber-400/60 hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
              >
                <div className="flex gap-3">
                  {b.cover_image_url ? (
                    <img
                      src={b.cover_image_url}
                      alt=""
                      className="h-20 w-14 rounded object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="h-20 w-14 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                      <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground line-clamp-2">{b.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                      {total}/28 streams built
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label="What does streams built mean?"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex"
                            >
                              <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                            {STREAMS_BUILT_HELP}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <span className="rounded bg-emerald-50 text-emerald-700 py-0.5 font-semibold">Brand {s?.brand ?? 0}/9</span>
                  <span className="rounded bg-violet-50 text-violet-700 py-0.5 font-semibold">Build {s?.build ?? 0}/9</span>
                  <span className="rounded bg-amber-50 text-amber-700 py-0.5 font-semibold">Yield {s?.yield ?? 0}/10</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                    <Sparkles className="h-3 w-3" />
                    {nextStep}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
