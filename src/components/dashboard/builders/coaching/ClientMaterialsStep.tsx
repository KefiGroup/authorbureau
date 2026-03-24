import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, FileText, ClipboardList, Award, Shield, BarChart3, BookOpen, Check, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ClientMaterial } from "./types";
import { CLIENT_MATERIAL_TYPES } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

const ICONS: Record<string, React.ReactNode> = {
  intake_form: <ClipboardList className="h-4 w-4" />,
  welcome_packet: <BookOpen className="h-4 w-4" />,
  session_notes: <FileText className="h-4 w-4" />,
  progress_tracker: <BarChart3 className="h-4 w-4" />,
  agreement: <Shield className="h-4 w-4" />,
  certificate: <Award className="h-4 w-4" />,
};

export default function ClientMaterialsStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("intake_form");

  const materials: Record<string, ClientMaterial> = stepData.clientMaterials || {};

  const generateMaterial = async (type: string) => {
    setGeneratingType(type);
    try {
      const meta = CLIENT_MATERIAL_TYPES.find(m => m.type === type)!;
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate a professional "${meta.label}" document for a coaching program based on the book "${bookTitle}".
Description: ${meta.description}.
Coaching focus: ${stepData.coachingConfig?.focusArea || "personal transformation"}.

Format as clean markdown. Make it comprehensive but practical. Include appropriate sections, fields, and instructions.
For forms, use markdown checkbox and input formatting.
Return ONLY the markdown content.`,
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
        } catch (error) {
      console.error(error);
    }
      }

      const material: ClientMaterial = {
        id: type,
        type: type as ClientMaterial["type"],
        label: meta.label,
        contentMarkdown: fullText,
        generated: true,
      };

      setStepData(prev => ({
        ...prev,
        clientMaterials: { ...(prev.clientMaterials || {}), [type]: material },
      }));
      setSelectedMaterial(type);
      toast({ title: `${meta.label} generated!` });
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setGeneratingType(null);
  };

  const generateAll = async () => {
    for (const { type } of CLIENT_MATERIAL_TYPES) {
      if (!materials[type]) {
        await generateMaterial(type);
      }
    }
  };

  const currentMaterial = materials[selectedMaterial];

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
              Professional client materials set the tone for your coaching relationship. I'll generate all 6 documents customized to your book's methodology.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Client Materials ({Object.keys(materials).length}/{CLIENT_MATERIAL_TYPES.length})</p>
        <Button variant="outline" size="sm" onClick={generateAll} disabled={generatingType !== null}>
          <Wand2 className="h-3 w-3 mr-1" /> Generate All
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Material list */}
        <div className="space-y-2">
          {CLIENT_MATERIAL_TYPES.map(({ type, label, description }) => {
            const exists = !!materials[type];
            const isSelected = selectedMaterial === type;
            return (
              <button
                key={type}
                onClick={() => exists ? setSelectedMaterial(type) : generateMaterial(type)}
                disabled={generatingType === type}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  isSelected ? "bg-secondary/10 border border-secondary/30" : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${exists ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                  {generatingType === type ? <Loader2 className="h-4 w-4 animate-spin" /> : exists ? <Check className="h-4 w-4" /> : ICONS[type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{exists ? "Generated" : "Click to generate"}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content editor */}
        <Card className="p-4">
          {currentMaterial ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ICONS[currentMaterial.type]}
                  <h3 className="text-sm font-semibold">{currentMaterial.label}</h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                  <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                </Badge>
              </div>
              <Textarea
                value={currentMaterial.contentMarkdown}
                onChange={e => {
                  onMarkEdited("curriculum");
                  setStepData(prev => ({
                    ...prev,
                    clientMaterials: {
                      ...(prev.clientMaterials || {}),
                      [selectedMaterial]: { ...currentMaterial, contentMarkdown: e.target.value },
                    },
                  }));
                }}
                rows={18}
                className="text-sm font-mono"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a material to view or generate it</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
