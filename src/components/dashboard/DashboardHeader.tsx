import { LogOut, Crown, Menu, Shield, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  isPremium: boolean;
  isAdmin?: boolean;
  subscription: { subscribed: boolean; loading: boolean };
  onSignOut: () => void;
  onToggleSidebar: () => void;
}

export default function DashboardHeader({ user, isPremium, isAdmin, onSignOut, onToggleSidebar }: Props) {
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleGoToPublishNow = async () => {
    setSsoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${SHARED_BACKEND_URL}/functions/v1/sso-handoff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "generate",
            session_data: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
            source_platform: "authorsbureau",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || "Failed to generate SSO token");

      window.location.href = `https://publishnowinterface.lovable.app/#/sso?token=${data.token}&from=authorsbureau`;
    } catch (err) {
      console.error("SSO redirect failed:", err);
      setSsoLoading(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold">AI Marketing Studio</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {user.email}
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                <Crown className="h-2.5 w-2.5" /> Premium
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleGoToPublishNow} disabled={ssoLoading} variant="outline" size="sm" className="text-muted-foreground">
          {ssoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
          Go to PublishNow
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="sm" className="text-muted-foreground">
            <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Admin Panel</Link>
          </Button>
        )}
        <Button onClick={onSignOut} variant="ghost" size="sm" className="text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </header>
  );
}
