import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface PayoutReadinessState {
  ready: boolean;
  payout_method: "wise" | "paypal" | null;
  tax_acknowledged: boolean;
  loading: boolean;
}

/**
 * Authors must set a payout method (Wise or PayPal) AND acknowledge tax
 * self-declaration before they can publish paid products. Authors Bureau is the
 * Merchant of Record — readers always check out via the platform Stripe account.
 */
export function usePayoutReadiness() {
  const { user } = useAuth();
  const [state, setState] = useState<PayoutReadinessState>({
    ready: false,
    payout_method: null,
    tax_acknowledged: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ ready: false, payout_method: null, tax_acknowledged: false, loading: false });
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) {
        setState({ ready: false, payout_method: null, tax_acknowledged: false, loading: false });
        return;
      }
      const { data: settings } = await supabase
        .from("author_payout_settings")
        .select("payout_method, paypal_email_v2, wise_recipient, tax_self_declared_at")
        .eq("author_id", profile.id)
        .maybeSingle();

      const method = (settings?.payout_method as "wise" | "paypal" | null) || null;
      const methodComplete =
        (method === "wise" && !!settings?.wise_recipient) ||
        (method === "paypal" && !!settings?.paypal_email_v2);
      const taxAck = !!settings?.tax_self_declared_at;

      setState({
        ready: methodComplete && taxAck,
        payout_method: method,
        tax_acknowledged: taxAck,
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
