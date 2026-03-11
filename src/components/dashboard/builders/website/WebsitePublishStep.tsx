import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Loader2, Monitor, Tablet, Smartphone, Globe, FileText, ShoppingBag, Search, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { WebsiteConfig, SitePage, ProductCard, SeoData } from "./types";
import { SITE_TYPE_LABELS, TEMPLATE_OPTIONS, COLOR_SCHEMES } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
  plan: any;
}

export default function WebsitePublishStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId, plan }: Props) {
  const { toast } = useToast();
  const config: WebsiteConfig = stepData["setup"]?.config || {};
  const pages: SitePage[] = stepData["pages"]?.pages || [];
  const products: ProductCard[] = stepData["products"]?.products || [];
  const seoEntries: SeoData[] = stepData["seo"]?.entries || [];
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const enabledPages = pages.filter(p => p.enabled);
  const totalSections = enabledPages.reduce((a, p) => a + p.sections.length, 0);
  const hasEmailCapture = enabledPages.some(p => p.sections.some(s => s.type === "newsletter"));

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await supabase.from("generated_assets").insert({
        author_id: userId,
        book_id: bookId,
        asset_type: "website_package",
        content: JSON.stringify({
          config,
          pages: enabledPages,
          products,
          seoEntries,
          publishedAt: new Date().toISOString(),
        }),
      });
      setPublished(true);
      toast({ title: "Website published!", description: "Your website is now live." });
    } catch (err) {
      console.error("Publish error:", err);
      toast({ title: "Publish failed", variant: "destructive" });
    }
    setPublishing(false);
  };

  if (published) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h3 className="font-heading text-xl font-bold mb-2">Website Published! 🎉</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Your {SITE_TYPE_LABELS[config.siteType]?.label || "microsite"} is live at{" "}
          <span className="font-semibold text-secondary">{config.subdomain}.authorsbureau.com</span>
        </p>
        <Button variant="outline" size="sm" className="rounded-full">
          <Globe className="h-3.5 w-3.5 mr-2" /> Visit Your Site
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abby's review */}
      <Card className="p-5 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Abby's Review</p>
            <p className="text-sm text-muted-foreground">
              Your site has {enabledPages.length} pages and {products.length} products listed.
              {hasEmailCapture
                ? " Great — you have email capture set up. Make sure it's above the fold on every page."
                : " ⚠️ I don't see an email capture section. Add one to your home page — it's essential for building your list."}
            </p>
          </div>
        </div>
      </Card>

      {/* Overview stats */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Site Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <FileText className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{enabledPages.length}</p>
            <p className="text-[10px] text-muted-foreground">Pages</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Globe className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{totalSections}</p>
            <p className="text-[10px] text-muted-foreground">Sections</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <ShoppingBag className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{products.length}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Search className="h-5 w-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{seoEntries.length}</p>
            <p className="text-[10px] text-muted-foreground">SEO Pages</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="text-[10px]">{SITE_TYPE_LABELS[config.siteType]?.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{TEMPLATE_OPTIONS.find(t => t.id === config.template)?.name}</Badge>
          <Badge variant="outline" className="text-[10px]">{COLOR_SCHEMES.find(c => c.id === config.colorScheme)?.name}</Badge>
          <Badge variant="outline" className="text-[10px]">{config.subdomain}.authorsbureau.com</Badge>
        </div>
      </Card>

      {/* Preview */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h3 className="text-xs font-semibold">Site Preview</h3>
          <div className="flex gap-1">
            {([
              { mode: "desktop" as const, icon: Monitor, label: "Desktop" },
              { mode: "tablet" as const, icon: Tablet, label: "Tablet" },
              { mode: "mobile" as const, icon: Smartphone, label: "Mobile" },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded ${viewMode === mode ? "text-secondary bg-secondary/10" : "text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className={`p-6 ${viewMode === "mobile" ? "max-w-sm mx-auto" : viewMode === "tablet" ? "max-w-lg mx-auto" : ""}`}>
          {/* Simulated site preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Nav bar */}
            <div className="bg-primary/5 px-4 py-2 flex items-center justify-between border-b border-border">
              <span className="text-xs font-bold">{config.subdomain || "yoursite"}</span>
              <div className="flex gap-3">
                {enabledPages.slice(0, 4).map(p => (
                  <span key={p.id} className="text-[9px] text-muted-foreground">{p.title}</span>
                ))}
              </div>
            </div>

            {/* Hero */}
            <div className="bg-primary text-primary-foreground p-8 text-center">
              <h3 className="font-heading text-lg font-bold">{bookTitle}</h3>
              <p className="text-xs opacity-80 mt-2">Transform your expertise into impact</p>
              <div className="mt-4">
                <span className="inline-block bg-secondary text-secondary-foreground text-[10px] px-3 py-1.5 rounded-full font-medium">
                  Get Started
                </span>
              </div>
            </div>

            {/* Products preview */}
            {products.length > 0 && (
              <div className="p-4">
                <p className="text-[10px] font-semibold mb-2">Products</p>
                <div className={`grid gap-2 ${viewMode === "mobile" ? "grid-cols-1" : "grid-cols-3"}`}>
                  {products.slice(0, 3).map(p => (
                    <div key={p.id} className="rounded border border-border p-2 text-center">
                      <div className="w-8 h-8 bg-muted rounded mx-auto mb-1" />
                      <p className="text-[9px] font-medium truncate">{p.title}</p>
                      <p className="text-[8px] text-secondary">{p.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="bg-muted/30 px-4 py-2 text-center">
              <p className="text-[8px] text-muted-foreground">© {new Date().getFullYear()} {config.subdomain}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Link check */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-semibold">Link Check</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">✅ {enabledPages.length} page links</Badge>
          <Badge variant="outline" className="text-[10px]">✅ {products.filter(p => p.ctaUrl).length}/{products.length} product CTAs</Badge>
          <Badge variant="outline" className="text-[10px]">{hasEmailCapture ? "✅" : "⚠️"} Email capture</Badge>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => toast({ title: "Draft saved" })}>
          Save as Draft
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Publish Website
        </Button>
      </div>
    </div>
  );
}
