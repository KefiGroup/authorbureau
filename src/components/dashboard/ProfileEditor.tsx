import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles } from "lucide-react";

interface AuthorProfile {
  pen_name: string;
  bio_short: string;
  bio_long: string;
  tagline: string;
  photo_url: string;
  location_city: string;
  location_country: string;
  website_url: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  youtube_url: string;
  amazon_author_profile_url: string;
  genres: string[];
}

const GENRE_OPTIONS = [
  "Business", "Self-Help", "Finance", "Leadership", "Health & Wellness",
  "Parenting", "Fiction", "Memoir", "Technology", "Education",
  "Spirituality", "Science", "Travel", "Cooking", "Children's",
];

export default function ProfileEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [profile, setProfile] = useState<AuthorProfile>({
    pen_name: "",
    bio_short: "",
    bio_long: "",
    tagline: "",
    photo_url: "",
    location_city: "",
    location_country: "",
    website_url: "",
    linkedin_url: "",
    twitter_url: "",
    instagram_url: "",
    youtube_url: "",
    amazon_author_profile_url: "",
    genres: [],
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => setLoading(false), 8000);
    fetchProfile().finally(() => clearTimeout(timeout));
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else if (data) {
        setProfile({
          pen_name: data.pen_name || "",
          bio_short: data.bio_short || "",
          bio_long: data.bio_long || "",
          tagline: data.tagline || "",
          photo_url: data.photo_url || "",
          location_city: data.location_city || "",
          location_country: data.location_country || "",
          website_url: data.website_url || "",
          linkedin_url: data.linkedin_url || "",
          twitter_url: data.twitter_url || "",
          instagram_url: data.instagram_url || "",
          youtube_url: data.youtube_url || "",
          amazon_author_profile_url: (data as any).amazon_author_profile_url || "",
          genres: (data.genres as string[]) || [],
        });
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("author_profiles")
      .upsert(
        {
          user_id: user.id,
          ...profile,
        } as any,
        { onConflict: "user_id" }
      );

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
    }
    setSaving(false);
  };

  const handleGenerateBio = async () => {
    if (!profile.pen_name) {
      toast({ title: "Please enter your name first", variant: "destructive" });
      return;
    }
    if (!profile.linkedin_url && !profile.amazon_author_profile_url) {
      toast({ title: "Please provide a LinkedIn or Amazon Author Profile URL", variant: "destructive" });
      return;
    }

    setGeneratingBio(true);
    try {
      const response = await supabase.functions.invoke("ai-author-tools", {
        body: {
          toolType: "speaker",
          bookTitle: profile.pen_name,
          bookDescription: `Generate ONLY two bios for this author based on their online profiles. Author name: ${profile.pen_name}. LinkedIn: ${profile.linkedin_url || "N/A"}. Amazon Author Profile: ${profile.amazon_author_profile_url || "N/A"}. Genres: ${profile.genres.join(", ") || "N/A"}.`,
          authorName: profile.pen_name,
          additionalContext: `IMPORTANT: Instead of a speaker kit, generate exactly two things:
1. SHORT BIO (2-3 sentences, suitable for cards & previews)
2. FULL BIO (200-300 words, comprehensive author story)

Format as:
## Short Bio
[bio here]

## Full Bio
[bio here]`,
        },
      });

      if (response.error) throw response.error;

      // Parse SSE stream
      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {}
          }
        }
      }

      // Parse short and full bios
      const shortMatch = fullText.match(/## Short Bio\s*\n([\s\S]*?)(?=## Full Bio|$)/i);
      const fullMatch = fullText.match(/## Full Bio\s*\n([\s\S]*?)$/i);

      if (shortMatch) {
        updateField("bio_short", shortMatch[1].trim());
      }
      if (fullMatch) {
        updateField("bio_long", fullMatch[1].trim());
      }

      if (shortMatch || fullMatch) {
        toast({ title: "Bios generated! ✨", description: "Review and edit as needed before saving." });
      } else {
        toast({ title: "Could not parse generated bios", description: "Please try again.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Bio generation failed:", err);
      toast({ title: "Bio generation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setGeneratingBio(false);
    }
  };

  const updateField = (field: keyof AuthorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (genre: string) => {
    setProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This information appears on your public author page and directory listing.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Identity — name, links for AI, then bios */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pen_name">Pen Name / Display Name</Label>
            <Input
              id="pen_name"
              value={profile.pen_name}
              onChange={(e) => updateField("pen_name", e.target.value)}
              placeholder="Your public author name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={profile.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              placeholder="e.g. Author, Speaker, Entrepreneur"
            />
          </div>
        </div>

        {/* LinkedIn & Amazon — moved up for AI context */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
            <Input
              id="linkedin_url"
              value={profile.linkedin_url}
              onChange={(e) => updateField("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amazon_author_profile_url">Amazon Author Profile URL</Label>
            <Input
              id="amazon_author_profile_url"
              value={profile.amazon_author_profile_url}
              onChange={(e) => updateField("amazon_author_profile_url", e.target.value)}
              placeholder="https://amazon.com/author/..."
            />
          </div>
        </div>

        {/* AI Generate Bio button */}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            Fill in your name and at least one profile URL above, then let AI draft your bios.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateBio}
            disabled={generatingBio}
            className="shrink-0"
          >
            {generatingBio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Bios
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio_short">Short Bio (for cards & previews)</Label>
          <Textarea
            id="bio_short"
            value={profile.bio_short}
            onChange={(e) => updateField("bio_short", e.target.value)}
            placeholder="A brief 1-2 sentence bio"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_long">Full Bio</Label>
          <Textarea
            id="bio_long"
            value={profile.bio_long}
            onChange={(e) => updateField("bio_long", e.target.value)}
            placeholder="Your complete author story, background, and mission"
            rows={6}
          />
        </div>
      </section>

      {/* Photo & Location */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Photo & Location</h3>
        <div className="space-y-2">
          <Label htmlFor="photo_url">Profile Photo URL</Label>
          <Input
            id="photo_url"
            value={profile.photo_url}
            onChange={(e) => updateField("photo_url", e.target.value)}
            placeholder="https://..."
          />
          {profile.photo_url && (
            <img
              src={profile.photo_url}
              alt="Profile preview"
              className="mt-2 h-24 w-24 rounded-full object-cover border-2 border-border"
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location_city">City</Label>
            <Input
              id="location_city"
              value={profile.location_city}
              onChange={(e) => updateField("location_city", e.target.value)}
              placeholder="Singapore"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_country">Country</Label>
            <Input
              id="location_country"
              value={profile.location_country}
              onChange={(e) => updateField("location_country", e.target.value)}
              placeholder="Singapore"
            />
          </div>
        </div>
      </section>

      {/* Genres */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold">Genres & Expertise</h3>
        <p className="text-sm text-muted-foreground">Select all that apply to your books and expertise.</p>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                profile.genres.includes(genre)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Social Links (remaining) */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Other Links & Social</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "website_url", label: "Website", placeholder: "https://yoursite.com" },
            { id: "twitter_url", label: "X / Twitter", placeholder: "https://x.com/..." },
            { id: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/..." },
            { id: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@..." },
          ].map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                value={profile[field.id as keyof AuthorProfile] as string}
                onChange={(e) => updateField(field.id as keyof AuthorProfile, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
