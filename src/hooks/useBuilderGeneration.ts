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
import { executeCrossBuilderPushes } from "@/lib/cross-builder-push";
import { getPushesForBuilder } from "@/lib/cross-builder-registry";
import { getActiveToken } from "@/lib/get-active-token";

/**
 * Robust split of AI output into sales page and content.
 * Strategy 1: Full delimiters
 * Strategy 2: Partial delimiters (missing END markers)
 * Strategy 3: Delimiter + curriculum boundary (Day 1 / Module 1 / Lesson 1)
 * Strategy 4: Header/copy heuristics fallback
 */
export function splitSalesAndContent(rawText: string): { salesPageText: string; contentText: string } {
  if (!rawText) return { salesPageText: "", contentText: "" };

  const text = rawText.replace(/\r\n/g, "\n");
  const stripMarkers = (s: string) =>
    s
      .replace(/={3,}\s*(SALES[_ ]?PAGE[_ ]?START|SALES[_ ]?PAGE[_ ]?END|CONTENT[_ ]?START|CONTENT[_ ]?END)\s*={3,}/gi, "")
      .trim();

  const salesStartTag = /={3,}\s*SALES[_ ]?PAGE[_ ]?START\s*={3,}/i;
  const salesEndTag = /={3,}\s*SALES[_ ]?PAGE[_ ]?END\s*={3,}/i;
  const contentStartTag = /={3,}\s*CONTENT[_ ]?START\s*={3,}/i;
  const contentEndTag = /={3,}\s*CONTENT[_ ]?END\s*={3,}/i;
  const curriculumStartTag = /(^|\n)(#{1,6}\s*)?(day\s*1\b|module\s*1\b|lesson\s*1\b|week\s*1\b|curriculum\b|course\s*content\b|program\s*content\b)/i;

  // Strategy 1: exact or near-exact delimiters
  const salesMatch = text.match(/={3,}\s*SALES[_ ]?PAGE[_ ]?START\s*={3,}([\s\S]*?)={3,}\s*SALES[_ ]?PAGE[_ ]?END\s*={3,}/i);
  const contentMatch = text.match(/={3,}\s*CONTENT[_ ]?START\s*={3,}([\s\S]*?)={3,}\s*CONTENT[_ ]?END\s*={3,}/i);
  if (salesMatch?.[1] && contentMatch?.[1]) {
    return { salesPageText: stripMarkers(salesMatch[1]), contentText: stripMarkers(contentMatch[1]) };
  }

  const salesStartIdx = text.search(salesStartTag);
  const salesEndIdx = text.search(salesEndTag);
  const contentStartIdx = text.search(contentStartTag);
  const contentEndIdx = text.search(contentEndTag);

  // Strategy 2A: Sales start + content start, with or without END markers
  if (salesStartIdx >= 0 && contentStartIdx > salesStartIdx) {
    const salesBlockStart = text.slice(salesStartIdx).replace(salesStartTag, "");
    const splitIdx = salesBlockStart.search(contentStartTag);
    const beforeContent = splitIdx >= 0 ? salesBlockStart.slice(0, splitIdx) : salesBlockStart;
    const salesText = stripMarkers(beforeContent.replace(salesEndTag, ""));

    const afterContentStart = text.slice(contentStartIdx).replace(contentStartTag, "");
    const contentText = stripMarkers(contentEndIdx > contentStartIdx ? afterContentStart.split(contentEndTag)[0] : afterContentStart);

    if (salesText && contentText) return { salesPageText: salesText, contentText };
  }

  // Strategy 2B: Sales markers exist but content markers missing -> content starts after sales end
  if (salesStartIdx >= 0 && salesEndIdx > salesStartIdx) {
    const salesText = stripMarkers(text.slice(salesStartIdx, salesEndIdx));
    const remaining = stripMarkers(text.slice(salesEndIdx).replace(salesEndTag, ""));
    if (salesText && remaining) {
      const curriculumIdx = remaining.search(curriculumStartTag);
      const contentText = curriculumIdx >= 0 ? remaining.slice(curriculumIdx).trim() : remaining;
      return { salesPageText: salesText, contentText };
    }
  }

  // Strategy 3: Sales start tag + first curriculum boundary
  if (salesStartIdx >= 0) {
    const afterSalesStart = stripMarkers(text.slice(salesStartIdx).replace(salesStartTag, ""));
    const curriculumIdx = afterSalesStart.search(curriculumStartTag);
    if (curriculumIdx > 0) {
      return {
        salesPageText: afterSalesStart.slice(0, curriculumIdx).trim(),
        contentText: afterSalesStart.slice(curriculumIdx).trim(),
      };
    }
  }

  // Strategy 4: Header/copy heuristics fallback
  const salesHeaderIdx = text.search(/(^|\n)#{1,6}\s*(sales\s*page|landing\s*page|offer\s*page|marketing\s*copy)\b/i);
  const contentHeaderIdx = text.search(/(^|\n)#{1,6}\s*(day\s*1\b|module\s*1\b|lesson\s*1\b|curriculum\b|course\s*content\b)/i);
  if (salesHeaderIdx >= 0 && contentHeaderIdx > salesHeaderIdx) {
    return {
      salesPageText: stripMarkers(text.slice(salesHeaderIdx, contentHeaderIdx)),
      contentText: stripMarkers(text.slice(contentHeaderIdx)),
    };
  }

  console.warn("[splitSalesAndContent] No clear split markers found; treating as content only.");
  return { salesPageText: "", contentText: stripMarkers(text) };
}

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
  generatedSalesPage: string;
  error: string | null;
  pushResult: { pushed: number; errors: string[] } | null;
}

export function useBuilderGeneration(builderId: string, builderLabel: string) {
  const { toast } = useToast();
  const [state, setState] = useState<GenerationState>({
    act: "idle",
    proposal: null,
    generatedContent: "",
    generatedSalesPage: "",
    error: null,
    pushResult: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const getToken = async (): Promise<string> => {
    const token = await getActiveToken();
    if (!token) throw new Error("Not authenticated. Please sign in again.");
    return token;
  };

  const getFunctionsBaseUrl = () => {
    const url = (supabase as any)?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    if (!url) throw new Error("Backend URL is missing");
    return url;
  };

  const fetchBuilderEndpoint = useCallback(async (payload: Record<string, any>, signal?: AbortSignal) => {
    const token = await getToken();
    const baseUrl = getFunctionsBaseUrl();

    // Retry on network failures AND transient 5xx (502/503/504) AND 408/429.
    const TRANSIENT_STATUS = new Set([408, 429, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/functions/v1/abby-builder-generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal,
        });
        if (res.ok || !TRANSIENT_STATUS.has(res.status)) return res;
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        lastError = err;
        if (signal?.aborted || err?.name === "AbortError") throw err;
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        const delay = 600 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to reach Abby service");
  }, []);

  // ── ACT 1: Analyze ─────────────────────────────────────────────
  const startAct1 = useCallback(async (bookId: string) => {
    setState({ act: "act1_loading", proposal: null, generatedContent: "", generatedSalesPage: "", error: null, pushResult: null });

    try {
      const resp = await fetchBuilderEndpoint({
        act: 1,
        builderId,
        bookId,
        builderLabel,
      });

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
        generatedSalesPage: "",
        error: null,
        pushResult: null,
      });

      toast({ title: "Abby's proposal is ready!", description: "Review and approve to generate all content." });
    } catch (err) {
      console.error("Act 1 error:", err);
      const message = err?.message?.toLowerCase?.().includes("failed to fetch")
        ? "Connection issue while reaching Abby. Please retry."
        : err.message;
      setState(prev => ({ ...prev, act: "error", error: message }));
      toast({ title: "Analysis failed", description: message, variant: "destructive" });
    }
  }, [builderId, builderLabel, toast, fetchBuilderEndpoint]);

  // ── ACT 3: Generate ────────────────────────────────────────────
  const startAct3 = useCallback(async (bookId: string, approvedProposal: BuilderProposal) => {
    setState(prev => ({ ...prev, act: "act3_generating", generatedContent: "", generatedSalesPage: "", error: null }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetchBuilderEndpoint(
        {
          act: 3,
          builderId,
          bookId,
          builderLabel,
          approvedProposal,
        },
        controller.signal,
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
          } catch (error) {
            // Partial JSON, re-buffer
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // ── Split & Save generated content + Cross-Builder Push ─────────────
      const { salesPageText, contentText } = splitSalesAndContent(accumulated);
      const contentToSave = contentText || accumulated;

      const session = await supabase.auth.getSession();
      const userId = session.data?.session?.user?.id;
      if (userId && bookId) {
        // Save sales page as separate asset
        if (salesPageText) {
          try {
            const { error: spErr } = await supabase.from("generated_assets" as any).upsert({
              book_id: bookId,
              author_id: userId,
              asset_type: `builder_sales_page_${builderId}`,
              content: salesPageText,
              updated_at: new Date().toISOString(),
            } as any, { onConflict: "book_id,asset_type" as any });
            if (spErr) {
              await supabase.from("generated_assets" as any).insert({
                book_id: bookId,
                author_id: userId,
                asset_type: `builder_sales_page_${builderId}`,
                content: salesPageText,
              } as any);
            }
          } catch (error) { console.error(error); }
        }

        // Save product content as separate asset
        try {
          const { error: upsertErr } = await supabase.from("generated_assets" as any).upsert({
            book_id: bookId,
            author_id: userId,
            asset_type: `builder_content_${builderId}`,
            content: contentToSave,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "book_id,asset_type" as any });
          if (upsertErr) {
            await supabase.from("generated_assets" as any).insert({
              book_id: bookId,
              author_id: userId,
              asset_type: `builder_content_${builderId}`,
              content: contentToSave,
            } as any);
          }
        } catch (error) {
          // Non-blocking save failure
        }
      }

      // Push outputs to destination builders
      let pushResult: { pushed: number; errors: string[] } | null = null;
      if (userId && bookId) {
        try {
          const pushDefs = getPushesForBuilder(builderId);
          if (pushDefs.length > 0) {
            // Build outputs map from the approved proposal's cross_builder_outputs
            const outputs: Record<string, { title: string; description?: string; content: Record<string, any> }> = {};
            for (const def of pushDefs) {
              outputs[def.pushType] = {
                title: def.label,
                description: def.description,
                content: {
                  source_builder: builderId,
                  source_builder_label: builderLabel,
                  proposal: {
                    title: approvedProposal.recommended_title,
                    description: approvedProposal.description,
                    price: approvedProposal.recommended_price,
                    target_audience: approvedProposal.target_audience,
                    structure: approvedProposal.structure,
                  },
                  generated_content_preview: accumulated.slice(0, 2000),
                },
              };
            }

            const result = await executeCrossBuilderPushes({
              sourceBuilder: builderId,
              authorId: userId,
              bookId,
              outputs,
            });

            pushResult = { pushed: result.pushed, errors: result.errors };
            if (result.pushed > 0) {
            }
          }
        } catch (pushErr) {
          console.error("Cross-builder push error (non-blocking):", pushErr);
        }
      }

      setState(prev => ({
        ...prev,
        act: "act3_complete",
        generatedContent: contentToSave,
        generatedSalesPage: salesPageText,
        pushResult,
      }));
      toast({ 
        title: "Content generated! 🎉", 
        description: pushResult?.pushed 
          ? `Review below. ${pushResult.pushed} assets pushed to other builders.`
          : "Review everything below." 
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Act 3 error:", err);
      const message = err?.message?.toLowerCase?.().includes("failed to fetch")
        ? "Connection issue while reaching Abby. Please retry."
        : err.message;
      setState(prev => ({ ...prev, act: "error", error: message }));
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    }
  }, [builderId, builderLabel, toast, fetchBuilderEndpoint]);

  // ── Update proposal (for author edits in Act 2) ────────────────
  const updateProposal = useCallback((updates: Partial<BuilderProposal>) => {
    setState(prev => ({
      ...prev,
      proposal: prev.proposal ? { ...prev.proposal, ...updates } : null,
    }));
  }, []);

  // ── Set generated content (for manual edits) ──────────────────
  const setGeneratedContent = useCallback((content: string) => {
    setState(prev => ({ ...prev, generatedContent: content }));
  }, []);

  // ── Reset ──────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ act: "idle", proposal: null, generatedContent: "", generatedSalesPage: "", error: null, pushResult: null });
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
    setGeneratedContent,
    reset,
    retry,
  };
}
