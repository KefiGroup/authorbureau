import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarConfig } from "./types";
import { BookOpen, Loader2, X as XIcon } from "lucide-react";
import AbbyCoachingTip from "./AbbyCoachingTip";

interface Book {
  id: string;
  title: string;
  cover_image_url: string | null;
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-600" },
  { id: "instagram", label: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { id: "x", label: "X", color: "bg-foreground" },
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
];

const TONES = ["Professional", "Conversational", "Inspirational", "Educational", "Humorous"];
const CATEGORIES = ["tips", "quotes", "stories", "promotions", "engagement"];

interface Props {
  config: CalendarConfig;
  onConfigChange: (config: CalendarConfig) => void;
  onNext: () => void;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

export default function ConfigureStep({ config, onConfigChange, onNext }: Props) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [emphTag, setEmphTag] = useState("");
  const [avoidTag, setAvoidTag] = useState("");
  const [emphTags, setEmphTags] = useState<string[]>([]);
  const [avoidTags, setAvoidTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) {
          setBooks([]);
          setLoading(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "list" }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to fetch books");

        setBooks((result.books || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          cover_image_url: b.cover_image_url ?? null,
        })));
      } catch (error) {
        console.error("ConfigureStep failed to load books:", error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const update = (partial: Partial<CalendarConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const togglePlatform = (p: string) => {
    const arr = config.platforms.includes(p)
      ? config.platforms.filter(x => x !== p)
      : [...config.platforms, p];
    update({ platforms: arr });
  };

  const toggleTone = (t: string) => {
    const arr = config.tones.includes(t)
      ? config.tones.filter(x => x !== t)
      : [...config.tones, t];
    update({ tones: arr });
  };

  const updateMix = (category: string, value: number) => {
    const newMix = { ...config.contentMix, [category]: value };
    // Auto-balance: adjust others proportionally
    const total = Object.values(newMix).reduce((s, v) => s + v, 0);
    if (total !== 100) {
      const others = CATEGORIES.filter(c => c !== category);
      const otherTotal = others.reduce((s, c) => s + newMix[c], 0);
      if (otherTotal > 0) {
        const scale = (100 - value) / otherTotal;
        others.forEach(c => { newMix[c] = Math.round(newMix[c] * scale); });
        // Fix rounding
        const diff = 100 - Object.values(newMix).reduce((s, v) => s + v, 0);
        if (diff !== 0 && others.length > 0) newMix[others[0]] += diff;
      }
    }
    update({ contentMix: newMix });
  };

  const addTag = (type: "emphasize" | "avoid") => {
    if (type === "emphasize" && emphTag.trim()) {
      const newTags = [...emphTags, emphTag.trim()];
      setEmphTags(newTags);
      setEmphTag("");
      update({ topicsEmphasize: newTags.join(", ") });
    } else if (type === "avoid" && avoidTag.trim()) {
      const newTags = [...avoidTags, avoidTag.trim()];
      setAvoidTags(newTags);
      setAvoidTag("");
      update({ topicsAvoid: newTags.join(", ") });
    }
  };

  const removeTag = (type: "emphasize" | "avoid", idx: number) => {
    if (type === "emphasize") {
      const newTags = emphTags.filter((_, i) => i !== idx);
      setEmphTags(newTags);
      update({ topicsEmphasize: newTags.join(", ") });
    } else {
      const newTags = avoidTags.filter((_, i) => i !== idx);
      setAvoidTags(newTags);
      update({ topicsAvoid: newTags.join(", ") });
    }
  };

  const mixTotal = Object.values(config.contentMix).reduce((s, v) => s + v, 0);
  const isValid = config.bookId && config.platforms.length > 0 && config.tones.length > 0 && mixTotal === 100;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Abby's Strategy Methodology */}
      <AbbyCoachingTip
        title="Your Social Media Strategy Methodology"
        expandedByDefault
        tips={[
          "🎯 80/20 Rule: 80% value content (tips, stories, inspiration) and only 20% promotional. This is the proven ratio that builds trust and drives sales.",
          "📊 5 Content Pillars: Educate (30%) — teach from your book; Inspire (20%) — share transformations; Entertain (15%) — relatable stories; Connect (15%) — ask questions & polls; Promote (20%) — book links, launches, offers.",
          "🏅 Platform-Optimized Formats: LinkedIn → Carousels (278% more engagement than video), Document posts for thought leadership. Instagram → Reels (122% more reach), Carousels (12% more engagement than Reels). Facebook → Photos (44% more engagement than video). X → Text posts (30% more engagement than video), Threads for deep dives.",
          "🪝 Every post uses a scroll-stopping Hook (pattern interrupt, bold claim, or question) + a platform-specific CTA (comment, save, share, click link).",
          "📅 Optimal posting times: LinkedIn 7-8 AM Tue-Thu; Instagram 11 AM-1 PM & 7-9 PM daily; Facebook 1-4 PM Wed-Fri; X 8-10 AM & 6-9 PM weekdays.",
          "🔁 Content Recycling: Your best-performing posts will be repurposed across platforms in different formats (e.g., a LinkedIn carousel → Instagram Reel script → X thread).",
          "#️⃣ Hashtag Strategy: 3-5 niche hashtags per post (avoid generic ones). Mix branded hashtags with topic-specific ones for discoverability.",
          "🚀 Virality Triggers: Controversial takes, personal vulnerability, data-backed insights, 'save this for later' value, and 'tag someone who needs this' CTAs.",
        ]}
      />

      {/* Book Selector — hidden when book is pre-selected from Book Hub */}
      {!config.bookId && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Book</CardTitle>
        </CardHeader>
        <CardContent>
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books found. Add a book first.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {books.map(book => (
                <button
                  key={book.id}
                  onClick={() => update({ bookId: book.id, bookTitle: book.title, bookCoverUrl: book.cover_image_url })}
                  className={`relative rounded-xl border-2 p-2 transition-all text-left ${
                    config.bookId === book.id
                      ? "border-secondary ring-2 ring-secondary/30 bg-secondary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="aspect-[2/3] rounded-lg bg-muted overflow-hidden mb-2">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{book.title}</p>
                  {config.bookId === book.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-secondary-foreground text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Platforms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={config.platforms.includes(p.id)}
                  onCheckedChange={() => togglePlatform(p.id)}
                />
                <div className={`w-3 h-3 rounded-full ${p.color}`} />
                <span className="text-sm font-medium">{p.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Frequency & Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Posting Frequency</CardTitle></CardHeader>
          <CardContent>
            <Select value={config.frequency} onValueChange={v => update({ frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="3x">3x / week</SelectItem>
                <SelectItem value="5x">5x / week</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Duration</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[7, 14, 30].map(d => (
                <Button
                  key={d}
                  variant={config.duration === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => update({ duration: d })}
                  className={config.duration === d ? "bg-primary" : ""}
                >
                  {d} days
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Mix */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Content Mix</CardTitle>
            <Badge variant={mixTotal === 100 ? "secondary" : "destructive"} className="text-xs">
              Total: {mixTotal}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map(cat => (
            <div key={cat} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm capitalize">{cat}</Label>
                <span className="text-xs font-mono text-muted-foreground">{config.contentMix[cat]}%</span>
              </div>
              <Slider
                value={[config.contentMix[cat]]}
                max={100}
                step={5}
                onValueChange={([v]) => updateMix(cat, v)}
                className="w-full"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tone */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Tone of Voice</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => toggleTone(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  config.tones.includes(t)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-muted-foreground/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Topics to Emphasize</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={emphTag}
                onChange={e => setEmphTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("emphasize"))}
                placeholder="Add topic..."
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => addTag("emphasize")}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {emphTags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-green-500/10 text-green-700 rounded-full px-2.5 py-0.5 text-xs">
                  {t}
                  <button onClick={() => removeTag("emphasize", i)}><XIcon className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Topics to Avoid</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={avoidTag}
                onChange={e => setAvoidTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("avoid"))}
                placeholder="Add topic..."
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => addTag("avoid")}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {avoidTags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-red-500/10 text-red-700 rounded-full px-2.5 py-0.5 text-xs">
                  {t}
                  <button onClick={() => removeTag("avoid", i)}><XIcon className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next */}
      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!isValid} className="bg-primary px-8">
          Generate Content →
        </Button>
      </div>
    </div>
  );
}
