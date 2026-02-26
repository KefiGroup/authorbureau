import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Loader2, CheckCircle2, BookOpen, Mic,
  GraduationCap, Lock, ExternalLink, RefreshCw,
  User, ArrowRight, Rocket, Award, Download,
} from "lucide-react";
import { useState } from "react";

interface DashboardOverviewProps {
  onNavigate?: (section: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const { isPremium, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const handleSyncFromPublishNow = async () => {
    setSyncLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-author-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");

      const parts: string[] = [];
      if (result.fieldsUpdated?.length > 0) {
        parts.push(`${result.fieldsUpdated.length} profile field(s) updated`);
      }
      if (result.booksImported > 0) {
        parts.push(`${result.booksImported} book(s) imported`);
      }
      if (result.booksUpdated > 0) {
        parts.push(`${result.booksUpdated} book(s) updated`);
      }

      toast({
        title: parts.length > 0 ? "Profile synced ✅" : "Everything up to date ✅",
        description: parts.length > 0 ? parts.join(", ") : "Your profile is up to date.",
      });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncLoading(false);
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS.premium.price_id, source_platform: "authorsbureau" },
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
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { source_platform: "authorsbureau" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Could not open portal", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  const getStartedSteps = [
    {
      icon: Download,
      label: "Import Your Profile",
      description: "We'll pull your author profile, bio, photo, and published books from your account automatically. This is the fastest way to get set up.",
      step: "Step 1",
      actionLabel: syncLoading ? "Syncing..." : "Import Now",
      action: () => handleSyncFromPublishNow(),
    },
    {
      icon: User,
      label: "Review & Refine",
      description: "Once imported, review your profile details — update your bio, photo, tagline, and credentials to make your author page shine.",
      step: "Step 2",
      actionLabel: "Open Profile",
      target: "profile",
    },
    {
      icon: BookOpen,
      label: "Add More Books",
      description: "Imported books go live automatically. You can also add books manually — these will be reviewed by our team before publishing.",
      step: "Step 3",
      actionLabel: "My Books",
      target: "my-books",
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncFromPublishNow} disabled={syncLoading}>
              {syncLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Sync Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={checkSubscription} disabled={subscription.loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${subscription.loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
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

      {/* Getting Started: 3 steps */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Get Started</h2>
            <p className="text-sm text-muted-foreground">Three steps to build your author authority and microsites</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {getStartedSteps.map((f) => (
            <button
              key={f.label}
              type="button"
              disabled={f.action ? syncLoading : false}
              onClick={() => f.action ? f.action() : onNavigate?.(f.target!)}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all text-left cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/40 group disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-secondary/15 transition-colors">
                  {f.action && syncLoading ? (
                    <Loader2 className="h-5 w-5 text-secondary animate-spin" />
                  ) : (
                    <f.icon className="h-5 w-5 text-primary group-hover:text-secondary transition-colors" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">{f.step}</span>
                  <h3 className="font-heading font-semibold text-sm">{f.label}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{f.description}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                {f.actionLabel} <ArrowRight className="h-3 w-3" />
              </span>
            </button>
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
