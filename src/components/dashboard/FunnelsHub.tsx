import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Filter, ExternalLink, Copy, Edit, Eye, Power, Sparkles, Loader2 } from "lucide-react";
import { NODE_NAMES } from "@/lib/node-slug-map";

interface Funnel {
  id: string;
  node_id: string | null;
  funnel_type: string;
  title: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  body_copy: string | null;
  cta_text: string;
  cta_url: string | null;
  background_color: string;
  accent_color: string;
  status: string;
  page_views: number;
  conversions: number;
}

const COLOR_PRESETS = [
  { bg: "#0B1220", accent: "#D4AF37", name: "Navy + Gold" },
  { bg: "#0F172A", accent: "#38BDF8", name: "Slate + Sky" },
  { bg: "#1E1B4B", accent: "#A78BFA", name: "Indigo + Violet" },
  { bg: "#7F1D1D", accent: "#FCD34D", name: "Crimson + Amber" },
  { bg: "#064E3B", accent: "#34D399", name: "Emerald" },
  { bg: "#111827", accent: "#F472B6", name: "Charcoal + Pink" },
];

interface LiveNode {
  node_id: string;
  microsite_url: string | null;
  status: string;
}

const FUNNEL_ELIGIBLE_NODES = ["BP-02", "BP-04", "BP-05", "BP-09"];
const NODE_TO_FUNNEL_TYPE: Record<string, string> = {
  "BP-02": "lead_magnet",
  "BP-04": "opt_in",
  "BP-05": "webinar_registration",
  "BP-09": "sales",
};

export default function FunnelsHub() {
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorSlug, setAuthorSlug] = useState<string | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Funnel | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState<Funnel | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([]);
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, author_slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) { setLoading(false); return; }
      setAuthorId(profile.id);
      setAuthorSlug(profile.author_slug);
      await Promise.all([loadFunnels(profile.id), loadLiveNodes(profile.id)]);
      setLoading(false);
    })();
  }, []);

  const loadFunnels = async (aid: string) => {
    const { data } = await supabase
      .from("funnels")
      .select("*")
      .eq("author_id", aid)
      .order("created_at", { ascending: false });
    setFunnels((data as Funnel[]) || []);
  };

  const loadLiveNodes = async (aid: string) => {
    const { data } = await supabase
      .from("author_nodes")
      .select("node_id, microsite_url, status")
      .eq("author_id", aid)
      .in("node_id", FUNNEL_ELIGIBLE_NODES)
      .eq("status", "live");
    setLiveNodes((data as LiveNode[]) || []);
  };

  const liveUrl = (slug: string) =>
    authorSlug ? `${window.location.origin}/${authorSlug}/${slug}` : "";

  const generateForNode = async (nodeId: string) => {
    if (!authorId) return;
    setGeneratingNodeId(nodeId);
    const { error } = await supabase.functions.invoke("generate-funnel", {
      body: {
        author_id: authorId,
        node_id: nodeId,
        funnel_type: NODE_TO_FUNNEL_TYPE[nodeId] || "opt_in",
      },
    });
    setGeneratingNodeId(null);
    if (error) {
      toast({ title: "ABBY couldn't build that funnel", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    toast({ title: "Funnel generated!" });
    await loadFunnels(authorId);
  };

  const toggleStatus = async (f: Funnel) => {
    const newStatus = f.status === "live" ? "paused" : "live";
    const { error } = await supabase
      .from("funnels")
      .update({ status: newStatus, published_at: newStatus === "live" ? new Date().toISOString() : null })
      .eq("id", f.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: newStatus === "live" ? "Funnel is live" : "Funnel paused" });
    if (authorId) loadFunnels(authorId);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(liveUrl(slug));
    toast({ title: "Link copied" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("funnels")
      .update({
        headline: editing.headline,
        subheadline: editing.subheadline,
        body_copy: editing.body_copy,
        cta_text: editing.cta_text,
        cta_url: editing.cta_url,
        background_color: editing.background_color,
        accent_color: editing.accent_color,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Funnel updated" });
    setEditing(null);
    if (authorId) loadFunnels(authorId);
  };

  const regenerate = async () => {
    if (!regenerateTarget) return;
    setRegenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-funnel", {
      body: {
        node_id: regenerateTarget.node_id,
        funnel_type: regenerateTarget.funnel_type,
        force: true,
        funnel_id: regenerateTarget.id,
      },
    });
    setRegenerating(false);
    setRegenerateTarget(null);
    if (error) { toast({ title: "Regeneration failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ABBY regenerated your funnel" });
    if (authorId) loadFunnels(authorId);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Filter className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">My Funnels</h1>
        </div>
        <p className="text-muted-foreground">
          ABBY auto-generates conversion funnels for your published products. Edit copy, preview live pages, and watch conversions roll in.
        </p>
      </div>

      {liveNodes.length > 0 && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">ABBY noticed something</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You already have {liveNodes.length === 1 ? "a live product" : `${liveNodes.length} live products`}. Want me to build a high-converting opt-in funnel for {liveNodes.length === 1 ? "it" : "each"}? Takes about 30 seconds.
                </p>
                <div className="flex flex-wrap gap-2">
                  {liveNodes.map((n) => {
                    const hasFunnel = funnels.some((f) => f.node_id === n.node_id);
                    if (hasFunnel) return null;
                    const isGen = generatingNodeId === n.node_id;
                    return (
                      <Button
                        key={n.node_id}
                        size="sm"
                        onClick={() => generateForNode(n.node_id)}
                        disabled={!!generatingNodeId}
                      >
                        {isGen ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Generate funnel for {NODE_NAMES[n.node_id] || n.node_id}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {funnels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-60" />
            <h3 className="text-xl font-semibold mb-2">No funnels yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {liveNodes.length > 0
                ? "Click a button above to let ABBY build your first funnel."
                : "Publish a Lead Magnet, Webinar, Author Website, or Book Sales page and ABBY will generate a high-converting funnel for it automatically."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {funnels.map((f) => {
            const rate = f.page_views > 0 ? ((f.conversions / f.page_views) * 100).toFixed(1) : "0.0";
            return (
              <Card key={f.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: f.accent_color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{f.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {f.node_id && <Badge variant="secondary" className="text-xs">{NODE_NAMES[f.node_id] || f.node_id}</Badge>}
                        <Badge variant="outline" className="text-xs">{f.funnel_type}</Badge>
                        <Badge
                          variant={f.status === "live" ? "default" : "secondary"}
                          className={f.status === "live" ? "bg-green-600 text-xs" : "text-xs"}
                        >
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-lg font-bold">{f.page_views}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Views</div>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-lg font-bold">{f.conversions}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Opt-ins</div>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-lg font-bold">{rate}%</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Rate</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(liveUrl(f.slug), "_blank")}>
                      <Eye className="h-3.5 w-3.5 mr-1" />Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...f })}>
                      <Edit className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(f)}>
                      <Power className="h-3.5 w-3.5 mr-1" />{f.status === "live" ? "Pause" : "Go Live"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(f.slug)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inline editor */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-background z-10 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Edit Funnel</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Headline</Label>
                <Input value={editing.headline} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} />
              </div>
              <div>
                <Label>Subheadline</Label>
                <Input value={editing.subheadline || ""} onChange={(e) => setEditing({ ...editing, subheadline: e.target.value })} />
              </div>
              <div>
                <Label>Body copy</Label>
                <Textarea rows={6} value={editing.body_copy || ""} onChange={(e) => setEditing({ ...editing, body_copy: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CTA text</Label>
                  <Input value={editing.cta_text} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} />
                </div>
                <div>
                  <Label>CTA URL (optional)</Label>
                  <Input value={editing.cta_url || ""} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} placeholder="Redirect after opt-in" />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Color theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((p) => {
                    const selected = editing.background_color === p.bg && editing.accent_color === p.accent;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setEditing({ ...editing, background_color: p.bg, accent_color: p.accent })}
                        className={`rounded-lg p-3 border-2 text-left transition ${selected ? "border-primary" : "border-transparent"}`}
                        style={{ backgroundColor: p.bg, color: "#fff" }}
                      >
                        <div className="h-4 w-4 rounded-full mb-1" style={{ backgroundColor: p.accent }} />
                        <div className="text-xs font-medium">{p.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 border-t sticky bottom-0 bg-background flex justify-between gap-2">
              <Button variant="outline" onClick={() => setRegenerateTarget(editing)}>
                <Sparkles className="h-4 w-4 mr-2" />Regenerate with ABBY
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!regenerateTarget} onOpenChange={(o) => !o && setRegenerateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate this funnel?</AlertDialogTitle>
            <AlertDialogDescription>
              ABBY will replace the headline, subheadline, body and CTA with fresh AI-generated copy. Your colors and stats stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={regenerate} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
