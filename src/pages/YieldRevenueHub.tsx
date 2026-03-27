import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Lock, AlertCircle, CheckCircle2, Zap, Clock, Eye, TrendingUp } from "lucide-react";

const NODE_DESCRIPTIONS: Record<string, string> = {
  "YR-19": "Offer premium personalised coaching packages",
  "YR-20": "Create high-value transformation packages",
  "YR-21": "Build your speaking business and fee schedule",
  "YR-22": "Deliver your expertise to organisations",
  "YR-23": "Run an exclusive high-ticket mastermind group",
  "YR-24": "Host immersive in-person retreat experiences",
  "YR-25": "Train and certify practitioners in your method",
  "YR-26": "Organise your own conference or summit",
  "YR-27": "Run campaigns for causes aligned with your mission",
  "YR-28": "Attract sponsors and exhibitors to your events",
};

const FALLBACK_NODES = [
  { node_id: "YR-19", node_name: "1-on-1 Coaching", status: "not_started" },
  { node_id: "YR-20", node_name: "Big Ticket Offers", status: "not_started" },
  { node_id: "YR-21", node_name: "Keynote Speaking", status: "not_started" },
  { node_id: "YR-22", node_name: "Corporate Training", status: "not_started" },
  { node_id: "YR-23", node_name: "Mastermind", status: "not_started" },
  { node_id: "YR-24", node_name: "Retreats", status: "not_started" },
  { node_id: "YR-25", node_name: "Certification Program", status: "not_started" },
  { node_id: "YR-26", node_name: "Conferences", status: "not_started" },
  { node_id: "YR-27", node_name: "Fundraising", status: "not_started" },
  { node_id: "YR-28", node_name: "Exhibitors & Sponsors", status: "not_started" },
];

type NodeStatus = "locked" | "not_started" | "building" | "content_ready" | "live" | "error";

interface NodeCard { node_id: string; node_name: string; personalised_name: string | null; status: NodeStatus; }

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  locked:        { label: "Locked",            color: "bg-muted text-muted-foreground",                    icon: Lock },
  not_started:   { label: "Ready to Build",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Zap },
  building:      { label: "Building...",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  content_ready: { label: "Ready to Activate", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Eye },
  live:          { label: "Live ✓",            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  error:         { label: "Needs Attention",   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
};

export default function YieldRevenueHub() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devUnlock = searchParams.get("unlock") === "true";
  const [nodes, setNodes] = useState<NodeCard[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const SUBSCRIBER_THRESHOLD = 5000;
  const isUnlocked = devUnlock || subscriberCount >= SUBSCRIBER_THRESHOLD;

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: profile } = await supabase.from("author_profiles").select("id, pen_name").eq("user_id", user.id).maybeSingle();
      if (!profile) { setNodes(FALLBACK_NODES.map(n => ({ ...n, personalised_name: null, status: "locked" as NodeStatus }))); setLoading(false); return; }
      setAuthorName(profile.pen_name || "");

      const { count: subCount } = await supabase.from("author_subscribers").select("*", { count: "exact", head: true }).eq("author_id", profile.id).eq("status", "active");
      setSubscriberCount(subCount || 0);

      const { data: nodeRows } = await supabase.from("author_nodes").select("node_id, node_name, personalised_name, status").eq("author_id", profile.id).like("node_id", "YR-%").order("node_id");
      const unlocked = devUnlock || (subCount || 0) >= SUBSCRIBER_THRESHOLD;

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
  }, [user, authLoading, devUnlock]);

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-pulse text-muted-foreground">Loading Yield Revenue...</div></div>;
  if (!user) { navigate("/auth"); return null; }

  const liveCount = nodes.filter(n => n.status === "live").length;
  const progressPercent = (liveCount / 10) * 100;
  const subscriberProgress = Math.min((subscriberCount / SUBSCRIBER_THRESHOLD) * 100, 100);

  const handleCardClick = (node: NodeCard) => {
    if (node.status === "locked") { toast({ title: "Building Towards Unlock", description: `You need ${SUBSCRIBER_THRESHOLD - subscriberCount} more subscribers to unlock Yield Revenue.` }); return; }
    navigate(`/node-builder/${node.node_id}`);
  };

  const ctaForStatus = (status: NodeStatus) => {
    switch (status) {
      case "not_started":    return { text: "Start Building", variant: "default" as const };
      case "building":       return { text: "Continue", variant: "default" as const };
      case "content_ready":  return { text: "Review & Activate", variant: "default" as const };
      case "live":           return { text: "View Details", variant: "outline" as const };
      case "locked":         return { text: "Unlock", variant: "secondary" as const };
      case "error":          return { text: "Fix Issue", variant: "destructive" as const };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">Yield Revenue</h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-4">Premium high-ticket services — the pinnacle of your author business.</p>

          {/* Revenue Banner */}
          <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-5 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <TrendingUp className="h-6 w-6 text-amber-600" />
              <span className="text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-300">$68,400 – $215,520 <span className="text-base font-normal">per year</span></span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">Unlock the full Yield Revenue suite to reach your maximum earning potential</p>
          </div>

          {/* Subscriber Progress */}
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{subscriberCount.toLocaleString()} of {SUBSCRIBER_THRESHOLD.toLocaleString()} subscribers</span>
              <span className="text-xs text-muted-foreground">{isUnlocked ? "Unlocked!" : `${(SUBSCRIBER_THRESHOLD - subscriberCount).toLocaleString()} to go`}</span>
            </div>
            <Progress value={subscriberProgress} className="h-2.5 mb-2" />
            <p className="text-xs text-muted-foreground">{isUnlocked ? "🚀 Yield Revenue is unlocked! Time to earn big." : "Keep growing your audience to unlock these premium revenue nodes."}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{liveCount} of 10 live</span>
            <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
          </div>
        </div>

        {liveCount === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {isUnlocked
                  ? `Hi ${authorName || "there"}! Yield Revenue is unlocked — these are the highest-value offers in your portfolio. Start with 1-on-1 Coaching to create your first premium package.`
                  : `Hi ${authorName || "there"}! Yield Revenue unlocks at ${SUBSCRIBER_THRESHOLD.toLocaleString()} subscribers. These are the premium, high-ticket offers that generate the most revenue per client. Keep building your authority!`}
              </p>
              {isUnlocked && <Button size="sm" onClick={() => navigate("/node-builder/YR-19")}>Start with 1-on-1 Coaching <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const statusCfg = STATUS_CONFIG[node.status];
            const cta = ctaForStatus(node.status);
            const StatusIcon = statusCfg.icon;
            return (
              <div key={node.node_id} className="relative rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <span className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground/50">{node.node_id}</span>
                <h3 className="font-heading text-base font-semibold text-foreground pr-12 leading-tight">{node.personalised_name || node.node_name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.color}`}><StatusIcon className="h-3 w-3" />{statusCfg.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{NODE_DESCRIPTIONS[node.node_id]}</p>
                <div className="mt-auto pt-1"><Button size="sm" variant={cta.variant} className="w-full text-xs" disabled={node.status === "locked"} onClick={() => handleCardClick(node)}>{cta.text}</Button></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
