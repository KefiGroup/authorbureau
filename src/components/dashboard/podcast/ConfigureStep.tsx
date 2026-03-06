import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Loader2 } from "lucide-react";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";
import type { PodcastConfig, EpisodeFormat } from "./types";
import { FORMAT_LABELS, MONETIZATION_OPTIONS } from "./types";

interface Book { id: string; title: string; cover_image_url: string | null; }

interface Props {
  config: PodcastConfig;
  onConfigChange: (config: PodcastConfig) => void;
  onNext: () => void;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

const TONES = ["Conversational", "Educational", "Inspirational", "Storytelling", "Humorous", "Professional"];
const EPISODE_COUNTS = [6, 8, 10, 12, 15, 20];

export default function PodcastConfigureStep({ config, onConfigChange, onNext }: Props) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) { setBooks([]); setLoading(false); return; }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "list" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setBooks((result.books || []).map((b: any) => ({ id: b.id, title: b.title, cover_image_url: b.cover_image_url ?? null })));
      } catch (error) { console.error("Failed to load books:", error); setBooks([]); } finally { setLoading(false); }
    })();
  }, [user]);

  const update = (partial: Partial<PodcastConfig>) => onConfigChange({ ...config, ...partial });

  const toggleGoal = (goal: string) => {
    const arr = config.monetizationGoals.includes(goal)
      ? config.monetizationGoals.filter(g => g !== goal)
      : [...config.monetizationGoals, goal];
    update({ monetizationGoals: arr });
  };

  const isValid = config.bookId && config.podcastTitle.trim() && config.episodeCount >= 6;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Abby's Podcast Configuration Strategy"
        expandedByDefault
        tips={[
          "🎯 Episode Count: 8-12 episodes is the sweet spot for a first season. Enough to build momentum, not so many that quality drops.",
          "🔀 Format Mix: Let Abby pick the best format per episode. Solo teaching works for frameworks, interview Q&A for stories, deep dives for complex topics.",
          "💰 Monetization: Select all goals that apply. Abby will weave revenue touchpoints naturally into scripts — not as awkward ads, but as organic value-adds.",
          "🎤 Podcast Title: Use your book title + a descriptor. Example: 'Be SUCKcessful: The Anti-Hustle Podcast' — makes it discoverable and branded.",
        ]}
      />

      {/* Book Selector (hidden when pre-selected) */}
      {!config.bookId && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Select Book</CardTitle></CardHeader>
          <CardContent>
            {books.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books found. Add a book first.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {books.map(book => (
                  <button key={book.id} onClick={() => update({ bookId: book.id, bookTitle: book.title, bookCoverUrl: book.cover_image_url, podcastTitle: book.title + " Podcast" })}
                    className={`relative rounded-xl border-2 p-2 transition-all text-left ${config.bookId === book.id ? "border-secondary ring-2 ring-secondary/30 bg-secondary/5" : "border-border hover:border-muted-foreground/30"}`}>
                    <div className="aspect-[2/3] rounded-lg bg-muted overflow-hidden mb-2">
                      {book.cover_image_url ? <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-8 w-8 text-muted-foreground/40" /></div>}
                    </div>
                    <p className="text-xs font-medium truncate">{book.title}</p>
                    {config.bookId === book.id && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-secondary flex items-center justify-center"><span className="text-secondary-foreground text-[10px] font-bold">✓</span></div>}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Podcast Title */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Podcast Title</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input value={config.podcastTitle} onChange={e => update({ podcastTitle: e.target.value })} placeholder="e.g. Be SUCKcessful: The Anti-Hustle Podcast" className="text-sm" />
          <p className="text-xs text-muted-foreground">This appears in Spotify, Apple Podcasts, and all directories.</p>
        </CardContent>
      </Card>

      {/* Episode Count & Format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Episode Count</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {EPISODE_COUNTS.map(n => (
                <Button key={n} variant={config.episodeCount === n ? "default" : "outline"} size="sm" onClick={() => update({ episodeCount: n })} className={config.episodeCount === n ? "bg-primary" : ""}>
                  {n} episodes
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Episode Format</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant={config.formatPreference === "mix" ? "default" : "outline"} size="sm" onClick={() => update({ formatPreference: "mix" })} className={config.formatPreference === "mix" ? "bg-primary" : ""}>
                🔀 AI Picks Best
              </Button>
              {(Object.entries(FORMAT_LABELS) as [EpisodeFormat, string][]).map(([key, label]) => (
                <Button key={key} variant={config.formatPreference === key ? "default" : "outline"} size="sm" onClick={() => update({ formatPreference: key })} className={config.formatPreference === key ? "bg-primary" : ""}>
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tone */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Tone of Voice</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TONES.map(t => (
              <button key={t} onClick={() => update({ tone: t })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${config.tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-muted-foreground/40"}`}>
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Target Audience</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={config.targetAudience} onChange={e => update({ targetAudience: e.target.value })} placeholder="e.g. Aspiring entrepreneurs aged 25-45 who want to build successful businesses without burning out" rows={2} className="text-sm" />
        </CardContent>
      </Card>

      {/* Monetization Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Monetization Goals</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Select all that apply. Abby weaves these naturally into episode scripts.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MONETIZATION_OPTIONS.map(opt => (
              <label key={opt.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${config.monetizationGoals.includes(opt.id) ? "border-secondary bg-secondary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <Checkbox checked={config.monetizationGoals.includes(opt.id)} onCheckedChange={() => toggleGoal(opt.id)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!isValid} className="bg-primary px-8">
          Generate Episodes →
        </Button>
      </div>
    </div>
  );
}
