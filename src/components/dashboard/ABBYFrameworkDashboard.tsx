import { useState, useEffect } from "react";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import type { DashboardSection } from "@/pages/AuthorDashboard";

import FreeMicrositeHero from "./framework-dashboard/FreeMicrositeHero";
import MeetAbbySection from "./framework-dashboard/MeetAbbySection";
import MonetizationUniverse from "./framework-dashboard/MonetizationUniverse";
import SubscriptionPricing from "./framework-dashboard/SubscriptionPricing";
import JourneyMapCTA from "./framework-dashboard/JourneyMapCTA";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const token = await getActiveToken();
        if (!token) { setLoading(false); return; }

        // Fetch dashboard state
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-state`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }
        );
        const state = await res.json();

        if (state.profile) {
          const p = state.profile;
          const hasName = !!p.pen_name?.trim();
          const hasPhoto = !!p.photo_url?.trim();
          const hasBio = !!(p.bio_long?.trim() || p.bio_short?.trim());
          const isListed = ["listed", "verified", "featured"].includes(p.directory_status);

          setAuthorName(p.pen_name || "");
          setAuthorPhoto(p.photo_url || "");

          if (isListed && hasName && hasPhoto && hasBio) {
            setProfileState("live");
          } else if (hasName || hasPhoto) {
            setProfileState("incomplete");
          } else {
            setProfileState("none");
          }
        }

        setBookCount(state.bookCount || 0);

        // Fetch books for covers and slug
        const booksRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const booksData = await booksRes.json();
        if (booksData.books) {
          setBookCovers(booksData.books.filter((b: any) => b.cover_image_url).map((b: any) => b.cover_image_url).slice(0, 3));
          // Get author slug from profile directly via database
          const { data: profileRow } = await cloudSupabase
            .from("author_profiles")
            .select("author_slug")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileRow?.author_slug) {
            setAuthorSlug(profileRow.author_slug);
          }

          // Check for business plans (generated_assets with type business_plan)
          if (booksData.books.length > 0) {
            const firstBook = booksData.books[0];
            try {
              const planRes = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ action: "status", bookId: firstBook.id }),
                }
              );
              const planData = await planRes.json();
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
              }
            } catch {
              // No plan available
            }
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSubscribe = async (planTier: "starter" | "pro" | "enterprise") => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS[planTier].price_id, source_platform: "authorsbureau" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
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
    } catch (err: any) {
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

  // Determine journey states - sequential logic
  const step1Done = profileState === "live" && bookCount > 0;
  const step2Done = hasPlan;
  const step3Done = builtProducts.length > 0;
  const step4Done = false; // No sales tracking yet

  const micrositeStep = step1Done ? "done" as const : "current" as const;
  const planStep = step2Done ? "done" as const : step1Done ? "current" as const : "upcoming" as const;
  const buildStep = step3Done ? "done" as const : step2Done ? "current" as const : "upcoming" as const;
  const sellStep = step4Done ? "done" as const : step3Done ? "current" as const : "upcoming" as const;

  // Current journey step for dynamic CTAs
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

  return (
    <div className="max-w-6xl space-y-8">
      {/* SECTION 1 — Free Microsite Hero */}
      <FreeMicrositeHero
        profileState={profileState}
        authorName={authorName}
        authorPhoto={authorPhoto}
        authorSlug={authorSlug}
        bookCovers={bookCovers}
        onSetupMicrosite={() => onNavigate("profile")}
        onCompleteProfile={() => onNavigate("profile")}
        onViewMicrosite={() => {
          if (authorSlug) {
            window.open(`/authors/${authorSlug}`, "_blank");
          } else {
            onNavigate("profile");
          }
        }}
      />

      {/* SECTION 2 — Meet Abby */}
      <MeetAbbySection
        hasPlan={hasPlan}
        planSummary={planSummary}
        hasBook={bookCount > 0}
        onStartConsultation={() => onNavigate("build-business")}
        onViewPlan={() => onNavigate("build-business")}
        onChatAbby={() => onNavigate("build-business")}
      />

      {/* SECTION 3 — Monetization Universe */}
      <MonetizationUniverse
        activatedCount={builtProducts.length}
        builtProducts={builtProducts}
        recommendedByAbby={recommendedByAbby}
        subscribedTier={tier}
        onNavigateToStream={(label) => {
          // Map stream labels to dashboard sections
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
            "Masterminds": "authority-builders", "Special Editions": "authority-builders",
            "Book Sales at Events": "authority-builders", "Conventions / Conferences": "authority-builders",
            "Fund Raising": "authority-builders", "Exhibitors / JV": "authority-builders",
          };
          const section = streamMap[label] || "revenue-streams";
          onNavigate(section);
        }}
      />

      {/* SECTION 4 — Subscription Pricing */}
      <SubscriptionPricing
        currentTier={tier}
        onSubscribe={handleSubscribe}
        onManage={handleManage}
        loading={checkoutLoading || portalLoading}
        abbyRecommendedTier={hasPlan ? (planSummary?.streamsMapped > 19 ? "enterprise" : planSummary?.streamsMapped > 11 ? "pro" : "starter") : undefined}
      />

      {/* SECTION 5 — Journey Map */}
      <JourneyMapCTA
        micrositeState={micrositeStep}
        planState={planStep}
        buildState={buildStep}
        sellState={sellStep}
        currentJourneyStep={currentJourneyStep}
        onAction={handleJourneyAction}
      />
    </div>
  );
}
