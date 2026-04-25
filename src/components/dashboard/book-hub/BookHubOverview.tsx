import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, FileText, Upload, Download, Loader2, ChevronDown, X, ArrowRight } from "lucide-react";
import BookHubSkeleton from "./BookHubSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import MarketSnapshot from "./MarketSnapshot";
import BookHubHeroStrip from "./BookHubHeroStrip";
import JourneyStepper from "./JourneyStepper";
import { ACCENT_CLASSES } from "./categoryAccent";
import { supabase } from "@/integrations/supabase/client";
import { printExportHtml } from "@/lib/print-export";
import { getActiveToken } from "@/lib/get-active-token";
import { useToast } from "@/hooks/use-toast";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { useMarketResearch } from "@/hooks/useMarketResearch";
import { useNodeGating } from "@/hooks/useNodeGating";
import { useBookNodeProgress } from "@/hooks/useBookNodeProgress";
import { useAuth, type SubscriptionTier } from "@/hooks/useAuth";
import { isSuperAdmin } from "@/lib/superadmin";

interface PlanSection { key: string; label: string; emoji: string; content: string; }

function extractSections(fullContent: string): PlanSection[] {
  const sections: PlanSection[] = [];
  const patterns: Array<{ key: string; label: string; emoji: string; regex: RegExp }> = [
    { key: "transformation", label: "Transformation Promise", emoji: "✨", regex: /(?:#{1,3}.*?(?:TRANSFORMATION PROMISE|SECTION 1).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)|$)/i },
    { key: "brand", label: "B·Brand Products", emoji: "💰", regex: /(?:#{1,3}.*?(?:B[·.]?BRAND PRODUCTS|SECTION 2).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "build", label: "B·Build Authority", emoji: "📈", regex: /(?:#{1,3}.*?(?:B[·.]?BUILD AUTHORITY|SECTION 3).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "yield", label: "Y·Yield Revenue", emoji: "🏆", regex: /(?:#{1,3}.*?(?:Y[·.]?YIELD REVENUE|SECTION 4).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "monetization", label: "Monetisation Map", emoji: "📊", regex: /(?:#{1,3}.*?(?:MONETIS?ATION MAP|SECTION 5).*?\n)([\s\S]*?)(?=\n#{1,3}\s*(?:SECTION|---)\s|$)/i },
    { key: "nextsteps", label: "Next Steps", emoji: "🚀", regex: /(?:#{1,3}.*?(?:NEXT STEPS|SECTION 7).*?\n)([\s\S]*?)$/i },
  ];
  for (const p of patterns) {
    const match = fullContent.match(p.regex);
    if (match?.[1]?.trim()) sections.push({ key: p.key, label: p.label, emoji: p.emoji, content: match[1].trim() });
  }
  return sections;
}

interface Book { id: string; title: string; genre?: string | null; }

interface Props {
  book: Book;
  tier: SubscriptionTier;
  onConsultAbby: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function BookHubOverview({ book, tier, onConsultAbby, onNavigateTab }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const showStartBanner = searchParams.get("from") === "start-building";
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [hasConsultation, setHasConsultation] = useState(false);
  const [hasManuscript, setHasManuscript] = useState(false);
  const [manuscriptChars, setManuscriptChars] = useState(0);
  const [showManuscriptUpload, setShowManuscriptUpload] = useState(false);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const { toast } = useToast();
  const { plan } = useAbbyPlan(book.id);
  const { data: marketData, loading: marketLoading } = useMarketResearch(book.id, book.title, book.genre || undefined);
  const { gating } = useNodeGating();
  const openNodeIds = new Set(gating.filter((r) => r.is_open).map((r) => r.node_id));
  const effectiveTier = isAdmin || isSuperAdmin(user?.email) ? "yield" : tier;
  const progress = useBookNodeProgress(effectiveTier, openNodeIds);

  const isAnalyzed = hasConsultation || planSections.length > 0 || !!plan;

  useEffect(() => {
    async function checkData() {
      const { data: { session: sharedSession } } = await sharedSupabase.auth.getSession();
      const { data: { session: cloudSession } } = await supabase.auth.getSession();
      const session = sharedSession || cloudSession;
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!userId) { setDataReady(true); return; }

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultation-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ action: "count", book_id: book.id }),
        });
        const result = await resp.json();
        setHasConsultation((result.count ?? 0) > 0);
      } catch { setHasConsultation(false); }

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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ action: "get-plan", bookId: book.id }),
        });
        if (planResp.ok) {
          const planResult = await planResp.json();
          if (planResult.content) {
            setPlanContent(planResult.content);
            setPlanSections(extractSections(planResult.content));
          }
        }
      } catch { /* noop */ }

      setDataReady(true);
    }
    checkData();
  }, [book.id]);

  if (!dataReady || progress.loading) return <BookHubSkeleton />;

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
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
    setDownloading(false);
  };

  const handleJumpTab = (tab: string) => onNavigateTab(tab);

  const accent = ACCENT_CLASSES.brand; // for the top-3 list

  // STATE A: Not analyzed → keep the old "analyze me" call to action
  if (!isAnalyzed) {
    return (
      <div className="space-y-6">
        <motion.div
          className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 text-xl">👩‍💼</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-bold text-base">Abby's Business Snapshot</h3>
                <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 rounded-full px-2 py-0.5">AI Advisor</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                I'll analyze <strong>"{book.title}"</strong> and map your expertise to up to 28 revenue streams — from courses and coaching to speaking and retreats. The analysis is free and takes ~5 minutes.
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
                    <Upload className="h-3 w-3" /> Upload manuscript for deeper analysis
                  </button>
                )}
              </div>
              <Button size="sm" className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onConsultAbby}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analyze with Abby — Free
              </Button>
            </div>
          </div>
        </motion.div>
        {showManuscriptUpload && <ManuscriptUpload bookId={book.id} bookTitle={book.title} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showStartBanner && !bannerDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-xl border-2 border-secondary/40 bg-secondary/10 p-4 pr-10"
        >
          <button
            onClick={() => { setBannerDismissed(true); searchParams.delete("from"); setSearchParams(searchParams, { replace: true }); }}
            className="absolute top-3 right-3 text-secondary/60 hover:text-secondary"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            <Sparkles className="h-4 w-4 inline mr-1.5 text-secondary" />
            <strong>Abby recommends starting here.</strong> Your next step is highlighted below — one click away.
          </p>
        </motion.div>
      )}

      {/* 1. Hero strip with progress and continue CTA */}
      <BookHubHeroStrip
        bookId={book.id}
        bookTitle={book.title}
        progress={progress}
        onJumpTab={handleJumpTab}
      />

      {/* 2. Abby's snapshot — collapsible */}
      <div className="rounded-2xl border border-secondary/20 bg-card overflow-hidden">
        <button
          onClick={() => setSnapshotOpen((v) => !v)}
          className="w-full flex items-center gap-3 p-4 hover:bg-secondary/5 transition"
        >
          <div className="w-9 h-9 rounded-full bg-secondary/15 flex items-center justify-center text-base shrink-0">👩‍💼</div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm">Abby's Business Snapshot</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 rounded-full px-2 py-0.5">AI Advisor</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Plan ready for <strong>"{book.title}"</strong> · {planSections.length} section{planSections.length === 1 ? "" : "s"} · click to view
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${snapshotOpen ? "rotate-180" : ""}`} />
        </button>

        {snapshotOpen && (
          <div className="border-t border-border p-4 space-y-3">
            {planSections.length === 1 ? (
              <div className="rounded-lg bg-muted/30 p-4 max-h-[320px] overflow-y-auto text-sm">
                <MarkdownRenderer content={planSections[0].content} />
              </div>
            ) : planSections.length > 1 ? (
              <Tabs defaultValue={planSections[0]?.key}>
                <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
                  {planSections.map((s) => (
                    <TabsTrigger
                      key={s.key} value={s.key}
                      className="text-[11px] px-3 py-1.5 data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary rounded-full border border-transparent data-[state=active]:border-secondary/30"
                    >
                      {s.emoji} {s.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {planSections.map((s) => (
                  <TabsContent key={s.key} value={s.key} className="mt-3">
                    <div className="rounded-lg bg-muted/30 p-4 max-h-[320px] overflow-y-auto text-sm">
                      <MarkdownRenderer content={s.content} />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onConsultAbby}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {planSections.length > 0 ? "Refine Plan with Abby" : "Continue Analysis"}
              </Button>
              {planSections.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownloadPlan} disabled={downloading}>
                  {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download .docx
                </Button>
              )}
              <button
                onClick={() => setShowManuscriptUpload(!showManuscriptUpload)}
                className="ml-auto text-xs text-secondary hover:underline flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                {hasManuscript ? `Manuscript loaded (${Math.round(manuscriptChars / 1000)}k chars) — Replace` : "Upload manuscript"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2.5 Plan status strip — paid users only, dynamic counts */}
      {effectiveTier !== "free" && (() => {
        const isAdminAccess = isAdmin || isSuperAdmin(user?.email);
        const planLabel = isAdminAccess
          ? "Admin access"
          : effectiveTier === "yield" ? "Yield Plan active"
          : effectiveTier === "build" ? "Build Plan active"
          : "Brand Plan active";
        const allNodes = Object.values(progress.byCategory).flatMap((c) => c.nodes);
        const unlockedCount = allNodes.filter((n) => n.state !== "locked" && n.state !== "coming-soon").length;
        const totalCount = progress.overallTotal;
        return (
          <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 text-success text-xs font-bold">✓</span>
            <p className="text-sm flex-1 min-w-0">
              <strong className="text-success">{planLabel}</strong>
              <span className="text-muted-foreground"> — {unlockedCount} of {totalCount} builders unlocked.</span>
              {progress.overallCompleted > 0 && (
                <span className="text-muted-foreground"> · {progress.overallCompleted} built.</span>
              )}
            </p>
            {!isAdminAccess && (
              <button
                type="button"
                onClick={() => navigate("/account-settings?tab=billing")}
                className="text-xs font-semibold text-secondary hover:underline shrink-0"
              >
                Manage plan →
              </button>
            )}
          </div>
        );
      })()}

      {/* 3. Your Next 3 Steps */}
      {progress.topNextSteps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Your Next {progress.topNextSteps.length} Step{progress.topNextSteps.length === 1 ? "" : "s"}
            </h2>
            <button onClick={() => onNavigateTab("revenue-streams")} className="text-xs text-secondary hover:underline font-semibold">
              See full journey →
            </button>
          </div>
          <JourneyStepper
            nodes={progress.topNextSteps}
            bookId={book.id}
            bookTitle={book.title}
            highlightNodeId={progress.topNextSteps[0]?.id || null}
            accent={accent}
            onUpgrade={() => navigate("/dashboard?section=build-business")}
            onNavigateSection={(s) => navigate(`/dashboard?section=${s}&bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`)}
          />
        </div>
      )}

      {/* 4. Tier upgrade CTA — free only */}
      {effectiveTier === "free" && (
        <div className="rounded-2xl border-2 border-secondary/30 bg-secondary/5 p-5">
          <p className="text-sm font-medium mb-3">Ready to start building? Unlock the AI builders to create these products automatically.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/dashboard?section=build-business")} className="flex-1 min-w-[120px] rounded-lg border-2 border-border bg-card p-3 text-center hover:border-muted-foreground/30 transition">
              <div className="text-xs font-bold">Brand Package</div>
              <div className="text-[10px] text-muted-foreground">$49/mo · 9 builders</div>
            </button>
            <button type="button" onClick={() => navigate("/dashboard?section=build-business")} className="flex-1 min-w-[120px] rounded-lg bg-secondary p-3 text-center text-secondary-foreground relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">Most Popular</span>
              <div className="text-xs font-bold">Build Package</div>
              <div className="text-[10px] text-secondary-foreground/80">$99/mo · 18 builders</div>
            </button>
            <button type="button" onClick={() => navigate("/dashboard?section=build-business")} className="flex-1 min-w-[120px] rounded-lg p-3 text-center text-white" style={{ background: "#1B2A4A" }}>
              <div className="text-xs font-bold">Yield Package</div>
              <div className="text-[10px] text-white/70">$249/mo · all 28</div>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">14-day money-back guarantee · No questions asked</p>
        </div>
      )}

      {/* 5. Market snapshot — keep, but lower */}
      {(marketData || marketLoading) && <MarketSnapshot data={marketData!} loading={marketLoading} />}

      {showManuscriptUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <ManuscriptUpload bookId={book.id} bookTitle={book.title} />
        </motion.div>
      )}
    </div>
  );
}
