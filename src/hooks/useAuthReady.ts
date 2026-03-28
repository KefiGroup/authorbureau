import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthReadyState {
  user: User | null;
  isReady: boolean;
}

/**
 * Waits for the Supabase client to finish restoring the auth session
 * from localStorage before exposing the user object.
 *
 * Using getSession() alone on mount can return null because the token
 * has not been parsed yet. This hook listens to onAuthStateChange which
 * fires an INITIAL_SESSION event once restoration is complete.
 */
export function useAuthReady(): AuthReadyState {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Subscribe first so we never miss the INITIAL_SESSION event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[useAuthReady] event fired:", _event, "user:", session?.user?.id ?? "none");
      setUser(session?.user ?? null);
      setIsReady(true);
    });

    // 2. Fallback: if onAuthStateChange already fired before we subscribed,
    //    getSession() will return the cached result synchronously.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser((prev) => prev ?? session?.user ?? null);
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isReady };
}
