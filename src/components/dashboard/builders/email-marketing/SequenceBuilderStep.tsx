import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Mail, ArrowRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EmailSequence, EmailItem, EmailMarketingConfig, SequenceType } from "./types";
import { SEQUENCE_META } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function SequenceBuilderStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<SequenceType | null>(null);
  const sequences: Record<string, EmailSequence> = stepData.emailSequences || {};
  const config: EmailMarketingConfig = stepData.emailConfig || {};

  const generateSequence = async (type: SequenceType) => {
    setGenerating(true);
    setGeneratingType(type);
    try {
      const meta = SEQUENCE_META[type];
      const { data: manuscript } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("asset_type", "source_material")
        .maybeSingle();

      const excerpt = manuscript?.content?.slice(0, 6000) || "";

      const resp = await supabase.functions.invoke("business-consultant", {
        body: {
          messages: [
            {
              role: "system",
              content: `You are an email marketing expert. Generate a "${meta.label}" email sequence for the book "${bookTitle}". Tone: ${config.tone || "conversational"}. Goal: ${config.primaryGoal || "nurture_sale"}. Lead magnet: ${config.leadMagnet || "workbook"}. Generate ${meta.emailCount} emails over ${meta.spanDays} days. Return JSON: { emails: [{ id, position, subjectOptions: string[] (3 options), selectedSubject: 0, previewText, bodyMarkdown, ctaText, ctaLink, psLine, sendDay: number, sendTime: "9:00 AM", abTesting: false }] }. Extract key insights from the manuscript for email content. Only return JSON.`,
            },
            { role: "user", content: `Manuscript excerpt:\n${excerpt}\n\nGenerate the ${meta.label} sequence.` },
          ],
          bookId,
          isPremium: true,
        },
      });

      if (resp.error) throw resp.error;
      const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response");
      const parsed = JSON.parse(jsonMatch[0]);

      const sequence: EmailSequence = {
        type,
        label: meta.label,
        description: meta.description,
        emails: (parsed.emails || []).map((e: any, i: number) => ({
          ...e,
          id: e.id || crypto.randomUUID(),
          sequenceType: type,
          position: e.position || i + 1,
          subjectOptions: e.subjectOptions || [e.subject || `Email ${i + 1}`],
          selectedSubject: 0,
        })),
      };

      setStepData(prev => ({
        ...prev,
        emailSequences: { ...(prev.emailSequences || {}), [type]: sequence },
      }));
      toast({ title: `${meta.label} generated — ${sequence.emails.length} emails!` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const sequenceTypes: SequenceType[] = ["welcome", "nurture", "launch", "re_engagement"];
  const totalEmails = Object.values(sequences).reduce((sum, s) => sum + s.emails.length, 0);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            I'll create 4 interconnected email sequences from your book content. Each sequence serves a different purpose in your reader-to-buyer journey.
          </p>
        </div>
      </Card>

      {/* Visual timeline */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Email Journey Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          {sequenceTypes.map((type, i) => {
            const meta = SEQUENCE_META[type];
            const seq = sequences[type];
            const isGen = generatingType === type;
            return (
              <div key={type} className="relative pl-10 pb-6 last:pb-0">
                <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${seq ? "bg-accent border-accent" : "bg-background border-muted-foreground/30"}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <Badge className={`text-[9px] ${meta.color}`}>
                        {meta.emailCount} emails • {meta.spanDays} days
                      </Badge>
                      {seq && <Badge className="bg-accent/10 text-accent text-[9px]">✓ Generated</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  {!seq && (
                    <Button size="sm" onClick={() => generateSequence(type)} disabled={generating}
                      className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      {isGen ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                      {isGen ? "Generating..." : "Generate"}
                    </Button>
                  )}
                </div>
                {seq && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {seq.emails.map((email, ei) => (
                      <div key={email.id} className="flex items-center gap-0.5">
                        <div className="w-6 h-6 rounded bg-secondary/10 flex items-center justify-center text-[9px] font-bold text-secondary">
                          {ei + 1}
                        </div>
                        {ei < seq.emails.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />}
                      </div>
                    ))}
                    <span className="text-[10px] text-muted-foreground self-center ml-1">
                      Day 1 → Day {seq.emails[seq.emails.length - 1]?.sendDay || meta.spanDays}
                    </span>
                  </div>
                )}
                {i < sequenceTypes.length - 1 && seq && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ArrowRight className="h-3 w-3" /> Subscribers flow to next sequence
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium">{totalEmails} emails across {Object.keys(sequences).length} sequences</span>
          </div>
          {Object.keys(sequences).length < 4 && (
            <Button size="sm" variant="outline" onClick={() => {
              const missing = sequenceTypes.find(t => !sequences[t]);
              if (missing) generateSequence(missing);
            }} disabled={generating}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Next
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
