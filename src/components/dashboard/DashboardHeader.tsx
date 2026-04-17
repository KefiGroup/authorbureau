import { useState, useEffect } from "react";
import { LogOut, Crown, Menu, Shield, Settings, User, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { SubscriptionTier } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NotificationCenter from "./NotificationCenter";

interface Props {
  user: SupaUser;
  isPremium: boolean;
  isAdmin?: boolean;
  tier?: SubscriptionTier;
  subscription: { subscribed: boolean; loading: boolean };
  onSignOut: () => void;
  onToggleSidebar: () => void;
  onNavigate?: (section: string) => void;
}

export default function DashboardHeader({ user, isPremium, isAdmin, tier, subscription, onSignOut, onToggleSidebar, onNavigate }: Props) {
  const [penName, setPenName] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const displayName = user.email || penName;
  const effectiveTier = isAdmin ? "yield" : tier;

  const TIER_DISPLAY: Record<string, string> = {
    starter: "Brand", pro: "Build", enterprise: "Yield",
    brand: "Brand", build: "Build", yield: "Yield",
  };
  const tierDisplay = effectiveTier ? (TIER_DISPLAY[effectiveTier] || effectiveTier.charAt(0).toUpperCase() + effectiveTier.slice(1)) : null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold">Authors Bureau</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {displayName}
            {effectiveTier && effectiveTier !== "free" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                <Crown className="h-2.5 w-2.5" /> {tierDisplay}
              </span>
            ) : !subscription.loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Free
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Notification Center */}
        <NotificationCenter userId={user.id} onNavigate={onNavigate} />

        {isAdmin && (
          <Button asChild variant="outline" size="sm" className="text-muted-foreground">
            <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Admin Panel</Link>
          </Button>
        )}

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account-settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="cursor-pointer text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to sign out of your account?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onSignOut}>Sign Out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
