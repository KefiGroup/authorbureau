import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toAbbyError } from "@/lib/abby-error";

interface Props {
  authorId: string | null;
  bookId: string | null;
  bookTitle?: string;
  /** Called after BP-00 analysis succeeds — the parent should retry its generator. */
  onAnalysed: () => void;
}

/**
 * Shown inside any builder when its generator returns `status: "context_blocked"`.
 * One click → runs `generate-bp00-analysis` for the active book → re-invokes
 * the parent's generator. Prevents content from leaking between an author's books.
 */
export default function AnalyseBookGate({ authorId, bookId, bookTitle, onAnalysed }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    if (!authorId || !bookId) {
      setError("Missing author or book reference. Please reload the page.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp00-analysis", {
        body: { author_id: authorId, book_id: bookId },
      });
      if (fnErr || !data?.success) {
        throw new Error(data?.error || fnErr?.message || "Analysis failed");
      }
      toast.success("Book analysis complete", { description: "Generating your content now…" });
      onAnalysed();
    } catch (e: any) {
      setError(toAbbyError(e?.message || "Analysis failed"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-amber-200/60 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">Analyse this book first</h3>
            <p className="text-sm text-muted-foreground">
              Before I can generate content for{" "}
              <span className="font-medium text-foreground">
                {bookTitle ? `'${bookTitle}'` : "this book"}
              </span>
              , I need to study it. This takes about 30 seconds and unlocks every revenue stream
              for this specific book — without leaking ideas from your other books.
            </p>
          </div>
        </div>
        <Button
          onClick={handleAnalyse}
          disabled={running || !bookId}
          className="w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {running ? "Analysing your book…" : "Analyse this book"}
        </Button>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
