import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, Wand2, Plus, Trash2, ChevronDown, ChevronRight,
  ShoppingCart, Palette, MessageSquare, Type, DollarSign,
} from "lucide-react";
import StepInstructions from "./StepInstructions";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";

/* ─── 10 Sales Page Design Templates ─── */
export const SALES_PAGE_DESIGNS = [
  { id: "classic-elegant", label: "Classic Elegant", description: "Navy & gold, serif headings, cream backgrounds", preview: "bg-gradient-to-br from-amber-50 to-stone-100 border-amber-200" },
  { id: "modern-minimal", label: "Modern Minimal", description: "Clean white, sans-serif, generous spacing", preview: "bg-white border-gray-200" },
  { id: "bold-impact", label: "Bold Impact", description: "Dark hero, large type, high contrast CTAs", preview: "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white" },
  { id: "warm-organic", label: "Warm Organic", description: "Earth tones, rounded shapes, soft textures", preview: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200" },
  { id: "professional-corp", label: "Professional", description: "Blue-gray palette, structured layout, trust-focused", preview: "bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200" },
  { id: "creative-vibrant", label: "Creative Vibrant", description: "Gradient accents, playful typography, energetic", preview: "bg-gradient-to-br from-violet-50 to-pink-50 border-violet-200" },
  { id: "editorial-mag", label: "Editorial", description: "Magazine-style layout, column grids, pull quotes", preview: "bg-gradient-to-br from-stone-50 to-neutral-100 border-stone-300" },
  { id: "tech-sleek", label: "Tech Sleek", description: "Dark mode, monospace accents, glass effects", preview: "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-600 text-white" },
  { id: "luxury-premium", label: "Luxury Premium", description: "Black & gold, dramatic spacing, serif elegance", preview: "bg-gradient-to-br from-neutral-900 to-neutral-800 border-amber-500 text-amber-100" },
  { id: "friendly-casual", label: "Friendly Casual", description: "Rounded cards, pastel accents, approachable feel", preview: "bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200" },
] as const;

export type SalesPageDesignId = (typeof SALES_PAGE_DESIGNS)[number]["id"];

export interface SalesPageData {
  headline?: string;
  subheadline?: string;
  bodyCopy?: string;
  takeaways?: string[];
  faqs?: { q: string; a: string }[];
  designTemplate?: SalesPageDesignId;
  price?: string;
  comparePrice?: string;
  currency?: string;
}

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  bookId: string;
  bookTitle: string;
  productLabel: string; // e.g. "Online Course", "Home Study", "Workbook"
  /** Additional context for AI prompt — e.g. module count, duration */
  productContext?: string;
  /** Key in stepData where sales page data is stored. Defaults to "salesPage" */
  dataKey?: string;
}

export default function SharedSalesPageStep({
  stepData, setStepData, onMarkEdited, stepId,
  bookId, bookTitle, productLabel, productContext,
  dataKey = "salesPage",
}: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<"copy" | "faq" | "design" | "pricing">("copy");

  const data: SalesPageData = stepData[dataKey] || {};

  const update = (field: keyof SalesPageData, value: any) => {
    setStepData(prev => ({
      ...prev,
      [dataKey]: { ...prev[dataKey], [field]: value },
    }));
    onMarkEdited(stepId);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateJSONWithAI<{
        headline: string;
        subheadline: string;
        bodyCopy: string;
        takeaways: string[];
        faqs: { q: string; a: string }[];
        suggestedPrice: number;
      }>(
        `Generate a high-converting sales page for a ${productLabel} based on the book "${bookTitle}".
${productContext ? `Product details: ${productContext}` : ""}

Return JSON with:
- "headline": compelling main headline (no markdown)
- "subheadline": supporting subheadline (no markdown)
- "bodyCopy": 2-3 paragraph transformation promise describing what the participant will experience and achieve (plain text, no markdown)
- "takeaways": array of 5-7 specific outcomes/takeaways participants will gain (plain text strings)
- "faqs": array of 4-5 objects with "q" and "a" keys (common questions and answers)
- "suggestedPrice": recommended price as a number

Use direct address (you/your). Do NOT include certificates or placeholder names.
Return ONLY valid JSON, no markdown fences.`,
        { bookId, isPremium: true }
      );

      setStepData(prev => ({
        ...prev,
        [dataKey]: {
          ...prev[dataKey],
          headline: result.headline,
          subheadline: result.subheadline,
          bodyCopy: result.bodyCopy,
          takeaways: result.takeaways,
          faqs: result.faqs,
          price: result.suggestedPrice?.toString() || prev[dataKey]?.price || "",
        },
      }));
      onMarkEdited(stepId);
      toast({ title: "Sales page content generated!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  const sections = [
    { id: "copy" as const, label: "Copy", icon: Type },
    { id: "faq" as const, label: "FAQ", icon: MessageSquare },
    { id: "design" as const, label: "Design", icon: Palette },
    { id: "pricing" as const, label: "Pricing", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <StepInstructions
        summary={`Create a compelling sales page for your ${productLabel}. Edit the copy, add FAQs, choose a design template, and set your pricing.`}
        items={[
          { label: "Copy", description: "Headline, description, and key takeaways for your audience." },
          { label: "FAQ", description: "Common questions your buyers will have — builds trust and reduces objections." },
          { label: "Design", description: "Choose from 10 professional templates that match your brand." },
          { label: "Pricing", description: "Set your price and optional compare-at price for urgency." },
        ]}
      />

      {/* AI Generate Banner */}
      {!data.headline && (
        <Card className="p-6 text-center border-dashed border-2 border-secondary/30 bg-secondary/5">
          <Sparkles className="h-10 w-10 text-secondary/40 mx-auto mb-3" />
          <h3 className="font-heading text-base font-semibold mb-1">Generate Sales Page with AI</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Abby will create headline, copy, takeaways, FAQs, and pricing based on your book and {productLabel.toLowerCase()} content.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : "Generate Sales Page"}
          </Button>
        </Card>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 border-b border-border">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeSection === s.id
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
        {data.headline && (
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating} className="text-xs">
              {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Regenerate All
            </Button>
          </div>
        )}
      </div>

      {/* ─── COPY SECTION ─── */}
      {activeSection === "copy" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</label>
            <Input
              value={data.headline || ""}
              onChange={e => update("headline", e.target.value)}
              placeholder="A compelling headline that captures attention..."
              className="text-lg font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subheadline</label>
            <Input
              value={data.subheadline || ""}
              onChange={e => update("subheadline", e.target.value)}
              placeholder="Supporting text that reinforces the headline..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body Copy</label>
            <Textarea
              value={data.bodyCopy || ""}
              onChange={e => update("bodyCopy", e.target.value)}
              placeholder="Describe the transformation your participants will experience..."
              rows={9}
              className="text-sm"
            />
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Key Takeaways — What Participants Will Gain
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update("takeaways", [...(data.takeaways || []), ""])}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {(data.takeaways || []).map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent text-sm mt-2 shrink-0">✓</span>
                <Input
                  value={item}
                  onChange={e => {
                    const updated = [...(data.takeaways || [])];
                    updated[i] = e.target.value;
                    update("takeaways", updated);
                  }}
                  placeholder={`Takeaway ${i + 1}...`}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = (data.takeaways || []).filter((_: string, idx: number) => idx !== i);
                    update("takeaways", updated);
                  }}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {(!data.takeaways || data.takeaways.length === 0) && (
              <p className="text-xs text-muted-foreground italic">No takeaways yet. Generate with AI or add manually.</p>
            )}
          </Card>
        </div>
      )}

      {/* ─── FAQ SECTION ─── */}
      {activeSection === "faq" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Frequently Asked Questions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Address common objections and build buyer confidence.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => update("faqs", [...(data.faqs || []), { q: "", a: "" }])}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add FAQ
            </Button>
          </div>

          {(data.faqs || []).map((faq: { q: string; a: string }, i: number) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] mt-1 shrink-0">Q{i + 1}</Badge>
                <Input
                  value={faq.q}
                  onChange={e => {
                    const updated = [...(data.faqs || [])];
                    updated[i] = { ...updated[i], q: e.target.value };
                    update("faqs", updated);
                  }}
                  placeholder="Question..."
                  className="text-sm font-semibold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = (data.faqs || []).filter((_: any, idx: number) => idx !== i);
                    update("faqs", updated);
                  }}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                value={faq.a}
                onChange={e => {
                  const updated = [...(data.faqs || [])];
                  updated[i] = { ...updated[i], a: e.target.value };
                  update("faqs", updated);
                }}
                placeholder="Answer..."
                rows={2}
                className="text-sm ml-8"
              />
            </Card>
          ))}

          {(!data.faqs || data.faqs.length === 0) && (
            <Card className="p-8 text-center border-dashed">
              <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No FAQs yet. Generate with AI or add manually.</p>
            </Card>
          )}
        </div>
      )}

      {/* ─── DESIGN TEMPLATE SECTION ─── */}
      {activeSection === "design" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Choose a Sales Page Design</h3>
            <p className="text-xs text-muted-foreground">
              Select a template that matches your brand. This controls the look of your public sales page.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {SALES_PAGE_DESIGNS.map(design => {
              const isSelected = (data.designTemplate || "classic-elegant") === design.id;
              return (
                <button
                  key={design.id}
                  onClick={() => update("designTemplate", design.id)}
                  className={`group relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                    isSelected
                      ? "border-secondary ring-2 ring-secondary/20 scale-[1.02]"
                      : "border-border hover:border-secondary/40"
                  }`}
                >
                  {/* Preview swatch */}
                  <div className={`h-20 ${design.preview} flex items-center justify-center`}>
                    <div className="text-center px-2">
                      <div className={`text-[8px] font-bold ${design.preview.includes("text-white") || design.preview.includes("text-amber") ? "" : "text-foreground"}`}>
                        {data.headline ? data.headline.substring(0, 30) + "..." : "Your Headline Here"}
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="p-2.5 bg-background">
                    <p className="text-[11px] font-bold leading-tight">{design.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{design.description}</p>
                  </div>
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-secondary-foreground text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PRICING SECTION ─── */}
      {activeSection === "pricing" && (
        <div className="space-y-5">
          <Card className="p-6 space-y-5">
            <h3 className="font-heading text-base font-bold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-secondary" /> Pricing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={data.price || ""}
                    onChange={e => update("price", e.target.value)}
                    placeholder="47"
                    className="h-9 pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Currency</label>
                <div className="flex gap-1.5">
                  {["USD", "EUR", "GBP"].map(cur => (
                    <button
                      key={cur}
                      onClick={() => update("currency", cur)}
                      className={`flex-1 h-9 rounded-md border-2 text-xs font-bold transition-all ${
                        (data.currency || "USD") === cur
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border text-muted-foreground hover:border-secondary/30"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Compare-at Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={data.comparePrice || ""}
                    onChange={e => update("comparePrice", e.target.value)}
                    placeholder="97"
                    className="h-9 pl-8"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Shown as strikethrough on sales page</p>
              </div>
            </div>

            {data.price && data.comparePrice && Number(data.comparePrice) > Number(data.price) && (
              <Card className="p-3 bg-accent/5 border-accent/20">
                <p className="text-xs text-accent font-medium">
                  💰 {Math.round((1 - Number(data.price) / Number(data.comparePrice)) * 100)}% discount shown — 
                  <span className="line-through text-muted-foreground ml-1">${data.comparePrice}</span>{" "}
                  <span className="font-bold">${data.price}</span>
                </p>
              </Card>
            )}

            <div className="border-t border-border pt-4">
              <Card className="p-4 bg-secondary/5 border-secondary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-secondary mb-0.5">Abby's Pricing Tip</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Price your {productLabel.toLowerCase()} based on the transformation value, not the content volume. 
                      A compare-at price creates urgency — aim for 40-60% perceived savings.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
