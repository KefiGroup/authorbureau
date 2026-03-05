import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AuthorFramework {
  id: string;
  name: string;
  description: string;
  key_principles: string[];
}

interface FrameworksEditorProps {
  frameworks: AuthorFramework[];
  onChange: (frameworks: AuthorFramework[]) => void;
  /** If true, show a compact inline version (for modals) */
  compact?: boolean;
  /** If true, auto-save to profile on change */
  autoSave?: boolean;
}

export default function FrameworksEditor({ frameworks, onChange, compact = false, autoSave = false }: FrameworksEditorProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const addFramework = () => {
    const newFw: AuthorFramework = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      key_principles: [""],
    };
    onChange([...frameworks, newFw]);
  };

  const updateFramework = (index: number, field: keyof AuthorFramework, value: any) => {
    const updated = [...frameworks];
    (updated[index] as any)[field] = value;
    onChange(updated);
  };

  const removeFramework = (index: number) => {
    onChange(frameworks.filter((_, i) => i !== index));
  };

  const addPrinciple = (fwIndex: number) => {
    const updated = [...frameworks];
    updated[fwIndex].key_principles.push("");
    onChange(updated);
  };

  const updatePrinciple = (fwIndex: number, pIndex: number, value: string) => {
    const updated = [...frameworks];
    updated[fwIndex].key_principles[pIndex] = value;
    onChange(updated);
  };

  const removePrinciple = (fwIndex: number, pIndex: number) => {
    const updated = [...frameworks];
    updated[fwIndex].key_principles = updated[fwIndex].key_principles.filter((_, i) => i !== pIndex);
    onChange(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("author_profiles" as any)
      .update({ frameworks } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save frameworks");
    } else {
      toast.success("Frameworks saved!");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="font-heading text-lg font-semibold">My Unique Frameworks & Theories</h3>
              <p className="text-xs text-muted-foreground">
                Define your proprietary theories, methodologies, or frameworks. Abby will incorporate these into every product she generates for you.
              </p>
            </div>
          </div>
          {!autoSave && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          )}
        </div>
      )}

      {frameworks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No frameworks defined yet. Add your unique theories so Abby can use them in all your products.
            </p>
            <Button variant="outline" size="sm" onClick={addFramework}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Framework
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {frameworks.map((fw, fwIndex) => (
            <Card key={fw.id} className="border-border">
              <CardContent className={compact ? "p-4 space-y-3" : "p-5 space-y-4"}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Framework / Theory Name</label>
                      <Input
                        placeholder="e.g., SUCKcess Theory, The 5P Method"
                        value={fw.name}
                        onChange={(e) => updateFramework(fwIndex, "name", e.target.value)}
                        className="font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                      <Textarea
                        placeholder="Describe what this framework is about, its origin, and how it applies to your book's content…"
                        value={fw.description}
                        onChange={(e) => updateFramework(fwIndex, "description", e.target.value)}
                        rows={compact ? 2 : 3}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Key Principles / Steps</label>
                      <div className="space-y-2">
                        {fw.key_principles.map((p, pIndex) => (
                          <div key={pIndex} className="flex gap-2">
                            <span className="text-xs text-muted-foreground mt-2.5 w-4 shrink-0">{pIndex + 1}.</span>
                            <Input
                              placeholder={`Principle ${pIndex + 1}`}
                              value={p}
                              onChange={(e) => updatePrinciple(fwIndex, pIndex, e.target.value)}
                              className="text-sm"
                            />
                            {fw.key_principles.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removePrinciple(fwIndex, pIndex)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => addPrinciple(fwIndex)}>
                          <Plus className="h-3 w-3 mr-1" /> Add principle
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFramework(fwIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={addFramework}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Framework
      </Button>
    </div>
  );
}
