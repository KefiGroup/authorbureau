import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Tag, BookText, ShoppingCart, BarChart3, Calendar,
  Settings2, Monitor, ChevronDown, ChevronUp, DollarSign, Package,
} from "lucide-react";
import { OCCASION_TEMPLATES } from "./OccasionTemplateGrid";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  bookTitle: string;
}

/* ── Identity Tab ── */
function IdentityTab({ stepData, setStepData, onMarkEdited, stepId, bookTitle }: Props) {
  const identity = stepData.editionIdentity || {};
  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, editionIdentity: { ...identity, [key]: value } }));
  };

  const titleOptions = identity.titleOptions || [
    `${bookTitle}: The Special Edition`,
    `${bookTitle}: The Gift Edition`,
    `${bookTitle}: The Collector's Edition`,
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Edition Title (select or edit)</Label>
        {titleOptions.map((title: string, i: number) => (
          <button
            key={i}
            onClick={() => update("selectedTitle", title)}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
              (identity.selectedTitle || titleOptions[0]) === title
                ? "border-secondary bg-secondary/5"
                : "border-border hover:border-secondary/40"
            }`}
          >
            <p className="text-sm font-medium">{title}</p>
          </button>
        ))}
        <Input
          value={identity.customTitle || ""}
          onChange={e => update("customTitle", e.target.value)}
          placeholder="Or type your own title..."
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Subtitle</Label>
        <Input
          value={identity.subtitle || ""}
          onChange={e => update("subtitle", e.target.value)}
          placeholder="A gift-focused subtitle for your edition"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Tagline</Label>
        <Input
          value={identity.tagline || ""}
          onChange={e => update("tagline", e.target.value)}
          placeholder="One-line tagline for gift buyers"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Cover Concept Brief</Label>
        <Textarea
          value={identity.coverConcept || ""}
          onChange={e => update("coverConcept", e.target.value)}
          placeholder="Mood, colors, imagery, typography direction for the themed cover..."
          rows={5}
        />
      </div>
    </div>
  );
}

/* ── Bonus Content Tab ── */
const BONUS_TYPES = [
  { key: "foreword", label: "Themed Foreword", icon: "📜" },
  { key: "reflectionPrompts", label: "Reflection Prompts", icon: "💭" },
  { key: "exclusiveChapter", label: "Exclusive Chapter", icon: "📖" },
  { key: "giftInscription", label: "Gift Inscription Page", icon: "✍️" },
  { key: "companionResource", label: "Companion Resource", icon: "📋" },
];

function BonusContentTab({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(BONUS_TYPES[0].key);
  const bonus = stepData.editionBonusContent || {};
  const update = (key: string, value: string) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, editionBonusContent: { ...bonus, [key]: value } }));
  };

  return (
    <div className="space-y-3">
      {BONUS_TYPES.map(bt => (
        <Card key={bt.key} className="overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === bt.key ? null : bt.key)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{bt.icon}</span>
              <span className="text-sm font-semibold">{bt.label}</span>
              {bonus[bt.key] && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">Done</Badge>}
            </div>
            {expanded === bt.key ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded === bt.key && (
            <div className="px-4 pb-4">
              <Textarea
                value={bonus[bt.key] || ""}
                onChange={e => update(bt.key, e.target.value)}
                placeholder={`Enter or edit your ${bt.label.toLowerCase()}...`}
                rows={8}
                className="text-sm"
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ── Bundles Tab ── */
const DEFAULT_BUNDLES = [
  { tier: "essential", name: "The Book Gift", description: "Special Edition book with all bonus content inside", priceMultiplier: 1 },
  { tier: "premium", name: "The Experience Gift", description: "Book + Workbook + Companion Resource PDF", priceMultiplier: 1.6 },
  { tier: "ultimate", name: "The Transformation Gift", description: "Book + Workbook + Home Study or Course access", priceMultiplier: 3 },
];

function BundlesTab({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const basePrice = stepData.editionConfig?.price || 49;
  const bundles = stepData.editionBundles || DEFAULT_BUNDLES.map(b => ({
    ...b,
    price: Math.round(basePrice * b.priceMultiplier),
    items: [],
  }));

  const updateBundle = (index: number, key: string, value: any) => {
    onMarkEdited(stepId);
    const updated = [...bundles];
    updated[index] = { ...updated[index], [key]: value };
    setStepData(prev => ({ ...prev, editionBundles: updated }));
  };

  const tierColors: Record<string, string> = {
    essential: "border-blue-500/30 bg-blue-500/5",
    premium: "border-amber-500/30 bg-amber-500/5",
    ultimate: "border-purple-500/30 bg-purple-500/5",
  };

  const tierBadgeColors: Record<string, string> = {
    essential: "bg-blue-500/10 text-blue-700",
    premium: "bg-amber-500/10 text-amber-700",
    ultimate: "bg-purple-500/10 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure 3 bundle tiers. Base edition price: ${basePrice}</p>
      {bundles.map((bundle: any, i: number) => (
        <Card key={bundle.tier} className={`p-4 border-2 ${tierColors[bundle.tier] || ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Badge className={tierBadgeColors[bundle.tier] || ""}>{bundle.tier.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                value={bundle.price || ""}
                onChange={e => updateBundle(i, "price", parseInt(e.target.value) || 0)}
                className="w-24 h-8 text-sm"
              />
            </div>
          </div>
          <Input
            value={bundle.name}
            onChange={e => updateBundle(i, "name", e.target.value)}
            className="mb-2 font-semibold"
          />
          <Textarea
            value={bundle.description}
            onChange={e => updateBundle(i, "description", e.target.value)}
            rows={2}
            className="text-sm"
          />
        </Card>
      ))}
    </div>
  );
}

/* ── Marketing Calendar Tab ── */
const WEEK_THEMES = [
  { week: 1, theme: "Teaser", label: "🔮 Week 1 — Teaser", description: "Build anticipation and curiosity" },
  { week: 2, theme: "Reveal", label: "🎁 Week 2 — Reveal", description: "Cover reveal, pre-order opens" },
  { week: 3, theme: "Social Proof", label: "⭐ Week 3 — Social Proof", description: "Early reactions, behind-the-scenes" },
  { week: 4, theme: "Urgency", label: "🔥 Week 4 — Urgency", description: "Last chance, countdown, final push" },
];

function MarketingCalendarTab({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const calendar = stepData.editionMarketing || {};

  const updateWeek = (week: number, value: string) => {
    onMarkEdited(stepId);
    setStepData(prev => ({
      ...prev,
      editionMarketing: { ...calendar, [`week${week}`]: value },
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">30-day promotional calendar with 4 weekly themes. Edit posts, emails, and milestones.</p>
      {WEEK_THEMES.map(wt => (
        <Card key={wt.week} className="overflow-hidden">
          <button
            onClick={() => setExpandedWeek(expandedWeek === wt.week ? null : wt.week)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold">{wt.label}</p>
              <p className="text-xs text-muted-foreground">{wt.description}</p>
            </div>
            {expandedWeek === wt.week ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedWeek === wt.week && (
            <div className="px-4 pb-4 space-y-2">
              <Label className="text-xs">3 social posts + 1 email for this week</Label>
              <Textarea
                value={calendar[`week${wt.week}`] || ""}
                onChange={e => updateWeek(wt.week, e.target.value)}
                placeholder={`Social Post 1: ...\nSocial Post 2: ...\nSocial Post 3: ...\nEmail Subject: ...\nEmail Preview: ...`}
                rows={8}
                className="text-sm"
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ── Print Specs Tab ── */
function PrintSpecsTab({ stepData, setStepData, onMarkEdited, stepId }: Props) {
  const specs = stepData.editionPrintSpecs || {};
  const update = (key: string, value: string) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, editionPrintSpecs: { ...specs, [key]: value } }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Updated Page Count</Label>
          <Input value={specs.pageCount || ""} onChange={e => update("pageCount", e.target.value)} placeholder="e.g., 285 pages (standard 240 + 45 bonus)" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Spine Width</Label>
          <Input value={specs.spineWidth || ""} onChange={e => update("spineWidth", e.target.value)} placeholder="e.g., 0.72 inches" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Interior Layout Notes</Label>
        <Textarea
          value={specs.layoutNotes || ""}
          onChange={e => update("layoutNotes", e.target.value)}
          placeholder="Where to insert bonus content: gift inscription after title page, foreword before ch.1, exclusive chapter after last chapter..."
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Cover Specifications</Label>
        <Textarea
          value={specs.coverSpecs || ""}
          onChange={e => update("coverSpecs", e.target.value)}
          placeholder="Paperback wrap / hardcover + dust jacket / illustrated cover details..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">ISBN & Production Notes</Label>
        <Textarea
          value={specs.isbnNotes || ""}
          onChange={e => update("isbnNotes", e.target.value)}
          placeholder="Special editions need a separate ISBN. Production notes..."
          rows={3}
        />
      </div>
    </div>
  );
}

/* ── Sales Page Preview Tab ── */
function SalesPreviewTab({ stepData, bookTitle }: Pick<Props, "stepData" | "bookTitle">) {
  const cfg = stepData.editionConfig || {};
  const identity = stepData.editionIdentity || {};
  const bundles = stepData.editionBundles || [];
  const occ = OCCASION_TEMPLATES.find(o => o.id === cfg.occasion);
  const hasOcc = cfg.occasion && cfg.occasion !== "none";
  const title = identity.customTitle || identity.selectedTitle || `${bookTitle}: The Special Edition`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="p-6 text-center bg-gradient-to-b from-amber-500/5 to-transparent border-amber-500/20">
        {hasOcc && (
          <Badge className="bg-secondary/10 text-secondary mb-2">🎁 {occ?.label || cfg.occasion} Edition</Badge>
        )}
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        {identity.subtitle && <p className="text-muted-foreground mt-1">{identity.subtitle}</p>}
        {identity.tagline && <p className="text-sm text-secondary italic mt-2">"{identity.tagline}"</p>}
        <div className="flex justify-center gap-2 mt-4">
          <Badge variant="outline">{cfg.editionType?.replace("-", " ") || "Signed Copy"}</Badge>
          <Badge variant="outline">{cfg.printRun === "limited" ? "Limited Run" : cfg.printRun || "Limited"}</Badge>
          {cfg.extras && <Badge variant="outline">{cfg.extras.split(",")[0]?.trim()}</Badge>}
        </div>
        <div className="mt-4">
          <Button className="bg-secondary text-secondary-foreground">
            {hasOcc ? "Give This Gift" : "Order Now"} — ${cfg.price || 49}
          </Button>
        </div>
      </Card>

      {/* Bundles preview */}
      {bundles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Bundle Tiers</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {bundles.map((b: any) => (
              <Card key={b.tier} className="p-4 text-center">
                <Badge variant="outline" className="mb-2">{b.tier}</Badge>
                <p className="font-semibold text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                <p className="text-lg font-bold mt-2">${b.price}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">This is a preview. The final sales page will be generated when you publish.</p>
    </div>
  );
}

/* ── Main 7-Tab Component ── */
const TAB_CONFIG = [
  { id: "identity", label: "Identity", icon: Tag },
  { id: "bonus", label: "Bonus Content", icon: BookText },
  { id: "sales", label: "Sales Page", icon: ShoppingCart },
  { id: "bundles", label: "Bundles", icon: Package },
  { id: "marketing", label: "Marketing", icon: Calendar },
  { id: "specs", label: "Print Specs", icon: Settings2 },
  { id: "preview", label: "Preview", icon: Monitor },
];

/**
 * Extract structured data from raw AI-generated editionContent markdown.
 * Parses sections like EDITION IDENTITY, THEMED FOREWORD, GIFT JOURNAL PROMPTS, etc.
 */
function extractFromContent(raw: string): {
  identity: Record<string, any>;
  bonus: Record<string, string>;
} {
  const identity: Record<string, any> = {};
  const bonus: Record<string, string> = {};

  if (!raw) return { identity, bonus };

  // Split into numbered sections: "1) EDITION IDENTITY", "2) THEMED FOREWORD", etc.
  const sectionRegex = /\d+\)\s+([A-Z][A-Z\s\-&/(),:—–]+)/g;
  const sectionStarts: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(raw)) !== null) {
    sectionStarts.push({ title: m[1].trim(), index: m.index });
  }

  const getSectionBody = (idx: number) => {
    const start = raw.indexOf("\n", sectionStarts[idx].index);
    const end = idx + 1 < sectionStarts.length ? sectionStarts[idx + 1].index : raw.length;
    return raw.slice(start, end).trim();
  };

  for (let i = 0; i < sectionStarts.length; i++) {
    const title = sectionStarts[i].title.toLowerCase();
    const body = getSectionBody(i);

    if (title.includes("identity") || title.includes("title")) {
      // Extract Option blocks
      const optionRegex = /Option\s+\d+:\s*\n\s*Title:\s*(.+)/gi;
      const titles: string[] = [];
      let om: RegExpExecArray | null;
      while ((om = optionRegex.exec(body)) !== null) {
        titles.push(om[1].trim());
      }
      if (titles.length > 0) identity.titleOptions = titles;

      // Extract subtitle from first option
      const subMatch = body.match(/Subtitle:\s*(.+)/i);
      if (subMatch) identity.subtitle = subMatch[1].trim();

      const tagMatch = body.match(/Tagline:\s*(.+)/i);
      if (tagMatch) identity.tagline = tagMatch[1].trim();

      // Cover concept
      const coverIdx = body.toLowerCase().indexOf("cover concept");
      if (coverIdx !== -1) {
        const coverText = body.slice(coverIdx).replace(/^[^\n]*\n/, "").trim();
        identity.coverConcept = coverText;
      }
    } else if (title.includes("foreword")) {
      bonus.foreword = body;
    } else if (title.includes("journal") || title.includes("prompt") || title.includes("reflection")) {
      bonus.reflectionPrompts = body;
    } else if (title.includes("exclusive") || title.includes("bonus") || title.includes("chapter")) {
      bonus.exclusiveChapter = body;
    } else if (title.includes("inscription")) {
      bonus.giftInscription = body;
    } else if (title.includes("companion") || title.includes("resource")) {
      bonus.companionResource = body;
    }
  }

  return { identity, bonus };
}

/**
 * Extract marketing calendar, sales copy, and print specs from editionSales content.
 */
function extractFromSales(raw: string): {
  salesCopy: string;
  marketing: Record<string, string>;
  printSpecs: Record<string, string>;
} {
  if (!raw) return { salesCopy: raw || "", marketing: {}, printSpecs: {} };

  const marketing: Record<string, string> = {};
  const printSpecs: Record<string, string> = {};

  // Find numbered sections
  const sectionRegex = /\d+\)\s+([^\n]+)/g;
  const sections: { title: string; startIdx: number }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionRegex.exec(raw)) !== null) {
    sections.push({ title: sm[1].trim(), startIdx: sm.index });
  }

  let salesCopy = raw;
  let calendarBody = "";
  let fulfillBody = "";

  for (let i = 0; i < sections.length; i++) {
    const t = sections[i].title.toLowerCase();
    const bodyStart = raw.indexOf("\n", sections[i].startIdx);
    const bodyEnd = i + 1 < sections.length ? sections[i + 1].startIdx : raw.length;
    const body = raw.slice(bodyStart, bodyEnd).trim();

    if (t.includes("marketing") && t.includes("calendar")) {
      calendarBody = body;
    } else if (t.includes("fulfillment") || t.includes("checklist")) {
      fulfillBody = body;
    }
  }

  // Parse marketing weeks
  if (calendarBody) {
    const weekParts = calendarBody.split(/Week\s+(\d+)/i);
    for (let w = 1; w <= 4; w++) {
      const wIdx = weekParts.findIndex((s, i) => i > 0 && s.trim() === String(w));
      if (wIdx !== -1 && weekParts[wIdx + 1]) {
        marketing[`week${w}`] = weekParts[wIdx + 1].trim();
      }
    }
    // If no week splits found, put the whole section in week1
    if (Object.keys(marketing).length === 0 && calendarBody.length > 20) {
      marketing.week1 = calendarBody;
    }
  }

  // Parse print/fulfillment specs
  if (fulfillBody) {
    printSpecs.layoutNotes = fulfillBody;
  }

  // Sales copy = everything (keep full content for the sales textarea)
  salesCopy = raw.trim();

  return { salesCopy, marketing, printSpecs };
}

export default function EditionReviewTabs(props: Props) {
  const hasExtracted = useRef(false);

  // Auto-populate review tabs from generated content (once)
  useEffect(() => {
    if (hasExtracted.current) return;

    const { editionContent, editionSales, editionIdentity, editionBonusContent, editionSalesCopy } = props.stepData;
    const needsIdentity = !editionIdentity && editionContent;
    const needsBonus = !editionBonusContent && editionContent;
    const needsSales = !editionSalesCopy && editionSales;

    const needsPrintSpecs = !props.stepData.editionPrintSpecs && editionSales;

    if (!needsIdentity && !needsBonus && !needsSales && !needsPrintSpecs) return;
    hasExtracted.current = true;

    const updates: Record<string, any> = {};

    if (editionContent && (needsIdentity || needsBonus)) {
      const { identity, bonus } = extractFromContent(editionContent);
      if (needsIdentity && Object.keys(identity).length > 0) {
        updates.editionIdentity = identity;
      }
      if (needsBonus && Object.keys(bonus).length > 0) {
        updates.editionBonusContent = bonus;
      }
    }

    if ((needsSales || needsPrintSpecs) && editionSales) {
      const { salesCopy, marketing, printSpecs } = extractFromSales(editionSales);
      if (needsSales) {
        updates.editionSalesCopy = salesCopy;
      }
      if (Object.keys(marketing).length > 0 && !props.stepData.editionMarketing) {
        updates.editionMarketing = marketing;
      }
      if (needsPrintSpecs && Object.keys(printSpecs).length > 0) {
        updates.editionPrintSpecs = printSpecs;
      }
    }

    if (Object.keys(updates).length > 0) {
      props.setStepData(prev => ({ ...prev, ...updates }));
    }
  }, [props.stepData.editionContent, props.stepData.editionSales, props]);

  return (
    <Tabs defaultValue="identity" className="w-full">
      <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-lg">
        {TAB_CONFIG.map(tab => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-4">
        <TabsContent value="identity"><IdentityTab {...props} /></TabsContent>
        <TabsContent value="bonus"><BonusContentTab {...props} /></TabsContent>
        <TabsContent value="sales">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Edit the AI-generated sales copy below. This will be used for your public sales page.</p>
            <Textarea
              value={props.stepData.editionSalesCopy || ""}
              onChange={e => {
                props.onMarkEdited(props.stepId);
                props.setStepData(prev => ({ ...prev, editionSalesCopy: e.target.value }));
              }}
              rows={16}
              placeholder="Sales page copy will appear here after generation..."
              className="text-sm"
            />
          </div>
        </TabsContent>
        <TabsContent value="bundles"><BundlesTab {...props} /></TabsContent>
        <TabsContent value="marketing"><MarketingCalendarTab {...props} /></TabsContent>
        <TabsContent value="specs"><PrintSpecsTab {...props} /></TabsContent>
        <TabsContent value="preview"><SalesPreviewTab stepData={props.stepData} bookTitle={props.bookTitle} /></TabsContent>
      </div>
    </Tabs>
  );
}
