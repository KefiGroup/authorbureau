import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ExternalLink, Download, MapPin, Globe, Linkedin,
  Twitter, Instagram, Youtube, BookOpen, RefreshCw, KeyRound,
} from "lucide-react";
import { supabase as sharedSupabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";

function SetPasswordSection() {
  const handleManagePassword = () => {
    redirectToPublishNow("/settings");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-heading text-lg font-semibold">Password & Security</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Password management is handled on PublishNow for security. You can set or change your password there.
      </p>
      <Button variant="outline" size="sm" onClick={handleManagePassword} className="border-secondary/30 text-secondary hover:bg-secondary/10">
        <ExternalLink className="h-4 w-4 mr-1" /> Manage Password on PublishNow
      </Button>
    </section>
  );
}

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
}

const EMPTY_PROFILE: AuthorProfile = {
  pen_name: "", bio_short: "", bio_long: "", tagline: "", photo_url: "",
  location_city: "", location_country: "", website_url: "", linkedin_url: "",
  twitter_url: "", instagram_url: "", youtube_url: "", amazon_author_profile_url: "",
  genres: [], directory_status: "unlisted",
};

interface ProfileEditorProps {
  onNavigate?: (section: string) => void;
}

export default function ProfileEditor({ onNavigate }: ProfileEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [profile, setProfile] = useState<AuthorProfile>(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error("Error fetching profile:", error.message);
      else if (data) {
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
          amazon_author_profile_url: (data as any).amazon_author_profile_url || "",
          genres: (data.genres as string[]) || [],
          directory_status: data.directory_status || "unlisted",
        });
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

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
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");

      toast({ title: "Profile synced ✅" });
      await fetchProfile();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const handleEditOnPublishNow = async () => {
    const result = await redirectToPublishNow("/dashboard");
    if (result.error) {
      window.open("https://publishnow.io/dashboard", "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">No Profile Synced Yet</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Your author profile is managed on PublishNow. Click below to sync it to Authors Bureau, or set up your profile on PublishNow first.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={handleSync} disabled={syncing} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
          <Button variant="outline" onClick={handleEditOnPublishNow}>
            <ExternalLink className="h-4 w-4 mr-2" /> Set Up on PublishNow
          </Button>
        </div>
      </div>
    );
  }

  const statusLabel = profile.directory_status === "listed" ? "Listed" : profile.directory_status === "pending" ? "Pending Review" : "Unlisted";
  const statusColor = profile.directory_status === "listed" ? "bg-emerald-100 text-emerald-800" : profile.directory_status === "pending" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";

  const socialLinks = [
    { url: profile.website_url, icon: Globe, label: "Website" },
    { url: profile.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: profile.twitter_url, icon: Twitter, label: "X / Twitter" },
    { url: profile.instagram_url, icon: Instagram, label: "Instagram" },
    { url: profile.youtube_url, icon: Youtube, label: "YouTube" },
    { url: profile.amazon_author_profile_url, icon: BookOpen, label: "Amazon Author" },
  ].filter((l) => l.url);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">Author Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your profile is managed on PublishNow and synced here automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sync
          </Button>
          <Button size="sm" onClick={handleEditOnPublishNow} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <ExternalLink className="h-4 w-4 mr-1" /> Edit on PublishNow
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.pen_name} className="h-24 w-24 rounded-full object-cover border-2 border-border shrink-0" />
          ) : (
            <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted shrink-0">
              <span className="text-2xl font-bold text-muted-foreground">
                {profile.pen_name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-heading text-xl font-bold">{profile.pen_name || "No name set"}</h3>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            {profile.tagline && (
              <p className="text-muted-foreground text-sm mt-1">{profile.tagline}</p>
            )}
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
              <p className="text-sm">{profile.bio_short}</p>
            </div>
          )}
          {profile.bio_long && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Full Bio</p>
              <p className="text-sm whitespace-pre-line">{profile.bio_long}</p>
            </div>
          )}
        </section>
      )}

      {/* Genres */}
      {profile.genres.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-heading text-lg font-semibold">Genres & Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {profile.genres.map((genre) => (
              <span key={genre} className="rounded-full px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                {genre}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="font-heading text-lg font-semibold">Links & Social</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{link.label}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Set Password */}
      <SetPasswordSection />

      {/* Edit reminder */}
      <div className="rounded-xl border border-dashed border-secondary/40 bg-secondary/5 p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Need to update your profile? All changes are made on <strong>PublishNow</strong> and synced here automatically.
        </p>
        <Button variant="outline" size="sm" onClick={handleEditOnPublishNow} className="mt-3 border-secondary/30 text-secondary hover:bg-secondary/10">
          <ExternalLink className="h-4 w-4 mr-1" /> Edit Profile on PublishNow
        </Button>
      </div>
    </div>
  );
}
