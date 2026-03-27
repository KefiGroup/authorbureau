import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Lock, AlertCircle, CheckCircle2, Zap, Clock, Eye, Star, Globe } from "lucide-react";

const NODE_DESCRIPTIONS: Record<string, string> = {
  "BP-01": "Build your email list and send campaigns to your readers",
  "BP-02": "Create free resources that attract new subscribers",
  "BP-03": "Schedule and publish content across all social platforms",
  "BP-04": "Your author website and book landing page",
  "BP-05": "Host live webinars to teach and convert your audience",
  "BP-06": "Sell a companion workbook to your book",
  "BP-07": "Turn your book into a self-paced online course",
  "BP-08": "Bundle your book with bonuses for a premium edition",
  "BP-09": "Sell your book directly and through Amazon",
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
}

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  locked:        { label: "Locked",            color: "bg-muted text-muted-foreground",                    icon: Lock },
  not_started:   { label: "Ready to Build",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Zap },
  building:      { label: "Building...",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  content_ready: { label: "Ready to Activate", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Eye },
  live:          { label: "Live ✓",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  error:         { label: "Needs Attention",   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
};

export default function BrandProductsHub() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      // Get author profile
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, pen_name, user_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus })));
        setLoading(false);
        return;
      }

      setAuthorName(profile.pen_name || "");

      // Get BP nodes
      const { data: nodeRows } = await supabase
        .from("author_nodes")
        .select("node_id, node_name, personalised_name, status")
        .eq("author_id", profile.id)
        .like("node_id", "BP-%")
        .order("node_id");

      if (!nodeRows || nodeRows.length === 0) {
        setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: n.status as NodeStatus })));
      } else {
        setNodes(nodeRows.map(r => ({
          node_id: r.node_id,
          node_name: r.node_name,
          personalised_name: r.personalised_name,
          status: r.status as NodeStatus,
        })));
      }
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Loading your products...</div>
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

        {/* ABBY Welcome */}
        {showAbbyWelcome && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-3">
                Hi {authorName || "there"}! I've prepared 9 ways to turn your book into a business.
                Start with Email Marketing — it's the foundation everything else builds on. Ready?
              </p>
              <Button size="sm" onClick={() => navigate("/node-builder/BP-01")}>
                Start with Email Marketing <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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

            return (
              <div
                key={node.node_id}
                className="relative rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
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

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {NODE_DESCRIPTIONS[node.node_id]}
                </p>

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
