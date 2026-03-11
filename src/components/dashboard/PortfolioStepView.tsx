import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SmartProductCard, { type ProductCardState, BASELINE_REVENUE } from "@/components/dashboard/SmartProductCard";
import { toast } from "@/hooks/use-toast";
import { ABBY_CATEGORIES, type AbbyCategory, type AbbyNode } from "@/config/abbyFrameworkConfig";

// Re-use Node type from config
type Node = AbbyNode;

interface BookSummary {
  id: string;
  title: string;
  cover_image_url: string | null;
  slug: string;
  genre?: string | null;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

interface Props {
  categoryId: string;
  tier?: string;
  onNavigate?: (section: string) => void;
  analyzedBooks?: Array<{ id: string; title: string }>;
}

interface AbbyRecommendation {
  nodeId: string;
  personalizedDescription?: string;
  estimatedRevenue?: number;
}

export default function PortfolioStepView({ categoryId, tier = "free", onNavigate, analyzedBooks }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AbbyRecommendation[]>([]);
  const [builtProducts, setBuiltProducts] = useState<Set<string>>(new Set());
  const [publishedProducts, setPublishedProducts] = useState<Set<string>>(new Set());
  const category = ABBY_CATEGORIES[categoryId as AbbyCategory];

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const token = await getActiveToken();
        if (!token) { setLoading(false); return; }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        if (response.ok) setBooks(result.books || []);

        // Fetch Abby recommendations from business plans
        const { data: plans } = await cloudSupabase
          .from("generated_assets")
          .select("content")
          .eq("author_id", user.id)
          .eq("asset_type", "business_plan");

        const recs: AbbyRecommendation[] = [];
        (plans || []).forEach((p: any) => {
          try {
            const parsed = JSON.parse(p.content);
            const allProducts = [
              ...(parsed.packages?.starter?.products || []),
              ...(parsed.packages?.pro?.products || []),
              ...(parsed.packages?.enterprise?.products || []),
            ];
            allProducts.forEach((prod: any) => {
              const nodeId = prod.node?.toLowerCase().replace(/\s+/g, "-") || "";
              if (nodeId) {
                recs.push({
                  nodeId,
                  personalizedDescription: prod.reasoning,
                  estimatedRevenue: parseInt(prod.monthly_revenue_high?.replace(/[^0-9]/g, "") || "0") * 12,
                });
              }
            });
          } catch {}
        });
        setRecommendations(recs);

        // Check built/published products across all product tables
        const built = new Set<string>();
        const published = new Set<string>();

        // Check generated_assets for content that's been built
        const assetTypes = ["workbook", "course", "social", "email", "speaker", "home_study", "podcast", "audiobook"];
        const { data: assets } = await cloudSupabase
          .from("generated_assets")
          .select("asset_type")
          .eq("author_id", user.id)
          .in("asset_type", assetTypes);
        (assets || []).forEach((a: any) => built.add(a.asset_type));

        // Check all product tables for built/published status
        const tables = ["courses", "home_study_courses", "audiobooks", "podcasts", "coaching_packages", "email_flows", "social_media_content"] as const;
        for (const table of tables) {
          const { data: rows } = await cloudSupabase
            .from(table)
            .select("id, status")
            .eq("author_id", user.id)
            .limit(1);
          if (rows && rows.length > 0) {
            built.add(table);
            if (rows.some((r: any) => r.status === "published" || r.status === "active")) {
              published.add(table);
            }
          }
        }
        setBuiltProducts(built);
        setPublishedProducts(published);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  if (!category) return null;

  const tierOrder = ["free", "starter", "pro", "enterprise"];
  const hasTierAccess = (required?: string) => {
    if (!required) return true;
    return tierOrder.indexOf(tier) >= tierOrder.indexOf(required.toLowerCase());
  };

  const getNodeState = (node: Node): ProductCardState => {
    // Planned nodes are always "coming-soon" regardless of other state
    if (node.status === "planned") return "coming-soon";

    const nodeIdMap: Record<string, string> = {
      "courses": "courses",
      "home-study": "home_study_courses",
      "audiobook": "audiobooks",
      "workbooks": "workbooks",
      "podcast-guest": "podcasts",
      "social-media": "social_media_content",
      "email-marketing": "email_flows",
      "coaching-1on1": "coaching_packages",
      "group-coaching": "coaching_packages",
      "keynotes": "speaking_topics",
    };
    if (publishedProducts.has(nodeIdMap[node.id] || "")) return "published";
    if (builtProducts.has(node.id) || builtProducts.has(nodeIdMap[node.id] || "")) return "in-progress";
    if (node.tierRequired && !hasTierAccess(node.tierRequired)) return "locked";
    const isRecommended = recommendations.some(r => r.nodeId === node.id || r.nodeId.includes(node.id.split("-")[0]));
    if (isRecommended) return "recommended";
    return "available";
  };

  const getRec = (nodeId: string) => recommendations.find(r => r.nodeId === nodeId || r.nodeId.includes(nodeId.split("-")[0]));

  // Group nodes by subCategory, preserving sequence order
  const sortedNodes = [...category.nodes].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  
  // Build sub-category groups for rendering
  const labelMap: Record<string, string> = { "Other": "Premium Programs & Live Events", "Pro Products": "Digital Products" };
  const subCategories: { name: string; nodes: Node[] }[] = [];
  const seen = new Set<string>();
  for (const node of sortedNodes) {
    const rawSub = node.subCategory || "Other";
    const sub = labelMap[rawSub] || rawSub;
    if (!seen.has(sub)) {
      seen.add(sub);
      subCategories.push({ name: sub, nodes: [] });
    }
    subCategories.find(s => s.name === sub)!.nodes.push(node);
  }

  const HeaderIcon = category.headerIcon;
  const recommendedCount = sortedNodes.filter(n => getNodeState(n) === "recommended").length;
  const genre = books[0]?.genre || undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  // Determine the best book to navigate to for building
  const primaryBookId = analyzedBooks?.[0]?.id || books[0]?.id || "";

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} flex items-center justify-center text-white shadow-md`}>
          <HeaderIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{category.label}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {category.subtitle}
            {recommendedCount > 0 && (
              <span className="ml-2 text-secondary font-medium">· {recommendedCount} recommended by Abby</span>
            )}
          </p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-medium rounded-full px-3 py-1.5 ${category.bgColor} ${category.color}`}>
            {category.nodes.length} products
          </span>
        </div>
      </div>

      {/* Product Cards Grid – grouped by sub-category */}
      {(categoryId === "revenue-streams" || categoryId === "authority-builders") && subCategories.length > 1
        ? subCategories.map((group) => (
            <div key={group.name} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                {group.name}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.nodes.map((node) => {
                  const state = getNodeState(node);
                  const rec = getRec(node.id);
                  return (
                    <SmartProductCard
                      key={node.id}
                      id={node.id}
                      label={node.label}
                      icon={node.icon}
                      description={node.description}
                      personalizedDescription={rec?.personalizedDescription}
                      state={state}
                      tierRequired={node.tierRequired}
                      revenue={rec?.estimatedRevenue ? {
                        annual: rec.estimatedRevenue,
                        timeToBuild: BASELINE_REVENUE[node.id]?.timeToBuild || "~2 hours",
                        difficulty: BASELINE_REVENUE[node.id]?.difficulty || 2,
                      } : undefined}
                      genre={genre || undefined}
                      onBuild={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId && navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`)); }}
                      onContinue={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId && navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`)); }}
                      onView={() => { const profile = books[0]?.slug; if (profile) window.open(`/books/${profile}`, "_blank"); }}
                      onUpgrade={() => onNavigate?.("overview")}
                    />
                  );
                })}
              </div>
            </div>
          ))
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedNodes.map((node) => {
              const state = getNodeState(node);
              const rec = getRec(node.id);
              return (
                <SmartProductCard
                  key={node.id}
                  id={node.id}
                  label={node.label}
                  icon={node.icon}
                  description={node.description}
                  personalizedDescription={rec?.personalizedDescription}
                  state={state}
                  tierRequired={node.tierRequired}
                  revenue={rec?.estimatedRevenue ? {
                    annual: rec.estimatedRevenue,
                    timeToBuild: BASELINE_REVENUE[node.id]?.timeToBuild || "~2 hours",
                    difficulty: BASELINE_REVENUE[node.id]?.difficulty || 2,
                  } : undefined}
                  genre={genre || undefined}
                  onBuild={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId && navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`)); }}
                  onContinue={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId && navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`)); }}
                  onView={() => { const profile = books[0]?.slug; if (profile) window.open(`/books/${profile}`, "_blank"); }}
                  onUpgrade={() => onNavigate?.("overview")}
                />
              );
            })}
          </div>
        )
      }

      {/* Info */}
      <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {recommendations.length > 0
            ? "Products are ranked by Abby's recommendations and estimated revenue. Click into any product to start building."
            : "Analyze a book with Abby to get personalized recommendations and revenue estimates for each product."
          }
        </p>
      </div>
    </div>
  );
}
