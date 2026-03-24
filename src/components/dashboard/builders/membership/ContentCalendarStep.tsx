import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Calendar, ChevronLeft, ChevronRight, Loader2, Wand2, Pencil } from "lucide-react";
import type { MembershipStepProps, ContentDrop, ContentDropType, CONTENT_DROP_LABELS, MembershipTier } from "./types";

const TYPE_COLORS: Record<ContentDropType, string> = {
  "blog-post": "bg-blue-100 text-blue-700",
  video: "bg-purple-100 text-purple-700",
  "pdf-resource": "bg-emerald-100 text-emerald-700",
  "live-session": "bg-red-100 text-red-700",
  "community-prompt": "bg-amber-100 text-amber-700",
  "exclusive-chapter": "bg-rose-100 text-rose-700",
};

const MONTHS = ["Month 1", "Month 2", "Month 3"];
const WEEKS_IN_MONTH = 4;

function generateDefaultCalendar(tiers: MembershipTier[]): ContentDrop[] {
  const drops: ContentDrop[] = [];
  const types: ContentDropType[] = ["blog-post", "video", "pdf-resource", "live-session", "community-prompt", "exclusive-chapter"];
  const allTierIds = tiers.map(t => t.id);
  let id = 0;

  for (let month = 0; month < 3; month++) {
    for (let week = 0; week < WEEKS_IN_MONTH; week++) {
      const dayOfMonth = week * 7 + 3;
      const type = types[(month * WEEKS_IN_MONTH + week) % types.length];
      const tierScope = week < 2 ? allTierIds : allTierIds.slice(1);
      drops.push({
        id: `drop-${id++}`,
        title: `${type === "live-session" ? "Live Q&A" : type === "blog-post" ? "Weekly Insight" : type === "video" ? "Training Video" : type === "pdf-resource" ? "Resource Pack" : type === "community-prompt" ? "Discussion Thread" : "Bonus Chapter"} — Week ${week + 1}`,
        type,
        tierIds: tierScope,
        scheduledDate: `M${month + 1}W${week + 1}`,
        isRecurring: type === "live-session" || type === "community-prompt",
        content: "",
        edited: false,
      });
    }
  }
  return drops;
}

export default function ContentCalendarStep({ stepData, setStepData, onMarkEdited, bookTitle }: MembershipStepProps) {
  const [activeMonth, setActiveMonth] = useState(0);
  const [editingDrop, setEditingDrop] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const tiers: MembershipTier[] = stepData.tiers || [];
  const calendar: ContentDrop[] = stepData.contentCalendar || [];

  useEffect(() => {
    if (calendar.length === 0 && tiers.length > 0) {
      setStepData(prev => ({ ...prev, contentCalendar: generateDefaultCalendar(tiers) }));
    }
  }, [tiers, setStepData]);

  const monthDrops = calendar.filter(d => d.scheduledDate.startsWith(`M${activeMonth + 1}`));

  const updateDrop = (dropId: string, field: string, value: any) => {
    const updated = calendar.map(d => d.id === dropId ? { ...d, [field]: value, edited: true } : d);
    setStepData(prev => ({ ...prev, contentCalendar: updated }));
    onMarkEdited("content-calendar");
  };

  const handleGenerateContent = () => {
    setGenerating(true);
    setTimeout(() => {
      const updated = calendar.map(d => ({
        ...d,
        content: d.content || `AI-generated ${d.type} content for "${bookTitle}". This ${d.isRecurring ? "recurring" : "one-time"} piece covers key insights from your manuscript, tailored for ${d.tierIds.length === tiers.length ? "all members" : "premium members"}.`,
      }));
      setStepData(prev => ({ ...prev, contentCalendar: updated }));
      setGenerating(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Content Strategy</p>
            <p className="text-sm text-muted-foreground">
              I've mapped a 3-month content calendar using your manuscript's key themes. Members stay for consistency — 
              aim for 2 live sessions + 4 content drops per month. Recurring content builds habits.
            </p>
          </div>
        </div>
      </Card>

      {/* Month navigation + generate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveMonth(Math.max(0, activeMonth - 1))} disabled={activeMonth === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            {MONTHS.map((m, i) => (
              <Button
                key={m}
                variant={i === activeMonth ? "secondary" : "ghost"}
                size="sm"
                className="text-xs px-3"
                onClick={() => setActiveMonth(i)}
              >
                <Calendar className="h-3 w-3 mr-1.5" /> {m}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveMonth(Math.min(2, activeMonth + 1))} disabled={activeMonth === 2}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          size="sm"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs"
          onClick={handleGenerateContent}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          {generating ? "Generating…" : "Generate All Content"}
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monthDrops.map(drop => (
          <Card
            key={drop.id}
            className={`p-4 cursor-pointer hover:border-secondary/30 transition-colors ${editingDrop === drop.id ? "ring-1 ring-secondary/30" : ""}`}
            onClick={() => setEditingDrop(editingDrop === drop.id ? null : drop.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] ${TYPE_COLORS[drop.type]}`}>
                  {drop.type.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                </Badge>
                {drop.isRecurring && (
                  <Badge variant="outline" className="text-[10px]">Recurring</Badge>
                )}
              </div>
              {drop.edited && (
                <Badge variant="secondary" className="text-[9px]">Edited</Badge>
              )}
            </div>

            <p className="text-sm font-medium mb-1">{drop.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {drop.tierIds.length === tiers.length ? "All tiers" : `${drop.tierIds.length} tier${drop.tierIds.length > 1 ? "s" : ""}`}
            </p>

            {editingDrop === drop.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3" onClick={e => e.stopPropagation()}>
                <div>
                  <Input
                    value={drop.title}
                    onChange={(e) => updateDrop(drop.id, "title", e.target.value)}
                    className="text-sm"
                    placeholder="Content title"
                  />
                </div>
                <div>
                  <Select value={drop.type} onValueChange={(v) => updateDrop(drop.id, "type", v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_COLORS) as ContentDropType[]).map(t => (
                        <SelectItem key={t} value={t}>{t.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={drop.isRecurring} onCheckedChange={(v) => updateDrop(drop.id, "isRecurring", v)} />
                  <span className="text-xs text-muted-foreground">Recurring monthly</span>
                </div>
                {drop.content && (
                  <Textarea
                    value={drop.content}
                    onChange={(e) => updateDrop(drop.id, "content", e.target.value)}
                    className="text-xs min-h-[80px]"
                    placeholder="Content preview…"
                  />
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
