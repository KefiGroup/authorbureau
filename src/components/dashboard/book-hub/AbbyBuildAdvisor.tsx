import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, MessageCircle, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMarketResearch } from "@/hooks/useMarketResearch";

interface Props {
  categoryId: string;
  bookId: string;
  bookTitle?: string;
  bookGenre?: string;
}

interface AdvisorTip {
  heading: string;
  intro: string;
  recommendations: {
    label: string;
    reason: string;
    priceRange?: string;
    difficulty: "Easy" | "Medium" | "Advanced";
    nodeId?: string;
  }[];
  closingNote: string;
}

const advisorContent: Record<string, AdvisorTip> = {
  "revenue-streams": {
    heading: "Where should you start building?",
    intro: "Based on the ABBY Framework, here's my recommended build order — start with the lowest-effort, highest-impact products first:",
    recommendations: [
      {
        label: "Workbook",
        reason: "Your fastest win. AI generates it directly from your manuscript — exercises, reflection prompts, and action plans. Most authors finish in under 30 minutes.",
        priceRange: "$4.99 – $9.99",
        difficulty: "Easy",
        nodeId: "workbooks",
      },
      {
        label: "Audiobook",
        reason: "AI-narrated from your manuscript. No recording studio needed. Expands your reach to listeners who prefer audio.",
        priceRange: "$9.99 – $14.99",
        difficulty: "Easy",
        nodeId: "audiobook",
      },
      {
        label: "Home Study Course",
        reason: "A structured self-paced program with daily schedules. Great lead magnet or entry-level product.",
        priceRange: "$27 – $47",
        difficulty: "Medium",
        nodeId: "home-study",
      },
      {
        label: "Online Course",
        reason: "Your flagship digital product. 8–12 modules generated from your book's frameworks. Best for building recurring revenue.",
        priceRange: "$47 – $97",
        difficulty: "Medium",
        nodeId: "courses",
      },
      {
        label: "1-on-1 Coaching",
        reason: "Premium service with the highest margins. Use your book's frameworks as session outlines — no extra content creation needed.",
        priceRange: "$150 – $500/session",
        difficulty: "Easy",
        nodeId: "coaching-1on1",
      },
    ],
    closingNote: "Start with Workbook + Audiobook to build momentum, then layer in courses and coaching for higher-ticket revenue.",
  },
  "marketing-channels": {
    heading: "Which channels should you activate first?",
    intro: "Marketing works best when you focus on 2–3 channels deeply rather than spreading thin. Here's the priority order:",
    recommendations: [
      {
        label: "Website / Microsite",
        reason: "Your home base. Already built into the platform — make sure it's live before driving traffic anywhere.",
        difficulty: "Easy",
        nodeId: "microsite",
      },
      {
        label: "Social Media (90-day Calendar)",
        reason: "AI generates a full content calendar from your book. Follow the 80/20 rule: 80% value, 20% promotion.",
        difficulty: "Easy",
        nodeId: "social-media",
      },
      {
        label: "Email Marketing",
        reason: "Your highest-ROI channel. Nurture sequences convert subscribers into buyers at 3–5× social media rates.",
        difficulty: "Medium",
        nodeId: "email-marketing",
      },
    ],
    closingNote: "Get your microsite live, then activate social media and email. These three channels cover 80% of your audience reach.",
  },
  "authority-builders": {
    heading: "When should you pursue premium opportunities?",
    intro: "These are your highest-value plays — but they work best after you've built a foundation with digital products and an audience:",
    recommendations: [
      {
        label: "Conventions & Conferences",
        reason: "Apply as a speaker to build credibility. AI generates your submission materials and speaker profile.",
        difficulty: "Medium",
        nodeId: "conventions",
      },
      {
        label: "Fund Raising Events",
        reason: "Leverage your book for cause-driven events. Works especially well for non-fiction authors with a mission.",
        difficulty: "Advanced",
        nodeId: "fundraising",
      },
    ],
    closingNote: "Focus here after you have at least 2–3 digital products live and an active email list of 500+ subscribers.",
  },
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/15 text-green-700",
  Medium: "bg-amber-500/15 text-amber-700",
  Advanced: "bg-red-500/15 text-red-700",
};

export default function AbbyBuildAdvisor({ categoryId, bookId, bookTitle }: Props) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const content = advisorContent[categoryId];
  if (!content) return null;

  const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";

  const getStudioPath = (nodeId: string): string | null => {
    const map: Record<string, string> = {
      "social-media": `/dashboard?section=social-media&bookId=${bookId}${titleParam}`,
      workbooks: `/dashboard?section=workbooks&bookId=${bookId}${titleParam}`,
      webinars: `/dashboard?section=webinars&bookId=${bookId}${titleParam}`,
      audiobook: `/dashboard?section=audiobook-studio&bookId=${bookId}${titleParam}`,
      "coaching-1on1": `/dashboard?section=coaching&bookId=${bookId}${titleParam}`,
      keynotes: `/dashboard?section=speaking&bookId=${bookId}${titleParam}`,
      courses: `/dashboard?section=courses&bookId=${bookId}${titleParam}`,
      "home-study": `/dashboard?section=home-study&bookId=${bookId}${titleParam}`,
      "email-marketing": `/dashboard?section=email-marketing&bookId=${bookId}${titleParam}`,
      "podcast-guest": `/dashboard?section=podcast&bookId=${bookId}${titleParam}`,
      memberships: `/dashboard?section=memberships&bookId=${bookId}${titleParam}`,
      "group-coaching": `/dashboard?section=group-coaching&bookId=${bookId}${titleParam}`,
    };
    return map[nodeId] || null;
  };

  return (
    <div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Abby's Build Advisor</p>
          <p className="text-sm font-semibold text-foreground">{content.heading}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-secondary/20 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{content.intro}</p>

          <div className="space-y-3">
            {content.recommendations.map((rec, i) => {
              const studioPath = rec.nodeId ? getStudioPath(rec.nodeId) : null;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-black text-secondary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{rec.label}</span>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${difficultyColors[rec.difficulty]}`}>
                        {rec.difficulty}
                      </span>
                      {rec.priceRange && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {rec.priceRange}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{rec.reason}</p>
                    {studioPath && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(studioPath);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary mt-1.5 hover:underline"
                      >
                        Open Studio <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3">
            <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">{content.closingNote}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => navigate(`/dashboard?section=abby&bookId=${bookId}${titleParam}`)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Ask Abby for personalized advice
            </Button>
            <span className="text-[10px] text-muted-foreground">or consult a real expert (coming soon)</span>
          </div>
        </div>
      )}
    </div>
  );
}
