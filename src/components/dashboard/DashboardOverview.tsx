import { useAuth, TIERS } from "@/hooks/useAuth";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Loader2, CheckCircle2, BookOpen, Mic,
  GraduationCap, Lock, ExternalLink, RefreshCw,
  User, ArrowRight, Rocket, Award, Download, Clock, Eye,
  AlertCircle, Circle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface DashboardOverviewProps {
  onNavigate?: (section: string) => void;
}

type StepStatus = "pending" | "in-progress" | "done";

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const { user, isPremium, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // State-aware onboarding
  const [profileStatus, setProfileStatus] = useState<StepStatus>("pending");
  const [directoryStatus, setDirectoryStatus] = useState<StepStatus>("pending");
  const [booksStatus, setBooksStatus] = useState<StepStatus>("pending");
  const [bookCount, setBookCount] = useState(0);
  const [stateLoading, setStateLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchState = async () => {
      setStateLoading(true);
      try {
        // Check author profile
        const { data: profile } = await cloudSupabase
          .from("author_profiles")
          .select("directory_status, pen_name, bio_short")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          // Profile exists — step 1 done
          setProfileStatus("done");
          // Directory status
          if (profile.directory_status === "listed") {
            setDirectoryStatus("done");
          } else {
            setDirectoryStatus("in-progress"); // unlisted = awaiting approval
          }
        } else {
          setProfileStatus("pending");
          setDirectoryStatus("pending");
        }

        // Check books
        const { data: books } = await cloudSupabase
          .from("books")
          .select("id")
          .eq("author_id", user.id);

        const count = books?.length || 0;
        setBookCount(count);
        setBooksStatus(count > 0 ? "done" : "pending");
      } catch (err) {
        console.error("Failed to fetch onboarding state:", err);
      }
      setStateLoading(false);
    };
    fetchState();
  }, [user]);

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

      // Re-fetch state after sync
      if (user) {
        const { data: profile } = await cloudSupabase
          .from("author_profiles")
          .select("directory_status")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) {
          setProfileStatus("done");
          setDirectoryStatus(profile.directory_status === "listed" ? "done" : "in-progress");
        }
        const { data: books } = await cloudSupabase
          .from("books")
          .select("id")
          .eq("author_id", user.id);
        const count = books?.length || 0;
        setBookCount(count);
        setBooksStatus(count > 0 ? "done" : "pending");
      }
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

  const stepStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-secondary animate-pulse" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/40" />;
    }
  };

  const stepStatusLabel = (status: StepStatus, context: string) => {
    switch (status) {
      case "done":
        return <span className="text-xs font-medium text-green-600">Complete</span>;
      case "in-progress":
        return <span className="text-xs font-medium text-secondary">Awaiting Review</span>;
      default:
        return <span className="text-xs font-medium text-muted-foreground">Not Started</span>;
    }
  };

  // Determine which step is "current" for the user
  const currentStep = profileStatus === "pending" ? 1 : directoryStatus !== "done" ? 2 : booksStatus === "pending" ? 3 : 0;

  const getStartedSteps = [
    {
      icon: Eye,
      label: "Review Your Profile",
      description: profileStatus === "pending"
        ? "Create your author profile on PublishNow first, then come back and click 'Sync Profile' to import it here."
        : "Your profile has been synced from PublishNow. To make changes, edit on PublishNow and sync again.",
      step: "Step 1",
      actionLabel: profileStatus === "pending" ? "Create on PublishNow" : "View Profile",
      target: profileStatus === "pending" ? "__create" : "profile",
      status: profileStatus,
    },
    {
      icon: Clock,
      label: "Await Directory Approval",
      description: directoryStatus === "done"
        ? "You're approved and listed in the public Authors Directory!"
        : profileStatus === "pending"
        ? "Once you sync your profile, our team will review it for the Authors Directory."
        : "Our team is reviewing your profile. Once approved, you'll appear in the public Authors Directory alongside other featured authors.",
      step: "Step 2",
      actionLabel: "Check Status",
      target: "profile",
      status: directoryStatus,
    },
    {
      icon: BookOpen,
      label: "Add Your Books",
      description: booksStatus === "done"
        ? `You have ${bookCount} book(s) added. Each is reviewed by our team before going live.`
        : "Add your published books to generate microsites. Each book is reviewed by our team before going live — just like Felicia's and Bob's.",
      step: "Step 3",
      actionLabel: booksStatus === "done" ? "Manage Books" : "Add a Book",
      target: "my-books",
      status: booksStatus,
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

      {/* Getting Started */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Get Started</h2>
            <p className="text-sm text-muted-foreground">
              {currentStep === 0
                ? "You're all set! Keep adding books and growing your presence."
                : `You're on Step ${currentStep} — follow the steps below to get listed.`}
            </p>
          </div>
        </div>

        {/* Contextual banner for new users */}
        {profileStatus === "pending" && !stateLoading && (
          <div className="mb-4 rounded-xl border border-secondary/30 bg-secondary/5 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Welcome! You're brand new — here's how to get started.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To join the Authors Directory, you'll first need to create your author profile on our partner platform <strong>PublishNow</strong>. Once that's done, come back here and sync it.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 ml-8">
              <Button
                asChild
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                <a href="https://publishnow.io" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Step A: Create Profile on PublishNow
                </a>
              </Button>
              <Button variant="outline" onClick={handleSyncFromPublishNow} disabled={syncLoading}>
                {syncLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Step B: Sync Profile Here
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {getStartedSteps.map((f, i) => {
            const isCurrent = currentStep === i + 1;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  if (f.target === "__create") {
                    window.open("https://publishnow.io", "_blank");
                  } else if (f.target === "__sync") {
                    handleSyncFromPublishNow();
                  } else {
                    onNavigate?.(f.target);
                  }
                }}
                className={`rounded-xl border p-5 shadow-[var(--shadow-card)] transition-all text-left cursor-pointer group ${
                  isCurrent
                    ? "border-secondary/50 bg-secondary/5 ring-1 ring-secondary/20 hover:shadow-[var(--shadow-card-hover)]"
                    : f.status === "done"
                    ? "border-green-200 bg-green-50/30 hover:shadow-[var(--shadow-card-hover)]"
                    : "border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    isCurrent ? "bg-secondary/15" : f.status === "done" ? "bg-green-100" : "bg-primary/10 group-hover:bg-secondary/15"
                  }`}>
                    <f.icon className={`h-5 w-5 transition-colors ${
                      isCurrent ? "text-secondary" : f.status === "done" ? "text-green-600" : "text-primary group-hover:text-secondary"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">{f.step}</span>
                      {!stateLoading && stepStatusIcon(f.status)}
                    </div>
                    <h3 className="font-heading font-semibold text-sm">{f.label}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{f.description}</p>
                <div className="flex items-center justify-between mt-3">
                  {!stateLoading && stepStatusLabel(f.status, f.label)}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold transition-opacity ${
                    isCurrent ? "text-secondary opacity-100" : "text-secondary opacity-0 group-hover:opacity-100"
                  }`}>
                    {f.actionLabel} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Author Monetisation (Premium Tier) */}
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
