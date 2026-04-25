import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { callMarketingHubState } from "@/lib/marketing-hub-state";

export interface SequenceStepDraft {
  id?: string;
  step_number: number;
  subject: string;
  trigger_delay_days: number;
  body_markdown: string;
  preview_text?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: {
    id: string;
    title: string;
    description: string | null;
    node_id: string | null;
  } | null;
  initialSteps: SequenceStepDraft[];
  onSaved: () => void;
}

export default function SequenceEditorDrawer({ open, onOpenChange, flow, initialSteps, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStepDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!flow) return;
    setTitle(flow.title || "");
    setDescription(flow.description || "");
    setSteps(
      (initialSteps || []).map((s, i) => ({
        id: s.id,
        step_number: s.step_number ?? i + 1,
        subject: s.subject ?? "",
        trigger_delay_days: s.trigger_delay_days ?? 0,
        body_markdown: s.body_markdown ?? "",
        preview_text: s.preview_text ?? "",
      })),
    );
  }, [flow, initialSteps]);

  const updateStep = (idx: number, patch: Partial<SequenceStepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_number: prev.length + 1,
        subject: "",
        trigger_delay_days: prev.length === 0 ? 0 : (prev[prev.length - 1].trigger_delay_days || 0) + 3,
        body_markdown: "",
        preview_text: "",
      },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!flow) return;
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await callMarketingHubState("update_sequence", {
        flow_id: flow.id,
        title: title.trim(),
        description: description.trim(),
        steps: steps.map((s, i) => ({
          step_number: i + 1,
          subject: s.subject,
          trigger_delay_days: Number(s.trigger_delay_days) || 0,
          body_markdown: s.body_markdown,
          preview_text: s.preview_text || null,
        })),
      });
      toast({ title: "Sequence saved" });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't save sequence", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit email sequence</SheetTitle>
          <SheetDescription>
            {flow?.node_id ? `${flow.node_id} • ` : ""}Edit the subject lines, delays and body of each email in this nurture flow.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="seq-title" className="text-xs">Sequence title</Label>
            <Input id="seq-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="seq-desc" className="text-xs">Description</Label>
            <Textarea id="seq-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Steps ({steps.length})</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addStep}>
                <Plus className="h-3 w-3 mr-1" /> Add step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((s, idx) => (
                <div key={s.id ?? idx} className="rounded-lg border border-border p-3 bg-card/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground">Step {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => move(idx, -1)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === steps.length - 1} onClick={() => move(idx, 1)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_100px] gap-2 mb-2">
                    <div>
                      <Label className="text-[10px]">Subject</Label>
                      <Input value={s.subject} onChange={(e) => updateStep(idx, { subject: e.target.value })} className="h-8 text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Delay (days)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.trigger_delay_days}
                        onChange={(e) => updateStep(idx, { trigger_delay_days: parseInt(e.target.value, 10) || 0 })}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <Label className="text-[10px]">Body</Label>
                  <Textarea
                    rows={5}
                    value={s.body_markdown}
                    onChange={(e) => updateStep(idx, { body_markdown: e.target.value })}
                    className="text-xs font-mono mt-1"
                    placeholder="Email body (markdown supported)…"
                  />
                </div>
              ))}

              {steps.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No steps yet. Click "Add step" to create the first email.
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-background border-t pt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save sequence
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
