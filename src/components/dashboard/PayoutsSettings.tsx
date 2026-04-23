import { useEffect, useState } from "react";
import { Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
import { usePayoutReadiness } from "@/hooks/usePayoutReadiness";
import { toast } from "sonner";

const COUNTRIES = [
  "Singapore", "United States", "United Kingdom", "Australia", "Canada", "India", "Philippines",
  "Malaysia", "Indonesia", "Vietnam", "Thailand", "Japan", "South Korea", "Hong Kong",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico", "South Africa",
  "Nigeria", "Kenya", "United Arab Emirates", "New Zealand", "Other",
];

export default function PayoutsSettings() {
  const { user } = useAuth();
  const { ready, refresh } = usePayoutReadiness();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [method, setMethod] = useState<"wise" | "paypal">("wise");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [taxAck, setTaxAck] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("author_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) { setLoading(false); return; }
      setAuthorId(profile.id);
      const { data: s } = await supabase
        .from("author_payout_settings")
        .select("payout_method, wise_recipient, paypal_email_v2, tax_self_declared_at")
        .eq("author_id", profile.id).maybeSingle();
      if (s) {
        setMethod((s.payout_method as "wise" | "paypal") || "wise");
        const wr = (s.wise_recipient as Record<string, string> | null) || null;
        if (wr) {
          setLegalName(wr.legal_name || "");
          setCountry(wr.country || "");
          setBankAccount(wr.bank_account || "");
          setWiseEmail(wr.wise_email || "");
        }
        setPaypalEmail(s.paypal_email_v2 || "");
        setTaxAck(!!s.tax_self_declared_at);
      }
      setLoading(false);
    })();
  }, [user]);

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
    if (!taxAck) {
      toast.error("Please acknowledge the tax self-declaration.");
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
        tax_self_declared_at: taxAck ? new Date().toISOString() : null,
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
            Authors Bureau collects all payments and pays you monthly (1st of month, minimum US$50).
          </p>
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          {ready ? (
            <Badge className="bg-accent/15 text-accent border-accent/30"><CheckCircle2 className="h-3 w-3 mr-1" />Ready to publish paid</Badge>
          ) : (
            <Badge variant="outline" className="border-orange-300 text-orange-700"><AlertCircle className="h-3 w-3 mr-1" />Setup incomplete</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Choose payout method</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as "wise" | "paypal")}>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setMethod("wise")}>
              <RadioGroupItem value="wise" id="m-wise" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-wise" className="font-semibold cursor-pointer">Wise (recommended)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Lowest fees, paid in your local currency. Works in 160+ countries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setMethod("paypal")}>
              <RadioGroupItem value="paypal" id="m-paypal" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-paypal" className="font-semibold cursor-pointer">PayPal</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Instant, but higher FX fees. Use if Wise isn't available where you are.</p>
              </div>
            </div>
          </RadioGroup>

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
        <CardHeader><CardTitle>Tax declaration</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={taxAck} onCheckedChange={(v) => setTaxAck(!!v)} className="mt-1" />
            <span className="text-sm">
              I understand that Authors Bureau (For Multiplier Pte Ltd, Singapore) will pay me net royalties, and <strong>I am responsible for declaring and paying income tax in my own country</strong>. Authors Bureau will provide an annual earnings statement each January.
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
