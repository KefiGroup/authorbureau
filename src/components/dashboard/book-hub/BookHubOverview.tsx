import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getStudioPath } from "@/config/abbyFrameworkConfig";
import { motion } from "framer-motion";
import { Sparkles, Zap, FileText, Upload, Download, Loader2, Lock, ArrowRight, CheckCircle2, X } from "lucide-react";
import BookHubSkeleton from "./BookHubSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import MarketSnapshot from "./MarketSnapshot";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { printExportHtml } from "@/lib/print-export";
import { useToast } from "@/hooks/use-toast";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { useMarketResearch } from "@/hooks/useMarketResearch";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { hasTierAccess } from "@/hooks/useAuth";


interface PlanSection {
  key: string;
  label: string;
  emoji: string;
  content: string;
}

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];
  const patterns: Array<{ key: string; label: string; emoji: string; regex: RegExp }> = [
    { key: "transformation", label: "Transformation Promise", emoji: "✨", regex: /(?:#{1,3}.*?(?:TRANSFORMATION PROMISE|SECTION 1).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)|$)/i },
    { key: "brand", label: "B·Brand Products", emoji: "💰", regex: /(?:#{1,3}.*?(?:B[·.]?BRAND PRODUCTS|SECTION 2).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "build", label: "B·Build Authority", emoji: "📈", regex: /(?:#{1,3}.*?(?:B[·.]?BUILD AUTHORITY|SECTION 3).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "yield", label: "Y·Yield Revenue", emoji: "🏆", regex: /(?:#{1,3}.*?(?:Y[·.]?YIELD REVENUE|SECTION 4).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "monetization", label: "Monetisation Map", emoji: "📊", regex: /(?:#{1,3}.*?(?:MONETIS?ATION MAP|SECTION 5).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "unlock", label: "Unlock Your Plan", emoji: "🔓", regex: /(?:#{1,3}.*?(?:UNLOCK YOUR PLAN|SECTION 6).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "nextsteps", label: "Next Steps", emoji: "🚀", regex: /(?:#{1,3}.*?(?:NEXT STEPS|SECTION 7).*?\n)([\s\S]*?)$/i },
    // Legacy format fallbacks
    { key: "brand", label: "Brand Plan", emoji: "🟢", regex: /(?:#{1,3}.*?STARTER PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?PRO PACKAGE|$)/i },
    { key: "build", label: "Build Plan", emoji: "🔵", regex: /(?:#{1,3}.*?PRO PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?ENTERPRISE PACKAGE|$)/i },
    { key: "yield", label: "Yield Plan", emoji: "🟣", regex: /(?:#{1,3}.*?ENTERPRISE PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?MONETIZATION MAP|$)/i },
  ];
  for (const p of patterns) {
    // Skip legacy patterns if we already found new-format sections
    if (["brand", "build", "yield"].includes(p.key) && sections.some(s => ["brand", "build", "yield"].includes(s.key))) continue;
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) {
      sections.push({ key: p.key, label: p.label, emoji: p.emoji, content: match[1].trim() });
    }
  }
  return sections;
}

interface Book {
  id: string;
  title: string;
  genre?: string | null;
}

interface Props {
  book: Book;
  tier: SubscriptionTier;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

// Top recommendations — sequenced by the ABBY Framework build order
// Phase A (Branding & Marketing) → Phase B (Digital Products) → Build Authority → Yield Revenue
interface Recommendation {
  name: string;
  nodeId: string;
  category: "build" | "bridge" | "yield";
  revenue: string;
  requiredTier: SubscriptionTier;
  sequence: number; // lower = do first
}

// Maps nodeId to the table/nodeId used in builder-draft-state
const NODE_TO_DRAFT_KEY: Record<string, string[]> = {
  "website": ["website", "microsite"],
  "lead-magnets": ["lead-magnets", "lead_magnet"],
  "email-marketing": ["email-marketing", "email_flows"],
  "social-media": ["social-media", "social_media_content"],
  "workbooks": ["workbooks", "workbook"],
  "home-study": ["home-study", "home_study_courses"],
  "courses": ["courses", "online-course"],
  "audiobooks": ["audiobooks", "audiobook"],
  "coaching-1on1": ["coaching-1on1", "coaching_packages"],
};

type ProductStatus = "not-started" | "in-progress" | "completed";

function getRecommendationsFromPlan(planContent: string | null): Recommendation[] {
  return [
    { name: "Author Website & Microsite", nodeId: "website", category: "build", revenue: "Your branding foundation — start here", requiredTier: "brand", sequence: 1 },
    { name: "Lead Magnet & Email Opt-in", nodeId: "lead-magnets", category: "build", revenue: "Start building your audience list", requiredTier: "brand", sequence: 2 },
    { name: "Email Marketing Flows", nodeId: "email-marketing", category: "build", revenue: "Nurture readers into buyers", requiredTier: "brand", sequence: 3 },
    { name: "Social Media Calendar", nodeId: "social-media", category: "build", revenue: "90-day content plan for visibility", requiredTier: "brand", sequence: 4 },
    { name: "Quick-Start Workbook", nodeId: "workbooks", category: "build", revenue: "Potentially Generating: $270 - $1,500/mo", requiredTier: "brand", sequence: 5 },
    { name: "Home Study Course", nodeId: "home-study", category: "build", revenue: "Potentially Generating: $400 - $2,000/mo", requiredTier: "brand", sequence: 6 },
    { name: "Online Course", nodeId: "courses", category: "bridge", revenue: "Potentially Generating: $500 - $3,000/mo", requiredTier: "build", sequence: 7 },
    { name: "Audiobook", nodeId: "audiobooks", category: "bridge", revenue: "Potentially Generating: $300 - $1,500/mo", requiredTier: "build", sequence: 8 },
    { name: "1-on-1 Coaching Program", nodeId: "coaching-1on1", category: "yield", revenue: "Potentially Generating: $1,000 - $5,000/mo", requiredTier: "yield", sequence: 9 },
  ];
}

const categoryBadge: Record<string, { label: string; className: string }> = {
  build: { label: "B·Brand", className: "bg-emerald-100 text-emerald-700" },
  bridge: { label: "B·Build", className: "bg-violet-100 text-violet-700" },
  yield: { label: "Y·Yield", className: "bg-sky-100 text-sky-700" },
};

export default function BookHubOverview({ book, tier, onConsultAbby, onNavigateTab }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showStartBanner = searchParams.get("from") === "start-building";
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [hasConsultation, setHasConsultation] = useState(false);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [manuscriptChars, setManuscriptChars] = useState(0);
  const [showManuscriptUpload, setShowManuscriptUpload] = useState(false);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [authorId, setAuthorId] = useState<string>("");
  const [productStatuses, setProductStatuses] = useState<Record<string, ProductStatus>>({});
  const { toast } = useToast();
  const { plan, completedAssets } = useAbbyPlan(book.id);
  const { data: marketData, loading: marketLoading } = useMarketResearch(book.id, book.title, book.genre || undefined);

  const isAnalyzed = hasConsultation || planSections.length > 0 || !!plan;
  const recommendations = getRecommendationsFromPlan(planContent);
  const builtCount = completedAssets.length;


  useEffect(() => {
    async function checkData() {
      // Try shared backend session first, fall back to cloud session
      const { data: { session: sharedSession } } = await sharedSupabase.auth.getSession();
      const { data: { session: cloudSession } } = await supabase.auth.getSession();
      const session = sharedSession || cloudSession;
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!userId) { setDataReady(true); return; }
      setAuthorId(userId);

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultation-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "count", book_id: book.id }),
        });
        const result = await resp.json();
        setHasConsultation((result.count ?? 0) > 0);
      } catch (error) {
        setHasConsultation(false);
      }

      const { data: assets } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", book.id)
        .eq("asset_type", "source_material")
        .limit(1);
      if (assets && assets.length > 0 && assets[0].content) {
        setHasManuscript(true);
        setManuscriptChars(assets[0].content.length);
      }

      try {
        const planResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "get-plan", bookId: book.id }),
        });
        if (planResp.ok) {
          const planResult = await planResp.json();
          if (planResult.content) {
            setPlanContent(planResult.content);
            setPlanSections(extractSections(planResult.content));
          }
        }
      } catch (error) {
        console.error("Failed to fetch business plan");
      }

      // Fetch product statuses (drafts + website profile + generated assets fallback)
      const statuses: Record<string, ProductStatus> = {};

      try {
        const draftResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ action: "list-drafts" }),
        });

        if (draftResp.ok) {
          const draftResult = await draftResp.json();
          const drafts: any[] = draftResult.drafts || [];
          for (const [nodeId, keys] of Object.entries(NODE_TO_DRAFT_KEY)) {
            const matching = drafts.filter((d: any) =>
              keys.some(k => d.nodeId === k || d.table === k || d.asset_type === k)
            );
            if (matching.some((d: any) => d.status === "published")) {
              statuses[nodeId] = "completed";
            } else if (matching.length > 0) {
              statuses[nodeId] = "in-progress";
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch draft statuses");
      }

      // Website is managed profile-first; resolve status from synced profile data
      try {
        const profileResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "fetch" }),
        });

        if (profileResp.ok) {
          const profileResult = await profileResp.json();
          const profileData = profileResult?.profile;
          const hasCompletedWebsite = Boolean(profileData?.author_slug);
          const hasWebsiteProgress = Boolean(
            profileData?.pen_name || profileData?.bio_short || profileData?.bio_long || profileData?.tagline || profileData?.photo_url || profileData?.site_theme
          );

          if (hasCompletedWebsite) {
            statuses["website"] = "completed";
          } else if (hasWebsiteProgress && !statuses["website"]) {
            statuses["website"] = "in-progress";
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile website status");
      }

      // Also check generated assets as fallback for progress
      const { data: genAssets } = await supabase
        .from("generated_assets")
        .select("asset_type")
        .eq("book_id", book.id)
        .eq("author_id", userId);

      if (genAssets) {
        const assetTypes = genAssets.map(a => a.asset_type);
        const assetToNode: Record<string, string> = {
          "lead_magnet": "lead-magnets",
          "email_sequence": "email-marketing",
          "social_media": "social-media",
          "workbook": "workbooks",
          "home_study": "home-study",
          "course": "courses",
          "audiobook_script": "audiobooks",
        };
        for (const [assetType, nodeId] of Object.entries(assetToNode)) {
          if (assetTypes.includes(assetType) && !statuses[nodeId]) {
            statuses[nodeId] = "in-progress";
          }
        }
      }

      setProductStatuses(statuses);

      setDataReady(true);
    }
    checkData();
  }, [book.id]);

  if (!dataReady) {
    return <BookHubSkeleton />;
  }

  const handleDownloadPlan = async () => {
    if (!planContent) return;
    setDownloading(true);
    try {
      let html = planContent
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
        .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
        .replace(/^(?!<[hulo])((?!<).+)$/gm, "<p>$1</p>")
        .replace(/\n\n/g, "<br/>");
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Calibri',sans-serif;color:#1a1a1a;line-height:1.6;padding:40px;max-width:800px;margin:0 auto}h1{font-size:26px;color:#B8860B;border-bottom:3px solid #B8860B;padding-bottom:12px}h2{font-size:20px;color:#333;margin-top:28px}h3{font-size:16px;color:#555}p{font-size:13px}ul,ol{font-size:13px}li{margin-bottom:4px}strong{color:#222}</style></head><body>${html}</body></html>`;
      printExportHtml(fullHtml, `ABBY Business Plan - ${book.title}`);
      toast({ title: "Downloaded!", description: "Business plan saved as .docx" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
    setDownloading(false);
  };

  const canBuildProduct = (requiredTier: SubscriptionTier) => hasTierAccess(tier, requiredTier);

  // Render the snapshot content based on analysis state + tier
  const renderSnapshotContent = () => {
    // STATE A: Not analyzed
    if (!isAnalyzed) {
      return (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            I'll analyze <strong>"{book.title}"</strong> and map your expertise to up to 28 revenue streams — from courses and coaching to speaking and retreats. The analysis is completely free and takes about 5 minutes.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            {hasManuscript ? (
              <span className="text-muted-foreground">
                ✅ Manuscript loaded — {Math.round(manuscriptChars / 1000)}k characters
                <button onClick={() => setShowManuscriptUpload(!showManuscriptUpload)} className="ml-2 text-secondary hover:underline">
                  {showManuscriptUpload ? "Hide" : "Replace"}
                </button>
              </span>
            ) : (
              <button onClick={() => setShowManuscriptUpload(!showManuscriptUpload)} className="text-secondary hover:underline flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Upload manuscript for deeper analysis
              </button>
            )}
          </div>
          <div className="mt-4">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onConsultAbby}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Analyze with Abby — Free
            </Button>
          </div>
        </>
      );
    }

    // Analyzed states — show plan tabs if available, then tier-specific content below
    return (
      <>
        {/* Tier-specific intro text */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tier === "free" && (
            <>I've analyzed <strong>"{book.title}"</strong> and mapped revenue streams with projected potential. Here's your top 3 recommendations:</>
          )}
          {tier === "brand" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready. On your Starter plan, you can build 3 products right now. Here's what I recommend starting with:</>
          )}
          {tier === "build" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready with projected revenue potential. On Pro, you have access to 18 builders (Brand + Build). Let's make it happen!</>
          )}
          {tier === "yield" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready. All 28 builders are unlocked on your Enterprise plan — let's build your author empire!</>
          )}
        </p>

        {/* Plan section content */}
        {planSections.length === 1 ? (
          <div className="mt-3 rounded-lg bg-muted/30 p-4 max-h-[300px] overflow-y-auto text-sm">
            <MarkdownRenderer content={planSections[0].content} />
          </div>
        ) : planSections.length > 1 ? (
          <Tabs defaultValue={planSections[0]?.key} className="mt-3">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {planSections.map((s) => (
                <TabsTrigger
                  key={s.key}
                  value={s.key}
                  className="text-[11px] px-3 py-1.5 data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary data-[state=active]:shadow-sm rounded-full border border-transparent data-[state=active]:border-secondary/30"
                >
                  {s.emoji} {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {planSections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-3">
                <div className="rounded-lg bg-muted/30 p-4 max-h-[300px] overflow-y-auto text-sm">
                  <MarkdownRenderer content={s.content} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : null}

        {/* Recommendations cards — sequenced by build order */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" /> Your recommended build sequence
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, i) => {
              const badge = categoryBadge[rec.category];
              const canAccess = canBuildProduct(rec.requiredTier);
              const status = productStatuses[rec.nodeId] || "not-started";
              const isCompleted = status === "completed";
              const isInProgress = status === "in-progress";
              return (
                <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isCompleted ? "border-emerald-300 bg-emerald-50/50" : isInProgress ? "border-amber-300 bg-amber-50/30" : "border-border bg-card"
                }`}>
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted ? "bg-emerald-500 text-white" : isInProgress ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : rec.sequence}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{rec.name}</span>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${badge.className}`}>{badge.label}</span>
                      {isCompleted && (
                        <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">Completed</span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">In Progress</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{rec.revenue}</span>
                  </div>
                  {canAccess ? (
                    <Button size="sm" variant="outline" className={`text-xs h-7 gap-1 ${
                      isCompleted ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50" :
                      isInProgress ? "text-amber-700 border-amber-300 hover:bg-amber-50" :
                      "text-teal-700 border-teal-300 hover:bg-teal-50"
                    }`} onClick={() => {
                      const titleParam = book.title ? `&bookTitle=${encodeURIComponent(book.title)}` : "";
                      const studioPath = getStudioPath(rec.nodeId, book.id, titleParam);
                      if (studioPath) {
                        navigate(studioPath);
                      } else {
                        onNavigateTab("revenue-streams");
                      }
                    }}>
                      {isCompleted ? <>View <ArrowRight className="h-3 w-3" /></> :
                       isInProgress ? <>Continue <ArrowRight className="h-3 w-3" /></> :
                       <>Build Now <ArrowRight className="h-3 w-3" /></>}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      {rec.requiredTier === "build" ? "Build Package" : rec.requiredTier === "yield" ? "Yield Package" : "Brand Package"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier-specific CTA below recommendations */}
        {tier === "free" && (
          <div className="mt-4 rounded-xl border-2 border-secondary/30 bg-secondary/5 p-4">
            <p className="text-sm font-medium mb-3">Ready to start building? Your plan is ready — unlock the AI builders to create these products automatically.</p>
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg border-2 border-border bg-card p-3 text-center hover:border-muted-foreground/30 transition-colors">
                <div className="text-xs font-bold">Brand Package</div>
                <div className="text-[10px] text-muted-foreground">$49/mo · 9 builders</div>
              </a>
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg bg-secondary p-3 text-center text-secondary-foreground relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">Most Popular</span>
                <div className="text-xs font-bold">Build Package</div>
                <div className="text-[10px] text-secondary-foreground/80">$99/mo · 18 builders</div>
              </a>
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg p-3 text-center text-white" style={{ background: "#1B2A4A" }}>
                <div className="text-xs font-bold">Yield Package</div>
                <div className="text-[10px] text-white/70">$249/mo · all 28</div>
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">14-day money-back guarantee · No questions asked</p>
          </div>
        )}

        {tier === "brand" && builtCount >= 2 && (
          <div className="mt-4 rounded-lg bg-violet-50 border border-violet-200 p-3">
            <p className="text-sm text-violet-800">
              <strong>Ready to scale?</strong> You've built {builtCount} Brand products. Upgrade to Build Package ($99/mo) to unlock courses, coaching, webinars, and more.{" "}
              <a href="/dashboard?section=build-business" className="font-semibold underline">Upgrade to Build →</a>
            </p>
          </div>
        )}

        {tier === "build" && (
          <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
            <p className="text-sm text-foreground">
              <strong>Ready for premium services?</strong> Yield Package ($249/mo) unlocks retreats, certification, masterminds, corporate training, and a 1-on-1 strategy session with Pauline Teo.{" "}
              <a href="/dashboard?section=build-business" className="font-semibold text-secondary underline">Upgrade to Yield →</a>
            </p>
          </div>
        )}

        {tier === "yield" && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              You have full access to everything. Start building to reach your revenue potential. Every product you create appears on your website automatically.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          {hasManuscript ? (
            <span className="text-muted-foreground">
              ✅ Manuscript loaded — {Math.round(manuscriptChars / 1000)}k characters
              <button onClick={() => setShowManuscriptUpload(!showManuscriptUpload)} className="ml-2 text-secondary hover:underline">
                {showManuscriptUpload ? "Hide" : "Replace"}
              </button>
            </span>
          ) : (
            <button onClick={() => setShowManuscriptUpload(!showManuscriptUpload)} className="text-secondary hover:underline flex items-center gap-1">
              <Upload className="h-3 w-3" />
              Upload manuscript for Abby to analyze
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onConsultAbby}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {planSections.length > 0 ? "Refine Plan with Abby" : "Continue Analysis with Abby"}
          </Button>
          {planSections.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownloadPlan} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download .docx
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Contextual "Start Here" banner — only when arriving via Start Building button */}
      {showStartBanner && !bannerDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-xl border-2 border-secondary/40 bg-secondary/10 p-4 pr-10"
        >
          <button
            onClick={() => {
              setBannerDismissed(true);
              searchParams.delete("from");
              setSearchParams(searchParams, { replace: true });
            }}
            className="absolute top-3 right-3 text-secondary/60 hover:text-secondary transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            <Sparkles className="h-4 w-4 inline mr-1.5 text-secondary" />
            <strong>Abby recommends starting here: Website</strong> — your digital home base. It takes ~1 hour and unlocks everything else. Build it first.
          </p>
        </motion.div>
      )}
      {/* Abby's Business Snapshot */}
      <motion.div
        className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 text-xl">
            👩‍💼
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading font-bold text-base">Abby's Business Snapshot</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 rounded-full px-2 py-0.5">
                AI Advisor
              </span>
            </div>
            {renderSnapshotContent()}
          </div>
        </div>
      </motion.div>

      {/* Market Snapshot — shown after analysis */}
      {isAnalyzed && (marketData || marketLoading) && (
        <MarketSnapshot data={marketData!} loading={marketLoading} />
      )}

      {/* Expandable manuscript upload */}
      {showManuscriptUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <ManuscriptUpload bookId={book.id} bookTitle={book.title} />
        </motion.div>
      )}

    </div>
  );
}

