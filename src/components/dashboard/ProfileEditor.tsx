import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X } from "lucide-react";

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
    genres: [],
  });

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("author_profiles")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
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
        genres: (data.genres as string[]) || [],
      });
    }
    setLoading(false);
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
        },
        { onConflict: "user_id" }
      );

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
    }
    setSaving(false);
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

      {/* Identity */}
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

      {/* Social Links */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Links & Social</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "website_url", label: "Website", placeholder: "https://yoursite.com" },
            { id: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
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
