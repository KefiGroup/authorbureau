import { useState, useEffect, useCallback } from "react";
import { Loader2, Wallet, CreditCard, DollarSign, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PayoutMethod = "stripe" | "paypal" | "wise";

interface PayoutSettings {
  payout_method: PayoutMethod;
  paypal_email: string;
  wise_email: string;
  wise_account_number: string;
  wise_routing_number: string;
  wise_currency: string;
  refund_window_days: number;
}

const DEFAULT_SETTINGS: PayoutSettings = {
  payout_method: "stripe",
  paypal_email: "",
  wise_email: "",
  wise_account_number: "",
  wise_routing_number: "",
  wise_currency: "USD",
  refund_window_days: 14,
};

const PAYOUT_OPTIONS: { value: PayoutMethod; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: "stripe", label: "Stripe", icon: CreditCard, description: "Direct transfer to your connected Stripe account. Fastest option." },
  { value: "paypal", label: "PayPal", icon: DollarSign, description: "Payout sent to your PayPal email. Available worldwide." },
  { value: "wise", label: "Wise", icon: Globe, description: "Bank transfer via Wise. Best rates for international authors." },
];

export default function PayoutSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PayoutSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStripeConnect, setHasStripeConnect] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      // Resolve author_profiles.id — this is the canonical key used by
      // author_payout_settings.author_id, the readiness hook, and all payout jobs.
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, stripe_onboarding_complete")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile?.id) {
        setProfileMissing(true);
        return;
      }
      setProfileId(profile.id);
      setHasStripeConnect(!!profile.stripe_onboarding_complete);

      // Load payout settings keyed on the profile id (NOT the auth user id).
      const { data } = await supabase
        .from("author_payout_settings" as any)
        .select("*")
        .eq("author_id", profile.id)
        .maybeSingle();

      if (data) {
        const d = data as any;
        // Prefer v2 columns (used by usePayoutReadiness + payout jobs); fall
        // back to legacy columns for any pre-fix rows.
        const wiseFromRecipient = d.wise_recipient || {};
        setSettings({
          payout_method: d.payout_method || "stripe",
          paypal_email: d.paypal_email_v2 || d.paypal_email || "",
          wise_email: wiseFromRecipient.email || d.wise_email || "",
          wise_account_number: wiseFromRecipient.account_number || d.wise_account_number || "",
          wise_routing_number: wiseFromRecipient.routing_number || d.wise_routing_number || "",
          wise_currency: wiseFromRecipient.currency || d.wise_currency || "USD",
          refund_window_days: d.refund_window_days || 14,
        });
      }
    } catch (err) {
      console.error("Failed to load payout settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    loadSettings();
  }, [user?.id, loadSettings]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!profileId) {
      toast.error("Author profile not found. Please complete your profile first.");
      return;
    }

    // Validation
    if (settings.payout_method === "stripe" && !hasStripeConnect) {
      // Non-blocking: allow saving Stripe as the chosen method; payouts will
      // simply remain pending until Stripe Connect onboarding is completed.
      toast.warning("Stripe selected. Complete Stripe Connect onboarding to receive payouts.");
    }
    if (settings.payout_method === "paypal" && !settings.paypal_email) {
      toast.error("Please enter your PayPal email");
      return;
    }
    if (settings.payout_method === "wise" && !settings.wise_email) {
      toast.error("Please enter your Wise email");
      return;
    }

    setSaving(true);
    try {
      // Persist to BOTH legacy and v2 columns so old admin views keep working
      // and the readiness hook + payout jobs (which read v2) see the data.
      const wiseRecipient =
        settings.payout_method === "wise"
          ? {
              email: settings.wise_email || null,
              account_number: settings.wise_account_number || null,
              routing_number: settings.wise_routing_number || null,
              currency: settings.wise_currency || "USD",
            }
          : null;

      const payload = {
        author_id: profileId,
        payout_method: settings.payout_method,
        paypal_email: settings.paypal_email || null,
        paypal_email_v2: settings.paypal_email || null,
        wise_email: settings.wise_email || null,
        wise_account_number: settings.wise_account_number || null,
        wise_routing_number: settings.wise_routing_number || null,
        wise_currency: settings.wise_currency,
        wise_recipient: wiseRecipient,
        refund_window_days: settings.refund_window_days,
      };

      const { error } = await supabase
        .from("author_payout_settings" as any)
        .upsert(payload as any, { onConflict: "author_id" });

      if (error) throw error;
      toast.success("Payout settings saved!");
    } catch (err) {
      console.error("Failed to save payout settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <h1 className="font-heading text-2xl font-bold">Complete your author profile first</h1>
        <p className="text-muted-foreground">
          Set up your Author Profile before configuring payouts. Visit Author Profile in the sidebar to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mx-auto mb-2">
          <Wallet className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="font-heading text-3xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose how you'd like to receive your earnings. You keep 92% of every sale.
        </p>
      </div>

      {/* Payout Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Method</CardTitle>
          <CardDescription>Select your preferred way to receive payments</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.payout_method}
            onValueChange={(v) => setSettings(s => ({ ...s, payout_method: v as PayoutMethod }))}
            className="space-y-3"
          >
            {PAYOUT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = settings.payout_method === opt.value;
              const needsStripeConnect = opt.value === "stripe" && !hasStripeConnect;

              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <RadioGroupItem value={opt.value} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-secondary" />
                      <span className="font-semibold">{opt.label}</span>
                      {opt.value === "stripe" && hasStripeConnect && (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                    {needsStripeConnect && (
                      <p className="text-xs text-muted-foreground mt-1">
                        You can select Stripe now. Payouts will start once you complete Stripe Connect onboarding.
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* PayPal Details */}
      {settings.payout_method === "paypal" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PayPal Details</CardTitle>
            <CardDescription>Enter the PayPal email where you want to receive payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal-email">PayPal Email</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your@paypal-email.com"
                value={settings.paypal_email}
                onChange={(e) => setSettings(s => ({ ...s, paypal_email: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wise Details */}
      {settings.payout_method === "wise" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wise Details</CardTitle>
            <CardDescription>Enter your Wise account information for bank transfers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wise-email">Wise Account Email</Label>
              <Input
                id="wise-email"
                type="email"
                placeholder="your@wise-email.com"
                value={settings.wise_email}
                onChange={(e) => setSettings(s => ({ ...s, wise_email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wise-account">Account Number (optional)</Label>
                <Input
                  id="wise-account"
                  placeholder="Account number"
                  value={settings.wise_account_number}
                  onChange={(e) => setSettings(s => ({ ...s, wise_account_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wise-routing">Routing Number (optional)</Label>
                <Input
                  id="wise-routing"
                  placeholder="Routing number"
                  value={settings.wise_routing_number}
                  onChange={(e) => setSettings(s => ({ ...s, wise_routing_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wise-currency">Preferred Currency</Label>
              <Select
                value={settings.wise_currency}
                onValueChange={(v) => setSettings(s => ({ ...s, wise_currency: v }))}
              >
                <SelectTrigger id="wise-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                  <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                  <SelectItem value="SGD">SGD — Singapore Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Window */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Refund Window</CardTitle>
          <CardDescription>
            Earnings become available for payout after this period to allow for refund processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(settings.refund_window_days)}
            onValueChange={(v) => setSettings(s => ({ ...s, refund_window_days: Number(v) }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days (recommended)</SelectItem>
              <SelectItem value="21">21 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Separator />

      {/* Save */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Payout Settings"}
        </Button>
      </div>
    </div>
  );
}
