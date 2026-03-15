import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, Star, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { SalesCopyData } from "./salesCopyTypes";

interface Props {
  data: SalesCopyData;
  onCtaClick?: () => void;
  productMeta?: {
    badge?: string; // e.g., "21-Day Program"
    duration?: string;
    commitment?: string;
    level?: string;
  };
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <span className="text-xs font-semibold pr-4">{q}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="text-xs text-muted-foreground pb-3 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function SharedSalesCopyPreview({ data, productMeta, onCtaClick }: Props) {
  const hasTestimonials = data.socialProof.testimonials.some(t => t.name && t.quote);
  const hasFaqs = data.faq.items.some(f => f.q && f.a);
  const hasProblem = data.problem.headline || data.problem.painPoints.some(p => p);
  const hasTransformation = data.transformation.before.some(b => b) || data.transformation.after.some(a => a);
  const hasIntro = data.introduction.paragraph;
  const hasWhatsInside = data.whatsInside.items.some(i => i);
  const hasAuthor = data.author.name || data.author.bio;

  return (
    <div className="divide-y divide-border">
      {/* 1. Hero */}
      <div className="bg-gradient-to-b from-secondary/10 to-transparent p-8 text-center">
        {productMeta?.badge && (
          <Badge variant="secondary" className="text-[10px] mb-3">{productMeta.badge}</Badge>
        )}
        <h1 className="font-heading text-2xl font-bold mb-2">{data.hero.title || "Your Product"}</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{data.hero.tagline}</p>
        {productMeta && (
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mb-6">
            {productMeta.duration && <span>{productMeta.duration}</span>}
            {productMeta.commitment && <span>{productMeta.commitment}</span>}
            {productMeta.level && <span>{productMeta.level}</span>}
          </div>
        )}
        <Button onClick={onCtaClick} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 h-10 text-sm cursor-pointer">
          {data.hero.ctaText || "Start Now"}
        </Button>
      </div>

      {/* 2. The Problem */}
      {hasProblem && (
        <div className="p-8">
          <h2 className="font-heading text-lg font-bold mb-4 text-center">{data.problem.headline}</h2>
          <div className="max-w-md mx-auto space-y-2">
            {data.problem.painPoints.filter(p => p).map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-destructive mt-0.5 text-xs">✗</span>
                <p className="text-xs text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. The Transformation */}
      {hasTransformation && (
        <div className="p-8">
          <h2 className="font-heading text-lg font-bold mb-5 text-center">The Transformation</h2>
          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-destructive/70 uppercase tracking-wider mb-2">Before</p>
              {data.transformation.before.filter(b => b).map((item, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-destructive/50 text-xs">✗</span>
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">After</p>
              {data.transformation.after.filter(a => a).map((item, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Introducing */}
      {hasIntro && (
        <div className="p-8 text-center">
          <h2 className="font-heading text-lg font-bold mb-3">
            Introducing {data.hero.title || "Your Program"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto whitespace-pre-line">
            {data.introduction.paragraph}
          </p>
        </div>
      )}

      {/* 5. What's Inside */}
      {hasWhatsInside && (
        <div className="p-8">
          <h2 className="font-heading text-lg font-bold mb-4 text-center">What You Get</h2>
          <div className="max-w-md mx-auto space-y-2.5">
            {data.whatsInside.items.filter(i => i).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. How It Works */}
      {data.howItWorks.steps.some(s => s.title) && (
        <div className="p-8 bg-muted/20">
          <h2 className="font-heading text-lg font-bold mb-6 text-center">How It Works</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            {data.howItWorks.steps.filter(s => s.title).map((step, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center mx-auto mb-2">
                  {i + 1}
                </div>
                <p className="text-xs font-bold mb-1">{step.title}</p>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Meet Your Author */}
      {hasAuthor && (
        <div className="p-8">
          <h2 className="font-heading text-lg font-bold mb-4 text-center">Meet Your Author</h2>
          <div className="max-w-md mx-auto text-center">
            {data.author.photoUrl && (
              <img src={data.author.photoUrl} alt={data.author.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
            )}
            <p className="text-sm font-bold">{data.author.name}</p>
            {data.author.credentials && (
              <p className="text-[10px] text-secondary font-medium mt-0.5">{data.author.credentials}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{data.author.bio}</p>
          </div>
        </div>
      )}

      {/* 8. Social Proof */}
      {hasTestimonials && (
        <div className="p-8 bg-muted/20">
          <h2 className="font-heading text-lg font-bold mb-5 text-center">What Others Are Saying</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {data.socialProof.testimonials.filter(t => t.name && t.quote).map((t, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="h-3 w-3 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic mb-2">"{t.quote}"</p>
                <p className="text-[10px] font-bold">— {t.name}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 9. Pricing */}
      {data.pricing.price && (
        <div className="p-8 text-center">
          <h2 className="font-heading text-lg font-bold mb-4">Get Started Today</h2>
          <Card className="max-w-sm mx-auto p-6 border-secondary/30">
            <div className="flex items-center justify-center gap-3 mb-4">
              {data.pricing.comparePrice && (
                <span className="text-lg text-muted-foreground line-through">${data.pricing.comparePrice}</span>
              )}
              <span className="text-3xl font-heading font-bold text-secondary">${data.pricing.price}</span>
              <span className="text-[10px] text-muted-foreground">{data.pricing.currency || "USD"}</span>
            </div>
            {data.pricing.included.filter(i => i).length > 0 && (
              <div className="space-y-1.5 mb-4 text-left">
                {data.pricing.included.filter(i => i).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-secondary shrink-0" />
                    <span className="text-xs">{item}</span>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10">
              {data.pricing.ctaText || "Enroll Now"}
            </Button>
          </Card>
        </div>
      )}

      {/* 10. FAQ */}
      {hasFaqs && (
        <div className="p-8">
          <h2 className="font-heading text-lg font-bold mb-4 text-center">Frequently Asked Questions</h2>
          <div className="max-w-md mx-auto">
            {data.faq.items.filter(f => f.q && f.a).map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      )}

      {/* 11. Final CTA */}
      <div className="p-8 bg-gradient-to-t from-secondary/10 to-transparent text-center">
        <h2 className="font-heading text-xl font-bold mb-2">{data.finalCta.headline || "Ready to Get Started?"}</h2>
        {data.finalCta.subheadline && (
          <p className="text-sm text-muted-foreground mb-4">{data.finalCta.subheadline}</p>
        )}
        <Button className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 h-10 text-sm">
          {data.finalCta.ctaText || "Get Started Today"}
        </Button>
        {data.finalCta.urgency && (
          <p className="text-[10px] text-muted-foreground mt-3 italic">{data.finalCta.urgency}</p>
        )}
      </div>
    </div>
  );
}
