import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FrameworksEditor, { type AuthorFramework } from "./FrameworksEditor";
import { toast } from "sonner";

interface FrameworkInterviewModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the frameworks to use for this generation */
  onConfirm: (frameworks: AuthorFramework[]) => void;
  productType: string;
  bookTitle: string;
}

export default function FrameworkInterviewModal({
  open, onClose, onConfirm, productType, bookTitle,
}: FrameworkInterviewModalProps) {
  const { user } = useAuth();
  const [frameworks, setFrameworks] = useState<AuthorFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("author_profiles" as any)
        .select("frameworks")
        .eq("user_id", user.id)
        .maybeSingle();
      const saved = (data as any)?.frameworks;
      setFrameworks(Array.isArray(saved) ? saved : []);
      setLoading(false);
    })();
  }, [open, user]);

  const handleConfirm = async () => {
    // Save frameworks to profile for future use
    if (user) {
      setSaving(true);
      // Filter out empty frameworks
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
            Before generating your <strong>{productLabel}</strong> for "<strong>{bookTitle}</strong>", tell Abby about your unique frameworks and theories. This ensures the generated content reflects <em>your</em> methodology, not generic advice.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading your frameworks…</span>
          </div>
        ) : (
          <div className="py-2">
            <FrameworksEditor frameworks={frameworks} onChange={setFrameworks} compact autoSave={false} />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip — generate without frameworks
          </Button>
          <Button onClick={handleConfirm} disabled={saving} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Apply Frameworks & Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
