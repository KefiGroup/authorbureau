import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/shared-backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Mic, Trash2 } from "lucide-react";

interface SpeakingTopic {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  fee: number | null;
  status: string;
}

export default function SpeakingProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", description: "", duration: "60", fee: "" });

  const fetchTopics = useCallback(async () => {
    const { data } = await supabase
      .from("speaking_topics")
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    setTopics((data as SpeakingTopic[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchTopics();
  }, [user, fetchTopics]);

  const handleCreate = async () => {
    if (!newTopic.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("speaking_topics").insert({
      author_id: user!.id,
      title: newTopic.title,
      description: newTopic.description || null,
      duration_minutes: parseInt(newTopic.duration) || 60,
      fee: newTopic.fee ? parseFloat(newTopic.fee) : null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Speaking topic added!" });
      setNewTopic({ title: "", description: "", duration: "60", fee: "" });
      setShowForm(false);
      fetchTopics();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("speaking_topics").delete().eq("id", id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Topic removed" });
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
          <h2 className="font-heading text-2xl font-bold">Speaking Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your speaking topics, fees, and availability for event organizers.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Topic
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">New Speaking Topic</h3>
          <div className="space-y-2">
            <Label>Topic Title</Label>
            <Input
              value={newTopic.title}
              onChange={(e) => setNewTopic((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. The Future of Value Investing"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newTopic.description}
              onChange={(e) => setNewTopic((p) => ({ ...p, description: e.target.value }))}
              placeholder="What does this talk cover?"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={newTopic.duration}
                onChange={(e) => setNewTopic((p) => ({ ...p, duration: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee (USD, optional)</Label>
              <Input
                type="number"
                value={newTopic.fee}
                onChange={(e) => setNewTopic((p) => ({ ...p, fee: e.target.value }))}
                placeholder="5000"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Topic
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {topics.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Mic className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No speaking topics yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your keynote topics, workshop formats, and speaking fees.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Topic
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div key={topic.id} className="rounded-xl border border-border bg-card p-5 flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold">{topic.title}</h3>
                {topic.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  {topic.duration_minutes && <span>{topic.duration_minutes} min</span>}
                  {topic.fee && <span className="font-medium text-foreground">${Number(topic.fee).toLocaleString()}</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(topic.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
