import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface Props {
  authorId: string;
  authorName: string;
  onComplete: (bookTitle: string) => void;
}

/**
 * Inline quick form to capture minimal book context without leaving the builder.
 * Upserts into both `author_context` (full profile) and `books` (legacy fallback).
 */
export default function BookProfileQuickForm({ authorId, authorName, onComplete }: Props) {
  const [title, setTitle] = useState("");
  const [idealReader, setIdealReader] = useState("");
  const [transformation, setTransformation] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !idealReader.trim() || !transformation.trim()) {
      toast.error("Please fill in all 3 fields so ABBY can personalise everything.");
      return;
    }
    setSaving(true);
    try {
      // Get auth user_id from the author profile (books.author_id = auth user_id)
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("user_id")
        .eq("id", authorId)
        .single();
      const userId = profile?.user_id;
      if (!userId) throw new Error("Could not resolve user.");

      // Upsert author_context (one row per author — update if present, else insert)
      const { data: existingCtx } = await supabase
        .from("author_context")
        .select("id")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCtx?.id) {
        const { error: ctxUpdErr } = await supabase.from("author_context").update({
          book_title: title.trim(),
          core_thesis: transformation.trim(),
          target_audience_persona: { description: idealReader.trim() },
        }).eq("id", existingCtx.id);
        console.log("[BookProfileQuickForm] author_context update:", { ctxUpdErr });
        if (ctxUpdErr) throw ctxUpdErr;
      } else {
        const { error: ctxInsErr } = await supabase.from("author_context").insert({
          author_id: authorId,
          book_title: title.trim(),
          core_thesis: transformation.trim(),
          target_audience_persona: { description: idealReader.trim() },
        });
        console.log("[BookProfileQuickForm] author_context insert:", { ctxInsErr });
        if (ctxInsErr) throw ctxInsErr;
      }

      // Only insert a book if the author doesn't already have one with this title
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("author_id", userId)
        .ilike("title", title.trim())
        .maybeSingle();

      if (!existingBook) {
        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60) + "-" + Date.now().toString(36);
        const { error: bookErr } = await supabase.from("books").insert({
          author_id: userId,
          title: title.trim(),
          slug,
          description: transformation.trim(),
          author_name: authorName,
          approval_status: "pending",
        });
        // Ignore unique-violation (race / dup); other errors bubble up
        if (bookErr && !`${bookErr.message}`.toLowerCase().includes("duplicate")) throw bookErr;
      }

      toast.success("Got it — let's build!");
      onComplete(title.trim());
    } catch (e) {
      console.error("BookProfileQuickForm save error:", e);
      toast.error("ABBY couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hi {authorName}! Before I build, I just need 3 quick details about your book — takes 30 seconds.
      </p>

      <div className="space-y-2">
        <Label htmlFor="qf-title">Book title</Label>
        <Input
          id="qf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Confidence Code"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qf-reader">Who is your ideal reader?</Label>
        <Input
          id="qf-reader"
          value={idealReader}
          onChange={(e) => setIdealReader(e.target.value)}
          placeholder="e.g. Mid-career women feeling stuck"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qf-transformation">What transformation does it deliver?</Label>
        <Textarea
          id="qf-transformation"
          value={transformation}
          onChange={(e) => setTransformation(e.target.value)}
          placeholder="e.g. Helps readers reclaim their voice and lead with quiet authority"
          rows={3}
          disabled={saving}
        />
      </div>

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full sm:w-auto">
        <Sparkles className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save & continue"}
      </Button>
    </div>
  );
}
