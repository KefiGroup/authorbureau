import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { callMarketingHubState } from "@/lib/marketing-hub-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PLATFORM_LABELS,
  composerUrl,
  dayKey,
} from "@/components/dashboard/builders/shared/socialKitHelpers";

interface Props {
  authorId: string | null;
}

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  scheduled_at: string | null;
  status: string;
  posted_at: string | null;
  post_type: string | null;
  post_index: number | null;
}

const PLATFORM_FILTERS = [
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
  x: "bg-foreground",
  twitter: "bg-foreground",
};

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
    draft: { label: "Draft", variant: "outline" },
    ready: { label: "Ready to post", variant: "secondary" },
    posted: { label: "Posted ✓", variant: "default" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
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
  start.setDate(first.getDate() - first.getDay());
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
  const navigate = useNavigate();
  const { isReady: isAuthReady } = useAuthReady();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [bp03Activated, setBp03Activated] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reschedulingPostId, setReschedulingPostId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  const formatDateInput = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const load = async () => {
    if (!isAuthReady) return;
    setLoading(true);

    try {
      const result = await callMarketingHubState<{
        bp03_activated: boolean;
        posts: SocialPost[];
      }>("social_calendar");

      const loadedPosts: SocialPost[] = result.posts || [];
      setBp03Activated(!!result.bp03_activated);
      setPosts(loadedPosts);

      const earliest = loadedPosts
        .filter((p) => !!p.scheduled_at)
        .reduce((acc: string | null, p) => (!acc || (p.scheduled_at as string) < acc ? (p.scheduled_at as string) : acc), null as string | null);
      if (earliest) setCursor(new Date(earliest));
    } catch (error) {
      console.error("[SocialCalendar] Failed to load posts:", error);
      toast.error("Couldn't load your calendar — tap Refresh to retry.");
      setPosts([]);
      setBp03Activated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [authorId, isAuthReady]);

  const repairCalendar = async () => {
    setRepairing(true);
    try {
      const token = await getActiveToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bp03-node-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "repair_calendar" }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "Couldn't rebuild your calendar. Open the Social Media builder and try again.");
        return;
      }
      toast.success(`${json.saved || 0} posts loaded into your Social Calendar.`);
      await load();
    } finally {
      setRepairing(false);
    }
  };

  // ── Manual social-calendar refill (BUG-M3 follow-up) ──
  // Calls the same edge function the nightly cron uses, scoped to this author.
  // Generates 30 more days of posts on top of whatever is already queued.
  const [refilling, setRefilling] = useState(false);
  const refillCalendar = async () => {
    if (!authorId) return;
    setRefilling(true);
    try {
      const token = await getActiveToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-refill-social-calendar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ author_id: authorId, force: true }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "Couldn't generate more posts. Please try again in a few minutes.");
        return;
      }
      toast.success("Generating 30 more days of posts — they'll appear shortly.");
      // Allow a brief moment for the generator to write before we re-fetch.
      setTimeout(() => { load(); }, 4000);
    } finally {
      setRefilling(false);
    }
  };

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter(p => {
      if (filter === "x") return p.platform === "x" || p.platform === "twitter";
      return p.platform === filter;
    });
  }, [posts, filter]);

  const postsByDay = useMemo(() => groupPostsByDay(filteredPosts), [filteredPosts]);

  const totalCount = posts.length;
  const postedCount = posts.filter(p => p.status === "posted").length;
  const remainingCount = totalCount - postedCount;
  const nextUp = posts
    .filter(p => p.status === "ready" && p.scheduled_at && new Date(p.scheduled_at) >= new Date())
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))[0];

  const lastScheduled = posts
    .filter(p => p.scheduled_at)
    .reduce<string | null>((acc, p) => (!acc || (p.scheduled_at! > acc) ? p.scheduled_at! : acc), null);

  // Days of runway remaining — used to surface the auto-refill banner.
  const daysRemaining = lastScheduled
    ? Math.max(0, Math.ceil((new Date(lastScheduled).getTime() - Date.now()) / 86400000))
    : 0;
  const lowRunway = totalCount > 0 && daysRemaining <= 7;

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

  const copyCaption = (post: SocialPost) => {
    navigator.clipboard.writeText(post.content);
    setCopiedId(post.id);
    toast.success("Caption copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAndOpen = (post: SocialPost) => {
    navigator.clipboard.writeText(post.content);
    if (post.platform === "instagram") {
      toast.message("Caption copied", {
        description: "Instagram doesn't support web pre-fill — paste it into the IG mobile app.",
      });
    } else {
      toast.success("Caption copied — opening composer");
    }
    window.open(composerUrl(post.platform, post.content), "_blank", "noopener,noreferrer");
  };

  const markAsPosted = async (post: SocialPost) => {
    try {
      await callMarketingHubState("update_social_post", { post_id: post.id, status: "posted" });
    } catch (_error) {
      toast.error("Couldn't mark as posted");
      return;
    }
    toast.success("Marked as posted ✓");
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: "posted", posted_at: new Date().toISOString() } : p));
  };

  const unmark = async (post: SocialPost) => {
    try {
      await callMarketingHubState("update_social_post", { post_id: post.id, status: "ready" });
    } catch (_error) {
      toast.error("Couldn't update post");
      return;
    }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: "ready", posted_at: null } : p));
  };

  const startReschedule = (post: SocialPost) => {
    setReschedulingPostId(post.id);
    setRescheduleDate(formatDateInput(post.scheduled_at));
  };

  const cancelReschedule = () => {
    setReschedulingPostId(null);
    setRescheduleDate("");
  };

  const saveReschedule = async (post: SocialPost) => {
    if (!rescheduleDate) {
      toast.error("Choose a new posting date first");
      return;
    }

    setSavingReschedule(true);
    try {
      const result = await callMarketingHubState<{ post: Pick<SocialPost, "id" | "scheduled_at" | "status" | "posted_at"> }>(
        "reschedule_social_post",
        { post_id: post.id, scheduled_at: rescheduleDate },
      );

      const nextScheduledAt = result.post?.scheduled_at ?? new Date(`${rescheduleDate}T09:00:00`).toISOString();
      setPosts(prev =>
        [...prev]
          .map((p) => p.id === post.id
            ? { ...p, scheduled_at: nextScheduledAt, status: "ready", posted_at: null }
            : p)
          .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))
      );
      setCursor(new Date(nextScheduledAt));
      setExpandedDay(formatDateInput(nextScheduledAt));
      toast.success("Post rescheduled");
      cancelReschedule();
    } catch (_error) {
      toast.error("Couldn't reschedule this post");
    } finally {
      setSavingReschedule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your Social Calendar…
      </div>
    );
  }

  // Empty state — branch on whether BP-03 was activated.
  if (posts.length === 0) {
    if (bp03Activated) {
      return (
        <div className="space-y-5">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md">
                <Loader2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-[0.15em] mb-1">Almost there</p>
                <p className="text-sm text-foreground mb-1">
                  Your Social Media kit is activated, but the calendar didn't load. This usually clears after a quick refresh.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  If it persists, sign out and back in — your saved kit is safe.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={repairCalendar} disabled={repairing}>
                    {repairing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Loader2 className="h-4 w-4 mr-1" />}
                    {repairing ? "Rebuilding…" : "Refresh Calendar"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/node-builder/BP-03")}>
                    Open Social Media Kit <ArrowRight className="h-4 w-4 ml-1" />
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
        <Card className="border-secondary/30 bg-gradient-to-br from-secondary/8 via-secondary/4 to-transparent">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-amber-500 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-1">Abby</p>
              <p className="text-sm text-foreground mb-4">
                Your Social Calendar is empty. Open <strong>Social Media</strong> in Brand Products and click <strong>Activate</strong> — I'll send your 20 posts straight here.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/node-builder/BP-03")}>
                  Go to Social Media <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={repairCalendar} disabled={repairing}>
                  {repairing ? "Rebuilding…" : "Refresh"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Progress tracker header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <strong className="text-foreground text-base">{postedCount}</strong>
            <span className="text-muted-foreground"> of {totalCount} posted</span>
          </div>
          <div>
            <span className="text-muted-foreground">Remaining: </span>
            <strong className="text-foreground">{remainingCount}</strong>
          </div>
          {nextUp && (
            <div>
              <span className="text-muted-foreground">Next up: </span>
              <strong className="text-foreground">
                {new Date(nextUp.scheduled_at!).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </strong>{" "}
              <span className="text-muted-foreground">({PLATFORM_LABELS[nextUp.platform] || nextUp.platform})</span>
            </div>
          )}
          {lastScheduled && (
            <div className="ml-auto text-xs text-muted-foreground">
              Calendar runs until {new Date(lastScheduled).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How-to-use instructions */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <span className="text-base leading-none">💡</span>
        <div className="space-y-1">
          <p><strong className="text-foreground">How to use this calendar:</strong> Each blue dot is a scheduled post. <strong className="text-foreground">Click any day with a dot</strong> to view the post copy, copy it to your clipboard, mark it as posted, or reschedule to a different date.</p>
          <p>Switch to <strong className="text-foreground">Week view</strong> for a more detailed look, or filter by platform above.</p>
        </div>
      </div>

      {/* View toggle + nav */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <Button size="sm" variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>Month</Button>
          <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week</Button>
        </div>
        <div className="flex-1 text-center font-semibold text-foreground">{headerLabel}</div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={repairCalendar} disabled={repairing}>
            {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Calendar"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => shiftCursor(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={goToday}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => shiftCursor(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2">
        {PLATFORM_FILTERS.map(p => (
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
          <div className="grid grid-cols-7 gap-1">
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
                      {dayPosts.slice(0, 4).map(p => (
                        <span
                          key={p.id}
                          className={cn(
                            "h-2 w-2 rounded-full",
                            PLATFORM_COLORS[p.platform] || "bg-muted-foreground",
                            p.status === "posted" && "ring-1 ring-emerald-500",
                          )}
                          title={`${p.platform} · ${p.status}`}
                        />
                      ))}
                      {dayPosts.length > 4 && (
                        <span className="text-[10px] text-muted-foreground leading-none">+{dayPosts.length - 4}</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {dayPosts.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-1">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", PLATFORM_COLORS[p.platform] || "bg-muted-foreground")} />
                          <span className={cn("text-[10px] truncate", p.status === "posted" ? "text-muted-foreground line-through" : "text-foreground")}>
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", PLATFORM_COLORS[post.platform] || "bg-muted-foreground")} />
                        {platformIcon(post.platform)}
                        <span className="capitalize">{PLATFORM_LABELS[post.platform] || post.platform}</span>
                        {post.post_type && <Badge variant="outline" className="text-[10px]">{post.post_type}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(post.status)}
                      </div>
                    </div>
                    <p className={cn("text-sm whitespace-pre-line mb-2", post.status === "posted" ? "text-muted-foreground" : "text-foreground")}>
                      {post.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyCaption(post)}>
                        {copiedId === post.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        Copy
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Copy & Post
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => copyAndOpen(post)}>
                            Open {PLATFORM_LABELS[post.platform] || post.platform} composer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {post.status === "posted" ? (
                        <Button size="sm" variant="ghost" onClick={() => unmark(post)}>
                          Undo
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => markAsPosted(post)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Mark as Posted
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => startReschedule(post)}>
                        Reschedule
                      </Button>
                    </div>
                    {reschedulingPostId === post.id && (
                      <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-foreground mb-2">Choose a new live date</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <Input
                            type="date"
                            value={rescheduleDate}
                            min={formatDateInput(new Date().toISOString())}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="sm:max-w-[220px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveReschedule(post)} disabled={savingReschedule || !rescheduleDate}>
                              {savingReschedule ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                              Save Date
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelReschedule} disabled={savingReschedule}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Rescheduling keeps this post active in your calendar and moves it to the new date.
                        </p>
                      </div>
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
