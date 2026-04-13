import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, LayoutDashboard, Users, Workflow, Globe,
  Mail, CalendarDays, RefreshCw, AlertCircle, ArrowLeft,
} from "lucide-react";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "automations", label: "Automations", icon: Workflow },
  { id: "funnels", label: "Funnels", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MarketingStudio({ onNavigate }: Props) {
  const { user } = useAuth();
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);

  // Resolve author profile ID
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("id, ghl_sub_account_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAuthorProfileId(data.id);
        if (!data.ghl_sub_account_id) {
          setError("not_connected");
          setLoading(false);
        }
      } else {
        setError("no_profile");
        setLoading(false);
      }
    })();
  }, [user]);

  const fetchSsoUrl = useCallback(
    async (section: SectionId) => {
      if (!authorProfileId) return;
      setLoading(true);
      setError(null);
      try {
        const token = await getActiveToken();
        const res = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-sso-link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token || ""}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ author_id: authorProfileId, section }),
          },
          15000
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load Marketing Studio");
        }
        setSsoUrl(data.sso_url);
      } catch (err: any) {
        console.error("SSO fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [authorProfileId]
  );

  // Fetch SSO on mount and when section changes
  useEffect(() => {
    if (authorProfileId && error !== "not_connected" && error !== "no_profile") {
      fetchSsoUrl(activeSection);
    }
  }, [authorProfileId, activeSection, fetchSsoUrl]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section as SectionId);
  };

  // Not connected state
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
            : "Connect your Marketing Hub in Settings to access the full Marketing Studio — design workflows, manage contacts, edit funnels, and view email analytics."}
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <Button variant="ghost" size="icon" onClick={() => onNavigate("marketing-hub")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold font-heading">Marketing Studio</h1>
            <p className="text-sm text-muted-foreground">
              Design workflows, manage contacts, and track your campaigns
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSsoUrl(activeSection)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Section tabs */}
      <Tabs value={activeSection} onValueChange={handleSectionChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Iframe or loading */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading Marketing Studio…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              <Button size="sm" onClick={() => fetchSsoUrl(activeSection)}>
                Try Again
              </Button>
            </div>
          </div>
        ) : ssoUrl ? (
          <iframe
            src={ssoUrl}
            className="w-full h-[calc(100vh-220px)] border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="clipboard-write"
            title="Marketing Studio"
          />
        ) : null}
      </div>
    </div>
  );
}
