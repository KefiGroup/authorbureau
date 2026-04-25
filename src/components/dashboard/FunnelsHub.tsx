import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, ExternalLink, Copy, Edit, Eye, Power, Sparkles, Loader2, Users, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NODE_NAMES } from "@/lib/node-slug-map";

type ArchetypeKey = "A" | "B" | "C" | "D";
type FilterKey = "all" | ArchetypeKey | "live" | "paused";

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
  archetype: "A" | "B" | "C" | "D" | null;
}

// Archetype-derived defaults. The edge function also resolves the archetype
// from author_nodes server-side, so this is just the seed funnel_type string.
const ARCHETYPE_TO_FUNNEL_TYPE: Record<"A" | "B" | "C" | "D", string> = {
  A: "sales",
  B: "opt_in",
  C: "application",
  D: "event",
};

const ARCHETYPE_LABEL: Record<"A" | "B" | "C" | "D", string> = {
  A: "Sales",
  B: "Opt-in",
  C: "Application",
  D: "Event",
};

export default function FunnelsHub() {
  const navigate = useNavigate();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorSlug, setAuthorSlug] = useState<string | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Funnel | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState<Funnel | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([]);
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      console.log("[FunnelsHub] 🔑 Resolving profile for user_id:", user.id);
      const { data: profile, error: profileErr } = await supabase
        .from("author_profiles")
        .select("id, author_slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profileErr) console.error("[FunnelsHub] profile lookup error:", profileErr);
      if (!profile) {
        console.warn("[FunnelsHub] No author_profile found for user_id:", user.id);
        setLoading(false);
        return;
      }
      console.log("[FunnelsHub] ✅ Resolved author_profile.id:", profile.id);
      setAuthorId(profile.id);
      setAuthorSlug(profile.author_slug);
      await Promise.all([loadFunnels(profile.id), loadLiveNodes(profile.id), loadLeadsCount(user.id)]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  const loadLeadsCount = async (uid: string) => {
    const { count } = await supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", uid);
    setLeadsCount(count || 0);
  };

  const loadFunnels = async (aid: string) => {
    const { data, error } = await supabase
      .from("funnels")
      .select("*")
      .eq("author_id", aid)
      .order("created_at", { ascending: false });
    if (error) console.error("[FunnelsHub] funnels query error:", error);
    console.log("[FunnelsHub] funnels loaded for author_id", aid, "→", (data || []).length, "rows");
    setFunnels((data as Funnel[]) || []);
  };

  const loadLiveNodes = async (aid: string) => {
    // Every live node is funnel-eligible. The archetype tells the UI/edge
    // function which template to use.
    const { data, error } = await supabase
      .from("author_nodes")
      .select("node_id, microsite_url, status, archetype")
      .eq("author_id", aid)
      .eq("status", "live");
    if (error) console.error("[FunnelsHub] live nodes error:", error);
    setLiveNodes((data as LiveNode[]) || []);
  };

  const liveUrl = (slug: string) =>
    authorSlug ? `${window.location.origin}/${authorSlug}/${slug}` : "";

  const generateForNode = async (nodeId: string) => {
    if (!authorId) return;
    const node = liveNodes.find((n) => n.node_id === nodeId);
    const archetype = node?.archetype || "B";
    const seedFunnelType = ARCHETYPE_TO_FUNNEL_TYPE[archetype] || "opt_in";

    setGeneratingNodeId(nodeId);
    const { error } = await supabase.functions.invoke("generate-funnel", {
      body: {
        author_id: authorId,
        node_id: nodeId,
        funnel_type: seedFunnelType,
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

  // Derived metrics
  const liveCount = funnels.filter((f) => f.status === "live").length;
  const draftCount = funnels.filter((f) => f.status !== "live").length;
  const totalViews = funnels.reduce((s, f) => s + (f.page_views || 0), 0);
  const totalConv = funnels.reduce((s, f) => s + (f.conversions || 0), 0);
  const avgRate = totalViews > 0 ? ((totalConv / totalViews) * 100).toFixed(1) : "0.0";

  // Suggestions = live nodes without a funnel, grouped by archetype
  const suggestions = liveNodes.filter((n) => !funnels.some((f) => f.node_id === n.node_id));
  const suggestionsByArch: Record<ArchetypeKey, LiveNode[]> = { A: [], B: [], C: [], D: [] };
  for (const s of suggestions) {
    const k = (s.archetype || "B") as ArchetypeKey;
    suggestionsByArch[k].push(s);
  }
  const archOrder: ArchetypeKey[] = ["B", "A", "C", "D"];
  const archAccent: Record<ArchetypeKey, string> = {
    A: "border-amber-400/50 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-100 dark:hover:bg-amber-900/30",
    B: "border-sky-400/50 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-100 dark:hover:bg-sky-900/30",
    C: "border-violet-400/50 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-100 dark:hover:bg-violet-900/30",
    D: "border-emerald-400/50 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-100 dark:hover:bg-emerald-900/30",
  };

  // Filter applied to funnel cards
  const filtered = funnels.filter((f) => {
    if (filter === "all") return true;
    if (filter === "live") return f.status === "live";
    if (filter === "paused") return f.status !== "live";
    const arch = liveNodes.find((n) => n.node_id === f.node_id)?.archetype;
    return arch === filter;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Filter className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">My Funnels</h1>
        </div>
        <p className="text-muted-foreground">
          ABBY auto-generates conversion funnels for your published products. Edit copy, preview live pages, and watch conversions roll in.
        </p>
      </div>

      {/* Stats strip */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{liveCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{draftCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drafts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalViews}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Views</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalConv}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Opt-ins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{avgRate}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible ABBY suggestions */}
      {suggestions.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/[0.03]">
          <CardContent className="py-3 px-4">
            <button
              type="button"
              onClick={() => setSuggestionsOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    ABBY can build {suggestions.length} more funnel{suggestions.length === 1 ? "" : "s"} for your live products
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Each takes ~30 seconds. Tap a product to generate.
                  </div>
                </div>
              </div>
              {suggestionsOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>

            {suggestionsOpen && (
              <div className="mt-4 space-y-3 pt-3 border-t border-primary/15">
                {archOrder.map((arch) => {
                  const items = suggestionsByArch[arch];
                  if (items.length === 0) return null;
                  return (
                    <div key={arch}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {ARCHETYPE_LABEL[arch]} funnels · {items.length}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((n) => {
                          const isGen = generatingNodeId === n.node_id;
                          return (
                            <button
                              key={n.node_id}
                              type="button"
                              onClick={() => generateForNode(n.node_id)}
                              disabled={!!generatingNodeId}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition disabled:opacity-50 ${archAccent[arch]}`}
                            >
                              {isGen
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Sparkles className="h-3 w-3" />}
                              {NODE_NAMES[n.node_id] || n.node_id}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter chips */}
      {funnels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            { k: "all", label: `All · ${funnels.length}` },
            { k: "live", label: `Live · ${liveCount}` },
            { k: "paused", label: `Paused · ${draftCount}` },
            { k: "B", label: "Opt-in" },
            { k: "A", label: "Sales" },
            { k: "C", label: "Application" },
            { k: "D", label: "Event" },
          ] as { k: FilterKey; label: string }[]).map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={() => setFilter(c.k)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${
                filter === c.k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {funnels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-60" />
            <h3 className="text-xl font-semibold mb-2">No funnels yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {liveNodes.length > 0
                ? "Open the suggestions panel above to let ABBY build your first funnel."
                : "Publish a Lead Magnet, Webinar, Author Website, or Book Sales page and ABBY will generate a high-converting funnel for it automatically."}
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No funnels match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((f) => {
            const rate = f.page_views > 0 ? ((f.conversions / f.page_views) * 100).toFixed(1) : "0.0";
            const url = liveUrl(f.slug);
            return (
              <Card key={f.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: f.accent_color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{f.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {f.node_id && <Badge variant="secondary" className="text-xs">{NODE_NAMES[f.node_id] || f.node_id}</Badge>}
                        {(() => {
                          const node = liveNodes.find((n) => n.node_id === f.node_id);
                          const arch = node?.archetype;
                          const label = arch ? ARCHETYPE_LABEL[arch] : f.funnel_type;
                          return <Badge variant="outline" className="text-xs">{label}</Badge>;
                        })()}
                        <Badge
                          variant={f.status === "live" ? "default" : "secondary"}
                          className={f.status === "live" ? "bg-green-600 text-xs" : "text-xs"}
                        >
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ ...f })}>
                          <Edit className="h-3.5 w-3.5 mr-2" />Edit copy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(f)}>
                          <Power className="h-3.5 w-3.5 mr-2" />{f.status === "live" ? "Pause" : "Go Live"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRegenerateTarget(f)}>
                          <Sparkles className="h-3.5 w-3.5 mr-2" />Regenerate with ABBY
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-lg font-bold">{f.page_views}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Views</div>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <div className="text-lg font-bold">{leadsCount}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Leads</div>
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

                  {authorSlug && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/60 rounded px-2 py-1.5 transition group"
                    >
                      <span className="truncate flex-1">{url}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                    </a>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => window.open(url, "_blank")}>
                      <Eye className="h-3.5 w-3.5 mr-1" />View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(f.slug)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />Copy link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/dashboard?section=author-crm")}>
                      <Users className="h-3.5 w-3.5 mr-1" />CRM
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
