import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, X } from "lucide-react";
import { useSocialConnectionStatus } from "@/hooks/useSocialConnectionStatus";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SESSION_DISMISS_KEY = "ab_dismiss_connect_social";

/**
 * Persistent dashboard nudge: only renders when the author has BP-03 content
 * sitting idle (live node OR unscheduled posts) but no social_connections.
 * Dismissible per session; reappears next login until at least one account
 * is connected.
 */
export default function ConnectSocialAccountsBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAnyConnection, loading } = useSocialConnectionStatus();
  const [hasContentWaiting, setHasContentWaiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || hasAnyConnection || loading) return;
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.id || cancelled) return;

      // Either a live BP-03 node exists, OR there are scheduled/draft posts.
      const [{ data: liveNodes }, { data: posts }] = await Promise.all([
        supabase
          .from("author_nodes")
          .select("id")
          .eq("author_id", profile.id)
          .eq("node_id", "BP-03")
          .eq("status", "live")
          .limit(1),
        supabase
          .from("social_media_content")
          .select("id")
          .eq("author_id", profile.id)
          .in("status", ["draft", "ready", "scheduled"])
          .limit(1),
      ]);
      if (cancelled) return;
      setHasContentWaiting((liveNodes?.length || 0) > 0 || (posts?.length || 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [user?.id, hasAnyConnection, loading]);

  if (loading || hasAnyConnection || !hasContentWaiting || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="p-4 mb-4 border-amber-500/40 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Share2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Your social posts are waiting.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect LinkedIn, Facebook Page, or Instagram Business so Authors Bureau can auto-publish on the dates you schedule.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => navigate("/connect-settings")}>
              Connect accounts
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
