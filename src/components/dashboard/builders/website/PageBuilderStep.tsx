import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, GripVertical, Eye, EyeOff, Plus, Trash2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateWithAI } from "@/lib/ai-generate";
import type { SitePage, PageSection } from "./types";
import { SECTION_TYPES } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: any;
  generationState: string;
  setGenerationState: (s: any) => void;
}

const DEFAULT_PAGES: SitePage[] = [
  { id: "home", type: "home", title: "Home", enabled: true, sections: [
    { id: "hero-1", type: "hero", title: "Hero Section", content: "", order: 0 },
    { id: "about-1", type: "about", title: "About Snippet", content: "", order: 1 },
    { id: "products-1", type: "products-grid", title: "Featured Products", content: "", order: 2 },
    { id: "testimonials-1", type: "testimonials", title: "Testimonials", content: "", order: 3 },
    { id: "newsletter-1", type: "newsletter", title: "Email Capture", content: "", order: 4 },
  ]},
  { id: "about", type: "about", title: "About", enabled: true, sections: [
    { id: "about-bio", type: "about", title: "Author Bio & Story", content: "", order: 0 },
    { id: "about-creds", type: "features", title: "Credentials", content: "", order: 1 },
    { id: "about-cta", type: "cta", title: "Media Kit CTA", content: "", order: 2 },
  ]},
  { id: "products", type: "products", title: "Products", enabled: true, sections: [
    { id: "prod-grid", type: "products-grid", title: "All Products", content: "", order: 0 },
    { id: "prod-cta", type: "cta", title: "Custom Bundle CTA", content: "", order: 1 },
  ]},
  { id: "blog", type: "blog", title: "Blog", enabled: true, sections: [
    { id: "blog-list", type: "blog-list", title: "Blog Posts", content: "", order: 0 },
  ]},
  { id: "contact", type: "contact", title: "Contact", enabled: true, sections: [
    { id: "contact-form", type: "contact-form", title: "Contact Form", content: "", order: 0 },
  ]},
];

export default function PageBuilderStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, generationState, setGenerationState }: Props) {
  const { toast } = useToast();
  const pages: SitePage[] = stepData["pages"]?.pages || DEFAULT_PAGES;
  const [activePage, setActivePage] = useState(0);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const updatePages = (newPages: SitePage[]) => {
    setStepData(prev => ({ ...prev, pages: { ...prev.pages, pages: newPages } }));
    onMarkEdited("pages");
  };

  const togglePage = (idx: number) => {
    const updated = [...pages];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    updatePages(updated);
  };

  const updateSectionContent = (pageIdx: number, sectionId: string, content: string) => {
    const updated = [...pages];
    updated[pageIdx] = {
      ...updated[pageIdx],
      sections: updated[pageIdx].sections.map(s => s.id === sectionId ? { ...s, content } : s),
    };
    updatePages(updated);
  };

  const addSection = (pageIdx: number, type: string) => {
    const updated = [...pages];
    const info = SECTION_TYPES[type];
    const newSection: PageSection = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      title: info?.label || type,
      content: "",
      order: updated[pageIdx].sections.length,
    };
    updated[pageIdx] = {
      ...updated[pageIdx],
      sections: [...updated[pageIdx].sections, newSection],
    };
    updatePages(updated);
  };

  const removeSection = (pageIdx: number, sectionId: string) => {
    const updated = [...pages];
    updated[pageIdx] = {
      ...updated[pageIdx],
      sections: updated[pageIdx].sections.filter(s => s.id !== sectionId),
    };
    updatePages(updated);
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      const siteType = stepData["setup"]?.config?.siteType || "full";

      // Generate content for each page's sections in parallel
      const contentPromises = pages.filter(p => p.enabled).map(async (page) => {
        const sectionDescriptions = page.sections.map(s => `- "${s.title}" (type: ${s.type})`).join("\n");

        const content = await generateWithAI(
          `Generate website content for the "${page.title}" page of an author's website for the book "${bookTitle}".
Site type: ${siteType}.

The page has these sections:
${sectionDescriptions}

For each section, write compelling, professional copy (50-150 words per section).
Format as markdown with each section separated by "---SECTION: [section title]---" headers.
Return ONLY the content.`,
          { bookId, isPremium: true }
        );

        return { pageId: page.id, content };
      });

      setGenerationState("generating");

      const results = await Promise.all(contentPromises);

      const generated = pages.map(page => {
        const result = results.find(r => r.pageId === page.id);
        if (!result) return page;

        // Parse sections from the generated content
        const sectionContents = result.content.split(/---SECTION:\s*([^-]+)---/i);
        const contentMap: Record<string, string> = {};
        for (let i = 1; i < sectionContents.length; i += 2) {
          const title = sectionContents[i].trim();
          const body = (sectionContents[i + 1] || "").trim();
          contentMap[title.toLowerCase()] = body;
        }

        return {
          ...page,
          sections: page.sections.map(s => ({
            ...s,
            content: s.content || contentMap[s.title.toLowerCase()] || result.content.slice(0, 200),
          })),
        };
      });

      updatePages(generated);
      setGenerationState("complete");
      toast({ title: "Pages generated!", description: "Review and customize your site content." });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  const currentPage = pages[activePage];
  const siteType = stepData["setup"]?.config?.siteType || "full";

  return (
    <div className="space-y-6">
      {/* Generate button */}
      {!stepData["pages"]?.pages && (
        <Card className="p-6 text-center border-dashed border-2">
          <Wand2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Site Pages</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            AI will create {siteType === "full" ? "5 pages" : siteType === "landing" ? "a landing page" : "a link-in-bio page"} from your book content and business plan.
          </p>
          <Button onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Sparkles className="h-4 w-4 mr-2" /> Generate Pages with AI
          </Button>
        </Card>
      )}

      {stepData["pages"]?.pages && (
        <>
          {/* Page tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => setActivePage(idx)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  activePage === idx
                    ? "bg-secondary text-secondary-foreground"
                    : page.enabled
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "bg-muted/30 text-muted-foreground line-through"
                }`}
              >
                {page.title}
                <button
                  onClick={e => { e.stopPropagation(); togglePage(idx); }}
                  className="ml-1"
                >
                  {page.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
              </button>
            ))}
          </div>

          {/* Current page sections */}
          {currentPage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{currentPage.title} — Sections</h3>
                <Badge variant="outline" className="text-[10px]">{currentPage.sections.length} sections</Badge>
              </div>

              {currentPage.sections.map((section, sIdx) => (
                <Card key={section.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="text-sm">{SECTION_TYPES[section.type]?.emoji}</span>
                    <span className="text-xs font-semibold flex-1">{section.title}</span>
                    <Badge variant="outline" className="text-[9px]">{SECTION_TYPES[section.type]?.label}</Badge>
                    <button onClick={() => setEditingSection(editingSection === section.id ? null : section.id)} className="text-muted-foreground hover:text-foreground">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeSection(activePage, section.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {editingSection === section.id && (
                    <Textarea
                      value={section.content}
                      onChange={e => updateSectionContent(activePage, section.id, e.target.value)}
                      placeholder={`Content for ${section.title}...`}
                      className="text-xs mt-2"
                      rows={4}
                    />
                  )}
                </Card>
              ))}

              {/* Add section */}
              <Card className="p-3 border-dashed">
                <Label className="text-[10px] text-muted-foreground mb-2 block">Add Section</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SECTION_TYPES).map(([key, info]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7"
                      onClick={() => addSection(activePage, key)}
                    >
                      <Plus className="h-2.5 w-2.5 mr-1" /> {info.emoji} {info.label}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
