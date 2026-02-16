import { useState, useEffect, useCallback } from "react";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";

interface PlatformAccessState {
  platforms: string[];
  loading: boolean;
  hasMarketing: boolean;
  requestAccess: () => Promise<void>;
  requesting: boolean;
  requested: boolean;
}

export function usePlatformAccess(): PlatformAccessState {
  const { isAdmin } = useAuth();
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${SHARED_BACKEND_URL}/functions/v1/platform-access`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "check",
              source_platform: "authorsbureau",
            }),
          }
        );

        const data = await res.json();
        setPlatforms(data.platforms || []);
      } catch (err) {
        console.error("Platform access check failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestAccess = useCallback(async () => {
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      await fetch(
        `${SHARED_BACKEND_URL}/functions/v1/platform-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "request",
            platform: "marketing",
            source_platform: "authorsbureau",
          }),
        }
      );

      setRequested(true);
    } catch (err) {
      console.error("Request access failed:", err);
    } finally {
      setRequesting(false);
    }
  }, []);

  return {
    platforms,
    loading: isAdmin ? false : loading,
    hasMarketing: isAdmin ? true : platforms.includes("marketing"),
    requestAccess,
    requesting,
    requested,
  };
}
