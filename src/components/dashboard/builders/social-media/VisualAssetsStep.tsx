import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Sparkles, Loader2, Palette, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SocialMediaPost } from "./types";
import { PLATFORM_CONFIG, CONTENT_TYPE_LABELS } from "./types";
import { format } from "date-fns";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function VisualAssetsStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const posts: SocialMediaPost[] = stepData["generate"]?.posts || [];
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const postsWithPrompts = posts.filter(p => p.imagePrompt);

  const generateGraphic = async (postId: string) => {
    setGeneratingId(postId);
    // Simulate graphic generation
    await new Promise(r => setTimeout(r, 2000));
    setStepData(prev => ({
      ...prev,
      generate: {
        ...prev.generate,
        posts: (prev.generate?.posts || []).map((p: SocialMediaPost) =>
          p.id === postId ? { ...p, imageUrl: `https://placehold.co/1080x1080/1A2B4A/D4A843?text=${encodeURIComponent(p.contentType)}` } : p
        ),
      },
    }));
    onMarkEdited("graphics");
    setGeneratingId(null);
    toast({ title: "Graphic generated" });
  };

  const generateAll = async () => {
    toast({ title: "Generating graphics for all posts...", description: "This may take a moment." });
    for (const post of postsWithPrompts.slice(0, 10)) {
      await generateGraphic(post.id);
    }
    toast({ title: "Batch complete", description: `Generated graphics for ${Math.min(postsWithPrompts.length, 10)} posts.` });
  };

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Posts Yet</h3>
        <p className="text-sm text-muted-foreground">Generate your content calendar first, then come back to create visuals.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Palette */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold">Brand Palette</span>
          </div>
          <Badge variant="outline" className="text-[10px]">From your book</Badge>
        </div>
        <div className="flex gap-3">
          {["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"].map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg border border-border" style={{ background: c }} />
              <span className="text-[9px] text-muted-foreground">
                {["Primary", "Secondary", "Accent", "Muted"][i]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Batch generate */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{postsWithPrompts.length} posts have graphic concepts</p>
        <Button size="sm" variant="outline" onClick={generateAll}>
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate All Graphics
        </Button>
      </div>

      {/* Post graphics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {postsWithPrompts.slice(0, 12).map(post => {
          const typeInfo = CONTENT_TYPE_LABELS[post.contentType] || CONTENT_TYPE_LABELS.tip;
          return (
            <Card key={post.id} className="overflow-hidden">
              <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Image className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground line-clamp-3">{post.imagePrompt}</p>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-full ${PLATFORM_CONFIG[post.platform]?.color || "bg-muted"} flex items-center justify-center text-white text-[8px] font-bold`}>
                    {(PLATFORM_CONFIG[post.platform]?.label || "?")[0]}
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge className={`text-[9px] px-1 py-0 ${typeInfo.color}`}>{typeInfo.emoji} {typeInfo.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(post.date), "MMM d")}</span>
                </div>
                <p className="text-xs line-clamp-2">{post.caption}</p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 flex-1"
                    disabled={generatingId === post.id}
                    onClick={() => generateGraphic(post.id)}
                  >
                    {generatingId === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {post.imageUrl ? "Regenerate" : "Generate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-6">
                    <Upload className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
