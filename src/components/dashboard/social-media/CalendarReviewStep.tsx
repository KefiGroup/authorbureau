import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Sparkles, Pencil, X } from "lucide-react";
import type { SocialPost } from "./types";
import { CATEGORY_COLORS, FORMAT_LABELS, FORMAT_COLORS, type ContentFormat } from "./types";
import AbbyCoachingTip from "./AbbyCoachingTip";

interface Props {
  posts: SocialPost[];
  onPostsChange: (posts: SocialPost[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const PLATFORM_FILTER = ["all", "linkedin", "instagram", "x", "facebook"];

export default function CalendarReviewStep({ posts, onPostsChange, onNext, onBack }: Props) {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (posts.length === 0) return new Date();
    return new Date(posts[0].scheduled_date);
  });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [dragPost, setDragPost] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    if (platformFilter === "all") return posts;
    return posts.filter(p => p.platform === platformFilter);
  }, [posts, platformFilter]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    filteredPosts.forEach(p => {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = [];
      map[p.scheduled_date].push(p);
    });
    return map;
  }, [filteredPosts]);

  const startEdit = (post: SocialPost) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption);
  };

  const saveEdit = () => {
    if (!editingPostId) return;
    onPostsChange(posts.map(p =>
      p.id === editingPostId ? { ...p, caption: editCaption, edited: true, ai_generated: false } : p
    ));
    setEditingPostId(null);
  };

  const handleDrop = (dateStr: string) => {
    if (!dragPost) return;
    onPostsChange(posts.map(p => p.id === dragPost ? { ...p, scheduled_date: dateStr } : p));
    setDragPost(null);
  };

  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <AbbyCoachingTip
        title="How to Review Your Calendar"
        tips={[
          "📌 Drag posts between dates to optimize timing. Best days: Tue-Thu for LinkedIn, Mon-Fri for Instagram.",
          "✏️ Click any post to edit the caption. Add your personal voice — AI drafts the structure, you add the soul.",
          "🎯 Check format distribution: aim for 40% visual (carousels/reels), 30% text, 20% interactive (polls/questions), 10% video scripts.",
          "🗑️ Delete low-impact posts rather than keeping filler. Quality > quantity always wins.",
        ]}
      />
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {PLATFORM_FILTER.map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                platformFilter === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-muted-foreground/40"
              }`}
            >
              {p === "all" ? `All (${posts.length})` : `${p} (${posts.filter(x => x.platform === p).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setView("calendar")}
            className={`p-1.5 rounded-md transition-all ${view === "calendar" ? "bg-background shadow-sm" : ""}`}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-background shadow-sm" : ""}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-heading text-lg font-semibold">{monthLabel}</h3>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="bg-muted/50 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground text-center">{d}</div>
            ))}
            {monthDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="bg-background min-h-[80px]" />;
              const dateStr = day.toISOString().split("T")[0];
              const dayPosts = postsByDate[dateStr] || [];
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={dateStr}
                  className={`bg-background min-h-[80px] p-1 ${isToday ? "ring-1 ring-inset ring-secondary/50" : ""}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(dateStr)}
                >
                  <span className={`text-[10px] font-medium ${isToday ? "text-secondary font-bold" : "text-muted-foreground"}`}>
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayPosts.slice(0, 3).map(post => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={() => setDragPost(post.id)}
                        onClick={() => startEdit(post)}
                        className="flex items-center gap-1 px-1 py-0.5 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors text-[9px] truncate"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_COLORS[post.category]}`} />
                        <span className="truncate capitalize text-[9px]">{post.platform[0]}</span>
                        <span className="truncate text-muted-foreground">{post.caption.slice(0, 25)}</span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{dayPosts.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredPosts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(post => (
            <Card key={post.id} className="border-border/50">
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${CATEGORY_COLORS[post.category]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{post.platform}</Badge>
                    <Badge className={`text-[10px] ${FORMAT_COLORS[post.format as ContentFormat] || "bg-muted text-muted-foreground"}`}>
                      {FORMAT_LABELS[post.format as ContentFormat] || post.format}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{post.scheduled_date}</span>
                    {post.ai_generated && <Badge className="text-[9px] bg-secondary/10 text-secondary">AI</Badge>}
                  </div>
                  {post.hook && <p className="text-xs font-semibold text-foreground mb-0.5">🎣 {post.hook}</p>}
                  <p className="text-xs text-foreground line-clamp-2">{post.caption}</p>
                  {post.format_notes && <p className="text-[10px] text-muted-foreground mt-1 italic">📋 {post.format_notes}</p>}
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={() => startEdit(post)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPostId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingPostId(null)}>
          <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-semibold">Edit Post</h4>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingPostId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                rows={6}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingPostId(null)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} className="bg-primary">Continue to Bulk Edit →</Button>
      </div>
    </div>
  );
}
