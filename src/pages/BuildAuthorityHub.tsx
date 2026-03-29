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
  section: "scale" | "reach" | "monetise";
}

const BA_NODES: NodeDef[] = [
  { id: "BA-10", name: "Online Course", description: "Your most scalable asset. Teach your book's methodology in a structured, self-paced format. Students complete at their own pace; you earn while you sleep.", revenue: "$6,000/yr estimated", time: "~4 hours", difficulty: 3, section: "scale" },
  { id: "BA-11", name: "Audiobook", description: "Reach commuters, multitaskers, gym-goers, and people who prefer listening. Your book, your voice, your story — distributed to Audible, Spotify, and Apple Books.", revenue: "$1,200/yr estimated", time: "~4 hours", difficulty: 3, section: "scale" },
  { id: "BA-12", name: "Memberships", description: "Recurring monthly income from your most engaged readers. Give members exclusive content, live Q&As, and community access. Predictable revenue that grows with your audience.", revenue: "$6,000/yr estimated", time: "~4 hours", difficulty: 3, section: "scale" },
  { id: "BA-13", name: "Group Coaching", description: "Bring paying readers together to implement your book's framework as a group. More scalable than 1-on-1, more personal than a course. Community accelerates results.", revenue: "$9,600/yr estimated", time: "~2 hours", difficulty: 3, section: "reach" },
  { id: "BA-14", name: "Podcast", description: "Distribute your expertise in audio form to new audiences who have never heard of you. Your podcast becomes a discovery engine for every other product.", revenue: "Audience growth", time: "~2 hours", difficulty: 3, section: "reach" },
  { id: "BA-15", name: "Media Outreach", description: "Systematically, almost invisibly, present your content to new audiences through media channels, podcasts, and social media. Now amplify your visibility.", revenue: "$8,340/yr estimated", time: "~1 hour", difficulty: 3, section: "reach" },
  { id: "BA-16", name: "Affiliates", description: "Recommend products you already use and trust. Every recommendation becomes a revenue stream. No product creation required.", revenue: "$6,000/yr estimated", time: "~1 hour", difficulty: 3, section: "monetise" },
  { id: "BA-17", name: "Upsells / Downsells", description: "Combine your products into bundles, packages, and sequences that maximise the value of every customer. Customers who buy bundles spend 3x more on average.", revenue: "$12,000/yr estimated", time: "~2 hours", difficulty: 3, section: "monetise" },
  { id: "BA-18", name: "Revenue Sharing", description: "No money having because sharing is caring. Revenue sharing is the ultimate form of partnership — you share revenue with partners who bring you clients.", revenue: "$8,340/yr estimated", time: "~1 hour", difficulty: 3, section: "monetise" },
];

const SECTION_META: Record<string, { heading: string; description: string; subdesc: string }> = {
  scale: {
    heading: "SCALE YOUR CONTENT",
    description: "Repurpose what you've already created. Your book and brand products contain valuable knowledge. Now put that knowledge into formats that reach new audiences and command higher prices.",
    subdesc: "Why this order? Online Courses are the foundation. They prove your teaching ability and establish you as an authority. Audiobooks extend reach without additional content creation. Memberships monetise the author's desire for ongoing access and community.",
  },
  reach: {
    heading: "GROW YOUR REACH",
    description: "Get in front of new audiences through live interaction and media channels. Your content and authority are established. Now amplify your visibility.",
    subdesc: "Why this order? Group Coaching gives you real-time connection to real people. It's the credibility builder. Podcast then amplifies that credibility to new audiences. Media Outreach takes it to the mainstream level where you become a recognised authority in your field.",
  },
  monetise: {
    heading: "MONETISE YOUR NETWORK",
    description: "Use your established audience and authority to create passive income and partnership revenue. You've built the platform; now leverage it.",
    subdesc: "Why this order? Affiliates are the easiest because you're recommending existing products. Upsells require understanding your audience's buying psychology and funnel optimisation. Revenue Sharing requires established authority and audience size to attract ideal partners.",
  },
};

const FALLBACK_NODES = [
  { node_id: "BA-10", node_name: "Online Course", status: "not_started" },
  { node_id: "BA-11", node_name: "Audiobook", status: "not_started" },
  { node_id: "BA-12", node_name: "Membership Site", status: "not_started" },
  { node_id: "BA-13", node_name: "Group Coaching", status: "not_started" },
  { node_id: "BA-14", node_name: "Podcast", status: "not_started" },
  { node_id: "BA-15", node_name: "Media & PR", status: "not_started" },
  { node_id: "BA-16", node_name: "Affiliate Programme", status: "not_started" },
  { node_id: "BA-17", node_name: "Upsells & Bundles", status: "not_started" },
  { node_id: "BA-18", node_name: "JV Partnerships", status: "not_started" },
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

export default function BuildAuthorityHub() {
  const { user, loading: authLoading, tier } = useAuth();
  const isTierUnlocked = hasTierAccess(tier, "build");
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

      const { data: nodeRows } = await supabase.from("author_nodes").select("node_id, node_name, personalised_name, status").eq("author_id", profile.id).like("node_id", "BA-%").order("node_id");

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: (isTierUnlocked || devUnlock) ? (n.status as NodeStatus) : ("locked" as NodeStatus) })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id, node_name: r.node_name, personalised_name: r.personalised_name,
          status: (isTierUnlocked || devUnlock) || r.status === "live" || r.status === "content_ready" || r.status === "building" ? (r.status as NodeStatus) : ("locked" as NodeStatus),
        })));
      }
      setLoading(false);
    })();
  }, [user, authLoading, devUnlock, isTierUnlocked]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-pulse text-muted-foreground">Loading Build Authority...</div></div>;
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
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${isLocked ? "bg-muted text-muted-foreground" : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"}`}>
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
          {isLocked ? "Upgrade to Pro →" : "Build This Product →"}
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
        <Card className="rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <h1 className="font-heading text-xl sm:text-2xl font-black text-foreground">Your Audience. Your Authority. Built From Your Brand.</h1>
                <p className="text-sm text-muted-foreground mt-1">Scale Your Audience (9 nodes)</p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 shrink-0">9 products</span>
          </div>
        </Card>

        {/* SECTION 2 — Progression Box */}
        <div className="rounded-xl border-l-4 border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 p-5 mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2">The Build Authority Progression</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Brand Products</strong> build your foundation: website, book sales, email list, audience.<br/>
            <strong>Build Authority</strong> scales that foundation: courses, coaching, media visibility, new partnership models.<br/>
            Everything in Build Authority is designed to do one thing: <span className="font-semibold text-violet-600 dark:text-violet-400">turn your book and brand into recognised expertise that attracts high-value opportunities</span>. These 9 products fall into two groups, and the order matters.
          </p>
        </div>

        {/* Paywall banner */}
        {!isTierUnlocked && !devUnlock && (
          <Card className="p-5 mb-6 border-secondary/30 bg-secondary/5">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold mb-1">Upgrade to unlock Build Authority</p>
                <p className="text-xs text-muted-foreground mb-3">Subscribe to the Build Package to unlock 9 audience-scaling nodes.</p>
                <Button size="sm" onClick={() => navigate("/pricing")}>View Plans <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        )}

        {/* Node sections */}
        {(["scale", "reach", "monetise"] as const).map(section => {
          const meta = SECTION_META[section];
          const sectionNodes = BA_NODES.filter(n => n.section === section);
          return (
            <div key={section} className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-6 rounded-full bg-violet-500" />
                <h2 className="font-heading text-sm font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">{meta.heading}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-1 ml-4">{meta.description}</p>
              <p className="text-xs text-muted-foreground mb-4 ml-4">{meta.subdesc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionNodes.map(renderNodeCard)}
              </div>
            </div>
          );
        })}

        {/* Estimated Revenue */}
        <Card className="rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Estimated Revenue</span>
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-black text-violet-800 dark:text-violet-300">$13,500 – $39,480 <span className="text-base">↑</span></p>
        </Card>

        {/* Tip */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Tip:</span> You don't have to launch all 9 at once. Abby recommends starting with products 1–3 (Online Courses, Audiobook, Memberships) and adding Group 2–3 as your audience grows and your authority solidifies.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Analyse plans with Abby to get personalised recommendations and revenue estimates for each product.</p>
        </div>
      </div>
    </div>
  );
}
