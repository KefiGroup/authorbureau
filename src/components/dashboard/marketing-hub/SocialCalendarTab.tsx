import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Calendar as CalendarIcon,
  Sparkles,
  Plug,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-pink-500",
  facebook: "bg-[#1877F2]",
  x: "bg-black",
  twitter: "bg-black",
};

const SUMMARY_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X", aliases: ["x", "twitter"] },
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

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupPostsByDay(posts: SocialPost[]) {
  const map = new Map<string, SocialPost[]>();
  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const k = dayKey(new Date(p.scheduled_at));
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return map;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // Sunday start
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildWeekGrid(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SocialCalendarTab({ authorId }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

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
    const loadedPosts = (postsData as any) || [];
    setPosts(loadedPosts);
    setConnections((connData as any) || []);
    // Anchor cursor on earliest scheduled post month
    const earliest = (loadedPosts as SocialPost[])
      .filter((p) => !!p.scheduled_at)
      .reduce((acc: string | null, p) => (!acc || (p.scheduled_at as string) < acc ? (p.scheduled_at as string) : acc), null as string | null);
    if (earliest) setCursor(new Date(earliest));
    setLoading(false);
  };

  useEffect(() => { load(); }, [authorId]);

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter(p => {
      if (filter === "x") return p.platform === "x" || p.platform === "twitter";
      return p.platform === filter;
    });
  }, [posts, filter]);

  const postsByDay = useMemo(() => groupPostsByDay(filteredPosts), [filteredPosts]);

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

  const connectedSet = useMemo(() => new Set(connections.map(c => c.platform)), [connections]);

  const shiftCursor = (delta: number) => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + delta);
    else next.setDate(next.getDate() + delta * 7);
    setCursor(next);
  };

  const goToday = () => {
    setCursor(new Date());
    setExpandedDay(dayKey(new Date()));
  };

  const cells = view === "month" ? buildMonthGrid(cursor) : buildWeekGrid(cursor);
  const cursorMonth = cursor.getMonth();
  const todayKey = dayKey(new Date());

  const headerLabel = useMemo(() => {
    if (view === "month") {
      return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    const week = buildWeekGrid(cursor);
    const start = week[0];
    const end = week[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
    return `${startStr} – ${endStr}, ${end.getFullYear()}`;
  }, [view, cursor]);

  const expandedPosts = expandedDay ? (postsByDay.get(expandedDay) || []) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your Social Calendar…
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="space-y-5">
        <Card className="border-secondary/30 bg-gradient-to-br from-secondary/8 via-secondary/4 to-transparent">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-amber-500 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-1">Abby</p>
              <p className="text-sm text-foreground mb-4">
                Your social calendar is empty. Go to <strong>Social Media</strong> in Brand Products and click <strong>Activate</strong> — I'll schedule all your posts automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { window.location.href = "/dashboard?section=brand-products"; }}>
                  Go to Social Media <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={syncAccounts} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
                  Sync Social Accounts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Total posts scheduled: </span>
            <strong className="text-foreground">{posts.length}</strong>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Platforms:</span>
            {SUMMARY_PLATFORMS.map(p => {
              const aliases = (p as any).aliases || [p.id];
              const isConnected = aliases.some((a: string) => connectedSet.has(a));
              return (
                <Badge
                  key={p.id}
                  variant={isConnected ? "secondary" : "outline"}
                  className={cn("gap-1", !isConnected && "opacity-50")}
                >
                  {p.label} {isConnected && "✅"}
                </Badge>
              );
            })}
          </div>
          <div>
            <span className="text-muted-foreground">Calendar runs until: </span>
            <strong className="text-foreground">
              {lastScheduled
                ? new Date(lastScheduled).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </strong>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={syncAccounts} disabled={syncing}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
              Sync Social Accounts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View toggle + nav */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <Button size="sm" variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>Month</Button>
          <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week</Button>
        </div>
        <div className="flex-1 text-center font-semibold text-foreground">{headerLabel}</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => shiftCursor(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={goToday}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => shiftCursor(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
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
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-[11px] font-semibold text-muted-foreground text-center py-1">{d}</div>
            ))}
          </div>
          <div className={cn("grid grid-cols-7 gap-1", view === "week" ? "" : "")}>
            {cells.map((d, i) => {
              const k = dayKey(d);
              const dayPosts = postsByDay.get(k) || [];
              const inMonth = view === "week" || d.getMonth() === cursorMonth;
              const isToday = k === todayKey;
              const isExpanded = expandedDay === k;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : k)}
                  className={cn(
                    "relative text-left rounded-md border bg-background p-1.5 transition-colors",
                    view === "month" ? "min-h-[68px]" : "min-h-[120px]",
                    !inMonth && "opacity-40",
                    isExpanded && "border-primary ring-1 ring-primary",
                    !isExpanded && "hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        isToday && "inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayPosts.length}</span>
                    )}
                  </div>

                  {view === "month" ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dayPosts.slice(0, 3).map(p => (
                        <span
                          key={p.id}
                          className={cn("h-2 w-2 rounded-full", PLATFORM_COLORS[p.platform] || "bg-muted-foreground")}
                          title={p.platform}
                        />
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[10px] text-muted-foreground leading-none">+{dayPosts.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {dayPosts.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-1">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", PLATFORM_COLORS[p.platform] || "bg-muted-foreground")} />
                          <span className="text-[10px] text-foreground truncate">
                            {(p.content || "").slice(0, 28)}
                          </span>
                        </div>
                      ))}
                      {dayPosts.length > 5 && (
                        <div className="text-[10px] text-muted-foreground">+{dayPosts.length - 5} more</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Expanded day panel */}
      {expandedDay && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {new Date(expandedDay + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setExpandedDay(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {expandedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {expandedPosts.map(post => (
                  <div key={post.id} className="border border-border rounded-md p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", PLATFORM_COLORS[post.platform] || "bg-muted-foreground")} />
                        {platformIcon(post.platform)}
                        <span className="capitalize">{post.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(post.status)}
                        <span className="text-[11px] text-muted-foreground">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground">
                      {(post.content || "").slice(0, 80)}{(post.content || "").length > 80 ? "…" : ""}
                    </p>
                    {post.status === "failed" && post.error_message && (
                      <p className="text-[11px] text-destructive mt-1">{post.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
