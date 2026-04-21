import { supabase } from "@/integrations/supabase/client";

/**
 * Shared auto-save / resume helper used by all BA-/YR- builders.
 *
 * Mirrors the BP-02 pattern:
 *  - autosaveBuilderDraft: called right after generation to persist
 *    content_json + _currentStep + status="content_ready" (idempotent
 *    upsert; never downgrades a "live" node).
 *  - loadBuilderDraft: returns the saved content + step so the builder
 *    can resume the author exactly where they left off.
 *
 * Errors are logged and swallowed — autosave must never break the UI.
 */

export type BuilderStatus = "content_ready" | "live";

export interface AutosaveOptions {
  authorId: string;
  nodeId: string;
  nodeName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  currentStep: number;
}

export async function autosaveBuilderDraft({
  authorId,
  nodeId,
  nodeName,
  content,
  currentStep,
}: AutosaveOptions): Promise<void> {
  if (!authorId || !content) return;
  try {
    const { data: existing } = await supabase
      .from("author_nodes")
      .select("id, status, activated_at, microsite_url")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .maybeSingle();

    const isAlreadyLive =
      existing?.status === "live" ||
      !!existing?.activated_at ||
      !!existing?.microsite_url;

    const status: BuilderStatus = isAlreadyLive ? "live" : "content_ready";

    const payload = {
      content_json: { ...content, _currentStep: currentStep },
      current_step: currentStep,
      status,
    };

    if (existing) {
      const { error } = await supabase
        .from("author_nodes")
        .update(payload)
        .eq("id", existing.id);
      if (error) console.error(`[autosave ${nodeId}] update failed:`, error.message);
    } else {
      const { error } = await supabase.from("author_nodes").insert({
        author_id: authorId,
        node_id: nodeId,
        node_name: nodeName,
        ...payload,
      });
      if (error) console.error(`[autosave ${nodeId}] insert failed:`, error.message);
    }
  } catch (err) {
    console.error(`[autosave ${nodeId}] exception:`, err);
  }
}

export interface LoadDraftResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any | null;
  status: string | null;
  currentStep: number;
  isLive: boolean;
}

export async function loadBuilderDraft(
  authorId: string,
  nodeId: string,
): Promise<LoadDraftResult> {
  const empty: LoadDraftResult = { content: null, status: null, currentStep: 0, isLive: false };
  if (!authorId) return empty;
  try {
    const { data: node } = await supabase
      .from("author_nodes")
      .select("content_json, status, microsite_url, activated_at, current_step")
      .eq("author_id", authorId)
      .eq("node_id", nodeId)
      .maybeSingle();

    if (!node?.content_json) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cj = node.content_json as any;
    const isLive =
      node.status === "live" || !!node.activated_at || !!node.microsite_url;
    const savedStep = Number(cj?._currentStep ?? node.current_step ?? 0);

    return {
      content: isLive ? { ...cj, activated: true } : cj,
      status: node.status ?? null,
      currentStep: savedStep,
      isLive,
    };
  } catch (err) {
    console.error(`[loadBuilderDraft ${nodeId}] exception:`, err);
    return empty;
  }
}
