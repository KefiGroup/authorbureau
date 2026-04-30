import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Eye, Edit, Loader2, Package, GraduationCap,
  BookOpen, Headphones, Podcast, FileText, Download, Send,
  Video, Users, Mic, Target, DollarSign, Award, Globe,
  Megaphone, Heart, Building2, Network, Zap, Star,
  BookMarked, ShieldCheck, Crown, Ticket, Briefcase,
  CircleDot, ArrowRight, Sparkles, BarChart3, Trash2,
} from "lucide-react";
import HomeStudyExportModal from "./HomeStudyExportModal";
import MarkdownRenderer from "./MarkdownRenderer";
import HomeStudyReviewView from "./review/HomeStudyReviewView";
import LiveMicrositesGrid from "./review/LiveMicrositesGrid";
import { ALL_BUILDER_NODES, type BuilderNodeConfig } from "../dashboard/builders/builderNodeConfig";
import { toast } from "@/hooks/use-toast";

/* ── Icon Map ────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  FileText, GraduationCap, BookOpen, Headphones, Podcast, Video,
  Users, Mic, Target, DollarSign, Award, Globe, Megaphone, Heart,
  Building2, Network, Zap, Star, BookMarked, ShieldCheck, Crown,
  Ticket, Briefcase, Send, Package, BarChart3, CircleDot, Edit,
  Sparkles,
};

/* ── Node ID → Dashboard route mapping ──────────────────────────── */
const NODE_TO_ROUTE: Record<string, string> = {
  "home-study-course": "home-study",
  "online-course": "courses",
  "coaching-1on1": "coaching",
  "membership": "memberships",
  "audiobook": "audiobook-studio",
  "email-flows": "email-marketing",
  "retreat": "retreats",
  "certification": "certification",
  "mastermind": "masterminds",
  "corporate-training": "corporate-training",
};

/* ── Types ────────────────────────────────────────────────────── */
interface DraftProduct {
  id: string;
  title: string;
  nodeId: string;
  nodeLabel: string;
  category: "build" | "bridge" | "yield";
  bookTitle: string;
  bookId: string;
  table: string;
  status: string;
  description?: string;
  price?: number;
  createdAt: string;
  actProgress: number; // 0-100, how far through the 3-act pipeline
  currentAct: 1 | 2 | 3;
  stepsCompleted: number;
  totalSteps: number;
  contentPreview?: string;
}

/* ── Category Labels ────────────────────────────────────────────── */
const CATEGORY_CONFIG = {
  build: { label: "B · Brand Products", badge: "Brand", color: "bg-emerald-500/15 text-emerald-700 border-emerald-300", icon: Zap, count: 0 },
  bridge: { label: "B · Build Authority", badge: "Build", color: "bg-blue-500/15 text-blue-700 border-blue-300", icon: Network, count: 0 },
  yield: { label: "Y · Yield Revenue", badge: "Yield", color: "bg-amber-500/15 text-amber-700 border-amber-300", icon: Crown, count: 0 },
};

/* ── Act Badge Colors ───────────────────────────────────────────── */
const ACT_COLORS = {
  1: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "ACT 1 — ANALYSE" },
  2: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", label: "ACT 2 — BRAND" },
  3: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: "ACT 3 — BUILD" },
};

/* ── Status Config ──────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  ready_for_review: { label: "Ready for Review", className: "bg-secondary/15 text-secondary border border-secondary/30" },
  published: { label: "Published", className: "bg-accent/15 text-accent-foreground border border-accent/30" },
};

interface Props {
  onNavigate?: (section: string) => void;
}

export default function ReviewProductsPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmProduct, setConfirmProduct] = useState<DraftProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<DraftProduct | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportProduct, setExportProduct] = useState<DraftProduct | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [detailProduct, setDetailProduct] = useState<DraftProduct | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setShowSlowHint(false);
    setLoadError(null);
    const hintTimer = setTimeout(() => setShowSlowHint(true), 3000);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "list-drafts" }),
        },
        12000,
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to load");

      console.log("[ReviewProducts] drafts payload →", {
        count: (result.drafts || []).length,
        by_table: (result.drafts || []).reduce((acc: any, d: any) => { acc[d.table] = (acc[d.table] || 0) + 1; return acc; }, {}),
      });

      // Map slug → BP/BA/YR code so ALL_BUILDER_NODES.find resolves the right meta
      const SLUG_TO_CODE: Record<string, string> = {
        "lead-magnet": "BP-02", "lead-magnets": "BP-02",
        "email-flows": "BP-01", "email-marketing": "BP-01", "social-media": "BP-03",
        "website": "BP-04", "webinar": "BP-05", "workbook": "BP-06",
        "book-sales": "BP-07", "audiobook": "BA-11", "online-course": "BA-10",
        "membership": "BA-12", "group-coaching": "BA-13", "podcast": "BA-14",
        "press": "BA-15", "affiliate": "BA-16", "upsell-downsell": "BA-17",
        "partnerships": "BA-18", "home-study-course": "BP-07",
      };
      const drafts: DraftProduct[] = (result.drafts || []).map((item: any) => {
        const resolvedId = item.node_code || SLUG_TO_CODE[item.nodeId] || item.nodeId;
        const nodeConfig = ALL_BUILDER_NODES.find(n => n.id === resolvedId);
        const totalSteps = nodeConfig?.steps.length || 5;
        const rawSteps = item.stepsCompleted || 0;
        const stepsCompleted = Math.min(rawSteps, totalSteps); // cap to prevent "14/5" displays
        const actProgress = Math.min(100, Math.round((stepsCompleted / totalSteps) * 100));
        const currentAct = stepsCompleted === 0 ? 1 : stepsCompleted >= totalSteps - 1 ? 3 : 2;

        return {
          id: item.id,
          title: item.title || nodeConfig?.label || "Untitled",
          nodeId: item.nodeId || item.table,
          nodeLabel: nodeConfig?.label || item.table,
          category: (nodeConfig?.category || "build") as "build" | "bridge" | "yield",
          bookTitle: item.bookTitle || "",
          bookId: item.book_id,
          table: item.table,
          status: item.status,
          description: item.description || undefined,
          price: item.price,
          createdAt: item.created_at,
          actProgress,
          currentAct: currentAct as 1 | 2 | 3,
          stepsCompleted,
          totalSteps,
          contentPreview: item.contentPreview,
        };
      });

      // Dedupe by bookId+nodeId so the counter reflects unique products per book.
      const deduped = Array.from(
        new Map(drafts.map(d => [`${d.bookId || ""}:${d.nodeId}`, d])).values()
      );
      setProducts(deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.warn("[ReviewProducts] Failed to fetch drafts:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load products");
      setProducts([]);
    } finally {
      clearTimeout(hintTimer);
      setLoading(false);
      setShowSlowHint(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchDrafts();
  }, [user, fetchDrafts]);

  const handlePublish = async (product: DraftProduct) => {
    setPublishing(product.id);
    setConfirmProduct(null);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "publish-product", productId: product.id, table: product.table }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Publish failed");

      toast({ title: "Published! ✅", description: `${product.title} is now live on your microsite.` });
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (product: DraftProduct) => {
    if (!window.confirm(`Delete "${product.title}"? This will remove the generated draft and review record.`)) return;

    setDeletingId(product.id);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "delete-product",
            productId: product.id,
            table: product.table,
            nodeId: product.nodeId,
            bookId: product.bookId,
          }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Delete failed");

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast({ title: "Draft deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreview = async (product: DraftProduct) => {
    setPreviewProduct(product);
    setPreviewContent(null);
    setPreviewLoading(true);

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "preview-product", productId: product.id, table: product.table, nodeId: product.nodeId, bookId: product.bookId }),
        }
      );
      const result = await resp.json();
      setPreviewContent(result.preview || null);
    } catch (error) {
      setPreviewContent(null);
    }
    setPreviewLoading(false);
  };

  /* ── Filtered Lists ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (activeTab === "all") return products;
    if (activeTab === "review") return products.filter(p => p.status === "ready_for_review");
    return products.filter(p => p.category === activeTab);
  }, [products, activeTab]);

  const categoryCounts = useMemo(() => ({
    build: products.filter(p => p.category === "build").length,
    bridge: products.filter(p => p.category === "bridge").length,
    yield: products.filter(p => p.category === "yield").length,
    review: products.filter(p => p.status === "ready_for_review").length,
  }), [products]);

  // If viewing a specific product detail (Home Study, etc.)
  if (detailProduct) {
    if (detailProduct.nodeId === "home-study-course") {
      return (
        <HomeStudyReviewView
          productId={detailProduct.id}
          bookId={detailProduct.bookId}
          bookTitle={detailProduct.bookTitle}
          productTitle={detailProduct.title}
          productTable={detailProduct.table}
          onBack={() => setDetailProduct(null)}
          onPublished={() => { setDetailProduct(null); fetchDrafts(); }}
        />
      );
    }
    // For other product types, fall back to clearing and showing list
    setDetailProduct(null);
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Live Microsites Grid (Audit #6) ─────────────────── */}
      <LiveMicrositesGrid />

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">
          Review & Publish Your Products
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every product follows the <span className="font-semibold text-amber-600">Analyse</span> → <span className="font-semibold text-blue-600">Brand</span> → <span className="font-semibold text-green-600">Build</span> pipeline. Review each one, then publish to your microsite.
        </p>
      </div>

      {/* ── Summary Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Products" value={products.length} icon={Package} />
        <SummaryCard label="Ready for Review" value={categoryCounts.review} icon={Eye} accent />
        <SummaryCard label="Brand Products" value={categoryCounts.build} icon={Zap} />
        <SummaryCard label="Build + Yield" value={categoryCounts.bridge + categoryCounts.yield} icon={Crown} />
      </div>

      {/* ── 3-Act Pipeline Visual ────────────────────────────── */}
      <Card className="p-4 bg-gradient-to-r from-amber-50/50 via-blue-50/50 to-green-50/50 dark:from-amber-950/20 dark:via-blue-950/20 dark:to-green-950/20 border-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">ACT 1 · ANALYSE</span>
            <span className="text-muted-foreground">Strategic Brief</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="font-semibold text-blue-700 dark:text-blue-400">ACT 2 · BRAND</span>
            <span className="text-muted-foreground">Content Creation</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="font-semibold text-green-700 dark:text-green-400">ACT 3 · BUILD</span>
            <span className="text-muted-foreground">Preview & Publish</span>
          </div>
        </div>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="all" className="text-xs">All ({products.length})</TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            Ready for Review {categoryCounts.review > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{categoryCounts.review}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="build" className="text-xs">Brand ({categoryCounts.build})</TabsTrigger>
          <TabsTrigger value="bridge" className="text-xs">Build ({categoryCounts.bridge})</TabsTrigger>
          <TabsTrigger value="yield" className="text-xs">Yield ({categoryCounts.yield})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            showSlowHint ? (
              <EmptyState tab={activeTab} onNavigate={onNavigate} slowHint />
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )
          ) : loadError ? (
            <Card className="p-6 text-center border-destructive/40 bg-destructive/5">
              <p className="text-sm font-semibold text-destructive">Couldn't load your products</p>
              <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => fetchDrafts()}>
                Retry
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} onNavigate={onNavigate} />
          ) : (
            <div className="space-y-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  publishing={publishing}
                  deletingId={deletingId}
                  onPreview={() => {
                    // Home study gets full-page preview
                    if (product.nodeId === "home-study-course") {
                      setDetailProduct(product);
                    } else {
                      handlePreview(product);
                    }
                  }}
                  onEdit={() => {
                    // Edit always navigates to the builder studio
                    onNavigate?.(NODE_TO_ROUTE[product.nodeId] || product.nodeId);
                  }}
                  onDelete={() => handleDelete(product)}
                  onPublish={() => setConfirmProduct(product)}
                  onExport={product.table === "home_study_courses" ? () => setExportProduct(product) : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Publish Confirmation Dialog ──────────────────────── */}
      <Dialog open={!!confirmProduct} onOpenChange={() => setConfirmProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-accent" />
              Publish to Microsite
            </DialogTitle>
            <DialogDescription>
              This will make <strong>"{confirmProduct?.title}"</strong> live on your author microsite. Visitors will be able to discover and purchase this product.
            </DialogDescription>
          </DialogHeader>
          {confirmProduct && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">{confirmProduct.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{confirmProduct.nodeLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Book:</span>
                <span className="font-medium">{confirmProduct.bookTitle}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmProduct(null)}>Cancel</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirmProduct && handlePublish(confirmProduct)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ───────────────────────────────────── */}
      <Dialog open={!!previewProduct} onOpenChange={() => setPreviewProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {previewProduct && (
                <Badge variant="outline" className={`text-[9px] ${ACT_COLORS[previewProduct.currentAct].bg} ${ACT_COLORS[previewProduct.currentAct].text} ${ACT_COLORS[previewProduct.currentAct].border}`}>
                  {ACT_COLORS[previewProduct.currentAct].label}
                </Badge>
              )}
              <Badge variant="outline" className={`text-[9px] ${CATEGORY_CONFIG[previewProduct?.category || "build"].color}`}>
                {CATEGORY_CONFIG[previewProduct?.category || "build"].badge}
              </Badge>
            </div>
            <DialogTitle className="text-lg">{previewProduct?.title}</DialogTitle>
            <DialogDescription>{previewProduct?.nodeLabel} · {previewProduct?.bookTitle}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-4">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading product content...</p>
              </div>
            ) : previewContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={previewContent} />
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                {previewProduct?.description ? (
                  <p className="text-sm text-muted-foreground">{previewProduct.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No preview content available yet. Continue building in the studio to generate content.</p>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setPreviewProduct(null)}>Close</Button>
            {previewProduct?.status === "ready_for_review" && (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  setPreviewProduct(null);
                  if (previewProduct) setConfirmProduct(previewProduct);
                }}
              >
                <Send className="h-4 w-4 mr-1.5" /> Publish to Microsite
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Home Study Export Modal ──────────────────────────── */}
      <HomeStudyExportModal
        open={!!exportProduct}
        onOpenChange={() => setExportProduct(null)}
        product={exportProduct ? { title: exportProduct.title, type: exportProduct.nodeLabel, bookTitle: exportProduct.bookTitle, description: exportProduct.description } : null}
        fetchContent={exportProduct ? async () => {
          if (!user) return null;
          const { data: asset } = await supabase
            .from("generated_assets")
            .select("content")
            .eq("author_id", user.id)
            .eq("book_id", exportProduct.bookId)
            .eq("asset_type", "builder_draft_home-study")
            .maybeSingle();
          if (!asset?.content) return null;
          try {
            const parsed = JSON.parse(asset.content);
            const sd = parsed.stepData || {};
            const { data: profile } = await supabase
              .from("author_profiles")
              .select("pen_name")
              .eq("user_id", user.id)
              .maybeSingle();
            return {
              setup: sd.setup || { title: exportProduct.title, description: exportProduct.description || "", duration: 30, commitment: 30, level: "Beginner" },
              days: sd.schedule?.days || [],
              authorName: profile?.pen_name || "Author",
            };
          } catch (error) { return null; }
        } : undefined}
      />
    </div>
  );
}

/* ── Sub-Components ────────────────────────────────────────────────── */

function SummaryCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ElementType; accent?: boolean }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-secondary/15" : "bg-muted"}`}>
        <Icon className={`h-4 w-4 ${accent ? "text-secondary" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className={`text-xl font-bold font-heading ${accent && value > 0 ? "text-secondary" : ""}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </Card>
  );
}

function ProductCard({
  product,
  publishing,
  deletingId,
  onPreview,
  onEdit,
  onDelete,
  onPublish,
  onExport,
}: {
  product: DraftProduct;
  publishing: string | null;
  deletingId: string | null;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onExport?: () => void;
}) {
  const nodeConfig = ALL_BUILDER_NODES.find(n => n.id === product.nodeId);
  const iconName = nodeConfig?.icon || "FileText";
  const Icon = ICON_MAP[iconName] || FileText;
  const actColor = ACT_COLORS[product.currentAct];
  const statusCfg = STATUS_CONFIG[product.status] || STATUS_CONFIG.draft;
  const catCfg = CATEGORY_CONFIG[product.category];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Icon + Act indicator */}
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${actColor.bg}`}>
            <Icon className={`h-5 w-5 ${actColor.text}`} />
          </div>
          {/* Tiny act dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold ${actColor.bg} ${actColor.text}`}>
            {product.currentAct}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading font-semibold text-sm truncate">{product.title}</h4>
            <Badge variant="outline" className={`text-[9px] h-5 ${statusCfg.className}`}>
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className={`text-[9px] h-5 ${catCfg.color}`}>
              {catCfg.badge}
            </Badge>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {product.nodeLabel} · {product.bookTitle}
          </p>

          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          )}

          {/* 3-Act Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={product.actProgress} className="h-1.5" />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {product.stepsCompleted}/{product.totalSteps} steps
            </span>
            <Badge variant="outline" className={`text-[8px] h-4 px-1.5 ${actColor.bg} ${actColor.text} ${actColor.border}`}>
              {actColor.label.split(" — ")[1]}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start" onClick={onPreview}>
            <Eye className="h-3 w-3 mr-1.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1.5" /> Edit
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start" onClick={onExport}>
              <Download className="h-3 w-3 mr-1.5" /> Export
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 w-full justify-start text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={publishing === product.id || deletingId === product.id}
          >
            {deletingId === product.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <><Trash2 className="h-3 w-3 mr-1.5" /> Delete</>
            )}
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 w-full justify-start bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={onPublish}
            disabled={publishing === product.id || deletingId === product.id}
          >
            {publishing === product.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <><Send className="h-3 w-3 mr-1.5" /> Publish</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ tab, onNavigate, slowHint }: { tab: string; onNavigate?: (s: string) => void; slowHint?: boolean }) {
  const messages: Record<string, string> = {
    all: "Nothing published yet — go to Brand Products to build your first product.",
    review: "No products are ready for review yet. Complete a product in the builder studio to move it here.",
    build: "No Brand Products in progress. Start with a Workbook or Home Study Course.",
    bridge: "No Build Authority products yet. Try building an Online Course or Podcast.",
    yield: "No Yield Revenue products yet. These are your high-ticket offerings like Coaching and Masterminds.",
  };

  return (
    <Card className="py-16 text-center border-dashed">
      <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-heading text-lg font-semibold mb-2">No Products Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">{messages[tab] || messages.all}</p>
      {slowHint && (
        <p className="text-xs text-muted-foreground/70 mb-3 inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> still loading…
        </p>
      )}
      <div>
        <Button variant="outline" onClick={() => onNavigate?.("brand-products")}>
          Go to Brand Products →
        </Button>
      </div>
    </Card>
  );
}

/* ── Hook for sidebar badge ──────────────────────────────────────── */
export function useReviewProductCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) return;
        const resp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: "list-drafts" }),
          }
        );
        const result = await resp.json();
        setCount((result.drafts || []).length);
      } catch (error) { setCount(0); }
    })();
  }, [user]);

  return count;
}
