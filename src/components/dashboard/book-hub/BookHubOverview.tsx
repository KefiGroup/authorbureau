import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, FileText, Upload, Download, Loader2, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import ABBYFrameworkVisual from "./ABBYFrameworkVisual";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { asBlob } from "html-docx-js-typescript";
import { useToast } from "@/hooks/use-toast";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
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
    { key: "transformation", label: "Transformation Promise", emoji: "✨", regex: /(?:#{1,3}.*?TRANSFORMATION PROMISE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?STARTER PACKAGE|$)/i },
    { key: "starter", label: "Starter Package", emoji: "🟢", regex: /(?:#{1,3}.*?STARTER PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?PRO PACKAGE|$)/i },
    { key: "pro", label: "Pro Package", emoji: "🔵", regex: /(?:#{1,3}.*?PRO PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?ENTERPRISE PACKAGE|$)/i },
    { key: "enterprise", label: "Enterprise Package", emoji: "🟣", regex: /(?:#{1,3}.*?ENTERPRISE PACKAGE.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?MONETIZATION MAP|$)/i },
    { key: "monetization", label: "Monetization Map", emoji: "📊", regex: /(?:#{1,3}.*?MONETIZATION MAP.*?\n)([\s\S]*?)(?=\n#{1,3}|\n.*?NEXT STEPS|$)/i },
    { key: "nextsteps", label: "Next Steps", emoji: "🚀", regex: /(?:#{1,3}.*?NEXT STEPS.*?\n)([\s\S]*?)$/i },
  ];
  for (const p of patterns) {
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
}

interface Props {
  book: Book;
  tier: SubscriptionTier;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

// Top 3 recommendations mock — in real implementation these come from the business plan
interface Recommendation {
  name: string;
  category: "build" | "bridge" | "yield";
  revenue: string;
  requiredTier: SubscriptionTier;
}

function getRecommendationsFromPlan(planContent: string | null): Recommendation[] {
  // Default recommendations when plan parsing isn't available
  return [
    { name: "Quick-Start Workbook", category: "build", revenue: "$270–$1,500/mo", requiredTier: "starter" },
    { name: "Online Course", category: "build", revenue: "$500–$3,000/mo", requiredTier: "pro" },
    { name: "1-on-1 Coaching Program", category: "bridge", revenue: "$1,000–$5,000/mo", requiredTier: "pro" },
  ];
}

const categoryBadge: Record<string, { label: string; className: string }> = {
  build: { label: "B·Build", className: "bg-emerald-100 text-emerald-700" },
  bridge: { label: "B·Bridge", className: "bg-violet-100 text-violet-700" },
  yield: { label: "Y·Yield", className: "bg-sky-100 text-sky-700" },
};

export default function BookHubOverview({ book, tier, onConsultAbby, onNavigateTab }: Props) {
  const navigate = useNavigate();
  const [hasConsultation, setHasConsultation] = useState(false);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [manuscriptChars, setManuscriptChars] = useState(0);
  const [showManuscriptUpload, setShowManuscriptUpload] = useState(false);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const { plan, completedAssets } = useAbbyPlan(book.id);

  const isAnalyzed = hasConsultation || planSections.length > 0 || !!plan;
  const recommendations = getRecommendationsFromPlan(planContent);
  const builtCount = completedAssets.length;

  useEffect(() => {
    async function checkData() {
      const { data: { session } } = await sharedSupabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!userId) return;

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
      } catch {
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
      } catch {
        console.error("Failed to fetch business plan");
      }
    }
    checkData();
  }, [book.id]);

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
      const blob = (await asBlob(fullHtml, { orientation: "portrait" })) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ABBY-Business-Plan-${book.title.replace(/[^a-zA-Z0-9]/g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", description: "Business plan saved as .docx" });
    } catch {
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
            I'll analyze <strong>"{book.title}"</strong> and map your expertise to up to 27 revenue streams — from courses and coaching to speaking and retreats. The analysis is completely free and takes about 5 minutes.
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
          {tier === "starter" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready. On your Starter plan, you can build 3 products right now. Here's what I recommend starting with:</>
          )}
          {tier === "pro" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready with projected revenue potential. On Pro, you have access to 19 builders (Build + Bridge). Let's make it happen!</>
          )}
          {tier === "enterprise" && (
            <>Your plan for <strong>"{book.title}"</strong> is ready. All 27 builders are unlocked on your Enterprise plan — let's build your author empire!</>
          )}
        </p>

        {/* Plan section tabs if available */}
        {planSections.length > 0 && (
          <Tabs defaultValue={planSections[0]?.key} className="mt-3">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {planSections.map((s) => (
                <TabsTrigger
                  key={s.key}
                  value={s.key}
                  className="text-[11px] px-3 py-1.5 data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary rounded-full"
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
        )}

        {/* Recommendations cards */}
        <div className="mt-4 space-y-2">
          {recommendations.map((rec, i) => {
            const badge = categoryBadge[rec.category];
            const canAccess = canBuildProduct(rec.requiredTier);
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{rec.name}</span>
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${badge.className}`}>{badge.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{rec.revenue}</span>
                </div>
                {canAccess ? (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-teal-700 border-teal-300 hover:bg-teal-50" onClick={() => onNavigateTab("revenue-streams")}>
                    Build Now <ArrowRight className="h-3 w-3" />
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    {rec.requiredTier === "pro" ? "Upgrade to Pro" : rec.requiredTier === "enterprise" ? "Upgrade to Enterprise" : "Subscribe to build"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Tier-specific CTA below recommendations */}
        {tier === "free" && (
          <div className="mt-4 rounded-xl border-2 border-secondary/30 bg-secondary/5 p-4">
            <p className="text-sm font-medium mb-3">Ready to start building? Your plan is ready — unlock the AI builders to create these products automatically.</p>
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg border-2 border-border bg-card p-3 text-center hover:border-muted-foreground/30 transition-colors">
                <div className="text-xs font-bold">Starter</div>
                <div className="text-[10px] text-muted-foreground">$49/mo · 3 builders</div>
              </a>
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg bg-secondary p-3 text-center text-secondary-foreground relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">Most Popular</span>
                <div className="text-xs font-bold">Pro</div>
                <div className="text-[10px] text-secondary-foreground/80">$199/mo · 19 builders</div>
              </a>
              <a href="/dashboard?section=build-business" className="flex-1 min-w-[120px] rounded-lg p-3 text-center text-white" style={{ background: "#1B2A4A" }}>
                <div className="text-xs font-bold">Enterprise</div>
                <div className="text-[10px] text-white/70">$499/mo · all 27</div>
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">ROI: Starter pays for itself when you sell 2 copies of your $29 course ($58 &gt; $49)</p>
          </div>
        )}

        {tier === "starter" && builtCount >= 2 && (
          <div className="mt-4 rounded-lg bg-violet-50 border border-violet-200 p-3">
            <p className="text-sm text-violet-800">
              <strong>Outgrowing Starter?</strong> You've built {builtCount} of 3 Starter products. Upgrade to Pro ($199/mo) to unlock more builders including courses, coaching, webinars, and memberships.{" "}
              <a href="/dashboard?section=build-business" className="font-semibold underline">Upgrade to Pro →</a>
            </p>
          </div>
        )}

        {tier === "pro" && (
          <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
            <p className="text-sm text-foreground">
              <strong>Ready for the full empire?</strong> Enterprise ($499/mo) unlocks retreats, certification, masterminds, corporate training, and a 1-on-1 strategy session with Pauline Teo.{" "}
              <a href="/dashboard?section=build-business" className="font-semibold text-secondary underline">Upgrade to Enterprise →</a>
            </p>
          </div>
        )}

        {tier === "enterprise" && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              You have full access to everything. Start building to reach your revenue potential. Every product you create appears on your microsite automatically.
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

      {/* Expandable manuscript upload */}
      {showManuscriptUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <ManuscriptUpload bookId={book.id} bookTitle={book.title} />
        </motion.div>
      )}

      {/* Build My Author Business button — Pro/Enterprise only, analyzed only */}
      {isAnalyzed && (
        <BuildMyBusinessButton tier={tier} recommendedCount={recommendations.length} />
      )}

      {/* ABBY Framework Visual */}
      <ABBYFrameworkVisual
        hasConsultation={isAnalyzed}
        tier={tier}
        completedAssets={completedAssets}
        onConsultAbby={onConsultAbby}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}

function BuildMyBusinessButton({ tier, recommendedCount }: { tier: SubscriptionTier; recommendedCount: number }) {
  const { toast } = useToast();
  const canUse = hasTierAccess(tier, "pro");

  if (!canUse) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4 flex items-center gap-3 opacity-70">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Build My Author Business — One-Click</p>
          <p className="text-xs text-muted-foreground">Upgrade to Pro to unlock one-click building of all recommended products.</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => toast({ title: "Build queue coming soon", description: "Use individual builders in the tabs below for now." })}
      className="w-full rounded-xl p-4 text-left text-white transition-transform hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, #0D9488, #0F766E)",
        boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)",
      }}
    >
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-white shrink-0" />
        <div>
          <p className="text-base font-semibold">Build My Author Business — Create All Recommended Products</p>
          <p className="text-[13px] text-white/70">Abby will generate {recommendedCount} products in ~15-30 minutes. Review and publish at your pace.</p>
        </div>
      </div>
    </button>
  );
}
