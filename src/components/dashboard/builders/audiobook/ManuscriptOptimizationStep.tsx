import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileAudio, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toAbbyError } from "@/lib/abby-error";

interface Chapter {
  index: number;
  title: string;
  text: string;
  status: "script-ready" | "audio-generated" | "reviewed";
  audioUrl: string;
}

interface Props {
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
}

const CHAR_CAP = 4500;

function splitIntoChapters(raw: string): Chapter[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // Try heading-based split first
  const headingRegex = /^(?:Chapter\s+\d+[^\n]*|CHAPTER\s+[A-Z0-9]+[^\n]*|#\s+[^\n]+)$/gim;
  const matches = [...text.matchAll(headingRegex)];

  if (matches.length >= 2) {
    const chapters: Chapter[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
      const block = text.slice(start, end).trim();
      const firstNewline = block.indexOf("\n");
      const title = (firstNewline > 0 ? block.slice(0, firstNewline) : `Chapter ${i + 1}`).replace(/^#\s*/, "").trim();
      const body = firstNewline > 0 ? block.slice(firstNewline + 1).trim() : block;
      if (body.length > 0) {
        chapters.push({ index: i, title: title || `Chapter ${i + 1}`, text: body, status: "script-ready", audioUrl: "" });
      }
    }
    if (chapters.length > 0) return chapters;
  }

  // Fallback: paragraph-based ~3500-char chunks
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > 3500 && buf.length > 0) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.map((c, i) => ({
    index: i,
    title: `Chapter ${i + 1}`,
    text: c,
    status: "script-ready" as const,
    audioUrl: "",
  }));
}

export default function ManuscriptOptimizationStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const chapters: Chapter[] = stepData.chapters ?? [];

  const optimize = async () => {
    if (!bookId) {
      setError("Book ID is missing — please reload the page.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { getActiveToken, fetchWithTimeout } = await import("@/lib/get-active-token");
      // Wait for shared-auth restore on refresh — same pattern as AudiobookStudio.
      let token = await getActiveToken();
      for (let i = 0; i < 8 && !token; i++) {
        await new Promise((r) => setTimeout(r, 300));
        token = await getActiveToken();
      }
      if (!token) throw new Error("Your session is still restoring. Please wait a moment and try again.");

      const callEndpoint = async (path: string, payload: Record<string, unknown>) => {
        const resp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          },
          25000,
        );
        const text = await resp.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        return { ok: resp.ok, status: resp.status, data };
      };

      // Primary: get-book-manuscript (more resilient ownership lookup).
      let content: string | null = null;
      let lastError: string | null = null;
      const primary = await callEndpoint("get-book-manuscript", { book_id: bookId });
      if (primary.ok && typeof primary.data?.content === "string" && primary.data.content.length > 0) {
        content = primary.data.content;
      } else if (primary.data?.error) {
        lastError = primary.data.error;
      }
      // Fallback: legacy get-manuscript-source.
      if (!content) {
        const fallback = await callEndpoint("get-manuscript-source", { bookId });
        if (fallback.data?.success && typeof fallback.data?.content === "string") {
          content = fallback.data.content;
        } else if (fallback.data?.error) {
          lastError = fallback.data.error;
        }
      }
      if (!content) {
        throw new Error(lastError || "MANUSCRIPT_MISSING: No manuscript found. Please upload it in your Library before splitting chapters.");
      }

      const split = splitIntoChapters(content);
      if (split.length === 0) {
        setError("Manuscript was empty after parsing.");
        return;
      }
      const next = { ...stepData, chapters: split };
      setStepData(next);
      onMarkEdited("optimize");
      toast({ title: "Manuscript split", description: `Created ${split.length} chapter${split.length === 1 ? "" : "s"}.` });
    } catch (e) {
      setError(toAbbyError(e));
    } finally {
      setLoading(false);
    }
  };

  const updateChapter = (i: number, patch: Partial<Chapter>) => {
    const next = chapters.map((c, idx) => idx === i ? { ...c, ...patch } : c);
    setStepData({ ...stepData, chapters: next });
    onMarkEdited("optimize");
  };

  const removeChapter = (i: number) => {
    const next = chapters.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, index: idx }));
    setStepData({ ...stepData, chapters: next });
    onMarkEdited("optimize");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Pull the manuscript for <strong>{bookTitle || "your book"}</strong> from your library and split it into
          chapter-sized scripts ready for narration.
        </p>
        <Button onClick={optimize} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileAudio className="h-4 w-4 mr-2" />}
          {chapters.length > 0 ? "Re-split manuscript" : "Split Manuscript into Chapters"}
        </Button>
      </div>

      {error && (
        <Card className="p-3 bg-destructive/10 text-destructive text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" /> {error}
        </Card>
      )}

      {chapters.length > 0 && (
        <div className="space-y-2">
          {chapters.map((c, i) => {
            const overCap = c.text.length > CHAR_CAP;
            const expanded = expandedIdx === i;
            return (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{i + 1}</Badge>
                  <Input
                    value={c.title}
                    onChange={(e) => updateChapter(i, { title: e.target.value })}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{c.text.length.toLocaleString()} chars</span>
                  {overCap && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Too long
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setExpandedIdx(expanded ? null : i)}>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeChapter(i)}>Remove</Button>
                </div>
                {expanded && (
                  <div className="mt-3 space-y-2">
                    {overCap && (
                      <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                        Chapters over {CHAR_CAP.toLocaleString()} characters will be truncated by ElevenLabs.
                        Split this chapter into smaller pieces for full coverage.
                      </p>
                    )}
                    <Textarea
                      rows={10}
                      value={c.text}
                      onChange={(e) => updateChapter(i, { text: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
