import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Clock, StickyNote, Mail as MailIcon, Phone as PhoneIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Activity {
  id: string;
  type: string;
  content: string | null;
  created_at: string;
}

interface Props {
  contactName: string;
  activities: Activity[];
  onAddActivity: (type: string, content: string) => Promise<void>;
  loading?: boolean;
}

const typeIcons: Record<string, typeof StickyNote> = {
  note: StickyNote,
  email: MailIcon,
  call: PhoneIcon,
};

const typeLabels: Record<string, string> = {
  note: "Note",
  email: "Email",
  call: "Call",
};

export default function ActivityPanel({ contactName, activities, onAddActivity, loading }: Props) {
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    await onAddActivity(type, content);
    setContent("");
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-heading font-semibold">Activity — {contactName}</h3>

      {/* Add activity */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="call">Call</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Log an interaction..."
            rows={2}
            className="flex-1"
          />
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Log Activity
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activities.map((a) => {
            const Icon = typeIcons[a.type] || StickyNote;
            return (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    <span className="ml-1 capitalize">{typeLabels[a.type] || a.type}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
