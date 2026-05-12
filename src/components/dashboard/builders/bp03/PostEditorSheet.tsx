import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Save } from "lucide-react";
import SocialGraphicCard from "./SocialGraphicCard";
import { extractPullQuote, PLATFORM_TAB_LABELS, type SocialPlatform } from "./socialGraphic";

const PLATFORMS: SocialPlatform[] = ["instagram", "linkedin", "facebook", "twitter"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: any | null;
  authorName: string;
  authorPhotoUrl?: string | null;
  bookColor?: string | null;
  bookTitle?: string;
  onSave: (updatedPost: any) => Promise<void> | void;
}

export default function PostEditorSheet({
  open,
  onOpenChange,
  post,
  authorName,
  authorPhotoUrl,
  bookColor,
  bookTitle,
  onSave,
}: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [draft, setDraft] = useState<any | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) setDraft(JSON.parse(JSON.stringify(post)));
  }, [post]);

  if (!draft) return null;

  const platformData = draft[platform] || { caption: "", hashtags: [] };
  const pullQuote = extractPullQuote(platformData.caption || "");

  const updateCaption = (val: string) => {
    setDraft({ ...draft, [platform]: { ...platformData, caption: val } });
  };
  const updateHashtags = (val: string) => {
    const tags = val
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    setDraft({ ...draft, [platform]: { ...platformData, hashtags: tags } });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Edit Day {draft.day} — {draft.theme}</SheetTitle>
          <SheetDescription>
            Tweak the caption, then regenerate the graphic. Changes save back to your kit.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Tabs value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
            <TabsList className="w-full grid grid-cols-4 h-auto">
              {PLATFORMS.map((p) => (
                <TabsTrigger key={p} value={p} className="text-[11px] py-1.5">
                  {PLATFORM_TAB_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
            {PLATFORMS.map((p) => (
              <TabsContent key={p} value={p} className="mt-3 space-y-3">
                <SocialGraphicCard
                  key={`${p}-${renderKey}`}
                  platform={p}
                  authorName={authorName}
                  authorPhotoUrl={authorPhotoUrl}
                  bookColor={bookColor}
                  bookTitle={bookTitle}
                  pullQuote={
                    p === platform
                      ? pullQuote
                      : extractPullQuote(draft[p]?.caption || "")
                  }
                />
                {p === "instagram" && draft.instagram?.format === "carousel" && Array.isArray(draft.instagram?.carousel_slides) && (
                  <CarouselPreview
                    slides={draft.instagram.carousel_slides}
                    bookTitle={bookTitle}
                    authorName={authorName}
                    bookColor={bookColor}
                    filenamePrefix={`day-${draft.day}-carousel`}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Caption</label>
            <Textarea
              value={platformData.caption || ""}
              onChange={(e) => updateCaption(e.target.value)}
              rows={6}
              placeholder="Write your caption…"
            />
            <p className="text-[11px] text-muted-foreground">
              The first sentence becomes the pull quote on your graphic.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Hashtags</label>
            <Textarea
              value={(platformData.hashtags || []).map((h: string) => `#${h}`).join(" ")}
              onChange={(e) => updateHashtags(e.target.value)}
              rows={2}
              placeholder="#authorlife #newbook"
            />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setRenderKey((k) => k + 1)}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Graphic
          </Button>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
