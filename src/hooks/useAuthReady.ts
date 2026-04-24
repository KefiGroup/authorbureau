import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/shared-backend";
import type { User } from "@supabase/supabase-js";

interface AuthReadyState {
  user: User | null;
  isReady: boolean;
}

/**
 * Waits for the shared PublishNow auth client to finish restoring the session
 * from localStorage before exposing the user object.
 *
 * Using getSession() alone on mount can return null because the token
 * has not been parsed yet. This hook listens to onAuthStateChange which
 * fires an INITIAL_SESSION event once restoration is complete.
 */
export function useAuthReady(): AuthReadyState {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initialResolvedRef = useRef(false);
  const latestUserRef = useRef<User | null>(null);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    // Restore once from storage first.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      initialResolvedRef.current = true;
      setUser(session?.user ?? null);
      setIsReady(true);
    });

    // Then listen for subsequent auth changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      // Ignore stale empty INITIAL_SESSION events that can arrive after a
      // valid session has already been restored, otherwise components can
      // incorrectly flip back to a signed-out state.
      if (_event === "INITIAL_SESSION" && initialResolvedRef.current && !session?.user && latestUserRef.current) {
        return;
      }

      initialResolvedRef.current = true;
      setUser(session?.user ?? null);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, isReady };
}
