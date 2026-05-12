import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useSocialConnectionStatus } from "@/hooks/useSocialConnectionStatus";
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
  Send,
  GripVertical,
  Inbox,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PLATFORM_LABELS,
  composerUrl,
  dayKey,
} from "@/components/dashboard/builders/shared/socialKitHelpers";
import CarouselPreview from "@/components/dashboard/builders/bp03/CarouselPreview";

interface Props {
  authorId: string | null;
  bookId?: string | null;
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
  graphic_url: string | null;
  archetype?: string | null;
  carousel_slides?: any;
  graphics?: any;
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
    draft: { label: "Unscheduled", variant: "outline" },
    ready: { label: "Scheduled", variant: "secondary" },
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

export default function SocialCalendarTab({ authorId, bookId = null }: Props) {
  const navigate = useNavigate();
  const { isReady: isAuthReady } = useAuthReady();
  const { hasAnyConnection: hasSocialConnection, loading: socialConnLoading } = useSocialConnectionStatus();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [bp03Activated, setBp03Activated] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [schedulingPostId, setSchedulingPostId] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState(""); // datetime-local string
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [autoRefilling, setAutoRefilling] = useState(false);
  const [generatingGraphics, setGeneratingGraphics] = useState(false);
  const autoRefilledFor = useRef<Set<string>>(new Set());

  const formatDateTimeInput = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const defaultScheduleValue = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return formatDateTimeInput(d.toISOString());
  };

  const load = async () => {
    if (!isAuthReady) return;
    setLoading(true);

    try {
      const result = await callMarketingHubState<{
        bp03_activated: boolean;
        posts: SocialPost[];
      }>("social_calendar", bookId ? { book_id: bookId } : {});

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

  useEffect(() => { load(); }, [authorId, isAuthReady, bookId]);

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
        toast.error(json?.error || "Couldn't rebuild your posts. Open the Social Media builder and try again.");
        return;
      }
      toast.success(`${json.saved || 0} posts loaded — ready for you to schedule.`);
      await load();
    } finally {
      setRepairing(false);
    }
  };

  // Shared refill request — generates fresh post copy as Unscheduled drafts.
  // Used by both the manual button and the automatic 7-day-runway trigger.
  const requestRefill = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!authorId) return { ok: false, error: "No author" };
    const token = await getActiveToken();
    if (!token) return { ok: false, error: "No session" };
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
      return { ok: false, error: json?.error || "refill failed" };
    }
    return { ok: true };
  };

  // Manual social refill — generates fresh post copy as Unscheduled drafts. No auto-dating.
  const refillCalendar = async () => {
    if (!authorId) return;
    setRefilling(true);
    try {
      const result = await requestRefill();
      if (!result.ok) {
        if (result.error === "No session") toast.error("Session expired. Please sign in again.");
        else toast.error("Couldn't generate more posts. Please try again in a few minutes.");
        return;
      }
      toast.success("Generating fresh post copy — they'll appear as Unscheduled below.");
      setTimeout(() => { load(); }, 4000);
    } finally {
      setRefilling(false);
    }
  };

  // Batch-generate copy-paste-ready graphics for every BP-03 post that doesn't yet have one.
  const generateAllGraphics = async () => {
    if (!authorId) return;
    setGeneratingGraphics(true);
    try {
      const token = await getActiveToken();
      if (!token) { toast.error("Session expired. Please sign in again."); return; }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bp03-generate-all-graphics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ author_id: authorId, book_id: bookId || null, limit: 20 }),
        },
        180000,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Couldn't generate graphics. Please try again.");
        return;
      }
      if (json.generated > 0) toast.success(json.message || `${json.generated} graphic(s) ready`);
      else toast.info(json.message || "No new graphics needed — every post already has one.");
      await load();
    } finally {
      setGeneratingGraphics(false);
    }
  };

  const downloadGraphic = async (post: SocialPost, sizeUrl?: string, sizeLabel?: string) => {
    const url = sizeUrl || post.graphic_url;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      const suffix = sizeLabel ? `-${sizeLabel}` : "";
      a.download = `${post.platform}-post-${(post.post_index ?? 0) + 1}${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  /** Returns up to three [label, url] pairs for the post's graphic variants. */
  const graphicVariants = (post: SocialPost): Array<[string, string]> => {
    const out: Array<[string, string]> = [];
    const g = post.graphics;
    if (g && typeof g === "object" && !Array.isArray(g)) {
      if (g.landscape) out.push(["Landscape (1200×627)", g.landscape]);
      if (g.portrait) out.push(["Portrait (1080×1350)", g.portrait]);
      if (g.square) out.push(["Square (1080×1080)", g.square]);
    }
    if (out.length === 0 && post.graphic_url) {
      out.push(["Graphic", post.graphic_url]);
    }
    return out;
  };

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter(p => {
      if (filter === "x") return p.platform === "x" || p.platform === "twitter";
      return p.platform === filter;
    });
  }, [posts, filter]);

  const postsByDay = useMemo(() => groupPostsByDay(filteredPosts), [filteredPosts]);

  const unscheduledPosts = useMemo(
    () => filteredPosts.filter(p => !p.scheduled_at && p.status !== "posted"),
    [filteredPosts],
  );

  const totalCount = posts.length;
  const postedCount = posts.filter(p => p.status === "posted").length;
  const unscheduledCount = posts.filter(p => !p.scheduled_at && p.status !== "posted").length;
  const scheduledCount = posts.filter(p => p.scheduled_at && p.status !== "posted").length;
  const nextUp = posts
    .filter(p => p.status === "ready" && p.scheduled_at && new Date(p.scheduled_at) >= new Date())
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))[0];

  // Runway calculation: days between today and the latest scheduled (non-posted) post.
  // Drives the 7-day amber banner + auto-regen trigger.
  const daysOfRunway = useMemo(() => {
    const future = posts
      .filter(p => p.scheduled_at && p.status !== "posted")
      .map(p => new Date(p.scheduled_at as string).getTime());
    if (future.length === 0) return 0;
    const latest = Math.max(...future);
    const diffMs = latest - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 86_400_000);
  }, [posts]);

  // Auto-regen trigger — fires once per session per author when scheduled runway
  // drops to 7 days or fewer AND the unscheduled queue is also low. Aligns with
  // Sprint 5A author-driven scheduling: new posts land as Unscheduled drafts.
  useEffect(() => {
    if (!authorId) return;
    if (loading || autoRefilling || refilling) return;
    if (!bp03Activated) return;
    if (autoRefilledFor.current.has(authorId)) return;
    if (daysOfRunway > 7) return;
    if (unscheduledCount >= 10) return;

    autoRefilledFor.current.add(authorId);
    setAutoRefilling(true);
    (async () => {
      const result = await requestRefill();
      if (result.ok) {
        toast.success("ABBY has added 20 new post ideas to your Unscheduled queue.");
        setTimeout(() => { load(); }, 4000);
      } else {
        console.warn("[SocialCalendar] auto-refill failed:", result.error);
      }
      setAutoRefilling(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, loading, bp03Activated, daysOfRunway, unscheduledCount]);

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
    const platformLabel = PLATFORM_LABELS[post.platform] || post.platform;
    toast.success(`Caption copied — opening ${platformLabel}`, {
      description: "Paste it into the compose box, attach the graphic, and post.",
    });
    window.open(composerUrl(post.platform), "_blank", "noopener,noreferrer");
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

  const handleDownloadPack = async () => {
    if (!authorId) return;
    setDownloadingPack(true);
    try {
      const token = await getActiveToken();
      if (!token) { toast.error("Please sign in again"); return; }
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/export-social-pack-zip`;
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ author_id: authorId, book_id: bookId || null }),
      }, 60000);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = `social-pack-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      toast.success("Social pack downloaded ✓");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't build the pack");
    } finally {
      setDownloadingPack(false);
    }
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

  const postNow = async (post: SocialPost) => {
    try {
      const result = await callMarketingHubState<{ post: Pick<SocialPost, "id" | "scheduled_at" | "status" | "posted_at"> }>(
        "post_social_now",
        { post_id: post.id },
      );
      const nowIso = result.post?.posted_at ?? new Date().toISOString();
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, status: "posted", posted_at: nowIso, scheduled_at: result.post?.scheduled_at ?? p.scheduled_at ?? nowIso }
        : p));
      // Open the composer so the author can actually publish on the platform.
      copyAndOpen(post);
    } catch (_error) {
      toast.error("Couldn't post now");
    }
  };

  const startSchedule = (post: SocialPost) => {
    setSchedulingPostId(post.id);
    setScheduleValue(post.scheduled_at ? formatDateTimeInput(post.scheduled_at) : defaultScheduleValue());
  };

  const cancelSchedule = () => {
    setSchedulingPostId(null);
    setScheduleValue("");
  };

  const saveSchedule = async (post: SocialPost) => {
    if (!scheduleValue) {
      toast.error("Pick a date and time first");
      return;
    }

    setSavingSchedule(true);
    try {
      const result = await callMarketingHubState<{ post: Pick<SocialPost, "id" | "scheduled_at" | "status" | "posted_at"> }>(
        "reschedule_social_post",
        { post_id: post.id, scheduled_at: scheduleValue },
      );

      const nextScheduledAt = result.post?.scheduled_at ?? new Date(scheduleValue).toISOString();
      setPosts(prev =>
        [...prev]
          .map((p) => p.id === post.id
            ? { ...p, scheduled_at: nextScheduledAt, status: "ready", posted_at: null }
            : p)
          .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))
      );
      setCursor(new Date(nextScheduledAt));
      setExpandedDay(dayKey(new Date(nextScheduledAt)));
      toast.success("Post scheduled");
      cancelSchedule();
    } catch (_error) {
      toast.error("Couldn't schedule this post");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Drag-and-drop: drop an Unscheduled card on a calendar cell → schedule for that day at 09:00.
  const dropOnDay = async (post: SocialPost, day: Date) => {
    const dayOnly = `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, "0")}-${`${day.getDate()}`.padStart(2, "0")}`;
    try {
      const result = await callMarketingHubState<{ post: Pick<SocialPost, "id" | "scheduled_at" | "status" | "posted_at"> }>(
        "reschedule_social_post",
        { post_id: post.id, scheduled_at: dayOnly },
      );
      const nextScheduledAt = result.post?.scheduled_at ?? new Date(`${dayOnly}T09:00:00`).toISOString();
      setPosts(prev =>
        [...prev]
          .map((p) => p.id === post.id
            ? { ...p, scheduled_at: nextScheduledAt, status: "ready", posted_at: null }
            : p)
          .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))
      );
      setExpandedDay(dayKey(new Date(nextScheduledAt)));
      toast.success(`Scheduled for ${day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at 9:00 AM`);
    } catch (_error) {
      toast.error("Couldn't schedule that post");
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
                  Your Social Media kit is activated, but your posts didn't load. This usually clears after a quick refresh.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  If it persists, sign out and back in — your saved kit is safe.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={repairCalendar} disabled={repairing}>
                    {repairing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Loader2 className="h-4 w-4 mr-1" />}
                    {repairing ? "Rebuilding…" : "Refresh Posts"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/node-builder/BP-03${bookId ? `?bookId=${bookId}` : ""}`)}>
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
                Your Social Calendar is empty. Open <strong>Social Media</strong> in Brand Products and click <strong>Send to Social Calendar</strong> — I'll write 20 posts across 6 archetypes (Quote, Lesson, Question, Story, Framework, Proof) with ~6 Instagram carousels, and drop them here, ready to copy and paste into LinkedIn, Facebook and Instagram.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate(`/node-builder/BP-03${bookId ? `?bookId=${bookId}` : ""}`)}>
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
      {/* Sprint 61: Honest copy-paste workflow — no auto-publish claim. */}
      <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 flex items-start gap-3">
        <Copy className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Copy-paste workflow (no auto-posting)
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Each card has <strong>Copy caption</strong>, <strong>Download graphic</strong>, and <strong>Open LinkedIn / Facebook / Instagram</strong>. Paste into the platform yourself (~20 seconds), then tap <strong>Mark as posted</strong>. ABBY refills 20 more posts whenever your unposted queue drops below 7.
          </p>
        </div>
      </div>

      {scheduledCount > 0 && daysOfRunway > 0 && daysOfRunway <= 7 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1">
            <strong>Your scheduled posts run out in {daysOfRunway} day{daysOfRunway === 1 ? "" : "s"}.</strong>{" "}
            {autoRefilling
              ? "ABBY is topping up your queue with 20 more post ideas…"
              : "ABBY is preparing 20 more — they'll appear as Unscheduled below."}
          </span>
        </div>
      ) : unscheduledCount > 0 ? (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3 text-xs text-foreground flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0 text-secondary" />
          <span className="flex-1">
            <strong>You have {unscheduledCount} unscheduled post{unscheduledCount === 1 ? "" : "s"} ready to go</strong>{" "}
            — pick your dates below.
          </span>
        </div>
      ) : null}

      {/* Progress tracker header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <strong className="text-foreground text-base">{postedCount}</strong>
            <span className="text-muted-foreground"> of {totalCount} posted</span>
          </div>
          <div>
            <span className="text-muted-foreground">Scheduled: </span>
            <strong className="text-foreground">{scheduledCount}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Unscheduled: </span>
            <strong className="text-foreground">{unscheduledCount}</strong>
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
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={handleDownloadPack} disabled={downloadingPack || totalCount === 0}>
              {downloadingPack ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Download Pack (.zip)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How-to-use instructions */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <span className="text-base leading-none">💡</span>
        <div className="space-y-1">
          <p><strong className="text-foreground">How this works:</strong> Each unscheduled post below shows the AI-written copy. <strong className="text-foreground">Click Schedule</strong> to pick the exact date and time it should go live, <strong className="text-foreground">drag it</strong> onto a calendar day, or click <strong className="text-foreground">Post Now</strong> to publish immediately.</p>
          <p>Once scheduled, posts appear on the calendar as blue dots. Click any day with a dot to view, edit, or reschedule.</p>
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
          <Button size="sm" variant="outline" onClick={refillCalendar} disabled={refilling || !authorId}>
            {refilling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Generate 20 more posts
          </Button>
          <Button size="sm" variant="outline" onClick={generateAllGraphics} disabled={generatingGraphics || !authorId}>
            {generatingGraphics ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {generatingGraphics ? "Designing graphics…" : "Generate graphics"}
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
              const isDropTarget = dropTargetKey === k && !!draggingPostId;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : k)}
                  onDragOver={(e) => {
                    if (draggingPostId) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dropTargetKey !== k) setDropTargetKey(k);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTargetKey === k) setDropTargetKey(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTargetKey(null);
                    const id = e.dataTransfer.getData("text/post-id") || draggingPostId;
                    setDraggingPostId(null);
                    if (!id) return;
                    const post = posts.find((p) => p.id === id);
                    if (post) dropOnDay(post, d);
                  }}
                  className={cn(
                    "relative text-left rounded-md border bg-background p-1.5 transition-colors",
                    view === "month" ? "min-h-[68px]" : "min-h-[120px]",
                    !inMonth && "opacity-40",
                    isExpanded && "border-primary ring-1 ring-primary",
                    !isExpanded && !isDropTarget && "hover:border-primary/40",
                    isDropTarget && "border-secondary ring-2 ring-secondary bg-secondary/10",
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

      {/* Unscheduled tray — author-driven scheduling */}
      <Card className="border-secondary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold text-foreground">Unscheduled posts</h3>
              <Badge variant="outline" className="text-[10px]">{unscheduledPosts.length}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drag a card onto a calendar day or click <strong className="text-foreground">Schedule</strong> to pick a date and time.
            </p>
          </div>

          {unscheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All your generated posts are scheduled. Click <strong className="text-foreground">Generate 30 more days of content</strong> for fresh copy.
            </p>
          ) : (
            <div className="space-y-2">
              {unscheduledPosts.map((post) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingPostId(post.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/post-id", post.id);
                  }}
                  onDragEnd={() => {
                    setDraggingPostId(null);
                    setDropTargetKey(null);
                  }}
                  className={cn(
                    "border border-border rounded-md p-3 hover:border-primary/40 transition-colors bg-background",
                    draggingPostId === post.id && "opacity-50 border-secondary",
                  )}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/60 mt-0.5 cursor-grab shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={cn("h-2 w-2 rounded-full", PLATFORM_COLORS[post.platform] || "bg-muted-foreground")} />
                          {platformIcon(post.platform)}
                          <span className="capitalize">{PLATFORM_LABELS[post.platform] || post.platform}</span>
                          {(post.archetype || post.post_type) && <Badge variant="outline" className="text-[10px]">{post.archetype || post.post_type}</Badge>}
                        </div>
                        {statusBadge(post.status)}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-line mb-2 line-clamp-3">
                        {post.content}
                      </p>
                      {post.graphic_url && (
                        <div className="mb-2">
                          <img
                            src={post.graphic_url}
                            alt=""
                            className="rounded-md border border-border max-h-32 object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0 && (
                        <div className="mb-2">
                          <CarouselPreview slides={post.carousel_slides} filenamePrefix={`post-${(post.post_index ?? 0) + 1}`} />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => startSchedule(post)}>
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Schedule
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => postNow(post)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Post Now
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyCaption(post)}>
                          {copiedId === post.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          Copy
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyAndOpen(post)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open {PLATFORM_LABELS[post.platform] || post.platform}
                        </Button>
                        {post.graphic_url && (
                          <Button size="sm" variant="outline" onClick={() => downloadGraphic(post)}>
                            <Download className="h-3.5 w-3.5 mr-1" /> Graphic
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => markAsPosted(post)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Mark as Posted
                        </Button>
                      </div>
                    </div>
                  </div>

                  {schedulingPostId === post.id && (
                    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">Pick the exact date and time this should go live</p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Input
                          type="datetime-local"
                          value={scheduleValue}
                          onChange={(e) => setScheduleValue(e.target.value)}
                          className="sm:max-w-[260px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveSchedule(post)} disabled={savingSchedule || !scheduleValue}>
                            {savingSchedule ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelSchedule} disabled={savingSchedule}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
              <p className="text-sm text-muted-foreground">No posts scheduled for this day. Drag an unscheduled post here, or click Schedule on any post above.</p>
            ) : (
              <div className="space-y-2">
                {expandedPosts.map(post => (
                  <div key={post.id} className="border border-border rounded-md p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", PLATFORM_COLORS[post.platform] || "bg-muted-foreground")} />
                        {platformIcon(post.platform)}
                        <span className="capitalize">{PLATFORM_LABELS[post.platform] || post.platform}</span>
                        {(post.archetype || post.post_type) && <Badge variant="outline" className="text-[10px]">{post.archetype || post.post_type}</Badge>}
                        {post.scheduled_at && (
                          <span className="text-[10px] text-muted-foreground">
                            · {new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(post.status)}
                      </div>
                    </div>
                    <p className={cn("text-sm whitespace-pre-line mb-2", post.status === "posted" ? "text-muted-foreground" : "text-foreground")}>
                      {post.content}
                    </p>
                    {post.graphic_url && (
                      <div className="mb-2">
                        <img
                          src={post.graphic_url}
                          alt=""
                          className="rounded-md border border-border max-h-40 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0 && (
                      <div className="mb-2">
                        <CarouselPreview slides={post.carousel_slides} filenamePrefix={`post-${(post.post_index ?? 0) + 1}`} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyCaption(post)}>
                        {copiedId === post.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        Copy
                      </Button>
                      {graphicVariants(post).length > 0 && (
                        graphicVariants(post).length === 1 ? (
                          <Button size="sm" variant="outline" onClick={() => downloadGraphic(post, graphicVariants(post)[0][1])}>
                            <Download className="h-3.5 w-3.5 mr-1" /> Graphic
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Download className="h-3.5 w-3.5 mr-1" /> Graphic
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {graphicVariants(post).map(([label, url]) => (
                                <DropdownMenuItem key={label} onClick={() => downloadGraphic(post, url, label.split(" ")[0].toLowerCase())}>
                                  Download {label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
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
                        <>
                          <Button size="sm" variant="secondary" onClick={() => postNow(post)}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Post Now
                          </Button>
                          <Button size="sm" onClick={() => markAsPosted(post)}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Mark as Posted
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => startSchedule(post)}>
                        Reschedule
                      </Button>
                    </div>
                    {schedulingPostId === post.id && (
                      <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-foreground mb-2">Pick a new date and time</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <Input
                            type="datetime-local"
                            value={scheduleValue}
                            onChange={(e) => setScheduleValue(e.target.value)}
                            className="sm:max-w-[260px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveSchedule(post)} disabled={savingSchedule || !scheduleValue}>
                              {savingSchedule ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelSchedule} disabled={savingSchedule}>
                              Cancel
                            </Button>
                          </div>
                        </div>
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
