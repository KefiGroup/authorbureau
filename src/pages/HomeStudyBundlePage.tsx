import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

/**
 * Public, print-friendly Home Study Course bundle.
 * Route: /:authorSlug/home-study-bundle/:purchaseId
 *
 * Shows every week + day on a single long page so the buyer can hit
 * Print → "Save as PDF" in their browser. No portal login required —
 * the purchaseId acts as a capability token (URL is emailed only to the buyer).
 */
export default function HomeStudyBundlePage() {
  const { authorSlug, purchaseId } = useParams<{ authorSlug: string; purchaseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState<{ pen_name: string | null; id: string } | null>(null);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!authorSlug || !purchaseId) throw new Error("Missing URL parameters.");
        const { data: a, error: ae } = await supabase
          .from("author_profiles")
          .select("id, pen_name")
          .eq("author_slug", authorSlug)
          .maybeSingle();
        if (ae || !a) throw new Error("Author not found.");

        // Verify the purchase exists for this author + product type
        const { data: p } = await supabase
          .from("purchases")
          .select("id, author_id, product_type")
          .eq("id", purchaseId)
          .maybeSingle();
        if (!p || p.author_id !== a.id || p.product_type !== "home_study") {
          throw new Error("This bundle link is invalid or has been revoked.");
        }

        const { data: node } = await supabase
          .from("author_nodes")
          .select("content_json")
          .eq("author_id", a.id).eq("node_id", "BP-07")
          .maybeSingle();
        if (!node?.content_json) throw new Error("Course content not yet published.");

        if (!cancelled) {
          setAuthor({ id: a.id, pen_name: a.pen_name });
          setContent(node.content_json);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load this bundle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authorSlug, purchaseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Bundle unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link to="/readers-bureau"><ArrowLeft className="h-4 w-4 mr-2" />Back to Readers Bureau</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-4">
        <div className="flex justify-between items-start gap-4 mb-8 print:hidden">
          <div>
            <Link to="/readers-bureau" className="text-sm text-muted-foreground hover:underline">
              ← Back to Readers Bureau
            </Link>
          </div>
          <Button onClick={() => window.print()} className="shrink-0">
            <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
          </Button>
        </div>

        <header className="mb-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Home Study Course Bundle
          </p>
          <h1 className="text-3xl font-bold mb-2">{content.programme_title || "Home Study Course"}</h1>
          {content.programme_subtitle && (
            <p className="text-lg text-muted-foreground">{content.programme_subtitle}</p>
          )}
          {author?.pen_name && (
            <p className="text-sm text-muted-foreground mt-2">by {author.pen_name}</p>
          )}
          {content.transformation_promise && (
            <p className="mt-4 text-sm">{content.transformation_promise}</p>
          )}
        </header>

        {content.who_its_for && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">Who it's for</h2>
            <p className="text-sm">{content.who_its_for}</p>
          </section>
        )}

        {Array.isArray(content.what_youll_get) && content.what_youll_get.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">What you'll get</h2>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {content.what_youll_get.map((d: string, i: number) => <li key={i}>{d}</li>)}
            </ul>
          </section>
        )}

        {Array.isArray(content.study_weeks) && content.study_weeks.map((week: any, wi: number) => (
          <section key={wi} className="mb-10 break-inside-avoid">
            <h2 className="text-2xl font-bold mb-1">Week {week.week}: {week.title}</h2>
            {week.theme && <p className="text-sm text-muted-foreground italic mb-4">{week.theme}</p>}
            <div className="space-y-4">
              {week.days?.map((day: any, di: number) => (
                <article key={di} className="border-l-4 border-foreground/20 pl-4 py-2 break-inside-avoid">
                  <h3 className="font-bold text-base mb-2">Day {day.day}</h3>
                  {day.reading && <p className="text-sm mb-1"><span className="font-semibold">Read:</span> {day.reading}</p>}
                  {day.exercise && <p className="text-sm mb-1"><span className="font-semibold">Exercise:</span> {day.exercise}</p>}
                  {day.reflection && <p className="text-sm mb-1 italic"><span className="font-semibold not-italic">Reflect:</span> {day.reflection}</p>}
                  {day.action && <p className="text-sm"><span className="font-semibold">Action:</span> {day.action}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>© {author?.pen_name || "Author"} — Distributed via Authors Bureau. For your personal use only.</p>
        </footer>
      </div>
    </div>
  );
}
