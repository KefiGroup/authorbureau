import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { Video, Loader2, Edit3, Eye, Save, X, CheckCircle2, Users, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import BookBuilderContextBar from "./BookBuilderContextBar";
import AIWebinarPreviewCard from "./webinars/AIWebinarPreviewCard";

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
  slug: string | null;
  room_url: string | null;
}

interface Registration {
  id: string;
  email: string;
  name: string | null;
  registered_at: string;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export default function WebinarsManager({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const bookFilterId = searchParams.get("bookId");
  const bookTitleParam = searchParams.get("bookTitle") || "";
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editRoomUrl, setEditRoomUrl] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [authorSlug, setAuthorSlug] = useState<string>("");
  const [authorProfileId, setAuthorProfileId] = useState<string | null>(null);
  const [aiNodeContent, setAiNodeContent] = useState<any | null>(null);

  const fetchWebinars = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("webinars" as any)
      .select("*")
      .eq("author_id", user!.id)
      .order("created_at", { ascending: false });
    if (bookFilterId) query = query.eq("book_id", bookFilterId);
    const { data, error } = await query;
    if (!error && data) setWebinars(data as any);
    setLoading(false);
  }, [user, bookFilterId]);

  // Load AI-generated BP-05 content from author_nodes when no webinars row exists yet,
  // so the "Live" badge in the Brand tab is reflected here with a Promote CTA.
  const fetchAINodeContent = useCallback(async () => {
    if (!user) { setAiNodeContent(null); return; }
    const { data: profile } = await supabase
      .from("author_profiles")
      .select("id, author_slug")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.id) { setAiNodeContent(null); return; }
    setAuthorProfileId(profile.id);
    if (profile.author_slug && !authorSlug) setAuthorSlug(profile.author_slug);
    let q = supabase
      .from("author_nodes")
      .select("content_json, status")
      .eq("author_id", profile.id)
      .eq("node_id", "BP-05")
      .in("status", ["live", "content_ready"]);
    if (bookFilterId) q = q.eq("book_id", bookFilterId);
    const { data } = await q.maybeSingle();
    setAiNodeContent(data?.content_json || null);
  }, [user, bookFilterId, authorSlug]);

  useEffect(() => {
    if (!user) return;
    fetchWebinars();
    fetchAINodeContent();
    supabase.from("author_profiles").select("author_slug").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAuthorSlug((data as any)?.author_slug || ""));
  }, [user, bookFilterId, fetchWebinars, fetchAINodeContent]);

  const selected = webinars.find(w => w.id === selectedId);

  // Load registrations when a webinar is selected
  useEffect(() => {
    if (!selectedId) { setRegistrations([]); return; }
    supabase.from("webinar_registrations" as any)
      .select("id, email, name, registered_at")
      .eq("webinar_id", selectedId)
      .order("registered_at", { ascending: false })
      .then(({ data }) => setRegistrations((data as any) || []));
  }, [selectedId]);

  const beginEdit = (w: Webinar) => {
    setEditTitle(w.title);
    setEditDescription(w.description || "");
    setEditPrice(String(w.price || 0));
    setEditScheduledAt(w.scheduled_at ? new Date(w.scheduled_at).toISOString().slice(0, 16) : "");
    setEditDuration(String(w.duration_minutes || 60));
    setEditRoomUrl(w.room_url || "");
    setEditSlug(w.slug || slugify(w.title));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const slug = editSlug ? slugify(editSlug) : slugify(editTitle);
    const { error } = await supabase
      .from("webinars" as any)
      .update({
        title: editTitle,
        description: editDescription,
        price: parseFloat(editPrice) || 0,
        is_free: (parseFloat(editPrice) || 0) === 0,
        scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
        duration_minutes: parseInt(editDuration) || 60,
        room_url: editRoomUrl || null,
        slug,
      } as any)
      .eq("id", selected.id);
    if (error) toast.error("Failed to save: " + error.message);
    else { toast.success("Webinar updated"); setEditing(false); fetchWebinars(); }
    setSaving(false);
  };

  const handlePublish = async (id: string, w: Webinar) => {
    if (!w.scheduled_at || !w.room_url || !w.slug) {
      toast.error("Set date, room URL, and slug before publishing");
      return;
    }
    const { error } = await supabase.from("webinars" as any).update({ status: "published" } as any).eq("id", id);
    if (error) toast.error("Failed to publish");
    else { toast.success("Webinar published!"); fetchWebinars(); }
  };

  const publicUrl = selected?.slug && authorSlug ? `${window.location.origin}/${authorSlug}/webinar/${selected.slug}` : "";

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading webinars…</div>;
  }

  if (webinars.length === 0) {
    // If the AI engine already produced BP-05 content (Brand tab shows ✅ Live),
    // surface it here with a Promote CTA so the two views agree.
    if (aiNodeContent && bookFilterId) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <BookBuilderContextBar backTab="automate" />
          <div className="text-center pt-2">
            <h2 className="font-heading text-2xl font-bold mb-2">Webinars</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Your AI engine has prepared a webinar for this book. Promote it to a live, schedulable webinar to start taking registrations.
            </p>
          </div>
          <AIWebinarPreviewCard
            bookId={bookFilterId}
            bookTitle={bookTitleParam}
            authorId={authorProfileId}
            contentJson={aiNodeContent}
            onPromoted={() => { fetchWebinars(); }}
            onRegenerate={() => onNavigate?.("build-business")}
          />
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <BookBuilderContextBar backTab="automate" />
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--builder-bridge)/0.1)] dark:bg-[hsl(var(--builder-bridge)/0.2)] flex items-center justify-center mx-auto mb-6">
          <Video className="h-8 w-8 text-[hsl(var(--builder-bridge))]" />
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
                <Button variant="outline" size="sm" onClick={() => beginEdit(selected)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                {selected.status === "draft" && (
                  <Button size="sm" onClick={() => handlePublish(selected.id, selected)}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date & Time</label>
                <Input type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                <Input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Room URL (Daily.co, Zoom, etc.)</label>
              <Input placeholder="https://example.daily.co/your-room" value={editRoomUrl} onChange={e => setEditRoomUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Public URL slug</label>
              <Input placeholder="my-webinar" value={editSlug} onChange={e => setEditSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Public page: /{authorSlug || "your-slug"}/webinar/{slugify(editSlug || editTitle)}</p>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Price (USD, 0 = free)</label><Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />} Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1.5" /> Cancel</Button>
            </div>
          </CardContent></Card>
        ) : (
          <>
            <Card><CardContent className="p-0">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{selected.title}</h3>
                  {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleString() : "No date set"} · {selected.duration_minutes} min · {selected.is_free ? "Free" : `$${selected.price}`}
                  </p>
                </div>
                <Badge variant={selected.status === "published" ? "default" : "secondary"}>{selected.status}</Badge>
              </div>
              <div className="px-6 py-6">
                {selected.script_markdown ? <MarkdownRenderer content={selected.script_markdown} /> : <p className="text-muted-foreground text-sm">No script generated yet. Run "Build My Business" → Digital Products to generate webinar content.</p>}
              </div>
            </CardContent></Card>

            {selected.status === "published" && publicUrl && (
              <Card><CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Public registration page</p>
                  <p className="text-sm font-mono truncate">{publicUrl}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copied"); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                </Button>
                <a href={publicUrl} target="_blank" rel="noopener"><Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open</Button></a>
              </CardContent></Card>
            )}

            <Card><CardContent className="p-0">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Registrants ({registrations.length})</h4>
                </div>
              </div>
              {registrations.length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">No registrations yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {registrations.map(r => (
                    <div key={r.id} className="px-6 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{r.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(r.registered_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </>
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
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--builder-bridge)/0.1)] dark:bg-[hsl(var(--builder-bridge)/0.2)] flex items-center justify-center shrink-0"><Video className="h-5 w-5 text-[hsl(var(--builder-bridge))]" /></div>
                <div>
                  <h3 className="font-medium text-sm">{w.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.scheduled_at ? new Date(w.scheduled_at).toLocaleDateString() : "No date"} · {w.duration_minutes} min · {w.is_free ? "Free" : `$${w.price}`}
                  </p>
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
