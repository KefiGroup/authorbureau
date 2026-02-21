import { useState, useMemo } from "react";
import { Loader2, RefreshCw, Search, BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AdminBook } from "@/types/admin";

interface BooksTabProps {
  books: AdminBook[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (bookId: string) => Promise<void>;
  deletingId: string | null;
  page: number;
  setPage: (p: number) => void;
}

export default function BooksTab({ books, loading, onRefresh, onDelete, deletingId, page, setPage }: BooksTabProps) {
  const [search, setSearch] = useState("");

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
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No books found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {search ? "Try a different search term" : "No books have been added yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {b.cover_image_url && (
                <img src={b.cover_image_url} alt={b.title} className="h-16 w-12 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.author_name}</p>
              </div>
              {b.genre && (
                <Badge variant="outline" className="text-xs shrink-0">{b.genre}</Badge>
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
          ))}
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
