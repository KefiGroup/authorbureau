import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getPendingUpdate } from "@/lib/node-updates";
import { toast } from "sonner";

interface Props {
  nodeId: string;
  authorId: string;
  bookId: string | null;
  contentJson: any;
  onAcknowledged?: (nextContent: any) => void;
}

/** Shown inside a builder when the platform has a newer version of this module. */
export default function NodeUpdateBanner({ nodeId, authorId, bookId, contentJson, onAcknowledged }: Props) {
  const [saving, setSaving] = useState(false);
  const update = getPendingUpdate(nodeId, contentJson);
  if (!update) return null;

  const acknowledge = async () => {
    setSaving(true);
    try {
      let q = supabase.from("author_nodes").select("content_json").eq("author_id", authorId).eq("node_id", nodeId);
      q = bookId ? q.eq("book_id", bookId) : q.is("book_id", null);
      const { data } = await q.limit(1);
      const current = (data?.[0]?.content_json as any) ?? contentJson ?? {};
      const next = { ...current, _engineVersion: update.version };
      let u = supabase.from("author_nodes").update({ content_json: next }).eq("author_id", authorId).eq("node_id", nodeId);
      u = bookId ? u.eq("book_id", bookId) : u.is("book_id", null);
      const { error } = await u;
      if (error) throw error;
      onAcknowledged?.({ ...(contentJson ?? {}), _engineVersion: update.version });
      toast.success("Marked as updated");
    } catch {
      toast.error("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 border-primary/40 bg-primary/10">
      <div className="flex gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-sm">Update available: {update.title}</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {update.highlights.map((h) => <li key={h}>{h}</li>)}
          </ul>
          <p className="text-xs text-foreground">{update.action}</p>
          <Button size="sm" onClick={acknowledge} disabled={saving}>
            {saving ? "Saving..." : "Got it, I've refreshed"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
