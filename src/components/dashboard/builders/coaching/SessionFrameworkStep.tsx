import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, BookOpen, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SessionPlan, CoachingConfig } from "./types";
import { STRUCTURE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function SessionFrameworkStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [expandedSession, setExpandedSession] = useState<number | null>(0);

  const config: CoachingConfig = stepData.coachingConfig || {};
  const sessions: SessionPlan[] = stepData.sessionPlans || [];
  const sessionCount = STRUCTURE_LABELS[config.structure || "12-week"]?.sessions || 12;

  const generateFramework = async () => {
    setGenerating(true);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate a ${sessionCount}-session coaching framework for the book "${bookTitle}".
Focus area: ${config.focusArea || "the book's core transformation"}.
Session duration: ${config.sessionDuration || 60} minutes.

For each session, provide JSON array with objects containing:
- sessionNumber (int)
- theme (string)
- chapterRef (which book chapter this maps to)
- objectives (array of 2-3 strings)
- discussionQuestions (array of 3-4 strings)
- exercise (string describing the session exercise)
- homework (string describing take-home work)
- progressCheckpoint (string describing how to measure progress)

Return ONLY a JSON array, no markdown.`,
          }],
          bookId,
          isPremium: true,
        }),
      });

      if (!resp.ok) throw new Error("Generation failed");

      const text = await resp.text();
      // Parse streaming SSE response
      let fullText = "";
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          fullText += parsed.choices?.[0]?.delta?.content || "";
        } catch (error) {
      console.error(error);
    }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const plans: SessionPlan[] = JSON.parse(jsonMatch[0]).map((s: any, i: number) => ({
          ...s,
          id: `session-${i}`,
        }));
        setStepData(prev => ({ ...prev, sessionPlans: plans }));
        toast({ title: `${plans.length} session plans generated!` });
      } else {
        throw new Error("Could not parse response");
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  const updateSession = (idx: number, patch: Partial<SessionPlan>) => {
    onMarkEdited("intake");
    const updated = [...sessions];
    updated[idx] = { ...updated[idx], ...patch };
    setStepData(prev => ({ ...prev, sessionPlans: updated }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Recommendation</p>
            <p className="text-sm text-muted-foreground">
              Each session maps to a chapter in your book. I'll create a structured framework with objectives, discussion questions, exercises, and homework for {sessionCount} sessions.
            </p>
          </div>
        </div>
      </Card>

      {sessions.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Session Framework</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create a {sessionCount}-session coaching framework mapped to your book chapters.
          </p>
          <Button onClick={generateFramework} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : "Generate Framework"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{sessions.length} Sessions</p>
            <Button variant="outline" size="sm" onClick={generateFramework} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Regenerate
            </Button>
          </div>

          {sessions.map((session, idx) => (
            <Card key={session.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedSession(expandedSession === idx ? null : idx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-violet-600">{session.sessionNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{session.theme}</p>
                  <p className="text-xs text-muted-foreground truncate">Chapter: {session.chapterRef}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{session.objectives?.length || 0} objectives</Badge>
                {expandedSession === idx ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedSession === idx && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Theme</label>
                      <Input value={session.theme} onChange={e => updateSession(idx, { theme: e.target.value })} className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chapter Reference</label>
                      <Input value={session.chapterRef} onChange={e => updateSession(idx, { chapterRef: e.target.value })} className="text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Objectives</label>
                    {session.objectives?.map((obj, oi) => (
                      <Input key={oi} value={obj} onChange={e => {
                        const updated = [...(session.objectives || [])];
                        updated[oi] = e.target.value;
                        updateSession(idx, { objectives: updated });
                      }} className="text-sm mb-1" />
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Discussion Questions</label>
                    {session.discussionQuestions?.map((q, qi) => (
                      <Input key={qi} value={q} onChange={e => {
                        const updated = [...(session.discussionQuestions || [])];
                        updated[qi] = e.target.value;
                        updateSession(idx, { discussionQuestions: updated });
                      }} className="text-sm mb-1" />
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Exercise</label>
                    <Textarea value={session.exercise} onChange={e => updateSession(idx, { exercise: e.target.value })} rows={2} className="text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Homework</label>
                    <Textarea value={session.homework} onChange={e => updateSession(idx, { homework: e.target.value })} rows={2} className="text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress Checkpoint</label>
                    <Input value={session.progressCheckpoint} onChange={e => updateSession(idx, { progressCheckpoint: e.target.value })} className="text-sm" />
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Pre/Post Session Templates */}
          <Card className="p-4 mt-4">
            <p className="text-xs font-semibold mb-3">Session Templates</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pre-Session Questionnaire</label>
                <Textarea
                  value={stepData.preSessionQ || "1. What progress did you make on last session's action items?\n2. What challenges did you face?\n3. What would you like to focus on today?"}
                  onChange={e => { onMarkEdited("intake"); setStepData(prev => ({ ...prev, preSessionQ: e.target.value })); }}
                  rows={4}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Post-Session Action Items</label>
                <Textarea
                  value={stepData.postSessionTemplate || "## Action Items\n- [ ] \n- [ ] \n\n## Key Takeaways\n- \n\n## Next Session Focus\n- "}
                  onChange={e => { onMarkEdited("intake"); setStepData(prev => ({ ...prev, postSessionTemplate: e.target.value })); }}
                  rows={4}
                  className="text-sm"
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
