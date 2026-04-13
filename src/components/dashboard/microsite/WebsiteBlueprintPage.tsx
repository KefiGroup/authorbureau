import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe, Copy, CheckCircle2, ExternalLink, BookOpen,
  GraduationCap, Users, Headphones, Mic, Loader2, Pencil, X, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import SiteThemePicker from "@/components/dashboard/SiteThemePicker";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import AbbyRecommendationCard from "@/components/dashboard/builders/shared/AbbyRecommendationCard";

/* ---------- Types ---------- */
interface BookProduct {
  id: string;
  title: string;
  type: string;
  status: string;
  route: string;
}

interface BookWithStatus {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  products: BookProduct[];
}

interface Props {
  onNavigate?: (section: string) => void;
}

const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  home_study: BookOpen,
  course: GraduationCap,
  coaching: Users,
  audiobook: Headphones,
  podcast: Mic,
};

export default function WebsiteBlueprintPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [booksWithStatus, setBooksWithStatus] = useState<BookWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugError, setSlugError] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleThemeChange = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const authorSlug = profileData?.author_slug || "";
  const siteUrl = authorSlug ? `https://authorsbureau.com/${authorSlug}` : "";

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    setLoading(true);

    // Resolve local profile with email fallback for shared-backend users
    let profileRes = await supabase.from("author_profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (!profileRes.data && user!.email) {
      const { data: bookByEmail } = await supabase
        .from("books")
        .select("author_id")
        .eq("owner_email", user!.email.toLowerCase())
        .limit(1)
        .maybeSingle();
      if (bookByEmail?.author_id) {
        profileRes = await supabase.from("author_profiles").select("*").eq("user_id", bookByEmail.author_id).maybeSingle();
      }
    }
    const resolvedUserId = profileRes.data?.user_id || user!.id;

    // Fetch books via edge function for proper ownership
    const booksResult = await (async () => {
      try {
        const token = await getActiveToken();
        if (!token) return { books: [] };
        const response = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }
        );
        const result = await response.json();
        if (!response.ok) return { books: [] };
        return { books: result.books || [] };
      } catch (error) {
        return { books: [] };
      }
    })();

    const profile = profileRes.data;
    setProfileData(profile);
    if (profile?.website_url) setCustomDomain(profile.website_url.replace(/^https?:\/\//, ""));

    const books = booksResult.books as any[];
    const bookIds = books.map((b: any) => b.id);

    // Fetch products for these books using resolved user ID
    let homeStudy: any[] = [];
    let courses: any[] = [];
    let coaching: any[] = [];
    let audiobooks: any[] = [];
    let podcasts: any[] = [];

    if (bookIds.length > 0) {
      const [hsRes, cRes, coachRes, abRes, podRes] = await Promise.all([
        supabase.from("home_study_courses").select("id, title, book_id, status").eq("author_id", resolvedUserId),
        supabase.from("courses").select("id, title, book_id, status").eq("author_id", resolvedUserId),
        supabase.from("coaching_packages").select("id, title, status").eq("author_id", resolvedUserId),
        supabase.from("audiobooks").select("id, title, book_id, status").eq("author_id", resolvedUserId),
        supabase.from("podcasts").select("id, title, book_id, status").eq("author_id", resolvedUserId),
      ]);
      homeStudy = hsRes.data || [];
      courses = cRes.data || [];
      coaching = coachRes.data || [];
      audiobooks = abRes.data || [];
      podcasts = podRes.data || [];
    }

    const enriched: BookWithStatus[] = books.map((book: any) => {
      const products: BookProduct[] = [];
      homeStudy.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "home_study", status: p.status, route: "homestudy" });
      });
      courses.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "course", status: p.status, route: "onlinecourse" });
      });
      audiobooks.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "audiobook", status: p.status, route: "audiobook" });
      });
      podcasts.filter((p) => p.book_id === book.id).forEach((p) => {
        products.push({ id: p.id, title: p.title, type: "podcast", status: p.status, route: "podcast" });
      });
      return { ...book, products };
    });

    if (coaching.length > 0 && enriched.length > 0) {
      coaching.forEach((p: any) => {
        enriched[0].products.push({ id: p.id, title: p.title, type: "coaching", status: p.status, route: "coaching" });
      });
    }

    setBooksWithStatus(enriched);
    setLoading(false);
  }

  async function saveDomain() {
    if (!customDomain.trim()) return;
    const url = customDomain.trim().startsWith("http") ? customDomain.trim() : `https://${customDomain.trim()}`;
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "save", payload: { website_url: url } }),
        }
      );
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Save failed");
      toast({ title: "Custom domain saved!" });
    } catch (err: any) {
      toast({ title: err.message || "Error saving domain", variant: "destructive" });
    }
  }

  async function saveSlug() {
    const clean = slugDraft.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-").replace(/(^-|-$)/g, "");
    if (!clean || clean.length < 2) {
      setSlugError("Slug must be at least 2 characters");
      return;
    }
    if (clean === profileData?.author_slug) {
      setEditingSlug(false);
      return;
    }
    setSavingSlug(true);
    setSlugError("");

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "save", payload: { author_slug: clean } }),
        }
      );
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Save failed");

      setProfileData((prev: any) => ({ ...prev, author_slug: clean }));
      setEditingSlug(false);
      toast({ title: "URL updated!" });
    } catch (err: any) {
      setSlugError(err.message || "Failed to save. Try again.");
    } finally {
      setSavingSlug(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  const isLive = profileData?.directory_status === "listed" || profileData?.directory_status === "featured";

  return (
    <div className="max-w-6xl space-y-6">
      {/* ACT 1 — ANALYSE: Abby's Website Strategy */}
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Your author website is the central hub that connects all your Brand Products, builds credibility, and captures leads.
          I recommend setting up your <strong>author slug</strong> first, then choosing a theme that matches your genre.
          As you publish products through the builders, they'll automatically appear on your site — no extra work needed.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Focus on completing your <button onClick={() => navigate("/dashboard?section=profile&mode=edit")} className="font-bold text-secondary underline underline-offset-2 hover:text-secondary/80 transition-colors">Author Profile</button> and publishing at least one book page before sharing your site publicly.
        </p>
      </AbbyRecommendationCard>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-5 w-5 text-secondary" />
          <h2 className="font-heading text-2xl font-bold">My Website</h2>
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Your author website is hosted on Authors Bureau. Published products appear automatically on your site.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ===== LEFT: Site Info & Books ===== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live URL */}
          <Card className="p-4 border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500" : "bg-muted-foreground/30"}`} />
              <span className="text-xs font-semibold">{isLive ? "Live" : "Not Published"}</span>
            </div>

            {/* Editable URL */}
            {editingSlug ? (
              <div className="mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">authorsbureau.com/</span>
                  <Input
                    value={slugDraft}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
                      setSlugDraft(val);
                      setSlugError("");
                    }}
                    className="text-sm h-8 flex-1 font-medium"
                    placeholder="your-name"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveSlug(); if (e.key === "Escape") setEditingSlug(false); }}
                  />
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={saveSlug} disabled={savingSlug}>
                    {savingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => { setEditingSlug(false); setSlugError(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {slugError && <p className="text-[11px] text-destructive mt-1">{slugError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground select-all truncate">
                  {siteUrl}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => { setSlugDraft(authorSlug === "your-slug" ? "" : authorSlug); setEditingSlug(true); setSlugError(""); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => {
                  navigator.clipboard.writeText(siteUrl);
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 2000);
                  toast({ title: "URL copied!" });
                }}>
                  {urlCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}

            {/* Custom Domain */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold mb-1">Custom Domain (Optional)</p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Point your domain to redirect to your Authors Bureau site.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., www.yourdomain.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="text-xs h-8 flex-1"
                />
                <Button variant="default" size="sm" className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90 h-8"
                  disabled={!customDomain.trim()} onClick={saveDomain}>
                  Save
                </Button>
              </div>
            </div>
          </Card>

          {/* Books & Products Tree */}
          <Card className="p-4 border-border">
            <h3 className="font-heading font-bold text-sm mb-4">Your Pages</h3>
            {booksWithStatus.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your published books and products will appear here automatically.
                </p>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.("my-books")}>
                  Go to My Book Hub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {booksWithStatus.map((book) => (
                  <div key={book.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3 mb-2">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} className="w-8 h-11 rounded object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-11 rounded bg-muted flex items-center justify-center border border-border">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{book.title}</p>
                        <p className="text-[10px] text-muted-foreground">/{authorSlug}/{book.slug}</p>
                      </div>
                    </div>

                    {book.products.length > 0 ? (
                      <div className="ml-11 space-y-1">
                        {book.products.map((product) => {
                          const Icon = PRODUCT_ICONS[product.type] || BookOpen;
                          const isPublished = product.status === "published" || product.status === "active";
                          return (
                            <div key={product.id} className="flex items-center gap-2 text-xs">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                              <span className="flex-1 truncate">{product.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                isPublished
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {isPublished ? "Live" : "Draft"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                /{book.slug}/{product.route}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="ml-11 text-[10px] text-muted-foreground italic">No products yet</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ===== RIGHT: Preview + Theme Picker ===== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview */}
          <Card className="overflow-hidden border-border">
            <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
              </div>
              <span className="text-[10px] text-muted-foreground ml-2 truncate">authorsbureau.com/{authorSlug}</span>
            </div>
            {profileData?.author_slug ? (
              <div className="relative w-full" style={{ height: "320px", overflow: "hidden" }}>
                <iframe
                  key={iframeKey}
                  src={`/${profileData.author_slug}?_v=${iframeKey}`}
                  className="absolute top-0 left-0 border-0 pointer-events-none"
                  style={{
                    width: "1200px",
                    height: "2000px",
                    transform: "scale(0.24)",
                    transformOrigin: "top left",
                  }}
                  title="Author site preview"
                />
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
                <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-xs text-muted-foreground">
                  Set your author slug above to see your site preview.
                </p>
              </div>
            )}
          </Card>

          {/* Theme Picker — shared component */}
          <SiteThemePicker onThemeChange={handleThemeChange} />
        </div>
      </div>
    </div>
  );
}
