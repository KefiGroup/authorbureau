import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Globe, BarChart3, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SeoData, SitePage } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function SeoAnalyticsStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const pages: SitePage[] = stepData["pages"]?.pages || [];
  const seoEntries: SeoData[] = stepData["seo"]?.entries || pages.filter(p => p.enabled).map(p => ({
    pageId: p.id,
    metaTitle: `${p.title} — ${bookTitle}`,
    metaDescription: `Discover ${p.title.toLowerCase()} by the author of ${bookTitle}. Explore products, resources, and more.`,
    ogImage: "",
    trackingId: "",
  }));
  const trackingId = stepData["seo"]?.trackingId || "";

  const updateSeo = (entries: SeoData[]) => {
    setStepData(prev => ({ ...prev, seo: { ...prev.seo, entries } }));
    onMarkEdited("seo");
  };

  const updateEntry = (pageId: string, patch: Partial<SeoData>) => {
    updateSeo(seoEntries.map(e => e.pageId === pageId ? { ...e, ...patch } : e));
  };

  const updateTrackingId = (id: string) => {
    setStepData(prev => ({ ...prev, seo: { ...prev.seo, trackingId: id } }));
    onMarkEdited("seo");
  };

  const handleAutoGenerate = () => {
    const generated = seoEntries.map(e => ({
      ...e,
      metaTitle: e.metaTitle || `${e.pageId.charAt(0).toUpperCase() + e.pageId.slice(1)} — ${bookTitle}`,
      metaDescription: e.metaDescription || `Explore ${e.pageId} content from the author of "${bookTitle}". Resources, courses, coaching, and more.`,
    }));
    updateSeo(generated);
    toast({ title: "SEO data generated!", description: "Review and customize meta titles and descriptions." });
  };

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Abby's tip:</span> Good SEO means your site shows up when readers search for topics in your book. I'll generate meta titles under 60 characters and descriptions under 160 characters for each page.
          </p>
        </div>
      </Card>

      {/* Auto-generate */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleAutoGenerate} className="text-xs">
          <Wand2 className="h-3.5 w-3.5 mr-1" /> Auto-generate SEO
        </Button>
      </div>

      {/* SEO entries per page */}
      {seoEntries.map(entry => (
        <Card key={entry.pageId} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold capitalize">{entry.pageId} Page</h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px]">Meta Title</Label>
                <span className={`text-[9px] ${(entry.metaTitle?.length || 0) > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                  {entry.metaTitle?.length || 0}/60
                </span>
              </div>
              <Input
                value={entry.metaTitle}
                onChange={e => updateEntry(entry.pageId, { metaTitle: e.target.value })}
                placeholder="Page title for search engines"
                className="text-xs"
                maxLength={70}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px]">Meta Description</Label>
                <span className={`text-[9px] ${(entry.metaDescription?.length || 0) > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                  {entry.metaDescription?.length || 0}/160
                </span>
              </div>
              <Textarea
                value={entry.metaDescription}
                onChange={e => updateEntry(entry.pageId, { metaDescription: e.target.value })}
                placeholder="Brief description for search results"
                className="text-xs"
                rows={2}
                maxLength={170}
              />
            </div>

            {/* Search preview */}
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Search Preview</p>
              <p className="text-sm text-blue-600 font-medium truncate">{entry.metaTitle || "Page Title"}</p>
              <p className="text-[10px] text-green-700 truncate">authorname.authorsbureau.com/{entry.pageId}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{entry.metaDescription || "Page description..."}</p>
            </div>
          </div>
        </Card>
      ))}

      {/* Google Analytics */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold">Analytics Integration</h3>
        </div>
        <Label className="text-[10px] text-muted-foreground mb-2 block">Google Analytics Tracking ID (optional)</Label>
        <Input
          value={trackingId}
          onChange={e => updateTrackingId(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          className="text-xs max-w-xs"
        />
        <p className="text-[10px] text-muted-foreground mt-2">
          Paste your Google Analytics 4 measurement ID to track site visitors, page views, and conversions.
        </p>
      </Card>

      {/* Auto-generated features */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <h4 className="text-xs font-semibold mb-2">Auto-generated (included)</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">✅ XML Sitemap</Badge>
          <Badge variant="outline" className="text-[10px]">✅ Open Graph images</Badge>
          <Badge variant="outline" className="text-[10px]">✅ Semantic HTML</Badge>
          <Badge variant="outline" className="text-[10px]">✅ JSON-LD schema</Badge>
          <Badge variant="outline" className="text-[10px]">✅ Responsive viewport</Badge>
          <Badge variant="outline" className="text-[10px]">✅ Lazy loading</Badge>
        </div>
      </Card>
    </div>
  );
}
