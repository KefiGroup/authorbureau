import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Linkedin, Instagram, Facebook, Twitter, Calendar as CalendarIcon, Sparkles, RefreshCw, Plug } from "lucide-react";
import { toast } from "sonner";

interface Props {
  authorId: string | null;
}

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  scheduled_at: string | null;
  status: string;
  error_message: string | null;
}

interface SocialConnection {
  id: string;
  platform: string;
  channel_name: string | null;
  status: string;
}

const PLATFORMS = [
  { id: "all", label: "All" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
];

function platformIcon(p: string) {
  const cls = "h-4 w-4";
  switch (p) {
    case "linkedin": return <Linkedin className={cls} />;
    case "instagram": return <Instagram className={cls} />;
    case "facebook": return <Facebook className={cls} />;
    case "x":
    case "twitter": return <Twitter className={cls} />;
    default: return <CalendarIcon className={cls} />;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    queued: { label: "Queued", variant: "secondary" },
    published: { label: "Published", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
}

export default function SocialCalendarTab({ authorId }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!authorId) return;
    setLoading(true);
    const [{ data: postsData }, { data: connData }] = await Promise.all([
      supabase
        .from("social_posts" as any)
        .select("id, platform, content, scheduled_at, status, error_message")
        .eq("author_id", authorId)
        .order("scheduled_at", { ascending: true })
        .limit(200),
      supabase
        .from("social_connections" as any)
        .select("id, platform, channel_name, status")
        .eq("author_id", authorId),
    ]);
    setPosts((postsData as any) || []);
    setConnections((connData as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [authorId]);

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter(p => {
      if (filter === "x") return p.platform === "x" || p.platform === "twitter";
      return p.platform === filter;
    });
  }, [posts, filter]);

  const syncAccounts = async () => {
    if (!authorId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-buffer-channels", {
        body: { author_id: authorId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      toast.success(`Synced ${data.count} social account${data.count === 1 ? "" : "s"}.`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Couldn't sync your social accounts.");
    } finally {
      setSyncing(false);
    }
  };

  const lastScheduled = posts
    .filter(p => p.scheduled_at)
    .reduce<string | null>((acc, p) => (!acc || (p.scheduled_at! > acc) ? p.scheduled_at! : acc), null);

  const queuedCount = posts.filter(p => p.status === "queued").length;
  const publishedCount = posts.filter(p => p.status === "published").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your Social Calendar…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ABBY card */}
      <Card className="border-secondary/30 bg-gradient-to-br from-secondary/8 via-secondary/4 to-transparent">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-amber-500 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-1">Abby</p>
            {posts.length === 0 ? (
              <p className="text-sm text-foreground">
                Your Social Calendar is empty. Once you activate your Social Media kit (BP-03), I'll schedule your posts here automatically.
              </p>
            ) : (
              <p className="text-sm text-foreground">
                Your calendar runs until <strong>{lastScheduled ? new Date(lastScheduled).toLocaleDateString() : "—"}</strong>.
                Want me to generate 20 more posts? Head back to your <strong>Social Media</strong> builder when you're ready.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats + sync */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{queuedCount}</strong> queued</span>
          <span><strong className="text-foreground">{publishedCount}</strong> published</span>
          <span><strong className="text-foreground">{connections.length}</strong> social account{connections.length === 1 ? "" : "s"} connected</span>
        </div>
        <Button variant="outline" size="sm" onClick={syncAccounts} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
          Sync Social Accounts
        </Button>
      </div>

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(p => (
          <Button
            key={p.id}
            variant={filter === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Calendar grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No scheduled posts {filter !== "all" ? `for ${filter}` : "yet"}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(post => (
            <Card key={post.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {platformIcon(post.platform)}
                    <span className="capitalize">{post.platform}</span>
                  </div>
                  {statusBadge(post.status)}
                </div>
                <p className="text-sm text-foreground line-clamp-3">
                  {(post.content || "").slice(0, 80)}{(post.content || "").length > 80 ? "…" : ""}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</span>
                  {post.status === "failed" && post.error_message && (
                    <span className="text-destructive truncate max-w-[140px]" title={post.error_message}>{post.error_message}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
