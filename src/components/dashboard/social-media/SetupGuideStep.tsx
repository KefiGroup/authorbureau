import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, CheckCircle2, Circle, Sparkles, ArrowRight, Smartphone, Camera, Link2 } from "lucide-react";
import AbbyCoachingTip from "./AbbyCoachingTip";

interface Props {
  onNext: () => void;
}

interface PlatformSetup {
  id: string;
  name: string;
  icon: string;
  color: string;
  steps: { label: string; detail: string }[];
  profileUrl: string;
  optimizationTips: string[];
}

const PLATFORMS: PlatformSetup[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "in",
    color: "bg-blue-600",
    profileUrl: "https://www.linkedin.com/in/",
    steps: [
      { label: "Create or log into your LinkedIn account", detail: "Go to linkedin.com and sign up with your professional email." },
      { label: "Turn on Public Profile visibility", detail: "Click your avatar → Settings & Privacy → Visibility → Edit your public profile. Ensure your headline, summary, and featured section are visible to maximize discoverability." },
      { label: "Add author headline", detail: "Use format: 'Author of [Book Title] | Helping [audience] achieve [result]'. e.g. 'Author of The Lean Startup | Helping entrepreneurs build smarter'" },
      { label: "Upload professional headshot", detail: "Use your author photo. LinkedIn profiles with photos get 21x more views." },
      { label: "Write an 'About' section from your book", detail: "First 3 lines are visible before 'see more'. Start with your strongest hook from the book." },
      { label: "Add your book as a 'Featured' item", detail: "Featured section → Add → Link → paste your Amazon book URL." },
    ],
    optimizationTips: [
      "Add a custom banner image with your book cover + tagline",
      "Use your book's key phrase as your headline keyword for SEO",
      "Pin your best-performing post to stay on top of your profile",
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    profileUrl: "https://www.instagram.com/",
    steps: [
      { label: "Create an Instagram Business account", detail: "Download the app → Sign up → Settings → Switch to Professional Account → Business." },
      { label: "Set up your bio", detail: "150 chars max. Format: 📚 Author of [Book Title] | [One-line value prop] | 👇 [CTA to link]" },
      { label: "Add Linktree or book link in bio", detail: "Use linktr.ee or stan.store to create a landing page with all your links (book, course, coaching)." },
      { label: "Create 3-5 Story Highlight covers", detail: "Recommended: 'My Book', 'Reviews', 'Tips', 'Behind the Scenes', 'Events'" },
      { label: "Post your first 9 images (grid)", detail: "Your grid is your visual resume. Plan a 3x3 grid: 3 book posts, 3 quote graphics, 3 personal photos." },
    ],
    optimizationTips: [
      "Use a consistent color palette matching your book cover",
      "Create a branded hashtag: #[BookTitle]Journey or #[AuthorName]Reads",
      "Reels get 2x more reach — prioritize video content",
    ],
  },
  {
    id: "x",
    name: "X (Twitter)",
    icon: "𝕏",
    color: "bg-foreground",
    profileUrl: "https://x.com/",
    steps: [
      { label: "Create or log into your X account", detail: "Go to x.com and sign up. Use your real name or pen name." },
      { label: "Write a powerful bio", detail: "160 chars. Include: what you write about, who it helps, and your book title." },
      { label: "Pin your best tweet or book announcement", detail: "Go to your tweet → ··· → Pin to profile. This is the first thing visitors see." },
      { label: "Follow 50 accounts in your niche", detail: "Follow other authors, thought leaders, and readers in your genre. Engage with their content." },
    ],
    optimizationTips: [
      "Tweet 3-5x daily for maximum visibility",
      "Use threads to share book insights — they get 50% more engagement",
      "Reply to bigger accounts to grow your audience organically",
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "f",
    color: "bg-blue-500",
    profileUrl: "https://www.facebook.com/",
    steps: [
      { label: "Create an Author Page (not personal profile)", detail: "facebook.com/pages/create → Choose 'Author' category. This unlocks analytics and ads." },
      { label: "Add book cover as cover photo", detail: "Use a banner with your book cover + a call-to-action text overlay." },
      { label: "Fill in the 'About' section completely", detail: "Include your author bio, book link, website, and contact info." },
      { label: "Create a Facebook Group for readers", detail: "Groups get 5x more engagement than pages. Name it: '[Book Title] Readers Community'" },
      { label: "Invite your email subscribers to follow", detail: "Import contacts from your email list to invite to your page and group." },
    ],
    optimizationTips: [
      "Photos get 44% more engagement than text-only posts",
      "Go Live once a week for algorithm boost",
      "Cross-post from Instagram to save time",
    ],
  },
];

export default function SetupGuideStep({ onNext }: Props) {
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>("linkedin");

  const toggleStep = (platformId: string, stepIdx: number) => {
    const current = completedSteps[platformId] || new Set();
    const next = new Set(current);
    next.has(stepIdx) ? next.delete(stepIdx) : next.add(stepIdx);
    setCompletedSteps({ ...completedSteps, [platformId]: next });
  };

  const getPlatformProgress = (platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (!platform) return 0;
    const completed = completedSteps[platformId]?.size || 0;
    return Math.round((completed / platform.steps.length) * 100);
  };

  const totalCompleted = PLATFORMS.reduce((sum, p) => sum + (completedSteps[p.id]?.size || 0), 0);
  const totalSteps = PLATFORMS.reduce((sum, p) => sum + p.steps.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Why You Need This Before Creating Content"
        expandedByDefault
        tips={[
          "🏗️ Your social media profiles ARE your storefront. 80% of people who discover your content will visit your profile before following — a weak profile = lost followers.",
          "📊 Authors with optimized profiles get 3-5x more engagement on every post. Set up once, benefit forever.",
          "🔗 The #1 mistake new authors make: posting content without a link to buy the book. Fix your bio links FIRST.",
          "⏭️ Already have accounts set up? Skip this step! But we recommend reviewing the optimization tips — even seasoned authors find gems here.",
        ]}
      />

      {/* Overall Progress */}
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Account Setup Progress</p>
            <p className="text-xs text-muted-foreground">{totalCompleted} of {totalSteps} steps completed across all platforms</p>
            <div className="w-full h-2 rounded-full bg-muted mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${Math.round((totalCompleted / totalSteps) * 100)}%` }}
              />
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round((totalCompleted / totalSteps) * 100)}%
          </Badge>
        </CardContent>
      </Card>

      {/* Platform Cards */}
      {PLATFORMS.map(platform => {
        const isExpanded = expandedPlatform === platform.id;
        const progress = getPlatformProgress(platform.id);

        return (
          <Card key={platform.id} className={`overflow-hidden transition-all ${isExpanded ? "ring-1 ring-primary/20" : ""}`}>
            <button
              onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
              className="w-full text-left"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${platform.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{platform.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{platform.steps.length} setup steps</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {progress === 100 ? (
                      <Badge className="bg-green-500/10 text-green-700 text-xs">✓ Complete</Badge>
                    ) : progress > 0 ? (
                      <Badge variant="outline" className="text-xs">{progress}%</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Not started</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* Step Checklist */}
                <div className="space-y-3 pl-1">
                  {platform.steps.map((step, idx) => {
                    const isComplete = completedSteps[platform.id]?.has(idx);
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <Checkbox
                          checked={isComplete}
                          onCheckedChange={() => toggleStep(platform.id, idx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optimization Tips */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-secondary" />
                    Optimization Tips
                  </p>
                  {platform.optimizationTips.map((tip, i) => (
                    <p key={i} className="text-xs text-muted-foreground">✦ {tip}</p>
                  ))}
                </div>

                {/* Link to platform */}
                <a
                  href={platform.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline"
                >
                  Open {platform.name} <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Scheduling Tools Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-secondary" />
            Scheduling Tools (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect a scheduling tool to auto-publish your content calendar. We'll generate an export file you can upload in one click.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Buffer", desc: "Free for 3 channels. Best for beginners.", url: "https://buffer.com", rec: true },
              { name: "Later", desc: "Visual planner. Great for Instagram.", url: "https://later.com", rec: false },
              { name: "Hootsuite", desc: "Enterprise-grade. All platforms.", url: "https://hootsuite.com", rec: false },
            ].map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border p-3 hover:border-primary/30 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{tool.name}</p>
                  {tool.rec && <Badge className="bg-secondary/10 text-secondary text-[9px]">Recommended</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Assets Prep */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-secondary" />
            Visual Assets You'll Need
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Abby will generate image prompts and video scripts for each post. Here's what to prepare:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "📸 Author Photos", desc: "5-10 professional and candid photos of you. Used for quote graphics and personal posts." },
              { title: "📕 Book Cover (high-res)", desc: "Your book cover image in PNG/JPG format. Used for promotional carousels and graphics." },
              { title: "🎬 60-second Video Clips", desc: "Record yourself sharing 3-5 tips from your book. We'll provide exact scripts." },
              { title: "🎨 Brand Colors", desc: "Your book cover's primary colors. Used for consistent carousel and story templates." },
            ].map(item => (
              <div key={item.title} className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="bg-primary px-8">
          Continue to Configure <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
