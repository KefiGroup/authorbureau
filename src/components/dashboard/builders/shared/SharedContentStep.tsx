import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Wand2, FileText } from "lucide-react";
import StepInstructions from "./StepInstructions";
import { useToast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contentKey: string;
  title: string;
  description: string;
  abbyTip: string;
  aiPrompt: string; // Use {bookTitle} and {config} as placeholders
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  bookId: string;
  bookTitle: string;
  configKey?: string; // key in stepData to read config from
}

export default function SharedContentStep({
  contentKey, title, description, abbyTip, aiPrompt,
  stepData, setStepData, onMarkEdited, stepId, bookId, bookTitle, configKey,
}: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const content: string = stepData[contentKey] || "";
  const config = configKey ? stepData[configKey] || {} : {};

  const generate = async () => {
    setGenerating(true);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const prompt = aiPrompt
        .replace(/\{bookTitle\}/g, bookTitle)
        .replace(/\{config\}/g, JSON.stringify(config, null, 2));

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
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

      setStepData(prev => ({ ...prev, [contentKey]: fullText }));
      onMarkEdited(stepId);
      toast({ title: `${title} generated!` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Recommendation</p>
            <p className="text-sm text-muted-foreground">{abbyTip}</p>
          </div>
        </div>
      </Card>

      {!content ? (
        <Card className="p-8 text-center border-dashed border-2">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
          <Button onClick={generate} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : "Generate with AI"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
              </Badge>
              <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Regenerate
              </Button>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={e => {
              onMarkEdited(stepId);
              setStepData(prev => ({ ...prev, [contentKey]: e.target.value }));
            }}
            rows={20}
            className="text-sm font-mono"
          />
        </div>
      )}
    </div>
  );
}
