import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Monitor, Smartphone, Timer, Check, AlertTriangle, ArrowRight, X } from "lucide-react";
import type { UpsellStepProps, UpsellOffer } from "./types";

export default function PageDesignStep({ stepData, setStepData, onMarkEdited }: UpsellStepProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState("upsell");

  const setup = stepData.setup || {};
  const offer: UpsellOffer | null = stepData.offer || null;
  const funnelType = setup.funnelType || "post-purchase-upsell";

  if (!offer) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Complete the Offer Builder step first to design pages.</p>
      </Card>
    );
  }

  const discount = Math.round((1 - offer.specialPrice / offer.originalPrice) * 100);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Design Tips</p>
            <p className="text-sm text-muted-foreground">
              One CTA, clear pricing, and urgency. Remove all navigation — the only choices should be 
              "Yes, add this" or "No thanks." Simplicity converts.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upsell" className="text-xs">
              {funnelType === "order-bump" ? "Order Bump" : "Upsell Page"}
            </TabsTrigger>
            {(funnelType === "exit-intent-downsell" || funnelType === "post-purchase-upsell") && (
              <TabsTrigger value="downsell" className="text-xs">Downsell Page</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex gap-1">
          <Button variant={previewMode === "desktop" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewMode("desktop")}>
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button variant={previewMode === "mobile" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewMode("mobile")}>
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Upsell page preview */}
      {activeTab === "upsell" && (
        <Card className={`overflow-hidden ${previewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
          {funnelType === "order-bump" ? (
            /* Order bump checkbox design */
            <div className="p-6">
              <div className="border-2 border-dashed border-secondary/30 rounded-lg p-4 bg-secondary/5">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded border-2 border-secondary bg-secondary/20 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="h-3 w-3 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{offer.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{offer.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs line-through text-muted-foreground">${offer.originalPrice}</span>
                      <span className="text-sm font-bold text-secondary">${offer.specialPrice}</span>
                      <Badge className="bg-secondary/20 text-secondary text-[9px]">Add for just ${offer.specialPrice}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                ↑ This appears as a checkbox on the checkout page
              </p>
            </div>
          ) : (
            /* Full upsell page */
            <div className="p-0">
              {/* Header */}
              <div className="p-8 text-center bg-gradient-to-b from-secondary/10 to-transparent">
                <Badge className="bg-secondary/20 text-secondary mb-3 text-[10px]">
                  🎉 Special One-Time Offer
                </Badge>
                <h2 className="font-heading text-xl md:text-2xl font-bold mb-3">{offer.headline}</h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">{offer.description}</p>
              </div>

              {/* Urgency */}
              {offer.urgencyType !== "none" && (
                <div className="px-6 py-3 bg-destructive/5 border-y border-destructive/10 text-center">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <Timer className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {offer.urgencyType === "countdown" && "This offer expires in 15:00 minutes"}
                      {offer.urgencyType === "limited-spots" && "Only 7 spots remaining at this price"}
                      {offer.urgencyType === "one-time" && "This offer will not be shown again"}
                    </span>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-2xl line-through text-muted-foreground">${offer.originalPrice}</span>
                  <span className="text-4xl font-bold">${offer.specialPrice}</span>
                  <Badge variant="destructive" className="text-xs">{discount}% OFF</Badge>
                </div>

                {/* Includes */}
                <div className="max-w-sm mx-auto text-left mb-6">
                  {offer.includes.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <Check className="h-4 w-4 text-secondary shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3 max-w-sm mx-auto">
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 text-base font-bold">
                    Yes! Add This to My Order <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <button className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground underline">
                    No thanks, I'll pass on this exclusive offer
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Downsell page preview */}
      {activeTab === "downsell" && (
        <Card className={`overflow-hidden ${previewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">We understand — here's a lighter option:</p>
            <h2 className="font-heading text-xl font-bold mb-3">
              Get the {offer.productName} Starter Pack
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Not ready for the full package? Start with the essentials at a fraction of the price.
            </p>

            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-xl line-through text-muted-foreground">${offer.specialPrice}</span>
              <span className="text-3xl font-bold">${Math.round(offer.specialPrice * 0.5)}</span>
              <Badge className="bg-accent/20 text-accent text-xs">50% Less</Badge>
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-11">
                Yes, I'll Take the Starter Pack
              </Button>
              <button className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground underline">
                No thanks, I'm good for now
              </button>
            </div>
          </div>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        All page elements are inline-editable. Click any text above to customize.
      </p>
    </div>
  );
}
