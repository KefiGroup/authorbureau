import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Mail, ListChecks, ShieldAlert, Loader2, Wand2, Check } from "lucide-react";
import type { MembershipStepProps, MembershipTier } from "./types";

export default function SalesOnboardingStep({ stepData, setStepData, onMarkEdited, bookTitle }: MembershipStepProps) {
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("sales-page");

  const tiers: MembershipTier[] = stepData.tiers || [];
  const sales = stepData.salesOnboarding || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, salesOnboarding: { ...prev.salesOnboarding, [field]: value } }));
    onMarkEdited("sales-onboarding");
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const membershipName = stepData.setup?.name || "The Inner Circle";
      update("salesPageCopy", `# Join ${membershipName}\n\nGet exclusive access to monthly insights, live Q&A sessions, and a thriving community of readers who are putting **${bookTitle}** into practice.\n\n## Why Join?\n\n✅ **Monthly deep-dives** into key concepts from the book\n✅ **Live Q&A sessions** where you get personal answers\n✅ **Community** of like-minded readers on the same journey\n✅ **Exclusive resources** not available anywhere else\n\n## Choose Your Level\n\n${tiers.map(t => `### ${t.name} — $${t.monthlyPrice}/mo\n${t.description}`).join("\n\n")}\n\n---\n\n*Join today and start your transformation.*`);
      
      update("welcomeEmails", tiers.map(t => ({
        tierId: t.id,
        tierName: t.name,
        emails: [
          { subject: `Welcome to ${t.name}! Here's what's next`, body: `Hi {{name}},\n\nWelcome to ${t.name}! You've made a great decision.\n\nHere's what to expect this month:\n- Your first content drop arrives this Friday\n- Join the community discussion thread\n- Check the content calendar for upcoming live sessions\n\nLet's get started! 🚀` },
          { subject: `Your ${t.name} member guide`, body: `Hi {{name}},\n\nHere's your complete guide to getting the most from your ${t.name} membership:\n\n1. **Bookmark the member portal** — all content lives here\n2. **Set your notification preferences** — never miss a live session\n3. **Introduce yourself** in the community thread\n\nThis week's focus: Chapter 1 deep-dive.` },
          { subject: `Quick tip to maximize your ${t.name} membership`, body: `Hi {{name}},\n\nMembers who engage in the first 7 days are 4x more likely to stay.\n\nHere are 3 things to do today:\n\n🎯 Read this week's exclusive content\n💬 Post a comment in the community\n📅 Add the next live session to your calendar\n\nSee you inside!` },
        ],
      })));

      update("onboardingChecklist", [
        "Welcome email received",
        "Access member portal",
        "Join the community space",
        "Set notification preferences",
        "Read first content drop",
        "Attend (or watch replay of) first live session",
        "Post introduction in community",
      ]);

      update("cancellationEmail", {
        subject: `We're sorry to see you go, {{name}}`,
        body: `Hi {{name}},\n\nWe noticed you're thinking about canceling your ${membershipName} membership.\n\nBefore you go, here's what you'll miss:\n\n📚 Next month's exclusive content (already in production)\n🎙️ Upcoming live Q&A session\n💬 The community discussions\n\n**Special offer:** Stay for 1 more month at 50% off to experience next month's content.\n\nIf there's something we can improve, reply to this email — I read every response.\n\nWarm regards,\nThe ${membershipName} Team`,
      });

      setGenerating(false);
    }, 3000);
  };

  const hasContent = sales.salesPageCopy || sales.welcomeEmails;

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Conversion Tips</p>
            <p className="text-sm text-muted-foreground">
              A strong sales page + onboarding flow reduces churn by 40%. I'll generate 
              your sales copy, welcome sequences, and a cancellation-prevention email.
            </p>
          </div>
        </div>
      </Card>

      {!hasContent && (
        <Card className="p-8 text-center border-dashed border-2">
          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold mb-2">Generate Sales & Onboarding Materials</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create your membership sales page, welcome email sequences for each tier, 
            onboarding checklist, and cancellation prevention email.
          </p>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating…" : "Generate All Materials"}
          </Button>
        </Card>
      )}

      {hasContent && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="sales-page" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Sales Page
            </TabsTrigger>
            <TabsTrigger value="welcome-emails" className="text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Welcome Emails
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="text-xs gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Onboarding
            </TabsTrigger>
            <TabsTrigger value="cancellation" className="text-xs gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Cancellation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales-page" className="mt-4">
            <Textarea
              value={sales.salesPageCopy || ""}
              onChange={(e) => update("salesPageCopy", e.target.value)}
              className="min-h-[400px] text-sm font-mono"
              placeholder="Sales page copy in Markdown…"
            />
          </TabsContent>

          <TabsContent value="welcome-emails" className="mt-4 space-y-4">
            {(sales.welcomeEmails || []).map((tierEmails: any) => (
              <Card key={tierEmails.tierId} className="p-4">
                <h4 className="font-heading font-semibold text-sm mb-3">{tierEmails.tierName} Welcome Sequence</h4>
                <div className="space-y-3">
                  {tierEmails.emails.map((email: any, i: number) => (
                    <div key={i} className="border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">Email {i + 1}</Badge>
                        <span className="text-xs font-medium">{email.subject}</span>
                      </div>
                      <Textarea
                        value={email.body}
                        onChange={(e) => {
                          const updated = [...(sales.welcomeEmails || [])];
                          const tierIdx = updated.findIndex((t: any) => t.tierId === tierEmails.tierId);
                          if (tierIdx >= 0) {
                            updated[tierIdx].emails[i].body = e.target.value;
                            update("welcomeEmails", updated);
                          }
                        }}
                        className="text-xs min-h-[100px]"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="onboarding" className="mt-4">
            <Card className="p-4">
              <h4 className="font-heading font-semibold text-sm mb-3">New Member Onboarding Checklist</h4>
              <div className="space-y-2">
                {(sales.onboardingChecklist || []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-muted/30">
                    <div className="h-5 w-5 rounded-full border-2 border-secondary/30 flex items-center justify-center">
                      <Check className="h-3 w-3 text-secondary/40" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cancellation" className="mt-4">
            <Card className="p-4">
              <h4 className="font-heading font-semibold text-sm mb-3">Cancellation Prevention Email</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Triggered automatically when a member initiates cancellation.
              </p>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium">Subject: </span>
                  <span className="text-xs text-muted-foreground">{sales.cancellationEmail?.subject || ""}</span>
                </div>
                <Textarea
                  value={sales.cancellationEmail?.body || ""}
                  onChange={(e) => update("cancellationEmail", { ...sales.cancellationEmail, body: e.target.value })}
                  className="text-xs min-h-[200px]"
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
