import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBpBuildRoute } from "@/lib/bpRoutes";
import {
  Loader2, Megaphone, CheckCircle2, Clock, Zap, Sparkles,
  ArrowRight, Eye, Users, Rocket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import MarketingAssetReview from "./marketing/MarketingAssetReview";
import LeadsDashboard from "./marketing/LeadsDashboard";

/* ─── Types ─── */

interface NodeRow {
  node_id: string;
  status: string;
  marketing_activated_at: string | null;
  microsite_url: string | null;
}

interface MarketingAsset {
  id: string;
  asset_type: string;
  content: any;
  status: string;
  book_id: string;
}

type ViewMode = "hub" | "assets" | "leads";

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MarketingHub({ onNavigate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [nodeRows, setNodeRows] = useState<NodeRow[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [firstBook, setFirstBook] = useState<{ id: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("hub");

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-marketing-hub-data", {
        body: { user_id: user.id, email: user.email || null },
      });

      if (!error && data) {
        if (data.author_profile_id) setAuthorProfileId(data.author_profile_id);
        setNodeRows((data.nodes as NodeRow[]) || []);
        if (data.book) setFirstBook(data.book);
      }

      // Fetch marketing assets
      if (data?.author_profile_id && data?.book?.id) {
        const { data: assetData } = await supabase
          .from("marketing_assets")
          .select("id, asset_type, content, status, book_id")
          .eq("author_id", data.author_profile_id)
          .eq("book_id", data.book.id)
          .order("created_at");

        setAssets((assetData as MarketingAsset[]) || []);
      }
    } catch (err) {
      console.error("Failed to fetch marketing data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Determine overall status ─── */
  const hasLiveNodes = nodeRows.some(n => n.marketing_activated_at);
  const hasAssets = assets.length > 0;
  const allAssetsApproved = hasAssets && assets.every(a => a.status === "approved" || a.status === "live");
  const hasPublishedNodes = nodeRows.some(n =>
    n.status === "live" || n.status === "content_ready" || n.status === "published_pending_ghl"
  );

  /* ─── ABBY: Generate marketing assets ─── */
  const handleGenerate = async () => {
    if (!authorProfileId || !firstBook) {
      toast({ title: "No book found", description: "Please add a book first.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("abby-generate-marketing-assets", {
        body: { book_id: firstBook.id, author_id: authorProfileId },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Generation failed");
      }
      toast({
        title: "🎉 ABBY generated your marketing assets!",
        description: `${data.total} assets created. Review and approve them below.`,
      });
      setViewMode("assets");
      await fetchData();
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  /* ─── ABBY: Activate node (go live) ─── */
  const handleActivate = async () => {
    if (!authorProfileId || !firstBook) return;
    setActivating(true);
    try {
      // Activate BP-02 (lead magnet) as the primary node
      const { data, error } = await supabase.functions.invoke("abby-activate-node", {
        body: { author_id: authorProfileId, node_id: "BP-02", book_id: firstBook.id },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Activation failed");
      }
      toast({
        title: "🚀 Your landing page is LIVE!",
        description: `Leads will now be captured and nurtured automatically by ABBY.`,
      });
      await fetchData();
      setViewMode("hub");
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  const resolveBpLink = (nodeId: string): string => {
    return getBpBuildRoute(nodeId, firstBook ? { bookId: firstBook.id, bookTitle: firstBook.title } : undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Your Marketing Hub</h1>
          <p className="text-muted-foreground mt-1">
            ABBY manages your marketing — from content generation to lead nurture.
          </p>
        </div>
        <div className="flex gap-2">
          {hasAssets && (
            <>
              <Button
                variant={viewMode === "assets" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("assets")}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Assets
              </Button>
              <Button
                variant={viewMode === "leads" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("leads")}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Leads
              </Button>
            </>
          )}
          <Button
            variant={viewMode === "hub" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("hub")}
          >
            <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Hub
          </Button>
        </div>
      </div>

      {/* View: Assets Review */}
      {viewMode === "assets" && authorProfileId && firstBook && (
        <MarketingAssetReview
          assets={assets}
          bookId={firstBook.id}
          authorId={authorProfileId}
          onRefresh={fetchData}
          onAllApproved={() => {
            toast({
              title: "All assets approved!",
              description: "You can now go live. Click 'Go Live' to activate your landing page.",
            });
          }}
        />
      )}

      {/* View: Leads Dashboard */}
      {viewMode === "leads" && authorProfileId && (
        <LeadsDashboard authorId={authorProfileId} bookId={firstBook?.id} />
      )}

      {/* View: Hub (main) */}
      {viewMode === "hub" && (
        <>
          {/* Status overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Content</p>
              </div>
              <p className="text-lg font-bold">
                {hasAssets ? `${assets.length} Assets` : "Not Generated"}
              </p>
              {hasAssets && (
                <p className="text-xs text-muted-foreground mt-1">
                  {assets.filter(a => a.status === "approved" || a.status === "live").length} approved
                </p>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Status</p>
              </div>
              <p className="text-lg font-bold">
                {hasLiveNodes ? "Live" : allAssetsApproved ? "Ready to Launch" : hasAssets ? "Review Assets" : "Setup"}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Nurture Engine</p>
              </div>
              <p className="text-lg font-bold">
                {hasLiveNodes ? "Running ✓" : "Waiting"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasLiveNodes ? "ABBY monitors leads 24/7" : "Activates when you go live"}
              </p>
            </Card>
          </div>

          {/* ABBY's guidance — step-by-step flow */}
          <Card className="p-6 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">ABBY's Marketing Engine</h3>

                {/* Step 1: Need a book */}
                {!firstBook && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add your book first — ABBY will generate all marketing content from your manuscript.
                    </p>
                    <Button size="sm" onClick={() => navigate("/brand-products")}>
                      Add Your Book <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Step 2: Generate assets */}
                {firstBook && !hasAssets && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Ready to generate your complete marketing toolkit from <strong>"{firstBook.title}"</strong>?
                      ABBY will create landing page copy, lead magnet outline, 30-day social calendar,
                      3 blog posts, Amazon A+ content, ad copy, and a review outreach kit.
                    </p>
                    <Button size="sm" onClick={handleGenerate} disabled={generating}>
                      {generating ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> ABBY is generating...</>
                      ) : (
                        <><Sparkles className="h-3 w-3 mr-1" /> Generate Marketing Assets</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 3: Review and approve */}
                {hasAssets && !allAssetsApproved && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      ABBY generated {assets.length} marketing assets. Review and approve them before going live.
                    </p>
                    <Button size="sm" onClick={() => setViewMode("assets")}>
                      <Eye className="h-3 w-3 mr-1" /> Review Assets
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {assets.filter(a => a.status === "draft").length} pending
                      </Badge>
                    </Button>
                  </div>
                )}

                {/* Step 4: Go live */}
                {allAssetsApproved && !hasLiveNodes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      All assets approved! Click below to deploy your landing page and activate ABBY's nurture engine.
                      Every lead will automatically receive personalised emails generated from your book.
                    </p>
                    <Button size="sm" onClick={handleActivate} disabled={activating} className="bg-emerald-600 hover:bg-emerald-700">
                      {activating ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Going live...</>
                      ) : (
                        <><Rocket className="h-3 w-3 mr-1" /> Go Live</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 5: Live — show status */}
                {hasLiveNodes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> LIVE
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your landing page is live and ABBY is monitoring all leads 24/7.
                      Every new subscriber receives a personalised welcome email, and ABBY
                      continuously nurtures them based on their behaviour.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewMode("leads")}>
                        <Users className="h-3 w-3 mr-1" /> View Leads
                      </Button>
                      {nodeRows.find(n => n.microsite_url)?.microsite_url && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => {
                            const url = nodeRows.find(n => n.microsite_url)?.microsite_url;
                            if (url) window.open(url, "_blank");
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View Landing Page
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* How it works */}
          {!hasLiveNodes && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">How ABBY's Nurture Engine Works</h3>
              <div className="space-y-2">
                {[
                  { icon: Sparkles, text: "ABBY analyses your book and generates all marketing content" },
                  { icon: Rocket, text: "Your landing page goes live with a lead capture form" },
                  { icon: Users, text: "Every new lead gets a personalised welcome email from your book's themes" },
                  { icon: Zap, text: "ABBY monitors behaviour and generates the next best email — forever" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
