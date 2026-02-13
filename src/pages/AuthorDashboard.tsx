import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Crown, LogOut, Loader2, CheckCircle2, BookOpen, BarChart3,
  Mic, GraduationCap, Globe, Star, Lock, ExternalLink, RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

const FREE_FEATURES = [
  { icon: BookOpen, label: "Profile & Book Listing", description: "Get listed in the Authors Bureau directory" },
  { icon: Star, label: "Basic Author Profile", description: "Showcase your bio, books, and credentials" },
];

const PREMIUM_FEATURES = [
  { icon: Mic, label: "Coaching & Events", description: "Set up coaching sessions, speaking gigs, and events" },
  { icon: BarChart3, label: "Advanced Analytics", description: "Track profile views, book clicks, and engagement" },
  { icon: Crown, label: "Priority Placement", description: "Featured positioning in the author directory" },
  { icon: Globe, label: "Individual Website", description: "Your own branded author website" },
  { icon: GraduationCap, label: "Courseware Development", description: "Create and sell courses to your audience" },
];

export default function AuthorDashboard() {
  const { user, loading, isAdmin, isPremium, subscription, checkSubscription, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle checkout success/cancel
  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      toast({ title: "Welcome to Premium! 🎉", description: "Your subscription is now active." });
      checkSubscription();
    } else if (status === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
    }
  }, [searchParams]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS.premium.price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
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
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Could not open portal", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-primary py-10 text-primary-foreground">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Author Dashboard</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              {user.email}
              {isPremium && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-medium text-secondary">
                  <Crown className="h-3 w-3" /> Premium
                </span>
              )}
            </p>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </section>

      <section className="py-10">
        <div className="container max-w-4xl space-y-8">

          {/* Current Plan */}
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
                <Button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Crown className="h-4 w-4 mr-1" />}
                  Upgrade to Premium — $29/mo
                </Button>
              </div>
            )}
          </div>

          {/* Free Features */}
          <div>
            <h2 className="font-heading text-xl font-bold mb-4">Free Features</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold">{f.label}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Features */}
          <div>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-secondary" /> Premium Features
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PREMIUM_FEATURES.map((f) => (
                <div
                  key={f.label}
                  className={`rounded-xl border p-5 shadow-[var(--shadow-card)] ${
                    isPremium
                      ? "border-secondary/30 bg-card"
                      : "border-border bg-muted/50 opacity-75"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isPremium ? "bg-secondary/10" : "bg-muted"}`}>
                      {isPremium ? (
                        <f.icon className="h-5 w-5 text-secondary" />
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
            {!isPremium && (
              <div className="mt-4 text-center">
                <Button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full"
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                  Unlock All Premium Features — $29/mo
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
