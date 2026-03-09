/**
 * useBuilderGeneration — 3-Act state machine for builder AI generation
 * 
 * Act 1: Abby Analyzes (loading screen + AI call → structured proposal)
 * Act 2: Abby Presents (author reviews proposal, edits, approves)
 * Act 3: Abby Generates (streams full content from approved proposal)
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BuilderProposal {
  title_options: string[];
  recommended_title: string;
  subtitle?: string;
  description: string;
  target_audience: string;
  transformation_promises?: string[];
  recommended_price: number;
  price_justification?: string;
  value_ladder_position?: string;
  structure: Array<{
    title: string;
    description?: string;
    source_chapters?: string;
    items?: Array<{ title: string; description?: string }>;
  }>;
  cross_builder_outputs: Array<{
    builder: string;
    label: string;
    description?: string;
  }>;
  abby_commentary?: string;
  revenue_projection?: string;
}

export type GenerationAct = "idle" | "act1_loading" | "act2_proposal" | "act3_generating" | "act3_complete" | "error";

interface GenerationState {
  act: GenerationAct;
  proposal: BuilderProposal | null;
  generatedContent: string;
  error: string | null;
}

export function useBuilderGeneration(builderId: string, builderLabel: string) {
  const { toast } = useToast();
  const [state, setState] = useState<GenerationState>({
    act: "idle",
    proposal: null,
    generatedContent: "",
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const getToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  // ── ACT 1: Analyze ─────────────────────────────────────────────
  const startAct1 = useCallback(async (bookId: string) => {
    setState({ act: "act1_loading", proposal: null, generatedContent: "", error: null });

    try {
      const token = await getToken();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-builder-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ act: 1, builderId, bookId, builderLabel }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Act 1 failed (${resp.status})`);
      }

      const data = await resp.json();
      if (!data.proposal) throw new Error("No proposal returned");

      setState({
        act: "act2_proposal",
        proposal: data.proposal,
        generatedContent: "",
        error: null,
      });

      toast({ title: "Abby's proposal is ready!", description: "Review and approve to generate all content." });
    } catch (err: any) {
      console.error("Act 1 error:", err);
      setState(prev => ({ ...prev, act: "error", error: err.message }));
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    }
  }, [builderId, builderLabel, toast]);

  // ── ACT 3: Generate ────────────────────────────────────────────
  const startAct3 = useCallback(async (bookId: string, approvedProposal: BuilderProposal) => {
    setState(prev => ({ ...prev, act: "act3_generating", generatedContent: "", error: null }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-builder-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            act: 3,
            builderId,
            bookId,
            builderLabel,
            approvedProposal,
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Act 3 failed (${resp.status})`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setState(prev => ({ ...prev, generatedContent: accumulated }));
            }
          } catch {
            // Partial JSON, re-buffer
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save generated content
      const session = await supabase.auth.getSession();
      const userId = session.data?.session?.user?.id;
      if (userId && bookId) {
        await supabase.from("generated_assets").upsert({
          book_id: bookId,
          author_id: userId,
          asset_type: `builder_content_${builderId}`,
          content: accumulated,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "book_id,asset_type" as any }).catch(() => {
          // Fallback insert
          supabase.from("generated_assets").insert({
            book_id: bookId,
            author_id: userId,
            asset_type: `builder_content_${builderId}`,
            content: accumulated,
          } as any).catch(() => {});
        });
      }

      setState(prev => ({ ...prev, act: "act3_complete" }));
      toast({ title: "Content generated! 🎉", description: "Review everything below." });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Act 3 error:", err);
      setState(prev => ({ ...prev, act: "error", error: err.message }));
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  }, [builderId, builderLabel, toast]);

  // ── Update proposal (for author edits in Act 2) ────────────────
  const updateProposal = useCallback((updates: Partial<BuilderProposal>) => {
    setState(prev => ({
      ...prev,
      proposal: prev.proposal ? { ...prev.proposal, ...updates } : null,
    }));
  }, []);

  // ── Reset ──────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ act: "idle", proposal: null, generatedContent: "", error: null });
  }, []);

  // ── Retry ──────────────────────────────────────────────────────
  const retry = useCallback((bookId: string) => {
    reset();
    startAct1(bookId);
  }, [reset, startAct1]);

  return {
    ...state,
    startAct1,
    startAct3,
    updateProposal,
    reset,
    retry,
  };
}
