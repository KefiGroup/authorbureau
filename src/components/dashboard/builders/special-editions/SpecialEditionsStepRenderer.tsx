import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SharedSetupStep, { type SetupField } from "../shared/SharedSetupStep";
import SharedContentStep from "../shared/SharedContentStep";
import SharedPublishStep from "../shared/SharedPublishStep";
import OccasionTemplateGrid, { OCCASION_TEMPLATES } from "./OccasionTemplateGrid";
import EditionReviewTabs from "./EditionReviewTabs";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import { findCalendarOccasion } from "@/lib/special-edition-calendar";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Check, Sparkles } from "lucide-react";

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

import type { StepRendererProps } from "../shared/builder-types";

interface Props extends StepRendererProps {
}

/** Custom setup step that interleaves Edition Type + Occasion as a unified flow */
function SpecialEditionSetup({ stepData, setStepData, onMarkEdited, stepId, plan, bookTitle }: Omit<Props, "bookId" | "generationState" | "setGenerationState" | "userId">) {
  const defaults = { editionType: "signed", printRun: "limited", price: 49, occasion: "none" };
  const config: Record<string, any> = stepData.editionConfig || defaults;
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);

  // Pre-fill from ?occasion=...&autostart=1 (deep-link from dashboard / Abby nudge)
  const fromNudge = searchParams.get("autostart") === "1";
  const queryOccasion = searchParams.get("occasion");

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!queryOccasion) return;
    const calOcc = findCalendarOccasion(queryOccasion);
    if (!calOcc) return;
    prefillAppliedRef.current = true;

    onMarkEdited(stepId);
    setStepData((prev: any) => ({
      ...prev,
      editionConfig: {
        ...defaults,
        ...(prev.editionConfig || {}),
        occasion: calOcc.id,
        editionType: calOcc.defaultEditionType,
        price: calOcc.defaultPriceUsd,
        extras: (prev.editionConfig?.extras && prev.editionConfig.extras.trim().length > 0)
          ? prev.editionConfig.extras
          : calOcc.defaultIncludes,
      },
    }));

    // Clean up query params so a refresh doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete("occasion");
    next.delete("autostart");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryOccasion]);

  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, editionConfig: { ...config, [key]: value } }));
  };

  const nudgeOccasion = fromNudge ? findCalendarOccasion(queryOccasion) : null;

  return (
    <div className="space-y-6">
      {nudgeOccasion && (
        <div className="rounded-xl border border-secondary/40 bg-secondary/5 p-3.5 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              Why {nudgeOccasion.label} now?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Abby pre-filled this edition because {nudgeOccasion.label} is in its
              launch window. We've set the edition type, price, and bonus list to
              the highest-converting defaults — adjust anything below before you
              generate.
            </p>
          </div>
        </div>
      )}

      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">{getDateAwareAbbyTip()}</p>
      </AbbyRecommendationCard>


      {/* ── Edition Type ── */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold tracking-tight">Edition Type</Label>
        <div className="grid gap-3 grid-cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {EDITION_TYPE_OPTIONS.map(opt => {
            const isSelected = config.editionType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => update("editionType", opt.value)}
                className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20 shadow-sm"
                    : "border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <p className="text-sm font-semibold pr-6">{opt.label}</p>
                {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
                {opt.badge && <Badge variant="secondary" className="mt-1.5 text-[10px] font-medium">{opt.badge}</Badge>}
              </button>
            );
          })}
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
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold tracking-tight">Print Run</Label>
        <div className="grid gap-3 grid-cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {PRINT_RUN_OPTIONS.map(opt => {
            const isSelected = config.printRun === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => update("printRun", opt.value)}
                className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20 shadow-sm"
                    : "border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <p className="text-sm font-semibold pr-6">{opt.label}</p>
                {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Extras ── */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold tracking-tight">Extras Included</Label>
        <Textarea
          value={config.extras || ""}
          onChange={e => update("extras", e.target.value)}
          placeholder="Author letter, bookplate, bookmark, dust jacket art, sprayed edges..."
          rows={3}
        />
      </div>

      {/* ── Price ── */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold tracking-tight">Edition Price (USD)</Label>
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
    case "content": {
      const cfg = stepData.editionConfig || {};
      const occasionObj = OCCASION_TEMPLATES.find(o => o.id === cfg.occasion);
      const hasOccasion = cfg.occasion && cfg.occasion !== "none";
      const occasionLabel = hasOccasion ? (cfg.occasion === "custom" ? cfg.customOccasionName || "Custom" : occasionObj?.label || cfg.occasion) : "";
      const occasionContext = hasOccasion
        ? `\n\nOCCASION THEME: ${occasionLabel}\nTheme Focus: ${occasionObj?.themeFocus || "Author-defined"}\nGift Buyer Persona: ${occasionObj?.giftBuyer || "Author-defined"}\nPeak Sales Window: ${occasionObj?.peakWindow || "Year-round"}`
        : "\n\nNo occasion selected — focus on physical premium edition only.";

      const contentPrompt = hasOccasion
        ? `Generate themed Special Edition content for "{bookTitle}". Config: {config}.${occasionContext}

Generate ALL 6 components:

1) EDITION IDENTITY: Output EXACTLY this structure:

TITLE/SUBTITLE/TAGLINE OPTIONS (choose 1)

Option 1:
Title: [Full title combining book brand with ${occasionLabel} theme]
Subtitle: [Gift-focused subtitle]
Tagline: [One-line tagline for gift buyers]

Option 2:
Title: [Second option]
Subtitle: [Subtitle]
Tagline: [Tagline]

Option 3:
Title: [Third option]
Subtitle: [Subtitle]
Tagline: [Tagline]

Then a COVER CONCEPT BRIEF section with mood, colors, imagery, typography.

2) THEMED FOREWORD: 500-800 word foreword connecting the book's core message to ${occasionLabel}, written as a letter from the author. Start with "Dear Reader..."

3) GIFT JOURNAL PROMPTS: 10 fillable gift-journal prompts the GIFT-GIVER completes and gives TO the recipient. These are NOT self-reflection questions — they are heartfelt sentence stems addressed directly to the recipient (e.g., "Dear Mum, one thing you taught me without knowing it was..."). Adapt the recipient role for ${occasionLabel} (Mother's Day → Mum/Mom, Father's Day → Dad, Valentine's → My Love, etc.). For each: the prompt stem, source chapter, why it matters.

4) EXCLUSIVE CHAPTER: 1,500-2,500 word new chapter bridging the book's message with ${occasionLabel}. Must feel like a natural extension.

5) GIFT INSCRIPTION PAGE: Design brief with header text, prompt for the gift-giver, decorative element suggestions, and 3 example inscriptions (e.g., "To: ___ I chose this book for you because ___").

6) COMPANION RESOURCE: A downloadable companion with TWO MODES: Mode A "Gift Mode" (gift-giver completes it alone and gives it as a keepsake) and Mode B "Together Mode" (gift-giver and recipient do it together as a shared bonding experience). Generate both modes with daily structure and content.

Format each component with a clear heading. Make all content publication-ready.`
        : `Generate special edition content for "{bookTitle}". Config: {config}.${occasionContext}

Include: 1) AUTHOR'S FOREWORD OR LETTER (new content exclusive to this edition, personal story about the book's journey), 2) BONUS CHAPTER OR BEHIND-THE-SCENES content, 3) DISCUSSION GUIDE / BOOK CLUB QUESTIONS (15-20 questions), 4) PHOTO/ILLUSTRATION SUGGESTIONS (describe 5-8 potential images), 5) PACKAGING DESCRIPTION AND MOCKUP details (unboxing experience). Format as markdown.`;

      const contentTip = hasOccasion
        ? `This ${occasionLabel} Edition gets 6 themed components: edition identity, foreword, fillable gift-journal prompts (addressed to the recipient), exclusive chapter, gift inscription page, and companion resource. The gift-giver fills in the prompts to create a personalised keepsake.`
        : "New exclusive content justifies the premium price. An author's letter about the book's journey creates emotional connection.";

      return <SharedContentStep contentKey="editionContent" title={hasOccasion ? `${occasionLabel} Edition Content` : "Edition Content"} description={hasOccasion ? `Abby generates 6 themed components for your ${occasionLabel} Special Edition: identity, foreword, fillable gift-journal prompts, exclusive chapter, inscription page, and companion resource.` : "Author's foreword, bonus chapter, discussion guide, photo suggestions, and packaging description."} abbyTip={contentTip} aiPrompt={contentPrompt} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" builderId="special-editions" builderLabel="Special Editions" />;
    }
    case "sales": {
      const cfg2 = stepData.editionConfig || {};
      const hasOcc = cfg2.occasion && cfg2.occasion !== "none";
      const occObj = OCCASION_TEMPLATES.find(o => o.id === cfg2.occasion);
      const occLabel = hasOcc ? (cfg2.occasion === "custom" ? cfg2.customOccasionName || "Custom" : occObj?.label || cfg2.occasion) : "";

      const salesPrompt = hasOcc
        ? `Generate gift-buyer sales copy and marketing materials for the ${occLabel} Special Edition of "{bookTitle}". Config: {config}.

Occasion: ${occLabel}
Gift Buyer Persona: ${occObj?.giftBuyer || "Author-defined"}
Peak Window: ${occObj?.peakWindow || "Year-round"}

Generate:

1) GIFT-BUYER SALES PAGE (11 sections reframed for gift buyers):
   - Hero: "${bookTitle}: The ${occLabel} Edition" + CTA "Give This Gift" + mention edition type and extras
   - Problem: "Still searching for a gift that actually means something?" — why generic gifts fail
   - Transformation: What happens when the recipient receives AND reads this gift
   - Introduction: What makes this edition special — physical format + emotional content
   - What's Inside: ALL items — physical extras + all bonus content
   - How It Works: Choose Bundle → Personalize (inscription page) → Gift with Impact
   - Meet the Author: Bio + personal note about why this occasion matters
   - Social Proof: Placeholder section
   - Pricing: 3 bundle tiers (Essential $${cfg2.price || 49}, Premium ~$${(cfg2.price || 49) + 30}, Ultimate ~$${(cfg2.price || 49) + 100})
   - FAQ: 7 gift-buying questions (delivery time, personalization, returns, what makes it different)
   - Final CTA: Urgency — "Only X days until ${occLabel}"

2) BUNDLE DESCRIPTIONS: Essential (book only), Premium (book + workbook + companion PDF), Ultimate (book + workbook + course access). For each: name, what's included, why a gift buyer would choose it.

3) 30-DAY MARKETING CALENDAR: 4 weeks (Teaser → Reveal → Social Proof → Urgency). 12 social posts (3/week), 4 email subjects, key milestones.

4) PRE-ORDER PAGE COPY: Countdown, edition details, limited availability messaging.

5) FULFILLMENT CHECKLIST: Printing, signing, packaging, shipping timeline.

Format as markdown with clear headings.`
        : `Generate special edition sales and fulfillment materials for "{bookTitle}". Config: {config}. Include: 1) PRE-ORDER PAGE copy (countdown, edition details, what's included, limited availability messaging), 2) LIMITED EDITION NUMBERING SYSTEM, 3) FULFILLMENT CHECKLIST (printing, signing, packaging, shipping), 4) LAUNCH EMAIL SEQUENCE (5 emails), 5) SOCIAL MEDIA ANNOUNCEMENT POSTS (8 posts with countdown). Format as markdown.`;

      const salesTip = hasOcc
        ? `Gift-buyer copy shifts the perspective: instead of "Buy this book," it's "Give this gift." The ${occLabel} urgency drives conversion — countdown to the occasion date.`
        : "Create FOMO with a countdown and 'X of Y remaining' counter. Pre-orders with a specific ship date work best.";

      return <SharedContentStep contentKey="editionSales" title={hasOcc ? `${occLabel} Gift Sales & Marketing` : "Sales & Fulfillment"} description={hasOcc ? `Gift-buyer sales copy, 3 bundle tiers, 30-day marketing calendar, and fulfillment plan for your ${occLabel} Edition.` : "Pre-order page, numbering system, fulfillment checklist, launch emails, and social posts."} abbyTip={salesTip} aiPrompt={salesPrompt} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookId={bookId} bookTitle={bookTitle} configKey="editionConfig" />;
    }
    case "review": {
      const cfgR = stepData.editionConfig || {};
      const hasOccR = cfgR.occasion && cfgR.occasion !== "none";
      if (!hasOccR) {
        return (
          <div className="p-6 text-center text-muted-foreground">
            <p className="text-sm">No occasion selected — this step is for themed editions. Skip to Preview & Publish.</p>
          </div>
        );
      }
      return (
        <EditionReviewTabs
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          stepId={stepId}
          bookTitle={bookTitle}
        />
      );
    }
    case "preview": {
      const cfgP = stepData.editionConfig || {};
      const identityP = stepData.editionIdentity || {};
      const bonusP = stepData.editionBonusContent || {};
      const hasOccP = cfgP.occasion && cfgP.occasion !== "none";
      const occObjP = OCCASION_TEMPLATES.find(o => o.id === cfgP.occasion);
      const editionTitle = identityP.customTitle || identityP.selectedTitle || `${bookTitle}: The Special Edition`;
      const bonusCount = Object.values(bonusP).filter((v: any) => typeof v === "string" && v.trim().length > 0).length;

      return <SharedPublishStep builderLabel="Special Edition" userId={userId} stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} stepId={stepId} bookTitle={bookTitle} checklist={[
        { label: "Edition type & pricing configured", check: d => !!d.editionConfig?.editionType && (d.editionConfig?.price || 0) > 0 },
        { label: "Edition content generated", check: d => !!d.editionContent && d.editionContent.length > 50 },
        { label: "Sales & marketing materials ready", check: d => !!d.editionSales && d.editionSales.length > 50 },
        { label: "Edition identity reviewed", check: d => !!(d.editionIdentity?.selectedTitle || d.editionIdentity?.customTitle || d.editionIdentity?.subtitle) },
        { label: "Bonus content reviewed", check: d => Object.values(d.editionBonusContent || {}).some((v: any) => typeof v === "string" && v.trim().length > 0) },
      ]} revenue={{ calculate: d => {
        const price = d.editionConfig?.price || 49;
        const qty = d.editionConfig?.printRun === "limited" ? 100 : d.editionConfig?.printRun === "standard" ? 500 : 1000;
        return { amount: price * qty, description: `${qty} copies at $${price} each` };
      }}} previewContent={(d) => (
        <div className="p-6 space-y-5">
          {/* Hero */}
          <div className="text-center space-y-2">
            <BookOpen className="h-8 w-8 text-amber-500 mx-auto" />
            <h2 className="font-heading text-xl font-bold">{editionTitle}</h2>
            {identityP.subtitle && <p className="text-sm text-muted-foreground">{identityP.subtitle}</p>}
            {identityP.tagline && <p className="text-xs text-secondary italic">"{identityP.tagline}"</p>}
            <div className="flex justify-center gap-2 flex-wrap mt-2">
              <Badge variant="outline">{cfgP.editionType?.replace("-", " ") || "Signed Copy"}</Badge>
              <Badge variant="outline">{cfgP.printRun === "limited" ? "Limited Run" : cfgP.printRun || "Limited"}</Badge>
              {hasOccP && (
                <Badge className="bg-secondary/10 text-secondary text-[10px]">
                  🎁 {occObjP?.label || cfgP.occasion} Edition
                </Badge>
              )}
            </div>
            <Badge className="bg-amber-500/10 text-amber-700 text-sm px-4 py-1 mt-2">${(cfgP.price || 49).toLocaleString()}</Badge>
          </div>

          {/* Extras */}
          {cfgP.extras && (
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Includes</p>
              <p className="text-sm text-foreground">{cfgP.extras}</p>
            </div>
          )}

          {/* Bonus content summary */}
          {bonusCount > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">Bonus Content ({bonusCount} sections)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {bonusP.foreword && <Badge variant="outline" className="justify-center py-1.5 text-xs">📜 Foreword</Badge>}
                {bonusP.reflectionPrompts && <Badge variant="outline" className="justify-center py-1.5 text-xs">💭 Prompts</Badge>}
                {bonusP.exclusiveChapter && <Badge variant="outline" className="justify-center py-1.5 text-xs">📖 Chapter</Badge>}
                {bonusP.giftInscription && <Badge variant="outline" className="justify-center py-1.5 text-xs">✍️ Inscription</Badge>}
                {bonusP.companionResource && <Badge variant="outline" className="justify-center py-1.5 text-xs">📋 Companion</Badge>}
              </div>
            </div>
          )}

          {/* Bundles preview */}
          {(d.editionBundles || []).length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">Bundle Tiers</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(d.editionBundles || []).map((b: any) => (
                  <div key={b.tier} className="border rounded-lg p-3 text-center">
                    <Badge variant="outline" className="mb-1 text-[10px]">{b.tier}</Badge>
                    <p className="text-xs font-semibold">{b.name}</p>
                    <p className="text-sm font-bold mt-1">${b.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cover concept */}
          {identityP.coverConcept && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cover Concept</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{identityP.coverConcept}</p>
            </div>
          )}
        </div>
      )} />;
    }
    default: return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
