import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sparkles, ExternalLink, Copy, CheckCircle2, Info,
  Globe, User, BookOpen, ShoppingBag, FileText, Calendar,
  Megaphone, Loader2, Link2, Download,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BlueprintPage {
  id: string;
  label: string;
  description: string;
  tooltip: string;
  icon: typeof Globe;
  alwaysOn?: boolean;
  defaultEnabled: boolean;
}

interface Props {
  onNavigate?: (section: string) => void;
}

const ALL_PAGES: BlueprintPage[] = [
  {
    id: "homepage",
    label: "Homepage",
    description: "Hero section with your transformation promise, featured book, and email capture.",
    tooltip: "The Homepage is the first thing visitors see. It communicates your core message and captures leads.",
    icon: Globe,
    alwaysOn: true,
    defaultEnabled: true,
  },
  {
    id: "about",
    label: "About Page",
    description: "Your author bio, headshot, credentials, and social links.",
    tooltip: "The About Page tells your story and builds a personal connection with your readers.",
    icon: User,
    alwaysOn: true,
    defaultEnabled: true,
  },
  {
    id: "books",
    label: "My Book(s) Page",
    description: "Dedicated pages for your books with summaries, buy links, and reviews.",
    tooltip: "Showcase each book with its cover, description, and purchase links in one place.",
    icon: BookOpen,
    defaultEnabled: true,
  },
  {
    id: "products",
    label: "Product Sales Pages",
    description: "Individual sales pages for each completed product (Workbook, Course, etc.).",
    tooltip: "Each digital product gets its own optimized sales page with pricing and checkout.",
    icon: ShoppingBag,
    defaultEnabled: true,
  },
  {
    id: "coaching",
    label: "Coaching / Services Page",
    description: "Market your coaching packages and consulting services.",
    tooltip: "Display your coaching offerings with pricing tiers and a booking or inquiry form.",
    icon: FileText,
    defaultEnabled: false,
  },
  {
    id: "events",
    label: "Events Page",
    description: "Calendar of retreats, webinars, and speaking engagements.",
    tooltip: "Promote your upcoming events with dates, descriptions, and registration links.",
    icon: Calendar,
    defaultEnabled: false,
  },
  {
    id: "blog",
    label: "Blog / Content Hub",
    description: "Articles, book excerpts, and content marketing.",
    tooltip: "A blog builds SEO authority and gives readers a reason to keep coming back.",
    icon: Megaphone,
    defaultEnabled: false,
  },
];

export default function WebsiteBlueprintPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledPages, setEnabledPages] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [designData, setDesignData] = useState<string | null>(null);
  const [manusLink, setManusLink] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);

  // Fetch author data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, booksRes] = await Promise.all([
        supabase.from("author_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("books").select("id, title, cover_image_url, description, genre").eq("author_id", user.id),
      ]);
      setProfileData(profileRes.data);
      setBooks(booksRes.data || []);

      // Set defaults based on data
      const defaults: Record<string, boolean> = {};
      ALL_PAGES.forEach((p) => {
        if (p.alwaysOn) {
          defaults[p.id] = true;
        } else if (p.id === "books") {
          defaults[p.id] = (booksRes.data || []).length > 0;
        } else {
          defaults[p.id] = p.defaultEnabled;
        }
      });
      setEnabledPages(defaults);
      if (profileRes.data?.website_url) {
        setManusLink(profileRes.data.website_url);
        setLinkSaved(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const togglePage = (id: string) => {
    const page = ALL_PAGES.find((p) => p.id === id);
    if (page?.alwaysOn) return;
    setEnabledPages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const enabledCount = useMemo(
    () => Object.values(enabledPages).filter(Boolean).length,
    [enabledPages]
  );

  const navItems = useMemo(
    () => ALL_PAGES.filter((p) => enabledPages[p.id]).map((p) => p.label.replace(" Page", "").replace("My ", "")),
    [enabledPages]
  );

  const authorName = profileData?.pen_name || "Your Name";
  const tagline = profileData?.tagline || "Transforming lives through the power of words";
  const photoUrl = profileData?.photo_url;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-design-file`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabledPages: Object.keys(enabledPages).filter((k) => enabledPages[k]) }),
        }
      );

      if (!resp.ok) throw new Error("Failed to generate");
      const data = await resp.json();
      const specText = JSON.stringify(data, null, 2);
      setDesignData(specText);
      await navigator.clipboard.writeText(specText);
      setCopied(true);
      toast({ title: "Design specs generated & copied! 🚀" });
      setTimeout(() => setCopied(false), 4000);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate specs", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopySpecs = async () => {
    if (!designData) return;
    await navigator.clipboard.writeText(designData);
    setCopied(true);
    toast({ title: "Specs copied to clipboard! 📋" });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleBuildWithManus = async () => {
    if (!designData) {
      await handleGenerate();
    }
    window.open("https://manus.im/invitation/XT9XTFJVZ8SASD", "_blank");
  };

  const handleSaveLink = async () => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                {ALL_PAGES.map((page) => {
                  const enabled = !!enabledPages[page.id];
                  const Icon = page.icon;
                  return (
                    <div
                      key={page.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        enabled
                          ? "bg-secondary/5 border border-secondary/20"
                          : "border border-transparent hover:bg-muted/50"
                      } ${page.alwaysOn ? "cursor-default" : ""}`}
                      onClick={() => togglePage(page.id)}
                    >
                      <Checkbox
                        checked={enabled}
                        disabled={page.alwaysOn}
                        onCheckedChange={() => togglePage(page.id)}
                        className="mt-0.5"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        enabled ? "bg-secondary/10" : "bg-muted"
                      }`}>
                        <Icon className={`h-4 w-4 ${enabled ? "text-secondary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                            {page.label}
                          </span>
                          {page.alwaysOn && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                              REQUIRED
                            </span>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[220px] text-xs">
                              {page.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {page.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Link back section */}
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-secondary" />
                <h4 className="font-heading font-semibold text-sm">Link Your Published Website</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                After building your website, paste the URL here to connect it to your dashboard.
              </p>
              {linkSaved ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <a href={manusLink} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline flex items-center gap-1">
                    {manusLink} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-website.com"
                    value={manusLink}
                    onChange={(e) => setManusLink(e.target.value)}
                    className="text-xs h-9 flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveLink}
                    disabled={!manusLink.trim()}
                    className="text-xs"
                  >
                    Save Link
                  </Button>
                </div>
              )}
            </Card>
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

              {/* Mini nav */}
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
                  <p className="font-heading font-bold text-sm">{authorName}</p>
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
                  Get My Free Guide →
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
                  onClick={handleCopySpecs}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 block mx-auto"
                >
                  Or, export design specs for manual build
                </button>
              </div>
            </Card>

            {/* How it works mini */}
            <Card className="p-4 border-border">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <Info className="h-3.5 w-3.5 text-secondary" />
                How It Works
              </p>
              <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  <span className="font-medium text-foreground">Review Your Blueprint</span> — Toggle pages on/off to customize your website plan
                </li>
                <li>
                  <span className="font-medium text-foreground">Click "Build My Website"</span> — ABBY compiles your specs and opens{" "}
                  <a href="https://manus.im" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    Manus AI
                  </a>
                </li>
                <li>
                  <span className="font-medium text-foreground">Paste & Build</span> — Paste your copied specs into Manus to generate your full website
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
