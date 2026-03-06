import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RefreshCw, CalendarDays, Tag } from "lucide-react";
import type { SocialPost } from "./types";
import { CATEGORY_COLORS, FORMAT_LABELS, FORMAT_COLORS, type ContentFormat } from "./types";
import AbbyCoachingTip from "./AbbyCoachingTip";

interface Props {
  posts: SocialPost[];
  onPostsChange: (posts: SocialPost[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function BulkEditStep({ posts, onPostsChange, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkRescheduleOffset, setBulkRescheduleOffset] = useState("0");

  const sorted = useMemo(
    () => [...posts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [posts]
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(p => p.id)));
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    onPostsChange(posts.map(p =>
      selected.has(p.id) ? { ...p, category: bulkCategory as SocialPost["category"] } : p
    ));
    setSelected(new Set());
  };

  const applyBulkReschedule = () => {
    const offset = parseInt(bulkRescheduleOffset);
    if (isNaN(offset) || offset === 0) return;
    onPostsChange(posts.map(p => {
      if (!selected.has(p.id)) return p;
      const d = new Date(p.scheduled_date);
      d.setDate(d.getDate() + offset);
      return { ...p, scheduled_date: d.toISOString().split("T")[0] };
    }));
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <AbbyCoachingTip
        title="Bulk Edit Power Moves"
        tips={[
          "🔄 Select multiple posts and change categories at once to rebalance your content mix.",
          "📆 Use bulk reschedule to shift posts forward if you need prep time for visual assets.",
          "📸 Posts marked 'Carousel' or 'Reel Script' need visual assets — prepare these first before scheduling.",
          "💡 Pro tip: batch-create all carousel slides for the week in one sitting for consistency.",
        ]}
      />
      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {["tips", "quotes", "stories", "promotions", "engagement"].map(c => (
                    <SelectItem key={c} value={c} className="capitalize text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkCategory} disabled={!bulkCategory}>
                <Tag className="h-3 w-3 mr-1" /> Apply
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={bulkRescheduleOffset}
                onChange={e => setBulkRescheduleOffset(e.target.value)}
                className="h-8 w-20 text-xs"
                placeholder="±days"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkReschedule}>
                <CalendarDays className="h-3 w-3 mr-1" /> Reschedule
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-2 w-8">
                  <Checkbox checked={selected.size === sorted.length && sorted.length > 0} onCheckedChange={toggleAll} />
                </th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Platform</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Format</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Caption</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Hashtags</th>
                <th className="p-2 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(post => (
                <tr
                  key={post.id}
                  className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${
                    selected.has(post.id) ? "bg-secondary/5" : ""
                  }`}
                >
                  <td className="p-2">
                    <Checkbox checked={selected.has(post.id)} onCheckedChange={() => toggleSelect(post.id)} />
                  </td>
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{post.scheduled_date}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{post.platform}</Badge>
                  </td>
                  <td className="p-2">
                    <Badge className={`text-[10px] ${FORMAT_COLORS[post.format as ContentFormat] || "bg-muted text-muted-foreground"}`}>
                      {FORMAT_LABELS[post.format as ContentFormat] || post.format}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs max-w-[200px] truncate">{post.caption}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[post.category]}`} />
                      <span className="text-xs capitalize">{post.category}</span>
                    </div>
                  </td>
                  <td className="p-2 text-[10px] text-muted-foreground max-w-[120px] truncate">
                    {post.hashtags.slice(0, 3).join(" ")}
                  </td>
                  <td className="p-2">
                    {post.ai_generated ? (
                      <Badge className="text-[9px] bg-secondary/10 text-secondary">AI-generated</Badge>
                    ) : (
                      <Badge className="text-[9px] bg-green-500/10 text-green-700">Edited</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} className="bg-primary">Continue to Approve →</Button>
      </div>
    </div>
  );
}
