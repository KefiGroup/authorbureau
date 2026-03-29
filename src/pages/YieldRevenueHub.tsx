import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Lock, Star, Clock } from "lucide-react";

type NodeStatus = "locked" | "not_started" | "building" | "content_ready" | "live" | "error";

interface NodeCard {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: NodeStatus;
}

interface NodeDef {
  id: string;
  name: string;
  description: string;
  revenue: string;
  time: string;
  difficulty: number;
}

const YR_NODES: NodeDef[] = [
  { id: "YR-19", name: "Coaching", description: "One-on-one coaching for the readers who want your direct attention. The most personal, highest-priced service you can offer. Typically $297–$4,997 per package.", revenue: "$9,600/yr estimated", time: "~2 hours", difficulty: 2 },
  { id: "YR-20", name: "Consulting", description: "Advisory services for companies, organisations, and individuals who want to implement your book's framework in their business. Typically $250–$500/hour.", revenue: "$25,000/yr estimated", time: "~4 hours", difficulty: 5 },
  { id: "YR-21", name: "Keynotes", description: "Speaking fees for your expertise at conferences, corporate events, and summits. Your book is your calling card. Typically $2,500–$50,000 per event.", revenue: "$8,000/yr estimated", time: "~1 hour", difficulty: 2 },
  { id: "YR-22", name: "Training Programs", description: "Corporate or professional training programmes built from your book's framework. Teach your year's worth of knowledge in a day. Typically $5,000–$20,000 per day.", revenue: "$9,600/yr estimated", time: "~4 hours", difficulty: 3 },
  { id: "YR-23", name: "Masterminds", description: "Curate a small group of high-performers who pay a premium to be in the room together. You facilitate; they transform each other. Typically $5,000–$15,000/year per member.", revenue: "$42,000/yr estimated", time: "~2 hours", difficulty: 4 },
  { id: "YR-24", name: "Retreats & Bootcamps", description: "Immersive multi-day experiences that deliver transformation at a premium price. Retreats create the deepest client relationships and the highest testimonials.", revenue: "$18,000/yr estimated", time: "~4 hours", difficulty: 5 },
  { id: "YR-25", name: "Certification", description: "Certify others to teach your methodology. Creates a network of practitioners, generates licensing revenue, and multiplies your impact exponentially.", revenue: "$9,600/yr estimated", time: "~4 hours", difficulty: 5 },
  { id: "YR-26", name: "Conventions / Conferences", description: "Host your own event. Sell tickets, attract sponsors, and position yourself as the convener of your industry's most important conversation.", revenue: "$30,000/yr estimated", time: "~4 hours", difficulty: 5 },
  { id: "YR-27", name: "Fund Raising", description: "Raise money for causes aligned with your book's mission. Builds deep community loyalty, media attention, and positions you as a leader beyond business.", revenue: "Varies", time: "~1 hour", difficulty: 2 },
  { id: "YR-28", name: "Exhibitors / IV", description: "Create exhibition opportunities at your events, allowing sponsors and vendors to reach your audience. Turns your events into a marketplace.", revenue: "Varies", time: "~1 hour", difficulty: 2 },
];

const FALLBACK_NODES = [
  { node_id: "YR-19", node_name: "Coaching", status: "not_started" },
  { node_id: "YR-20", node_name: "Consulting", status: "not_started" },
  { node_id: "YR-21", node_name: "Keynotes", status: "not_started" },
  { node_id: "YR-22", node_name: "Training Programs", status: "not_started" },
  { node_id: "YR-23", node_name: "Masterminds", status: "not_started" },
  { node_id: "YR-24", node_name: "Retreats & Bootcamps", status: "not_started" },
  { node_id: "YR-25", node_name: "Certification", status: "not_started" },
  { node_id: "YR-26", node_name: "Conventions / Conferences", status: "not_started" },
  { node_id: "YR-27", node_name: "Fund Raising", status: "not_started" },
  { node_id: "YR-28", node_name: "Exhibitors / IV", status: "not_started" },
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

export default function YieldRevenueHub() {
  const { user, loading: authLoading, tier } = useAuth();
  const isTierUnlocked = hasTierAccess(tier, "yield");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("id, pen_name").eq("user_id", user.id).maybeSingle();
      if (!profile) { setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: "locked" as NodeStatus }))); setLoading(false); return; }
      setAuthorName(profile.pen_name || "");

      const { data: nodeRows } = await supabase.from("author_nodes").select("node_id, node_name, personalised_name, status").eq("author_id", profile.id).like("node_id", "YR-%").order("node_id");
      const unlocked = isTierUnlocked || devUnlock;

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: unlocked ? (n.status as NodeStatus) : ("locked" as NodeStatus) })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id, node_name: r.node_name, personalised_name: r.personalised_name,
          status: unlocked || r.status === "live" || r.status === "content_ready" || r.status === "building" ? (r.status as NodeStatus) : ("locked" as NodeStatus),
        })));
      }
      setLoading(false);
    })();
  }, [user, authLoading, devUnlock, isTierUnlocked]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-pulse text-muted-foreground">Loading Yield Revenue...</div></div>;
  if (!user) { navigate("/auth"); return null; }

  const getNodeStatus = (nodeId: string): NodeStatus => {
    const node = nodes.find(n => n.node_id === nodeId);
    return node?.status || "locked";
  };

  const handleCardClick = (nodeId: string) => {
    if (!isTierUnlocked && !devUnlock) { navigate("/pricing"); return; }
    navigate(`/node-builder/${nodeId}`);
  };

  const renderNodeCard = (def: NodeDef) => {
    const status = getNodeStatus(def.id);
    const isLocked = status === "locked";
    return (
      <div key={def.id} className="rounded-2xl border border-border bg-[hsl(var(--card))] p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <h3 className="font-heading text-base font-bold text-foreground">{def.name}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isLocked ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
            {isLocked ? <><Lock className="h-3 w-3" /> Locked</> : status === "live" ? "Live ✓" : "Ready to Build"}
          </span>
        </div>
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
          variant={isLocked ? "secondary" : "default"}
          className="w-full text-xs mt-1"
          onClick={() => handleCardClick(def.id)}
        >
          {isLocked ? "Upgrade to Enterprise →" : "Build This Product →"}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/dashboard">← Back to Dashboard</Link>
        </Button>

        {/* SECTION 1 — Header Card */}
        <Card className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-black text-foreground">Premium Services. Premium Revenue. Built From Your Authority.</h1>
                <p className="text-sm text-muted-foreground mt-1">Premium Services (10 nodes)</p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0">10 products</span>
          </div>
        </Card>

        {/* SECTION 2 — Introduction */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything in Yield Revenue is designed to do one thing: <span className="font-semibold text-amber-600 dark:text-amber-400">convert your established authority into high-ticket income</span>. Unlike Brand Products and Build Authority, these 10 services don't require a strict sequence. You can pursue multiple streams simultaneously once you have the credibility to back them up.
          </p>
        </div>

        {/* SECTION 3 — Why These Work Together */}
        <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-5 mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">Why These Work Together (Not in Sequence)</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Unlike Brand Products (which build on each other) or Build Authority (which amplify your reach), Yield Revenue services all draw from the same well: your established authority and audience. You don't need to do coaching before consulting, or Retreats before a Mastermind. Instead, you pursue the services that align with:<br/>
            <strong>Your strengths:</strong> What do you enjoy most?<br/>
            <strong>Your audience:</strong> What will they pay for?<br/>
            <strong>Market demand:</strong> What opportunities are knocking on your door?
          </p>
        </div>

        {/* SECTION 4 — The Full Journey */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">The Full Journey</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Brand Products</strong> built your foundation and audience. <strong>Build Authority</strong> scaled your reach and credibility. <strong>Yield Revenue</strong> is where you monetise your expertise at the highest level, with premium pricing, selective clients, and maximum impact.
          </p>
        </div>

        {/* Paywall banner */}
        {!isTierUnlocked && !devUnlock && (
          <Card className="p-5 mb-6 border-secondary/30 bg-secondary/5">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold mb-1">Upgrade to unlock Yield Revenue</p>
                <p className="text-xs text-muted-foreground mb-3">Subscribe to the Yield Package for all 28 revenue streams.</p>
                <Button size="sm" onClick={() => navigate("/pricing")}>View Plans <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        )}

        {/* SECTION 5 — All 10 node cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {YR_NODES.map(renderNodeCard)}
        </div>

        {/* SECTION 6 — Estimated Revenue */}
        <Card className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Estimated Revenue</span>
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300">$68,400 – $215,520 <span className="text-base">↑</span></p>
        </Card>

        {/* SECTION 7 — Tip */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Tip:</span> You don't need to pursue all 10 services. Abby recommends choosing 2–3 services that align with your strengths and audience needs, then mastering those before expanding. Quality over quantity.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Analyse plans with Abby to get personalised recommendations and revenue estimates for each product.</p>
        </div>
      </div>
    </div>
  );
}
