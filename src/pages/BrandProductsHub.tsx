import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, Lock, Star, Clock, BarChart3 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

type NodeStatus = "locked" | "not_started" | "building" | "content_ready" | "live" | "error";

interface NodeCard {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: NodeStatus;
  microsite_url: string | null;
  current_step: number;
  content_source: string | null;
}

interface NodeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  revenue: string;
  time: string;
  difficulty: number;
  startHere?: boolean;
  section: "marketing" | "digital";
}

const BRAND_NODES: NodeDef[] = [
  { id: "BP-04", name: "Website", icon: "🌐", description: "Your digital home base. Every other product points back here. Without a website, your book sales, lead magnets, and email marketing have nowhere to live. Build this first.", revenue: "Revenue Enabler — unlocks all other streams", time: "~1 hour", difficulty: 3, startHere: true, section: "marketing" },
  { id: "BP-02", name: "Lead Magnets", icon: "🎁", description: "Free resources (checklists, sample chapters) that turn casual readers into subscribers. You need these before you can build an email list or run webinars.", revenue: "Revenue Enabler — feeds your email list", time: "~1 hour", difficulty: 3, section: "marketing" },
  { id: "BP-01", name: "Email Marketing", icon: "📧", description: "Your most valuable asset. Social media gets attention; email keeps it. Once people opt in through your lead magnets, nurture them with automated sequences that build trust and drive sales.", revenue: "$1,940/yr estimated", time: "~2 hours", difficulty: 3, section: "marketing" },
  { id: "BP-03", name: "Social Media", icon: "📱", description: "Consistent content drives traffic to your website and lead magnets. And that puts your audience on your email list. It is a loop. It is almost always on.", revenue: "$6,480/yr estimated", time: "~1 hour", difficulty: 3, section: "marketing" },
  { id: "BP-05", name: "Webinars", icon: "🎥", description: "Live or recorded video events that showcase your expertise. You can teach a webinar, promote products, and build relationships with your audience at scale.", revenue: "$5,400/yr estimated", time: "~2 hours", difficulty: 3, section: "marketing" },
  { id: "BP-06", name: "Workbook", icon: "📓", description: "Companion guides, exercises, and templates that get your readers doing, not just reading. The easiest digital product to create because the content already exists in your manuscript.", revenue: "$4,800/yr estimated", time: "~1 hour", difficulty: 3, section: "digital" },
  { id: "BP-07", name: "Home Study Course", icon: "🎓", description: "A self-paced program built from your book's core teachings. Typically priced 5x to 10x higher than your book alone.", revenue: "$14,400/yr estimated", time: "~3 hours", difficulty: 4, section: "digital" },
  { id: "BP-09", name: "Book Sales", icon: "📚", description: "Combine how you sell directly, privately, through Amazon, social pages, and on-site. Now you have book sales everywhere. Maximise your book's reach.", revenue: "$4,800/yr estimated", time: "~1 hour", difficulty: 3, section: "digital" },
  { id: "BP-08", name: "Special Editions", icon: "✨", description: "Premium versions of your book (hardcover, signed, boxed sets, collector editions). Build these last because they require the most effort to fulfil and only make sense once you've proven demand and have a reader base.", revenue: "$6,000/yr estimated", time: "~1 hour", difficulty: 3, section: "digital" },
];

const FALLBACK_NODES = [
  { node_id: "BP-01", node_name: "Email Marketing", status: "not_started" },
  { node_id: "BP-02", node_name: "Lead Magnets", status: "not_started" },
  { node_id: "BP-03", node_name: "Social Media", status: "not_started" },
  { node_id: "BP-04", node_name: "Website / Microsite", status: "not_started" },
  { node_id: "BP-05", node_name: "Webinars", status: "not_started" },
  { node_id: "BP-06", node_name: "Workbook", status: "not_started" },
  { node_id: "BP-07", node_name: "Home Study Course", status: "not_started" },
  { node_id: "BP-08", node_name: "Special Editions", status: "not_started" },
  { node_id: "BP-09", node_name: "Book Sales", status: "not_started" },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

export default function BrandProductsHub() {
  const { user, loading: authLoading, tier } = useAuth();
  const isTierUnlocked = hasTierAccess(tier, "brand");
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, pen_name, user_id, author_slug")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus, microsite_url: null, current_step: 1, content_source: null })));
        setLoading(false);
        return;
      }

      setAuthorName(profile.pen_name || "");
      setAuthorSlug(profile.author_slug || null);

      const { data: nodeRows } = await supabase
        .from("author_nodes")
        .select("node_id, node_name, personalised_name, status, microsite_url, current_step, content_json")
        .eq("author_id", profile.id)
        .like("node_id", "BP-%")
        .order("node_id");

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus, microsite_url: null, current_step: 1, content_source: null })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id,
          node_name: r.node_name,
          personalised_name: r.personalised_name,
          status: r.status as NodeStatus,
          microsite_url: r.microsite_url || null,
          current_step: (r as any).current_step || 1,
          content_source: (r.content_json as any)?.source || null,
        })));
      }
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) { navigate("/auth"); return null; }

  const getNodeStatus = (nodeId: string): NodeStatus => {
    const node = nodes.find(n => n.node_id === nodeId);
    return node?.status || "not_started";
  };

  const getContentSource = (nodeId: string): string | null => {
    const node = nodes.find(n => n.node_id === nodeId);
    return node?.content_source || null;
  };

  const getStatusBadge = (nodeId: string, def: NodeDef) => {
    if (!isTierUnlocked) return <StatusBadge variant="locked" />;
    const status = getNodeStatus(nodeId);
    if (def.startHere && status === "not_started") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-secondary text-secondary-foreground border border-secondary/40">
          <Star className="h-3 w-3" /> Start Here
        </span>
      );
    }
    if (status === "live") return <StatusBadge variant="live" label="Live ✓" />;
    if (status === "content_ready") return <StatusBadge variant="ready" />;
    if (status === "building") return <StatusBadge variant="building" label="In Progress" />;
    if (status === "error") return <StatusBadge variant="locked" label="Needs Attention" className="bg-destructive/15 text-destructive border-destructive/30" />;
    return <StatusBadge variant="not_started" />;
  };



  const handleCardClick = (nodeId: string) => {
    if (!isTierUnlocked) { navigate("/pricing"); return; }
    if (nodeId === "BP-04" && (getNodeStatus("BP-04") === "live" || authorSlug)) {
      navigate("/dashboard?section=microsite-manager");
      return;
    }
    navigate(`/node-builder/${nodeId}`);
  };

  const liveCount = nodes.filter(n => n.status === "live").length;

  const renderNodeCard = (def: NodeDef) => {
    const source = getContentSource(def.id);
    return (
      <div key={def.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-[var(--shadow-card-hover)] hover:border-[hsl(var(--builder-brand)/0.4)] transition-all">
        <div className="flex items-start justify-between">
          <span className="text-2xl">{def.icon}</span>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(def.id, def)}
            {source === "BP-02" && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[hsl(var(--builder-brand)/0.12)] text-[hsl(var(--builder-brand))] dark:bg-[hsl(var(--builder-brand)/0.2)]">
                📝 From Lead Magnets
              </span>
            )}
          </div>
        </div>
        <h3 className="font-heading text-base font-bold text-foreground">{def.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1">{def.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{def.revenue}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {def.time}</div>
          <StarRating count={def.difficulty} />
        </div>
        <Button
          size="sm"
          variant={isTierUnlocked ? "default" : "secondary"}
          className={isTierUnlocked ? "w-full text-xs mt-1 bg-secondary text-secondary-foreground hover:bg-secondary/90" : "w-full text-xs mt-1"}
          onClick={() => handleCardClick(def.id)}
        >
          {isTierUnlocked ? "Build This Product →" : "Upgrade to Unlock"}
        </Button>
      </div>
    );
  };

  const marketingNodes = BRAND_NODES.filter(n => n.section === "marketing");
  const digitalNodes = BRAND_NODES.filter(n => n.section === "digital");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back nav */}
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/dashboard">← Back to Dashboard</Link>
        </Button>

        {/* SECTION 1 — Header Card */}
        <Card className="rounded-xl border-2 border-[hsl(var(--builder-brand)/0.3)] bg-[var(--gradient-brand-intro)] p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--builder-brand)/0.15)] flex items-center justify-center shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-black text-foreground">Your Products. Your Brand. Built From Your Book.</h1>
                <p className="text-sm text-muted-foreground mt-1">Create Your Products (9 nodes)</p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--builder-brand)/0.15)] px-3 py-1 text-xs font-semibold text-[hsl(var(--builder-brand))] shrink-0">9 products</span>
          </div>
        </Card>

        {/* SECTION 2 — Introduction */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything in Brand Products is designed to do one thing: <span className="font-semibold text-[hsl(var(--builder-brand))]">turn your book into a recognisable brand that sells while you sleep</span>. These 9 products fall into two groups, and the order matters.
          </p>
        </div>

        {/* Paywall banner for free users */}
        {!isTierUnlocked && (
          <Card className="p-5 mb-6 border-secondary/30 bg-secondary/5">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold mb-1">Upgrade to unlock Brand Products</p>
                <p className="text-xs text-muted-foreground mb-3">Subscribe to the Brand Package to start building your 9 revenue streams.</p>
                <Button size="sm" onClick={() => navigate("/pricing")}>View Plans <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        )}

        {/* SECTION 3 — ABBY Welcome */}
        {liveCount === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-3">
                Hi {authorName || "there"}! I've prepared 9 ways to turn your book into a business. Start with your <strong>Website</strong> — it's the foundation everything else builds on. Then move to <strong>Email Marketing</strong> and <strong>Lead Magnets</strong>. Ready?
              </p>
              <Button size="sm" onClick={() => navigate("/node-builder/BP-04")}>
                Start with Your Website <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 4 — BRANDING & MARKETING */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 rounded-full bg-[hsl(var(--builder-brand))]" />
            <h2 className="font-heading text-sm font-black uppercase tracking-wider text-[hsl(var(--builder-brand))]">Branding & Marketing</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 ml-4">
            Start here. Before you sell anything, people need to find you, trust you, and hear from you consistently. These six products build your author platform, the foundation that makes everything else work.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingNodes.map(renderNodeCard)}
          </div>
        </div>

        {/* SECTION 5 — DIGITAL PRODUCTS */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 rounded-full bg-[hsl(var(--builder-brand))]" />
            <h2 className="font-heading text-sm font-black uppercase tracking-wider text-[hsl(var(--builder-brand))]">Digital Products</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-1 ml-4">
            Once your branding and marketing engine is running, these three products give your audience more ways to buy from you at higher price points.
          </p>
          <p className="text-xs text-muted-foreground mb-4 ml-4">
            Why this order? Workbooks are the lowest lift because you're repurposing what you already wrote. Home Study Courses require more structure but command higher prices. Special Editions only make sense once you've proven demand and have a reader base.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {digitalNodes.map(renderNodeCard)}
          </div>
        </div>

        {/* SECTION 6 — Estimated Revenue */}
        <Card className="rounded-xl border-2 border-[hsl(var(--builder-brand)/0.3)] bg-[var(--gradient-brand-intro)] p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="h-5 w-5 text-[hsl(var(--builder-brand))]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--builder-brand))]">Estimated Revenue</span>
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-black text-[hsl(var(--builder-brand))]">$5,520 – $15,480 <span className="text-base">↑</span></p>
        </Card>

        {/* SECTION 7 — ABBY Tip */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Tip:</span> You don't have to build all 9 at once. Abby recommends starting with products 1–3 (Website, Book Sales, Lead Magnets) and adding the rest as your audience grows.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Analyse plans with Abby to get personalised recommendations and revenue estimates for each product.</p>
        </div>
      </div>
    </div>
  );
}
