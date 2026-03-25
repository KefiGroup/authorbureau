import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2, Palette, RefreshCw } from "lucide-react";
import type { SocialPost, CalendarConfig } from "./types";

const STYLES = [
  { id: "minimalist", label: "Minimalist", emoji: "🤍", desc: "Clean & elegant" },
  { id: "editorial", label: "Editorial", emoji: "📰", desc: "Magazine-quality" },
  { id: "bold", label: "Bold & Vibrant", emoji: "🔥", desc: "High contrast pop" },
  { id: "watercolor", label: "Watercolor", emoji: "🎨", desc: "Soft & artistic" },
  { id: "flat-illustration", label: "Flat Illustration", emoji: "✏️", desc: "Modern vector" },
] as const;

interface Props {
  post: SocialPost;
  config: CalendarConfig;
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export default function ImageStylePicker({ post, config, open, onClose, onSelect }: Props) {
  const { toast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState("minimalist");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setImages([]);
    setSelectedIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-graphic", {
        body: {
          platform: post.platform,
          imagePrompt: post.image_prompt || post.caption.slice(0, 200),
          bookTitle: config.bookTitle,
          bookCoverUrl: config.bookCoverUrl,
          caption: post.caption,
          style: selectedStyle,
          count: 3,
        },
      });
      if (error) throw error;
      if (data?.imageUrls?.length) {
        setImages(data.imageUrls);
        toast({ title: `${data.imageUrls.length} variations ready!`, description: "Pick your favourite." });
      } else if (data?.imageUrl) {
        setImages([data.imageUrl]);
      } else {
        throw new Error(data?.error || "No images returned");
      }
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [post, config, selectedStyle, toast]);

  const confirmSelection = () => {
    if (selectedIdx !== null && images[selectedIdx]) {
      onSelect(images[selectedIdx]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-secondary" />
            Generate Image — {post.platform}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Style picker */}
          <div>
            <p className="text-sm font-medium mb-2">Choose a style</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`
                    p-3 rounded-lg border text-left transition-all text-sm
                    ${selectedStyle === s.id
                      ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30"
                      : "border-border hover:border-secondary/30 hover:bg-muted/50"
                    }
                  `}
                >
                  <span className="text-lg">{s.emoji}</span>
                  <p className="font-medium mt-1">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={generate}
            disabled={generating}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating 3 variations… (this takes ~30s)</>
            ) : images.length > 0 ? (
              <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate with {STYLES.find(s => s.id === selectedStyle)?.label}</>
            ) : (
              <><Palette className="h-4 w-4 mr-2" /> Generate 3 Variations</>
            )}
          </Button>

          {/* Results grid */}
          {images.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Pick your favourite</p>
              <div className="grid grid-cols-3 gap-3">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`
                      relative rounded-lg overflow-hidden border-2 transition-all aspect-square
                      ${selectedIdx === idx
                        ? "border-green-500 ring-2 ring-green-500/30 scale-[1.02]"
                        : "border-border hover:border-secondary/40"
                      }
                    `}
                  >
                    <img src={url} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                    {selectedIdx === idx && (
                      <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <span className="text-[10px] text-white font-medium">Option {idx + 1}</span>
                    </div>
                    {/* Download link */}
                    <a
                      href={url}
                      download={`${config.bookTitle.replace(/\s+/g, "-")}-${post.platform}-v${idx + 1}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-1.5 left-1.5 bg-black/50 rounded-full p-1 hover:bg-black/70 transition-colors"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </a>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm button */}
          {selectedIdx !== null && (
            <Button onClick={confirmSelection} className="w-full bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Use This Image
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
