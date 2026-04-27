import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, Phone, Building2, Star, Loader2, Trash2, Plus, MessageSquare,
  ArrowUpDown, Tag,
} from "lucide-react";
import { getSourceLabel } from "@/lib/crm-utils";

interface CRMContact {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  company?: string | null;
  stage: string;
  abby_score: number;
  source: string | null;
  last_activity_at: string | null;
  tags?: string[] | null;
  notes?: string | null;
  quiz_stage?: string | null;
  quiz_score?: number | null;
  quiz_completed_at?: string | null;
}

interface Activity {
  id: string;
  type: string;
  content: string | null;
  created_at: string;
}

interface Props {
  contact: CRMContact | null;
  open: boolean;
  onClose: () => void;
  crmFetch: (action: string, extra?: Record<string, any>) => Promise<any>;
  onRefresh: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", engaged: "Engaged", warm: "Warm",
  hot: "Hot", customer: "Customer", vip: "VIP", cold: "Cold",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "#3B82F6", engaged: "#14B8A6", warm: "#F59E0B",
  hot: "#EF4444", customer: "#10B981", vip: "#D4AF37", cold: "#6B7280",
};

const ACTIVITY_ICONS: Record<string, string> = {
  note: "📝", stage_change: "↕", opt_in: "✉", purchase: "💳",
  email_open: "📬", link_click: "🔗", page_visit: "👁", quiz_completed: "📊",
};

const QUIZ_STAGE_COLORS: Record<string, string> = {
  suck: "#EF4444",
  seek: "#F59E0B",
  succeed: "#10B981",
  sustain: "#8B5CF6",
};

function getQuizStageColor(quizStage: string): string {
  const qs = quizStage.toLowerCase();
  if (qs.includes("1") || qs.includes("2") || qs.includes("suck")) return QUIZ_STAGE_COLORS.suck;
  if (qs.includes("3") || qs.includes("4") || qs.includes("seek")) return QUIZ_STAGE_COLORS.seek;
  if (qs.includes("5") || qs.includes("6") || qs.includes("succeed")) return QUIZ_STAGE_COLORS.succeed;
  if (qs.includes("7") || qs.includes("8") || qs.includes("sustain")) return QUIZ_STAGE_COLORS.sustain;
  return "#6B7280";
}

function formatQuizStageLabel(quizStage: string): string {
  return quizStage
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ContactDetailPanel({ contact, open, onClose, crmFetch, onRefresh }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!contact || !open) return;
    setActivitiesLoading(true);
    crmFetch("list-activities", { contact_id: contact.id })
      .then((d) => setActivities(d.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));

    setRecLoading(true);
    setRecommendation("");
    crmFetch("abby-contact-recommendation", { contact_id: contact.id })
      .then((d) => setRecommendation(d.recommendation || ""))
      .catch(() => setRecommendation("Unable to generate recommendation."))
      .finally(() => setRecLoading(false));
  }, [contact?.id, open]);

  if (!contact) return null;

  const stageColor = STAGE_COLORS[contact.stage] || "#6B7280";

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await crmFetch("add-note", { contact_id: contact.id, content: newNote.trim() });
    setNewNote("");
    onRefresh();
    const d = await crmFetch("list-activities", { contact_id: contact.id });
    setActivities(d.activities || []);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await crmFetch("add-tag", { contact_id: contact.id, tag: newTag.trim() });
    setNewTag("");
    onRefresh();
  };

  const handleStageChange = async (stage: string) => {
    await crmFetch("update-stage", { contact_id: contact.id, stage });
    onRefresh();
  };

  const handleDelete = async () => {
    await crmFetch("delete", { contact_id: contact.id });
    onRefresh();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{contact.full_name}</SheetTitle>
          <SheetDescription>Contact details</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="bg-[#1E3A5F] px-5 py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
              style={{ backgroundColor: stageColor }}
            >
              {getInitials(contact.full_name || contact.email || "?")}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{contact.full_name || contact.email || "Unnamed contact"}</h3>
              {contact.email && (
                <p className="text-white/70 text-sm truncate">{contact.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span
              className="text-[12px] px-2.5 py-0.5 rounded-full font-semibold text-white"
              style={{ backgroundColor: stageColor }}
            >
              {STAGE_LABELS[contact.stage] || contact.stage}
            </span>
            {/* Quiz Stage Badge */}
            {contact.quiz_stage && (
              <span
                className="text-[12px] px-2.5 py-0.5 rounded-full font-semibold text-white flex items-center gap-1"
                style={{ backgroundColor: getQuizStageColor(contact.quiz_stage) }}
              >
                📊 {formatQuizStageLabel(contact.quiz_stage)}
              </span>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
              <span className="text-sm font-bold text-white">{contact.abby_score}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Quiz Score Bar */}
          {contact.quiz_score != null && (
            <div className="bg-[#F0F4F8] rounded-lg p-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1E3A5F]">Quiz Score</span>
                <span className="font-bold text-[#D4AF37]">{contact.quiz_score}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${contact.quiz_score}%`,
                    background: getQuizStageColor(contact.quiz_stage || ""),
                  }}
                />
              </div>
              {contact.quiz_completed_at && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Completed {new Date(contact.quiz_completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-1.5">
            {contact.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </p>
            )}
            {contact.company && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {contact.company}
              </p>
            )}
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Source: {getSourceLabel(contact.source || "")}
            </p>
          </div>

          {/* ABBY Recommendation — prominent gold box */}
          <div className="bg-[#FFFBEB] border-l-4 border-[#D4AF37] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
              <span className="text-sm font-bold text-[#1E3A5F]">ABBY says</span>
            </div>
            {recLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-3 rounded-full" style={{ background: "linear-gradient(90deg, #D4AF3720, #D4AF3740, #D4AF3720)", width: `${60 + i * 15}%` }} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic leading-relaxed">"{recommendation}"</p>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => document.getElementById("crm-note-input")?.focus()}>
              <MessageSquare className="h-3 w-3" /> Add Note
            </Button>
            <Select value={contact.stage} onValueChange={handleStageChange}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1 border-dashed">
                <ArrowUpDown className="h-3 w-3" />
                <SelectValue placeholder="Move Stage" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[k] }} />
                      {v}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => document.getElementById("crm-tag-input")?.focus()}>
              <Tag className="h-3 w-3" /> Add Tag
            </Button>
            <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(contact.tags ?? []).map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#14B8A6]/15 text-[#14B8A6] font-medium">{tag}</span>
              ))}
              {(contact.tags ?? []).length === 0 && <span className="text-[11px] text-gray-400">No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <Input id="crm-tag-input" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." className="text-xs h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()} />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Add Note */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Add Note</label>
            <Textarea id="crm-note-input" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Type a note..." rows={2} className="text-sm" />
            <Button size="sm" className="mt-2 bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90" onClick={handleAddNote} disabled={!newNote.trim()}>
              <MessageSquare className="h-3 w-3 mr-1" /> Save Note
            </Button>
          </div>

          {/* Activity Timeline */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Activity Timeline</label>
            {activitiesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet.</p>
            ) : (
              <div className="relative pl-6 space-y-3 max-h-[280px] overflow-y-auto">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200" />
                {activities.map((a) => (
                  <div key={a.id} className="relative flex gap-3 text-sm">
                    {/* Timeline dot */}
                    <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[10px]">
                      {ACTIVITY_ICONS[a.type] || "•"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#1E3A5F]">{a.content || a.type.replace(/_/g, " ")}</p>
                      <p className="text-gray-400 text-[12px]">
                        {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {a.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
