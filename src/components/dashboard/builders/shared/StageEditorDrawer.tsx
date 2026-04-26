/**
 * Side drawer for editing a single funnel stage.
 * Shows ABBY's baseline value as placeholder; per-field "Reset to ABBY's version"
 * link removes the override for that field.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FunnelStage } from "@/lib/funnel-flow-stages";
import { saveStageOverride } from "@/lib/funnel-overrides";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: FunnelStage | null;
  funnelId: string;
  authorId: string;
  /** Map of fieldKey → current override (so we know which fields to show "Reset" on). */
  currentOverrides: Record<string, string>;
  onSaved: () => void;
}

export default function StageEditorDrawer({
  open, onOpenChange, stage, funnelId, authorId, currentOverrides, onSaved,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [overridden, setOverridden] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!stage) return;
    const v: Record<string, string> = {};
    const o: Record<string, boolean> = {};
    for (const f of stage.fields) {
      v[f.key] = stage.values[f.key] ?? "";
      o[f.key] = currentOverrides[f.key] !== undefined;
    }
    setValues(v);
    setOverridden(o);
  }, [stage, currentOverrides]);

  if (!stage) return null;

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setOverridden((prev) => ({ ...prev, [key]: true }));
  };

  const handleResetField = (key: string) => {
    const baseVal = stage.fields.find((f) => f.key === key)?.baseValue;
    setValues((prev) => ({ ...prev, [key]: baseVal == null ? "" : String(baseVal) }));
    setOverridden((prev) => ({ ...prev, [key]: false }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Only persist fields the author has actively overridden.
    const toPersist: Record<string, string> = {};
    for (const f of stage.fields) {
      if (overridden[f.key]) toPersist[f.key] = values[f.key] ?? "";
    }
    const { error } = await saveStageOverride({
      funnelId, authorId, stageId: stage.id, fields: toPersist,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Stage updated", description: `${stage.label} saved.` });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{stage.label}</SheetTitle>
          <SheetDescription>{stage.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {stage.fields.map((f) => {
            const isOverridden = overridden[f.key];
            const baseStr = f.baseValue == null ? "" : String(f.baseValue);
            const showResetLink = isOverridden && baseStr.length > 0;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold">{f.label}</Label>
                  {showResetLink && (
                    <button
                      type="button"
                      onClick={() => handleResetField(f.key)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to ABBY's version
                    </button>
                  )}
                </div>
                {f.type === "textarea" ? (
                  <Textarea
                    rows={f.rows ?? 4}
                    value={values[f.key] ?? ""}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder ?? baseStr ?? ""}
                  />
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder ?? baseStr ?? ""}
                  />
                )}
                {!isOverridden && baseStr && (
                  <p className="mt-1 text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Using ABBY's generated value
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
