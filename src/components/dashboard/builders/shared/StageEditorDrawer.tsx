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
import { saveStageOverrideViaFn, saveFunnelCopy } from "@/lib/funnels-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: FunnelStage | null;
  funnelId: string;
  authorId: string;
  /** Status of the parent funnel — drives the "saved → live" vs "saved → draft" toast. */
  funnelStatus?: string | null;
  /** Map of fieldKey → current override (so we know which fields to show "Reset" on). */
  currentOverrides: Record<string, string>;
  onSaved: () => void;
}

/**
 * Field keys on a "page" stage (sales_page / optin_page / application_page / event_page)
 * that map directly to columns on the `funnels` row. Saving these dual-writes so
 * the public landing page actually reflects the edits.
 */
const HERO_PAGE_STAGE_IDS = new Set([
  "sales_page", "optin_page", "application_page", "event_page",
]);
const HERO_FIELD_TO_FUNNEL_COL: Record<string, string> = {
  headline: "headline",
  subheadline: "subheadline",
  body_copy: "body_copy",
  cta_text: "cta_text",
  cta_url: "cta_url",
};

/**
 * One-line guidance shown under each step-editor input. Keyed on field.key
 * so every funnel archetype that reuses the same field gets the same hint.
 */
const FIELD_HINT: Record<string, string> = {
  // Page copy
  headline: "The single biggest promise on the page. Keep it under 12 words.",
  subheadline: "One supporting line that explains *who it's for* and *what they get*.",
  body_copy: "A short paragraph or 3–5 bullets. This is what convinces them to opt in or buy.",
  cta_text: "Action verb + outcome. e.g. 'Get the free guide' beats 'Submit'.",
  cta_url: "Where the button sends them. Leave blank to use the funnel's next step automatically.",
  // Traffic / source
  traffic_source: "Where readers are coming from (email, social, ads). Used to personalise copy.",
  utm_campaign: "A short label so you can tell campaigns apart in your reports.",
  // Checkout
  price_id: "The Stripe price ID for the product being sold (starts with 'price_').",
  product_id: "The Stripe product ID (starts with 'prod_'). Optional if you set price_id.",
  redirect_url: "Where buyers land after a successful payment — usually your Thank-you page.",
  // Thank-you / confirmation
  confirmation_message: "Shown immediately after submission. Set expectations: what arrives next, and when.",
  next_step_url: "Optional next click — e.g. a tripwire offer, calendar booking, or community link.",
  // Email follow-up
  email_subject: "First subject line. Personal, specific, under 50 characters performs best.",
  email_body: "First nurture email. Deliver the promise from the opt-in, then preview what's coming next.",
  // Application / event
  application_questions: "One question per line. Keep it to 3–5 — every extra question drops conversion ~10%.",
  event_date: "Event start in your local timezone. The page will show a live countdown.",
  event_url: "Zoom / livestream link sent to registrants. They'll only see this after they register.",
};

export default function StageEditorDrawer({
  open, onOpenChange, stage, funnelId, authorId, funnelStatus, currentOverrides, onSaved,
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

    let overrideError: string | null = null;
    let funnelWriteError: string | null = null;
    try {
      await saveStageOverrideViaFn({
        funnelId, stageId: stage.id, fields: toPersist,
      });
    } catch (e) {
      overrideError = e instanceof Error ? e.message : String(e);
    }

    // Dual-write: if this is a hero "page" stage, also patch the funnels row so
    // the public landing page actually shows the updated copy.
    if (!overrideError && HERO_PAGE_STAGE_IDS.has(stage.id)) {
      const patch: Record<string, string> = {};
      for (const [fieldKey, col] of Object.entries(HERO_FIELD_TO_FUNNEL_COL)) {
        if (overridden[fieldKey]) patch[col] = values[fieldKey] ?? "";
      }
      if (Object.keys(patch).length > 0) {
        try {
          await saveFunnelCopy(funnelId, patch as Parameters<typeof saveFunnelCopy>[1]);
        } catch (e) {
          funnelWriteError = e instanceof Error ? e.message : String(e);
        }
      }
    }

    setSaving(false);
    if (overrideError || funnelWriteError) {
      toast({
        title: "Couldn't save changes",
        description: overrideError || funnelWriteError || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    const isHeroStage = HERO_PAGE_STAGE_IDS.has(stage.id);
    if (isHeroStage && funnelStatus === "live") {
      toast({ title: "Saved — changes are live", description: `${stage.label} updated on your public page.` });
    } else if (isHeroStage) {
      toast({ title: "Saved to draft", description: `${stage.label} updated. Publish the funnel to make it live.` });
    } else {
      toast({ title: "Stage updated", description: `${stage.label} saved.` });
    }
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
