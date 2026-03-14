import { useState, useEffect, useMemo } from "react";
import { Palette, Check, Loader2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AUTHOR_THEMES, getThemeById, getThemeFontsUrl, type AuthorTheme } from "@/lib/author-themes";
import { toast } from "@/hooks/use-toast";

interface Props {
  compact?: boolean;
  onThemeChange?: (themeId: string) => void;
}

export default function SiteThemePicker({ compact = false, onThemeChange }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState("classic-elegant");
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [authorName, setAuthorName] = useState("Your Name");
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorTagline, setAuthorTagline] = useState("Author & Speaker");
  const [bookTitle, setBookTitle] = useState("Your Book Title");
  const [bookCover, setBookCover] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("author_profiles")
      .select("site_theme, pen_name, photo_url, tagline")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.site_theme) setSelected(data.site_theme);
        if (data?.pen_name) setAuthorName(data.pen_name);
        if (data?.photo_url) setAuthorPhoto(data.photo_url);
        if (data?.tagline) setAuthorTagline(data.tagline);
        setLoaded(true);
      });

    // Fetch first book for preview
    supabase
      .from("books")
      .select("title, cover_image_url")
      .eq("author_id", user.id)
      .not("published_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.title) setBookTitle(data.title);
        if (data?.cover_image_url) setBookCover(data.cover_image_url);
      });
  }, [user]);

  async function applyTheme(themeId: string) {
    setSelected(themeId);
    setPreviewThemeId(null);
    setSaving(true);
    const { error } = await supabase
      .from("author_profiles")
      .update({ site_theme: themeId } as any)
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving theme", variant: "destructive" });
    } else {
      toast({ title: "Theme applied! Your site will reflect this immediately." });
      onThemeChange?.(themeId);
    }
  }

  const previewTheme = useMemo(
    () => (previewThemeId ? getThemeById(previewThemeId) : null),
    [previewThemeId]
  );

  if (!loaded) return null;

  // Compact mode — simple horizontal scroll
  if (compact) {
    return (
      <Card className="p-4 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-secondary" />
          <h3 className="font-heading font-bold text-sm">Website Look & Feel</h3>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Choose a style that matches your genre and brand.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {AUTHOR_THEMES.map((theme) => {
            const isActive = selected === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={`relative shrink-0 text-left p-2 rounded-lg border transition-all w-[110px] ${
                  isActive ? "border-secondary ring-2 ring-secondary/20" : "border-border hover:border-secondary/40"
                }`}
              >
                {isActive && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-secondary flex items-center justify-center">
                    <Check className="h-2 w-2 text-secondary-foreground" />
                  </div>
                )}
                <div className="flex gap-0.5 mb-1.5">
                  <div className="w-4 h-4 rounded-full border border-border/30" style={{ background: theme.vars.primary }} />
                  <div className="w-4 h-4 rounded-full border border-border/30" style={{ background: theme.vars.accent }} />
                  <div className="w-4 h-4 rounded-full border border-border/30" style={{ background: theme.vars.secondaryBg }} />
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

  // Full grid mode with preview
  return (
    <Card className="p-5 border-border">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-5 w-5 text-secondary" />
        <h3 className="font-heading font-bold text-base">Appearance — Choose Your Theme</h3>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Select a theme that matches your genre. Click a theme to preview, then click "Apply Theme" to save.
      </p>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
        {AUTHOR_THEMES.map((theme) => {
          const isActive = selected === theme.id;
          const isPreviewing = previewThemeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setPreviewThemeId(theme.id === previewThemeId ? null : theme.id)}
              className={`relative text-left rounded-xl border-2 transition-all overflow-hidden ${
                isActive
                  ? "border-secondary ring-2 ring-secondary/20"
                  : isPreviewing
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {/* Mini preview */}
              <div className="relative">
                <ThemeMiniPreview
                  theme={theme}
                  authorName={authorName}
                  authorPhoto={authorPhoto}
                  bookTitle={bookTitle}
                  bookCover={bookCover}
                />
                {/* Active/Preview overlay */}
                {isActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold">
                    <Check className="h-3 w-3" /> Active
                  </div>
                )}
                {isPreviewing && !isActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    <Eye className="h-3 w-3" /> Previewing
                  </div>
                )}
              </div>

              {/* Theme info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Color swatches */}
                  <div className="w-4 h-4 rounded-full border border-border/30 shrink-0" style={{ background: theme.vars.primary }} title="Primary" />
                  <div className="w-4 h-4 rounded-full border border-border/30 shrink-0" style={{ background: theme.vars.accent }} title="Accent" />
                  <div className="w-4 h-4 rounded-full border border-border/30 shrink-0" style={{ background: theme.vars.secondaryBg }} title="Secondary" />
                  <div className="w-4 h-4 rounded-full border border-border/30 shrink-0" style={{ background: theme.vars.cardBg }} title="Card" />
                </div>
                <p className="text-xs font-bold leading-tight">{theme.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Best for: {theme.genre}
                </p>
                {/* Font preview */}
                <div className="flex gap-2 mt-1.5 text-[9px] text-muted-foreground">
                  <span style={{ fontFamily: theme.headingFont, fontWeight: 700 }}>Heading</span>
                  <span className="opacity-40">|</span>
                  <span style={{ fontFamily: theme.bodyFont }}>Body text</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Full Preview Panel */}
      {previewTheme && (
        <div className="mt-5 border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <p className="text-xs font-semibold">
              Preview: <span className="text-primary">{previewTheme.name}</span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setPreviewThemeId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyTheme(previewTheme.id)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Apply Theme
              </Button>
            </div>
          </div>

          {/* Load fonts for preview */}
          <link rel="stylesheet" href={getThemeFontsUrl(previewTheme)} />

          {/* Live hero preview using author's real data */}
          <div
            className="relative overflow-hidden"
            style={{
              background: previewTheme.vars.primary,
              backgroundImage: `radial-gradient(ellipse at 30% 50%, ${previewTheme.vars.accent}15 0%, transparent 70%)`,
            }}
          >
            <div className="px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Author photo */}
              <div className="shrink-0">
                {authorPhoto ? (
                  <img
                    src={authorPhoto}
                    alt={authorName}
                    className="w-20 h-20 rounded-full object-cover"
                    style={{ border: `3px solid ${previewTheme.vars.accent}` }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: previewTheme.vars.accent, color: previewTheme.vars.accentText }}
                  >
                    {authorName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2
                  className="text-2xl font-bold mb-1"
                  style={{ color: previewTheme.vars.primaryText, fontFamily: previewTheme.headingFont }}
                >
                  {authorName}
                </h2>
                <p className="text-sm mb-3" style={{ color: `${previewTheme.vars.primaryText}D9`, fontFamily: previewTheme.bodyFont }}>
                  {authorTagline}
                </p>

                {/* Sample book card */}
                <div
                  className="inline-flex items-center gap-3 rounded-lg px-4 py-2.5"
                  style={{ background: `${previewTheme.vars.primaryText}10`, border: `1px solid ${previewTheme.vars.primaryText}20` }}
                >
                  {bookCover ? (
                    <img src={bookCover} alt="" className="w-8 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-12 rounded flex items-center justify-center" style={{ background: previewTheme.vars.accent }}>
                      <span className="text-[8px]" style={{ color: previewTheme.vars.accentText }}>📖</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold" style={{ color: previewTheme.vars.primaryText, fontFamily: previewTheme.headingFont }}>
                      {bookTitle}
                    </p>
                    <p className="text-[10px]" style={{ color: `${previewTheme.vars.primaryText}99` }}>Featured Book</p>
                  </div>
                </div>

                {/* Sample CTA buttons */}
                <div className="flex gap-2 mt-4 justify-center sm:justify-start">
                  <span
                    className="inline-block px-4 py-2 rounded-lg text-xs font-bold"
                    style={{ background: previewTheme.vars.accent, color: previewTheme.vars.accentText }}
                  >
                    Get Your Copy
                  </span>
                  <span
                    className="inline-block px-4 py-2 rounded-lg text-xs font-bold"
                    style={{ border: `2px solid ${previewTheme.vars.primaryText}66`, color: previewTheme.vars.primaryText }}
                  >
                    Learn More
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Light section preview */}
          <div className="px-6 py-6" style={{ background: previewTheme.vars.secondaryBg }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: previewTheme.vars.headingText, fontFamily: previewTheme.headingFont }}>
              About This Book
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: previewTheme.vars.bodyText, fontFamily: previewTheme.bodyFont }}>
              This is how your body text will look. The {previewTheme.name} theme uses{" "}
              <span style={{ fontFamily: previewTheme.headingFont, fontWeight: 700 }}>{previewTheme.headingFont.split(",")[0].replace(/'/g, "")}</span> for headings and{" "}
              <span style={{ fontFamily: previewTheme.bodyFont }}>{previewTheme.bodyFont.split(",")[0].replace(/'/g, "")}</span> for body text.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: previewTheme.vars.accent, color: previewTheme.vars.accentText }}>
                Accent Button
              </div>
              <div
                className="px-3 py-1.5 rounded-lg text-[10px]"
                style={{ background: previewTheme.vars.cardBg, border: `1px solid ${previewTheme.vars.cardBorder}`, color: previewTheme.vars.bodyText }}
              >
                Card Style
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* Mini preview — a simplified rendering of the author's hero in the theme's colors */
function ThemeMiniPreview({
  theme,
  authorName,
  authorPhoto,
  bookTitle,
  bookCover,
}: {
  theme: AuthorTheme;
  authorName: string;
  authorPhoto: string | null;
  bookTitle: string;
  bookCover: string | null;
}) {
  return (
    <div
      className="h-28 relative overflow-hidden"
      style={{
        background: theme.vars.primary,
        backgroundImage: `radial-gradient(ellipse at 30% 50%, ${theme.vars.accent}15 0%, transparent 70%)`,
      }}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        {/* Mini author photo */}
        {authorPhoto ? (
          <img
            src={authorPhoto}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0"
            style={{ border: `2px solid ${theme.vars.accent}` }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: theme.vars.accent, color: theme.vars.accentText }}
          >
            {authorName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-bold truncate" style={{ color: theme.vars.primaryText, fontFamily: theme.headingFont }}>
            {authorName}
          </p>
          <p className="text-[8px] truncate" style={{ color: `${theme.vars.primaryText}AA` }}>
            {bookTitle}
          </p>
        </div>
      </div>
      {/* Mini book + CTA */}
      <div className="px-3 flex items-center gap-2">
        {bookCover ? (
          <img src={bookCover} alt="" className="w-5 h-7 rounded-sm object-cover" />
        ) : (
          <div className="w-5 h-7 rounded-sm" style={{ background: theme.vars.accent }} />
        )}
        <div
          className="px-2 py-0.5 rounded text-[7px] font-bold"
          style={{ background: theme.vars.accent, color: theme.vars.accentText }}
        >
          Get Copy
        </div>
        <div
          className="px-2 py-0.5 rounded text-[7px]"
          style={{ border: `1px solid ${theme.vars.primaryText}66`, color: theme.vars.primaryText }}
        >
          More
        </div>
      </div>
      {/* Bottom light section preview strip */}
      <div className="absolute bottom-0 left-0 right-0 h-5 px-3 flex items-center gap-2" style={{ background: theme.vars.secondaryBg }}>
        <div className="w-12 h-1.5 rounded-full" style={{ background: theme.vars.headingText }} />
        <div className="w-20 h-1 rounded-full" style={{ background: theme.vars.mutedText, opacity: 0.4 }} />
      </div>
    </div>
  );
}
