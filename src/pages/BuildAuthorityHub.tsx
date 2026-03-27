import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Lock, AlertCircle, CheckCircle2, Zap, Clock, Eye } from "lucide-react";

const NODE_DESCRIPTIONS: Record<string, string> = {
  "BA-10": "Turn your book into a structured online course on your course platform",
  "BA-11": "Convert your book to audio and distribute to Audible, Spotify, Apple Books",
  "BA-12": "Create a recurring revenue membership community",
  "BA-13": "Run cohort-based group coaching programmes",
  "BA-14": "Launch your podcast and distribute to all major platforms",
  "BA-15": "Build your media profile and speaking opportunities",
  "BA-16": "Recruit affiliates to sell your products for you",
  "BA-17": "Create product bundles and upsell sequences",
  "BA-18": "Build joint venture partnerships with complementary authors",
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

type NodeStatus = "locked" | "not_started" | "building" | "content_ready" | "live" | "error";

interface NodeCard {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: NodeStatus;
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  locked:        { label: "Locked",            color: "bg-muted text-muted-foreground",                    icon: Lock },
  not_started:   { label: "Ready to Build",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Zap },
  building:      { label: "Building...",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  content_ready: { label: "Ready to Activate", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Eye },
  live:          { label: "Live ✓",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  error:         { label: "Needs Attention",   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
};

export default function BuildAuthorityHub() {
  const { user, loading: authLoading, tier } = useAuth();
  const isTierUnlocked = hasTierAccess(tier, "pro");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [bpLiveCount, setBpLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const SUBSCRIBER_THRESHOLD = 1000;
  const isUnlocked = devUnlock || subscriberCount >= SUBSCRIBER_THRESHOLD;

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, pen_name, ghl_sub_account_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: "locked" as NodeStatus })));
        setLoading(false);
        return;
      }

      setAuthorName(profile.pen_name || "");

      // Count subscribers
      const { count: subCount } = await supabase
        .from("author_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("author_id", profile.id)
        .eq("status", "active");
      setSubscriberCount(subCount || 0);

      // Count live BP nodes
      const { data: bpNodes } = await supabase
        .from("author_nodes")
        .select("status")
        .eq("author_id", profile.id)
        .like("node_id", "BP-%");
      const bpLive = bpNodes?.filter(n => n.status === "live").length || 0;
      setBpLiveCount(bpLive);

      // Get BA nodes
      const { data: nodeRows } = await supabase
        .from("author_nodes")
        .select("node_id, node_name, personalised_name, status")
        .eq("author_id", profile.id)
        .like("node_id", "BA-%")
        .order("node_id");

      const unlocked = devUnlock || (subCount || 0) >= SUBSCRIBER_THRESHOLD;

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({
          ...n,
          personalised_name: null,
          status: unlocked ? (n.status as NodeStatus) : ("locked" as NodeStatus),
        })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id,
          node_name: r.node_name,
          personalised_name: r.personalised_name,
          status: unlocked || r.status === "live" || r.status === "content_ready" || r.status === "building"
            ? (r.status as NodeStatus)
            : ("locked" as NodeStatus),
        })));
      }
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading, devUnlock]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Loading Build Authority...</div>
      </div>
    );
  }

  if (!user) { navigate("/auth"); return null; }

  const liveCount = nodes.filter(n => n.status === "live").length;
  const progressPercent = (liveCount / 9) * 100;
  const subscriberProgress = Math.min((subscriberCount / SUBSCRIBER_THRESHOLD) * 100, 100);
  const showAbbyWelcome = liveCount === 0;

  const handleCardClick = (node: NodeCard) => {
    if (node.status === "locked") {
      toast({ title: "Building Towards Unlock", description: `You need ${SUBSCRIBER_THRESHOLD - subscriberCount} more subscribers to unlock Build Authority. Keep growing!` });
      return;
    }
    navigate(`/node-builder/${node.node_id}`);
  };

  const ctaForStatus = (status: NodeStatus) => {
    switch (status) {
      case "not_started":    return { text: "Start Building",     variant: "default" as const };
      case "building":       return { text: "Continue",           variant: "default" as const };
      case "content_ready":  return { text: "Review & Activate",  variant: "default" as const };
      case "live":           return { text: "View Details",       variant: "outline" as const };
      case "locked":         return { text: "Unlock",             variant: "secondary" as const };
      case "error":          return { text: "Fix Issue",          variant: "destructive" as const };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Build Authority
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-4">
            Scale your audience, create recurring revenue, and establish your authority with 9 powerful nodes.
          </p>

          {/* Subscriber Progress Bar */}
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {subscriberCount.toLocaleString()} of {SUBSCRIBER_THRESHOLD.toLocaleString()} subscribers
              </span>
              <span className="text-xs text-muted-foreground">
                {isUnlocked ? "Unlocked!" : `${SUBSCRIBER_THRESHOLD - subscriberCount} to go`}
              </span>
            </div>
            <Progress value={subscriberProgress} className="h-2.5 mb-2" />
            <p className="text-xs text-muted-foreground">
              {isUnlocked
                ? "🚀 Build Authority is unlocked! Time to scale."
                : bpLiveCount >= 9
                ? "🎉 You're building momentum! Keep growing your audience to unlock Build Authority."
                : "Complete your Brand Products and grow your subscriber list to unlock these nodes."}
            </p>
          </div>

          {/* Node Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{liveCount} of 9 live</span>
            <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
          </div>
        </div>

        {/* ABBY Welcome */}
        {showAbbyWelcome && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {isUnlocked
                  ? `Hi ${authorName || "there"}! Build Authority is unlocked — time to scale your expertise. Start with an Online Course — it's the most impactful way to monetise your knowledge at scale.`
                  : `Hi ${authorName || "there"}! Build Authority unlocks at ${SUBSCRIBER_THRESHOLD.toLocaleString()} email subscribers. Keep growing your audience with your Brand Products, and you'll unlock these powerful scaling tools soon!`}
              </p>
              {isUnlocked && (
                <Button size="sm" onClick={() => navigate("/node-builder/BA-10")}>
                  Start with Online Course <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Node Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const statusCfg = STATUS_CONFIG[node.status];
            const cta = ctaForStatus(node.status);
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={node.node_id}
                className="relative rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <span className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground/50">
                  {node.node_id}
                </span>
                <h3 className="font-heading text-base font-semibold text-foreground pr-12 leading-tight">
                  {node.personalised_name || node.node_name}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {NODE_DESCRIPTIONS[node.node_id]}
                </p>
                <div className="mt-auto pt-1">
                  <Button
                    size="sm"
                    variant={cta.variant}
                    className="w-full text-xs"
                    disabled={node.status === "locked"}
                    onClick={() => handleCardClick(node)}
                  >
                    {cta.text}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
