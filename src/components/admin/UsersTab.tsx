import { useState, useMemo } from "react";
import { Loader2, RefreshCw, Search, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/types/admin";

interface UsersTabProps {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
  page: number;
  setPage: (p: number) => void;
}

export default function UsersTab({ users, loading, onRefresh, page, setPage }: UsersTabProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !search ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.display_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
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
          <h2 className="font-heading text-xl font-bold">Users</h2>
          <Badge variant="secondary" className="text-xs">
            <UsersIcon className="h-3 w-3 mr-1" /> {users.length}
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
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UsersIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No users found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {search ? "Try a different search term" : "No users have signed up yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.display_name || u.email}</p>
                {u.display_name && <p className="text-sm text-muted-foreground truncate">{u.email}</p>}
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{new Date(u.created_at).toLocaleDateString()}</p>
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
        <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
