import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BookOpen,
  User,
  Palette,
  Image,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AbbyCoachingTip from "./AbbyCoachingTip";

interface Props {
  onNext: () => void;
  bookTitle?: string;
  bookCoverUrl?: string | null;
  authorPhotoUrl?: string | null;
}

interface PlatformGuide {
  id: string;
  name: string;
  icon: string;
  color: string;
  profileUrl: string;
  quickWins: { label: string; detail: string }[];
}

function buildPlatformGuides(bookTitle: string): PlatformGuide[] {
  const bt = bookTitle || "your book";
  return [
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "in",
      color: "bg-blue-600",
      profileUrl: "https://www.linkedin.com/in/",
      quickWins: [
        {
          label: `Update headline: "Author of ${bt} | Helping [audience] achieve [result]"`,
          detail: "Your headline is the first thing people see. Include your book title and who you help.",
        },
        {
          label: "Add your book to the 'Featured' section",
          detail: "Profile → Featured → Add → Link → paste your Amazon or microsite URL.",
        },
        {
          label: "Write a compelling 'About' using your book's hook",
          detail: "The first 3 lines show before 'see more'. Start with your strongest insight from the book.",
        },
      ],
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "📸",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      profileUrl: "https://www.instagram.com/",
      quickWins: [
        {
          label: "Switch to a Business account",
          detail: "Settings → Account → Switch to Professional → Business. This unlocks analytics and reach insights.",
        },
        {
          label: `Bio: "📚 Author of ${bt} | [One-line value prop] | 👇 Link below"`,
          detail: "150 chars max. Use line breaks, an emoji, and a CTA pointing to your bio link.",
        },
        {
          label: "Add a link-in-bio tool",
          detail: "Use linktr.ee, stan.store, or your microsite URL so followers can find your book, courses, and coaching.",
        },
      ],
    },
    {
      id: "x",
      name: "X (Twitter)",
      icon: "𝕏",
      color: "bg-foreground",
      profileUrl: "https://x.com/",
      quickWins: [
        {
          label: `Bio: Author of ${bt}. [What you write about] for [who].`,
          detail: "160 chars. Be specific about your niche — this drives the right followers.",
        },
        {
          label: "Pin a tweet about your book",
          detail: "Tweet your best book insight or launch announcement → ··· → Pin to profile.",
        },
        {
          label: "Follow 30-50 accounts in your genre",
          detail: "Follow authors, podcasters, and readers in your space. Engage with their threads.",
        },
      ],
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: "f",
      color: "bg-blue-500",
      profileUrl: "https://www.facebook.com/pages/create",
      quickWins: [
        {
          label: "Create an Author's Page (not personal profile)",
          detail: "Pages → Create → Category: Author. This unlocks insights, ads, and a professional presence.",
        },
        {
          label: "Set your book cover as the banner image",
          detail: "Add a banner with your book cover + a short tagline or CTA text overlay.",
        },
        {
          label: "Create a readers community group",
          detail: `Name it "${bt} Readers" — groups get 5x more engagement than pages.`,
        },
      ],
    },
  ];
}

export default function SetupGuideStep({
  onNext,
  bookTitle = "",
  bookCoverUrl,
  authorPhotoUrl,
}: Props) {
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const platforms = buildPlatformGuides(bookTitle);
  const checklistStorageKey = `social-setup-checklist:${bookTitle || "default"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checklistStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number[]>;
      const restored: Record<string, Set<number>> = {};
      Object.entries(parsed).forEach(([platformId, indices]) => {
        restored[platformId] = new Set(indices);
      });
      setCompletedSteps(restored);
    } catch (error) {
      // no-op
    }
  }, [checklistStorageKey]);

  useEffect(() => {
    const serializable = Object.fromEntries(
      Object.entries(completedSteps).map(([platformId, set]) => [platformId, Array.from(set)])
    );
    localStorage.setItem(checklistStorageKey, JSON.stringify(serializable));
  }, [completedSteps, checklistStorageKey]);

  const toggleStep = (platformId: string, stepIdx: number) => {
    setCompletedSteps((prev) => {
      const current = prev[platformId] || new Set();
      const next = new Set(current);
      next.has(stepIdx) ? next.delete(stepIdx) : next.add(stepIdx);
      return { ...prev, [platformId]: next };
    });
  };

  const totalCompleted = platforms.reduce(
    (sum, p) => sum + (completedSteps[p.id]?.size || 0),
    0
  );
  const totalSteps = platforms.reduce((sum, p) => sum + p.quickWins.length, 0);
  const progressPct = Math.round((totalCompleted / totalSteps) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Abby Coaching */}
      <AbbyCoachingTip
        title="Why Profile Optimization Matters"
        expandedByDefault
        tips={[
          "📊 80% of people who discover your content will visit your profile before following. A strong profile converts browsers into followers.",
          "🔗 The #1 mistake: posting great content but having no link to buy the book. Fix your bio and links FIRST.",
          "⏭️ Already set up? Skip straight to Configure — but glance at the quick wins below. Even seasoned authors find gems here.",
        ]}
      />

      {/* ── What Abby Already Has ── */}
      <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            What Abby Already Has
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Abby reads your manuscript and uses these assets to generate
            platform-specific content, image prompts, and video scripts — no
            extra uploads needed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Book Cover */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              {bookCoverUrl ? (
                <img
                  src={bookCoverUrl}
                  alt="Book cover"
                  className="w-10 h-14 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-14 rounded bg-muted flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">Book Cover</p>
                <p className="text-[10px] text-muted-foreground">
                  {bookCoverUrl ? "✓ Available" : "Upload in Book Hub"}
                </p>
              </div>
              {bookCoverUrl && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-auto" />
              )}
            </div>

            {/* Book Content */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="w-10 h-14 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {bookTitle || "Book Content"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Themes, quotes & frameworks
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-auto" />
            </div>

            {/* AI-Generated Visuals */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="w-10 h-14 rounded bg-secondary/10 flex items-center justify-center shrink-0">
                <Image className="h-5 w-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">AI Visual Prompts</p>
                <p className="text-[10px] text-muted-foreground">
                  Generated per post
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] shrink-0 ml-auto"
              >
                Auto
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Platform Quick-Win Checklists ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 mb-3">
          <div>
            <h3 className="font-heading text-lg font-semibold">
              Profile Quick Wins
            </h3>
            <p className="text-xs text-muted-foreground">
              Optimize your profiles so every post drives maximum results.
            </p>
          </div>
          {totalCompleted > 0 && (
            <Badge variant="outline" className="text-xs">
              {totalCompleted}/{totalSteps} done
            </Badge>
          )}
        </div>

        {platforms.map((platform) => {
          const isExpanded = expandedPlatform === platform.id;
          const completed = completedSteps[platform.id]?.size || 0;
          const total = platform.quickWins.length;
          const isDone = completed === total;

          return (
            <Card
              key={platform.id}
              className={`overflow-hidden transition-all ${
                isExpanded ? "ring-1 ring-primary/20" : ""
              }`}
            >
              <button
                onClick={() =>
                  setExpandedPlatform(isExpanded ? null : platform.id)
                }
                className="w-full text-left"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`w-9 h-9 rounded-lg ${platform.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{platform.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {total} quick wins
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <Badge className="bg-green-500/10 text-green-700 text-[10px]">
                        ✓ Optimized
                      </Badge>
                    ) : completed > 0 ? (
                      <Badge variant="outline" className="text-[10px]">
                        {completed}/{total}
                      </Badge>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-3">
                  <div className="space-y-3 pl-1">
                    {platform.quickWins.map((step, idx) => {
                      const isComplete =
                        completedSteps[platform.id]?.has(idx);
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <Checkbox
                            checked={isComplete}
                            onCheckedChange={() =>
                              toggleStep(platform.id, idx)
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isComplete
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <a
                    href={platform.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline mt-2"
                  >
                    Open {platform.name}{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          You can always come back to optimize later.
        </p>
        <Button onClick={onNext} className="bg-primary px-8">
          Continue to Configure <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
