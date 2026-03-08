import { useState, useMemo } from "react";
import { Loader2, RefreshCw, Search, BookOpen, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AdminBook } from "@/types/admin";

interface BooksTabProps {
  books: AdminBook[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (bookId: string) => Promise<void>;
  onApprove?: (bookId: string) => Promise<void>;
  onReject?: (bookId: string) => Promise<void>;
  deletingId: string | null;
  approvingId?: string | null;
  pendingCount?: number;
  page: number;
  setPage: (p: number) => void;
  filter?: string;
  setFilter?: (f: string) => void;
}

export default function BooksTab({
  books, loading, onRefresh, onDelete, onApprove, onReject,
  deletingId, approvingId, pendingCount = 0, page, setPage, filter = "all", setFilter,
}: BooksTabProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          !search ||
          b.title?.toLowerCase().includes(search.toLowerCase()) ||
          b.author_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [books, search]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-bold">Books</h2>
          <Badge variant="secondary" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" /> {books.length}
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} pending approval
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "published", label: "Published" },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter?.(f.key)}
              className={filter === f.key ? "bg-secondary text-secondary-foreground" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No books found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {search ? "Try a different search term" : filter === "pending" ? "No books pending approval" : "No books have been added yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const isPending = !b.published_at;
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id} className={`rounded-xl border bg-card shadow-sm overflow-hidden ${isPending ? "border-amber-200 bg-amber-50/30" : "border-border"}`}>
                {/* Summary row */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {b.cover_image_url && (
                    <img src={b.cover_image_url} alt={b.title} className="h-16 w-12 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.author_name}</p>
                    {b.created_at && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Added {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {b.genre && (
                      <Badge variant="outline" className="text-xs">{b.genre}</Badge>
                    )}
                    <Badge variant={isPending ? "destructive" : "secondary"} className="text-xs">
                      {isPending ? "Pending" : "Published"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Expand/collapse */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{isExpanded ? "Less" : "Review"}</span>
                    </Button>

                    {isPending && onApprove && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={approvingId === b.id}
                        onClick={() => onApprove(b.id)}
                      >
                        {approvingId === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-1" /> Approve</>
                        )}
                      </Button>
                    )}

                    {!isPending && onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        disabled={approvingId === b.id}
                        onClick={() => onReject(b.id)}
                      >
                        {approvingId === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><XCircle className="h-4 w-4 mr-1" /> Unpublish</>
                        )}
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deletingId === b.id}>
                          {deletingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{b.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this book and its microsite. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Cover + basic info */}
                      <div className="flex flex-col items-center gap-3">
                        {b.cover_image_url ? (
                          <img src={b.cover_image_url} alt={b.title} className="h-48 w-auto rounded-lg object-cover shadow-md" />
                        ) : (
                          <div className="h-48 w-32 rounded-lg bg-muted flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                        {b.bestseller_proof_url && (
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">Bestseller Proof</p>
                            <img src={b.bestseller_proof_url} alt="Bestseller proof" className="h-20 w-auto rounded border" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="md:col-span-2 space-y-3">
                        <div>
                          <h3 className="font-heading text-lg font-bold">{b.title}</h3>
                          {b.subtitle && <p className="text-sm text-muted-foreground italic">{b.subtitle}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <DetailRow label="Author" value={b.author_name} />
                          <DetailRow label="Genre" value={b.genre} />
                          <DetailRow label="Pages" value={b.pages?.toString()} />
                          <DetailRow label="Entry Mode" value={b.entry_mode} />
                          <DetailRow label="Owner Email" value={b.owner_email} />
                          <DetailRow label="Slug" value={b.slug} />
                          {b.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-xs font-medium">Rating:</span>
                              <div className="flex items-center gap-0.5">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-medium">{b.rating}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pricing */}
                        {(b.price || b.kindle_price || b.paperback_price) && (
                          <div className="pt-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Pricing ({b.currency || "USD"})</p>
                            <div className="flex gap-3">
                              {b.price && <Badge variant="outline" className="text-xs">Price: {b.price}</Badge>}
                              {b.kindle_price && <Badge variant="outline" className="text-xs">Kindle: {b.kindle_price}</Badge>}
                              {b.paperback_price && <Badge variant="outline" className="text-xs">Paperback: {b.paperback_price}</Badge>}
                            </div>
                          </div>
                        )}

                        {/* Badges */}
                        {b.badges && b.badges.length > 0 && (
                          <div className="pt-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Badges</p>
                            <div className="flex flex-wrap gap-1.5">
                              {b.badges.map((badge, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{badge}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {b.description && (
                          <div className="pt-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-foreground leading-relaxed line-clamp-5">{b.description}</p>
                          </div>
                        )}

                        {/* Amazon link */}
                        {b.amazon_url && (
                          <a href={b.amazon_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline pt-1">
                            <ExternalLink className="h-3.5 w-3.5" /> View on Amazon
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button variant="outline" size="sm" disabled={books.length < 20} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground text-xs font-medium">{label}:</span>{" "}
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}
