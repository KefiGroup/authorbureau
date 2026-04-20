import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareQuote, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  avatar_url: string | null;
  sort_order: number;
}

export default function TestimonialsManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("author_testimonials")
      .select("*")
      .eq("author_id", user!.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Could not load testimonials", description: error.message, variant: "destructive" });
    }
    setItems((data || []) as Testimonial[]);
    setLoading(false);
  }

  async function addNew() {
    if (!user) return;
    const newItem = {
      author_id: user.id,
      name: "",
      role: "",
      quote: "",
      avatar_url: null,
      sort_order: items.length,
    };
    const { data, error } = await supabase
      .from("author_testimonials")
      .insert(newItem)
      .select()
      .single();
    if (error) {
      toast({ title: "Could not add testimonial", description: error.message, variant: "destructive" });
      return;
    }
    setItems([...items, data as Testimonial]);
  }

  async function updateField(id: string, field: keyof Testimonial, value: string) {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  async function saveItem(item: Testimonial) {
    if (!item.name.trim() || !item.quote.trim()) {
      toast({ title: "Name and quote required", variant: "destructive" });
      return;
    }
    setSavingId(item.id);
    const { error } = await supabase
      .from("author_testimonials")
      .update({
        name: item.name.trim(),
        role: item.role?.trim() || null,
        quote: item.quote.trim(),
        avatar_url: item.avatar_url?.trim() || null,
      })
      .eq("id", item.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Testimonial saved" });
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("author_testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setItems(items.filter(i => i.id !== id));
    toast({ title: "Testimonial removed" });
  }

  return (
    <Card className="p-4 border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-secondary" />
          <h3 className="font-heading font-bold text-sm">Reader Testimonials</h3>
          <span className="text-[10px] text-muted-foreground">({items.length})</span>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={addNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Show 3-6 quotes from readers, students, or clients on your public author page.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No testimonials yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  className="h-8 text-xs"
                  placeholder="Reader name"
                  value={item.name}
                  onChange={(e) => updateField(item.id, "name", e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="Role / title (optional)"
                  value={item.role || ""}
                  onChange={(e) => updateField(item.id, "role", e.target.value)}
                />
              </div>
              <Textarea
                className="text-xs min-h-[70px]"
                placeholder="What they said about you or your book..."
                value={item.quote}
                onChange={(e) => updateField(item.id, "quote", e.target.value)}
                maxLength={500}
              />
              <Input
                className="h-8 text-xs"
                placeholder="Avatar URL (optional)"
                value={item.avatar_url || ""}
                onChange={(e) => updateField(item.id, "avatar_url", e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => saveItem(item)}
                  disabled={savingId === item.id}
                >
                  {savingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
