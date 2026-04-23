import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface StripeConnectState {
  connected: boolean;
  onboarding_complete: boolean;
  loading: boolean;
}

function getStripeConnectErrorMessage(rawMessage: string): string {
  if (rawMessage.includes("signed up for Connect")) {
    return "Stripe Connect isn’t enabled on your Stripe account yet—enable Connect in Stripe, then try again.";
  }

  if (rawMessage.includes("restricted key") || rawMessage.includes("permissions")) {
    return "Your Stripe key is missing Connect permissions; please update the key and try again.";
  }

  return rawMessage;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error ? error.message : "Unable to start Stripe onboarding.";

  if (typeof error === "object" && error !== null && "context" in error) {
    const maybeContext = (error as { context?: unknown }).context;
    if (maybeContext instanceof Response) {
      try {
        const payload = await maybeContext.json();
        if (payload?.error && typeof payload.error === "string") {
          return payload.error;
        }
      } catch (error) {
        // Ignore body parse failures and use fallback error.
      }
    }
  }

  return fallback;
}

/**
 * @deprecated Sprint 41 — Authors Bureau is now Merchant of Record.
 * Authors no longer connect Stripe directly; this hook is a no-op stub
 * that returns "ready" so legacy gates short-circuit and let the new
 * RequirePayoutSetup gate handle the real check.
 */
export function useStripeConnect() {
  const { isPremium } = useAuth();
  const startOnboarding = async () => {
    toast.info("Stripe Connect is no longer required — set up payouts in Account Settings → Payouts.");
  };
  return {
    connected: true,
    onboarding_complete: true,
    loading: false,
    isPremium,
    startOnboarding,
    checkStatus: async () => {},
  };
}

interface BannerProps {
  compact?: boolean;
}

export default function StripeConnectBanner(_props: BannerProps = {}) {
  // Sprint 41: deprecated — payments are platform-collected via Authors Bureau Stripe.
  // Authors set up Wise/PayPal payouts in Account Settings → Payouts instead.
  return null;
}

export function StripeConnectStatus() {
  const { onboarding_complete, isPremium } = useStripeConnect();
  if (!isPremium) return null;
  if (onboarding_complete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Payments Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 text-secondary px-2 py-0.5 text-[10px] font-semibold">
      <CreditCard className="h-3 w-3" /> Connect Stripe
    </span>
  );
}
