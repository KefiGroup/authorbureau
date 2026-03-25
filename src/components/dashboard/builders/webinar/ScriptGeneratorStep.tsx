import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Clock, ChevronDown, ChevronUp, FileText, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ScriptSection, WebinarConfig } from "./types";
import { DEFAULT_SCRIPT_SECTIONS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: string;
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
}

export default function ScriptGeneratorStep({
  stepData, setStepData, onMarkEdited, bookId, bookTitle, plan,
  generationState, setGenerationState,
}: Props) {
  const { toast } = useToast();
  const config: WebinarConfig = stepData["configure"]?.config || {};
  const sections: ScriptSection[] = stepData["script"]?.sections || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateScript = async () => {
    setGenerating(true);
    setGenerationState("queued");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      setTimeout(() => setGenerationState("analyzing"), 1500);
      setTimeout(() => setGenerationState("generating"), 4000);

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: `You are a webinar script writer for authors. Generate a ${config.duration || 60}-minute webinar script.

Book: "${bookTitle}"
Webinar title: "${config.title || bookTitle}"
Type: ${config.type || "lead_magnet"}
Duration: ${config.duration || 60} minutes
CTA product: ${config.primaryCtaProduct || "online course"}
Business plan context: ${plan ? JSON.stringify(plan).slice(0, 1500) : "None"}

Return ONLY a JSON array of script sections. Each section:
{
  "id": "hook|credibility|content1|content2|content3|transition|offer|close",
  "label": "Section Name",
  "timeStart": "0:00",
  "timeEnd": "5:00",
  "script": "Full script text for the presenter to read (200-400 words per section)",
  "speakerNotes": "Brief notes for the speaker",
  "slideRef": "Description of what slide should show",
  "engagementPrompt": "Poll question, chat prompt, or audience interaction",
  "wordCount": 250,
  "estimatedMinutes": 5
}

Generate 8 sections covering the full webinar. Make the script compelling with stories, data, and audience engagement. No markdown wrapping.`,
          }],
          bookId,
          isPremium: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Generation failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) accumulated += delta;
          } catch (error) {
      console.error(error);
    }
        }
      }

      const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No valid JSON");

      const rawSections: ScriptSection[] = JSON.parse(jsonMatch[0]);
      setStepData(prev => ({ ...prev, script: { ...prev.script, sections: rawSections } }));
      setGenerationState("complete");
      toast({ title: "Script generated!", description: `${rawSections.length} sections ready for review.` });
    } catch (err) {
      console.error("Script generation error:", err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = (sectionId: string) => {
    setStepData(prev => ({
      ...prev,
      script: {
        ...prev.script,
        sections: sections.map(s => s.id === sectionId ? { ...s, script: editBuffer, wordCount: editBuffer.split(/\s+/).length, estimatedMinutes: Math.round(editBuffer.split(/\s+/).length / 150) } : s),
      },
    }));
    onMarkEdited("script");
    setEditingId(null);
  };

  if (sections.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <Sparkles className="h-10 w-10 text-secondary/40 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Webinar Script</h3>
        <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
          AI will create a structured {config.duration || 60}-minute script with time markers, speaker notes, and engagement prompts.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Based on your book "{bookTitle}" and webinar settings
        </p>
        <Button
          onClick={generateScript}
          disabled={generating}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Script
        </Button>
      </Card>
    );
  }

  const totalWords = sections.reduce((a, s) => a + (s.wordCount || 0), 0);
  const totalMinutes = sections.reduce((a, s) => a + (s.estimatedMinutes || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-xs">{sections.length} sections</Badge>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {totalWords.toLocaleString()} words</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{totalMinutes} min speaking time</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {sections.map(section => {
          const isExpanded = expandedId === section.id;
          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className="w-16 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-mono">{section.timeStart}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{section.script?.slice(0, 80)}...</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{section.wordCount || 0}w</span>
                  <span className="text-[10px] text-muted-foreground">{section.estimatedMinutes || 0}m</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {editingId === section.id ? (
                    <div className="space-y-2">
                      <Textarea value={editBuffer} onChange={e => setEditBuffer(e.target.value)} rows={8} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(section.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Script</p>
                        <p className="text-sm whitespace-pre-wrap">{section.script}</p>
                      </div>
                      {section.speakerNotes && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Speaker Notes</p>
                          <p className="text-xs text-muted-foreground">{section.speakerNotes}</p>
                        </div>
                      )}
                      {section.engagementPrompt && (
                        <div className="flex items-start gap-2 bg-secondary/5 rounded-lg p-3">
                          <MessageSquare className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-0.5">Engagement Prompt</p>
                            <p className="text-xs">{section.engagementPrompt}</p>
                          </div>
                        </div>
                      )}
                      {section.slideRef && (
                        <p className="text-[10px] text-muted-foreground">🎞 Slide: {section.slideRef}</p>
                      )}
                      <Button
                        size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => { setEditingId(section.id); setEditBuffer(section.script); }}
                      >
                        Edit Script
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
