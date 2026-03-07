import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2 } from "lucide-react";
import { DESIGN_TEMPLATES } from "./types";
import type { WorkbookStepProps } from "./types";

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

export default function WorkbookSetupStep({ stepData, setStepData, onMarkEdited, plan }: WorkbookStepProps) {
  const data = stepData.setup || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      setup: { ...prev.setup, [field]: value },
    }));
    onMarkEdited("setup");
  };

  const planTitle = plan?.products?.workbook?.title || "";

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm font-medium">Workbook Title</Label>
          <Input
            value={data.title ?? planTitle}
            onChange={e => update("title", e.target.value)}
            placeholder="e.g. The 30-Day Action Plan Workbook"
            className="mt-1.5"
          />
          {planTitle && !data.title && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Wand2 className="h-2.5 w-2.5" /> Pre-filled from your business plan
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium">Subtitle</Label>
          <Input
            value={data.subtitle ?? ""}
            onChange={e => update("subtitle", e.target.value)}
            placeholder="A companion guide to..."
            className="mt-1.5"
          />
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
