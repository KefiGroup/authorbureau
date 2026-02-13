import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Loader2, CheckCircle2, BookOpen, Mic,
  GraduationCap, Lock, ExternalLink, RefreshCw,
  User, Globe, Star, ArrowRight, Rocket, Award,
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

  const freeFeatures = [
    {
      icon: User,
      label: "Author Profile",
      description: "Create your professional author profile to be discovered by readers and industry partners.",
      step: "Step 1",
    },
    {
      icon: BookOpen,
      label: "Book Listing",
      description: "Showcase your published books with covers, descriptions, and purchase links.",
      step: "Step 2",
    },
    {
      icon: Globe,
      label: "Directory Listing",
      description: "Get listed in the Authors Bureau directory and increase your visibility.",
      step: "Step 3",
    },
    {
      icon: Star,
      label: "Credibility Badges",
      description: "Earn badges like 'AB Verified' and 'Featured Author' to build trust.",
      step: "Step 4",
    },
  ];

  const premiumFeatures = [
    {
      icon: GraduationCap,
      label: "AI Course Builder",
      description: "Transform your book chapters into structured online courses using AI — monetise your knowledge.",
      available: isPremium,
    },
    {
      icon: Mic,
      label: "Speaking Profile",
      description: "Create a speaker profile with topics, fees, and availability. Get booked for events and keynotes.",
      available: isPremium,
    },
    {
      icon: BookOpen,
      label: "Coaching CRM",
      description: "Build coaching packages, manage client inquiries, and grow your coaching business.",
      available: isPremium,
    },
  ];

  return (
    <div className="max-w-5xl space-y-10">
      {/* Welcome & Plan */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Welcome to Your Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Your launchpad from <strong>Author</strong> to <strong>Authority</strong>.
            </p>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-accent">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Premium Plan — Active</span>
            </div>
            {subscription.subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                Renews {new Date(subscription.subscriptionEnd).toLocaleDateString()}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading} className="w-fit">
              {portalLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-muted-foreground">
              You're on the <strong>Free</strong> plan — unlock monetisation tools below.
            </p>
            <Button onClick={handleUpgrade} disabled={checkoutLoading} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit">
              {checkoutLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Crown className="h-4 w-4 mr-1" />}
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>

      {/* FRAMEWORK STEP 1: From Author to Authority (Free Tier) */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">From Author to Authority</h2>
            <p className="text-sm text-muted-foreground">Free tier — establish your credibility and visibility</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {freeFeatures.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">{f.step}</span>
                  <h3 className="font-heading font-semibold text-sm">{f.label}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FRAMEWORK STEP 2: Author Monetisation (Premium Tier) */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Author Monetisation</h2>
            <p className="text-sm text-muted-foreground">
              Premium tier — turn your expertise into revenue streams
              {!isPremium && (
                <span className="inline-flex items-center gap-1 ml-2 text-secondary font-semibold">
                  <Crown className="h-3 w-3" /> Upgrade to unlock
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {premiumFeatures.map((f) => (
            <div
              key={f.label}
              className={`rounded-xl border p-5 shadow-[var(--shadow-card)] transition-shadow ${
                f.available
                  ? "border-border bg-card hover:shadow-[var(--shadow-card-hover)]"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  f.available ? "bg-secondary/15" : "bg-muted"
                }`}>
                  {f.available ? (
                    <f.icon className="h-5 w-5 text-secondary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-heading font-semibold">{f.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{f.description}</p>
              {!f.available && (
                <Button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full border-secondary/30 text-secondary hover:bg-secondary/10"
                >
                  <Crown className="h-3.5 w-3.5 mr-1" /> Unlock with Premium
                  <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
