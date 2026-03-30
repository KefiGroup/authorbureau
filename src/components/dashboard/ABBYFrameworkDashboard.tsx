import { useState, useEffect, useRef } from "react";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import type { DashboardSection } from "@/pages/AuthorDashboard";

import MeetAbbySection from "./framework-dashboard/MeetAbbySection";
import MonetizationUniverse from "./framework-dashboard/MonetizationUniverse";
import SubscriptionPricing from "./framework-dashboard/SubscriptionPricing";
import JourneyMapCTA from "./framework-dashboard/JourneyMapCTA";
import JourneyCardsStrip from "./framework-dashboard/JourneyCardsStrip";
import CompactMicrositeCard from "./framework-dashboard/CompactMicrositeCard";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

export default function ABBYFrameworkDashboard({ onNavigate, isPremium }: Props) {
  const { user, tier, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Dashboard state
  const [profileState, setProfileState] = useState<"none" | "incomplete" | "live">("none");
  const [authorName, setAuthorName] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookCovers, setBookCovers] = useState<string[]>([]);
  const [bookCount, setBookCount] = useState(0);
  const [hasPlan, setHasPlan] = useState(false);
  const [planSummary, setPlanSummary] = useState<any>(null);
  const [builtProducts, setBuiltProducts] = useState<string[]>([]);
  const [recommendedByAbby, setRecommendedByAbby] = useState<string[]>([]);
  const [isFirstPostAnalysis, setIsFirstPostAnalysis] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [bookApproved, setBookApproved] = useState(false);
  const isFetchingRef = useRef(false);

  const loadDashboard = async () => {
    if (!user?.id || isFetchingRef.current) return;

    isFetchingRef.current = true;
    const isInitialLoad = !hasBootstrapped;

    if (isInitialLoad) {
      setLoading(true);
      setError(null);
    }

    try {
      const token = await getActiveToken();
      if (!token) {
        if (isInitialLoad) {
          setError("Unable to authenticate. Please sign out and back in.");
          setLoading(false);
        }
        return;
      }

      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      const [stateRes, booksRes, slugRes] = await Promise.all([
        fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-state`, { method: "POST", headers }),
        fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`, { method: "POST", headers }),
        cloudSupabase.from("author_profiles").select("author_slug").eq("user_id", user.id).maybeSingle(),
      ]);

      const [state, booksData] = await Promise.all([stateRes.json(), booksRes.json()]);

      if (state.profile) {
        const p = state.profile;
        const hasName = !!p.pen_name?.trim();
        const hasPhoto = !!p.photo_url?.trim();
        const hasBio = !!(p.bio_long?.trim() || p.bio_short?.trim());
        const isListed = ["listed", "verified", "featured"].includes(p.directory_status);
        setAuthorName(p.pen_name || "");
        setAuthorPhoto(p.photo_url || "");
        setProfileState(isListed && hasName && hasPhoto && hasBio ? "live" : (hasName || hasPhoto ? "incomplete" : "none"));
      }

      setBookCount(state.bookCount || 0);
      if (slugRes.data?.author_slug) setAuthorSlug(slugRes.data.author_slug);

      if (booksData.books) {
        setBookCovers(booksData.books.filter((b: any) => b.cover_image_url).map((b: any) => b.cover_image_url).slice(0, 3));
        // Check if any book is approved (has published_at)
        const anyApproved = booksData.books.some((b: any) => !!b.published_at);
        setBookApproved(anyApproved);

        if (booksData.books.length > 0) {
          const firstBook = booksData.books[0];
          fetchWithTimeout(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`,
            { method: "POST", headers, body: JSON.stringify({ action: "status", bookId: firstBook.id }) },
            10000
          ).then(r => r.json()).then(planData => {
            if (planData.plan) {
              setHasPlan(true);
              setPlanSummary({
                bookTitle: firstBook.title,
                streamsMapped: planData.plan.products?.length || 0,
                projectedRevenue: planData.plan.projectedRevenue || "$50K+",
                productsBuilt: planData.completedAssets?.length || 0,
              });
              setBuiltProducts(planData.completedAssets || []);
              setRecommendedByAbby(planData.plan.products?.map((p: any) => p.name || p.label) || []);
              // Check if first time seeing post-analysis dashboard
              try {
                const key = `abby_post_analysis_seen_${user.id}`;
                if (!localStorage.getItem(key)) {
                  setIsFirstPostAnalysis(true);
                  localStorage.setItem(key, "true");
                }
              } catch (error) { console.error(error); }
            }
          }).catch(() => { /* non-critical */ });
        }
      }

      if (isInitialLoad) {
        setHasBootstrapped(true);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (isInitialLoad) {
        setError(err?.name === "AbortError" ? "Request timed out. Please try again." : "Could not load dashboard data. Please try again.");
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const userId = user?.id;
  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSubscribe = async (planTier: "brand" | "build" | "yield", promoCode?: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke("create-checkout", {
        body: {
          priceId: TIERS[planTier].price_id,
          source_platform: "authorsbureau",
          ...(promoCode ? { promoCode } : {}),
        },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast({ title: "Checkout error", description: err.message, variant: "destructive" });
    }
    setCheckoutLoading(false);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke("customer-portal", {
        body: { source_platform: "authorsbureau" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      toast({ title: "Portal error", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground text-sm text-center max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadDashboard}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // Determine journey states
  const step1Done = profileState === "live" && bookCount > 0;
  const step2Done = hasPlan;
  const step3Done = builtProducts.length > 0;
  const step4Done = false;

  const micrositeStep = step1Done ? "done" as const : "current" as const;
  const planStep = step2Done ? "done" as const : step1Done ? "current" as const : "upcoming" as const;
  const buildStep = step3Done ? "done" as const : step2Done ? "current" as const : "upcoming" as const;
  const sellStep = step4Done ? "done" as const : step3Done ? "current" as const : "upcoming" as const;

  const currentJourneyStep = !step1Done ? "microsite" as const
    : !step2Done ? "analyze" as const
    : !isPremium ? "payments" as const
    : !step3Done ? "build" as const
    : "earn" as const;

  const handleJourneyAction = (action: string) => {
    switch (action) {
      case "add-book": onNavigate("my-books"); break;
      case "profile": onNavigate("profile"); break;
      case "analyze": onNavigate("build-business"); break;
      case "view-microsite":
        if (authorSlug) window.open(`/authors/${authorSlug}`, "_blank");
        else onNavigate("profile");
        break;
      case "connect-stripe": onNavigate("connect-stripe"); break;
      case "build": onNavigate("revenue-streams"); break;
      case "analytics": onNavigate("analytics"); break;
    }
  };

  // STATE A: Author has NOT completed Abby's analysis
  if (!hasPlan) {
    return (
      <div className="max-w-6xl space-y-8">
        {/* Section 1: Meet Abby (top) */}
        <MeetAbbySection
          hasPlan={false}
          planSummary={undefined}
          hasBook={bookCount > 0}
          profileComplete={profileState === "live" || profileState === "incomplete"}
          onStartConsultation={() => onNavigate("build-business")}
          onViewPlan={() => onNavigate("build-business")}
          onChatAbby={() => onNavigate("build-business")}
          onSetupProfile={() => onNavigate("profile")}
          onAddBook={() => onNavigate("my-books")}
        />

        {/* Section 2: 4-Step Journey (middle) */}
        <JourneyMapCTA
          micrositeState={micrositeStep}
          planState={planStep}
          buildState={buildStep}
          sellState={sellStep}
          currentJourneyStep={currentJourneyStep}
          onAction={handleJourneyAction}
        />

        {/* Section 3: Compact Microsite Card (bottom) */}
        <CompactMicrositeCard
          profileState={profileState}
          authorSlug={authorSlug}
          authorName={authorName}
          onSetupProfile={() => onNavigate("profile")}
          onViewMicrosite={() => {
            if (authorSlug) window.open(`/authors/${authorSlug}`, "_blank");
            else onNavigate("profile");
          }}
        />
      </div>
    );
  }

  // STATE B: Author HAS completed Abby's analysis
  return (
    <div className="max-w-6xl space-y-8">
      {/* Section 1: 4-Step Journey (top, step 3 highlighted) */}
      <JourneyMapCTA
        micrositeState={micrositeStep}
        planState={planStep}
        buildState={buildStep}
        sellState={sellStep}
        currentJourneyStep={currentJourneyStep}
        onAction={handleJourneyAction}
      />

      {/* Section 2: Journey Staircase Infographic */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-foreground">Your Journey Ahead</h2>
        <img
          src="/images/journey-staircase.webp"
          alt="The ABBY Journey — AI Analysis to BRAND to BUILD to YIELD"
          className="w-full rounded-2xl shadow-lg"
          loading="lazy"
        />
      </section>

      {/* Section 3: Monetization Universe with collapsible revenue flow */}
      <section className="space-y-4">
        <Collapsible defaultOpen={isFirstPostAnalysis}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            Understanding Your 28 Revenue Streams
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <img
              src="/images/journey-flow-diagram.webp"
              alt="How Your 28 Revenue Streams Connect"
              className="w-full rounded-2xl shadow-lg"
              loading="lazy"
            />
          </CollapsibleContent>
        </Collapsible>

        <MonetizationUniverse
          activatedCount={builtProducts.length}
          builtProducts={builtProducts}
          recommendedByAbby={recommendedByAbby}
          subscribedTier={tier}
          onNavigateToStream={(label) => {
            const streamMap: Record<string, string> = {
              "Online Courses": "courses", "Home Study Courses": "home-study",
              "Workbooks": "workbooks", "Audiobook": "audiobook-studio",
              "Monthly Memberships": "memberships", "Upsells / Downsells": "revenue-streams",
              "Social Media Calendar": "social-media", "Webinars": "webinars",
              "Podcasts (Guest)": "podcast", "Website / Microsite": "microsite-manager",
              "Email Marketing": "email-marketing", "1-on-1 Coaching": "coaching",
              "Group Coaching": "group-coaching", "Big Ticket Consulting": "big-ticket",
              "Keynotes": "speaking", "In-House Speaker": "speaking",
              "Training Programs": "revenue-streams", "Affiliates": "marketing-channels",
              "Revenue Sharing / JV": "marketing-channels",
              "Retreats & Bootcamps": "authority-builders", "Certification": "authority-builders",
              "Masterminds": "authority-builders", "Special Editions": "special-editions",
              "Book Sales at Events": "book-sales", "Conventions / Conferences": "authority-builders",
              "Fund Raising": "authority-builders", "Exhibitors / JV": "authority-builders",
            };
            const section = streamMap[label] || "revenue-streams";
            onNavigate(section);
          }}
        />
      </section>

      {/* Section 4: Choose Your Path / Subscription */}
      <SubscriptionPricing
        currentTier={tier}
        onSubscribe={handleSubscribe}
        onManage={handleManage}
        loading={checkoutLoading || portalLoading}
        abbyRecommendedTier={planSummary?.streamsMapped > 19 ? "yield" : planSummary?.streamsMapped > 11 ? "build" : "brand"}
      />

      {/* Section 5: Compact Microsite Card */}
      <CompactMicrositeCard
        profileState={profileState}
        authorSlug={authorSlug}
        authorName={authorName}
        onSetupProfile={() => onNavigate("profile")}
        onViewMicrosite={() => {
          if (authorSlug) window.open(`/authors/${authorSlug}`, "_blank");
          else onNavigate("profile");
        }}
      />
    </div>
  );
}
