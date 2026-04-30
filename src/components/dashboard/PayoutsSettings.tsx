import { useEffect, useState } from "react";
import { Wallet, Loader2, CheckCircle2, AlertCircle, Zap, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePayoutReadiness, type PayoutMethod } from "@/hooks/usePayoutReadiness";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callStripeConnect(body: Record<string, unknown>): Promise<{ data: any; error: Error | null }> {
  try {
    const token = await getActiveToken();
    if (!token) return { data: null, error: new Error("Not signed in") };
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/stripe-connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: new Error(json?.error || `HTTP ${res.status}`) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export default function PayoutsSettings() {
  const { user } = useAuth();
  const { ready, stripe_onboarding_complete, refresh } = usePayoutReadiness();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const [agreementAck, setAgreementAck] = useState(false);
  const [refundWindow, setRefundWindow] = useState<number>(14);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("author_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) { setLoading(false); return; }
      setAuthorId(profile.id);
      const { data: s } = await supabase
        .from("author_payout_settings")
        .select("tax_self_declared_at, refund_window_days")
        .eq("author_id", profile.id).maybeSingle();
      if (s) {
        setAgreementAck(!!s.tax_self_declared_at);
        if (typeof (s as { refund_window_days?: number }).refund_window_days === "number") {
          setRefundWindow((s as { refund_window_days?: number }).refund_window_days || 14);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  // Audit #3: when Stripe redirects back with ?stripe_connected=true, auto-refresh
  // status so the green "connected" state appears without a manual reload.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_connected") === "true") {
      (async () => {
        try {
          await callStripeConnect({ action: "status" });
        } catch { /* non-fatal */ }
        await refresh();
        toast.success("Stripe Express onboarding completed.");
        params.delete("stripe_connected");
        params.delete("stripe_refresh");
        const qs = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      })();
    }
  }, [refresh]);

  const connectStripe = async () => {
    setConnectingStripe(true);
    try {
      const returnPath = window.location.pathname + window.location.search;
      const { data, error } = await callStripeConnect({ action: "onboard", return_path: returnPath });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start Stripe onboarding");
    } finally {
      setConnectingStripe(false);
    }
  };

  const save = async () => {
    if (!authorId) return;
    if (!stripe_onboarding_complete) {
      toast.error("Click 'Connect Stripe Express' above first to finish your account onboarding.");
      return;
    }
    if (!agreementAck) {
      toast.error("Please accept the Payout Agreement to continue.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        author_id: authorId,
        payout_method: "stripe" as PayoutMethod,
        paypal_email_v2: null,
        tax_self_declared_at: agreementAck ? new Date().toISOString() : null,
        refund_window_days: refundWindow,
      };
      const { error } = await supabase
        .from("author_payout_settings")
        .upsert(payload, { onConflict: "author_id" });
      if (error) throw error;
      toast.success("Payout settings saved");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-secondary" /> Payouts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Authors Bureau collects all reader payments and pays you 92% on the 1st of each month (minimum US$50). Connect Stripe Express below — fully automated, no manual steps.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          {ready ? (
            <Badge className="bg-accent/15 text-accent border-accent/30"><CheckCircle2 className="h-3 w-3 mr-1" />Payouts ready</Badge>
          ) : (
            <Badge variant="outline" className="border-orange-300 text-orange-700"><AlertCircle className="h-3 w-3 mr-1" />Setup incomplete</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Payout method</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20">
            <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">
                Stripe Express <Badge variant="outline" className="text-[10px] border-secondary/40 text-secondary">Recommended · Auto</Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Direct deposit to your bank on the 1st of each month. Available in 45+ countries (including the US, Singapore, Australia and New Zealand). Authors Bureau covers all transfer fees.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            {stripe_onboarding_complete ? (
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-accent/10 border border-accent/30">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span className="font-medium">Stripe Express connected — payouts will transfer automatically on the 1st.</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  You'll be redirected to Stripe to verify your identity and bank account. Takes about 3 minutes.
                </p>
                <Button onClick={connectStripe} disabled={connectingStripe} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {connectingStripe ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Opening Stripe…</> : <><Zap className="h-4 w-4 mr-2" />Connect Stripe Express<ExternalLink className="h-3 w-3 ml-1.5" /></>}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payout Agreement</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 mb-4 p-3 rounded-lg bg-muted/40 border text-muted-foreground">
            <p>By accepting, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Authors Bureau (For Multiplier Pte Ltd, Singapore)</strong> acts as Merchant of Record. We collect all reader payments through our Stripe account and remit your share monthly.</li>
              <li>Authors Bureau retains an <strong className="text-foreground">8% platform fee</strong> to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. <strong className="text-foreground">You keep 92% of every sale.</strong></li>
              <li>Payouts are made on the <strong className="text-foreground">1st of each month</strong> for the previous calendar month, provided your balance is at least <strong className="text-foreground">US$50</strong>.</li>
              <li>You are <strong className="text-foreground">solely responsible for declaring and paying income tax</strong> in your country of residence. Authors Bureau will email you an annual earnings statement each January.</li>
              <li>Refunds issued within the buyer's refund window are deducted from your earnings; chargebacks may also be reversed.</li>
              <li>This agreement may be updated; continued use of payouts constitutes acceptance.</li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreementAck} onCheckedChange={(v) => setAgreementAck(!!v)} className="mt-1" />
            <span className="text-sm">
              I have read and accept the <strong>Authors Bureau Payout Agreement</strong> above, including the 8% platform fee, monthly payout schedule, and my responsibility for declaring and paying my own income taxes.
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refund Window</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Earnings become available for payout after this period to allow for refund processing.
          </p>
          <Select value={String(refundWindow)} onValueChange={(v) => setRefundWindow(Number(v))}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days (recommended)</SelectItem>
              <SelectItem value="21">21 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save payout settings"}
        </Button>
      </div>
    </div>
  );
}
