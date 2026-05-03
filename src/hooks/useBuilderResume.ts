import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadBuilderDraft } from "@/lib/builder-autosave";

/**
 * Canonical resume hook — modelled on the BP-06 reference.
 *
 * Resume order:
 *   1. loadBuilderDraft (edge-function, works under both auth modes).
 *   2. Direct author_nodes read as a fallback for legacy rows.
 *
 * If the node is `live`, content is marked `activated: true` and step is
 * pushed to `liveStep`. Otherwise the latest non-intro step is used.
 */
export interface UseBuilderResumeOptions {
  authorId: string | null;
  nodeId: string;
  activeBookId: string | null;
  /** Step index to land on when status === "live". Defaults to 3. */
  liveStep?: number;
  /** Minimum step to land on when a draft exists. Defaults to 2 (Review). */
  minDraftStep?: number;
}

export interface UseBuilderResumeState<T = Record<string, unknown>> {
  content: T | null;
  step: number;
  setContent: (c: T | null | ((prev: T | null) => T | null)) => void;
  setStep: (s: number) => void;
  isResuming: boolean;
}

export function useBuilderResume<T = Record<string, unknown>>({
  authorId,
  nodeId,
  activeBookId,
  liveStep = 3,
  minDraftStep = 2,
}: UseBuilderResumeOptions): UseBuilderResumeState<T> {
  const [content, setContent] = useState<T | null>(null);
  const [step, setStep] = useState<number>(0);
  const [isResuming, setIsResuming] = useState<boolean>(true);

  useEffect(() => {
    if (!authorId) {
      setIsResuming(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsResuming(true);
      try {
        const draft = await loadBuilderDraft(authorId, nodeId, activeBookId);
        if (cancelled) return;
        if (draft.content) {
          setContent(draft.content as T);
          setStep(draft.isLive ? liveStep : Math.max(draft.currentStep, minDraftStep));
          return;
        }
        let nodeQuery = supabase
          .from("author_nodes")
          .select("content_json, status")
          .eq("author_id", authorId)
          .eq("node_id", nodeId);
        if (activeBookId) nodeQuery = nodeQuery.eq("book_id", activeBookId);
        const { data: node } = await nodeQuery.maybeSingle();
        if (cancelled) return;
        if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
          const base = node.content_json as Record<string, unknown>;
          setContent((node.status === "live" ? { ...base, activated: true } : base) as T);
          setStep(node.status === "live" ? liveStep : minDraftStep);
        }
      } finally {
        if (!cancelled) setIsResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorId, nodeId, activeBookId, liveStep, minDraftStep]);

  return { content, step, setContent, setStep, isResuming };
}
