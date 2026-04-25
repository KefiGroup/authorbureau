import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

const NARRATION_STYLES = [
  { value: "conversational",   label: "Conversational — friendly, like a podcast" },
  { value: "authoritative",    label: "Authoritative — confident expert tone" },
  { value: "warm-storyteller", label: "Warm storyteller — fiction & memoir" },
  { value: "energetic",        label: "Energetic — motivational, high-energy" },
];

export default function AudiobookSetupStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle }: Props) {
  const setup = stepData.setup ?? {};

  // Prefill description from book if empty
  useEffect(() => {
    if (setup.description || !bookId) return;
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("description, author_name")
        .eq("id", bookId)
        .maybeSingle();
      if (data) {
        const next = {
          ...stepData,
          setup: {
            narration: setup.narration ?? "",
            narratorCredit: setup.narratorCredit || data.author_name || "",
            retailPriceUsd: setup.retailPriceUsd ?? 14.99,
            description: setup.description || data.description || "",
          },
        };
        setStepData(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const update = (patch: Record<string, any>) => {
    const next = { ...stepData, setup: { ...setup, ...patch } };
    setStepData(next);
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Set the production basics for <strong>{bookTitle || "your audiobook"}</strong>. You can change these later before publishing.
      </p>

      <div className="space-y-2">
        <Label>Narration style *</Label>
        <Select value={setup.narration || ""} onValueChange={(v) => update({ narration: v })}>
          <SelectTrigger><SelectValue placeholder="Choose a narration style" /></SelectTrigger>
          <SelectContent>
            {NARRATION_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Narrator credit</Label>
        <Input
          value={setup.narratorCredit || ""}
          onChange={(e) => update({ narratorCredit: e.target.value })}
          placeholder="e.g. Narrated by Jane Author (digital voice via ElevenLabs)"
        />
        <p className="text-xs text-muted-foreground">Shown on retail pages and inside the audiobook metadata.</p>
      </div>

      <div className="space-y-2">
        <Label>Suggested retail price (USD)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={setup.retailPriceUsd ?? 14.99}
          onChange={(e) => update({ retailPriceUsd: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <Label>Short description</Label>
        <Textarea
          rows={4}
          value={setup.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="A 2–4 sentence pitch used on Audible, Spotify and your storefront."
        />
      </div>
    </div>
  );
}
