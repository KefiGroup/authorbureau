import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Calendar, FileText, Mail, Wand2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CoachingConfig } from "./types";
import { STRUCTURE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

type TabId = "booking" | "discovery" | "sales" | "application" | "followup";

export default function BookingSalesStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("booking");

  const config: CoachingConfig = stepData.coachingConfig || {};
  const booking = stepData.bookingConfig || {};

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "booking", label: "Booking Page", icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "discovery", label: "Discovery Call", icon: <Clock className="h-3.5 w-3.5" /> },
    { id: "sales", label: "Sales Page", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "application", label: "Application Form", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "followup", label: "Follow-up Emails", icon: <Mail className="h-3.5 w-3.5" /> },
  ];

  const generateAll = async () => {
    setGenerating(true);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const structureLabel = STRUCTURE_LABELS[config.structure || "12-week"]?.label || "coaching program";

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate booking & sales materials for a coaching program:
Book: "${bookTitle}"
Package: ${structureLabel} at $${config.price || 2497}
Focus: ${config.focusArea || "personal transformation"}

Generate JSON with these keys:
- discoveryCallScript: markdown script for a free 15-minute discovery call
- salesPageCopy: markdown sales page with headline, benefits, testimonials section, pricing, FAQ, and CTA
- applicationForm: markdown application form with qualifying questions
- followUpSequence: markdown 3-email follow-up sequence for inquiries
- availableSlots: array of 5 sample time slots like "Tuesdays 10:00 AM", "Thursdays 2:00 PM"

Return ONLY valid JSON.`,
          }],
          bookId,
          isPremium: true,
        }),
      });

      if (!resp.ok) throw new Error("Generation failed");

      const text = await resp.text();
      let fullText = "";
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          fullText += parsed.choices?.[0]?.delta?.content || "";
        } catch {}
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setStepData(prev => ({ ...prev, bookingConfig: parsed }));
        toast({ title: "Booking & sales materials generated!" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  const updateBooking = (key: string, value: any) => {
    onMarkEdited("sales-page");
    setStepData(prev => ({ ...prev, bookingConfig: { ...(prev.bookingConfig || {}), [key]: value } }));
  };

  const hasContent = booking.discoveryCallScript || booking.salesPageCopy;

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Recommendation</p>
            <p className="text-sm text-muted-foreground">
              A free 15-minute discovery call qualifies leads and builds trust. High-ticket packages ($1,000+) should require an application form to filter serious clients.
            </p>
          </div>
        </div>
      </Card>

      {!hasContent ? (
        <Card className="p-8 text-center border-dashed border-2">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Booking & Sales Materials</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create a discovery call script, sales page, application form, and follow-up email sequence.
          </p>
          <Button onClick={generateAll} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : "Generate All Materials"}
          </Button>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-secondary text-secondary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <Card className="p-4">
            {activeTab === "booking" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Available Time Slots</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(booking.availableSlots || ["Tuesdays 10:00 AM", "Thursdays 2:00 PM"]).map((slot: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <Calendar className="h-4 w-4 text-violet-500" />
                      <Input
                        value={slot}
                        onChange={e => {
                          const slots = [...(booking.availableSlots || [])];
                          slots[i] = e.target.value;
                          updateBooking("availableSlots", slots);
                        }}
                        className="text-sm border-0 bg-transparent p-0 h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "discovery" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Discovery Call Script (15 min)</h3>
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                  </Badge>
                </div>
                <Textarea
                  value={booking.discoveryCallScript || ""}
                  onChange={e => updateBooking("discoveryCallScript", e.target.value)}
                  rows={16}
                  className="text-sm font-mono"
                />
              </div>
            )}

            {activeTab === "sales" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Sales Page Copy</h3>
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                  </Badge>
                </div>
                <Textarea
                  value={booking.salesPageCopy || ""}
                  onChange={e => updateBooking("salesPageCopy", e.target.value)}
                  rows={20}
                  className="text-sm font-mono"
                />
              </div>
            )}

            {activeTab === "application" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Application Form</h3>
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                  </Badge>
                </div>
                <Textarea
                  value={booking.applicationForm || ""}
                  onChange={e => updateBooking("applicationForm", e.target.value)}
                  rows={14}
                  className="text-sm font-mono"
                />
              </div>
            )}

            {activeTab === "followup" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Follow-up Email Sequence</h3>
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                  </Badge>
                </div>
                <Textarea
                  value={booking.followUpSequence || ""}
                  onChange={e => updateBooking("followUpSequence", e.target.value)}
                  rows={16}
                  className="text-sm font-mono"
                />
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={generateAll} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Regenerate All
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
