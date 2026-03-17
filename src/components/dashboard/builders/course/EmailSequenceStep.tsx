import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { CourseStepProps, EmailStep } from "./types";

export default function EmailSequenceStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const emails: EmailStep[] = stepData.emailSequence?.emails || [];
  const [selectedIdx, setSelectedIdx] = useState(0);

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

      const basePrompt = `Generate a 7-email nurture sequence for an online course called "${title}" based on the book "${bookTitle}" with ${moduleCount} modules.

The sequence should cover: Welcome, Quick Win, Social Proof, Overcome Objection, Urgency, Last Chance, Post-Purchase Onboarding.

Return a JSON array of 7 objects, each with:
- "dayNumber": number (day the email sends, starting at 0)
- "purpose": string (e.g. "Welcome + what to expect")
- "subject": string (compelling subject line)
- "previewText": string (email preview text)
- "body": string (full email body with [First Name], [Author Name] placeholders, and [CTA Button →] links)

Make each email specific to the course topic. Return ONLY valid JSON.`;

      const aiOptions = {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: "online-course",
        builderLabel: "Online Course",
        builderStep: "Email Sequence",
      } as const;

      let parsed: any;
      try {
        parsed = await generateJSONWithAI<any>(basePrompt, aiOptions);
      } catch {
        parsed = await generateJSONWithAI<any>(
          `${basePrompt}\n\nSTRICT FORMAT: Return ONLY a valid JSON array with exactly 7 objects. Start with [ and end with ]. No prose, no markdown, no headings.`,
          aiOptions,
        );
      }

      const result = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.emails)
          ? parsed.emails
          : Array.isArray(parsed?.sequence)
            ? parsed.sequence
            : [];

      if (!Array.isArray(result) || result.length < 7) {
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">Email {selectedIdx + 1} of {emails.length}</Badge>
            <Badge variant="outline" className="text-[10px]">
              <Clock className="h-2.5 w-2.5 mr-1" /> Day {selectedEmail.dayNumber}
            </Badge>
            <span className="text-[10px] text-muted-foreground">— {selectedEmail.purpose}</span>
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

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Send Timing: Day</label>
              <Input
                type="number"
                value={selectedEmail.dayNumber}
                onChange={(e) => updateEmail(selectedIdx, "dayNumber", parseInt(e.target.value) || 0)}
                className="w-16"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Body</label>
              <Textarea
                value={selectedEmail.body}
                onChange={(e) => updateEmail(selectedIdx, "body", e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
