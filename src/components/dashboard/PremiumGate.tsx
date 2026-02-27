import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface PremiumGateProps {
  isPremium: boolean;
  featureName: string;
  children: React.ReactNode;
}

export default function PremiumGate({ isPremium, featureName, children }: PremiumGateProps) {
  const [loading, setLoading] = useState(false);

  if (isPremium) return <>{children}</>;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: "price_1T0EiXL6NAuEbKmpWFRCxYaV" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
        <Crown className="h-8 w-8 text-secondary" />
      </div>
      <h2 className="font-heading text-2xl font-bold mb-2">Upgrade to Premium</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        <span className="font-semibold">{featureName}</span> is a Premium feature. Upgrade to unlock the full Authors Bureau Marketing Studio.
      </p>
      <ul className="text-sm text-muted-foreground space-y-2 mb-8 text-left">
        <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-secondary" /> AI Author Toolkit</li>
        <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-secondary" /> Course Builder</li>
        <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-secondary" /> Speaking Profile</li>
        <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-secondary" /> Coaching CRM</li>
      </ul>
      <Button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold px-8"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
        Upgrade to Premium
      </Button>
    </div>
  );
}
