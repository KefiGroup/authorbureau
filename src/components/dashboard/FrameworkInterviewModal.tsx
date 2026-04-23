import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Sparkles, BookOpen, Trash2, Layers, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FrameworksEditor, { type AuthorFramework } from "./FrameworksEditor";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type BuildMode = "one-each" | "combined";

interface FrameworkInterviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (frameworks: AuthorFramework[], buildMode: BuildMode) => void;
  productType: string;
  bookTitle: string;
  bookId?: string;
}

export default function FrameworkInterviewModal({
  open, onClose, onConfirm, productType, bookTitle, bookId,
}: FrameworkInterviewModalProps) {
  const { user } = useAuth();
  const [frameworks, setFrameworks] = useState<AuthorFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode>("one-each");

  const productLabel = productType.charAt(0).toUpperCase() + productType.slice(1);

  useEffect(() => {
    if (!open || !user) return;
    setExtracted(false);
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("author_profiles" as any)
        .select("frameworks")
        .eq("user_id", user.id)
        .maybeSingle();
      const saved = (data as any)?.frameworks;
      const existing = Array.isArray(saved) ? saved : [];
      setFrameworks(existing);
      setLoading(false);

    })();
  }, [open, user, bookId]);

  const autoExtractFrameworks = async () => {
    setExtracting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-frameworks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookId }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 404) return;
        throw new Error(err.error || "Extraction failed");
      }

      const { frameworks: extracted } = await resp.json();
      if (Array.isArray(extracted) && extracted.length > 0) {
        setFrameworks(extracted);
        setExtracted(true);
        toast.success(`Abby found ${extracted.length} framework${extracted.length > 1 ? "s" : ""} in your book!`);
      }
    } catch (err) {
      console.error("Framework extraction error:", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = async () => {
    if (user) {
      setSaving(true);
      const validFrameworks = frameworks.filter(fw => fw.name.trim());
      await supabase
        .from("author_profiles" as any)
        .update({ frameworks: validFrameworks } as any)
        .eq("user_id", user.id);
      setSaving(false);
      toast.success("Frameworks saved");
      onConfirm(validFrameworks, buildMode);
    } else {
      onConfirm(frameworks, buildMode);
    }
  };

  const handleSkip = () => {
    onConfirm([], "combined");
  };

  const validCount = frameworks.filter(fw => fw.name.trim()).length;
  const showBuildChoice = validCount > 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <DialogTitle className="font-heading text-lg">
              Your Frameworks → {productLabel}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Abby found frameworks in your manuscript. Review them below, then choose how you'd like to build your <strong>{productLabel.toLowerCase()}</strong>.
          </DialogDescription>
        </DialogHeader>

        {loading || extracting ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex items-center gap-2">
              {extracting ? (
                <BookOpen className="h-5 w-5 animate-pulse text-amber-600" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground font-medium">
                {extracting
                  ? "Abby is reading your manuscript to find your unique frameworks…"
                  : "Loading your frameworks…"}
              </span>
            </div>
            {extracting && (
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                This takes 15–30 seconds. Abby analyzes your entire book to identify proprietary theories, methodologies, and step-by-step processes.
              </p>
            )}
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {extracted && frameworks.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-success/10 dark:bg-success/15 border border-success/30 p-3">
                <Sparkles className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-xs text-success">
                  <strong>Abby found {frameworks.length} frameworks.</strong> Edit names/descriptions, or remove any with the <Trash2 className="h-3 w-3 inline text-success" /> icon.
                </p>
              </div>
            )}

            <FrameworksEditor frameworks={frameworks} onChange={setFrameworks} compact autoSave={false} />

            {bookId && frameworks.length === 0 && !extracting && (
              <Button
                variant="outline"
                size="sm"
                onClick={autoExtractFrameworks}
                className="text-xs gap-1"
              >
                <BookOpen className="h-3 w-3" />
                Re-scan manuscript for frameworks
              </Button>
            )}

            {/* Build mode choice — only shown when multiple frameworks */}
            {showBuildChoice && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">How would you like to build?</p>
                <RadioGroup
                  value={buildMode}
                  onValueChange={(v) => setBuildMode(v as BuildMode)}
                  className="gap-3"
                >
                  <div className="flex items-start gap-3 p-3 rounded-md border bg-background hover:border-amber-400 transition-colors cursor-pointer"
                    onClick={() => setBuildMode("one-each")}>
                    <RadioGroupItem value="one-each" id="one-each" className="mt-0.5" />
                    <Label htmlFor="one-each" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-sm">One {productLabel.toLowerCase()} per framework</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Build {validCount} separate {productLabel.toLowerCase()}s — each one deep-dives into a single framework. Great for selling individually.
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-md border bg-background hover:border-amber-400 transition-colors cursor-pointer"
                    onClick={() => setBuildMode("combined")}>
                    <RadioGroupItem value="combined" id="combined" className="mt-0.5" />
                    <Label htmlFor="combined" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-sm">One combined {productLabel.toLowerCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Weave all {validCount} frameworks into a single comprehensive companion {productLabel.toLowerCase()} for your book.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground" disabled={extracting}>
            Skip — build without frameworks
          </Button>
          <Button onClick={handleConfirm} disabled={saving || extracting} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            {validCount > 1 && buildMode === "one-each"
              ? `Build ${validCount} ${productLabel}s`
              : `Build ${productLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
