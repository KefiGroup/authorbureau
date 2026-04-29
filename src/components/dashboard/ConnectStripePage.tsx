import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, DollarSign, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStripeConnect } from "@/components/dashboard/StripeConnectBanner";

const steps = [
  {
    icon: CreditCard,
    title: "Connect Stripe",
    description:
      "Click below to securely connect your Stripe account. If you don't have one, Stripe will help you create one in minutes.",
  },
  {
    icon: DollarSign,
    title: "Set Your Prices",
    description:
      "Once connected, set prices for your courses, workbooks, coaching sessions, and other products.",
  },
  {
    icon: Zap,
    title: "Start Earning",
    description:
      "Products on your microsite will have a 'Buy Now' button. Readers pay Authors Bureau, we keep an 8% platform fee (covers Stripe and other payment-gateway processing), and your 92% share is paid out monthly by Authors Bureau to your connected Stripe account.",
  },
];

export default function ConnectStripePage() {
  const { connected, onboarding_complete, loading, startOnboarding } = useStripeConnect();
  const [starting, setStarting] = useState(false);

  const handleConnect = async () => {
    setStarting(true);
    try {
      await startOnboarding();
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mx-auto mb-2">
          <CreditCard className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="font-heading text-3xl font-bold">Connect Your Payment Account</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Readers pay Authors Bureau at checkout. We keep an 8% platform fee (covers Stripe and other payment-gateway processing) and pay out the remaining 92% monthly by Authors Bureau to your connected Stripe account.
        </p>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto pt-1">
          You can publish your products to your microsite at any time — Stripe is only needed when a reader wants to buy.
        </p>
      </div>

      {/* Status */}
      {onboarding_complete && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-accent shrink-0" />
          <div>
            <p className="font-semibold text-sm">Payments Active</p>
            <p className="text-xs text-muted-foreground">Your Stripe account is connected and ready to accept payments.</p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="grid gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={i} className="border">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/10 shrink-0">
                  <span className="text-sm font-bold text-secondary">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5 text-secondary" />
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  {i === 0 && !onboarding_complete && (
                    <Button
                      className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      size="lg"
                      onClick={handleConnect}
                      disabled={starting}
                    >
                      {starting ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Connecting...</>
                      ) : (
                        "Connect with Stripe →"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trust box */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Stripe is the world's most trusted payment platform. Your financial data is never stored on Authors Bureau — it goes directly to Stripe.
        </p>
      </div>
    </div>
  );
}
