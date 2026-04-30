import { useEffect, useState } from "react";
import { Wallet, Loader2, CheckCircle2, AlertCircle, Zap, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePayoutReadiness, type PayoutMethod } from "@/hooks/usePayoutReadiness";
import { toast } from "sonner";

const COUNTRIES = [
  "Singapore", "United States", "United Kingdom", "Australia", "Canada", "India", "Philippines",
  "Malaysia", "Indonesia", "Vietnam", "Thailand", "Japan", "South Korea", "Hong Kong",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico", "South Africa",
  "Nigeria", "Kenya", "United Arab Emirates", "New Zealand", "Other",
];

export default function PayoutsSettings() {
  const { user } = useAuth();
  const { ready, stripe_onboarding_complete, refresh } = usePayoutReadiness();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const [method, setMethod] = useState<PayoutMethod>("wise");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
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
        .select("payout_method, wise_recipient, paypal_email_v2, tax_self_declared_at, refund_window_days")
        .eq("author_id", profile.id).maybeSingle();
      if (s) {
        setMethod((s.payout_method as PayoutMethod) || "wise");
        const wr = (s.wise_recipient as Record<string, string> | null) || null;
        if (wr) {
          setLegalName(wr.legal_name || "");
          setCountry(wr.country || "");
          setBankAccount(wr.bank_account || "");
          setWiseEmail(wr.wise_email || "");
        }
        setPaypalEmail(s.paypal_email_v2 || "");
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
          await supabase.functions.invoke("stripe-connect", { body: { action: "status" } });
        } catch { /* non-fatal */ }
        await refresh();
        toast.success("Stripe Express onboarding completed.");
        // Clean the URL so refreshes don't re-trigger this.
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
      // Audit #3: tell the edge function which page to return to so the
      // author lands back on the same page (dashboard OR account settings).
      const returnPath = window.location.pathname + window.location.search;
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "onboard", return_path: returnPath },
      });
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
    if (method === "wise" && (!legalName || !country || (!bankAccount && !wiseEmail))) {
      toast.error("Fill legal name, country, and either a bank account OR a Wise email.");
      return;
    }
    if (method === "paypal" && !paypalEmail) {
      toast.error("Enter your PayPal email.");
      return;
    }
    if (method === "stripe" && !stripe_onboarding_complete) {
      toast.error("Click 'Connect Stripe Express' below first to finish your account onboarding.");
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
        payout_method: method,
        wise_recipient: method === "wise"
          ? { legal_name: legalName, country, bank_account: bankAccount, wise_email: wiseEmail }
          : null,
        paypal_email_v2: method === "paypal" ? paypalEmail : null,
        tax_self_declared_at: agreementAck ? new Date().toISOString() : null,
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
            Authors Bureau collects all reader payments and pays you 92% on the 1st of each month (minimum US$50).
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
        <CardHeader><CardTitle>Choose payout method</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as PayoutMethod)}>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setMethod("stripe")}>
              <RadioGroupItem value="stripe" id="m-stripe" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-stripe" className="font-semibold cursor-pointer flex items-center gap-2">
                  Stripe Express <Badge variant="outline" className="text-[10px] border-secondary/40 text-secondary">Auto</Badge>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Automatic transfer to your bank on the 1st. No CSV, no waiting. Available in 45+ countries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setMethod("wise")}>
              <RadioGroupItem value="wise" id="m-wise" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-wise" className="font-semibold cursor-pointer">Wise</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Lowest FX fees, paid in your local currency. Manual processing — works in 160+ countries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setMethod("paypal")}>
              <RadioGroupItem value="paypal" id="m-paypal" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-paypal" className="font-semibold cursor-pointer">PayPal</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Familiar, but higher FX fees. Use if Wise/Stripe aren't available where you are.</p>
              </div>
            </div>
          </RadioGroup>

          {method === "stripe" && (
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
          )}

          {method === "wise" && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label>Legal name (must match bank account)</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Pauline Teo" />
              </div>
              <div>
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bank account number / IBAN <span className="text-xs text-muted-foreground">(or use Wise email below)</span></Label>
                <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account / IBAN" />
              </div>
              <div>
                <Label>Wise email <span className="text-xs text-muted-foreground">(if you have a Wise account)</span></Label>
                <Input type="email" value={wiseEmail} onChange={(e) => setWiseEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
          )}

          {method === "paypal" && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label>PayPal email</Label>
                <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payout Agreement</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 mb-4 p-3 rounded-lg bg-muted/40 border text-muted-foreground">
            <p>By accepting, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Authors Bureau (For Multiplier Pte Ltd, Singapore)</strong> acts as Merchant of Record. We collect all reader payments through our Stripe account and remit your share monthly.</li>
              <li>Authors Bureau retains an <strong className="text-foreground">8% platform fee</strong> on gross sales (covers AI generation, hosting, email delivery and payment-processing overhead). Stripe's processing fees are passed through at cost. You receive the remainder.</li>
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

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save payout settings"}
        </Button>
      </div>
    </div>
  );
}
