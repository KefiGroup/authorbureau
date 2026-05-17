import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ghost, Mail, Archive, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

interface GhostAuthor {
  author_profile_id: string;
  pen_name: string | null;
  author_slug: string | null;
  ghost_user_id: string;
  best_email: string | null;
  book_count: number;
  created_at: string;
}

export default function GhostAuthorsCard() {
  const [loading, setLoading] = useState(false);
  const [ghosts, setGhosts] = useState<GhostAuthor[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-ghost-authors`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" },
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to load ghosts");
      setGhosts(data.ghosts || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load ghost authors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async (g: GhostAuthor) => {
    if (!g.best_email) {
      toast.error("No email on file for this author — can't send a claim link.");
      return;
    }
    setBusyId(g.author_profile_id);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite-ghost-author`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ author_profile_id: g.author_profile_id }),
        },
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Invite failed");
      toast.success(data.message || `Invite sent to ${g.best_email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (g: GhostAuthor) => {
    if (g.book_count > 0) return;
    if (!confirm(`Archive "${g.pen_name || g.author_slug || g.author_profile_id}"? This removes the unused profile.`)) return;
    setBusyId(g.author_profile_id);
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-archive-ghost-author`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ author_profile_id: g.author_profile_id }),
        },
      );
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Archive failed");
      toast.success("Archived");
      setGhosts((prev) => prev.filter((x) => x.author_profile_id !== g.author_profile_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Ghost className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-heading text-lg font-bold">Ghost authors</h3>
            <p className="text-sm text-muted-foreground">
              Profiles whose login no longer exists. Send a claim link to repair, or archive if unused.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {loading && ghosts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ghosts.length === 0 ? (
        <p className="text-sm text-emerald-700">No ghost authors. 🎉</p>
      ) : (
        <div className="space-y-2">
          {ghosts.map((g) => (
            <div
              key={g.author_profile_id}
              className="flex items-center justify-between gap-3 p-3 rounded border bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{g.pen_name || g.author_slug || "(unnamed)"}</span>
                  <Badge variant="outline" className="text-[10px]">{g.book_count} book{g.book_count === 1 ? "" : "s"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {g.best_email ? g.best_email : <span className="italic">no email on file</span>}
                  {" · "}
                  <span className="font-mono">{g.ghost_user_id.slice(0, 8)}…</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!g.best_email || busyId === g.author_profile_id}
                  onClick={() => invite(g)}
                >
                  {busyId === g.author_profile_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                  Send claim link
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={g.book_count > 0 || busyId === g.author_profile_id}
                  onClick={() => archive(g)}
                  title={g.book_count > 0 ? "Cannot archive: profile has books" : "Archive unused profile"}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
