import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface CRMContact {
  id: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
  stage: string;
  abby_score: number;
  source: string;
  last_activity_at: string | null;
  tags: string[];
  notes?: string | null;
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
  new_lead: "bg-blue-500/20 text-blue-400", engaged: "bg-teal-500/20 text-teal-400",
  warm: "bg-amber-500/20 text-amber-400", hot: "bg-orange-500/20 text-orange-400",
  customer: "bg-green-500/20 text-green-400", vip: "bg-yellow-500/20 text-yellow-400",
  cold: "bg-gray-500/20 text-gray-400",
};

export default function ContactDetailPanel({ contact, open, onClose, crmFetch, onRefresh }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!contact || !open) return;
    // Load activities
    setActivitiesLoading(true);
    crmFetch("list-activities", { contact_id: contact.id })
      .then((d) => setActivities(d.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));

    // Load ABBY recommendation
    setRecLoading(true);
    setRecommendation("");
    crmFetch("abby-contact-recommendation", { contact_id: contact.id })
      .then((d) => setRecommendation(d.recommendation || ""))
      .catch(() => setRecommendation("Unable to generate recommendation."))
      .finally(() => setRecLoading(false));
  }, [contact?.id, open]);

  if (!contact) return null;

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
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg">{contact.full_name}</SheetTitle>
          <SheetDescription className="sr-only">Contact details for {contact.full_name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Contact Info */}
          <div className="space-y-1.5">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </p>
            )}
            {contact.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {contact.company}
              </p>
            )}
          </div>

          {/* Stage + Score */}
          <div className="flex items-center gap-3">
            <Badge className={`${STAGE_COLORS[contact.stage] || ""}`}>
              {STAGE_LABELS[contact.stage] || contact.stage}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold">{contact.abby_score}</span>
              <span className="text-[10px] text-muted-foreground">ABBY Score</span>
            </div>
          </div>

          {/* Move Stage */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Move Stage</label>
            <Select value={contact.stage} onValueChange={handleStageChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ABBY Recommendation */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs font-semibold">ABBY's Recommendation</span>
            </div>
            {recLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                <span className="text-[11px] text-muted-foreground">Analysing...</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">{recommendation}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
              {contact.tags.length === 0 && <span className="text-[10px] text-muted-foreground">No tags</span>}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." className="text-xs h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()} />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Add Note */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Add Note</label>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Type a note..." rows={2} className="text-sm" />
            <Button size="sm" className="mt-2" onClick={handleAddNote} disabled={!newNote.trim()}>
              <MessageSquare className="h-3 w-3 mr-1" /> Save Note
            </Button>
          </div>

          {/* Activity Timeline */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Activity Timeline</label>
            {activitiesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground">{a.content || a.type}</p>
                      <p className="text-muted-foreground/60">
                        {new Date(a.created_at).toLocaleDateString()} · {a.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="pt-3 border-t">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Contact
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
