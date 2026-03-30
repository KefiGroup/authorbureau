import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import FullPlanDialog from "@/components/dashboard/FullPlanDialog";
import {
  BookOpen, Loader2, Sparkles, TrendingUp, BarChart3, Hammer, CheckCircle2,
} from "lucide-react";
import type { Book } from "./types";

interface BookSelectionViewProps {
  books: Book[];
  loadingBooks: boolean;
  analyzedBookIds: Set<string>;
  manuscriptBookIds: Set<string>;
  planSummaries: Record<string, any>;
  authorName: string;
  onBookSelect: (book: Book, skipAnimation?: boolean) => void;
  onManuscriptUploaded: () => void;
  onManuscriptGateSkip: () => void;
  showManuscriptGate: boolean;
  setShowManuscriptGate: (v: boolean) => void;
  pendingBookSelection: Book | null;
}

export default function BookSelectionView({
  books, loadingBooks, analyzedBookIds, manuscriptBookIds, planSummaries,
  authorName, onBookSelect, onManuscriptUploaded, onManuscriptGateSkip,
  showManuscriptGate, setShowManuscriptGate, pendingBookSelection,
}: BookSelectionViewProps) {
  const navigate = useNavigate();
  const [viewPlanBook, setViewPlanBook] = useState<Book | null>(null);

  const analyzedBooks = books.filter(b => analyzedBookIds.has(b.id));
  const unanalyzedBooks = books.filter(b => !analyzedBookIds.has(b.id));
  const hasAnalyzed = analyzedBooks.length > 0;
  const totalStreams = Object.values(planSummaries).reduce((sum: number, p: any) => sum + (p?.products?.length || 0), 0);
  const totalBuilt = 0;

  if (loadingBooks) {
    return (
      <div className="max-w-5xl space-y-6 pt-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          <p className="text-sm text-muted-foreground">Loading your books...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl space-y-8">
        {!hasAnalyzed ? (
          <>
            {/* Simplified ABBY Introduction */}
            <div className="text-center max-w-xl mx-auto pt-4">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <motion.div
                  className="w-20 h-20 rounded-full bg-secondary/10 border-[3px] border-secondary/40 flex items-center justify-center text-3xl"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  👩‍💼
                </motion.div>
                <motion.div
                  className="absolute -top-1 -right-1 text-lg"
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ✨
                </motion.div>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1">
                Hi{authorName ? ` ${authorName}` : ""}! 👋
              </h2>
              <p className="text-sm text-secondary font-semibold mb-3">I'm ABBY — your AI Business Consultant.</p>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-2">
                Upload your manuscript and I'll show you exactly how to turn your book into a business that earns <strong className="text-foreground">$50K–$200K/year</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                This takes about 5 minutes. Your plan is saved forever and it's completely free.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Select a Book to Begin</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-heading text-2xl font-bold">Your ABBY Business Plans</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Abby has analyzed {analyzedBooks.length} of your {books.length} book{books.length !== 1 ? "s" : ""}. Here's what she found.
              </p>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-secondary shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">{totalStreams}</p>
                  <p className="text-[11px] text-muted-foreground">Revenue Streams Mapped</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">$4K–$8K/mo</p>
                  <p className="text-[11px] text-muted-foreground">Projected Revenue</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <Hammer className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">{totalBuilt}</p>
                  <p className="text-[11px] text-muted-foreground">Products Built So Far</p>
                </div>
              </Card>
            </div>

            {/* Analyzed Books */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Analyzed Books</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="space-y-3">
                {analyzedBooks.map((book) => {
                  const plan = planSummaries[book.id] || {};
                  const streamCount = plan.products?.length || 0;
                  return (
                    <Card key={book.id} className="p-4 flex gap-4">
                      <div className="w-[100px] h-[140px] rounded-lg overflow-hidden bg-muted shrink-0">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground/30" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-base truncate">{book.title}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Analyzed
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {streamCount} streams mapped · Revenue projected
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setViewPlanBook(book)}>
                            View Full Plan
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onBookSelect(book)}>
                            Chat with Abby
                          </Button>
                          <Button size="sm" className="text-xs h-7 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => navigate(`/dashboard/book/${book.id}?from=start-building`)}>
                            Start Building →
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Not Yet Analyzed */}
            {unanalyzedBooks.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Not Yet Analyzed</span>
                  <div className="flex-1 border-t border-border" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Book Cards for selection */}
        {(hasAnalyzed ? unanalyzedBooks : books).length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(hasAnalyzed ? unanalyzedBooks : books).map((book) => {
              const hasManuscript = manuscriptBookIds.has(book.id);
              return (
                <Card
                  key={book.id}
                  className="overflow-hidden cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/30 transition-all group"
                  onClick={() => onBookSelect(book)}
                >
                  <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-heading font-semibold text-sm line-clamp-1">{book.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">
                      {book.subtitle || book.genre || ""}
                    </p>
                    {hasAnalyzed && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        ⏳ Not Analyzed
                      </span>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="lg" className="flex-1 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-1.5 font-semibold shadow-md">
                        <Sparkles className="h-4 w-4" />
                        {hasManuscript ? "Start My Business Plan with ABBY →" : "Upload Manuscript First"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic text-center">
                      Free · 5 minutes · Saved forever
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {books.length === 0 && !loadingBooks && (
          <Card className="flex flex-col items-center justify-center py-12 px-8 text-center border-dashed max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-heading font-semibold mb-2">No books found</h3>
            <p className="text-sm text-muted-foreground">Add a book in "My Books Hub" first.</p>
          </Card>
        )}
      </div>

      {/* Manuscript Gate Dialog */}
      <Dialog open={showManuscriptGate} onOpenChange={(o) => !o && setShowManuscriptGate(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-lg">👩‍💼</div>
              <div>
                <DialogTitle className="font-heading text-base">Abby needs your manuscript</DialogTitle>
                <DialogDescription className="text-xs">
                  To give you the best strategy for <strong>"{pendingBookSelection?.title}"</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed">
              <p>"Before we start, I'd love to <strong>read your entire book</strong> so I can give you strategic advice based on your actual content."</p>
              <p className="mt-2 text-xs italic">— Abby, Your AI Business Consultant</p>
            </div>
            {pendingBookSelection && (
              <ManuscriptUpload bookId={pendingBookSelection.id} bookTitle={pendingBookSelection.title} onUploadComplete={onManuscriptUploaded} onContinue={onManuscriptUploaded} />
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={onManuscriptGateSkip}>
              Skip — consult without manuscript (less personalized)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FullPlanDialog
        open={!!viewPlanBook}
        onOpenChange={(open) => { if (!open) setViewPlanBook(null); }}
        bookId={viewPlanBook?.id || ""}
        bookTitle={viewPlanBook?.title || ""}
      />
    </>
  );
}
