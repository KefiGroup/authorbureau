import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Sprint 44 — Stripe Express is the only supported payout rail.
// Target markets (US, SG, AU, NZ) are all fully covered by Stripe.
export type PayoutMethod = "stripe";

export interface PayoutReadinessState {
  ready: boolean;
  payout_method: PayoutMethod | null;
  tax_acknowledged: boolean;
  stripe_onboarding_complete: boolean;
  loading: boolean;
}

/**
 * Authors must connect Stripe Express AND accept the Payout Agreement
 * (tax + payment processing terms) before they can publish paid products.
 * Authors Bureau is the Merchant of Record — readers always check out via
 * the platform Stripe account.
 */
export function usePayoutReadiness() {
  const { user } = useAuth();
  const [state, setState] = useState<PayoutReadinessState>({
    ready: false,
    payout_method: null,
    tax_acknowledged: false,
    stripe_onboarding_complete: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ ready: false, payout_method: null, tax_acknowledged: false, stripe_onboarding_complete: false, loading: false });
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) {
        setState({ ready: false, payout_method: null, tax_acknowledged: false, stripe_onboarding_complete: false, loading: false });
        return;
      }
      const { data: settings } = await supabase
        .from("author_payout_settings")
        .select("payout_method, tax_self_declared_at")
        .eq("author_id", profile.id)
        .maybeSingle();

      const method = (settings?.payout_method as PayoutMethod | null) || null;
      const stripeReady = !!profile.stripe_onboarding_complete;
      const methodComplete = method === "stripe" && stripeReady;
      const taxAck = !!settings?.tax_self_declared_at;

      setState({
        ready: methodComplete && taxAck,
        payout_method: method,
        tax_acknowledged: taxAck,
        stripe_onboarding_complete: stripeReady,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
