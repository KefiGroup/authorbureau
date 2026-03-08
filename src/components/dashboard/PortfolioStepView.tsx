import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Sparkles, Loader2, Plus, DollarSign, Radio, Award,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SmartProductCard, { type ProductCardState, BASELINE_REVENUE } from "@/components/dashboard/SmartProductCard";
import { toast } from "@/hooks/use-toast";

interface Node {
  id: string;
  label: string;
  icon: typeof BookOpen;
  description: string;
  status: "live" | "coming-soon" | "planned";
  tierRequired?: string;
  subCategory?: string;
  sequence?: number;
}

interface CategoryConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof DollarSign;
  nodes: Node[];
}

const categoryConfigs: Record<string, CategoryConfig> = {
  "revenue-streams": {
    id: "revenue-streams", label: "B · Build Authority", subtitle: "Digital assets & authority products",
    color: "text-emerald-600", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    headerIcon: DollarSign,
    nodes: [
      // Digital Products (sequence 1-5)
      { id: "workbooks", label: "Workbook", icon: FileText, description: "Companion workbook PDFs with exercises and templates", status: "live", subCategory: "Digital Products", sequence: 1 },
      { id: "audiobook", label: "Audiobook", icon: Headphones, description: "AI-narrated audiobook from your manuscript", status: "coming-soon", subCategory: "Digital Products", sequence: 2 },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, description: "Self-paced study guide with daily exercises", status: "coming-soon", subCategory: "Digital Products", sequence: 3 },
      { id: "book-sales-events", label: "Book Sales", icon: BookOpen, description: "QR code order pages & direct sales", status: "planned", subCategory: "Digital Products", sequence: 4 },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, description: "Signed copies, bundles, limited editions", status: "planned", subCategory: "Digital Products", sequence: 5 },
      // In-House (sequence 6-8)
      { id: "courses", label: "Online Courses", icon: GraduationCap, description: "8-12 module structured courses from your book content", status: "coming-soon", subCategory: "In-House", sequence: 6 },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "Conversion sequences and funnel optimization", status: "planned", subCategory: "In-House", sequence: 7, tierRequired: "Pro" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, description: "3-tier membership system with recurring revenue", status: "planned", subCategory: "In-House", sequence: 8, tierRequired: "Pro" },
      // Coaching (sequence 9-10)
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, description: "6/12-session coaching programs based on your framework", status: "live", subCategory: "Coaching", sequence: 9 },
      { id: "group-coaching", label: "Group Coaching", icon: Users, description: "8-week group coaching curriculum", status: "coming-soon", subCategory: "Coaching", sequence: 10, tierRequired: "Pro" },
      // In-House (continued)
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Quarterly mastermind groups", status: "planned", subCategory: "In-House", sequence: 11, tierRequired: "Pro" },
    ],
  },
  "marketing-channels": {
    id: "marketing-channels", label: "B · Bridge Channels", subtitle: "Marketing channels & audience connections",
    color: "text-violet-600", bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500", gradientTo: "to-violet-600",
    headerIcon: Radio,
    nodes: [
      { id: "social-media", label: "Social Media Marketing", icon: Share2, description: "90-day AI content calendar for all platforms", status: "live" },
      { id: "webinars", label: "Webinars", icon: Video, description: "Webinar scripts + slide decks + registration", status: "live" },
      { id: "podcast-guest", label: "Podcasts (Guest Appearances)", icon: Podcast, description: "Pitch kit to get booked as a guest", status: "planned", tierRequired: "Pro" },
      { id: "microsite", label: "Website / Microsite", icon: BookOpen, description: "Built-in book landing page & author site", status: "live" },
      { id: "affiliates", label: "Affiliates / Referral Partners", icon: Link2, description: "Affiliate tracking links and commission setup", status: "planned", tierRequired: "Pro" },
      { id: "email-marketing", label: "Email Marketing", icon: Megaphone, description: "AI nurture sequences and drip campaigns", status: "coming-soon" },
      { id: "pr-media", label: "PR / Media Outreach", icon: Megaphone, description: "Press releases & media pitch templates", status: "planned", tierRequired: "Pro" },
      { id: "strategic-partnerships", label: "Strategic Partnerships / JVs", icon: Handshake, description: "Joint venture matching and partner outreach", status: "planned", tierRequired: "Enterprise" },
    ],
  },
  "authority-builders": {
    id: "authority-builders", label: "Y · Yield Revenue", subtitle: "Premium revenue streams & monetization",
    color: "text-sky-600", bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500", gradientTo: "to-sky-600",
    headerIcon: Award,
    nodes: [
      { id: "keynotes", label: "Keynotes", icon: Mic, description: "3-5 keynote topics + slide decks", status: "live" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Quarterly mastermind groups", status: "planned", tierRequired: "Enterprise" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "2-3 day retreat programs", status: "planned", tierRequired: "Enterprise" },
      { id: "certification", label: "Certification", icon: ShieldCheck, description: "Curriculum + exam + certificates", status: "planned", tierRequired: "Enterprise" },
      { id: "revenue-sharing", label: "Revenue Sharing / JV", icon: Handshake, description: "Partnership matching and revenue sharing", status: "planned", tierRequired: "Enterprise" },
      { id: "events-conventions", label: "Events / Conventions / Conferences", icon: Calendar, description: "Conference & event revenue", status: "planned", tierRequired: "Enterprise" },
      { id: "sponsorships", label: "Sponsorships", icon: HandCoins, description: "Brand partnerships & sponsors", status: "planned", tierRequired: "Enterprise" },
      { id: "licensing", label: "Licensing / Royalties", icon: ShieldCheck, description: "Content licensing & royalty streams", status: "planned", tierRequired: "Enterprise" },
    ],
  },
};

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
  const category = categoryConfigs[categoryId];

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

        // Check built/published products
        const built = new Set<string>();
        const published = new Set<string>();
        const assetTypes = ["workbook", "course", "social", "email", "speaker"];
        const { data: assets } = await cloudSupabase
          .from("generated_assets")
          .select("asset_type")
          .eq("author_id", user.id)
          .in("asset_type", assetTypes);
        (assets || []).forEach((a: any) => built.add(a.asset_type));
        setBuiltProducts(built);

        // Check published statuses
        const tables = ["courses", "home_study_courses", "webinars", "audiobooks", "podcasts"] as const;
        for (const table of tables) {
          const { count } = await cloudSupabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("author_id", user.id)
            .eq("status", "published");
          if ((count || 0) > 0) published.add(table);
        }
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
    const nodeIdMap: Record<string, string> = {
      "courses": "courses", "home-study": "home_study_courses", "webinars": "webinars",
      "audiobook": "audiobooks", "workbooks": "workbook",
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
  const subCategories: { name: string; nodes: Node[] }[] = [];
  const seen = new Set<string>();
  for (const node of sortedNodes) {
    const sub = node.subCategory || "Other";
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
      {categoryId === "revenue-streams" && subCategories.length > 1
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
                      onBuild={() => { if (primaryBookId) navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`); }}
                      onContinue={() => { if (primaryBookId) navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`); }}
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
                  onBuild={() => { if (primaryBookId) navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`); }}
                  onContinue={() => { if (primaryBookId) navigate(`/dashboard/book/${primaryBookId}?tab=${categoryId}`); }}
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
