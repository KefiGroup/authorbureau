import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, BookOpen, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CoachingPackage {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  duration_minutes: number | null;
  sessions_count: number | null;
  status: string;
}

export default function CoachingCRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoachingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "1on1",
    price: "",
    duration: "60",
    sessions: "1",
  });

  const fetchPackages = useCallback(async () => {
    const { data } = await supabase
      .from("coaching_packages")
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    setPackages((data as CoachingPackage[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchPackages();
  }, [user, fetchPackages]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.price) {
      toast({ title: "Title and price required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("coaching_packages").insert({
      author_id: user!.id,
      title: form.title,
      description: form.description || null,
      type: form.type,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration) || 60,
      sessions_count: parseInt(form.sessions) || 1,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coaching package created!" });
      setForm({ title: "", description: "", type: "1on1", price: "", duration: "60", sessions: "1" });
      setShowForm(false);
      fetchPackages();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("coaching_packages").delete().eq("id", id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Package removed" });
  };

  const typeLabels: Record<string, string> = {
    "1on1": "1-on-1",
    group: "Group",
    vip: "VIP / Big Ticket",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Coaching Packages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create coaching offerings — 1-on-1, group, or VIP programs.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Package
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Create Coaching Package</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Package Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Mindful Mama Circle"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1on1">1-on-1 Coaching</SelectItem>
                  <SelectItem value="group">Group Coaching</SelectItem>
                  <SelectItem value="vip">VIP / Big Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's included in this coaching package?"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="997"
              />
            </div>
            <div className="space-y-2">
              <Label>Session Duration (min)</Label>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Sessions</Label>
              <Input
                type="number"
                value={form.sessions}
                onChange={(e) => setForm((p) => ({ ...p, sessions: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Package
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {packages.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No coaching packages yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Leverage your book expertise — offer 1-on-1, group coaching, or VIP programs.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Package
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-border bg-card p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading font-semibold">{pkg.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">
                    {typeLabels[pkg.type] || pkg.type}
                  </span>
                </div>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="font-medium">${Number(pkg.price).toLocaleString()}</span>
                  {pkg.sessions_count && <span className="text-muted-foreground">{pkg.sessions_count} sessions</span>}
                  {pkg.duration_minutes && <span className="text-muted-foreground">{pkg.duration_minutes} min each</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
