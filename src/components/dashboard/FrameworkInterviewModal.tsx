import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Sparkles, BookOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FrameworksEditor, { type AuthorFramework } from "./FrameworksEditor";
import { toast } from "sonner";

interface FrameworkInterviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (frameworks: AuthorFramework[]) => void;
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

      // If no frameworks saved and we have a bookId, auto-extract from manuscript
      if (existing.length === 0 && bookId) {
        autoExtractFrameworks();
      }
    })();
  }, [open, user]);

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
        if (resp.status === 404) {
          // No manuscript — silently skip
          return;
        }
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
      // Non-critical — author can still add manually
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
      toast.success("Frameworks saved for future generations");
      onConfirm(validFrameworks);
    } else {
      onConfirm(frameworks);
    }
  };

  const handleSkip = () => {
    onConfirm([]);
  };

  const productLabel = productType.charAt(0).toUpperCase() + productType.slice(1);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <DialogTitle className="font-heading text-lg">
              Abby's Pre-Build Interview
            </DialogTitle>
          </div>
           <DialogDescription className="text-sm">
            Abby found the frameworks below in your manuscript. <strong>Remove any that aren't relevant</strong> to this {productLabel} — typically 1–2 core frameworks work best. Use the trash icon to remove, or edit names and descriptions as needed.
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
          <div className="py-2 space-y-3">
            {extracted && frameworks.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Abby found {frameworks.length} frameworks</strong> — you probably only need <strong>1–2</strong> for this {productLabel}. Remove the ones that aren't central to this product using the <Trash2 className="h-3 w-3 inline text-amber-700" /> icon.
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
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground" disabled={extracting}>
            Skip — generate without frameworks
          </Button>
          <Button onClick={handleConfirm} disabled={saving || extracting} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Apply Frameworks & Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
