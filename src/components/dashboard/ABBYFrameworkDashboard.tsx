import { useState, useEffect, useRef } from "react";
import { useAuth, TIERS } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import type { DashboardSection } from "@/pages/AuthorDashboard";

import SubscriptionPricing from "./framework-dashboard/SubscriptionPricing";
import CompactMicrositeCard from "./framework-dashboard/CompactMicrositeCard";
import NextStepHero from "./framework-dashboard/NextStepHero";
import BooksGrid from "./framework-dashboard/BooksGrid";
import FrameworkLearnMore from "./framework-dashboard/FrameworkLearnMore";
import PortfolioSummaryBar from "./my-books/PortfolioSummaryBar";
import SpecialEditionCalendarCard from "./SpecialEditionCalendarCard";

import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout, waitForActiveToken } from "@/lib/get-active-token";
import { useMyBooks } from "@/hooks/useMyBooks";
import { useAuthorStats } from "@/hooks/useAuthorStats";

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

export default function ABBYFrameworkDashboard({ onNavigate, isPremium }: Props) {
  const { user, tier, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const { books: myBooks } = useMyBooks(user?.id);
  const { stats } = useAuthorStats(user?.id);
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
      const token = await waitForActiveToken();
      if (!token) {
        if (isInitialLoad) {
          setError("Unable to authenticate. Please sign out and back in.");
          setLoading(false);
        }
        return;
      }

      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const TIMEOUT = 15000;

      // Soft-fail per call: each failure is captured but does not abort the dashboard.
      const [stateSettled, booksSettled, slugSettled] = await Promise.allSettled([
        fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-state`, { method: "POST", headers }, TIMEOUT)
          .then(async (r) => {
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error((body as any)?.error || `dashboard-state ${r.status}`);
            return body;
          }),
        fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`, { method: "POST", headers }, TIMEOUT)
          .then(async (r) => {
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error((body as any)?.error || `list-my-books ${r.status}`);
            return body;
          }),
        cloudSupabase.from("author_profiles").select("author_slug").eq("user_id", user.id).maybeSingle(),
      ]);

      const state = stateSettled.status === "fulfilled" ? stateSettled.value : null;
      const booksData = booksSettled.status === "fulfilled" ? booksSettled.value : null;
      const slugRes = slugSettled.status === "fulfilled" ? slugSettled.value : { data: null };

      if (stateSettled.status === "rejected") console.warn("[Dashboard] dashboard-state failed:", stateSettled.reason);
      if (booksSettled.status === "rejected") console.warn("[Dashboard] list-my-books failed:", booksSettled.reason);
      if (slugSettled.status === "rejected") console.warn("[Dashboard] slug lookup failed:", slugSettled.reason);

      // Only show full error card when ALL three calls failed
      const allFailed = !state && !booksData && slugSettled.status === "rejected";
      if (allFailed && isInitialLoad) {
        setError("Could not load dashboard data. Please try again.");
        return;
      }

      if (state?.profile) {
        const p = state.profile;
        const hasName = !!p.pen_name?.trim();
        const hasPhoto = !!p.photo_url?.trim();
        const hasBio = !!(p.bio_long?.trim() || p.bio_short?.trim());
        const isListed = ["listed", "verified", "featured"].includes(p.directory_status);
        setAuthorName(p.pen_name || "");
        setAuthorPhoto(p.photo_url || "");
        setProfileState(isListed && hasName && hasPhoto && hasBio ? "live" : (hasName || hasPhoto ? "incomplete" : "none"));
      }

      // Load live node IDs for the Monetization Universe (canonical source).
      // We resolve the author profile id via the slug query when available.
      const profileId = (slugRes as any)?.data?.id || (state?.profile as any)?.id;
      if (profileId || user.id) {
        try {
          // Look up profile id if we don't already have one
          let resolvedProfileId = profileId;
          if (!resolvedProfileId) {
            const { data } = await cloudSupabase
              .from("author_profiles").select("id").eq("user_id", user.id).maybeSingle();
            resolvedProfileId = data?.id;
          }
          if (resolvedProfileId) {
            const { data: liveRows } = await cloudSupabase
              .from("author_nodes")
              .select("node_id")
              .eq("author_id", resolvedProfileId)
              .eq("status", "live");
            const liveIds = Array.from(new Set((liveRows || []).map((r: any) => r.node_id).filter(Boolean)));
            setBuiltProducts(liveIds);
          }
        } catch (e) {
          console.warn("[Dashboard] live-nodes lookup failed", e);
        }
      }

      // Trust the canonical books endpoint over dashboard-state when it
      // returned a non-empty list — prevents flashing the "Meet Abby / no
      // book" empty state when only the dashboard-state call failed.
      const booksLen = Array.isArray(booksData?.books) ? booksData.books.length : 0;
      // Mismatch detector: dashboard-state says we have books but list-my-books
      // returned an empty/failed payload. Bust the books cache and re-fetch
      // once so a stale module cache (e.g., after an admin delete) can't
      // strand the user on the empty-state CTA.
      if (booksLen === 0 && (state?.bookCount ?? 0) > 0 && !hasBootstrapped) {
        try {
          const { bustMyBooksCache } = await import("@/hooks/useMyBooks");
          bustMyBooksCache(user?.id);
        } catch {}
      }
      setBookCount(booksLen > 0 ? booksLen : (state?.bookCount || myBooks.length || 0));
      if (slugRes?.data?.author_slug) setAuthorSlug(slugRes.data.author_slug);

      // Source of truth for covers/approval: prefer fresh booksData, fall back
      // to cached myBooks so a transient list-my-books failure doesn't blank
      // the dashboard for users who actually have books.
      const sourceBooks: any[] = booksData?.books?.length
        ? booksData.books
        : (myBooks.length ? myBooks : []);
      if (sourceBooks.length > 0) {
        setBookCovers(sourceBooks.filter((b: any) => b.cover_image_url).map((b: any) => b.cover_image_url).slice(0, 3));
        const anyApproved = sourceBooks.some((b: any) => !!b.published_at);
        setBookApproved(anyApproved);
      }


      if (booksData?.books && booksData.books.length > 0) {
        // Check ALL books for an Abby plan, not just the first.
        Promise.all(
          booksData.books.map((b: any) =>
            fetchWithTimeout(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`,
              { method: "POST", headers, body: JSON.stringify({ action: "status", bookId: b.id }) },
              TIMEOUT
            ).then(r => r.json()).then(d => ({ book: b, data: d })).catch(() => ({ book: b, data: null }))
          )
        ).then((results) => {
          const analyzed = results.filter(r => r.data?.plan);
          if (analyzed.length === 0) return;
          const firstBook = analyzed[0].book;
          const planData = analyzed[0].data;
          setHasPlan(true);
          setPlanSummary({
            bookTitle: firstBook.title,
            streamsMapped: planData.plan.products?.length || ({ brand: 9, build: 18, yield: 28 } as Record<string, number>)[tier] || 28,
            projectedRevenue: planData.plan.projectedRevenue || "$50K+",
            productsBuilt: stats?.products?.totalBuilt ?? 0,
          });
          const recIds = (planData.plan.products || [])
            .map((p: any) => p.nodeId || p.node_id || p.code || p.name || p.label)
            .filter(Boolean);
          setRecommendedByAbby(recIds);
          try {
            const key = `abby_post_analysis_seen_${user.id}`;
            if (!localStorage.getItem(key)) {
              setIsFirstPostAnalysis(true);
              localStorage.setItem(key, "true");
            }
          } catch (error) { console.error(error); }
        }).catch(() => { /* non-critical */ });
      }


      if (isInitialLoad) {
        setHasBootstrapped(true);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      // Soft-fail: bootstrap with empty state so dashboard renders
      if (isInitialLoad) {
        setHasBootstrapped(true);
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
    const popup = window.open("about:blank", "_blank");
    try {
      const { data, error } = await cloudSupabase.functions.invoke("create-checkout", {
        body: {
          priceId: TIERS[planTier].price_id,
          source_platform: "authorsbureau",
          ...(promoCode ? { promoCode } : {}),
        },
      });
      if (error) throw error;
      if (data?.url && popup) {
        popup.location.href = data.url;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      popup?.close();
      toast({ title: "Checkout error", description: err.message, variant: "destructive" });
    }
    setCheckoutLoading(false);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    const popup = window.open("about:blank", "_blank");
    try {
      const { data, error } = await cloudSupabase.functions.invoke("customer-portal", {
        body: { source_platform: "authorsbureau" },
      });
      if (error) throw error;
      if (data?.url && popup) {
        popup.location.href = data.url;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      popup?.close();
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
        if (authorSlug) window.open(`/${authorSlug}`, "_blank");
        else onNavigate("profile");
        break;
      case "connect-stripe": onNavigate("connect-stripe"); break;
      case "build": onNavigate("revenue-streams"); break;
      case "analytics": onNavigate("analytics"); break;
    }
  };

  // STATE A: Author has NOT completed Abby's analysis
  // Only show onboarding if dashboard has fully loaded and no plan exists
  if (!hasBootstrapped) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Bug 1 fix: only show Meet Abby onboarding to true first-time authors (zero books).
  // Returning authors fall through to the normal multi-book dashboard immediately.
  // Trust author-stats.bookCount as a third signal — it queries via service role
  // and survives transient list-my-books / dashboard-state failures or token
  // races (e.g. Safari restoring a stale shared-backend session).
  const trustedBookCount = Math.max(
    bookCount,
    myBooks.length,
    stats?.bookCount ?? 0,
  );
  if (!hasPlan && trustedBookCount === 0) {
    return (
      <div className="max-w-6xl space-y-8">
        {/* Multi-book picker — shown when author has >1 book */}
        {myBooks.length > 1 && (
          <MultiBookPicker
            books={myBooks}
            perBook={stats.products?.perBook}
            onAddBook={() => onNavigate("my-books")}
          />
        )}

        {/* Section 1: Meet Abby (top) */}
        <MeetAbbySection
          hasPlan={false}
          planSummary={undefined}
          hasBook={bookCount > 0}
          bookApproved={bookApproved}
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
          bookApproved={bookApproved}
          onAction={handleJourneyAction}
        />

        {/* Section 3: Compact Microsite Card (bottom) */}
        <CompactMicrositeCard
          profileState={profileState}
          authorSlug={authorSlug}
          authorName={authorName}
          onSetupProfile={() => onNavigate("profile")}
          onViewMicrosite={() => {
            if (authorSlug) window.open(`/${authorSlug}`, "_blank");
            else onNavigate("profile");
          }}
        />
      </div>
    );
  }

  // STATE B: Author HAS completed Abby's analysis
  return (
    <div className="max-w-6xl space-y-8">
      {/* Multi-book picker — shown when author has >1 book */}
      {myBooks.length > 1 && (
        <MultiBookPicker
          books={myBooks}
          perBook={stats.products?.perBook}
          onAddBook={() => onNavigate("my-books")}
        />
      )}

      {/* Section 1: 4-Step Journey (top, step 3 highlighted) */}
      <JourneyMapCTA
        micrositeState={micrositeStep}
        planState={planStep}
        buildState={buildStep}
        sellState={sellStep}
        currentJourneyStep={currentJourneyStep}
        onAction={handleJourneyAction}
      />

      {/* Special Edition Calendar — proactive seasonal prompts (BP-08) */}
      <SpecialEditionCalendarCard />

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
          if (authorSlug) window.open(`/${authorSlug}`, "_blank");
          else onNavigate("profile");
        }}
      />
    </div>
  );
}
