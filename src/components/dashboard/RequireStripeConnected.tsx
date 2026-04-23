/**
 * @deprecated Sprint 41 — Authors Bureau is now the Merchant of Record.
 * Authors no longer connect their own Stripe; they configure Wise/PayPal payouts
 * in Account Settings → Payouts. This component now delegates to RequirePayoutSetup.
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
