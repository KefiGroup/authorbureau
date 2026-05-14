import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, Check } from "lucide-react";
import ServiceInquiryForm from "@/components/ServiceInquiryForm";
import type { ThemeVars } from "@/pages/author-site/types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "@/pages/author-site/AuthorLeadMagnetsSection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: LiveNode;
  serviceLabel: string;
  authorName: string;
  authorSlug: string;
  theme: AuthorTheme;
  v: ThemeVars;
}

// Strip any pricing leakage from a string
const PRICE_RE = /\$[\d,]+(?:\.\d+)?(?:\s*(?:USD|usd|\/yr|\/year|\/mo|\/month|per\s+\w+))?|\bUSD\s*[\d,]+/g;
const scrub = (s: unknown): string => {
  if (typeof s !== "string") return "";
  return s.replace(PRICE_RE, "").replace(/\s{2,}/g, " ").replace(/\(\s*\)/g, "").trim();
};

// Pricing-related keys we never render
const PRICE_KEYS = new Set([
  "price", "price_usd", "price_annual_usd", "fee", "fee_range", "fee_schedule",
  "investment", "currency", "amount", "cost",
]);

const isPricey = (k: string) => {
  const lower = k.toLowerCase();
  return PRICE_KEYS.has(lower) || lower.includes("price") || lower.includes("fee_") || lower.includes("_fee") || lower.includes("usd");
};

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return scrub(v);
  }
  return null;
}

function pickArr(val: unknown): any[] {
  return Array.isArray(val) ? val : [];
}

export default function ServiceDetailDialog({
  open, onOpenChange, node, serviceLabel, authorName, authorSlug, theme, v,
}: Props) {
  const [inquireOpen, setInquireOpen] = useState(false);
  const c = (node.content_json ?? {}) as Record<string, any>;

  const view = useMemo(() => {
    const title = node.personalised_name || node.node_name ||
      pickStr(c.programme_title, c.mastermind_title, c.practice_title, c.speaker_brand) || serviceLabel;

    const tagline = pickStr(c.tagline, c.speaker_tagline, c.programme_promise, c.sales_page?.subheadline);

    const overview = pickStr(
      c.coaching_philosophy,
      c.programme_promise,
      c.speaker_one_sheet?.bio_long,
      c.speaker_one_sheet?.bio_short,
      c.sales_page?.who_its_for,
      (c as any).description,
    );

    // What's included — bullets of outcomes/benefits/key takeaways
    const includedBullets: string[] = [];
    pickArr(c.packages).forEach((p: any) => pickArr(p.outcomes).forEach((o) => includedBullets.push(scrub(o))));
    pickArr(c.offers).forEach((o: any) => pickArr(o.what_included).forEach((x) => includedBullets.push(scrub(x))));
    pickArr(c.membership_tiers).forEach((t: any) => pickArr(t.benefits).forEach((b) => includedBullets.push(scrub(b))));
    pickArr(c.signature_talks).forEach((t: any) => pickArr(t.key_takeaways).forEach((k) => includedBullets.push(scrub(k))));
    pickArr(c.learning_outcomes).forEach((l) => includedBullets.push(scrub(l)));
    pickArr(c.sales_page?.what_youll_get).forEach((x) => includedBullets.push(scrub(x)));

    // Outline — modules / pillars / talks / formats
    type OutlineItem = { title: string; detail?: string };
    const outline: OutlineItem[] = [];
    pickArr(c.programme_outline).forEach((m: any) => outline.push({
      title: scrub(m.title || m.module || ""), detail: scrub(m.description || ""),
    }));
    pickArr(c.curriculum_pillars).forEach((p: any) => outline.push({
      title: typeof p === "string" ? scrub(p) : scrub(p.title || p.name || ""),
      detail: typeof p === "string" ? undefined : scrub(p.description || ""),
    }));
    pickArr(c.signature_talks).forEach((t: any) => outline.push({
      title: scrub(t.talk_title || ""), detail: scrub(t.description || t.opening_hook || ""),
    }));
    pickArr(c.packages).forEach((p: any) => outline.push({
      title: scrub(p.package_name || ""), detail: scrub(p.description || ""),
    }));
    pickArr(c.offers).forEach((o: any) => outline.push({
      title: scrub(o.offer_name || ""), detail: scrub(o.transformation_promise || ""),
    }));
    pickArr(c.training_formats).forEach((f: any) => outline.push({
      title: scrub(f.format || ""), detail: scrub([f.duration, f.participants].filter(Boolean).join(" · ")),
    }));

    const cleanedOutline = outline.filter((o) => o.title);

    // Who it's for
    const whoFor: string[] = [];
    pickArr(c.target_organisations).forEach((x) => whoFor.push(scrub(x)));
    if (typeof c.sales_page?.who_its_for === "string") whoFor.push(scrub(c.sales_page.who_its_for));
    pickArr(c.packages).forEach((p: any) => p.ideal_for && whoFor.push(scrub(p.ideal_for)));
    pickArr(c.offers).forEach((o: any) => o.ideal_client && whoFor.push(scrub(o.ideal_client)));

    // How it works
    const howSteps: string[] = [];
    pickArr(c.booking_process).forEach((s) => howSteps.push(typeof s === "string" ? scrub(s) : scrub(s.step || s.title || "")));
    pickArr(c.application_questions).forEach((q) => howSteps.push(typeof q === "string" ? scrub(q) : scrub(q.question || "")));
    if (c.discovery_call_script?.opening) howSteps.push(scrub(c.discovery_call_script.opening));

    return {
      title, tagline, overview,
      included: Array.from(new Set(includedBullets.filter(Boolean))).slice(0, 8),
      outline: cleanedOutline.slice(0, 8),
      whoFor: Array.from(new Set(whoFor.filter(Boolean))).slice(0, 4),
      howSteps: howSteps.filter(Boolean).slice(0, 5),
    };
  }, [c, node, serviceLabel]);

  const hasContent = view.overview || view.included.length || view.outline.length || view.whoFor.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
          style={{ background: v.cardBg, color: v.bodyText, border: `1px solid ${v.cardBorder}` }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${v.cardBorder}` }}>
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3"
              style={{ background: `${v.primary}20`, color: v.primary }}
            >
              {serviceLabel}
            </span>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: v.headingText, fontFamily: theme.headingFont }}
            >
              {view.title}
            </h2>
            {view.tagline && (
              <p className="text-base leading-relaxed" style={{ color: v.mutedText }}>{view.tagline}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {!hasContent && (
              <p className="text-sm leading-relaxed" style={{ color: v.bodyText }}>
                {authorName} will share full programme details on request. Tap Inquire below and we'll be in touch.
              </p>
            )}

            {view.overview && (
              <Section title="Overview" theme={theme} v={v}>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>{view.overview}</p>
              </Section>
            )}

            {view.included.length > 0 && (
              <Section title="What's Included" theme={theme} v={v}>
                <ul className="space-y-2">
                  {view.included.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: v.bodyText }}>
                      <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: v.accent }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {view.outline.length > 0 && (
              <Section title="Outline" theme={theme} v={v}>
                <ol className="space-y-3">
                  {view.outline.map((o, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                        style={{ background: `${v.accent}26`, color: v.accent }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: v.headingText }}>{o.title}</div>
                        {o.detail && <p className="text-sm mt-0.5" style={{ color: v.bodyText }}>{o.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {view.whoFor.length > 0 && (
              <Section title="Who It's For" theme={theme} v={v}>
                <ul className="space-y-1.5">
                  {view.whoFor.map((w, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: v.bodyText }}>
                      <span style={{ color: v.accent }}>•</span><span>{w}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {view.howSteps.length > 0 && (
              <Section title="How It Works" theme={theme} v={v}>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {view.howSteps.map((s, i) => (
                    <li key={i} className="text-sm" style={{ color: v.bodyText }}>{s}</li>
                  ))}
                </ol>
              </Section>
            )}
          </div>

          {/* CTA */}
          <div className="px-6 py-4 sticky bottom-0" style={{ background: v.cardBg, borderTop: `1px solid ${v.cardBorder}` }}>
            <button
              onClick={() => setInquireOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all hover:brightness-110"
              style={{ background: v.accent, color: v.accentText }}
            >
              Inquire about {view.title} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ServiceInquiryForm
        open={inquireOpen}
        onOpenChange={setInquireOpen}
        authorName={authorName}
        authorSlug={authorSlug}
        serviceType={serviceLabel}
      />
    </>
  );
}

function Section({ title, children, theme, v }: { title: string; children: React.ReactNode; theme: AuthorTheme; v: ThemeVars }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
