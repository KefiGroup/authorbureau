import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, Sparkles, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DESIGN_TEMPLATES } from "./types";
import type { WorkbookStepProps } from "./types";

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

const PURPOSE_OPTIONS = [
  { label: "Lead Magnet (Free)", value: "lead-magnet", price: "0", desc: "Free download to build your email list" },
  { label: "Companion ($4.99–$9.99)", value: "companion", price: "7.99", desc: "Sold alongside the book" },
  { label: "Standalone ($14.99–$29.99)", value: "standalone", price: "19.99", desc: "Premium standalone product" },
];

const PAGE_COUNT_OPTIONS = [
  { label: "20–40 pages", value: "20-40", desc: "Quick workbook / lead magnet" },
  { label: "40–60 pages", value: "40-60", desc: "Standard companion" },
  { label: "60–80 pages", value: "60-80", desc: "Comprehensive guide" },
  { label: "80–100 pages", value: "80-100", desc: "Premium workbook" },
];

interface TitleSuggestion {
  title: string;
  subtitle: string;
  reason: string;
}

export default function WorkbookSetupStep({ stepData, setStepData, onMarkEdited, plan, bookId, bookTitle, manuscriptSummary, frameworks }: WorkbookStepProps) {
  const data = stepData.setup || {};
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      setup: { ...prev.setup, [field]: value },
    }));
    onMarkEdited("setup");
  };

  const planTitle = plan?.products?.workbook?.title || "";

  const suggestTitles = async () => {
    setSuggestingTitles(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // If we don't have manuscript in props, load it
      let manuscript = manuscriptSummary || "";
      let fw = frameworks || "";
      if (!manuscript && bookId) {
        const { data: ms } = await supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "source_material")
          .maybeSingle();
        if (ms?.content) manuscript = ms.content.slice(0, 3000);
      }
      if (!fw && bookId) {
        const { data: fwData } = await supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "frameworks")
          .maybeSingle();
        if (fwData?.content) fw = fwData.content.slice(0, 2000);
      }

      const resp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are Abby, business advisor for Authors Bureau. Based on the manuscript and frameworks below, suggest exactly 3 workbook titles with subtitles. Each should be based on a different framework or theme from the book.

RESPOND IN THIS EXACT FORMAT (no other text):
TITLE1: [title]
SUBTITLE1: [subtitle]
REASON1: [one-sentence reason based on framework]
TITLE2: [title]
SUBTITLE2: [subtitle]
REASON2: [one-sentence reason based on framework]
TITLE3: [title]
SUBTITLE3: [subtitle]
REASON3: [one-sentence reason based on framework]

BOOK: "${bookTitle}"
${manuscript ? `\nMANUSCRIPT EXCERPT:\n${manuscript.slice(0, 2000)}` : ""}
${fw ? `\nFRAMEWORKS:\n${fw}` : ""}
${plan ? `\nBUSINESS PLAN WORKBOOK INFO: ${JSON.stringify(plan.products?.workbook || {}).slice(0, 500)}` : ""}`
            },
            { role: "user", content: "Suggest 3 workbook titles based on my book's frameworks and key themes." }
          ],
          bookId,
          isPremium: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to get suggestions");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nlIdx);
          textBuffer = textBuffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullText += delta;
          } catch { break; }
        }
      }

      // Parse the structured response
      const suggestions: TitleSuggestion[] = [];
      for (let i = 1; i <= 3; i++) {
        const titleMatch = fullText.match(new RegExp(`TITLE${i}:\\s*(.+)`));
        const subtitleMatch = fullText.match(new RegExp(`SUBTITLE${i}:\\s*(.+)`));
        const reasonMatch = fullText.match(new RegExp(`REASON${i}:\\s*(.+)`));
        if (titleMatch) {
          suggestions.push({
            title: titleMatch[1].trim(),
            subtitle: subtitleMatch?.[1]?.trim() || "",
            reason: reasonMatch?.[1]?.trim() || "",
          });
        }
      }

      setTitleSuggestions(suggestions.length > 0 ? suggestions : [
        { title: `${bookTitle} Workbook`, subtitle: `A practical companion guide`, reason: "Based on your book title" },
      ]);
    } catch (err) {
      console.error("Title suggestion failed:", err);
    }
    setSuggestingTitles(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Workbook Title</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={suggestTitles}
            disabled={suggestingTitles}
            className="text-secondary border-secondary/30 hover:bg-secondary/5 h-7 text-xs gap-1.5"
          >
            {suggestingTitles ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Reading manuscript...</>
            ) : (
              <><Sparkles className="h-3 w-3" /> Suggest Titles from Manuscript</>
            )}
          </Button>
        </div>

        {/* Title suggestions */}
        {titleSuggestions.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {titleSuggestions.map((s, i) => {
              const isSelected = data.title === s.title;
              return (
                <Card
                  key={i}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-secondary border-secondary" : "border-border"
                  }`}
                  onClick={() => {
                    update("title", s.title);
                    update("subtitle", s.subtitle);
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-semibold text-xs leading-snug">{s.title}</p>
                    {isSelected && <Check className="h-3.5 w-3.5 text-secondary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{s.subtitle}</p>
                  <p className="text-[10px] text-secondary/80 mt-1.5 flex items-start gap-1">
                    <Sparkles className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                    {s.reason}
                  </p>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              value={data.title ?? planTitle}
              onChange={e => update("title", e.target.value)}
              placeholder="e.g. The 30-Day Action Plan Workbook"
            />
            {planTitle && !data.title && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Wand2 className="h-2.5 w-2.5" /> Pre-filled from your business plan
              </p>
            )}
          </div>
          <div>
            <Input
              value={data.subtitle ?? ""}
              onChange={e => update("subtitle", e.target.value)}
              placeholder="A companion guide to..."
            />
          </div>
        </div>
      </div>

      {/* Purpose */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Purpose & Pricing</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {PURPOSE_OPTIONS.map(opt => (
            <Card
              key={opt.value}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                data.purpose === opt.value ? "ring-2 ring-secondary border-secondary" : ""
              }`}
              onClick={() => {
                update("purpose", opt.value);
                update("price", opt.price);
              }}
            >
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom price input */}
      {data.purpose && (
        <div className="max-w-xs">
          <Label className="text-sm font-medium">Price (USD)</Label>
          <Input
            type="number"
            value={data.price ?? "0"}
            onChange={e => update("price", e.target.value)}
            className="mt-1.5"
            min={0}
            step={0.01}
          />
        </div>
      )}

      {/* Page count */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Page Count Target</Label>
        <div className="grid gap-3 sm:grid-cols-4">
          {PAGE_COUNT_OPTIONS.map(opt => (
            <Card
              key={opt.value}
              className={`p-3 cursor-pointer transition-all text-center hover:shadow-md ${
                data.pageCount === opt.value ? "ring-2 ring-secondary border-secondary" : ""
              }`}
              onClick={() => update("pageCount", opt.value)}
            >
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Design template */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Design Template</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {DESIGN_TEMPLATES.map(t => (
            <Card
              key={t.id}
              className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                data.template === t.id ? "ring-2 ring-secondary border-secondary" : ""
              }`}
              onClick={() => update("template", t.id)}
            >
              <div className="h-12 rounded bg-muted/50 mb-2 flex items-center justify-center">
                <Badge variant="outline" className="text-[10px]">{t.label}</Badge>
              </div>
              <p className="font-medium text-xs">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Color scheme */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Color Scheme</Label>
        <div className="flex gap-3">
          <Card
            className={`p-3 cursor-pointer flex-1 text-center hover:shadow-md ${
              (data.colorScheme || "auto") === "auto" ? "ring-2 ring-secondary border-secondary" : ""
            }`}
            onClick={() => update("colorScheme", "auto")}
          >
            <p className="text-xs font-medium">Auto-match book cover</p>
          </Card>
          <Card
            className={`p-3 cursor-pointer flex-1 text-center hover:shadow-md ${
              data.colorScheme === "custom" ? "ring-2 ring-secondary border-secondary" : ""
            }`}
            onClick={() => update("colorScheme", "custom")}
          >
            <p className="text-xs font-medium">Custom colors</p>
          </Card>
        </div>
        {data.colorScheme === "custom" && (
          <div className="flex gap-3 mt-3">
            <div>
              <Label className="text-[10px]">Primary</Label>
              <Input type="color" value={data.colorPrimary || "#D4A843"} onChange={e => update("colorPrimary", e.target.value)} className="h-8 w-16 p-0.5 mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Accent</Label>
              <Input type="color" value={data.colorAccent || "#1A2B4A"} onChange={e => update("colorAccent", e.target.value)} className="h-8 w-16 p-0.5 mt-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
