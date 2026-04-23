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

export default function StripeConnectBanner({ compact: _compact = false }: BannerProps) {
  // Sprint 41: deprecated — payments are platform-collected. Render nothing.
  return null;
  // eslint-disable-next-line no-unreachable
  const { connected, onboarding_complete, loading, isPremium, startOnboarding } = useStripeConnect();
  const [starting, setStarting] = useState(false);

  if (loading || !isPremium || onboarding_complete) return null;

  const handleClick = async () => {
    setStarting(true);
    try {
      await startOnboarding();
    } finally {
      setStarting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2">
        <CreditCard className="h-4 w-4 text-secondary shrink-0" />
        <p className="text-xs text-foreground flex-1">Connect Stripe to accept payments</p>
        <Button size="sm" className="h-7 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleClick} disabled={starting}>
          {starting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect →"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-secondary/30 bg-gradient-to-r from-secondary/5 to-secondary/10 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15 shrink-0">
        <CreditCard className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">💳 Connect your Stripe account to start accepting payments</p>
        <p className="text-xs text-muted-foreground mt-0.5">This takes about 2 minutes. Stripe handles everything securely.</p>
      </div>
      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 whitespace-nowrap" onClick={handleClick} disabled={starting}>
        {starting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Connecting...</> : "Connect Stripe →"}
      </Button>
    </div>
  );
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
