import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Wallet, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePayoutReadiness } from "@/hooks/usePayoutReadiness";

interface Props {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showLockedPreview?: boolean;
}

/**
 * Gate for paid-product builders. Blocks publishing until the author has
 * configured a payout method (Wise or PayPal) and acknowledged tax
 * self-declaration. Authors Bureau is the Merchant of Record.
 */
export default function RequirePayoutSetup({
  children,
  title = "Set up payouts to publish paid products",
  description = "Choose how Authors Bureau should pay you (Wise or PayPal) and acknowledge that you'll self-declare income in your country.",
  showLockedPreview = false,
}: Props) {
  const { ready, loading } = usePayoutReadiness();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (ready) return <>{children}</>;

  // Audit #3: canonical payout entry point lives on the dashboard now.
  const goToPayouts = () => navigate("/dashboard?section=payout-settings");

  return (
    <>
      {showLockedPreview && <div className="relative pointer-events-none opacity-40 select-none">{children}</div>}
      <Dialog open={!dismissed}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 mx-auto mb-3">
              <Wallet className="h-6 w-6 text-secondary" />
            </div>
            <DialogTitle className="text-center font-heading text-xl">{title}</DialogTitle>
            <DialogDescription className="text-center pt-1">{description}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/30 p-3 mt-2 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Authors Bureau collects payments and pays you on the 1st of every month (minimum US$50). No tax forms required — you self-declare in your country.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Button size="lg" onClick={goToPayouts} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Set up payouts →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-xs">
              <X className="h-3 w-3 mr-1" />
              Continue without payouts (preview only)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {dismissed && !showLockedPreview && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 flex items-start gap-3">
          <Wallet className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">Payouts not set up</p>
            <p className="text-xs text-muted-foreground mb-3">
              You can preview the builder, but you won't be able to publish a paid product until you set up payouts.
            </p>
            <Button size="sm" onClick={goToPayouts} variant="outline">Set up payouts</Button>
          </div>
        </div>
      )}
    </>
  );
}
