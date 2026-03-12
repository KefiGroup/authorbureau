import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sparkles, ExternalLink, Copy, CheckCircle2, Info,
  Globe, User, BookOpen, ShoppingBag, FileText, Calendar,
  Megaphone, Loader2, Link2, Download, AlertCircle, Crown, HelpCircle,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

/* ---------- types ---------- */
interface AbbyPage {
  id: string;
  name: string;
  recommended: boolean;
  enabled: boolean;
  reason?: string;
}

interface PreviewData {
  hero_headline: string;
  hero_subheadline?: string;
  cta_text?: string;
  nav_links: string[];
}

interface Phase1Result {
  pages: AbbyPage[];
  preview_data: PreviewData;
}

interface Props {
  onNavigate?: (section: string) => void;
}

/* ---------- icon map ---------- */
const PAGE_ICONS: Record<string, typeof Globe> = {
  homepage: Globe,
  about: User,
  books: BookOpen,
  products: ShoppingBag,
  coaching: FileText,
  events: Calendar,
  blog: Megaphone,
};

const PAGE_TOOLTIPS: Record<string, string> = {
  homepage: "The Homepage is the first thing visitors see. It communicates your core message and captures leads.",
  about: "The About Page tells your story and builds a personal connection with your readers.",
  books: "Showcase each book with its cover, description, and purchase links in one place.",
  products: "Each digital product gets its own optimized sales page with pricing and checkout.",
  coaching: "Display your coaching offerings with pricing tiers and a booking or inquiry form.",
  events: "Promote your upcoming events with dates, descriptions, and registration links.",
  blog: "A blog builds SEO authority and gives readers a reason to keep coming back.",
};

const ALWAYS_ON = new Set(["homepage", "about"]);

export default function WebsiteBlueprintPage({ onNavigate }: Props) {
  const { user, tier, isAdmin } = useAuth();
  const effectiveTier = isAdmin ? "enterprise" : tier;
  const isPaidTier = effectiveTier === "starter" || effectiveTier === "pro" || effectiveTier === "enterprise";

  /* --- raw data for preview --- */
  const [profileData, setProfileData] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);

  /* --- AI state --- */
  const [phase1Loading, setPhase1Loading] = useState(true);
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  const [abbyPages, setAbbyPages] = useState<AbbyPage[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  /* --- Phase 2 / build state --- */
  const [generating, setGenerating] = useState(false);
  const [designData, setDesignData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* --- link state --- */
  const [manusLink, setManusLink] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);

  /* --- domain state --- */
  const [customDomain, setCustomDomain] = useState("");
  const [domainCopied, setDomainCopied] = useState(false);
  const [dnsHelpOpen, setDnsHelpOpen] = useState(false);

  /* ============================================
   * ON LOAD: Fetch raw data + run Phase 1
   * ============================================ */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // 1. Fetch raw data for local preview
      const [profileRes, booksRes] = await Promise.all([
        supabase.from("author_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("books").select("id, title, cover_image_url, description, genre").eq("author_id", user.id),
      ]);
      if (cancelled) return;
      setProfileData(profileRes.data);
      setBooks(booksRes.data || []);
      if (profileRes.data?.website_url) {
        setManusLink(profileRes.data.website_url);
        setLinkSaved(true);
      }

      // 2. Call Phase 1 via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-website-builder`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ phase: "1" }),
          }
        );

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(errBody.error || `Phase 1 failed (${resp.status})`);
        }

        const result: Phase1Result = await resp.json();
        if (cancelled) return;

        setAbbyPages(result.pages);
        setPreviewData(result.preview_data);
      } catch (err: any) {
        console.error("Phase 1 error:", err);
        if (!cancelled) {
          setPhase1Error(err.message || "Failed to analyze your profile");
          // Fallback: set default pages
          setAbbyPages([
            { id: "homepage", name: "Homepage", recommended: true, enabled: true },
            { id: "about", name: "About Page", recommended: true, enabled: true },
            { id: "books", name: "My Book(s) Page", recommended: true, enabled: (booksRes.data || []).length > 0 },
            { id: "products", name: "Product Sales Pages", recommended: false, enabled: false },
            { id: "coaching", name: "Coaching / Services Page", recommended: false, enabled: false },
            { id: "events", name: "Events Page", recommended: false, enabled: false },
            { id: "blog", name: "Blog / Content Hub", recommended: false, enabled: false },
          ]);
        }
      } finally {
        if (!cancelled) setPhase1Loading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  /* ---------- derived ---------- */
  const enabledPages = useMemo(
    () => abbyPages.filter((p) => p.enabled),
    [abbyPages]
  );

  const enabledCount = enabledPages.length;

  const navItems = useMemo(
    () => previewData?.nav_links || enabledPages.map((p) => p.name.replace(" Page", "").replace("My ", "")),
    [previewData, enabledPages]
  );

  const authorName = profileData?.pen_name || "Your Name";
  const tagline = previewData?.hero_subheadline || profileData?.tagline || "Transforming lives through the power of words";
  const heroHeadline = previewData?.hero_headline || authorName;
  const ctaText = previewData?.cta_text || "Get My Free Guide →";
  const photoUrl = profileData?.photo_url;

  /* ---------- toggle ---------- */
  const togglePage = useCallback((id: string) => {
    if (ALWAYS_ON.has(id)) return;
    setAbbyPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
    // Clear cached Phase 2 data when user changes selection
    setDesignData(null);
  }, []);

  /* ============================================
   * PHASE 2: Generate manus_spec.json
   * ============================================ */
  const handleBuildWithManus = useCallback(async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }

      const enabledIds = abbyPages.filter((p) => p.enabled).map((p) => p.id);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-website-builder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phase: "2", enabledPages: enabledIds }),
        }
      );

      if (resp.status === 429) {
        toast({ title: "Rate limited — please try again in a moment.", variant: "destructive" });
        return;
      }
      if (resp.status === 402) {
        toast({ title: "AI credits exhausted. Please add funds.", variant: "destructive" });
        return;
      }
      if (!resp.ok) throw new Error("Failed to generate specs");

      const specData = await resp.json();
      const specText = JSON.stringify(specData, null, 2);
      setDesignData(specText);

      // Auto-copy to clipboard
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);

      toast({ title: "Website specs generated & copied to clipboard! 🚀" });

      // Open Manus
      window.open("https://manus.im/invitation/XT9XTFJVZ8SASD", "_blank");
    } catch (err) {
      console.error("Phase 2 error:", err);
      toast({ title: "Failed to generate website specs", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [abbyPages]);

  const handleCopySpecs = useCallback(async () => {
    if (!designData) return;
    await navigator.clipboard.writeText(designData);
    setCopied(true);
    toast({ title: "Specs copied to clipboard! 📋" });
    setTimeout(() => setCopied(false), 3000);
  }, [designData]);

  const handleExportManual = useCallback(async () => {
    if (designData) {
      handleCopySpecs();
      return;
    }
    // Generate without opening Manus
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const enabledIds = abbyPages.filter((p) => p.enabled).map((p) => p.id);
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-website-builder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phase: "2", enabledPages: enabledIds }),
        }
      );
      if (!resp.ok) throw new Error("Failed");
      const specData = await resp.json();
      const specText = JSON.stringify(specData, null, 2);
      setDesignData(specText);
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
      toast({ title: "Specs generated & copied! Use them with any website builder." });
    } catch {
      toast({ title: "Failed to generate specs", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [designData, abbyPages, handleCopySpecs]);

  const handleSaveLink = useCallback(async () => {
    if (!manusLink.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase
        .from("author_profiles")
        .update({ website_url: manusLink.trim() })
        .eq("user_id", session.user.id);
      setLinkSaved(true);
      toast({ title: "Website link saved! ✅" });
    } catch {
      toast({ title: "Failed to save link", variant: "destructive" });
    }
  }, [manusLink]);

  /* ---------- loading state ---------- */
  if (phase1Loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        <p className="text-sm text-muted-foreground">ABBY is analyzing your profile…</p>
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <TooltipProvider>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h2 className="font-heading text-2xl font-bold">Your Professional Author Website, Designed by ABBY</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            ABBY has analyzed your profile, books, and business plan to create a complete website specification.
            Review the pages below, then build your site in minutes with Manus AI.
          </p>
        </div>

        {/* Phase 1 error notice */}
        {phase1Error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{phase1Error} — Using default recommendations.</p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* LEFT COLUMN: Blueprint (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-base">Your Website Blueprint</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {enabledCount} pages selected
                </span>
              </div>

              <div className="space-y-1">
                {abbyPages.map((page) => {
                  const Icon = PAGE_ICONS[page.id] || Globe;
                  const isAlwaysOn = ALWAYS_ON.has(page.id);
                  return (
                    <div
                      key={page.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        isAlwaysOn ? "cursor-default" : "cursor-pointer"
                      } ${
                        page.enabled
                          ? "bg-secondary/5 border border-secondary/20"
                          : "border border-transparent hover:bg-muted/50"
                      }`}
                      onClick={() => togglePage(page.id)}
                    >
                      <Checkbox
                        checked={page.enabled}
                        disabled={isAlwaysOn}
                        onCheckedChange={() => togglePage(page.id)}
                        className="mt-0.5"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        page.enabled ? "bg-secondary/10" : "bg-muted"
                      }`}>
                        <Icon className={`h-4 w-4 ${page.enabled ? "text-secondary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${page.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                            {page.name}
                          </span>
                          {isAlwaysOn && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                              REQUIRED
                            </span>
                          )}
                          {page.recommended && !isAlwaysOn && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20">
                              RECOMMENDED
                            </span>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[220px] text-xs">
                              {PAGE_TOOLTIPS[page.id] || page.reason || "A page for your website."}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {page.reason && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {page.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Your Website URL */}
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-secondary" />
                <h4 className="font-heading font-semibold text-sm">Your Website URL</h4>
              </div>

              {isPaidTier ? (
                /* Paid tier: custom domain connect */
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Connect your own custom domain to your author website.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., www.yourdomain.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="text-xs h-9 flex-1"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      disabled={!customDomain.trim()}
                      onClick={() => {
                        toast({ title: "Domain connection initiated", description: "Follow the DNS instructions to complete setup." });
                        setDnsHelpOpen(true);
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                  <button
                    onClick={() => setDnsHelpOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-secondary hover:underline"
                  >
                    <HelpCircle className="h-3 w-3" />
                    How to update your DNS records
                  </button>
                </div>
              ) : (
                /* Free tier: show default URL */
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Your website is live at:
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground select-all">
                      {profileData?.author_slug || "your-name"}.authorsbureau.com
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => {
                        const url = `${profileData?.author_slug || "your-name"}.authorsbureau.com`;
                        navigator.clipboard.writeText(url);
                        setDomainCopied(true);
                        setTimeout(() => setDomainCopied(false), 2000);
                        toast({ title: "URL copied!" });
                      }}
                    >
                      {domainCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="rounded-lg bg-secondary/5 border border-secondary/15 p-3 flex items-start gap-2">
                    <Crown className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Upgrade to Starter or above</span> to connect your own custom domain.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* DNS Help Modal */}
            <Dialog open={dnsHelpOpen} onOpenChange={setDnsHelpOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg">Connect Your Custom Domain</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground pt-1">
                    Follow these steps to point your domain to your author website.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-3 text-sm">
                  <div className="space-y-2">
                    <p className="font-semibold">Step 1: Add DNS Records</p>
                    <p className="text-muted-foreground text-xs">Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these records:</p>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs font-mono">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground w-12">Type</span>
                        <span className="text-muted-foreground w-16">Name</span>
                        <span className="text-muted-foreground">Value</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-semibold w-12">CNAME</span>
                        <span className="w-16">www</span>
                        <span className="text-secondary">proxy.authorsbureau.com</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="font-semibold w-12">CNAME</span>
                        <span className="w-16">@</span>
                        <span className="text-secondary">proxy.authorsbureau.com</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">Step 2: Wait for Propagation</p>
                    <p className="text-muted-foreground text-xs">DNS changes can take up to 48 hours to propagate. SSL will be provisioned automatically once verified.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">Step 3: Verify</p>
                    <p className="text-muted-foreground text-xs">Once propagation is complete, your custom domain will automatically serve your author website.</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setDnsHelpOpen(false)}>
                  Got it
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* RIGHT COLUMN: Preview & CTA (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Preview */}
            <Card className="overflow-hidden border-border">
              <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
                </div>
                <span className="text-[10px] text-muted-foreground ml-2">yourwebsite.com</span>
              </div>

              {/* Mini nav — dynamically reflects enabled pages */}
              <div className="px-4 py-2 border-b border-border bg-card">
                <div className="flex items-center gap-3 overflow-x-auto">
                  <span className="text-[10px] font-bold text-secondary whitespace-nowrap">{authorName}</span>
                  <div className="flex gap-2">
                    {navItems.map((item) => (
                      <span key={item} className="text-[9px] text-muted-foreground whitespace-nowrap hover:text-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hero section preview */}
              <div className="p-6 bg-gradient-to-br from-secondary/5 to-accent/5 min-h-[220px] flex flex-col justify-center items-center text-center gap-3">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={authorName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-secondary/20"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-secondary/40" />
                  </div>
                )}
                <div>
                  <p className="font-heading font-bold text-sm">{heroHeadline}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">{tagline}</p>
                </div>
                {books.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {books.slice(0, 3).map((book) => (
                      <div key={book.id} className="w-10 h-14 rounded bg-muted border border-border overflow-hidden">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-1 px-3 py-1 rounded-full bg-secondary/10 text-[9px] text-secondary font-medium">
                  {ctaText}
                </div>
              </div>

              {/* Footer preview */}
              <div className="px-4 py-2 bg-muted/20 border-t border-border">
                <p className="text-[8px] text-muted-foreground text-center">© 2026 {authorName}. All rights reserved.</p>
              </div>
            </Card>

            {/* Primary CTA */}
            <Card className="p-5 border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10">
              <div className="text-center space-y-3">
                <Sparkles className="h-6 w-6 text-secondary mx-auto" />
                <h3 className="font-heading font-bold text-base">Ready to Build?</h3>
                <p className="text-xs text-muted-foreground">
                  ABBY will compile your {enabledCount}-page website specification and open Manus AI to build it for you.
                </p>

                <Button
                  onClick={handleBuildWithManus}
                  disabled={generating}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold text-sm h-11"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Specs…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build My Website with Manus AI
                    </>
                  )}
                </Button>

                {designData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySpecs}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy specs to clipboard"}
                  </Button>
                )}

                <button
                  onClick={handleExportManual}
                  disabled={generating}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 block mx-auto disabled:opacity-50"
                >
                  Or, export design specs for manual build
                </button>
              </div>
            </Card>

            {/* How it works */}
            <Card className="p-4 border-border">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <Info className="h-3.5 w-3.5 text-secondary" />
                How It Works
              </p>
              <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  <span className="font-medium text-foreground">ABBY Analyzes Your Profile</span> — Your books, products, and business plan are reviewed automatically
                </li>
                <li>
                  <span className="font-medium text-foreground">Review Your Blueprint</span> — Toggle pages on/off to customize your website plan
                </li>
                <li>
                  <span className="font-medium text-foreground">Click "Build My Website"</span> — ABBY generates a complete spec and opens{" "}
                  <a href="https://manus.im" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    Manus AI
                  </a>
                </li>
                <li>
                  <span className="font-medium text-foreground">Paste & Build</span> — Your specs are auto-copied. Paste them into Manus to build your website
                </li>
                <li>
                  <span className="font-medium text-foreground">Link Back</span> — Save your published website URL to your dashboard
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
