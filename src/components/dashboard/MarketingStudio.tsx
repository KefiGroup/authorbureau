import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Workflow, Globe,
  Mail, CalendarDays, AlertCircle, ArrowLeft, ExternalLink,
} from "lucide-react";

const BASE_DOMAIN = "app.leadconnectorhq.com";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "contacts", label: "Contacts", icon: Users, path: "/contacts/smart_list/All" },
  { id: "automations", label: "Automations", icon: Workflow, path: "/automation/list" },
  { id: "funnels", label: "Funnels", icon: Globe, path: "/funnels-websites" },
  { id: "email", label: "Email", icon: Mail, path: "/marketing/emails" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, path: "/calendars" },
] as const;

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MarketingStudio({ onNavigate }: Props) {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("ghl_sub_account_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.ghl_sub_account_id) {
        setLocationId(data.ghl_sub_account_id);
      } else {
        setError(data ? "not_connected" : "no_profile");
      }
      setLoading(false);
    })();
  }, [user]);

  const openSection = (sectionPath: string) => {
    if (!locationId) return;
    window.open(
      `https://${BASE_DOMAIN}/v2/location/${locationId}${sectionPath}`,
      "_blank",
      "noopener"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error === "not_connected" || error === "no_profile") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Marketing Studio</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {error === "no_profile"
            ? "Please complete your author profile first to access the Marketing Studio."
            : "Connect your Marketing Hub in Settings to access the full Marketing Studio."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate("marketing-hub")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Hub
            </Button>
          )}
          {error === "not_connected" && onNavigate && (
            <Button size="sm" onClick={() => onNavigate("connect-settings")}>
              Connect Marketing Hub
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {onNavigate && (
          <Button variant="ghost" size="icon" onClick={() => onNavigate("marketing-hub")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold font-heading">Marketing Studio</h1>
          <p className="text-sm text-muted-foreground">
            Access your marketing dashboard, contacts, automations and more
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Button
              key={s.id}
              variant="outline"
              className="h-auto flex-col gap-2 py-6"
              onClick={() => openSection(s.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{s.label}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Opens in a new tab. You may need to log in to your marketing account on first visit.
      </p>
    </div>
  );
}
