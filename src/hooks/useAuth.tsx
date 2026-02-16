import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/shared-backend";
import type { User, Session } from "@supabase/supabase-js";

// Admin status key for sessionStorage (set by AdminAuth page on successful admin-auth login)
const ADMIN_AUTH_KEY = "ab_admin_auth";

// Known admin emails (fallback when admin-auth session flag isn't set)
export const ADMIN_EMAILS = ["fasahath@gmail.com", "pauline@publishnow.io"];

// Stripe tier config
export const TIERS = {
  premium: {
    price_id: "price_1T0EiXL6NAuEbKmpWFRCxYaV",
    product_id: "prod_TyB48pNvpfAnf4",
  },
} as const;

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
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase.rpc("has_role", {
            _user_id: session.user.id,
            _role: "admin",
          });
          const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
          const isAdminEmail = ADMIN_EMAILS.includes(session.user.email ?? "");
          setIsAdmin(!!data || isAdminSession || isAdminEmail);
        } else {
          setIsAdmin(false);
          setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        }).then(({ data }) => {
          const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
          const isAdminEmail = ADMIN_EMAILS.includes(session.user.email ?? "");
          setIsAdmin(!!data || isAdminSession || isAdminEmail);
        });
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

  const isPremium = subscription.subscribed && subscription.productId === TIERS.premium.product_id;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, subscription, isPremium, checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
