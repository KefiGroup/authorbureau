import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Loader2, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseStepProps, EmailStep } from "./types";

const EMAIL_PURPOSES = [
  "Welcome + what to expect",
  "Quick win from Lesson 1",
  "Deeper insight + social proof",
  "Overcome objection",
  "Urgency / deadline",
  "Last chance",
  "Post-purchase onboarding",
];

export default function EmailSequenceStep({ stepData, setStepData, onMarkEdited, bookTitle, generationState, setGenerationState }: CourseStepProps) {
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

  const handleGenerate = () => {
    setGenerationState("queued");
    setTimeout(() => setGenerationState("generating"), 2000);
    setTimeout(() => {
      const title = stepData.foundation?.title || "the course";
      const generated: EmailStep[] = [
        { id: "1", dayNumber: 0, purpose: EMAIL_PURPOSES[0], subject: `Welcome to ${title} — Here's what to expect`, previewText: "Your learning journey starts now", body: `Hi [First Name],\n\nWelcome aboard! I'm thrilled you've decided to invest in yourself.\n\nHere's what you can expect over the coming weeks:\n\n✅ ${stepData.curriculum?.modules?.length || 8} structured modules\n✅ Practical exercises after every lesson\n✅ A companion workbook to track progress\n\nYour first lesson is ready and waiting. Dive in whenever you're ready.\n\n[Start Module 1 →]\n\nTo your success,\n[Author Name]` },
        { id: "2", dayNumber: 2, purpose: EMAIL_PURPOSES[1], subject: `Quick win: Try this from Lesson 1`, previewText: "A simple exercise that delivers results fast", body: `Hi [First Name],\n\nHave you started Module 1 yet? If so, here's a quick win you can apply today:\n\n[Insert key insight from Lesson 1]\n\nThis single technique has helped hundreds of readers see immediate results.\n\nTry it today and reply to let me know how it goes!\n\n[Continue Your Course →]\n\nCheers,\n[Author Name]` },
        { id: "3", dayNumber: 5, purpose: EMAIL_PURPOSES[2], subject: `"This changed everything for me" — A student story`, previewText: "Real results from someone just like you", body: `Hi [First Name],\n\nI wanted to share something inspiring.\n\n[Student Name] started this course feeling [pain point]. After completing Module 3, they [specific result].\n\n"[Testimonial quote]"\n\nYou have the same potential. Keep going — Module ${Math.min(3, stepData.curriculum?.modules?.length || 3)} dives even deeper.\n\n[Continue Learning →]\n\nRooting for you,\n[Author Name]` },
        { id: "4", dayNumber: 8, purpose: EMAIL_PURPOSES[3], subject: `Feeling stuck? You're not alone`, previewText: "The #1 reason people plateau (and how to push through)", body: `Hi [First Name],\n\nIf you're feeling overwhelmed or stuck, that's completely normal.\n\nThe #1 reason people plateau is [common objection]. Here's how to push through:\n\n1. Focus on one lesson at a time\n2. Complete the exercises — they're designed to build momentum\n3. Re-read the key takeaways before moving on\n\nRemember: progress beats perfection.\n\n[Jump Back In →]\n\nYou've got this,\n[Author Name]` },
        { id: "5", dayNumber: 12, purpose: EMAIL_PURPOSES[4], subject: `⏰ Don't miss out — Special offer ending soon`, previewText: "Your exclusive bonus expires in 48 hours", body: `Hi [First Name],\n\nJust a heads up: the special bonus for course students is expiring in 48 hours.\n\n🎁 [Bonus description]\n\nThis is only available to active students. Once it's gone, it's gone.\n\n[Claim Your Bonus →]\n\nDon't wait,\n[Author Name]` },
        { id: "6", dayNumber: 14, purpose: EMAIL_PURPOSES[5], subject: `Last chance — This closes tonight`, previewText: "Final reminder before the door closes", body: `Hi [First Name],\n\nThis is your final reminder.\n\n[Offer/bonus] closes at midnight tonight.\n\nIf you've been on the fence, now is the time to act.\n\n[Last Chance →]\n\nSee you on the other side,\n[Author Name]` },
        { id: "7", dayNumber: 16, purpose: EMAIL_PURPOSES[6], subject: `You did it! What's next on your journey`, previewText: "Congratulations on completing the course", body: `Hi [First Name],\n\nCongratulations! 🎉 You've completed "${title}"!\n\nHere's what I recommend next:\n\n1. Download your Certificate of Completion\n2. Join our alumni community\n3. Check out [next product] to continue your growth\n\nI'm so proud of your commitment. Keep applying what you've learned.\n\n[Get Your Certificate →]\n\nWith gratitude,\n[Author Name]` },
      ];
      updateEmails(generated);
      setGenerationState("complete");
      toast({ title: "Email sequence generated!", description: "7 emails ready to review and customize." });
    }, 5000);
  };

  if (emails.length === 0 && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Email Nurture Sequence</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will create a 7-email sequence: from welcome to post-purchase onboarding.
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
