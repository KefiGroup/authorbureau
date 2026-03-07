import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

interface StripeConnectState {
  connected: boolean;
  onboarding_complete: boolean;
  loading: boolean;
}

export function useStripeConnect() {
  const { user, isPremium } = useAuth();
  const [state, setState] = useState<StripeConnectState>({
    connected: false,
    onboarding_complete: false,
    loading: true,
  });

  const checkStatus = useCallback(async () => {
    if (!user) { setState({ connected: false, onboarding_complete: false, loading: false }); return; }
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "status" },
      });
      if (error) throw error;
      setState({
        connected: data.connected ?? false,
        onboarding_complete: data.onboarding_complete ?? false,
        loading: false,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const startOnboarding = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "onboard" },
      });
      if (error) throw error;
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Stripe Connect onboarding failed:", err);
    }
  };

  return { ...state, isPremium, startOnboarding, checkStatus };
}

interface BannerProps {
  compact?: boolean;
}

export default function StripeConnectBanner({ compact = false }: BannerProps) {
  const { connected, onboarding_complete, loading, isPremium, startOnboarding } = useStripeConnect();
  const [starting, setStarting] = useState(false);

  if (loading || !isPremium || onboarding_complete) return null;

  const handleClick = async () => {
    setStarting(true);
    await startOnboarding();
    setStarting(false);
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
