import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/shared-backend";
import type { User, Session } from "@supabase/supabase-js";

// Admin status key for sessionStorage (set by AdminAuth page on successful admin-auth login)
const ADMIN_AUTH_KEY = "ab_admin_auth";

// Stripe tier config — 3-tier ABBY subscription model
export const TIERS = {
  starter: {
    price_id: "price_1T7zieL6NAuEbKmpgIPawb4z",
    product_id: "prod_U6C6uH8lxNdHGT",
    label: "Starter",
    monthlyPrice: 47,
  },
  pro: {
    price_id: "price_1T7zmSL6NAuEbKmph7f5bCoH",
    product_id: "prod_U6CAjp8iwbIoFj",
    label: "Pro",
    monthlyPrice: 197,
  },
  enterprise: {
    price_id: "price_1T7zpUL6NAuEbKmp5onvSShB",
    product_id: "prod_U6CDXjFWRuHmsb",
    label: "Enterprise",
    monthlyPrice: 497,
  },
} as const;

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  if (productId === TIERS.enterprise.product_id) return "enterprise";
  if (productId === TIERS.pro.product_id) return "pro";
  if (productId === TIERS.starter.product_id) return "starter";
  return "free";
}

export function hasTierAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ["free", "starter", "pro", "enterprise"];
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
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { source_platform: "authorsbureau" },
      });
      clearTimeout(timeout);
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed ?? false,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch {
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

          // Dispatch RPC outside the listener to avoid Supabase client deadlock
          const userId = session.user.id;
          setTimeout(async () => {
            const { data } = await supabase.rpc("has_role", {
              _user_id: userId,
              _role: "admin",
            });
            setIsAdmin(!!data || isAdminSession);
          }, 0);
        } else {
          setIsAdmin(false);
          setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
        }

        setLoading(false);
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
    const timeout = setTimeout(() => setLoading(false), 5000);

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

  const tier: SubscriptionTier = isAdmin ? "enterprise" : getTierFromProductId(subscription.productId);
  const isPremium = isAdmin || tier !== "free";

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
