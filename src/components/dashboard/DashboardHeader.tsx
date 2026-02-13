import { LogOut, Crown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  isPremium: boolean;
  subscription: { subscribed: boolean; loading: boolean };
  onSignOut: () => void;
  onToggleSidebar: () => void;
}

export default function DashboardHeader({ user, isPremium, onSignOut, onToggleSidebar }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold">Author Dashboard</h1>
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
      <Button onClick={onSignOut} variant="ghost" size="sm" className="text-muted-foreground">
        <LogOut className="mr-2 h-4 w-4" /> Sign Out
      </Button>
    </header>
  );
}
