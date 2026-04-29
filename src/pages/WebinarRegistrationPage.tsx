import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Video, Loader2, CheckCircle2, Clock } from "lucide-react";
import MicrositePoweredByFooter from "@/components/public/MicrositePoweredByFooter";
import { toast } from "sonner";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  status: string;
  author_id: string;
}

interface Author {
  pen_name: string | null;
  photo_url: string | null;
  bio_short: string | null;
  author_slug: string | null;
}

export default function WebinarRegistrationPage() {
  const { authorSlug, slug } = useParams<{ authorSlug: string; slug: string }>();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authorSlug || !slug) return;
      setLoading(true);
      const { data: a } = await supabase
        .from("author_profiles")
        .select("id, pen_name, photo_url, bio_short, author_slug")
        .eq("author_slug", authorSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!a) { setLoading(false); return; }
      setAuthor(a as any);
      const { data: w } = await supabase
        .from("webinars")
        .select("id, title, description, scheduled_at, duration_minutes, cover_image_url, status, author_id, slug")
        .eq("author_id", a.id)
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setWebinar(w as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authorSlug, slug]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webinar) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("webinar-register", {
        body: { webinar_id: webinar.id, email, name },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      setRegistered(true);
      toast.success("You're registered! Check your email for confirmation.");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>;
  }

  if (!webinar || !author || (webinar.status !== "published" && webinar.status !== "live")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Webinar not available</h1>
          <p className="text-muted-foreground mb-6">This webinar may have ended or isn't open for registration yet.</p>
          {author?.author_slug && (
            <Link to={`/${author.author_slug}`}><Button variant="outline">Back to {author.pen_name}'s page</Button></Link>
          )}
        </div>
      </div>
    );
  }

  const scheduled = webinar.scheduled_at ? new Date(webinar.scheduled_at) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Video className="h-3.5 w-3.5" /> Live Webinar
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4 leading-tight">{webinar.title}</h1>
          {webinar.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{webinar.description}</p>
          )}
          {scheduled && (
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />
                {scheduled.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" />
                {scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
              </div>
              {webinar.duration_minutes && <div>{webinar.duration_minutes} min</div>}
            </div>
          )}
        </div>

        <Card className="max-w-xl mx-auto shadow-lg">
          <CardContent className="p-8">
            {registered ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="font-heading text-2xl font-bold mb-2">You're registered!</h2>
                <p className="text-muted-foreground mb-6">We've sent a confirmation to <strong>{email}</strong>. You'll get reminders 24h, 1h, and 15min before we start.</p>
                {author.author_slug && (
                  <Link to={`/${author.author_slug}`}>
                    <Button variant="outline">Explore more from {author.pen_name}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <h2 className="font-heading text-xl font-bold mb-2">Save your spot</h2>
                <p className="text-sm text-muted-foreground mb-4">Free registration. Get the room link plus reminders.</p>
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reserving…</> : "Reserve my spot →"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {author && (
          <div className="mt-12 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Hosted by</p>
            <div className="flex items-center justify-center gap-3">
              {author.photo_url && <img src={author.photo_url} alt={author.pen_name || ""} className="w-12 h-12 rounded-full object-cover" />}
              <div className="text-left">
                <p className="font-semibold">{author.pen_name}</p>
                {author.bio_short && <p className="text-xs text-muted-foreground max-w-md">{author.bio_short}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
      <MicrositePoweredByFooter displayName={author?.pen_name} />
    </div>
  );
}
