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
import { Loader2, RotateCcw, Sparkles, CheckCircle2, AlertTriangle, ExternalLink, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FunnelStage } from "@/lib/funnel-flow-stages";
import { saveStageOverrideViaFn, saveFunnelCopy } from "@/lib/funnels-api";
import { supabase } from "@/integrations/supabase/client";

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
  /** Funnel's node_id — used by the Checkout stage to look up product + Stripe status. */
  nodeId?: string | null;
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
  redirect_url: "This is where buyers land after payment. Your thank-you page is pre-set — only change if you have a custom page.",
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
  open, onOpenChange, stage, funnelId, authorId, funnelStatus, currentOverrides, nodeId, onSaved,
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

        {stage.id === "checkout" && (
          <CheckoutStagePanel authorId={authorId} nodeId={nodeId ?? null} />
        )}

        <div className="mt-6 space-y-5">
          {stage.fields.map((f) => {
            const isOverridden = overridden[f.key];
            const baseStr = f.baseValue == null ? "" : String(f.baseValue);
            const showResetLink = isOverridden && baseStr.length > 0;
            const hint = FIELD_HINT[f.key];
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
                {hint && (
                  <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
                    {hint}
                  </p>
                )}
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

// =====================================================================
// CheckoutStagePanel — Stripe-aware header for the Checkout funnel stage
// =====================================================================
interface CheckoutPanelProps {
  authorId: string;
  nodeId: string | null;
}

function formatPrice(price: number | null | undefined, currency?: string | null): string {
  if (price == null || isNaN(Number(price))) return "—";
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(price));
  } catch {
    return `$${Number(price).toFixed(2)} ${cur}`;
  }
}

function CheckoutStagePanel({ authorId, nodeId }: CheckoutPanelProps) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    price_usd: number | null;
    currency: string | null;
    stripe_price_id: string | null;
  } | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [nodeRes, profileRes] = await Promise.all([
          nodeId
            ? supabase
                .from("author_nodes")
                .select("id, node_name, personalised_name, price_usd, currency, stripe_price_id")
                .eq("author_id", authorId)
                .eq("node_id", nodeId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null } as any),
          supabase
            .from("author_profiles")
            .select("stripe_connected_account_id, stripe_onboarding_complete")
            .eq("id", authorId)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        if (nodeRes?.data) {
          const row: any = nodeRes.data;
          setProduct({
            id: row.id,
            name: row.personalised_name || row.node_name || "Your product",
            price_usd: row.price_usd ?? null,
            currency: row.currency ?? "USD",
            stripe_price_id: row.stripe_price_id ?? null,
          });
        } else {
          setProduct(null);
        }
        const prof: any = profileRes?.data;
        setStripeConnected(Boolean(prof?.stripe_connected_account_id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authorId, nodeId]);

  const handleTestCheckout = async () => {
    if (!product) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { author_node_id: product.id },
      });
      if (error) throw error;
      if (data?.error === "AUTHOR_PAYMENTS_NOT_SET_UP") {
        toast({
          title: "Stripe not connected yet",
          description: "Connect Stripe first to test checkout.",
          variant: "destructive",
        });
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (e) {
      toast({
        title: "Couldn't open test checkout",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/20 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading checkout details…
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      {stripeConnected ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Your Stripe Checkout is ready</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Readers can pay securely. Authors Bureau handles the transaction.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-semibold">Connect Stripe first to activate this checkout</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Without Stripe connected, the Buy Now button cannot accept payments.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="mt-3 w-full">
            <a href="/dashboard?section=connect-stripe">Connect Stripe</a>
          </Button>
        </div>
      )}

      {/* Product summary */}
      {product ? (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Product</p>
              <p className="text-sm font-semibold truncate">{product.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Price</p>
              <p className="text-sm font-semibold">{formatPrice(product.price_usd, product.currency)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <a
              href="/dashboard?section=brand-products"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" /> Edit price
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestCheckout}
              disabled={testing || !stripeConnected}
              title={!stripeConnected ? "Connect Stripe first" : "Open Stripe checkout in a new tab"}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test this checkout
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
          No product is linked to this funnel yet. Create or assign a product to enable checkout.
        </div>
      )}

      {/* Plain-English explanation */}
      <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/20 rounded-md p-3 border">
        When a reader clicks "Buy Now" on your sales page, they're taken to a secure Stripe checkout page.
        After payment, they're redirected to your Thank You page. Authors Bureau keeps 8% and pays you 92%
        on Stripe's standard schedule.
      </p>
    </div>
  );
}
