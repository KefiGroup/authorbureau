import { Wallet } from "lucide-react";
import PayoutsSettings from "@/components/dashboard/PayoutsSettings";

/**
 * Audit #3 (Sprint 42) — Canonical dashboard payout entry point.
 *
 * Previously this page had its own (incomplete) Stripe/PayPal/Wise UI that
 * couldn't actually start Stripe Connect onboarding and didn't capture the
 * Payout Agreement. It now reuses the proven `<PayoutsSettings />` component
 * (the same one rendered on /account-settings?tab=payouts), so authors get
 * the Connect Stripe button + agreement + Wise/PayPal fields in one place.
 */
export default function PayoutSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mx-auto mb-2">
          <Wallet className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="font-heading text-3xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Readers pay Authors Bureau at checkout. We retain an 8% platform fee to cover all payment-processing costs and pay you the remaining 92% monthly.
        </p>
      </div>

      {/* Framing banner */}
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">You don't need to connect Stripe to publish or sell.</strong> Authors Bureau collects every payment for you. Just connect Stripe Express to receive your monthly 92% payout — fully automated on the 1st of each month, and we cover all transfer fees. More payout options coming soon.
      </div>

      {/* Canonical payout UI (Stripe Connect button + agreement + Wise/PayPal) */}
      <PayoutsSettings />
    </div>
  );
}
