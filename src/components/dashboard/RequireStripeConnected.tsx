import { useState } from "react";
import { Loader2, CreditCard, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStripeConnect } from "@/components/dashboard/StripeConnectBanner";

interface Props {
  /** Children render only when Stripe onboarding is complete. */
  children: React.ReactNode;
  /** Override the modal title (e.g. "Connect Stripe to publish your workbook") */
  title?: string;
  /** Override the modal body copy */
  description?: string;
  /** Render a soft preview underneath the gate even when locked (default false) */
  showLockedPreview?: boolean;
}

/**
 * Guard wrapper for commerce node builders (BP-06 → BP-09).
 * When the author has not completed Stripe Connect onboarding, replaces children
 * with a blocking modal + connect CTA. Once connected, renders children normally.
 */
export default function RequireStripeConnected({
  children,
  title = "Connect Stripe to start selling",
  description = "Before you can publish a paid product, connect your Stripe account so payments flow directly to you.",
  showLockedPreview = false,
}: Props) {
  const { onboarding_complete, loading, startOnboarding } = useStripeConnect();
  const [starting, setStarting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (onboarding_complete) {
    return <>{children}</>;
  }

  const handleConnect = async () => {
    setStarting(true);
    try {
      await startOnboarding();
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      {showLockedPreview ? (
        <div className="relative pointer-events-none opacity-40 select-none">{children}</div>
      ) : null}
      <Dialog open={!dismissed}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 mx-auto mb-3">
              <CreditCard className="h-6 w-6 text-secondary" />
            </div>
            <DialogTitle className="text-center font-heading text-xl">{title}</DialogTitle>
            <DialogDescription className="text-center pt-1">{description}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/30 p-3 mt-2 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Authors Bureau never holds your funds — payments go directly to your Stripe account.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={starting}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Opening Stripe…
                </>
              ) : (
                "Connect with Stripe →"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-xs">
              <X className="h-3 w-3 mr-1" />
              Continue without payments (preview only)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline fallback when user dismisses modal */}
      {dismissed && !showLockedPreview && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">Stripe not connected</p>
            <p className="text-xs text-muted-foreground mb-3">
              You can preview the builder, but you won't be able to publish a paid product until Stripe is connected.
            </p>
            <Button size="sm" onClick={() => setDismissed(false)} variant="outline">
              Reopen Stripe setup
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
