import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, AlertTriangle, ArrowRight, Package, ListChecks, Users,
  Star, DollarSign, HelpCircle, Rocket, Plus, X, FileText,
} from "lucide-react";
import type { SalesCopyData } from "./salesCopyTypes";

interface Props {
  data: SalesCopyData;
  onChange: (data: SalesCopyData) => void;
  productLabel?: string;
  onGenerateWithAbby?: () => void;
  generating?: boolean;
}

const SEGMENTS = [
  { id: "copy", label: "Sales Description", icon: FileText, num: 1 },
  { id: "author", label: "Meet Your Author", icon: Users, num: 2 },
  { id: "proof", label: "Testimonials", icon: Star, num: 3 },
  { id: "pricing", label: "Pricing", icon: DollarSign, num: 4 },
  { id: "faq", label: "FAQ", icon: HelpCircle, num: 5 },
] as const;

type SegmentId = (typeof SEGMENTS)[number]["id"];

/** Reusable list editor for string arrays */
function ListEditor({ items, onChange, placeholder }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={e => {
              const updated = [...items];
              updated[i] = e.target.value;
              onChange(updated);
            }}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
        onClick={() => onChange([...items, ""])}>
        <Plus className="h-3 w-3 mr-1" /> Add Item
      </Button>
    </div>
  );
}

function SectionCard({ num, title, icon: Icon, children }: {
  num: number; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <Icon className="h-4 w-4 text-secondary" />
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      {children}
    </Card>
  );
}

export default function SharedSalesCopyEditor({ data, onChange, productLabel, onGenerateWithAbby, generating }: Props) {
  const [activeSegment, setActiveSegment] = useState<SegmentId>("copy");

  const update = <K extends keyof SalesCopyData>(section: K, value: Partial<SalesCopyData[K]>) => {
    onChange({ ...data, [section]: { ...data[section], ...value } });
  };

  return (
    <div className="space-y-5">
      {/* Generate CTA */}
      {onGenerateWithAbby && (
        <Button
          variant="outline"
          className="w-full text-xs border-secondary/30 hover:border-secondary"
          onClick={onGenerateWithAbby}
          disabled={generating}
        >
          <Sparkles className="h-3.5 w-3.5 mr-2 text-secondary" />
          {generating ? "Generating Sales Copy…" : "Generate All Sections with Abby"}
        </Button>
      )}

      {/* Segment navigation */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-1">
          {SEGMENTS.map(seg => {
            const Icon = seg.icon;
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(seg.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                  isActive
                    ? "border-secondary bg-secondary/10 text-secondary shadow-sm"
                    : "border-border bg-card hover:border-secondary/30 text-muted-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {seg.num}
                </span>
                <Icon className="h-3.5 w-3.5" />
                {seg.label}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ─── Segment 1: Sales Description (Hero, Problem, Transformation, Intro, What's Inside, How It Works) ─── */}
      {activeSegment === "copy" && (
        <div className="space-y-4">
          {/* 1. Hero */}
          <SectionCard num={1} title="Hero" icon={Rocket}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Product Title</label>
                <Input value={data.hero.title} onChange={e => update("hero", { title: e.target.value })}
                  placeholder={`e.g., The ${productLabel || "Program"}`} className="h-9" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tagline (one line)</label>
                <Input value={data.hero.tagline} onChange={e => update("hero", { tagline: e.target.value })}
                  placeholder="Transform your life in 21 days..." className="h-9" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">CTA Button Text</label>
                <Input value={data.hero.ctaText} onChange={e => update("hero", { ctaText: e.target.value })}
                  placeholder="Start Now" className="h-9 max-w-[200px]" />
              </div>
            </div>
          </SectionCard>

          {/* 2. The Problem */}
          <SectionCard num={2} title="The Problem" icon={AlertTriangle}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Headline</label>
                <Input value={data.problem.headline} onChange={e => update("problem", { headline: e.target.value })}
                  placeholder="Are you struggling with..." className="h-9" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Pain Points</label>
                <ListEditor items={data.problem.painPoints}
                  onChange={painPoints => update("problem", { painPoints })}
                  placeholder="e.g., Feeling stuck in your career..." />
              </div>
            </div>
          </SectionCard>

          {/* 3. The Transformation */}
          <SectionCard num={3} title="The Transformation" icon={ArrowRight}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-destructive/70 block mb-1">❌ Before (Where they are now)</label>
                <ListEditor items={data.transformation.before}
                  onChange={before => update("transformation", { before })}
                  placeholder="Struggling with..." />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-accent block mb-1">✅ After (Where they'll be)</label>
                <ListEditor items={data.transformation.after}
                  onChange={after => update("transformation", { after })}
                  placeholder="Confident and..." />
              </div>
            </div>
          </SectionCard>

          {/* 4. Introducing [Product] */}
          <SectionCard num={4} title={`Introducing ${data.hero.title || `Your ${productLabel || "Product"}`}`} icon={Package}>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Description (one paragraph)</label>
              <Textarea value={data.introduction.paragraph}
                onChange={e => update("introduction", { paragraph: e.target.value })}
                placeholder="What it is, who it's for, why it matters..."
                rows={4} className="text-sm" />
            </div>
          </SectionCard>

          {/* 5. What's Inside */}
          <SectionCard num={5} title="What's Inside / What You Get" icon={ListChecks}>
            <ListEditor items={data.whatsInside.items}
              onChange={items => update("whatsInside", { items })}
              placeholder="e.g., 21 daily guided lessons" />
          </SectionCard>

          {/* 6. How It Works */}
          <SectionCard num={6} title="How It Works" icon={ArrowRight}>
            <div className="space-y-3">
              {data.howItWorks.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <Input value={step.title}
                      onChange={e => {
                        const steps = [...data.howItWorks.steps];
                        steps[i] = { ...steps[i], title: e.target.value };
                        update("howItWorks", { steps });
                      }}
                      placeholder="Step title" className="h-8 text-sm font-medium" />
                    <Input value={step.description}
                      onChange={e => {
                        const steps = [...data.howItWorks.steps];
                        steps[i] = { ...steps[i], description: e.target.value };
                        update("howItWorks", { steps });
                      }}
                      placeholder="Brief description" className="h-8 text-sm text-muted-foreground" />
                  </div>
                  {data.howItWorks.steps.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => {
                        const steps = data.howItWorks.steps.filter((_, idx) => idx !== i);
                        update("howItWorks", { steps });
                      }}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {data.howItWorks.steps.length < 5 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                  onClick={() => update("howItWorks", { steps: [...data.howItWorks.steps, { title: "", description: "" }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              )}
            </div>
          </SectionCard>

          {/* 11. Final CTA */}
          <SectionCard num={7} title="Final CTA" icon={Rocket}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Headline</label>
                <Input value={data.finalCta.headline} onChange={e => update("finalCta", { headline: e.target.value })}
                  placeholder="Ready to Transform?" className="h-9" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Subheadline</label>
                <Input value={data.finalCta.subheadline} onChange={e => update("finalCta", { subheadline: e.target.value })}
                  placeholder="Don't wait — your transformation starts today" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">CTA Button Text</label>
                  <Input value={data.finalCta.ctaText} onChange={e => update("finalCta", { ctaText: e.target.value })}
                    placeholder="Get Started Today" className="h-9" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Urgency Line (optional)</label>
                  <Input value={data.finalCta.urgency || ""} onChange={e => update("finalCta", { urgency: e.target.value })}
                    placeholder="Limited spots available" className="h-9" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Segment 2: Meet Your Author ─── */}
      {activeSegment === "author" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-secondary" />
            <h4 className="text-sm font-bold">Meet Your Author</h4>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Author Name</label>
              <Input value={data.author.name} onChange={e => update("author", { name: e.target.value })}
                className="h-9" placeholder="Your name" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Short Bio</label>
              <Textarea value={data.author.bio} onChange={e => update("author", { bio: e.target.value })}
                rows={4} className="text-sm" placeholder="Why you're the right person to teach this..." />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Credentials (one line)</label>
              <Input value={data.author.credentials} onChange={e => update("author", { credentials: e.target.value })}
                className="h-9" placeholder="e.g., Bestselling author, 15+ years experience" />
            </div>
          </div>
        </Card>
      )}

      {/* ─── Segment 3: Testimonials / Social Proof ─── */}
      {activeSegment === "proof" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Star className="h-4 w-4 text-secondary" />
            <h4 className="text-sm font-bold">Social Proof / Testimonials</h4>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Hidden on the public page until you add at least one testimonial.</p>
          <div className="space-y-3">
            {data.socialProof.testimonials.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <Input value={t.name}
                  onChange={e => {
                    const testimonials = [...data.socialProof.testimonials];
                    testimonials[i] = { ...testimonials[i], name: e.target.value };
                    update("socialProof", { testimonials });
                  }}
                  placeholder="Name" className="h-8 text-sm font-medium" />
                <Textarea value={t.quote}
                  onChange={e => {
                    const testimonials = [...data.socialProof.testimonials];
                    testimonials[i] = { ...testimonials[i], quote: e.target.value };
                    update("socialProof", { testimonials });
                  }}
                  placeholder="Their quote..." rows={2} className="text-sm" />
                <Button variant="ghost" size="sm" className="text-[10px] text-destructive h-6"
                  onClick={() => update("socialProof", { testimonials: data.socialProof.testimonials.filter((_, idx) => idx !== i) })}>
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
              onClick={() => update("socialProof", { testimonials: [...data.socialProof.testimonials, { name: "", quote: "" }] })}>
              <Plus className="h-3 w-3 mr-1" /> Add Testimonial
            </Button>
          </div>
        </Card>
      )}

      {/* ─── Segment 4: Pricing ─── */}
      {activeSegment === "pricing" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-4 w-4 text-secondary" />
            <h4 className="text-sm font-bold">Pricing</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Price ($)</label>
              <Input type="number" min={0} value={data.pricing.price}
                onChange={e => update("pricing", { price: e.target.value })}
                placeholder="47" className="h-9" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Compare-at Price</label>
              <Input type="number" min={0} value={data.pricing.comparePrice || ""}
                onChange={e => update("pricing", { comparePrice: e.target.value })}
                placeholder="97" className="h-9" />
              <p className="text-[9px] text-muted-foreground mt-0.5">Shown as strikethrough</p>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">CTA Button Text</label>
              <Input value={data.pricing.ctaText}
                onChange={e => update("pricing", { ctaText: e.target.value })}
                placeholder="Enroll Now" className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">What's Included in Purchase</label>
            <ListEditor items={data.pricing.included.length ? data.pricing.included : [""]}
              onChange={included => update("pricing", { included })}
              placeholder="e.g., Lifetime access to all materials" />
          </div>
        </Card>
      )}

      {/* ─── Segment 5: FAQ ─── */}
      {activeSegment === "faq" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-4 w-4 text-secondary" />
            <h4 className="text-sm font-bold">Frequently Asked Questions</h4>
          </div>
          <div className="space-y-3">
            {data.faq.items.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-secondary shrink-0 mt-1">Q:</span>
                  <Input value={faq.q}
                    onChange={e => {
                      const items = [...data.faq.items];
                      items[i] = { ...items[i], q: e.target.value };
                      update("faq", { items });
                    }}
                    className="h-8 text-sm font-medium" placeholder="Question..." />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mt-1">A:</span>
                  <Textarea value={faq.a}
                    onChange={e => {
                      const items = [...data.faq.items];
                      items[i] = { ...items[i], a: e.target.value };
                      update("faq", { items });
                    }}
                    rows={2} className="text-sm" placeholder="Answer..." />
                </div>
                <Button variant="ghost" size="sm" className="text-[10px] text-destructive h-6"
                  onClick={() => update("faq", { items: data.faq.items.filter((_, idx) => idx !== i) })}>
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
              onClick={() => update("faq", { items: [...data.faq.items, { q: "", a: "" }] })}>
              <Plus className="h-3 w-3 mr-1" /> Add FAQ
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
