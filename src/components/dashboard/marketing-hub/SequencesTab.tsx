import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { callMarketingHubState } from "@/lib/marketing-hub-state";
import { Loader2, Mail, TrendingUp, Users, MousePointerClick, Sparkles, Pencil, PauseCircle, PlayCircle, ArrowRight, ExternalLink, PlayCircle as PlayIcon, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SequenceEditorDrawer from "./SequenceEditorDrawer";

/** Maps the marketing hub `highlight` query param to the node_id stored on email_flows. */
const HIGHLIGHT_TO_NODE: Record<string, string> = {
  "email-marketing": "BP-01",
  "lead-magnets": "BP-02",
  "social-media": "BP-03",
  "website-microsite": "BP-04",
  "webinars": "BP-05",
};
/** Friendly label for the node we're highlighting. */
const NODE_LABEL: Record<string, string> = {
  "BP-01": "Email Marketing",
  "BP-02": "Lead Magnets",
  "BP-03": "Social Media",
  "BP-04": "Author Website",
  "BP-05": "Webinars",
};

interface FlowRow {
  id: string;
  title: string;
  description: string | null;
  flow_type: string;
  node_id: string | null;
  book_id?: string | null;
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
  body_markdown?: string;
  preview_text?: string | null;
}

const statusBadge: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paused: "bg-muted text-muted-foreground border-border",
};

interface SequencesTabProps {
  bookId?: string | null;
  books?: { id: string; title: string }[];
}

export default function SequencesTab({ bookId = null, books = [] }: SequencesTabProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightKey = searchParams.get("highlight");
  const highlightNodeId = highlightKey ? HIGHLIGHT_TO_NODE[highlightKey] : null;
  const highlightLabel = highlightNodeId ? NODE_LABEL[highlightNodeId] : null;
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [enrollments, setEnrollments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const [activatingAll, setActivatingAll] = useState(false);
  const [senderVerified, setSenderVerified] = useState<boolean | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<FlowRow | null>(null);

  const bookTitleById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of books) m[b.id] = b.title;
    return m;
  }, [books]);

  const load = async () => {
    try {
      const res = await callMarketingHubState<{
        flows: FlowRow[];
        steps_by_flow: Record<string, Step[]>;
        active_enrollments_by_flow?: Record<string, number>;
      }>("sequences");
      setFlows(res.flows || []);
      setSteps(res.steps_by_flow || {});
      setEnrollments(res.active_enrollments_by_flow || {});
    } catch (err: any) {
      toast({ title: "Couldn't load sequences", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Check sender-email verification so we can warn before activating sequences.
  useEffect(() => {
    (async () => {
      try {
        const res = await callMarketingHubState<{ settings?: { domain_verified?: boolean } }>("email_settings");
        setSenderVerified(!!res?.settings?.domain_verified);
      } catch { setSenderVerified(false); }
    })();
  }, []);

  // After flows load, if a highlight node is requested, scroll to it and pulse.
  useEffect(() => {
    if (loading || !highlightNodeId) return;
    const target = flows.find((f) => f.node_id === highlightNodeId);
    if (!target) return;
    setPulseId(target.id);
    // Defer to allow layout
    requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setPulseId(null), 3500);
    return () => clearTimeout(t);
  }, [loading, flows, highlightNodeId]);

  const toggleStatus = async (flow: FlowRow) => {
    const next = flow.status === "active" ? "paused" : "active";
    setUpdatingId(flow.id);
    try {
      await callMarketingHubState("toggle_sequence_status", { flow_id: flow.id, status: next });
      setFlows((prev) => prev.map((f) => (f.id === flow.id ? { ...f, status: next } : f)));
      toast({ title: next === "active" ? "Sequence resumed" : "Sequence paused" });
    } catch (err: any) {
      toast({ title: "Couldn't update sequence", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    try {
      const res = await callMarketingHubState<{ attempted: number; skipped_existing: number; background?: boolean }>(
        "generate_all_sequences", { include_master: true }
      );
      if (res.attempted === 0) {
        toast({
          title: "All sequences already generated",
          description: `${res.skipped_existing} existing sequence${res.skipped_existing === 1 ? "" : "s"} found — nothing to do.`,
        });
      } else {
        toast({
          title: `Generating ${res.attempted} sequence${res.attempted === 1 ? "" : "s"} in the background`,
          description: `This takes a few minutes. We'll notify you when it's done. ${res.skipped_existing} existing skipped.`,
        });
        // Poll a few times so new sequences appear without a manual refresh.
        setTimeout(() => { load(); }, 15000);
        setTimeout(() => { load(); }, 45000);
        setTimeout(() => { load(); }, 90000);
      }
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't generate sequences", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingAll(false);
    }
  };

  const draftCount = flows.filter((f) => f.status === "draft").length;

  const activateAll = async () => {
    if (draftCount === 0) return;
    if (!senderVerified) {
      toast({
        title: "Verify your sender email first",
        description: "Activating sequences won't deliver until your reply-to email is confirmed. Visit the Settings tab to send the verification link.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Activate all ${draftCount} draft sequence${draftCount === 1 ? "" : "s"} now? They will start sending to enrolled subscribers immediately.`)) return;
    setActivatingAll(true);
    try {
      const res = await callMarketingHubState<{ activated_count: number }>("activate_all_sequences");
      toast({ title: `${res.activated_count} sequence${res.activated_count === 1 ? "" : "s"} activated`, description: "Your nurture engine is live." });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't activate sequences", description: err.message, variant: "destructive" });
    } finally {
      setActivatingAll(false);
    }
  };

  const totalActiveEnrollments = Object.values(enrollments).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const Header = (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{flows.length}</span> sequence{flows.length === 1 ? "" : "s"}
        {" · "}
        <span className="font-medium text-foreground">{totalActiveEnrollments}</span> active enrollment{totalActiveEnrollments === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={generateAll} disabled={generatingAll}>
          {generatingAll ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Generate sequences for all 28 nodes
        </Button>
      </div>
    </div>
  );

  const DraftBanner = draftCount > 0 ? (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-4">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {draftCount} sequence{draftCount === 1 ? " is" : "s are"} ready but not sending
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {senderVerified === false
            ? "Verify your sender email in the Settings tab first, then activate to start delivering."
            : "Click Activate all to switch the email engine on for every enrolled subscriber."}
        </p>
      </div>
      <Button
        size="lg"
        onClick={activateAll}
        disabled={activatingAll}
        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        title={senderVerified === false ? "Verify your sender email in Settings first" : undefined}
      >
        {activatingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayIcon className="h-4 w-4 mr-2" />}
        Activate all ({draftCount})
      </Button>
    </div>
  ) : null;


  if (flows.length === 0) {
    return (
      <div>
        {Header}
        <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold">No email sequences yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Click "Generate sequences for all 28 nodes" to have Abby write a tailored nurture flow for every revenue node, plus an always-on master nurture sequence.
          </p>
        </div>
      </div>
    );
  }

  const highlightFlow = highlightNodeId ? flows.find((f) => f.node_id === highlightNodeId) : null;

  return (
    <div>
      {Header}
      {DraftBanner}

      {highlightNodeId && highlightLabel && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Activate your {highlightLabel} sequence</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {highlightFlow
                ? `We've highlighted the ${highlightLabel} sequence below. Click Activate to start sending.`
                : `Your ${highlightLabel} sequence hasn't been generated yet. Open the ${highlightNodeId} builder to create it, or use "Generate sequences for all 28 nodes" above.`}
            </p>
          </div>
          {!highlightFlow && (
            <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => navigate(`/node-builder/${highlightNodeId}`)}>
              Open {highlightNodeId} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
      {flows.map((f) => {
        const isHighlighted = pulseId === f.id;
        return (
        <div
          key={f.id}
          ref={isHighlighted ? highlightRef : undefined}
          className={`rounded-xl border bg-card p-4 transition-all ${isHighlighted ? "border-primary ring-2 ring-primary/40 shadow-lg" : "border-border"}`}
        >
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
                {f.flow_type === "master_nurture" && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Master</Badge>
                )}
              </div>
              {f.description && <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingFlow(f)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
              {(f.status === "active" || f.status === "paused" || f.status === "draft") && (
                <Button size="sm" variant={isHighlighted && f.status === "draft" ? "default" : "outline"} className="h-8 text-xs" disabled={updatingId === f.id} onClick={() => toggleStatus(f)}>
                  {updatingId === f.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : f.status === "active" ? <PauseCircle className="h-3 w-3 mr-1" /> : <PlayCircle className="h-3 w-3 mr-1" />}
                  {f.status === "active" ? "Pause" : "Activate"}
                </Button>
              )}
            </div>
          </div>

          {f.node_id && (
            <button
              onClick={() => navigate(`/node-builder/${f.node_id}?from=marketing-hub`)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Open {f.node_id} product builder
            </button>
          )}

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

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {enrollments[f.id] || 0} active · {f.total_subscribers} total</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {(Number(f.open_rate) * 100).toFixed(0)}% open</span>
            <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {(Number(f.click_rate) * 100).toFixed(0)}% click</span>
          </div>
        </div>
        );
      })}
      </div>

      <SequenceEditorDrawer
        open={!!editingFlow}
        onOpenChange={(o) => { if (!o) setEditingFlow(null); }}
        flow={editingFlow}
        initialSteps={editingFlow ? (steps[editingFlow.id] || []) : []}
        onSaved={() => { void load(); }}
      />
    </div>
  );
}
