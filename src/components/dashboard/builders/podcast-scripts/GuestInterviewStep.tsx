import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Users, Mail, MessageSquare, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EpisodeCard, GuestGuide, PodcastScriptsConfig } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function GuestInterviewStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const episodes: EpisodeCard[] = stepData.episodeRoadmap || [];
  const config: PodcastScriptsConfig = stepData.podcastConfig || {};
  const guides: Record<string, GuestGuide> = stepData.guestGuides || {};
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const interviewEpisodes = episodes.filter(ep => ep.guestSuggestion || config.format === "interview" || config.format === "mix");
  const hasInterviews = interviewEpisodes.length > 0;

  const copyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateGuide = async (ep: EpisodeCard) => {
    setGenerating(ep.id);
    try {
      const resp = await supabase.functions.invoke("business-consultant", {
        body: {
          messages: [
            {
              role: "system",
              content: `You are a podcast production expert. Generate a guest interview guide for episode "${ep.title}" (Ep ${ep.episodeNumber}) of "${config.podcastName || bookTitle} Podcast". Guest: ${ep.guestSuggestion || "TBD"}. Topic: ${ep.keyTopic}. Return JSON: { suggestedGuest: string, researchBrief: string (2-3 paragraphs), questions: string[] (10-15 questions), talkingPoints: string[] (5-7 points), guestBioTemplate: string, outreachEmail: string }. Only return JSON.`,
            },
            { role: "user", content: `Generate the interview guide for this episode.` },
          ],
          bookId,
          isPremium: true,
        },
      });

      if (resp.error) throw resp.error;
      const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response");
      const parsed: GuestGuide = { ...JSON.parse(jsonMatch[0]), episodeId: ep.id };

      setStepData(prev => ({
        ...prev,
        guestGuides: { ...(prev.guestGuides || {}), [ep.id]: parsed },
      }));
      toast({ title: "Interview guide generated!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  if (!hasInterviews) {
    return (
      <div className="space-y-6">
        <Card className="p-4 border-secondary/20 bg-secondary/5">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Your podcast is set to <strong>Solo</strong> format, so guest interview guides aren't needed. You can skip this step or switch to Interview/Mix format in Setup.
            </p>
          </div>
        </Card>
        <Card className="p-8 text-center border-dashed">
          <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No interview episodes to prepare.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            AI will generate research briefs, 10-15 interview questions, talking points, and outreach email templates for each guest episode.
          </p>
        </div>
      </Card>

      {interviewEpisodes.map(ep => {
        const guide = guides[ep.id];
        const isGenerating = generating === ep.id;

        return (
          <Card key={ep.id} className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center">
                  {ep.episodeNumber}
                </span>
                <div>
                  <p className="text-sm font-semibold">{ep.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ep.guestSuggestion ? `Guest: ${ep.guestSuggestion}` : "Guest TBD"}
                  </p>
                </div>
              </div>
              {!guide && (
                <Button size="sm" onClick={() => generateGuide(ep)} disabled={isGenerating} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Generate Guide
                </Button>
              )}
              {guide && <Badge className="bg-accent/10 text-accent text-[10px]">✓ Ready</Badge>}
            </div>

            {guide && (
              <div className="p-4 space-y-5">
                {/* Research Brief */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Pre-Interview Research Brief</Label>
                  <Card className="p-3 bg-muted/20">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guide.researchBrief}</p>
                  </Card>
                </div>

                {/* Questions */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" /> Interview Questions ({guide.questions.length})
                  </Label>
                  <div className="space-y-2">
                    {guide.questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/20">
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{i + 1}.</span>
                        <p className="text-sm flex-1">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Talking Points */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Talking Points</Label>
                  <div className="flex flex-wrap gap-2">
                    {guide.talkingPoints.map((tp, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tp}</Badge>
                    ))}
                  </div>
                </div>

                {/* Guest Bio Template */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Guest Bio Template</Label>
                  <Card className="p-3 bg-muted/20">
                    <p className="text-sm text-muted-foreground">{guide.guestBioTemplate}</p>
                  </Card>
                </div>

                {/* Outreach Email */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Outreach Email Template
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(guide.outreachEmail, `email-${ep.id}`)}
                      className="text-xs h-7"
                    >
                      {copiedField === `email-${ep.id}` ? <Check className="h-3 w-3 mr-1 text-accent" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedField === `email-${ep.id}` ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <Card className="p-3 bg-muted/20">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guide.outreachEmail}</p>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
