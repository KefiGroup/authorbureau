import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Video, Loader2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MicrositePoweredByFooter from "@/components/public/MicrositePoweredByFooter";

interface Author {
  id: string;
  user_id: string;
  pen_name: string | null;
  photo_url: string | null;
  bio_short: string | null;
  author_slug: string | null;
}

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  status: string;
  slug: string | null;
  is_free: boolean | null;
  price: number | null;
  currency: string | null;
}

export default function WebinarIndexPage() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authorSlug) return;
      setLoading(true);
      const { data: a } = await supabase
        .from("author_profiles")
        .select("id, user_id, pen_name, photo_url, bio_short, author_slug")
        .eq("author_slug", authorSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!a) {
        setLoading(false);
        return;
      }
      setAuthor(a as Author);
      const { data: w } = await supabase
        .from("webinars")
        .select(
          "id, title, description, scheduled_at, duration_minutes, cover_image_url, status, slug, is_free, price, currency"
        )
        .eq("author_id", a.id)
        .in("status", ["live", "active", "scheduled", "published"])
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      setWebinars((w as Webinar[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authorSlug]);

  useEffect(() => {
    document.title = author?.pen_name
      ? `Webinars · ${author.pen_name}`
      : "Webinars";
  }, [author]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3 text-foreground">Author not found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn't locate this author profile.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm font-medium">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const displayName = author.pen_name ?? "Author";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center gap-5">
          {author.photo_url && (
            <img
              src={author.photo_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border border-border"
            />
          )}
          <div className="min-w-0">
            <Link
              to={`/${author.author_slug}`}
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              {displayName}
            </Link>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-1">
              Live Webinars
            </h1>
            {author.bio_short && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {author.bio_short}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {webinars.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Video className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No live webinars right now
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                {displayName} hasn't announced an upcoming session yet. Check back soon or follow
                along for updates.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/${author.author_slug}`}>Visit {displayName}'s site</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {webinars.map((w) => {
              const date = w.scheduled_at ? new Date(w.scheduled_at) : null;
              const linkSlug = w.slug ?? w.id;
              return (
                <Link
                  key={w.id}
                  to={`/${author.author_slug}/webinar/${linkSlug}`}
                  className="group"
                >
                  <Card className="overflow-hidden border hover:border-primary/50 hover:shadow-md transition-all h-full">
                    {w.cover_image_url && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={w.cover_image_url}
                          alt={w.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                        <Video className="h-3.5 w-3.5" />
                        {w.is_free === false && w.price ? (
                          <span>
                            {w.currency || "USD"} ${Number(w.price).toFixed(0)}
                          </span>
                        ) : (
                          <span>Free webinar</span>
                        )}
                      </div>
                      <h3 className="font-heading font-bold text-base text-foreground mb-2 line-clamp-2">
                        {w.title}
                      </h3>
                      {w.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {w.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {w.duration_minutes && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {w.duration_minutes}m
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
