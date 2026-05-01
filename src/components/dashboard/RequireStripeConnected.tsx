/**
 * @deprecated Sprint 41 — Authors Bureau is now the Merchant of Record.
 * Authors connect Stripe Express in Account Settings → Payouts to receive their 92% payout
 * (Sprint 44 made Stripe Express the only supported rail). This component now delegates to RequirePayoutSetup.
 */
import RequirePayoutSetup from "@/components/dashboard/RequirePayoutSetup";

interface Props {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showLockedPreview?: boolean;
}

export default function RequireStripeConnected(props: Props) {
  return <RequirePayoutSetup {...props} />;
}
