/**
 * Node-level funnel flow panel.
 *
 * Loads the funnel + stage overrides for one (author, node), renders the
 * archetype-specific flow chart, and opens the stage editor drawer on click.
 *
 * Used by both PublishSuccessScreen (per-builder) and FunnelsHub (when caller
 * passes an existing funnel — see `funnel` prop).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, Power, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ARCHETYPE_LABEL,
  ARCHETYPE_TO_FUNNEL_TYPE,
  type ArchetypeKey,
} from "@/lib/funnel-archetype";
import {
  getStagesForArchetype,
  type BaseFunnel,
  type FunnelStage,
  type OverridesMap,
} from "@/lib/funnel-flow-stages";
import { loadOverrides } from "@/lib/funnel-overrides";
import { setFunnelStatus, listFunnels } from "@/lib/funnels-api";
import FunnelFlowChart from "./FunnelFlowChart";
import StageEditorDrawer from "./StageEditorDrawer";

interface Props {
  authorId: string;
  nodeId: string;
  /** Optional — caller can pass an already-loaded funnel row to skip the lookup. */
  funnel?: BaseFunnel & { node_id?: string | null; status?: string | null };
  /** Optional — caller-supplied archetype override; otherwise resolved from author_nodes. */
  archetype?: ArchetypeKey;
  publicUrl?: string | null;
  bookId?: string | null;
  /** Optional — leads count to surface in the form/register stage stat. */
  leadsCount?: number;
  /** Called whenever the funnel or its overrides change (so callers can refresh lists). */
  onChanged?: () => void;
  /** Hides the "View in Funnels Hub" button (already on that page). */
  hideHubLink?: boolean;
}

const NORMALIZE_FUNNEL_TYPE_TO_ARCH: Record<string, ArchetypeKey> = {
  sales: "A",
  opt_in: "B",
  lead_magnet: "B",
  webinar: "B",
  webinar_registration: "B",
  application: "C",
  event: "D",
};

export default function NodeFunnelFlow({
  authorId, nodeId, funnel: funnelProp, archetype: archetypeProp,
  publicUrl: publicUrlProp, bookId, leadsCount, onChanged, hideHubLink,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<BaseFunnel | null>(funnelProp ?? null);
  const [archetype, setArchetype] = useState<ArchetypeKey | null>(archetypeProp ?? null);
  const [publicUrl, setPublicUrl] = useState<string | null>(publicUrlProp ?? null);
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [generating, setGenerating] = useState(false);
  const [editStageId, setEditStageId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Funnel row — prefer caller-supplied; otherwise fetch via the
      //    edge function (avoids shared-auth/RLS blind spot for owner reads).
      let baseFunnel: BaseFunnel | null = funnelProp ?? null;
      if (!baseFunnel) {
        try {
          const { funnels } = await listFunnels();
          const match = (funnels || []).find(
            (f: any) => f.node_id === nodeId,
          );
          baseFunnel = (match as BaseFunnel | undefined) ?? null;
        } catch (e) {
          console.warn("[NodeFunnelFlow] listFunnels failed:", (e as Error).message);
        }
      }
      setFunnel(baseFunnel);

      // 2. Archetype + public URL from author_nodes (unless supplied).
      if (!archetypeProp || !publicUrlProp) {
        const { data: nodeRow } = await supabase
          .from("author_nodes")
          .select("archetype, microsite_url")
          .eq("author_id", authorId)
          .eq("node_id", nodeId)
          .maybeSingle();
        const arch = (archetypeProp ?? (nodeRow?.archetype as ArchetypeKey | null) ?? null);
        setArchetype(arch);
        setPublicUrl(publicUrlProp ?? (nodeRow?.microsite_url as string | null) ?? null);
      }

      // 3. Overrides (only if we have a funnel).
      if (baseFunnel?.id) {
        const ov = await loadOverrides(baseFunnel.id);
        setOverrides(ov);
      } else {
        setOverrides({});
      }
    } finally {
      setLoading(false);
    }
  }, [authorId, nodeId, funnelProp, archetypeProp, publicUrlProp]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Resolve archetype from funnel_type if author_nodes didn't provide one.
  const effectiveArchetype: ArchetypeKey | null = useMemo(() => {
    if (archetype) return archetype;
    // Last-resort guess from funnel_type — but we only have BaseFunnel; default to B.
    return funnel ? "B" : null;
  }, [archetype, funnel]);

  const stages: FunnelStage[] = useMemo(() => {
    if (!funnel || !effectiveArchetype) return [];
    return getStagesForArchetype(effectiveArchetype, funnel, overrides, {
      publicUrl,
      leadsCount,
    });
  }, [funnel, effectiveArchetype, overrides, publicUrl, leadsCount]);

  const handleGenerate = async () => {
    setGenerating(true);
    const seedType =
      (effectiveArchetype && ARCHETYPE_TO_FUNNEL_TYPE[effectiveArchetype]) || "opt_in";
    const { error } = await supabase.functions.invoke("generate-funnel", {
      body: { author_id: authorId, node_id: nodeId, book_id: bookId ?? null, funnel_type: seedType },
    });
    setGenerating(false);
    if (error) {
      toast({ title: "ABBY couldn't build the funnel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Funnel created", description: "Your visual flow is ready below." });
    await fetchAll();
    onChanged?.();
  };

  const handleRegenerate = async () => {
    if (!funnel?.id) return;
    setGenerating(true);
    const { error } = await supabase.functions.invoke("generate-funnel", {
      body: { node_id: nodeId, force: true, funnel_id: funnel.id },
    });
    setGenerating(false);
    if (error) {
      toast({ title: "Regeneration failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ABBY regenerated this funnel", description: "Your stage edits are preserved." });
    await fetchAll();
    onChanged?.();
  };

  const handlePublish = async () => {
    if (!funnel?.id) return;
    setGenerating(true);
    const goingLive = funnel.status !== "live";
    try {
      await setFunnelStatus(funnel.id, goingLive ? "live" : "paused");
      toast({
        title: goingLive ? "Funnel is live" : "Funnel paused",
        description: goingLive
          ? "Your public landing page now serves this funnel."
          : "Visitors will see your default book page again.",
      });
      await fetchAll();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Couldn't update status", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CardContent></Card>
    );
  }

  // Empty state — no funnel yet for this node.
  if (!funnel) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary opacity-70" />
          <h3 className="font-semibold mb-1">No funnel built yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Let ABBY generate a conversion funnel for this product. Takes about 30 seconds.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate funnel for this node
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Determine which stages are still missing — used to gate publish.
  const missingStages = stages.filter((s) => s.status === "missing");
  const isComplete = missingStages.length === 0 && stages.length > 0;
  const canPublish = isComplete || funnel.status === "live";

  const editingStage = stages.find((s) => s.id === editStageId) ?? null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-sm">Reader's journey</h3>
          {effectiveArchetype && (
            <Badge variant="outline" className="text-[10px]">
              {ARCHETYPE_LABEL[effectiveArchetype]} funnel
            </Badge>
          )}
          {funnel.status && (
            <Badge
              className={`text-[10px] ${funnel.status === "live" ? "bg-emerald-600" : "bg-muted text-muted-foreground"}`}
            >
              {funnel.status}
            </Badge>
          )}
        </div>

        {/* Draft warning — explains why the public URL doesn't show this funnel yet */}
        {funnel.status !== "live" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs text-amber-900 dark:text-amber-200">
                <strong>Draft — preview only.</strong> Your edits are saved, but the public URL still shows your default page. {isComplete ? "Click Publish funnel to go live." : "Complete every step before you can publish."}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={generating || !canPublish}
                        className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 disabled:opacity-50"
                      >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                        Publish funnel
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canPublish && (
                    <TooltipContent>Complete all steps to publish</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            {!isComplete && (
              <ul className="mt-2 ml-6 space-y-0.5 text-[11px] text-amber-900 dark:text-amber-200">
                {missingStages.map((s) => (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <XCircle className="h-3 w-3" /> {s.label} — needs setup
                  </li>
                ))}
              </ul>
            )}
            {isComplete && (
              <p className="mt-2 ml-6 text-[11px] text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> All {stages.length} steps complete — ready to publish.
              </p>
            )}
          </div>
        )}

        {/* Draft warning — explains why the public URL doesn't show this funnel yet */}
        {funnel.status !== "live" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs text-amber-900 dark:text-amber-200">
              <strong>Draft — not public yet.</strong> Your edits are saved, but the public URL still shows your default book page. Click <em>Publish funnel</em> to go live.
            </div>
            <Button size="sm" onClick={handlePublish} disabled={generating} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
              Publish funnel
            </Button>
          </div>
        )}

        {/* Flow chart */}
        <FunnelFlowChart stages={stages} onStageClick={(id) => setEditStageId(id)} />

        {/* Metadata + actions strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {publicUrl && (
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copied" }); }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded bg-muted/40 hover:bg-muted/70"
              title="Copy public link"
            >
              <Copy className="h-3 w-3" />
              <span className="truncate max-w-[260px]">{publicUrl}</span>
              {funnel.status !== "live" && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">(draft — not public)</span>
              )}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            {funnel.status === "live" ? (
              <Button size="sm" variant="ghost" onClick={handlePublish} disabled={generating} title="Pause this funnel">
                <Power className="h-3.5 w-3.5 mr-1" />Pause
              </Button>
            ) : (
              <Button size="sm" onClick={handlePublish} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                Publish funnel
              </Button>
            )}
            {publicUrl && funnel.status === "live" && (
              <Button size="sm" variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />Open landing page
                </a>
              </Button>
            )}
            {publicUrl && funnel.status !== "live" && (
              <Button size="sm" variant="outline" asChild title="Preview the draft (only visible to you)">
                <a href={`${publicUrl}?preview=${funnel.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />Preview draft
                </a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Regenerate
            </Button>
            {!hideHubLink && (
              <Button size="sm" variant="ghost" asChild>
                <a href="/dashboard?section=funnels-hub">View in Funnels Hub</a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <StageEditorDrawer
        open={!!editStageId}
        onOpenChange={(o) => { if (!o) setEditStageId(null); }}
        stage={editingStage}
        funnelId={funnel.id}
        authorId={authorId}
        funnelStatus={funnel.status}
        currentOverrides={editingStage ? (overrides[editingStage.id] || {}) : {}}
        onSaved={async () => { await fetchAll(); onChanged?.(); }}
      />
    </Card>
  );
}
