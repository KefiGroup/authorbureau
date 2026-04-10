import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { isSuperAdmin } from "@/lib/superadmin";
import { supabase } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
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
  if (productId === TIERS.yield.product_id) return "yield";
  if (productId === TIERS.build.product_id) return "build";
  if (productId === TIERS.brand.product_id) return "brand";
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

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  subscription: { subscribed: false, productId: null, subscriptionEnd: null, loading: true },
  isPremium: false,
  tier: "free",
  checkSubscription: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    setSubscription((prev) => ({ ...prev, loading: true }));
    const timeout = setTimeout(() => {
      setSubscription((prev) => ({ ...prev, loading: false }));
    }, 8000);
    try {
      // Get the shared backend session token to pass to the local Cloud function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const { data, error } = await cloudSupabase.functions.invoke("check-subscription", {
        body: { source_platform: "authorsbureau" },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      clearTimeout(timeout);
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed ?? false,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch (error) {
      clearTimeout(timeout);
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
          if (isAdminSession) setIsAdmin(true);

          // Check admin role - don't set loading false until this completes
          const userId = session.user.id;
          Promise.resolve(supabase.rpc("has_role", { _user_id: userId, _role: "admin" }))
            .then(({ data }) => {
              setIsAdmin(!!data || isAdminSession);
            })
            .catch(() => {
              setIsAdmin(isAdminSession);
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          setIsAdmin(false);
          setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
        setIsAdmin(!!data || isAdminSession);
      }

      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Safety timeout: ensure loading resolves within 5 seconds
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      authSub.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Check subscription when user is set
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const superAdmin = isSuperAdmin(user?.email);
  const tier: SubscriptionTier = superAdmin ? "yield" : getTierFromProductId(subscription.productId);
  const isPremium = superAdmin || tier !== "free";

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
