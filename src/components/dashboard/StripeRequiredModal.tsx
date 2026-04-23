import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Gift, Loader2 } from "lucide-react";
import { useStripeConnect } from "@/components/dashboard/StripeConnectBanner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productLabel: string; // e.g. "$2.99 workbook"
  /** Optional: if provided, shows a "Make this free instead" button that flips pricing & continues. */
  onMakeFree?: () => Promise<void> | void;
}

/**
 * Blocking modal shown when an author tries to publish a paid product
 * without Stripe Connect onboarded.
 */
export default function StripeRequiredModal({
  open,
  onOpenChange,
  productLabel,
  onMakeFree,
}: Props) {
  const { startOnboarding } = useStripeConnect();
  const [busy, setBusy] = useState<"connect" | "free" | null>(null);

  const handleConnect = async () => {
    setBusy("connect");
    try {
      await startOnboarding();
    } finally {
      setBusy(null);
    }
  };

  const handleFree = async () => {
    if (!onMakeFree) return;
    setBusy("free");
    try {
      await onMakeFree();
      onOpenChange(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Connect Stripe to publish your paid product</DialogTitle>
          <DialogDescription>
            Your {productLabel} needs a connected payment account so readers can
            actually buy it. Free products can publish anytime.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy !== null}
          >
            Cancel
          </Button>
          {onMakeFree && (
            <Button
              variant="outline"
              onClick={handleFree}
              disabled={busy !== null}
            >
              {busy === "free" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gift className="h-4 w-4 mr-2" />
              )}
              Make this free instead
            </Button>
          )}
          <Button onClick={handleConnect} disabled={busy !== null}>
            {busy === "connect" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Connect Stripe →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
