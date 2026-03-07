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
import { Loader2 } from "lucide-react";

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

export default function ABBYFrameworkDashboard({ onNavigate, isPremium }: Props) {
  const { user, tier, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
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

  // Determine journey states
  const micrositeStep = profileState === "live" ? "done" as const : profileState === "incomplete" ? "current" as const : "current" as const;
  const planStep = hasPlan ? "done" as const : profileState === "live" ? "current" as const : "upcoming" as const;
  const buildStep = builtProducts.length > 0 ? "done" as const : hasPlan && isPremium ? "current" as const : "upcoming" as const;
  const sellStep = builtProducts.length > 2 ? "current" as const : "upcoming" as const;

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
        onMicrosite={() => onNavigate(profileState === "none" ? "profile" : "my-books")}
        onTalkToAbby={() => onNavigate("build-business")}
      />
    </div>
  );
}
