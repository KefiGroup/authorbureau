import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, TrendingUp, Users, MousePointerClick, Sparkles, Pencil, PauseCircle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FlowRow {
  id: string;
  title: string;
  description: string | null;
  flow_type: string;
  node_id: string | null;
  status: string;
  total_subscribers: number;
  open_rate: number;
  click_rate: number;
  ai_generated: boolean;
  created_at: string;
}

interface Step {
  id: string;
  step_number: number;
  subject: string;
  trigger_delay_days: number;
}

const statusBadge: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paused: "bg-muted text-muted-foreground border-border",
};

export default function SequencesTab({ authorId }: { authorId: string | null }) {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleStatus = async (flow: FlowRow) => {
    const next = flow.status === "active" ? "paused" : "active";
    setUpdatingId(flow.id);
    const { error } = await supabase.from("email_flows").update({ status: next }).eq("id", flow.id);
    setUpdatingId(null);
    if (error) {
      toast({ title: "Couldn't update sequence", description: error.message, variant: "destructive" });
      return;
    }
    setFlows((prev) => prev.map((f) => (f.id === flow.id ? { ...f, status: next } : f)));
    toast({ title: next === "active" ? "Sequence resumed" : "Sequence paused" });
  };

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: f } = await supabase
        .from("email_flows")
        .select("id, title, description, flow_type, node_id, status, total_subscribers, open_rate, click_rate, ai_generated, created_at")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false });
      const flowList = (f as FlowRow[]) || [];
      setFlows(flowList);

      if (flowList.length > 0) {
        const { data: s } = await supabase
          .from("email_flow_steps")
          .select("id, flow_id, step_number, subject, trigger_delay_days")
          .in("flow_id", flowList.map((x) => x.id))
          .order("step_number", { ascending: true });
        const grouped: Record<string, Step[]> = {};
        (s || []).forEach((row: any) => {
          (grouped[row.flow_id] = grouped[row.flow_id] || []).push(row);
        });
        setSteps(grouped);
      }
      setLoading(false);
    })();
  }, [authorId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (flows.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card">
        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold">No email sequences yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Abby will write your first sequence the moment you publish a lead magnet, email campaign, or webinar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flows.map((f) => (
        <div key={f.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium truncate">{f.title}</p>
                <Badge variant="outline" className={`text-[10px] ${statusBadge[f.status] || statusBadge.draft}`}>
                  {f.status}
                </Badge>
                {f.ai_generated && (
                  <Badge variant="outline" className="text-[10px] bg-secondary/10 text-secondary border-secondary/20">
                    <Sparkles className="h-2.5 w-2.5 mr-1" /> AI
                  </Badge>
                )}
                {f.node_id && (
                  <Badge variant="outline" className="text-[10px]">{f.node_id}</Badge>
                )}
              </div>
              {f.description && <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {f.node_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => navigate(`/node-builder/${f.node_id}`)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              {(f.status === "active" || f.status === "paused") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={updatingId === f.id}
                  onClick={() => toggleStatus(f)}
                >
                  {updatingId === f.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : f.status === "active" ? (
                    <PauseCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <PlayCircle className="h-3 w-3 mr-1" />
                  )}
                  {f.status === "active" ? "Pause" : "Resume"}
                </Button>
              )}
            </div>
          </div>

          {/* Steps preview */}
          {steps[f.id]?.length > 0 && (
            <div className="mt-3 pl-6 border-l-2 border-muted space-y-1">
              {steps[f.id].slice(0, 5).map((s) => (
                <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/60">D+{s.trigger_delay_days}</span>
                  <span className="truncate">{s.subject}</span>
                </div>
              ))}
              {steps[f.id].length > 5 && (
                <p className="text-[10px] text-muted-foreground/60">+ {steps[f.id].length - 5} more</p>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {f.total_subscribers} subscribers</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {(Number(f.open_rate) * 100).toFixed(0)}% open</span>
            <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {(Number(f.click_rate) * 100).toFixed(0)}% click</span>
          </div>
        </div>
      ))}
    </div>
  );
}
