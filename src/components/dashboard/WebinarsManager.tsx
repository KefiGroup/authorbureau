import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { Video, Loader2, Edit3, Eye, Save, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import BookBuilderContextBar from "./BookBuilderContextBar";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  script_markdown: string;
  status: string;
  price: number;
  is_free: boolean;
  duration_minutes: number;
  scheduled_at: string | null;
  book_id: string;
  created_at: string;
}

export default function WebinarsManager({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const bookFilterId = searchParams.get("bookId");
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchWebinars = async () => {
    setLoading(true);
    let query = supabase
      .from("webinars" as any)
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    if (bookFilterId) {
      query = query.eq("book_id", bookFilterId);
    }
    const { data, error } = await query;
    if (!error && data) setWebinars(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchWebinars();
  }, [user, bookFilterId]);

  const selected = webinars.find(w => w.id === selectedId);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("webinars" as any)
      .update({ title: editTitle, description: editDescription, price: parseFloat(editPrice) || 0, is_free: (parseFloat(editPrice) || 0) === 0 } as any)
      .eq("id", selected.id);
    if (error) toast.error("Failed to save");
    else { toast.success("Webinar updated"); setEditing(false); fetchWebinars(); }
    setSaving(false);
  };

  const handlePublish = async (id: string) => {
    const { error } = await supabase.from("webinars" as any).update({ status: "published" } as any).eq("id", id);
    if (error) toast.error("Failed to publish");
    else { toast.success("Webinar published!"); fetchWebinars(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading webinars…</div>;
  }

  if (webinars.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <BookBuilderContextBar backTab="automate" />
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-6">
          <Video className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Webinars</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
          AI-generated webinar scripts and slide decks appear here after running "Build My Author Business." Includes registration pages and follow-up sequences.
        </p>
        <Button variant="secondary" onClick={() => onNavigate?.("build-business")}>Generate from AI Engine → Build My Business</Button>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); setEditing(false); }}>← Back to Webinars</Button>
          <div className="flex gap-2">
            {!editing && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditTitle(selected.title); setEditDescription(selected.description || ""); setEditPrice(String(selected.price || 0)); setEditing(true); }}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                {selected.status === "draft" && (
                  <Button size="sm" onClick={() => handlePublish(selected.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Publish
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {editing ? (
          <Card><CardContent className="p-6 space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} /></div>
            <div><label className="text-sm font-medium mb-1 block">Price (USD, 0 = free)</label><Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />} Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1.5" /> Cancel</Button>
            </div>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-lg">{selected.title}</h3>
                {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{selected.duration_minutes} min • {selected.is_free ? "Free" : `$${selected.price}`}</p>
              </div>
              <Badge variant={selected.status === "published" ? "default" : "secondary"}>{selected.status}</Badge>
            </div>
            <div className="px-6 py-6">
              {selected.script_markdown ? <MarkdownRenderer content={selected.script_markdown} /> : <p className="text-muted-foreground text-sm">No script generated yet. Run "Build My Business" → Digital Products to generate webinar content.</p>}
            </div>
          </CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <BookBuilderContextBar backTab="automate" />
      <div><h2 className="font-heading text-2xl font-bold">Webinars</h2><p className="text-sm text-muted-foreground mt-1">{webinars.length} webinar{webinars.length !== 1 ? "s" : ""}</p></div>
      <div className="grid gap-4">
        {webinars.map(w => (
          <Card key={w.id} className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all" onClick={() => setSelectedId(w.id)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><Video className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <h3 className="font-medium text-sm">{w.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{w.duration_minutes} min • {w.is_free ? "Free" : `$${w.price}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={w.status === "published" ? "default" : "secondary"} className="text-xs">{w.status}</Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
