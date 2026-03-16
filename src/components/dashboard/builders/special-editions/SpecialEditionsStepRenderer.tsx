import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import OccasionTemplateGrid from "./OccasionTemplateGrid";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import StepInstructions from "../shared/StepInstructions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";

const EDITION_TYPE_OPTIONS = [
  { value: "signed", label: "Signed Copy", badge: "$29.99–$49.99" },
  { value: "collectors", label: "Hardcover Collector's", badge: "$49.99–$99.99" },
  { value: "gift-set", label: "Gift Set", badge: "$79.99–$149.99", description: "Book + Workbook + Extras" },
  { value: "anniversary", label: "Anniversary Edition" },
  { value: "illustrated", label: "Illustrated Edition" },
];

const PRINT_RUN_OPTIONS = [
  { value: "limited", label: "Limited (50-200)", description: "Creates urgency" },
  { value: "standard", label: "Standard (200-1000)" },
  { value: "open", label: "Open Run" },
];

/** Get a date-aware Abby recommendation that suggests the next upcoming occasion */
function getDateAwareAbbyTip(): string {
  const month = new Date().getMonth();
  if (month <= 1) return "Special editions create urgency and premium positioning. Valentine's Day is just weeks away — a limited run of 100 signed copies themed to Valentine's Day at $49.99 sells out fast and generates $4,999 in a single launch. Add a themed foreword and reflection prompts to make it gift-ready.";
  if (month <= 3) return "Mother's Day and Graduation season are approaching. A Hardcover Collector's Edition themed to either occasion, with a personal author letter and a 'Letters of Gratitude' companion resource, positions your book as the perfect meaningful gift.";
  if (month === 4) return "Mother's Day and Father's Day are back-to-back — create themed editions for both. A limited run of 100 signed copies at $49.99 each generates $9,998 from just two occasions. Add themed forewords and inscription pages.";
  if (month <= 7) return "Graduation and Back to School seasons are here. A Special Edition with a 'Life Lessons' exclusive chapter and a career action plan companion resource makes the perfect gift. Price the Ultimate Bundle at $149.99.";
  if (month <= 9) return "The holiday gift season starts now. A Hardcover Collector's Christmas Edition with sprayed edges, a themed foreword, and a companion resource positions your book as the perfect gift. Price the Ultimate Bundle at $149.99 for maximum revenue.";
  return "Year-end is peak gift-buying season. Christmas and New Year editions sell best when launched in October with pre-orders. A limited run of 200 signed copies at $49.99 generates $9,998. Add holiday-themed bonus content and a companion journal.";
}

interface Props {
  stepId: string; stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void; bookId: string; bookTitle: string;
  plan: any; generationState: string; setGenerationState: (s: any) => void; userId: string;
}

/** Custom setup step that interleaves Edition Type + Occasion as a unified flow */
function SpecialEditionSetup({ stepData, setStepData, onMarkEdited, stepId, plan, bookTitle }: Omit<Props, "bookId" | "generationState" | "setGenerationState" | "userId">) {
  const defaults = { editionType: "signed", printRun: "limited", price: 49, occasion: "none" };
  const config: Record<string, any> = stepData.editionConfig || defaults;

  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, editionConfig: { ...config, [key]: value } }));
  };

  return (
    <div className="space-y-6">
      <StepInstructions
        summary="Configure your special edition — format, occasion, and pricing. All fields auto-save."
        items={[
          { label: "Edition Type", description: "choose the physical format of your special edition." },
          { label: "Occasion Theme", description: "optionally add a seasonal theme for gift-buyer marketing and bonus content." },
          { label: "Print Run", description: "set scarcity level to drive urgency." },
          { label: "Extras & Price", description: "specify physical extras and set your selling price." },
        ]}
      />

      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">{getDateAwareAbbyTip()}</p>
      </AbbyRecommendationCard>

      {/* ── Edition Type ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Edition Type</Label>
        <div className="grid gap-2 grid-cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {EDITION_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update("editionType", opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                config.editionType === opt.value
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-border hover:border-secondary/40"
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
              {opt.badge && <Badge variant="outline" className="mt-1.5 text-[10px]">{opt.badge}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Occasion Theme (directly after Edition Type) ── */}
      <OccasionTemplateGrid
        selectedOccasion={config.occasion || "none"}
        customOccasionName={config.customOccasionName}
        onSelect={(id) => update("occasion", id)}
        onCustomNameChange={(name) => update("customOccasionName", name)}
      />

      {/* ── Print Run ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Print Run</Label>
        <div className="grid gap-2 grid-cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {PRINT_RUN_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update("printRun", opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                config.printRun === opt.value
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-border hover:border-secondary/40"
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Extras ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Extras Included</Label>
        <Textarea
          value={config.extras || ""}
          onChange={e => update("extras", e.target.value)}
          placeholder="Author letter, bookplate, bookmark, dust jacket art, sprayed edges..."
          rows={3}
        />
      </div>

      {/* ── Price ── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Edition Price (USD)</Label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground">$</span>
          <Input
            type="number"
            value={config.price || ""}
            onChange={e => update("price", parseInt(e.target.value) || 0)}
            className="max-w-[200px]"
          />
        </div>
      </div>
    </div>
  );
}

export default function SpecialEditionsStepRenderer({ stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId }: Props) {
  switch (stepId) {
    case "setup":
      return (
        <SpecialEditionSetup
          stepId={stepId}
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookTitle={bookTitle}
          plan={plan}
        />
      );
    case "content":
      return <SharedContentStep contentKey="editionContent" title="Edition Content" description="Author's foreword, bonus chapter, discussion guide, photo suggestions, and packaging description." abbyTip="New exclusive content justifies the premium price. An author's letter about the book's journey creates emotional connection." aiPrompt={`Generate special edition content for "{bookTitle}". Config: {config}. Include: 1) AUTHOR'S FOREWORD OR LETTER (new content exclusive to this edition, personal story about the book's journey), 2) BONUS CHAPTER OR BEHIND-THE-SCENES content, 3) DISCUSSION GUIDE / BOOK CLUB QUESTIONS (15-20 questions), 4) PHOTO/ILLUSTRATION SUGGESTIONS (describe 5-8 potential images), 5) PACKAGING DESCRIPTION AND MOCKUP details (unboxing experience). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" />;
    case "sales":
      return <SharedContentStep contentKey="editionSales" title="Sales & Fulfillment" description="Pre-order page, numbering system, fulfillment checklist, launch emails, and social posts." abbyTip="Create FOMO with a countdown and 'X of Y remaining' counter. Pre-orders with a specific ship date work best." aiPrompt={`Generate special edition sales and fulfillment materials for "{bookTitle}". Config: {config}. Include: 1) PRE-ORDER PAGE copy (countdown, edition details, what's included, limited availability messaging), 2) LIMITED EDITION NUMBERING SYSTEM, 3) FULFILLMENT CHECKLIST (printing, signing, packaging, shipping), 4) LAUNCH EMAIL SEQUENCE (5 emails), 5) SOCIAL MEDIA ANNOUNCEMENT POSTS (8 posts with countdown). Format as markdown.`} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" />;
    case "preview":
      return <SharedPublishStep builderLabel="Special Edition" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Edition configured", check: d => !!d.editionConfig?.editionType },
        { label: "Edition content created", check: d => !!d.editionContent },
        { label: "Sales materials ready", check: d => !!d.editionSales },
      ]} revenue={{ calculate: d => {
        const price = d.editionConfig?.price || 49;
        const qty = d.editionConfig?.printRun === "limited" ? 100 : d.editionConfig?.printRun === "standard" ? 500 : 1000;
        return { amount: price * qty, description: `${qty} copies at $${price} each` };
      }}} previewContent={(d) => (
        <div className="p-6 text-center">
          <BookOpen className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold mb-1">{bookTitle} — Special Edition</h2>
          <p className="text-sm text-muted-foreground mb-3">{d.editionConfig?.editionType?.replace("-", " ") || "Signed Copy"} • {d.editionConfig?.printRun || "Limited"} run</p>
          {d.editionConfig?.occasion && d.editionConfig.occasion !== "none" && (
            <Badge className="bg-secondary/10 text-secondary text-[10px] px-2 py-0.5 mb-2">
              🎁 {d.editionConfig.occasion.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} Edition
            </Badge>
          )}
          <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1">${(d.editionConfig?.price || 49).toLocaleString()}</Badge>
        </div>
      )} />;
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
