import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Eye, Monitor, Smartphone, CreditCard, Users, TrendingUp, Star, Check, Loader2, Rocket } from "lucide-react";
import type { MembershipStepProps, MembershipTier, ContentDrop } from "./types";

export default function MembershipPublishStep({ stepData, setStepData, onMarkEdited, bookTitle }: MembershipStepProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);

  const tiers: MembershipTier[] = stepData.tiers || [];
  const calendar: ContentDrop[] = stepData.contentCalendar || [];
  const membershipName = stepData.setup?.name || "Membership";
  const tagline = stepData.setup?.tagline || "";

  const totalContentDrops = calendar.length;
  const recurringCount = calendar.filter(d => d.isRecurring).length;
  const monthlyRevenue = tiers.reduce((sum, t) => sum + t.monthlyPrice * (t.isMostPopular ? 15 : 5), 0);

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setStepData(prev => ({ ...prev, published: true }));
      onMarkEdited("publish");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Abby final review */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Final Review</p>
            <p className="text-sm text-muted-foreground">
              Your {membershipName} has {tiers.length} tiers, {totalContentDrops} content drops across 3 months 
              ({recurringCount} recurring). With conservative estimates of 20 founding members, 
              you could generate <strong className="text-foreground">${monthlyRevenue.toLocaleString()}/month</strong> in recurring revenue. 
              Launch with a founding member discount to build critical mass!
            </p>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CreditCard, label: "Tiers", value: tiers.length },
          { icon: Users, label: "Content Drops", value: totalContentDrops },
          { icon: TrendingUp, label: "Projected MRR", value: `$${monthlyRevenue.toLocaleString()}` },
          { icon: Star, label: "Popular Tier", value: tiers.find(t => t.isMostPopular)?.name || "—" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-3 text-center">
            <Icon className="h-4 w-4 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Preview tabs */}
      <Tabs defaultValue="sales-page">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="sales-page" className="text-xs">Sales Page</TabsTrigger>
            <TabsTrigger value="member-experience" className="text-xs">Member Experience</TabsTrigger>
          </TabsList>
          <div className="flex gap-1">
            <Button
              variant={previewMode === "desktop" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={previewMode === "mobile" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <TabsContent value="sales-page">
          <Card className={`overflow-hidden ${previewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
            <div className="p-8 text-center bg-gradient-to-b from-secondary/10 to-transparent">
              <Badge className="bg-secondary/20 text-secondary mb-4">{membershipName}</Badge>
              <h2 className="font-heading text-2xl font-bold mb-2">{membershipName}</h2>
              <p className="text-sm text-muted-foreground">{tagline}</p>
            </div>

            <div className={`p-6 grid gap-4 ${previewMode === "mobile" ? "grid-cols-1" : `grid-cols-${Math.min(tiers.length, 3)}`}`}>
              {tiers.map(tier => (
                <Card key={tier.id} className={`p-4 relative ${tier.isMostPopular ? "border-secondary ring-1 ring-secondary/20" : ""}`}>
                  {tier.isMostPopular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-[10px]">
                      Most Popular
                    </Badge>
                  )}
                  <h3 className="font-heading font-bold mt-1">{tier.name}</h3>
                  <p className="text-2xl font-bold mt-2">${tier.monthlyPrice}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                  <p className="text-xs text-muted-foreground mt-2">{tier.description}</p>
                  <div className="mt-3 space-y-1.5">
                    {tier.benefits.filter(b => b.included).map(b => (
                      <div key={b.id} className="flex items-center gap-1.5 text-xs">
                        <Check className="h-3 w-3 text-secondary" />
                        <span>{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className={`w-full mt-4 text-xs ${tier.isMostPopular ? "bg-secondary text-secondary-foreground" : ""}`} variant={tier.isMostPopular ? "default" : "outline"}>
                    Join {tier.name}
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="member-experience">
          <Card className={`p-6 ${previewMode === "mobile" ? "max-w-sm mx-auto" : ""}`}>
            <h3 className="font-heading font-bold mb-4">Member Dashboard Preview</h3>
            <div className="space-y-3">
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-semibold">This Month's Content</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {calendar.filter(d => d.scheduledDate.startsWith("M1")).slice(0, 4).map(drop => (
                    <div key={drop.id} className="p-2 rounded-md bg-background border border-border">
                      <Badge className="text-[9px] mb-1" variant="outline">{drop.type.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}</Badge>
                      <p className="text-xs font-medium truncate">{drop.title}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-semibold">Community</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Discussion threads, Q&A, and member connections</p>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish button */}
      <div className="flex items-center gap-4">
        <Button
          className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 text-sm font-semibold"
          onClick={handlePublish}
          disabled={publishing || stepData.published}
        >
          {publishing ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing…</>
          ) : stepData.published ? (
            <><Check className="h-4 w-4 mr-2" /> Published!</>
          ) : (
            <><Rocket className="h-4 w-4 mr-2" /> Publish Membership</>
          )}
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={() => onMarkEdited("publish")}>
          Save as Draft
        </Button>
      </div>
    </div>
  );
}
