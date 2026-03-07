import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Clock, Wand2, Check } from "lucide-react";
import type { EmailSequence, EmailItem, SequenceType } from "./types";
import { SEQUENCE_META } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
}

export default function EmailContentStep({ stepData, setStepData, onMarkEdited }: Props) {
  const sequences: Record<string, EmailSequence> = stepData.emailSequences || {};
  const seqTypes = Object.keys(sequences) as SequenceType[];
  const [activeSeq, setActiveSeq] = useState<SequenceType>(seqTypes[0] || "welcome");
  const [activeEmail, setActiveEmail] = useState(0);

  const currentSeq = sequences[activeSeq];
  const currentEmail = currentSeq?.emails[activeEmail];

  const updateEmail = (field: keyof EmailItem, value: any) => {
    if (!currentSeq || !currentEmail) return;
    const updated = {
      ...currentSeq,
      emails: currentSeq.emails.map((e, i) => i === activeEmail ? { ...e, [field]: value } : e),
    };
    setStepData(prev => ({
      ...prev,
      emailSequences: { ...prev.emailSequences, [activeSeq]: updated },
    }));
    onMarkEdited("content");
  };

  if (seqTypes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Generate at least one sequence in Step 2 first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sequence tabs */}
      <Tabs value={activeSeq} onValueChange={v => { setActiveSeq(v as SequenceType); setActiveEmail(0); }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {seqTypes.map(type => {
            const meta = SEQUENCE_META[type];
            return (
              <TabsTrigger key={type} value={type} className="text-xs">
                {meta.label} ({sequences[type].emails.length})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {currentSeq && (
        <>
          {/* Email navigator */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {currentSeq.emails.map((email, i) => (
              <button key={email.id} onClick={() => setActiveEmail(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === activeEmail ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                Email {i + 1}
                <span className="ml-1 opacity-60">Day {email.sendDay}</span>
              </button>
            ))}
          </div>

          {currentEmail && (
            <Card className="p-5 space-y-5">
              {/* Subject lines */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-2">
                  Subject Line
                  {currentEmail.subjectOptions?.length > 1 && (
                    <Badge variant="outline" className="text-[9px]">
                      <Wand2 className="h-2.5 w-2.5 mr-1" /> {currentEmail.subjectOptions.length} AI options
                    </Badge>
                  )}
                </Label>
                {currentEmail.subjectOptions?.map((subject, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <button
                      onClick={() => updateEmail("selectedSubject", si)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        currentEmail.selectedSubject === si ? "border-secondary bg-secondary" : "border-muted-foreground/30"
                      }`}>
                      {currentEmail.selectedSubject === si && <Check className="h-3 w-3 text-secondary-foreground" />}
                    </button>
                    <Input
                      value={subject}
                      onChange={e => {
                        const updated = [...(currentEmail.subjectOptions || [])];
                        updated[si] = e.target.value;
                        updateEmail("subjectOptions", updated);
                      }}
                      className="text-sm"
                    />
                    {currentEmail.abTesting && si < 2 && (
                      <Badge variant="outline" className="text-[9px] shrink-0">A/B {String.fromCharCode(65 + si)}</Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview text */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Preview Text</Label>
                <Input value={currentEmail.previewText || ""} onChange={e => updateEmail("previewText", e.target.value)} placeholder="Appears after subject in inbox..." />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Email Body</Label>
                <Textarea
                  value={currentEmail.bodyMarkdown || ""}
                  onChange={e => updateEmail("bodyMarkdown", e.target.value)}
                  className="min-h-[200px] text-sm font-mono"
                  placeholder="Email content (markdown supported)..."
                />
              </div>

              {/* CTA */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CTA Button Text</Label>
                  <Input value={currentEmail.ctaText || ""} onChange={e => updateEmail("ctaText", e.target.value)} placeholder="Get Started →" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CTA Link</Label>
                  <Input value={currentEmail.ctaLink || ""} onChange={e => updateEmail("ctaLink", e.target.value)} placeholder="https://..." />
                </div>
              </div>

              {/* P.S. Line */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">P.S. Line</Label>
                <Input value={currentEmail.psLine || ""} onChange={e => updateEmail("psLine", e.target.value)} placeholder="P.S. Don't forget to..." />
              </div>

              {/* Timing */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="h-3 w-3" /> Send Day</Label>
                  <Input type="number" min={1} value={currentEmail.sendDay || 1} onChange={e => updateEmail("sendDay", parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Send Time</Label>
                  <Input value={currentEmail.sendTime || "9:00 AM"} onChange={e => updateEmail("sendTime", e.target.value)} placeholder="9:00 AM" />
                </div>
              </div>

              {/* A/B toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-xs font-semibold">A/B Test Subject Line</p>
                  <p className="text-[10px] text-muted-foreground">Test two subject lines to optimize open rates</p>
                </div>
                <button
                  onClick={() => updateEmail("abTesting", !currentEmail.abTesting)}
                  className={`w-10 h-5 rounded-full transition-colors ${currentEmail.abTesting ? "bg-secondary" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-background shadow transition-transform ${currentEmail.abTesting ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </Card>
          )}

          {/* Email navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={activeEmail === 0} onClick={() => setActiveEmail(activeEmail - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Email {activeEmail + 1} of {currentSeq.emails.length}
            </span>
            <Button variant="outline" size="sm" disabled={activeEmail >= currentSeq.emails.length - 1} onClick={() => setActiveEmail(activeEmail + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
