import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { CourseStepProps, EmailStep } from "./types";

export default function EmailSequenceStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const emails: EmailStep[] = stepData.emailSequence?.emails || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("author_profiles")
      .select("pen_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.pen_name) setAuthorName(data.pen_name);
      });
  }, [user]);
  const updateEmails = (newEmails: EmailStep[]) => {
    setStepData(prev => ({
      ...prev,
      emailSequence: { ...prev.emailSequence, emails: newEmails },
    }));
    onMarkEdited("email-sequence");
  };

  const updateEmail = (idx: number, field: string, value: any) => {
    const updated = emails.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    updateEmails(updated);
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("generating");

      const title = stepData.foundation?.title || "the course";
      const moduleCount = stepData.curriculum?.modules?.length || 8;

      const displayName = authorName || "the author";

      const basePrompt = `Generate a 7-email nurture sequence for an online course called "${title}" based on the book "${bookTitle}" with ${moduleCount} modules.

The author's name is "${displayName}". Use their real name throughout the emails — do NOT use a placeholder like [Author Name]. Write as if ${displayName} is personally emailing the reader.

Use [First Name] as a placeholder for the reader/participant's first name — this will be dynamically replaced at send time.

The sequence should cover these 7 emails in order:
1. Welcome + what to expect (build excitement for the journey ahead)
2. Quick Win (give them one actionable takeaway they can use today)
3. Social Proof (share a transformation story or testimonial)
4. Overcome Objection (address the #1 doubt or fear)
5. Urgency (create a reason to act now)
6. Last Chance (final nudge before the offer closes)
7. Post-Purchase Onboarding (congratulate and guide them to start Module 1)

The goal is to build trust and sell — warm up the reader and convert them into a course student.

For call-to-action links, use the format [CTA Button → Label Text](SIGNUP_URL) — this will be rendered as a clickable button linking to the course sign-up page.

IMPORTANT: The "dayNumber" field represents the suggested email ORDER (1-7), NOT actual send timing. Actual send timing and triggers will be configured separately in the Email Marketing node. Set dayNumber sequentially as 1 through 7.

Return a JSON array of 7 objects, each with:
- "dayNumber": number (sequential order: 1 through 7)
- "purpose": string (e.g. "Welcome + what to expect")
- "subject": string (compelling subject line)
- "previewText": string (email preview text)
- "body": string (full email body with [First Name] for the reader. Use "${displayName}" directly instead of any author placeholder.)

Make each email specific to the course topic. Return ONLY valid JSON.`;

      const aiOptions = {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: "online-course",
        builderLabel: "Online Course",
        builderStep: "Email Sequence",
      } as const;

      const normalizeSequence = (parsed: any) => {
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.emails)) return parsed.emails;
        if (Array.isArray(parsed?.sequence)) return parsed.sequence;
        if (Array.isArray(parsed?.emailSequence)) return parsed.emailSequence;
        if (Array.isArray(parsed?.items)) return parsed.items;
        return [];
      };

      const isValidSequence = (sequence: any[]) =>
        Array.isArray(sequence) &&
        sequence.length >= 7 &&
        sequence.slice(0, 7).every((e) => typeof e === "object" && e !== null);

      let parsed = await generateJSONWithAI<any>(basePrompt, aiOptions);
      let result = normalizeSequence(parsed);

      if (!isValidSequence(result)) {
        parsed = await generateJSONWithAI<any>(
          `${basePrompt}\n\nSTRICT FORMAT: Return ONLY a valid JSON array with exactly 7 objects. Start with [ and end with ]. No prose, no markdown, no headings.`,
          aiOptions,
        );
        result = normalizeSequence(parsed);
      }

      if (!isValidSequence(result)) {
        throw new Error("No email sequence returned");
      }

      const generated: EmailStep[] = result.slice(0, 7).map((e: any, i: number) => ({
        id: String(i + 1),
        dayNumber: Number(e?.dayNumber ?? e?.day ?? i),
        purpose: String(e?.purpose || "Email purpose"),
        subject: String(e?.subject || `Email ${i + 1}`),
        previewText: String(e?.previewText || ""),
        body: String(e?.body || ""),
      }));

      updateEmails(generated);
      setGenerationState("complete");
      toast({ title: "Email sequence generated!", description: "7 emails ready to review and customize." });
    } catch (err: any) {
      console.error(err);
      setGenerationState("error");
      toast({
        title: "Generation failed",
        description: err?.message?.includes("429")
          ? "Too many requests right now. Please try again in a moment."
          : err?.message?.includes("402")
            ? "AI credits are exhausted. Please top up workspace usage."
            : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (emails.length === 0 && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Email Nurture Sequence</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Abby will create a 7-email sequence: from welcome to post-purchase onboarding.
        </p>
        <Button onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Wand2 className="h-4 w-4 mr-2" /> Generate 7-Email Sequence
        </Button>
      </div>
    );
  }

  if (generationState !== "idle" && generationState !== "complete" && generationState !== "error") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">Writing your email nurture sequence...</p>
      </div>
    );
  }

  const selectedEmail = emails[selectedIdx];

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Email list */}
      <div className="w-56 shrink-0 border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-3 py-2.5 border-b border-border bg-muted/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Sequence</p>
        </div>
        <div className="p-1.5 space-y-0.5">
          {emails.map((email, i) => (
            <button
              key={email.id}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${
                i === selectedIdx ? "bg-secondary/10 text-secondary" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="text-[11px] font-medium truncate">Email {i + 1}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                <span className="text-[9px] text-muted-foreground">Day {email.dayNumber}</span>
              </div>
              <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">{email.purpose}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Email editor */}
      {selectedEmail && (
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">Email {selectedIdx + 1} of {emails.length}</Badge>
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-2.5 w-2.5 mr-1" /> Day {selectedEmail.dayNumber}
              </Badge>
              <span className="text-[10px] text-muted-foreground">— {selectedEmail.purpose}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="text-xs gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" /> Regenerate All
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Subject Line</label>
              <Input
                value={selectedEmail.subject}
                onChange={(e) => updateEmail(selectedIdx, "subject", e.target.value)}
                className="font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Preview Text</label>
              <Input
                value={selectedEmail.previewText}
                onChange={(e) => updateEmail(selectedIdx, "previewText", e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Email Order: #</label>
                <Input
                  type="number"
                  value={selectedEmail.dayNumber}
                  onChange={(e) => {
                    const newDay = parseInt(e.target.value) || 1;
                    updateEmail(selectedIdx, "dayNumber", newDay);
                  }}
                  className="w-16"
                  min={1}
                  max={7}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                This is the <strong>sequence order</strong> of this email (1–7). Actual send timing, triggers, and delays will be configured in the <strong>Email Marketing</strong> node.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Body</label>
              <Textarea
                value={selectedEmail.body}
                onChange={(e) => updateEmail(selectedIdx, "body", e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
              <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground">Dynamic Placeholders</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <span className="text-[10px] text-muted-foreground"><code className="bg-muted px-1 py-0.5 rounded text-[9px] font-mono">[First Name]</code> → Reader's first name (replaced at send time)</span>
                   <span className="text-[10px] text-muted-foreground"><code className="bg-muted px-1 py-0.5 rounded text-[9px] font-mono">[CTA Button → ...](SIGNUP_URL)</code> → Rendered as a clickable button linking to your course sign-up page</span>
                </div>
                {authorName && (
                  <p className="text-[10px] text-muted-foreground mt-1">✓ Author name <strong>{authorName}</strong> is automatically used from your profile.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
