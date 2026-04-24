import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Image as ImageIcon, Sparkles, Loader2, Palette, RefreshCw, Wand2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SocialMediaPost } from "./types";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "./types";
import { format } from "date-fns";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  bookId?: string;
  userId?: string;
}

const TEMPLATES = [
  { id: "quote_card", label: "Quote Card", desc: "Editorial pull-quote with attribution" },
  { id: "hero_visual", label: "Hero Visual", desc: "Full-bleed AI background + bold headline" },
  { id: "headline_block", label: "Headline Block", desc: "Split layout with brand-color block" },
  { id: "author_spotlight", label: "Author Spotlight", desc: "Large headshot + clean text panel" },
  { id: "stat_highlight", label: "Stat Highlight", desc: "Massive number / key stat focus" },
  { id: "book_cover_feature", label: "Book Cover", desc: "3D book mockup + CTA" },
] as const;

const MOOD_PRESETS = [
  "sophisticated, premium, editorial",
  "warm, inviting, human-centered",
  "bold, high-contrast, energetic",
  "calm, minimalist, spacious",
  "vibrant, modern, playful",
];

export default function SocialPostDesigner({ stepData, setStepData, onMarkEdited, bookTitle, bookId, userId }: Props) {
  const { toast } = useToast();
  const posts: SocialMediaPost[] = stepData["generate"]?.posts || [];

  const [selectedId, setSelectedId] = useState<string | null>(posts[0]?.id ?? null);
  const [composing, setComposing] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  // Brand kit (loaded from profile + book)
  const [authorName, setAuthorName] = useState("");
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string | null>(null);
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#D4A843");
  const [mood, setMood] = useState(MOOD_PRESETS[0]);

  // Per-post overrides — template + edited headline
  const designs: Record<string, { template: string; headline: string; backgroundUrl?: string | null }> =
    stepData["graphics"]?.designs || {};

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, photo_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile) {
        setAuthorName(profile.pen_name || "");
        setAuthorPhotoUrl(profile.photo_url || null);
      }
      if (bookId) {
        const { data: book } = await supabase
          .from("books")
          .select("cover_image_url, author_name")
          .eq("id", bookId)
          .maybeSingle();
        if (book) {
          setBookCoverUrl(book.cover_image_url || null);
          if (!profile?.pen_name && book.author_name) setAuthorName(book.author_name);
        }
      }
    })();
  }, [userId, bookId]);

  const selected = useMemo(() => posts.find(p => p.id === selectedId), [posts, selectedId]);
  const selectedDesign = selectedId ? designs[selectedId] : undefined;

  const updateDesign = (postId: string, patch: Partial<{ template: string; headline: string; backgroundUrl: string | null }>) => {
    setStepData(prev => ({
      ...prev,
      graphics: {
        ...prev.graphics,
        designs: {
          ...(prev.graphics?.designs || {}),
          [postId]: { ...(prev.graphics?.designs?.[postId] || {}), ...patch },
        },
      },
    }));
  };

  const compose = async (postId: string, opts: { reuseBackground?: boolean } = {}) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const design: { template?: string; headline?: string; backgroundUrl?: string | null } = designs[postId] || {};
    const template = design.template || "quote_card";
    const headline = (design.headline ?? post.caption ?? "").slice(0, 240);

    setComposing(postId);
    try {
      const { data, error } = await supabase.functions.invoke("compose-social-post", {
        body: {
          platform: post.platform,
          template,
          headline,
          authorName: authorName || "Author",
          authorPhotoUrl,
          bookTitle,
          bookCoverUrl,
          brandColor,
          mood,
          existingBackgroundUrl: opts.reuseBackground ? design.backgroundUrl : null,
        },
      });
      if (error) throw error;

      // Persist composed image into the post + cache background for cheap recomposes
      setStepData(prev => ({
        ...prev,
        generate: {
          ...prev.generate,
          posts: (prev.generate?.posts || []).map((p: SocialMediaPost) =>
            p.id === postId ? { ...p, imageUrl: data.imageUrl } : p
          ),
        },
        graphics: {
          ...prev.graphics,
          designs: {
            ...(prev.graphics?.designs || {}),
            [postId]: {
              template,
              headline,
              backgroundUrl: data.backgroundUrl ?? design.backgroundUrl ?? null,
            },
          },
        },
      }));
      onMarkEdited("graphics");
      toast({ title: "Graphic composed", description: "Branded design ready." });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Composition failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setComposing(null);
    }
  };

  const designAll = async () => {
    const targets = posts.slice(0, 20);
    setBatchProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      await compose(targets[i].id);
      setBatchProgress({ done: i + 1, total: targets.length });
    }
    setBatchProgress(null);
    toast({ title: "Batch complete", description: `Designed ${targets.length} posts.` });
  };

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Posts Yet</h3>
        <p className="text-sm text-muted-foreground">Generate your content calendar first, then come back to design visuals.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand kit */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold">Brand Kit</span>
          </div>
          <Badge variant="outline" className="text-[10px]">Auto-pulled</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Author name</Label>
            <Input value={authorName} onChange={e => setAuthorName(e.target.value)} className="h-8 mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Brand color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="h-8 w-10 rounded border border-border cursor-pointer"
              />
              <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-8 text-sm font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Author photo</Label>
            <div className="flex items-center gap-2 mt-1">
              {authorPhotoUrl ? (
                <img src={authorPhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">—</div>
              )}
              <span className="text-xs text-muted-foreground truncate">{authorPhotoUrl ? "Connected" : "None"}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Mood</Label>
            <select
              value={mood}
              onChange={e => setMood(e.target.value)}
              className="w-full h-8 mt-1 text-xs border border-border rounded px-2 bg-background"
            >
              {MOOD_PRESETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Batch */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{posts.length} post{posts.length !== 1 ? "s" : ""} • {Object.keys(designs).length} designed</p>
        <Button size="sm" onClick={designAll} disabled={!!batchProgress || !!composing}>
          {batchProgress ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
          {batchProgress ? `Designing ${batchProgress.done}/${batchProgress.total}` : "Design All (first 20)"}
        </Button>
      </div>
      {batchProgress && (
        <Progress value={(batchProgress.done / batchProgress.total) * 100} className="h-2" />
      )}

      {/* Two-pane: list + editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {posts.map(p => {
            const typeInfo = CONTENT_TYPE_LABELS[p.contentType] || CONTENT_TYPE_LABELS.tip;
            const isActive = p.id === selectedId;
            const hasDesign = !!designs[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isActive ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-4 h-4 rounded-full ${PLATFORM_CONFIG[p.platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[8px] font-bold`}>
                    {(PLATFORM_CONFIG[p.platform]?.label || "?")[0]}
                  </div>
                  <Badge className={`text-[9px] px-1 py-0 ${typeInfo.color}`}>{typeInfo.emoji}</Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(p.date), "MMM d")}</span>
                  {hasDesign && <Check className="h-3 w-3 text-secondary ml-auto" />}
                </div>
                <p className="text-xs line-clamp-2">{p.caption}</p>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="space-y-4">
          {selected ? (
            <>
              {/* Preview */}
              <Card className="overflow-hidden">
                <div className="aspect-square bg-muted/50 flex items-center justify-center max-h-[420px]">
                  {selected.imageUrl ? (
                    <img src={selected.imageUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-8">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No design yet — pick a template and compose.</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Template picker */}
              <div>
                <Label className="text-xs mb-2 block">Template</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATES.map(t => {
                    const active = (selectedDesign?.template || "quote_card") === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => updateDesign(selected.id, { template: t.id })}
                        className={`text-left p-2 rounded-lg border text-xs transition-all ${
                          active ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/40"
                        }`}
                      >
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Headline editor */}
              <div>
                <Label className="text-xs mb-1 block">Headline (rendered on the graphic)</Label>
                <Textarea
                  value={selectedDesign?.headline ?? selected.caption}
                  onChange={e => updateDesign(selected.id, { headline: e.target.value })}
                  rows={3}
                  maxLength={240}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Keep under ~120 chars for best legibility.</p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => compose(selected.id)}
                  disabled={composing === selected.id || !!batchProgress}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  {composing === selected.id
                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {selectedDesign?.backgroundUrl ? "Regenerate background" : "Compose graphic"}
                </Button>
                {selectedDesign?.backgroundUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => compose(selected.id, { reuseBackground: true })}
                    disabled={composing === selected.id || !!batchProgress}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Recompose text only (faster)
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Select a post to start designing.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
