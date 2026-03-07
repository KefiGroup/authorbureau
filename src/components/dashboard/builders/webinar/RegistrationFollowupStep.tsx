import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Clock, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RegistrationPage, FollowUpEmail, WebinarConfig } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

const DEFAULT_EMAILS: FollowUpEmail[] = [
  { id: "confirm", type: "confirmation", subject: "You're registered! Here's what to expect", body: "Thank you for registering! Here's what you'll learn..." },
  { id: "remind24", type: "reminder_24h", subject: "Tomorrow: Don't miss this live session", body: "Just a reminder — your live session is tomorrow at..." },
  { id: "remind1h", type: "reminder_1h", subject: "Starting in 1 hour!", body: "We're going live in just 1 hour. Here's your access link..." },
  { id: "starting", type: "starting_now", subject: "🔴 We're LIVE! Join now", body: "The webinar has started! Click below to join..." },
  { id: "replay", type: "replay", subject: "Your replay is ready", body: "Couldn't make it live? No worries — here's your replay..." },
  { id: "offer", type: "offer_reminder", subject: "Special offer expires soon", body: "During the webinar, we shared an exclusive offer..." },
  { id: "last", type: "last_chance", subject: "⏰ Last chance — offer expires tonight", body: "This is your final reminder. The special offer..." },
  { id: "noshow", type: "no_show", subject: "We missed you! Here's what you missed", body: "We noticed you couldn't make it to the webinar..." },
];

export default function RegistrationFollowupStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const config: WebinarConfig = stepData["configure"]?.config || {};
  const regPage: RegistrationPage = stepData["registration"]?.regPage || {
    headline: `Free Live Masterclass: ${config.title || bookTitle}`,
    description: `Join the author for a ${config.duration || 60}-minute deep dive into the key concepts from "${bookTitle}". Walk away with actionable strategies you can implement immediately.`,
    dateTime: "",
    speakerBio: "",
    ctaText: config.type === "paid_workshop" ? `Reserve Your Spot — $${config.price || 47}` : "Register Free →",
    bullets: [
      "The #1 mistake most people make (and how to avoid it)",
      "A proven framework you can start using today",
      "Live Q&A with the author",
    ],
  };
  const emails: FollowUpEmail[] = stepData["registration"]?.emails || DEFAULT_EMAILS;
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState({ subject: "", body: "" });

  const updateRegPage = (patch: Partial<RegistrationPage>) => {
    setStepData(prev => ({ ...prev, registration: { ...prev.registration, regPage: { ...regPage, ...patch } } }));
    onMarkEdited("registration");
  };

  const updateEmail = (emailId: string, patch: Partial<FollowUpEmail>) => {
    setStepData(prev => ({
      ...prev,
      registration: {
        ...prev.registration,
        emails: emails.map(e => e.id === emailId ? { ...e, ...patch } : e),
      },
    }));
    onMarkEdited("registration");
  };

  return (
    <div className="space-y-6">
      {/* Registration Page Builder */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Registration Page</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> AI Pre-filled
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1 block">Headline</Label>
            <Input value={regPage.headline} onChange={e => updateRegPage({ headline: e.target.value })} className="text-sm" />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Description</Label>
            <Textarea value={regPage.description} onChange={e => updateRegPage({ description: e.target.value })} rows={3} className="text-sm" />
          </div>

          <div>
            <Label className="text-xs mb-1 block">What You'll Learn (bullet points)</Label>
            <div className="space-y-2">
              {regPage.bullets.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-secondary font-bold">✓</span>
                  <Input
                    value={b}
                    onChange={e => {
                      const updated = [...regPage.bullets];
                      updated[idx] = e.target.value;
                      updateRegPage({ bullets: updated });
                    }}
                    className="text-sm flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Date & Time</Label>
              <Input
                type="datetime-local"
                value={regPage.dateTime}
                onChange={e => updateRegPage({ dateTime: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">CTA Button Text</Label>
              <Input value={regPage.ctaText} onChange={e => updateRegPage({ ctaText: e.target.value })} className="text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Speaker Bio</Label>
            <Textarea value={regPage.speakerBio} onChange={e => updateRegPage({ speakerBio: e.target.value })} rows={2} className="text-sm" placeholder="Brief bio of the presenter..." />
          </div>
        </div>
      </Card>

      {/* Registration Page Preview */}
      <Card className="overflow-hidden">
        <div className="bg-primary text-primary-foreground p-8 text-center">
          <p className="text-[10px] uppercase tracking-wider opacity-70 mb-2">Free Live Masterclass</p>
          <h2 className="font-heading text-xl font-bold mb-3">{regPage.headline}</h2>
          <p className="text-sm opacity-80 max-w-md mx-auto">{regPage.description}</p>
        </div>
        <div className="p-6">
          <div className="space-y-2 mb-6">
            {regPage.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-secondary font-bold text-sm">✓</span>
                <p className="text-sm">{b}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button className="bg-secondary text-secondary-foreground rounded-full px-8">
              {regPage.ctaText}
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Sequences */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Email Sequences</h3>
        </div>

        <div className="space-y-1">
          {/* Reminder Sequence */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-2">
            <Clock className="h-3 w-3 inline mr-1" /> Reminder Sequence
          </p>
          {emails.filter(e => ["confirmation", "reminder_24h", "reminder_1h", "starting_now"].includes(e.type)).map(email => (
            <EmailRow key={email.id} email={email} expandedId={expandedEmailId} setExpandedId={setExpandedEmailId}
              editingId={editingEmailId} setEditingId={setEditingEmailId} editBuffer={editBuffer} setEditBuffer={setEditBuffer}
              onSave={(id) => { updateEmail(id, editBuffer); setEditingEmailId(null); }} />
          ))}

          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
            <Mail className="h-3 w-3 inline mr-1" /> Follow-up Sequence
          </p>
          {emails.filter(e => ["replay", "offer_reminder", "last_chance", "no_show"].includes(e.type)).map(email => (
            <EmailRow key={email.id} email={email} expandedId={expandedEmailId} setExpandedId={setExpandedEmailId}
              editingId={editingEmailId} setEditingId={setEditingEmailId} editBuffer={editBuffer} setEditBuffer={setEditBuffer}
              onSave={(id) => { updateEmail(id, editBuffer); setEditingEmailId(null); }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function EmailRow({ email, expandedId, setExpandedId, editingId, setEditingId, editBuffer, setEditBuffer, onSave }: {
  email: FollowUpEmail;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editBuffer: { subject: string; body: string };
  setEditBuffer: (b: { subject: string; body: string }) => void;
  onSave: (id: string) => void;
}) {
  const isExpanded = expandedId === email.id;
  const typeLabels: Record<string, string> = {
    confirmation: "✅ Confirmation",
    reminder_24h: "⏰ 24h Reminder",
    reminder_1h: "🔔 1h Reminder",
    starting_now: "🔴 Starting Now",
    replay: "📹 Replay",
    offer_reminder: "💰 Offer Reminder",
    last_chance: "⏳ Last Chance",
    no_show: "👋 Didn't Attend",
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setExpandedId(isExpanded ? null : email.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left">
        <span className="text-xs">{typeLabels[email.type] || email.type}</span>
        <span className="text-xs text-muted-foreground flex-1 truncate">{email.subject}</span>
        {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
          {editingId === email.id ? (
            <>
              <Input value={editBuffer.subject} onChange={e => setEditBuffer({ ...editBuffer, subject: e.target.value })} className="text-xs" placeholder="Subject" />
              <Textarea value={editBuffer.body} onChange={e => setEditBuffer({ ...editBuffer, body: e.target.value })} rows={3} className="text-xs" />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-6" onClick={() => onSave(email.id)}>Save</Button>
                <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-medium">Subject: {email.subject}</p>
              <p className="text-xs text-muted-foreground">{email.body}</p>
              <Button size="sm" variant="outline" className="text-[10px] h-6"
                onClick={() => { setEditingId(email.id); setEditBuffer({ subject: email.subject, body: email.body }); }}>
                Edit
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
