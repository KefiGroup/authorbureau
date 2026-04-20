import { useState } from "react";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

      // No URL and no known error → try fallback static payment link
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      console.error("[BuyNowButton]", err);
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return;
      }
      toast({
        title: "Checkout unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
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
      await supabase.from("author_subscribers").insert({
        author_id: authorId,
        email: leadEmail,
        source: "waitlist",
        source_detail: `node:${authorNodeId} (payments not set up)`,
        status: "active",
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

      <Dialog open={paymentsModal} onOpenChange={setPaymentsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payments coming soon</DialogTitle>
            <DialogDescription>
              This author hasn't set up payments yet. Leave your email and we'll let you know the moment it's available.
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
