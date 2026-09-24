/**
 * ProductCTA — Unified reader-facing call-to-action for any author_node.
 *
 * Single source of truth for commerce link state. Reads from author_nodes
 * and renders one of two reader-facing states:
 *
 *  1. live           — Stripe ready + price set → BuyNowButton (Stripe checkout)
 *  2. coming-soon    — Reader sees graceful "Notify me" instead of dead button
 *
 * NEVER renders a clickable Buy button that would 404 or throw a Stripe error.
 *
 * Link resolution order (for non-checkout secondary actions like external services):
 *   1. author_nodes.delivery_url   (canonical, backfilled in Step 1)
 *   2. fallbackUrl prop            (legacy payment_link / third_party_url, transitional)
 */
import { useState } from "react";
import { ArrowRight, Mail, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import { autoEnrollSubscriber } from "@/lib/email-sequence-hook";

export interface ProductCTAProps {
  /** author_nodes.id — the registry row */
  authorNodeId: string;
  /** Author profile id (for waitlist / nudges) */
  authorId: string;
  /** Effective price in USD (resolved by caller — falls through content_json) */
  effectivePrice: number | null;
  /** Whether author has connected Stripe (charges_enabled) */
  stripeReady: boolean;
  /** Reader-facing CTA label (e.g. "Enroll Now", "Buy Now", "Reserve") */
  label?: string;
  /** Optional product title — used in waitlist messages */
  productTitle?: string;
  /**
   * Transitional fallback URL for legacy `payment_link` or `third_party_url`.
   * Will be removed once all nodes are migrated to delivery_url-only.
   */
  fallbackUrl?: string | null;
  /** Tailwind classes for the primary button */
  className?: string;
  /** Inline style for the primary button (for theme accents) */
  style?: React.CSSProperties;
  /** Theme tokens for reader-facing states */
  theme?: {
    cardBg?: string;
    cardBorder?: string;
    mutedText?: string;
    accent?: string;
    bodyText?: string;
    secondaryBg?: string;
  };
}

export default function ProductCTA({
  authorNodeId,
  authorId,
  effectivePrice,
  stripeReady,
  label = "Buy Now",
  productTitle,
  fallbackUrl,
  className,
  style,
  theme = {},
}: ProductCTAProps) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

  const hasPrice = effectivePrice != null && effectivePrice > 0;
  const canSell = stripeReady && hasPrice;

  // STATE 1: Live — render production BuyNowButton
  if (canSell) {
    return (
      <BuyNowButton
        authorNodeId={authorNodeId}
        authorId={authorId}
        label={label}
        fallbackUrl={fallbackUrl}
        className={className}
        style={style}
      />
    );
  }

  // STATE 2: Not yet for sale — the public page is the same for authors and readers.
  // NEVER renders a dead Buy button.
  const handleWaitlistSubmit = async () => {
    if (!waitlistEmail) return;
    setWaitlistSubmitting(true);
    try {
      await autoEnrollSubscriber({
        email: waitlistEmail,
        userId: authorId,
        source: "waitlist",
        sourceDetail: `node:${authorNodeId}${productTitle ? ` (${productTitle})` : ""} (coming soon)`,
      });
    } catch (e) {
      console.warn("[ProductCTA] waitlist enrol failed", e);
    } finally {
      setWaitlistSubmitting(false);
      setWaitlistDone(true);
    }
  };

  return (
    <>
      <div className="flex flex-col items-stretch gap-1.5">
        <Button
          type="button"
          variant="outline"
          className={className}
          style={style}
          onClick={() => setWaitlistOpen(true)}
        >
          <Clock className="mr-2 h-4 w-4" />
          Coming Soon: Notify Me
        </Button>
        <p
          className="text-[11px] leading-snug text-center px-1"
          style={{ color: theme.mutedText || "inherit" }}
        >
          Be the first to know when it's available.
        </p>
      </div>

      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Get notified the moment it's live</DialogTitle>
            <DialogDescription>
              {productTitle
                ? `We'll email you the moment "${productTitle}" is available to purchase.`
                : "We'll email you the moment this is available to purchase."}
            </DialogDescription>
          </DialogHeader>

          {waitlistDone ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Thanks — you're on the list. You'll be the first to know.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {waitlistDone ? (
              <Button onClick={() => setWaitlistOpen(false)}>Close</Button>
            ) : (
              <Button
                onClick={handleWaitlistSubmit}
                disabled={!waitlistEmail || waitlistSubmitting}
              >
                {waitlistSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    Notify me <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
