import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, BookOpen, CheckCircle2 } from "lucide-react";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ComingSoonScreen from "@/components/public/ComingSoonScreen";

interface CourseData {
  id: string;
  author_id: string;
  title: string;
  subtitle: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  price: number | null;
  currency: string | null;
  target_student: string | null;
  transformation_promises: unknown;
  status: string;
}

export default function CourseSalesPage() {
  const { authorSlug, courseSlug } = useParams<{ authorSlug: string; courseSlug: string }>();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [modules, setModules] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authorMissing, setAuthorMissing] = useState(false);

  useDocumentMeta({
    title: course ? `${course.title} | Online Course` : "Online Course",
    description: course?.tagline || course?.subtitle || undefined,
  });

  useEffect(() => {
    (async () => {
      if (!authorSlug || !courseSlug) { setAuthorMissing(true); setLoading(false); return; }
      const { data: author } = await supabase
        .from("author_profiles").select("id, pen_name").eq("author_slug", authorSlug).maybeSingle();
      if (!author) { setAuthorMissing(true); setLoading(false); return; }
      setAuthorName(author.pen_name || "");

      const { data: c } = await supabase
        .from("courses")
        .select("id, author_id, title, subtitle, tagline, description, cover_image_url, price, currency, target_student, transformation_promises, status")
        .eq("author_id", author.id)
        .eq("course_slug", courseSlug)
        .maybeSingle();
      if (!c) { setNotFound(true); setLoading(false); return; }
      setCourse(c as CourseData);

      const { data: mods } = await supabase
        .from("course_modules").select("id, title, description").eq("course_id", c.id).order("position");
      setModules(mods ?? []);
      setLoading(false);
    })();
  }, [authorSlug, courseSlug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (authorMissing) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Author not found.</p></div>;
  }
  if (notFound || !course) {
    return <ComingSoonScreen authorSlug={authorSlug || ""} authorName={authorName} pageLabel="This course" />;
  }

  const promises: string[] = Array.isArray(course.transformation_promises)
    ? (course.transformation_promises as string[]) : [];
  const isLive = course.status === "live" || course.status === "published";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/${authorSlug}`} className="text-sm font-semibold text-foreground hover:underline">{authorName}</Link>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Online Course</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-12 grid gap-10 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          {course.tagline && <p className="text-sm font-semibold text-primary uppercase tracking-wider">{course.tagline}</p>}
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{course.title}</h1>
          {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}

          {promises.length > 0 && (
            <Card><CardContent className="pt-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you'll get</p>
              <ul className="space-y-1.5">
                {promises.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{p}
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          )}

          {course.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{course.description}</div>
          )}

          <div>
            <h2 className="text-xl font-bold mb-3">Curriculum</h2>
            <div className="space-y-2">
              {modules.map((m, i) => (
                <Card key={m.id}><CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Module {i + 1}: {m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  </div>
                </CardContent></Card>
              ))}
              {modules.length === 0 && (
                <p className="text-sm text-muted-foreground">Curriculum coming soon.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 self-start">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {course.cover_image_url && (
                <img src={course.cover_image_url} alt={course.title} className="w-full rounded-md aspect-video object-cover" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-3xl font-bold">${Number(course.price ?? 0).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">One-time payment · Lifetime access</p>
              </div>
              {isLive ? (
                <CourseBuyButton courseId={course.id} authorId={course.author_id} />
              ) : (
                <Button disabled className="w-full"><BookOpen className="h-4 w-4 mr-2" />Coming Soon</Button>
              )}
              <p className="text-[11px] text-center text-muted-foreground">Secure checkout via Stripe</p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function CourseBuyButton({ courseId, authorId }: { courseId: string; authorId: string }) {
  // BuyNowButton currently calls with author_node_id; for course we wrap a thin custom call.
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { course_id: courseId },
      });
      if (error) throw error;
      if (data?.error === "AUTHOR_PAYMENTS_NOT_SET_UP") {
        alert("This author hasn't set up payments yet. Please check back soon.");
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("Checkout unavailable. Please try again.");
    } finally { setLoading(false); }
  };
  return (
    <Button className="w-full" size="lg" onClick={handle} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enrol Now"}
    </Button>
  );
  void authorId; // reserved for future analytics
}
