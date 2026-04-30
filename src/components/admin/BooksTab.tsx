import { useState, useMemo } from "react";
import { Loader2, RefreshCw, Search, BookOpen, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, Star, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { AdminBook } from "@/types/admin";

interface BooksTabProps {
  books: AdminBook[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (bookId: string) => Promise<void>;
  onApprove?: (bookId: string) => Promise<void>;
  onReject?: (bookId: string, reason: string) => Promise<void>;
  onRequestChanges?: (bookId: string, reason: string) => Promise<void>;
  deletingId: string | null;
  approvingId?: string | null;
  pendingCount?: number;
  page: number;
  setPage: (p: number) => void;
  filter?: string;
  setFilter?: (f: string) => void;
}

type ReasonModalState = { open: boolean; mode: "reject" | "changes"; book: AdminBook | null };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending Review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 border-red-200" },
  changes_requested: { label: "Changes Requested", cls: "bg-orange-100 text-orange-800 border-orange-200" },
};

export default function BooksTab({
  books, loading, onRefresh, onDelete, onApprove, onReject, onRequestChanges,
  deletingId, approvingId, pendingCount = 0, page, setPage, filter = "all", setFilter,
}: BooksTabProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModalState>({ open: false, mode: "reject", book: null });
  const [reasonText, setReasonText] = useState("");
  const [submittingReason, setSubmittingReason] = useState(false);

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

  const openReasonModal = (mode: "reject" | "changes", book: AdminBook) => {
    setReasonText("");
    setReasonModal({ open: true, mode, book });
  };

  const submitReason = async () => {
    const trimmed = reasonText.trim();
    if (!trimmed || !reasonModal.book) return;
    setSubmittingReason(true);
    try {
      if (reasonModal.mode === "reject" && onReject) {
        await onReject(reasonModal.book.id, trimmed);
      } else if (reasonModal.mode === "changes" && onRequestChanges) {
        await onRequestChanges(reasonModal.book.id, trimmed);
      }
      setReasonModal({ open: false, mode: "reject", book: null });
      setReasonText("");
    } finally {
      setSubmittingReason(false);
    }
  };

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
            const status = (b.approval_status || (b.published_at ? "approved" : "pending")) as string;
            const statusInfo = STATUS_BADGE[status] || STATUS_BADGE.pending;
            const isLive = status === "approved" && !!b.published_at;
            const canApprove = status !== "approved";
            const canRequestChanges = status === "pending";
            const canReject = status !== "rejected";
            const isExpanded = expandedId === b.id;
            const round = b.review_round ?? 1;
            return (
              <div key={b.id} className={`rounded-xl border bg-card shadow-sm overflow-hidden ${!isLive ? "border-amber-200 bg-amber-50/30" : "border-border"}`}>
                {/* Summary row */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {b.cover_image_url && (
                    <img src={b.cover_image_url} alt={b.title} className="h-16 w-12 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.author_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.created_at && (
                        <p className="text-xs text-muted-foreground/60">
                          Added {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      )}
                      {round > 1 && (
                        <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 rounded px-1.5 py-0.5">
                          Round {round}
                        </span>
                      )}
                    </div>
                    {(status === "rejected" || status === "changes_requested") && b.rejection_note && (
                      <p className="text-[11px] mt-1 text-red-700 italic line-clamp-1" title={b.rejection_note}>
                        Note: {b.rejection_note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {b.genre && (
                      <Badge variant="outline" className="text-xs">{b.genre}</Badge>
                    )}
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{isExpanded ? "Less" : "Review"}</span>
                    </Button>

                    {canApprove && onApprove && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
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

                    {canRequestChanges && onRequestChanges && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-700 border-orange-300 hover:bg-orange-50"
                        disabled={approvingId === b.id}
                        onClick={() => openReasonModal("changes", b)}
                      >
                        <MessageSquareWarning className="h-4 w-4 mr-1" /> Request Changes
                      </Button>
                    )}

                    {canReject && onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={approvingId === b.id}
                        onClick={() => openReasonModal("reject", b)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> {isLive ? "Unpublish" : "Reject"}
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
                          <DetailRow label="Submitted" value={b.submitted_at ? new Date(b.submitted_at).toLocaleString() : undefined} />
                          <DetailRow label="Last Action" value={b.last_review_action_at ? new Date(b.last_review_action_at).toLocaleString() : undefined} />
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

                        {b.description && (
                          <div className="pt-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-foreground leading-relaxed line-clamp-5">{b.description}</p>
                          </div>
                        )}

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

      {/* Reason modal — used for both Reject and Request Changes */}
      <Dialog open={reasonModal.open} onOpenChange={(o) => !o && setReasonModal({ open: false, mode: "reject", book: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonModal.mode === "changes" ? "Request changes" : "Reject submission"}
            </DialogTitle>
            <DialogDescription>
              {reasonModal.mode === "changes"
                ? "The author will receive a notification with this note and can resubmit after editing."
                : "The author will receive a notification with this reason. Rejected books are unpublished."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Note to author <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              rows={5}
              placeholder={reasonModal.mode === "changes"
                ? "e.g. Please add a clearer subtitle and a higher-resolution cover."
                : "e.g. Cover image violates trademark guidelines."}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonModal({ open: false, mode: "reject", book: null })}>
              Cancel
            </Button>
            <Button
              onClick={submitReason}
              disabled={!reasonText.trim() || submittingReason}
              className={reasonModal.mode === "changes" ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {submittingReason ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {reasonModal.mode === "changes" ? "Send to author" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
