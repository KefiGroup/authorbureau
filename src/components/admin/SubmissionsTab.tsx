import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Submission } from "@/types/admin";

interface SubmissionsTabProps {
  submissions: Submission[];
  loading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  updatingId: string | null;
  updateStatus: (id: string, status: string) => void;
  onRefresh: () => void;
  page: number;
  setPage: (p: number) => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

export default function SubmissionsTab({
  submissions, loading, filter, setFilter, updatingId, updateStatus, onRefresh, page, setPage,
}: SubmissionsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => { setFilter(f); setPage(1); }}
              className={filter === f ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* List */}
      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No submissions found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {filter !== "all" ? "Try a different filter" : "Share the Join page to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((app) => {
            const sc = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <div key={app.id} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg">{app.full_name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                        <StatusIcon className="h-3 w-3" /> {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.email}</p>
                    {app.genres && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(typeof app.genres === "string" ? app.genres.split(",") : app.genres).map((g: string) => (
                          <Badge key={g} variant="secondary" className="text-xs">{g.trim()}</Badge>
                        ))}
                      </div>
                    )}
                    {app.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{app.bio}</p>}
                    <div className="flex gap-3 mt-3 flex-wrap text-xs">
                      {app.amazon_book_url && (
                        <a href={app.amazon_book_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Amazon
                        </a>
                      )}
                      {app.website_url && (
                        <a href={app.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Website
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {app.status !== "approved" && (
                      <Button size="sm" disabled={updatingId === app.id} onClick={() => updateStatus(app.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white">
                        {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />} Approve
                      </Button>
                    )}
                    {app.status !== "rejected" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={updatingId === app.id} className="border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject {app.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reject their application. They will need to reapply if you change your mind.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateStatus(app.id, "rejected")}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Yes, Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
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
        <Button variant="outline" size="sm" disabled={submissions.length < 20} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
