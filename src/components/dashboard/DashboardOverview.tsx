import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Loader2, CheckCircle2, BookOpen, Mic,
  GraduationCap, Lock, ExternalLink, RefreshCw,
} from "lucide-react";
import { useState } from "react";

export default function DashboardOverview() {
  const { isPremium, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS.premium.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Could not start checkout", description: err.message, variant: "destructive" });
    }
    setCheckoutLoading(false);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Could not open portal", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  const features = [
    { icon: BookOpen, label: "Profile & Book Listing", description: "Get listed in the Authors Bureau directory", available: true },
    { icon: GraduationCap, label: "Course Builder", description: "Create AI-powered courses from your book chapters", available: isPremium },
    { icon: Mic, label: "Speaking Profile", description: "Manage your speaker profile, topics, and inquiries", available: isPremium },
    { icon: BookOpen, label: "Coaching CRM", description: "Build coaching packages and manage clients", available: isPremium },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Plan Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold">Your Plan</h2>
          <Button variant="ghost" size="sm" onClick={checkSubscription} disabled={subscription.loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${subscription.loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        {subscription.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking subscription...
          </div>
        ) : isPremium ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Premium Plan — Active</span>
            </div>
            {subscription.subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                Renews on {new Date(subscription.subscriptionEnd).toLocaleDateString()}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground">You're on the <strong>Free</strong> plan.</p>
            <Button onClick={handleUpgrade} disabled={checkoutLoading} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {checkoutLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Crown className="h-4 w-4 mr-1" />}
              Upgrade to Premium — $29/mo
            </Button>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="font-heading text-xl font-bold mb-4">Your Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.label}
              className={`rounded-xl border p-5 shadow-[var(--shadow-card)] ${
                f.available ? "border-border bg-card" : "border-border bg-muted/50 opacity-75"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.available ? "bg-primary/10" : "bg-muted"}`}>
                  {f.available ? (
                    <f.icon className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-heading font-semibold">{f.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
