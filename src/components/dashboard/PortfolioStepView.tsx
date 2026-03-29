import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2, Plus, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { getActiveToken } from "@/lib/get-active-token";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SmartProductCard, { type ProductCardState, BASELINE_REVENUE } from "@/components/dashboard/SmartProductCard";
import { toast } from "@/hooks/use-toast";
import { ABBY_CATEGORIES, getEffectiveCategory, type AbbyCategory, type AbbyNode } from "@/config/abbyFrameworkConfig";
import { isSuperAdmin } from "@/lib/superadmin";
import { useNodeGating } from "@/hooks/useNodeGating";

// Re-use Node type from config
type Node = AbbyNode;

interface BookSummary {
  id: string;
  title: string;
  cover_image_url: string | null;
  slug: string;
  genre?: string | null;
}

// getActiveToken is now imported from @/lib/get-active-token

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
  const { user, isAdmin } = useAuth();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AbbyRecommendation[]>([]);
  const [builtProducts, setBuiltProducts] = useState<Set<string>>(new Set());
  const [publishedProducts, setPublishedProducts] = useState<Set<string>>(new Set());
  const { gating } = useNodeGating();
  const openNodeIds = new Set(gating.filter(r => r.is_open).map(r => r.node_id));
  const category = getEffectiveCategory(categoryId as AbbyCategory, isAdmin, isSuperAdmin(user?.email), openNodeIds);

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
          } catch (error) {
      console.error(error);
    }
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

  const tierOrder = ["free", "brand", "build", "yield"];
  const hasTierAccess = (required?: string) => {
    if (!required) return true;
    return tierOrder.indexOf(tier) >= tierOrder.indexOf(required.toLowerCase());
  };

  const getNodeState = (node: Node): ProductCardState => {
    // Planned or coming-soon nodes are always "coming-soon" regardless of other state
    if (node.status === "planned" || node.status === "coming-soon") return "coming-soon";

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

  const isBrandProducts = categoryId === "revenue-streams";
  const isBuildAuthority = categoryId === "marketing-channels";
  const isYieldRevenue = categoryId === "authority-builders";
  // Sub-category intro text for Brand Products & Build Authority
  const SUB_INTRO: Record<string, { intro: string }> = {
    "Branding & Marketing": {
      intro: "Start here. Before you sell anything, people need to find you, trust you, and hear from you consistently. These six products build your author platform, the foundation that makes everything else work.",
    },
    "Digital Products": {
      intro: "Once your branding and marketing engine is running, these three products give your audience more ways to buy from you at higher price points.\n\nWhy this order? Workbooks are the lowest lift because you're repurposing what you already wrote. Home Study Courses require more structure but command higher prices. Special Editions only make sense once you've proven demand and a loyal readership.",
    },
    "Scale Your Content": {
      intro: "Repackage what you've already created. Your book and brand products contain valuable knowledge. Now put that knowledge into formats that reach new audiences and command higher prices.\n\nWhy this order? Online Courses are the foundation. They prove your teaching ability and establish you as an authority. Audiobooks extend reach without additional content creation. Memberships monetize your audience's desire for ongoing access and community.",
    },
    "Grow Your Reach": {
      intro: "Get in front of new audiences through live interaction and media channels. Your content and authority are established. Now amplify your visibility.\n\nWhy this order? Group Coaching proves you can deliver transformation to real people. It's the credibility builder. Podcast Tours amplify that credibility to new audiences. Media Outreach takes it to the mainstream level where you become a recognized authority in your field.",
    },
    "Monetize Your Network": {
      intro: "Use your established audience and authority to create passive income and partnership revenue. You've built the platform; now leverage it.\n\nWhy this order? Affiliates are the easiest: you recommend existing products. Upsells require understanding your audience's buying psychology and funnel optimization. Revenue Sharing requires established authority and audience size to attract partners.",
    },
    "High-Ticket Services": {
      intro: "These are premium offerings that leverage your expertise, audience, and authority. The order you pursue them depends on your strengths, your audience's needs, and market demand, not a prerequisite chain.",
    },
  };

  // Category accent class helpers
  const catAccent = isBrandProducts ? "builder-brand" : isBuildAuthority ? "builder-bridge" : "builder-yield";
  const catAccentText = isBrandProducts ? "text-builder-brand" : isBuildAuthority ? "text-builder-bridge" : "text-builder-yield";
  const catAccentBg = isBrandProducts ? "bg-builder-brand" : isBuildAuthority ? "bg-builder-bridge" : "bg-builder-yield";
  const catGradientIntro = isBrandProducts
    ? "bg-[image:var(--gradient-brand-intro)] border-builder-brand/20"
    : isBuildAuthority
    ? "bg-[image:var(--gradient-bridge-intro)] border-builder-bridge/25"
    : "bg-[image:var(--gradient-yield-intro)] border-builder-yield/20";

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className={`rounded-2xl p-6 border-2 ${isBrandProducts ? "border-builder-brand/30 bg-gradient-to-r from-builder-brand/10 via-builder-brand/5 to-transparent" : isBuildAuthority ? "border-builder-bridge/30 bg-gradient-to-r from-builder-bridge/10 via-builder-bridge/5 to-transparent" : "border-builder-yield/30 bg-gradient-to-r from-builder-yield/10 via-builder-yield/5 to-transparent"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} flex items-center justify-center text-white shadow-lg`}>
            <HeaderIcon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className={`font-heading text-2xl md:text-3xl font-black tracking-tight ${catAccentText}`}>
              {isBrandProducts ? "Your Products. Your Brand. Built From Your Book." : isBuildAuthority ? "Your Audience. Your Authority. Built From Your Brand." : isYieldRevenue ? "Premium Services. Premium Revenue. Built From Your Authority." : category.label}
            </h1>
            <p className="text-sm text-foreground/70 mt-1 font-medium">
              {category.subtitle}
              {recommendedCount > 0 && (
                <span className="ml-2 text-secondary font-semibold">· {recommendedCount} recommended by Abby</span>
              )}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs font-bold rounded-full px-3 py-1.5 ${isBrandProducts ? "bg-builder-brand/15 text-builder-brand" : isBuildAuthority ? "bg-builder-bridge/15 text-builder-bridge" : "bg-builder-yield/15 text-builder-yield"}`}>
              {category.nodes.length} products
            </span>
          </div>
        </div>
      </div>

      {/* Category intro – visually striking callout box */}
      {isBrandProducts && (
        <div className={`rounded-2xl border-2 ${catGradientIntro} p-6`}>
          <p className="text-sm text-foreground leading-relaxed">
            Everything in Brand Products is designed to do one thing: <strong className={catAccentText}>turn your book into a recognizable brand that sells while you sleep.</strong> These 9 products fall into two groups, and the order matters.
          </p>
        </div>
      )}
      {isBuildAuthority && (
        <div className={`rounded-2xl border-2 ${catGradientIntro} p-6 space-y-4`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-8 rounded-full ${catAccentBg}`} />
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${catAccentText}`}>The Build Authority Progression</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Brand Products</strong> built your foundation: website, book sales, email list, audience.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Build Authority</strong> scales that foundation: courses, coaching, media visibility, and partnership income.
            </p>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Everything in Build Authority is designed to do one thing: <strong className={catAccentText}>turn your book and brand into recognized expertise that attracts high-value opportunities.</strong> These 9 products fall into three groups, and the order matters.
          </p>
        </div>
      )}
      {isYieldRevenue && (
        <div className={`rounded-2xl border-2 ${catGradientIntro} p-6 space-y-4`}>
          <p className="text-sm text-foreground leading-relaxed">
            Everything in Yield Revenue is designed to do one thing: <strong className={catAccentText}>convert your established authority into high-ticket income.</strong> Unlike Brand Products and Build Authority, these 10 services don't require a strict sequence. You can pursue multiple streams simultaneously once you have the credibility to back them up.
          </p>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-6 rounded-full ${catAccentBg}`} />
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${catAccentText}`}>Why These Work Together (Not in Sequence)</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Unlike Brand Products (which build on each other) or Build Authority (which amplify your reach), Yield Revenue services all draw from the same well: your established authority and audience. You don't need to do coaching before consulting, or keynotes before masterminds. Instead, you pursue the services that align with:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-sm text-foreground/80">
               <li><strong className="text-foreground">Your strengths:</strong> What do you enjoy most? What are you best at?</li>
               <li><strong className="text-foreground">Your audience's needs:</strong> What will they pay for?</li>
               <li><strong className="text-foreground">Market demand:</strong> What opportunities are knocking on your door?</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-6 rounded-full ${catAccentBg}`} />
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${catAccentText}`}>The Full Journey</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground">Brand Products</strong> built your foundation and audience. <strong className="text-foreground">Build Authority</strong> scaled your reach and credibility. <strong className="text-foreground">Yield Revenue</strong> is where you monetize your expertise at the highest level, with premium pricing, selective clients, and maximum impact.
            </p>
          </div>
        </div>
      )}
      {/* Product Cards Grid – grouped by sub-category */}
      {(categoryId === "revenue-streams" || categoryId === "marketing-channels" || categoryId === "authority-builders") && subCategories.length > 1
        ? subCategories.map((group) => (
            <div key={group.name} className="space-y-5">
              <div>
                <div className={`flex items-center gap-3 mb-2 pb-3 border-b-2 ${isBrandProducts ? "border-builder-brand/25" : isBuildAuthority ? "border-builder-bridge/25" : "border-builder-yield/25"}`}>
                  <div className={`w-1.5 h-7 rounded-full ${catAccentBg}`} />
                  <h3 className={`text-lg font-heading font-black uppercase tracking-[0.12em] ${catAccentText}`}>
                    {group.name}
                  </h3>
                </div>
                {(isBrandProducts || isBuildAuthority || isYieldRevenue) && SUB_INTRO[group.name] && (
                  <p className="text-sm text-foreground/75 leading-relaxed mt-3 whitespace-pre-line">
                    {SUB_INTRO[group.name].intro}
                  </p>
                )}
              </div>
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
                      onBuild={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId ? navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`) : onNavigate?.("book-hub")); }}
                      onContinue={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId ? navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`) : onNavigate?.("book-hub")); }}
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
                  onBuild={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId ? navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`) : onNavigate?.("book-hub")); }}
                  onContinue={() => { node.navigateTo ? onNavigate?.(node.navigateTo) : (primaryBookId ? navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`) : onNavigate?.("book-hub")); }}
                  onView={() => { const profile = books[0]?.slug; if (profile) window.open(`/books/${profile}`, "_blank"); }}
                  onUpgrade={() => onNavigate?.("overview")}
                />
              );
            })}
          </div>
        )
      }

      {/* Revenue Estimate + Tip */}
      {(isBrandProducts || isBuildAuthority || isYieldRevenue) && (
        <>
          <div className={`rounded-2xl border-2 p-6 ${isBrandProducts ? "border-builder-brand/30 bg-gradient-to-r from-builder-brand/10 to-transparent" : isBuildAuthority ? "border-builder-bridge/30 bg-gradient-to-r from-builder-bridge/10 to-transparent" : "border-builder-yield/30 bg-gradient-to-r from-builder-yield/10 to-transparent"}`}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isBrandProducts ? "bg-builder-brand/15" : isBuildAuthority ? "bg-builder-bridge/15" : "bg-builder-yield/15"}`}>
                <TrendingUp className={`h-4.5 w-4.5 ${catAccentText}`} />
              </div>
              <span className={`text-xs font-black uppercase tracking-[0.15em] ${catAccentText}`}>Estimated Revenue</span>
            </div>
            <p className={`text-3xl font-heading font-black tracking-tight ${catAccentText}`}>
              {isBrandProducts ? "$5,520 – $15,480" : isBuildAuthority ? "$13,500 – $39,480" : "$68,400 – $215,520"}<span className="text-sm font-normal text-foreground/50 ml-1.5">/yr</span>
            </p>
          </div>
          <div className={`rounded-2xl border-2 p-5 ${isBrandProducts ? "border-builder-brand/15 bg-builder-brand/[0.04]" : isBuildAuthority ? "border-builder-bridge/15 bg-builder-bridge/[0.04]" : "border-builder-yield/15 bg-builder-yield/[0.04]"}`}>
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className={`${catAccentText}`}>💡 Tip:</strong>{" "}
              {isBrandProducts
                ? "You don't have to build all 9 at once. Abby recommends starting with products 1–3 (Website, Book Sales, Lead Magnets) and adding the rest as your audience grows."
                : isBuildAuthority
                ? "You don't need to launch all 9 at once. Abby recommends starting with products 1–3 (Online Courses, Audiobook, Memberships) and adding Groups 2–3 as your audience grows and your authority solidifies."
                : "You don't need to pursue all 10. Abby recommends choosing 2–3 services that align with your strengths and audience needs, then mastering those before expanding. Quality over quantity."
              }
            </p>
          </div>
        </>
      )}

      {/* Info */}
      <div className="rounded-2xl bg-muted/40 border border-border p-5 text-center">
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
