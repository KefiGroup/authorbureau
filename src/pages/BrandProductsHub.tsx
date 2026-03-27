import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, Lock, AlertCircle, CheckCircle2, Zap, Clock, Eye, Star, Globe, ExternalLink } from "lucide-react";

const NODE_DESCRIPTIONS: Record<string, string> = {
  "BP-01": "Builds your list — foundation for all revenue",
  "BP-02": "Free gift that grows your subscriber list",
  "BP-03": "90-day content calendar, automated",
  "BP-04": "Your author home on the web",
  "BP-05": "Live events that convert readers to buyers",
  "BP-06": "$27–$47 per sale",
  "BP-07": "$97–$197 per sale",
  "BP-08": "$47–$97 per bundle",
  "BP-09": "Direct + Amazon",
};

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

type NodeStatus = "locked" | "not_started" | "building" | "content_ready" | "live" | "error";

interface NodeCard {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: NodeStatus;
  microsite_url: string | null;
  current_step: number;
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  locked:        { label: "Locked",            color: "bg-muted text-muted-foreground",                    icon: Lock },
  not_started:   { label: "Ready to Build",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Zap },
  building:      { label: "In Progress",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  content_ready: { label: "Ready to Publish",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Eye },
  live:          { label: "Live ✓",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  error:         { label: "Needs Attention",   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
};

export default function BrandProductsHub() {
  const { user, loading: authLoading, tier } = useAuth();
  const isTierUnlocked = hasTierAccess(tier, "starter");
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, pen_name, user_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus, microsite_url: null, current_step: 1 })));
        setLoading(false);
        return;
      }

      setAuthorName(profile.pen_name || "");

      const { data: nodeRows } = await supabase
        .from("author_nodes")
        .select("node_id, node_name, personalised_name, status, microsite_url, current_step")
        .eq("author_id", profile.id)
        .like("node_id", "BP-%")
        .order("node_id");

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus, microsite_url: null, current_step: 1 })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id,
          node_name: r.node_name,
          personalised_name: r.personalised_name,
          status: r.status as NodeStatus,
          microsite_url: r.microsite_url || null,
          current_step: (r as any).current_step || 1,
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
          <Skeleton className="h-2 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const liveCount = nodes.filter(n => n.status === "live").length;
  const progressPercent = (liveCount / 9) * 100;
  const showAbbyWelcome = liveCount === 0;
  const bp04Node = nodes.find(n => n.node_id === "BP-04");
  const bp04IsLive = bp04Node?.status === "live";
  const micrositeNodes = new Set(["BP-02", "BP-05", "BP-06", "BP-07", "BP-08", "BP-09"]);

  const handleCardClick = (node: NodeCard) => {
    if (node.status === "locked") {
      toast({ title: "Locked", description: "Upgrade your plan to unlock this node." });
      return;
    }
    navigate(`/node-builder/${node.node_id}`);
  };

  const ctaForStatus = (status: NodeStatus) => {
    switch (status) {
      case "not_started":    return { text: "Start Building",     variant: "default" as const };
      case "building":       return { text: "Continue Building",  variant: "default" as const };
      case "content_ready":  return { text: "Review & Publish",   variant: "default" as const };
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
            Your Brand Products
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-4">
            ABBY has prepared 9 revenue streams for your book. Activate them one by one.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{liveCount} of 9 live</span>
            <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
          </div>
        </div>

        {/* BP-04 Prerequisite Banner */}
        {!bp04IsLive && (
          <Card className="p-4 sm:p-5 mb-6 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Build your author website first
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  Your website is the home for everything you create. Start here to give all your pages a home.
                </p>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => navigate("/node-builder/BP-04")}
                >
                  Build Your Website <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ABBY Welcome */}
        {showAbbyWelcome && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-3">
                Hi {authorName || "there"}! I've prepared 9 ways to turn your book into a business.
                Start with your <strong>Website</strong> — it's the foundation everything else builds on. Then move to <strong>Email Marketing</strong> and <strong>Lead Magnets</strong>. Ready?
              </p>
              <Button size="sm" onClick={() => navigate("/node-builder/BP-04")}>
                Start with Your Website <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Node Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const statusCfg = STATUS_CONFIG[node.status];
            const cta = ctaForStatus(node.status);
            const StatusIcon = statusCfg.icon;
            const isBP04 = node.node_id === "BP-04";
            const needsWebsiteWarning = !bp04IsLive && micrositeNodes.has(node.node_id) && node.status !== "live";

            return (
              <div
                key={node.node_id}
                className={`relative rounded-xl border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${isBP04 && !bp04IsLive ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800" : "border-border"}`}
              >
                {/* Start Here badge for BP-04 */}
                {isBP04 && !bp04IsLive && (
                  <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-3 py-0.5 text-[11px] font-bold shadow-sm">
                    <Star className="h-3 w-3" /> Start Here
                  </span>
                )}

                {/* Node ID badge */}
                <span className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground/50">
                  {node.node_id}
                </span>

                {/* Name */}
                <h3 className="font-heading text-base font-semibold text-foreground pr-12 leading-tight">
                  {node.personalised_name || node.node_name}
                </h3>

                {/* Status badge */}
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Description / Revenue estimate */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {NODE_DESCRIPTIONS[node.node_id]}
                </p>

                {/* Live URL */}
                {node.status === "live" && node.microsite_url && (
                  <a
                    href={node.microsite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary flex items-center gap-1 hover:underline truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {node.microsite_url.replace("https://", "")}
                  </a>
                )}

                {/* Soft warning if BP-04 not live and this node needs a microsite */}
                {needsWebsiteWarning && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Globe className="h-3 w-3 shrink-0" />
                    Build your website first to give this page a home.
                  </p>
                )}

                {/* CTA */}
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
