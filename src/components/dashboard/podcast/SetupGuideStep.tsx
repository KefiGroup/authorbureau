import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, CheckCircle2, Sparkles, ArrowRight, BookOpen, ChevronDown, ChevronUp, Mic } from "lucide-react";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";

interface Props {
  onNext: () => void;
  bookTitle?: string;
  bookCoverUrl?: string | null;
}

interface PlatformGuide {
  id: string;
  name: string;
  icon: string;
  color: string;
  url: string;
  steps: { label: string; detail: string }[];
}

function buildPlatformGuides(): PlatformGuide[] {
  return [
    {
      id: "spotify",
      name: "Spotify for Podcasters",
      icon: "🎧",
      color: "bg-green-600",
      url: "https://podcasters.spotify.com/",
      steps: [
        { label: "Create a Spotify for Podcasters account", detail: "This is the most popular free podcast hosting platform. It handles RSS distribution to Spotify and other directories." },
        { label: "Set up your podcast profile", detail: "Add your podcast name, description, cover art (3000x3000px square), and category." },
        { label: "Connect to other directories", detail: "Spotify for Podcasters can distribute to Apple Podcasts, Amazon Music, and more — all from one dashboard." },
      ],
    },
    {
      id: "apple",
      name: "Apple Podcasts",
      icon: "🍎",
      color: "bg-purple-600",
      url: "https://podcastsconnect.apple.com/",
      steps: [
        { label: "Get an Apple ID (if you don't have one)", detail: "You need an Apple ID to submit to Apple Podcasts Connect." },
        { label: "Submit your RSS feed to Apple Podcasts Connect", detail: "Once your first episode is uploaded to Spotify for Podcasters, copy your RSS feed URL and submit it here." },
        { label: "Wait for review (24-48 hours)", detail: "Apple reviews all new podcast submissions. Once approved, your show appears on Apple Podcasts, Overcast, and Castbox." },
      ],
    },
    {
      id: "youtube",
      name: "YouTube Podcasts",
      icon: "▶️",
      color: "bg-red-600",
      url: "https://studio.youtube.com/",
      steps: [
        { label: "Create a YouTube channel (or use existing)", detail: "YouTube is now the #1 podcast discovery platform. A dedicated channel or playlist works." },
        { label: "Enable YouTube Podcasts in YouTube Studio", detail: "Go to Settings → Channel → Feature Eligibility → Enable Podcasts." },
        { label: "Submit your RSS feed or upload episodes directly", detail: "YouTube can pull from your RSS feed or you can upload video/audio episodes directly as a podcast playlist." },
      ],
    },
    {
      id: "amazon",
      name: "Amazon Music / Audible",
      icon: "📦",
      color: "bg-amber-600",
      url: "https://podcasters.amazon.com/",
      steps: [
        { label: "Sign up at Amazon Podcasters Portal", detail: "Free submission — especially valuable if you have an existing Audible audience for your audiobook." },
        { label: "Submit your RSS feed", detail: "Amazon Music and Audible both pull from the same RSS submission." },
        { label: "Cross-promote with your audiobook", detail: "If you have an audiobook on Audible, mention your podcast in the audiobook outro and vice versa." },
      ],
    },
  ];
}

export default function PodcastSetupGuideStep({ onNext, bookTitle = "", bookCoverUrl }: Props) {
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const platforms = buildPlatformGuides();
  const checklistStorageKey = `podcast-setup-checklist:${bookTitle || "default"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checklistStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number[]>;
      const restored: Record<string, Set<number>> = {};
      Object.entries(parsed).forEach(([id, indices]) => { restored[id] = new Set(indices); });
      setCompletedSteps(restored);
    } catch (error) { console.error(error); }
  }, [checklistStorageKey]);

  useEffect(() => {
    const serializable = Object.fromEntries(
      Object.entries(completedSteps).map(([id, set]) => [id, Array.from(set)])
    );
    localStorage.setItem(checklistStorageKey, JSON.stringify(serializable));
  }, [completedSteps, checklistStorageKey]);

  const toggleStep = (platformId: string, stepIdx: number) => {
    setCompletedSteps(prev => {
      const current = prev[platformId] || new Set();
      const next = new Set(current);
      next.has(stepIdx) ? next.delete(stepIdx) : next.add(stepIdx);
      return { ...prev, [platformId]: next };
    });
  };

  const totalCompleted = platforms.reduce((sum, p) => sum + (completedSteps[p.id]?.size || 0), 0);
  const totalSteps = platforms.reduce((sum, p) => sum + p.steps.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Your Podcast Launch Strategy"
        expandedByDefault
        tips={[
          "🎙️ Podcasting is the #1 authority builder for authors in 2026. 70% of book buyers say podcasts influence their purchase decisions.",
          "📊 YouTube is now the largest podcast platform (31% of listeners). Being on YouTube + Spotify + Apple covers 85% of all podcast listeners.",
          "💰 You don't need a big audience to monetize. Authors with 500+ downloads/episode can earn $500-2,000/month from sponsorships alone.",
          "⏭️ Already have accounts? Skip ahead — but set up at least Spotify for Podcasters (free hosting + distribution) before generating episodes.",
        ]}
      />

      <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            What Abby Will Generate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Abby reads your manuscript and generates a complete podcast season — scripts, show notes, sponsorship kit, and distribution metadata.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Mic className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">Full Episode Scripts</p>
                <p className="text-[10px] text-muted-foreground">Production-ready</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">Auto</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">Show Notes & SEO</p>
                <p className="text-[10px] text-muted-foreground">Directory-optimized</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">Auto</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="text-green-600 font-bold text-sm">$</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">Sponsorship Media Kit</p>
                <p className="text-[10px] text-muted-foreground">Rate card included</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 ml-auto">Auto</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 mb-3">
          <div>
            <h3 className="font-heading text-lg font-semibold">Distribution Accounts</h3>
            <p className="text-xs text-muted-foreground">Set up accounts so you can publish immediately after generation.</p>
          </div>
          {totalCompleted > 0 && (
            <Badge variant="outline" className="text-xs">{totalCompleted}/{totalSteps} done</Badge>
          )}
        </div>

        {platforms.map(platform => {
          const isExpanded = expandedPlatform === platform.id;
          const completed = completedSteps[platform.id]?.size || 0;
          const total = platform.steps.length;
          const isDone = completed === total;

          return (
            <Card key={platform.id} className={`overflow-hidden transition-all ${isExpanded ? "ring-1 ring-primary/20" : ""}`}>
              <button onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)} className="w-full text-left">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-lg ${platform.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{platform.name}</p>
                    <p className="text-[11px] text-muted-foreground">{total} setup steps</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <Badge className="bg-green-500/10 text-green-700 text-[10px]">✓ Ready</Badge>
                    ) : completed > 0 ? (
                      <Badge variant="outline" className="text-[10px]">{completed}/{total}</Badge>
                    ) : null}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-3">
                  <div className="space-y-3 pl-1">
                    {platform.steps.map((step, idx) => {
                      const isComplete = completedSteps[platform.id]?.has(idx);
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <Checkbox checked={isComplete} onCheckedChange={() => toggleStep(platform.id, idx)} className="mt-0.5" />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <a href={platform.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline mt-2">
                    Open {platform.name} <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">You can set up accounts later too.</p>
        <Button onClick={onNext} className="bg-primary px-8">
          Continue to Configure <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
