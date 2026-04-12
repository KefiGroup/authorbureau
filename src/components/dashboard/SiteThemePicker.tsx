import { useState, useEffect, useMemo } from "react";
import { Palette, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AUTHOR_THEMES, getThemeById } from "@/lib/author-themes";
import { toast } from "@/hooks/use-toast";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

interface Props {
  compact?: boolean;
  onThemeChange?: (themeId: string) => void;
}

export default function SiteThemePicker({ compact = false, onThemeChange }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState("classic-elegant");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("author_profiles")
      .select("site_theme")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.site_theme) setSelected(data.site_theme);
        setLoaded(true);
      });
  }, [user]);

  async function save(themeId: string) {
    if (saving) return;
    const prev = selected;
    setSelected(themeId); // optimistic
    setSaving(true);

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "save", payload: { site_theme: themeId } }),
        }
      );

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Save failed");

      toast({ title: "Theme updated! Your site will reflect this immediately." });
      onThemeChange?.(themeId);
    } catch (err: any) {
      setSelected(prev); // rollback
      toast({ title: err.message || "Error saving theme", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const currentTheme = useMemo(() => getThemeById(selected), [selected]);

  if (!loaded) return null;

  if (compact) {
    return (
      <Card className="p-4 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-secondary" />
          <h3 className="font-heading font-bold text-sm">Website Look & Feel</h3>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Choose a style that matches your genre and brand. This applies to your public author page.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {AUTHOR_THEMES.map((theme) => {
            const isActive = selected === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => save(theme.id)}
                disabled={saving}
                className={`relative shrink-0 text-left p-2 rounded-lg border transition-all w-[110px] ${
                  isActive
                    ? "border-secondary ring-2 ring-secondary/20"
                    : "border-border hover:border-secondary/40"
                } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {isActive && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-secondary flex items-center justify-center">
                    <Check className="h-2 w-2 text-secondary-foreground" />
                  </div>
                )}
                <div className="flex gap-0.5 mb-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${theme.colors.heroBackground})` }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${theme.colors.accent})` }} />
                  <div className="w-4 h-4 rounded-full border border-border" style={{ background: `hsl(${theme.colors.sectionAlt})` }} />
                </div>
                <p className="text-[10px] font-semibold leading-tight truncate">{theme.name}</p>
                <p className="text-[8px] text-muted-foreground leading-tight mt-0.5 truncate">{theme.genre}</p>
              </button>
            );
          })}
        </div>
      </Card>
    );
  }

  // Full grid mode
  return (
    <Card className="p-4 border-border">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-secondary" />
        <h3 className="font-heading font-bold text-sm">Look & Feel</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Choose a style that matches your genre and brand.
      </p>

      <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {AUTHOR_THEMES.map((theme) => {
          const isActive = selected === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => save(theme.id)}
              disabled={saving}
              className={`relative text-left p-2.5 rounded-lg border transition-all ${
                isActive
                  ? "border-secondary ring-2 ring-secondary/20"
                  : "border-border hover:border-secondary/40"
              } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isActive && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-secondary-foreground" />
                </div>
              )}
              <div className="flex gap-1 mb-2">
                <div className="w-5 h-5 rounded-full" style={{ background: `hsl(${theme.colors.heroBackground})` }} />
                <div className="w-5 h-5 rounded-full" style={{ background: `hsl(${theme.colors.accent})` }} />
                <div className="w-5 h-5 rounded-full border border-border" style={{ background: `hsl(${theme.colors.sectionAlt})` }} />
              </div>
              <p className="text-[11px] font-semibold leading-tight">{theme.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{theme.genre}</p>
            </button>
          );
        })}
      </div>

      {saving && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </div>
      )}
    </Card>
  );
}
