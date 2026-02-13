import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, Upload, X, CloudUpload } from "lucide-react";

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

const EMPTY_PROFILE: AuthorProfile = {
  pen_name: "", bio_short: "", bio_long: "", tagline: "", photo_url: "",
  location_city: "", location_country: "", website_url: "", linkedin_url: "",
  twitter_url: "", instagram_url: "", youtube_url: "", amazon_author_profile_url: "",
  genres: [],
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ProfileEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [profile, setProfile] = useState<AuthorProfile>(EMPTY_PROFILE);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const profileRef = useRef(profile);
  const hasLoadedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync
  profileRef.current = profile;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const timeout = setTimeout(() => setLoading(false), 8000);
    fetchProfile().finally(() => clearTimeout(timeout));
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("author_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) console.error("Error fetching profile:", error.message);
      else if (data) {
        const loaded: AuthorProfile = {
          pen_name: data.pen_name || "", bio_short: data.bio_short || "",
          bio_long: data.bio_long || "", tagline: data.tagline || "",
          photo_url: data.photo_url || "", location_city: data.location_city || "",
          location_country: data.location_country || "", website_url: data.website_url || "",
          linkedin_url: data.linkedin_url || "", twitter_url: data.twitter_url || "",
          instagram_url: data.instagram_url || "", youtube_url: data.youtube_url || "",
          amazon_author_profile_url: (data as any).amazon_author_profile_url || "",
          genres: (data.genres as string[]) || [],
        };
        setProfile(loaded);
        profileRef.current = loaded;
      }
      hasLoadedRef.current = true;
    } catch (err) { console.error("Profile fetch failed:", err); }
    finally { setLoading(false); }
  };

  // Auto-save with debounce
  const debouncedSave = useCallback(() => {
    if (!user || !hasLoadedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("author_profiles")
          .upsert({ user_id: user.id, ...profileRef.current } as any, { onConflict: "user_id" });
        if (error) {
          console.error("Auto-save error:", error.message);
          setSaveStatus("error");
        } else {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch { setSaveStatus("error"); }
    }, 1500);
  }, [user]);

  const updateField = (field: keyof AuthorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    debouncedSave();
  };

  const toggleGenre = (genre: string) => {
    setProfile((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
    debouncedSave();
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/profile.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("author-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("author-photos")
        .getPublicUrl(filePath);

      // Add cache-buster to force refresh
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      updateField("photo_url", urlWithCacheBust);
      toast({ title: "Photo uploaded! ✨" });
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      const shortBio = `${profile.pen_name} is an accomplished author and thought leader specializing in ${profile.genres.length > 0 ? profile.genres[0] : "their craft"}. With a passion for inspiring change and a commitment to excellence, they bring fresh perspectives to every project.`;
      const fullBio = `${profile.pen_name} is a multifaceted author and visionary who has dedicated their career to ${profile.genres.length > 0 ? `exploring the complexities of ${profile.genres.join(", ").toLowerCase()}` : "inspiring and empowering readers worldwide"}.\n\nWith extensive experience and a deep commitment to their craft, ${profile.pen_name} brings authenticity and insight to every page. Their work has touched countless lives, offering practical wisdom wrapped in compelling storytelling.\n\nDrawing from their rich background and unique perspective, they create content that not only educates but transforms. Whether through books, speaking engagements, or mentorship, ${profile.pen_name} continues to make a meaningful impact on their audience and community.`;
      updateField("bio_short", shortBio);
      // Need to set bio_long separately since updateField triggers debounce per call
      setProfile((prev) => ({ ...prev, bio_long: fullBio }));
      debouncedSave();
      toast({ title: "Bios generated! ✨", description: "Review and edit as needed." });
    } catch (err) {
      toast({ title: "Bio generation failed", variant: "destructive" });
    } finally {
      setGeneratingBio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SaveIndicator = () => {
    if (saveStatus === "idle") return null;
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium transition-opacity ${
        saveStatus === "saved" ? "text-emerald-600" : saveStatus === "error" ? "text-destructive" : "text-muted-foreground"
      }`}>
        {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
        {saveStatus === "saved" && <><Check className="h-3 w-3" /> Saved</>}
        {saveStatus === "error" && <><X className="h-3 w-3" /> Error saving</>}
      </div>
    );
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This information appears on your public author page and directory listing.
          </p>
        </div>
        <SaveIndicator />
      </div>

      {/* Identity */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pen_name">Pen Name / Display Name</Label>
            <Input id="pen_name" value={profile.pen_name} onChange={(e) => updateField("pen_name", e.target.value)} placeholder="Your public author name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={profile.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="e.g. Author, Speaker, Entrepreneur" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
            <Input id="linkedin_url" value={profile.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amazon_author_profile_url">Amazon Author Profile URL</Label>
            <Input id="amazon_author_profile_url" value={profile.amazon_author_profile_url} onChange={(e) => updateField("amazon_author_profile_url", e.target.value)} placeholder="https://amazon.com/author/..." />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">Fill in your name and at least one profile URL above, then let AI draft your bios.</p>
          <Button variant="outline" size="sm" onClick={handleGenerateBio} disabled={generatingBio} className="shrink-0">
            {generatingBio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Bios
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_short">Short Bio (for cards & previews)</Label>
          <Textarea id="bio_short" value={profile.bio_short} onChange={(e) => updateField("bio_short", e.target.value)} placeholder="A brief 1-2 sentence bio" rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_long">Full Bio</Label>
          <Textarea id="bio_long" value={profile.bio_long} onChange={(e) => updateField("bio_long", e.target.value)} placeholder="Your complete author story, background, and mission" rows={6} />
        </div>
      </section>

      {/* Photo & Location */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-lg font-semibold">Photo & Location</h3>
        <div className="space-y-3">
          <Label>Profile Photo</Label>
          <div className="flex items-start gap-5">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-2 flex-1">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                {uploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                {profile.photo_url ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
              <div className="space-y-1">
                <Label htmlFor="photo_url" className="text-xs">Or paste a URL</Label>
                <Input id="photo_url" value={profile.photo_url} onChange={(e) => updateField("photo_url", e.target.value)} placeholder="https://..." className="text-xs h-8" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location_city">City</Label>
            <Input id="location_city" value={profile.location_city} onChange={(e) => updateField("location_city", e.target.value)} placeholder="Singapore" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_country">Country</Label>
            <Input id="location_country" value={profile.location_country} onChange={(e) => updateField("location_country", e.target.value)} placeholder="Singapore" />
          </div>
        </div>
      </section>

      {/* Genres */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold">Genres & Expertise</h3>
        <p className="text-sm text-muted-foreground">Select all that apply to your books and expertise.</p>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => (
            <button key={genre} onClick={() => toggleGenre(genre)} className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              profile.genres.includes(genre)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}>{genre}</button>
          ))}
        </div>
      </section>

      {/* Social Links */}
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
              <Input id={field.id} value={profile[field.id as keyof AuthorProfile] as string} onChange={(e) => updateField(field.id as keyof AuthorProfile, e.target.value)} placeholder={field.placeholder} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
