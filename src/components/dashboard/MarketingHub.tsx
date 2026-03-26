import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken } from "@/lib/get-active-token";
import { Loader2, Megaphone, CheckCircle2, AlertCircle, Clock, Zap, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Deployment {
  id: string;
  node_id: string;
  deployment_status: string;
  deployed_at: string | null;
  error_message: string | null;
}

interface NodeConfig {
  id: string;
  label: string;
  description: string;
  phase: "A" | "B";
}

const NODES: NodeConfig[] = [
  // Sub-Phase A — Branding & Marketing
  { id: "website", label: "Website / Microsite", description: "Lead capture form + Author funnel pipeline", phase: "A" },
  { id: "lead-magnets", label: "Lead Magnets", description: "Opt-in form + 3-email delivery + Lead automation", phase: "A" },
  { id: "email-marketing", label: "Email Marketing", description: "Welcome (7) + Nurture (14) + Launch (5) sequences + Automation", phase: "A" },
  { id: "social-media", label: "Social Media", description: "90-day content calendar delivered as daily reminders", phase: "A" },
  { id: "webinars", label: "Webinars", description: "Registration form + Reminder + Follow-up campaigns + Funnel pipeline", phase: "A" },
  // Sub-Phase B — Digital Products
  { id: "workbooks", label: "Workbooks", description: "Email campaign sequence", phase: "B" },
  { id: "home-study", label: "Home Study", description: "Daily drip campaign", phase: "B" },
  { id: "special-editions", label: "Special Editions", description: "Launch email campaign", phase: "B" },
  { id: "book-sales", label: "Book Sales (Events)", description: "Bulk order form + Follow-up campaign", phase: "B" },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  deployed: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  deploying: { label: "Activating…", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Loader2 },
  failed: { label: "Error", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertCircle },
  pending: { label: "Not Started", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  content_ready: { label: "Content Ready", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Zap },
};

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MarketingHub({ onNavigate }: Props) {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingNode, setActivatingNode] = useState<string | null>(null);
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);

  const fetchDeployments = useCallback(async () => {
    if (!user) return;
    try {
      // Get author profile id
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        // Try shared backend
        const { data: sharedProfile } = await sharedSupabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (sharedProfile) setAuthorProfileId(sharedProfile.id);
      } else {
        setAuthorProfileId(profile.id);
      }

      const { data } = await supabase
        .from("ghl_deployments")
        .select("*")
        .eq("author_id", authorProfileId || profile?.id || "");

      setDeployments((data as Deployment[]) || []);
    } catch (err) {
      console.error("Failed to fetch deployments:", err);
    } finally {
      setLoading(false);
    }
  }, [user, authorProfileId]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const getNodeStatus = (nodeId: string) => {
    const dep = deployments.find((d) => d.node_id === nodeId);
    return dep?.deployment_status || "pending";
  };

  const handleActivate = async (nodeId: string) => {
    if (!authorProfileId) {
      toast({ title: "Profile not found", description: "Please set up your author profile first.", variant: "destructive" });
      return;
    }

    setActivatingNode(nodeId);
    try {
      const token = await getActiveToken();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-deploy-campaign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            author_id: authorProfileId,
            node_id: nodeId,
            generated_content: {}, // Content comes from existing generated assets
          }),
        }
      );

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Activation failed");
      }

      toast({ title: "🎉 Campaigns activated!", description: `Your ${NODES.find(n => n.id === nodeId)?.label} campaigns are now running automatically.` });
      await fetchDeployments();
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivatingNode(null);
    }
  };

  const phaseANodes = NODES.filter((n) => n.phase === "A");
  const phaseBNodes = NODES.filter((n) => n.phase === "B");

  const activeCount = deployments.filter((d) => d.deployment_status === "deployed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Your Marketing Hub</h1>
        <p className="text-muted-foreground mt-1">
          Abby manages all your marketing campaigns automatically.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <Megaphone className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {activeCount} of {NODES.length} campaigns active
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(activeCount / NODES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Abby's Guidance */}
      {activeCount < NODES.length && (
        <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Abby says:</span>{" "}
            {activeCount === 0
              ? "I recommend starting with Email Marketing — it's the foundation that connects all your other campaigns. Once your welcome sequence is active, every new contact will automatically receive it."
              : `You have ${NODES.length - activeCount} campaigns ready to activate. Keep going to maximize your reach!`}
          </p>
          {activeCount === 0 && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => handleActivate("email-marketing")}
              disabled={!!activatingNode}
            >
              Activate Email Marketing Now <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Sub-Phase A */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Branding & Marketing
        </h2>
        <div className="space-y-2">
          {phaseANodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              status={getNodeStatus(node.id)}
              activating={activatingNode === node.id}
              onActivate={() => handleActivate(node.id)}
            />
          ))}
        </div>
      </div>

      {/* Sub-Phase B */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Digital Products
        </h2>
        <div className="space-y-2">
          {phaseBNodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              status={getNodeStatus(node.id)}
              activating={activatingNode === node.id}
              onActivate={() => handleActivate(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeRow({
  node,
  status,
  activating,
  onActivate,
}: {
  node: NodeConfig;
  status: string;
  activating: boolean;
  onActivate: () => void;
}) {
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{node.label}</p>
        <p className="text-xs text-muted-foreground truncate">{node.description}</p>
      </div>

      <Badge variant="outline" className={`shrink-0 text-[10px] ${config.color}`}>
        <StatusIcon className={`h-3 w-3 mr-1 ${status === "deploying" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>

      <div className="shrink-0">
        {status === "deployed" ? (
          <Button size="sm" variant="ghost" className="text-xs" onClick={onActivate} disabled={activating}>
            <RefreshCw className={`h-3 w-3 mr-1 ${activating ? "animate-spin" : ""}`} />
            Update
          </Button>
        ) : status === "failed" ? (
          <Button size="sm" variant="outline" className="text-xs border-red-500/20 text-red-600" onClick={onActivate} disabled={activating}>
            <RefreshCw className={`h-3 w-3 mr-1 ${activating ? "animate-spin" : ""}`} />
            Retry
          </Button>
        ) : (
          <Button size="sm" onClick={onActivate} disabled={activating} className="text-xs">
            {activating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Activating…
              </>
            ) : (
              <>
                Activate <ArrowRight className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
