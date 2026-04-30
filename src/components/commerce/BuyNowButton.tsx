import { useState } from "react";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { autoEnrollSubscriber } from "@/lib/email-sequence-hook";


interface BuyNowButtonProps {
  authorNodeId: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackUrl?: string | null;
  authorId?: string | null;
}

/**
 * Reader-facing Buy Now button.
 * - Calls create-checkout-session edge function and redirects to Stripe.
 * - If author has not completed Stripe Connect, captures lead email and shows a graceful modal.
 * - Falls back to a static payment_link if provided and the dynamic call fails.
 */
export default function BuyNowButton({
  authorNodeId,
  label = "Buy Now",
  className,
  style,
  fallbackUrl,
  authorId,
}: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentsModal, setPaymentsModal] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCaptured, setLeadCaptured] = useState(false);

  const isLikelyCheckoutUrl = (url?: string | null): boolean => {
    if (!url) return false;
    return /(checkout\.stripe\.com|buy\.stripe\.com|stripe\.com\/pay)/i.test(url);
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { author_node_id: authorNodeId },
      });

      if (error) throw error;

      if (data?.error === "AUTHOR_PAYMENTS_NOT_SET_UP") {
        setPaymentsModal(true);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // No URL returned. Only redirect to fallback if it's a known checkout URL —
      // never silently navigate to an arbitrary stale link.
      if (isLikelyCheckoutUrl(fallbackUrl)) {
        window.location.href = fallbackUrl as string;
        return;
      }
      // Graceful waitlist instead of a technical error
      setPaymentsModal(true);
    } catch (err) {
      console.error("[BuyNowButton]", err);
      if (isLikelyCheckoutUrl(fallbackUrl)) {
        window.location.href = fallbackUrl as string;
        return;
      }
      // Show friendly modal — never leave the reader with a dead-end error toast
      setPaymentsModal(true);
    } finally {
      setLoading(false);
    }
  };

  const captureLead = async () => {
    if (!leadEmail || !authorId) {
      setLeadCaptured(true);
      return;
    }
    try {
      await autoEnrollSubscriber({
        email: leadEmail,
        userId: authorId,
        source: "waitlist",
        sourceDetail: `node:${authorNodeId} (payments not set up)`,
      });
      // Best-effort nudge to author — non-blocking
      supabase.from("abby_nudges").insert({
        author_id: authorId,
        nudge_type: "stripe_required",
        title: "Reader tried to buy — connect Stripe to capture sales",
        content: `A reader tried to purchase from your microsite but you haven't set up payments yet. Connect Stripe to start accepting orders.`,
        action_label: "Connect Stripe",
        action_url: "/account-settings?tab=connections",
      }).then(() => {}, () => {});
    } catch (e) {
      console.warn("[BuyNowButton] lead capture failed", e);
    } finally {
      setLeadCaptured(true);
    }
  };

  return (
    <>
      <div className="flex flex-col items-stretch gap-1.5">
        <Button
          className={className}
          style={style}
          onClick={handleClick}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening checkout…</>
          ) : (
            <>{label} <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
        <p className="text-[11px] leading-snug text-muted-foreground text-center px-1">
          By clicking {label.toLowerCase()} you agree to our{" "}
          <a href="/terms-of-sale" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Terms of Sale
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            Privacy Policy
          </a>.
        </p>
      </div>

      <Dialog open={paymentsModal} onOpenChange={setPaymentsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notify me when this is available</DialogTitle>
            <DialogDescription>
              The author hasn't switched on direct checkout yet. Leave your email and we'll let you know the moment it's ready to buy.
            </DialogDescription>
          </DialogHeader>
          {leadCaptured ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Thanks — we've added you to the list. You'll be the first to know.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {leadCaptured ? (
              <Button onClick={() => setPaymentsModal(false)}>Close</Button>
            ) : (
              <Button onClick={captureLead} disabled={!leadEmail}>Notify me</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
