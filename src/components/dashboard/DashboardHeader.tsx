import { LogOut, Crown, Menu, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { SubscriptionTier } from "@/hooks/useAuth";

interface Props {
  user: User;
  isPremium: boolean;
  isAdmin?: boolean;
  tier?: SubscriptionTier;
  subscription: { subscribed: boolean; loading: boolean };
  onSignOut: () => void;
  onToggleSidebar: () => void;
}

export default function DashboardHeader({ user, isPremium, isAdmin, tier, onSignOut, onToggleSidebar }: Props) {
  const [penName, setPenName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPenName() {
      const { data } = await supabase
        .from("author_profiles")
        .select("pen_name")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (data?.pen_name) setPenName(data.pen_name);
    }
    fetchPenName();
  }, [user.id]);

  const displayName = penName || user.email;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold">AI Marketing Studio</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {displayName}
            {tier && tier !== "free" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                <Crown className="h-2.5 w-2.5" /> {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Free
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
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
