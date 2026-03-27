import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight, Check, Calendar, Hash, Clock, Settings, ChevronDown, ChevronUp } from "lucide-react";
import PublishSuccessScreen from "@/components/dashboard/builders/shared/PublishSuccessScreen";
import { publishNodeToSite } from "@/lib/publish-node";

const STEPS = ["Introduction", "Generating", "Review", "Publish"];

const GENERATING_MESSAGES = [
  "Studying your book's key themes and insights...",
  "Crafting 30 days of social media posts...",
  "Writing captions for LinkedIn, Instagram, Facebook, and Twitter/X...",
  "Creating your hashtag strategy...",
  "Building your content calendar...",
];

const ACTIVATING_MESSAGES = [
  "Setting up your content calendar...",
  "Scheduling your first week of posts...",
  "Connecting your social media accounts...",
  "Your social media is almost ready...",
];

interface Props {
  authorId: string | null;
}

export default function BP03Builder({ authorId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorSlug, setAuthorSlug] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("pen_name, author_slug, user_id")
        .eq("id", authorId)
        .single();
      setAuthorName(profile?.pen_name || "there");
      setAuthorSlug(profile?.author_slug || (profile?.pen_name || "").toLowerCase().replace(/\s+/g, "-"));

      const { data: ctx } = await supabase
        .from("author_context")
        .select("book_title")
        .eq("author_id", authorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ctx?.book_title) {
        setBookTitle(ctx.book_title);
        setHasContext(true);
      } else {
        const { data: book } = await supabase
          .from("books")
          .select("title")
          .eq("author_id", profile?.user_id || authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (book?.title) {
          setBookTitle(book.title);
          setHasContext(true);
        } else {
          setHasContext(false);
        }
      }

      const { data: node } = await supabase
        .from("author_nodes")
        .select("content_json, status")
        .eq("author_id", authorId)
        .eq("node_id", "BP-03")
        .maybeSingle();

      if (node?.content_json && (node.status === "content_ready" || node.status === "live")) {
        setContent(node.content_json);
        setStep(node.status === "live" ? 3 : 2);
        if (node.status === "live") {
          // Mark as already activated so success shows immediately
          setTimeout(() => setContent((prev: any) => ({ ...prev, activated: true })), 0);
        }
      }
    })();
  }, [authorId]);

  useEffect(() => {
    if (step === 1 || (step === 3 && !content?.activated)) {
      const msgs = step === 1 ? GENERATING_MESSAGES : ACTIVATING_MESSAGES;
      setMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => (i + 1) % msgs.length);
      }, 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [step]);

  const handleGenerate = async () => {
    setStep(1);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-bp03-social-media", {
        body: { author_id: authorId },
      });
      if (fnErr || !data?.success) throw new Error(data?.error || fnErr?.message || "Generation failed");
      setContent(data.content);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
      setStep(0);
    }
  };

  const handlePublish = async () => {
    setStep(3);
    setError(null);
    try {
      await publishNodeToSite(authorId!, "BP-03", authorSlug);
      setContent((prev: any) => ({ ...prev, activated: true }));
    } catch (e: any) {
      setError(e.message);
      setStep(2);
    }
  };

  if (!authorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please set up your author profile first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/brand-products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Social Media</h1>
            <p className="text-xs text-muted-foreground">BP-03</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                i < step ? "bg-primary text-primary-foreground"
                : i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {step === 0 && (
          <AbbyCard>
            <h2 className="text-xl font-bold mb-3">Let's build your Social Media</h2>
            {hasContext === false ? (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Before I can build your social media, I need to know about your book. Please complete your book profile first.
                </p>
                <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-03")}>Complete Book Profile</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  Hi {authorName}! Social media is how readers discover you and how your community grows.
                  I'm going to create a complete 30-day social media content calendar for '{bookTitle || "your book"}' —
                  with posts for LinkedIn, Instagram, Facebook, and Twitter/X — all personalised to your book's themes and your audience.
                  Everything will be scheduled automatically. Ready?
                </p>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate My Social Media
                </Button>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                I hit a snag generating your content. {error}
                <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>Try Again</Button>
              </div>
            )}
          </AbbyCard>
        )}

        {step === 1 && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{GENERATING_MESSAGES[msgIndex]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
              <p className="text-xs text-muted-foreground">This usually takes 30–60 seconds</p>
            </div>
          </AbbyCard>
        )}

        {step === 2 && content && <ReviewStep content={content} authorName={authorName} onActivate={handlePublish} />}

        {step === 3 && !content?.activated && (
          <AbbyCard>
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium animate-pulse">{ACTIVATING_MESSAGES[msgIndex % ACTIVATING_MESSAGES.length]}</p>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-pulse" />
            </div>
          </AbbyCard>
        )}

        {step === 3 && content?.activated && (
          <PublishSuccessScreen
              nodeId="BP-03"
              authorName={authorName}
              penNameSlug={authorSlug}
            />
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function AbbyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-600 text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-500 text-white",
  twitter: "bg-foreground text-background",
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
};

const POST_TYPE_COLORS: Record<string, string> = {
  Quote: "bg-amber-500/10 text-amber-700",
  Tip: "bg-blue-500/10 text-blue-700",
  "Behind the Scenes": "bg-rose-500/10 text-rose-700",
  "Book Excerpt": "bg-purple-500/10 text-purple-700",
  Question: "bg-green-500/10 text-green-700",
  Story: "bg-indigo-500/10 text-indigo-700",
  Announcement: "bg-orange-500/10 text-orange-700",
};

function ReviewStep({ content, authorName, onActivate }: { content: any; authorName: string; onActivate: () => void }) {
  return (
    <div className="space-y-4">
      <AbbyCard>
        <p className="text-muted-foreground">{content.abby_summary}</p>
      </AbbyCard>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="calendar" className="text-xs py-2">
            <Calendar className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs py-2">
            <Hash className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Hashtags
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs py-2">
            <Clock className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs py-2">
            <Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" /> Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-2 mt-4">
          {content.posts?.map((post: any) => (
            <PostCard key={post.day} post={post} />
          ))}
        </TabsContent>

        <TabsContent value="hashtags" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Your Branded Hashtag</h4>
                <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary">{content.hashtag_strategy?.author_hashtag}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Primary Hashtags</h4>
                <div className="flex flex-wrap gap-2">
                  {content.hashtag_strategy?.primary_hashtags?.map((h: string) => (
                    <Badge key={h} variant="secondary" className="text-sm">{h}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Supporting Hashtags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {content.hashtag_strategy?.secondary_hashtags?.map((h: string) => (
                    <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">These hashtags are researched for your specific niche and book topic.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Recommended Days</span>
                <div className="flex gap-2 mt-1">
                  {content.posting_schedule?.recommended_days?.map((d: string) => (
                    <Badge key={d} variant="secondary">{d}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Recommended Time</span>
                <p className="font-medium">{content.posting_schedule?.recommended_time}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Why This Schedule</span>
                <p className="text-sm text-muted-foreground">{content.posting_schedule?.rationale}</p>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">Your posts will be scheduled automatically according to this calendar.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Calendar name</span>
                <span className="text-sm font-medium">{content.calendar_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total posts</span>
                <span className="text-sm font-medium">{content.posts?.length || 30} posts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Platforms</span>
                <span className="text-sm font-medium">LinkedIn, Instagram, Facebook, Twitter/X</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                30 posts ready across 4 platforms (LinkedIn, Instagram, Facebook, Twitter/X).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => toast.info("Manual editing coming soon. Activate now and request changes from ABBY later.")}>
          Edit
        </Button>
        <Button className="flex-1" size="lg" onClick={onActivate}>
          Publish to My Site<ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Your 30-day content calendar will be scheduled automatically. You can review and adjust any post before it goes live.
      </p>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("linkedin");
  const typeColor = POST_TYPE_COLORS[post.post_type] || "bg-muted text-muted-foreground";
  const platformData = post[platform];

  return (
    <Card className="cursor-pointer" onClick={() => setOpen(!open)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">Day {post.day}</span>
              <Badge className={`text-[10px] px-1.5 py-0 ${typeColor}`}>{post.post_type}</Badge>
            </div>
            <p className="font-medium text-sm truncate">{post.theme}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              {(["linkedin", "instagram", "facebook", "twitter"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    platform === p ? PLATFORM_COLORS[p] : "bg-muted text-muted-foreground"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {platformData && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{platformData.caption}</p>
                {platformData.hashtags?.length > 0 && (
                  <p className="text-xs text-primary">{platformData.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// SuccessStep replaced by NodeSuccessScreen
