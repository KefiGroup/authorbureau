import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Copy, Loader2, Linkedin, Instagram, Facebook, Twitter, Mail, Image } from "lucide-react";
import { startGeneration, getGeneration, isGenerating } from "@/lib/builder-generation-registry";

interface Props {
  authorId: string;
  bookId?: string | null;
  content: any | null;
  onContentLoaded: (content: any) => void;
  /**
   * Persistence contract: any builder embedding this component MUST pass
   * onPersist to write the generated pack into author_nodes.content_json
   * (typically via autosaveBuilderDraft). Without it, the pack lives only
   * in React state and is lost on navigation. See BP-02 for reference.
   */
  onPersist?: (content: any) => Promise<void> | void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied!");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="h-3.5 w-3.5 mr-1" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function PostCard({ caption, hashtags, label }: { caption: string; hashtags?: string[]; label?: string }) {
  const fullText = hashtags?.length
    ? `${caption}\n\n${hashtags.map(h => `#${h}`).join(" ")}`
    : caption;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>}
          <p className="text-sm whitespace-pre-wrap">{caption}</p>
          {hashtags?.length ? (
            <p className="text-xs text-primary mt-2">{hashtags.map(h => `#${h}`).join(" ")}</p>
          ) : null}
        </div>
        <CopyButton text={fullText} />
      </div>
    </Card>
  );
}

export default function SocialDistributionPack({ authorId, bookId, content, onContentLoaded, onPersist }: Props) {
  // Single-flight key scoped per author+book so navigating away doesn't kill it.
  const genKey = `BP-02::social-pack::${bookId ?? "no-book"}`;
  const [generating, setGenerating] = useState(() => isGenerating(authorId, genKey));

  // On mount, if a generation is in-flight from a previous mount, attach to it.
  useEffect(() => {
    const existing = getGeneration<any>(authorId, genKey);
    if (!existing) return;
    setGenerating(true);
    existing
      .then(async (pack) => {
        if (!pack) return;
        onContentLoaded(pack);
        try { await onPersist?.(pack); } catch (e) { console.error("[SocialPack] persist (resumed) failed:", e); }
        toast.success("Social media pack generated!");
      })
      .catch((e: any) => toast.error(e?.message || "Generation failed"))
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, genKey]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const pack = await startGeneration(authorId, genKey, async () => {
        const { data, error } = await supabase.functions.invoke("generate-bp02-social-pack", {
          body: { author_id: authorId, book_id: bookId ?? null },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
        return data.content;
      });
      onContentLoaded(pack);
      try {
        await onPersist?.(pack);
      } catch (persistErr: any) {
        console.error("[SocialDistributionPack] persist failed:", persistErr);
        toast.error("Generated, but failed to save: " + (persistErr?.message || "unknown error"));
        return;
      }
      toast.success("Social media pack generated!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setGenerating(false);
  };

  if (!content) {
    return (
      <Card className="p-6 text-center border-2 border-dashed border-muted-foreground/20">
        <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="font-semibold mb-2">Social Media Distribution Pack</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate ready-to-post content for LinkedIn, Instagram, Facebook, X, and email to promote your lead magnet.
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generating ? "Generating..." : "Generate Social Pack"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Social Media Distribution Pack</h3>
      </div>

      <Tabs defaultValue="linkedin" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="linkedin" className="text-xs py-2">
            <Linkedin className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> LinkedIn
          </TabsTrigger>
          <TabsTrigger value="instagram" className="text-xs py-2">
            <Instagram className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="facebook" className="text-xs py-2">
            <Facebook className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Facebook
          </TabsTrigger>
          <TabsTrigger value="twitter" className="text-xs py-2">
            <Twitter className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> X
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs py-2">
            <Mail className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linkedin" className="space-y-3 mt-4">
          {content.linkedin_posts?.map((post: any, i: number) => (
            <PostCard key={i} caption={post.caption} hashtags={post.hashtags} label={post.type} />
          ))}
        </TabsContent>

        <TabsContent value="instagram" className="space-y-3 mt-4">
          {content.instagram_posts?.map((post: any, i: number) => (
            <div key={i}>
              {post.type === "carousel" && (
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Carousel</p>
                  <p className="text-sm mb-2">{post.caption}</p>
                  {post.slide_topics && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.slide_topics.map((t: string, j: number) => (
                        <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded">Slide {j + 1}: {t}</span>
                      ))}
                    </div>
                  )}
                  {post.hashtags?.length ? (
                    <p className="text-xs text-primary">{post.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                  ) : null}
                  <div className="mt-2"><CopyButton text={post.caption} /></div>
                </Card>
              )}
              {post.type === "story" && (
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Story (3 frames)</p>
                  {post.frames?.map((f: any, j: number) => (
                    <div key={j} className="mb-2 p-2 bg-muted/50 rounded text-sm">
                      <span className="text-xs font-semibold text-muted-foreground">Frame {f.frame}: </span>
                      {f.text}
                    </div>
                  ))}
                </Card>
              )}
              {post.type === "reel" && (
                <PostCard caption={`🎬 Reel Script:\n${post.script}\n\nCaption: ${post.caption}`} hashtags={post.hashtags} label="Reel" />
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="facebook" className="space-y-3 mt-4">
          {content.facebook_posts?.map((post: any, i: number) => (
            <PostCard key={i} caption={post.caption} hashtags={post.hashtags} label={post.type} />
          ))}
        </TabsContent>

        <TabsContent value="twitter" className="space-y-3 mt-4">
          {content.twitter_thread?.map((tweet: any, i: number) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-muted-foreground">Tweet {tweet.tweet_number}/5</span>
                  <p className="text-sm mt-1">{tweet.text}</p>
                </div>
                <CopyButton text={tweet.text} />
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const thread = content.twitter_thread?.map((t: any) => t.text).join("\n\n---\n\n") || "";
              navigator.clipboard.writeText(thread);
              toast.success("Full thread copied!");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-2" /> Copy Full Thread
          </Button>
        </TabsContent>

        <TabsContent value="email" className="space-y-3 mt-4">
          {content.email_to_list && (
            <Card className="p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Subject Line Options</p>
                {content.email_to_list.subject_variants?.map((s: string, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm">{i + 1}. {s}</p>
                    <CopyButton text={s} />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Email Body</p>
                <p className="text-sm whitespace-pre-wrap">{content.email_to_list.body}</p>
                <div className="mt-2"><CopyButton text={content.email_to_list.body} /></div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Visual assets brief */}
      {content.visual_assets_brief?.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Image className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Visual Assets Brief</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {content.visual_assets_brief.map((asset: any, i: number) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <p className="font-semibold capitalize">{asset.format?.replace("_", " ")}</p>
                <p className="text-muted-foreground">{asset.dimensions}</p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: asset.background_color }} />
                  <span>{asset.background_color}</span>
                </div>
                <p className="font-medium">{asset.headline_text}</p>
                <p className="text-muted-foreground">{asset.subheadline_text}</p>
                {asset.include_book_cover && <p className="text-primary">+ Book cover</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
