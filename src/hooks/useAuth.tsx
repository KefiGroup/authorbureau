import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { isSuperAdmin } from "@/lib/superadmin";
import { getSharedSession, supabase } from "@/lib/shared-backend";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import type { User, Session } from "@supabase/supabase-js";

// Admin status key for sessionStorage (set by AdminAuth page on successful admin-auth login)
const ADMIN_AUTH_KEY = "ab_admin_auth";

// Stripe tier config — 3-tier ABBY subscription model
export const TIERS = {
  brand: {
    price_id: "price_1TGHTECk4r0emyO8ihPfmV2S",        // $69/mo usual
    special_price_id: "price_1TCjzFCk4r0emyO8LdzhvM9V", // $49/mo special
    annual_price_id: "price_1TF01ZCk4r0emyO8xHrc9Vc8",
    product_id: "prod_UB6BxxNnqv6UpV",
    annual_product_id: "prod_UDQttfkI82vPTf",
    label: "Brand Plan",
    monthlyPrice: 69,
    specialPrice: 49,
    annualPrice: 488,
    usualPrice: 69,
    payment_link_monthly: "https://buy.stripe.com/00w5kC0TYeqvfyF7etao800",
    payment_link_annual: "https://buy.stripe.com/eVqbJ05aedmrcmtcyNao801",
  },
  build: {
    price_id: "price_1TGHTmCk4r0emyO8OWUPrVRk",        // $199/mo usual
    special_price_id: "price_1TCjzGCk4r0emyO8jkYgPpmL", // $99/mo special
    annual_price_id: "price_1TF01aCk4r0emyO8Whkqo6gz",
    product_id: "prod_UB6BfcKCAYrgp0",
    annual_product_id: "prod_UDQtofrWi6NpKc",
    label: "Build Plan",
    monthlyPrice: 199,
    specialPrice: 99,
    annualPrice: 988,
    usualPrice: 199,
    payment_link_monthly: "https://buy.stripe.com/5kQcN4fOS1DJgCJbuJao802",
    payment_link_annual: "https://buy.stripe.com/4gMeVc7imdmrfyFfKZao803",
  },
  yield: {
    price_id: "price_1TGHUFCk4r0emyO87YrgqXJH",         // $499/mo usual
    special_price_id: "price_1TCjzHCk4r0emyO82PblWqRl",  // $249/mo special
    annual_price_id: "price_1TF01bCk4r0emyO8WOX1NhtB",
    product_id: "prod_UB6BVLnks6JWoJ",
    annual_product_id: "prod_UDQtP7TtNPX0jm",
    label: "Yield Plan",
    monthlyPrice: 499,
    specialPrice: 249,
    annualPrice: 2488,
    usualPrice: 499,
    payment_link_monthly: "https://buy.stripe.com/3cI4gybyC4PV5Y59mBao804",
    payment_link_annual: "https://buy.stripe.com/cNifZgauy96baelcyNao805",
  },
} as const;

// Legacy aliases for backward compatibility during migration
export const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  starter: "brand",
  pro: "build",
  enterprise: "yield",
};

export type SubscriptionTier = "free" | "brand" | "build" | "yield";

export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  if (productId === TIERS.yield.product_id || productId === TIERS.yield.annual_product_id) return "yield";
  if (productId === TIERS.build.product_id || productId === TIERS.build.annual_product_id) return "build";
  if (productId === TIERS.brand.product_id || productId === TIERS.brand.annual_product_id) return "brand";
  return "free";
}

export function hasTierAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ["free", "brand", "build", "yield"];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checked: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  subscription: SubscriptionState;
  isPremium: boolean;
  tier: SubscriptionTier;
  checkSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const initialSubscriptionState: SubscriptionState = {
  subscribed: false,
  productId: null,
  subscriptionEnd: null,
  loading: true,
  checked: false,
};

const signedOutSubscriptionState: SubscriptionState = {
  subscribed: false,
  productId: null,
  subscriptionEnd: null,
  loading: false,
  checked: true,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  subscription: initialSubscriptionState,
  isPremium: false,
  tier: "free",
  checkSubscription: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>(initialSubscriptionState);

  const latestUserRef = useRef<User | null>(null);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setSubscription(signedOutSubscriptionState);
  }, []);

  const resolveAdminStatus = useCallback((userId: string | null) => {
    const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";

    if (!userId) {
      setIsAdmin(isAdminSession);
      setAuthLoading(false);
      return;
    }

    // Hydrate from cache (5-min TTL) so admin gating renders instantly on
    // subsequent navigations instead of waiting for the RPC round-trip.
    const ADMIN_CACHE_KEY = `ab_admin_cache:${userId}`;
    try {
      const raw = window.localStorage.getItem(ADMIN_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const fresh = cached?.checkedAt && Date.now() - cached.checkedAt < 5 * 60_000;
        if (fresh && typeof cached?.isAdmin === "boolean") {
          setIsAdmin(cached.isAdmin || isAdminSession);
          setAuthLoading(false);
          // Refresh in background — fall through to RPC below
        }
      }
    } catch { /* ignore */ }

    window.setTimeout(() => {
      Promise.resolve(supabase.rpc("has_role", { _user_id: userId, _role: "admin" }))
        .then(({ data: hasAdminRole }) => {
          setIsAdmin(!!hasAdminRole || isAdminSession);
          try {
            window.localStorage.setItem(
              ADMIN_CACHE_KEY,
              JSON.stringify({ isAdmin: !!hasAdminRole, checkedAt: Date.now() })
            );
          } catch { /* ignore */ }
        })
        .catch(() => {
          setIsAdmin(isAdminSession);
        })
        .finally(() => {
          setAuthLoading(false);
        });
    }, 0);
  }, []);

  const applySessionSnapshot = useCallback((nextSession: Session | null) => {
    if (!nextSession) {
      clearAuthState();
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    setSession(nextSession);
    setUser(nextSession.user ?? null);
    resolveAdminStatus(nextSession.user?.id ?? null);
  }, [clearAuthState, resolveAdminStatus]);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(signedOutSubscriptionState);
      return;
    }

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("No active session token");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`check-subscription HTTP ${resp.status}: ${text}`);
      }

      const data = await resp.json();
      const next: SubscriptionState = {
        subscribed: !!data?.subscribed,
        productId: (data?.product_id as string | null) ?? null,
        subscriptionEnd: (data?.subscription_end as string | null) ?? null,
        loading: false,
        checked: true,
      };
      setSubscription(next);
      // Cache last-known good subscription so subsequent loads don't flash "Free"
      try {
        if (user?.id) {
          window.localStorage.setItem(
            `ab_sub_cache:${user.id}`,
            JSON.stringify({ ...next, checkedAt: Date.now() })
          );
        }
      } catch { /* ignore */ }
    } catch (error) {
      console.warn("[useAuth] check-subscription failed (preserving last-known tier):", error);
      // IMPORTANT: do NOT downgrade the user on transient failures.
      // Keep whatever productId we already have — only flip `loading` off
      // and mark `checked` so the app doesn't hang on the loading skeleton.
      setSubscription((prev) => ({
        ...prev,
        loading: false,
        checked: true,
      }));
    }
  }, [user]);

  useEffect(() => {
    let sessionResolved = false;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "INITIAL_SESSION" && !nextSession?.user && latestUserRef.current) {
          return;
        }

        sessionResolved = true;
        window.setTimeout(() => {
          applySessionSnapshot(nextSession);
        }, 0);
      }
    );

    getSharedSession().then((session) => {
      sessionResolved = true;
      applySessionSnapshot(session);
    }).catch(() => {
      sessionResolved = true;
      setAuthLoading(false);
    });

    // Safety timeout: only fire if session restoration genuinely stalled.
    // Bumped to 8s for Safari, where cross-domain cookie/localStorage reads
    // can outrun the previous 3s budget and falsely flip loading→false
    // while the user is still null (causing protected routes to bounce
    // to /auth and lose the deep link).
    const timeout = window.setTimeout(() => {
      if (!sessionResolved) setAuthLoading(false);
    }, 8000);

    return () => {
      authSub.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [applySessionSnapshot]);

  useEffect(() => {
    if (user?.id) {
      // Hydrate from local cache (5-minute TTL) so the badge shows the
      // correct tier instantly while check-subscription verifies in the bg.
      try {
        const raw = window.localStorage.getItem(`ab_sub_cache:${user.id}`);
        if (raw) {
          const cached = JSON.parse(raw);
          const fresh = cached?.checkedAt && Date.now() - cached.checkedAt < 5 * 60_000;
          if (fresh && cached?.productId) {
            setSubscription({
              subscribed: !!cached.subscribed,
              productId: cached.productId ?? null,
              subscriptionEnd: cached.subscriptionEnd ?? null,
              loading: false,
              checked: true,
            });
            return;
          }
        }
      } catch { /* ignore */ }
      setSubscription(initialSubscriptionState);
      return;
    }

    setSubscription(signedOutSubscriptionState);
  }, [user?.id]);

  // Check subscription once the authenticated user is known.
  // Keep the app in a loading state until this resolves definitively.
  useEffect(() => {
    if (user && !subscription.checked) {
      void checkSubscription();
    }
  }, [user, subscription.checked, checkSubscription]);

  // Auto-refresh subscription every 60s without blocking the whole app once verified
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      void checkSubscription();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [user, checkSubscription]);

  const superAdmin = isSuperAdmin(user?.email);
  const tier: SubscriptionTier = superAdmin ? "yield" : getTierFromProductId(subscription.productId);
  const isPremium = superAdmin || tier !== "free";
  const loading = authLoading || (!!user && !subscription.checked);

  const signOut = async () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, subscription, isPremium, tier, checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
