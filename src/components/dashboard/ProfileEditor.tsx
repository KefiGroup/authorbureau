import { useEffect, useState, useRef, useCallback } from "react";
import FrameworksEditor, { type AuthorFramework } from "@/components/dashboard/FrameworksEditor";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ExternalLink, MapPin, Globe, Linkedin,
  Twitter, Instagram, Youtube, BookOpen, RefreshCw, KeyRound,
  PlusCircle, Pencil, Trash2, Briefcase, Save, Camera, X, Download,
} from "lucide-react";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";

// ── Genre options ──
const GENRE_OPTIONS = [
  "Business", "Self-Help", "Leadership", "Finance", "Marketing",
  "Spirituality", "Health & Wellness", "Parenting", "Education",
  "Technology", "Science", "Psychology", "Memoir", "Fiction",
  "Children's", "Poetry", "History", "Philosophy", "Other",
];

// ── Services Section (unchanged) ──
const SERVICE_TYPES = ["Speaking", "Coaching", "Consulting", "Workshops", "Mentoring", "Other"] as const;

interface AuthorService {
  id: string; type: string; title: string; description: string; rate: string; bookingLink: string;
}

function ServicesSection() {
  const [services, setServices] = useState<AuthorService[]>([]);
  const [editing, setEditing] = useState<AuthorService | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "Speaking", title: "", description: "", rate: "", bookingLink: "" });

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setServices(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
    } else {
      setServices(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    }
    setForm({ type: "Speaking", title: "", description: "", rate: "", bookingLink: "" });
    setEditing(null);
    setShowForm(false);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-heading text-lg font-semibold">Services & Expertise</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setEditing(null); setForm({ type: "Speaking", title: "", description: "", rate: "", bookingLink: "" }); setShowForm(!showForm); }}>
          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Service
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Service Type</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Service Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Executive Coaching" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what this service includes..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Price / Rate</Label>
              <Input value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="e.g. $500/hour" />
            </div>
            <div>
              <Label className="text-xs">Booking Link (optional)</Label>
              <Input value={form.bookingLink} onChange={e => setForm(f => ({ ...f, bookingLink: e.target.value }))} placeholder="https://calendly.com/..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>{editing ? "Update" : "Add"} Service</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {services.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">No services added yet. Add your speaking, coaching, or consulting offerings.</p>
      )}

      {services.length > 0 && (
        <div className="grid gap-3">
          {services.map(s => (
            <div key={s.id} className="rounded-lg border border-border p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{s.type}</span>
                  <h4 className="font-heading font-semibold text-sm">{s.title}</h4>
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                {s.rate && <p className="text-xs font-medium mt-1">{s.rate}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setForm({ type: s.type, title: s.title, description: s.description, rate: s.rate, bookingLink: s.bookingLink }); setEditing(s); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setServices(prev => prev.filter(x => x.id !== s.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Profile data shape ──
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
  directory_status: string;
  author_slug: string;
}

const EMPTY_PROFILE: AuthorProfile = {
  pen_name: "", bio_short: "", bio_long: "", tagline: "", photo_url: "",
  location_city: "", location_country: "", website_url: "", linkedin_url: "",
  twitter_url: "", instagram_url: "", youtube_url: "", amazon_author_profile_url: "",
  genres: [], directory_status: "unlisted", author_slug: "",
};

interface ProfileEditorProps {
  onNavigate?: (section: string) => void;
}

export default function ProfileEditor({ onNavigate }: ProfileEditorProps) {
  const { user, tier } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [profile, setProfile] = useState<AuthorProfile>(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [frameworks, setFrameworks] = useState<AuthorFramework[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = async (): Promise<string | null> => {
    const { data: sharedSession } = await sharedSupabase.auth.getSession();
    if (sharedSession?.session?.access_token) return sharedSession.session.access_token;
    const { data: cloudSession } = await supabase.auth.getSession();
    return cloudSession?.session?.access_token || null;
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "fetch" }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch profile");

      const data = result.profile;
      if (data) {
        setProfileExists(true);
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
          amazon_author_profile_url: data.amazon_author_profile_url || "",
          genres: (data.genres as string[]) || [],
          directory_status: data.directory_status || "unlisted",
          author_slug: data.author_slug || "",
        });
        setFrameworks(Array.isArray(data.frameworks) ? data.frameworks : []);
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchProfile();
  }, [user, fetchProfile]);

  // ── Save profile via edge function ──
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      let slug = (profile.author_slug || profile.pen_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).replace(/(^-|-$)/g, "");

      const payload = {
        pen_name: profile.pen_name.trim(),
        bio_short: profile.bio_short.trim(),
        bio_long: profile.bio_long.trim(),
        tagline: profile.tagline.trim(),
        photo_url: profile.photo_url,
        location_city: profile.location_city.trim(),
        location_country: profile.location_country.trim(),
        website_url: profile.website_url.trim(),
        linkedin_url: profile.linkedin_url.trim(),
        twitter_url: profile.twitter_url.trim(),
        instagram_url: profile.instagram_url.trim(),
        youtube_url: profile.youtube_url.trim(),
        amazon_author_profile_url: profile.amazon_author_profile_url.trim(),
        genres: profile.genres,
        author_slug: slug,
        frameworks: frameworks as any,
      };

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-author-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "save", payload }),
        }
      );
      const result = await res.json();

      if (res.status === 409) {
        toast({ title: "Slug already taken", description: `The URL "authorsbureau.com/${slug}" is already in use. Please choose a different one.`, variant: "destructive" });
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error(result.error || "Save failed");

      setProfileExists(true);
      setProfile(prev => ({ ...prev, author_slug: slug }));
      setEditMode(false);
      toast({ title: "Profile saved! ✅" });

      // Silently provision GHL sub-account (fire and forget)
      if (result.profile?.id) {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-provision-author`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ author_id: result.profile.id }),
          }
        ).catch(() => {}); // Silent — author never sees this
      }
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Sync from PublishNow (legacy, with feedback) ──
  const handleSync = async () => {
    setSyncing(true);
    try {
      let token: string | null = null;
      const { data: sharedSession } = await sharedSupabase.auth.getSession();
      if (sharedSession?.session?.access_token) {
        token = sharedSession.session.access_token;
      } else {
        const { data: cloudSession } = await supabase.auth.getSession();
        token = cloudSession?.session?.access_token || null;
      }
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-author-profile`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");

      toast({ title: "Profile synced successfully! ✅", description: "Your PublishNow data has been imported." });
      await fetchProfile();
    } catch (err) {
      toast({ title: "Sync failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Photo upload ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage.from("author-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("author-photos").getPublicUrl(path);
      setProfile(prev => ({ ...prev, photo_url: publicUrl }));
      toast({ title: "Photo uploaded! 📸" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Genre toggle ──
  const toggleGenre = (genre: string) => {
    setProfile(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre],
    }));
  };

  const handleEditOnPublishNow = async () => {
    const result = await redirectToPublishNow("/profile");
    if (result.error) {
      toast({ title: "Redirect failed", description: result.fallbackUrl ? "Opening PublishNow directly…" : result.error, variant: "destructive" });
      if (result.fallbackUrl) window.open(result.fallbackUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── New profile: show setup instructions ──
  if (!profileExists && !editMode) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Pencil className="h-7 w-7 text-secondary" />
          </div>
          <h2 className="font-heading text-2xl font-bold">Set Up Your Author Profile</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your author profile is managed on PublishNow.io and synced here to power your directory listing and public website.
          </p>
        </div>

        {/* Two routes */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Route 1: Already have a profile */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-secondary">
              <Download className="h-5 w-5 shrink-0" />
              <h3 className="font-heading font-bold text-base">Already have a PublishNow profile?</h3>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Click <strong>"Sync from PublishNow"</strong> below.</li>
              <li>Your profile data will be imported automatically.</li>
              <li>Review your profile and you're all set!</li>
            </ol>
            <Button variant="outline" className="w-full mt-2" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {syncing ? "Syncing..." : "Sync from PublishNow"}
            </Button>
          </div>

          {/* Route 2: Need to create a profile */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-secondary">
              <PlusCircle className="h-5 w-5 shrink-0" />
              <h3 className="font-heading font-bold text-base">New to PublishNow?</h3>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Click <strong>"Create on PublishNow"</strong> below.</li>
              <li>Fill in your author details on PublishNow.io.</li>
              <li>Come back here and click <strong>"Sync from PublishNow"</strong> to import your profile.</li>
            </ol>
            <Button className="w-full mt-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleEditOnPublishNow}>
              <PlusCircle className="h-4 w-4 mr-2" /> Create on PublishNow
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const approvedStatuses = ["listed", "verified", "featured"];
  const isApproved = approvedStatuses.includes(profile.directory_status);
  const statusLabel = isApproved
    ? profile.directory_status.charAt(0).toUpperCase() + profile.directory_status.slice(1)
    : profile.directory_status === "unlisted" ? "Awaiting Approval" : "Unlisted";
  const statusColor = isApproved
    ? profile.directory_status === "featured" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
    : "bg-muted text-muted-foreground";

  // ── Edit mode (also used for new profiles) ──
  if (editMode || !profileExists) {
    return (
      <div className="max-w-3xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">{profileExists ? "Edit Profile" : "Create Your Profile"}</h2>
            <p className="text-sm text-muted-foreground mt-1">Fill in your author details below.</p>
          </div>
          <div className="flex gap-2">
            {profileExists && (
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); fetchProfile(); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving || !profile.pen_name.trim()} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>

        {/* Photo */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Profile Photo</h3>
          <div className="flex items-center gap-4">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              {profile.photo_url && (
                <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => setProfile(prev => ({ ...prev, photo_url: "" }))}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Basic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Author / Pen Name *</Label>
              <Input value={profile.pen_name} onChange={e => setProfile(prev => ({ ...prev, pen_name: e.target.value }))} placeholder="Your author name" />
            </div>
            <div>
              <Label className="text-xs">Profile URL Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">authorsbureau.com/</span>
                <Input
                  value={profile.author_slug}
                  onChange={e => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
                    setProfile(prev => ({ ...prev, author_slug: val }));
                  }}
                  placeholder="your-name"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase letters, numbers, and hyphens only. Leave blank to auto-generate from your name.</p>
            </div>
            <div>
              <Label className="text-xs">Tagline</Label>
              <Input value={profile.tagline} onChange={e => setProfile(prev => ({ ...prev, tagline: e.target.value }))} placeholder="e.g. Bestselling author of..." />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={profile.location_city} onChange={e => setProfile(prev => ({ ...prev, location_city: e.target.value }))} placeholder="City" />
            </div>
            <div>
              <Label className="text-xs">Country</Label>
              <Input value={profile.location_country} onChange={e => setProfile(prev => ({ ...prev, location_country: e.target.value }))} placeholder="Country" />
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">About You</h3>
          <div>
            <Label className="text-xs">Short Bio (1-2 sentences)</Label>
            <Textarea value={profile.bio_short} onChange={e => setProfile(prev => ({ ...prev, bio_short: e.target.value }))} placeholder="A brief introduction..." rows={2} />
          </div>
          <div>
            <Label className="text-xs">Full Bio</Label>
            <Textarea value={profile.bio_long} onChange={e => setProfile(prev => ({ ...prev, bio_long: e.target.value }))} placeholder="Tell your story in detail..." rows={5} />
          </div>
        </section>

        {/* Genres */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Genres & Expertise</h3>
          <p className="text-xs text-muted-foreground">Select all that apply.</p>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map(genre => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  profile.genres.includes(genre)
                    ? "bg-secondary/15 text-secondary border-secondary/30"
                    : "bg-background text-muted-foreground border-border hover:border-secondary/30"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Social Links */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">Social Links</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Website</Label>
              <Input value={profile.website_url} onChange={e => setProfile(prev => ({ ...prev, website_url: e.target.value }))} placeholder="https://yoursite.com" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
              <Input value={profile.linkedin_url} onChange={e => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Twitter className="h-3 w-3" /> X / Twitter</Label>
              <Input value={profile.twitter_url} onChange={e => setProfile(prev => ({ ...prev, twitter_url: e.target.value }))} placeholder="https://x.com/..." />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
              <Input value={profile.instagram_url} onChange={e => setProfile(prev => ({ ...prev, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Youtube className="h-3 w-3" /> YouTube</Label>
              <Input value={profile.youtube_url} onChange={e => setProfile(prev => ({ ...prev, youtube_url: e.target.value }))} placeholder="https://youtube.com/@..." />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><BookOpen className="h-3 w-3" /> Amazon Author Page</Label>
              <Input value={profile.amazon_author_profile_url} onChange={e => setProfile(prev => ({ ...prev, amazon_author_profile_url: e.target.value }))} placeholder="https://amazon.com/author/..." />
            </div>
          </div>
        </section>

        {/* Frameworks */}
        <section className="rounded-xl border border-border bg-card p-6">
          <FrameworksEditor frameworks={frameworks} onChange={setFrameworks} />
        </section>

        {/* Save button at bottom */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving || !profile.pen_name.trim()} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    );
  }

  // ── View mode (profile exists, not editing) ──
  const socialLinks = [
    { url: profile.website_url, icon: Globe, label: "Website" },
    { url: profile.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: profile.twitter_url, icon: Twitter, label: "X / Twitter" },
    { url: profile.instagram_url, icon: Instagram, label: "Instagram" },
    { url: profile.youtube_url, icon: Youtube, label: "YouTube" },
    { url: profile.amazon_author_profile_url, icon: BookOpen, label: "Amazon Author" },
  ].filter(l => l.url);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your profile is managed on PublishNow.io and synced here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {syncing ? "Syncing..." : "Sync"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit Profile
          </Button>
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleEditOnPublishNow}>
            <ExternalLink className="h-4 w-4 mr-1" /> Edit on PublishNow
          </Button>
        </div>
      </div>

      {/* How it works instructions */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold">How Your Profile Works</h3>
        <p className="text-sm text-muted-foreground">
          Your author profile lives on <strong>PublishNow.io</strong> and is synced back to Authors Bureau. Follow the route that applies to you:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Route 1 */}
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700 p-5 space-y-2">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Route 1 — Already on PublishNow</p>
            <ol className="text-sm text-emerald-900/80 dark:text-emerald-200/80 space-y-1.5 list-decimal list-inside">
              <li>Click <strong>"Sync"</strong> above to pull your existing profile.</li>
              <li>To edit, click <strong>"Edit on PublishNow"</strong>, make changes, then come back and <strong>Sync</strong> again.</li>
            </ol>
          </div>

          {/* Route 2 */}
          <div className="rounded-lg border-2 border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-700 p-5 space-y-2">
            <p className="text-sm font-bold text-sky-800 dark:text-sky-300">Route 2 — New to PublishNow</p>
            <ol className="text-sm text-sky-900/80 dark:text-sky-200/80 space-y-1.5 list-decimal list-inside">
              <li>Click <strong>"Edit on PublishNow"</strong> — you'll be signed in automatically.</li>
              <li>Complete your profile (name, photo, bio, links).</li>
              <li>Go to <strong>Settings → Set Password</strong> on PublishNow to secure your account.</li>
              <li>Come back here and click <strong>"Sync"</strong> to pull your profile.</li>
            </ol>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          💡 <strong>Tip:</strong> After your first sign-in on PublishNow, go to <strong>Settings → Set Password</strong> to create a password for direct access anytime.
        </p>
      </section>

      {/* Profile Card */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.pen_name} className="h-24 w-24 rounded-full object-cover border-2 border-border shrink-0" />
          ) : (
            <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted shrink-0">
              <span className="text-2xl font-bold text-muted-foreground">{profile.pen_name?.[0]?.toUpperCase() || "?"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-heading text-xl font-bold">{profile.pen_name || "No name set"}</h3>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
            </div>
            {profile.tagline && <p className="text-muted-foreground text-sm mt-1">{profile.tagline}</p>}
            {(profile.location_city || profile.location_country) && (
              <p className="text-muted-foreground text-xs mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[profile.location_city, profile.location_country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      {(profile.bio_short || profile.bio_long) && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-lg font-semibold">About</h3>
          {profile.bio_short && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Short Bio</p>
              <p className="text-sm">{profile.bio_short.replace(/<[^>]+>/g, "")}</p>
            </div>
          )}
          {profile.bio_long && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Full Bio</p>
              <p className="text-sm whitespace-pre-line">{profile.bio_long.replace(/<[^>]+>/g, "")}</p>
            </div>
          )}
        </section>
      )}

      {/* Genres */}
      {profile.genres.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-heading text-lg font-semibold">Genres & Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {profile.genres.map(genre => (
              <span key={genre} className="rounded-full px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border border-primary/20">{genre}</span>
            ))}
          </div>
        </section>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-heading text-lg font-semibold">Links & Social</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {socialLinks.map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50 transition-colors">
                <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{link.label}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      <ServicesSection />

      {/* Frameworks */}
      {profileExists && (
        <section className="rounded-xl border border-border bg-card p-6">
          <FrameworksEditor frameworks={frameworks} onChange={setFrameworks} />
        </section>
      )}
    </div>
  );
}
