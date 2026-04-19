import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, BookOpen, ArrowRight, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface ThankYouData {
  author: { id: string; pen_name: string | null; author_slug: string | null; photo_url: string | null; calendar_url?: string | null } | null;
  book: { title: string; amazon_url: string | null; cover_image_url: string | null; slug: string } | null;
}

export default function ThankYouPage() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [data, setData] = useState<ThankYouData>({ author: null, book: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorSlug) { setLoading(false); return; }

    (async () => {
      try {
        const { data: author } = await supabase
          .from("author_profiles")
          .select("id, pen_name, author_slug, photo_url")
          .eq("author_slug", authorSlug)
          .maybeSingle();

        if (!author) { setLoading(false); return; }

        const { data: book } = await supabase
          .from("books")
          .select("title, amazon_url, cover_image_url, slug")
          .eq("author_id", author.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Try fetching calendar_url separately — column may not exist
        let calendar_url: string | null = null;
        try {
          const { data: cal } = await supabase
            .from("author_profiles")
            // @ts-ignore — column may not exist in types
            .select("calendar_url")
            .eq("id", author.id)
            .maybeSingle();
          // @ts-ignore
          calendar_url = cal?.calendar_url || null;
        } catch { /* column missing — ignore */ }

        setData({ author: { ...author, calendar_url }, book: book || null });
      } catch (err) {
        console.error("ThankYou load error:", err);
      }
      setLoading(false);
    })();
  }, [authorSlug]);

  const penName = data.author?.pen_name || authorSlug || "the author";

  useDocumentMeta({
    title: `Thank you! | ${penName}`,
    description: `You're in! Check your inbox for your free resource from ${penName}.`,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data.author) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <Button asChild variant="outline">
            <a href="https://authorsbureau.com">Visit Authors Bureau</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/40 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-3">
        <Link to={`/${authorSlug}`} className="font-bold text-lg text-gray-900">
          {penName}
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-100 text-4xl">
            📬
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              You're in! Check your inbox 📬
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Your free resource is on its way. While you wait, want to go deeper? Grab the book that started it all.
            </p>
          </div>

          {/* Book CTA */}
          {data.book && (
            <div className="pt-4 space-y-4">
              {data.book.cover_image_url && (
                <img
                  src={data.book.cover_image_url}
                  alt={data.book.title}
                  className="h-44 mx-auto rounded shadow-lg"
                />
              )}
              <Button
                asChild
                size="lg"
                className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-8 h-12 text-base font-semibold"
              >
                <a
                  href={data.book.amazon_url || `/${authorSlug}/${data.book.slug}`}
                  target={data.book.amazon_url ? "_blank" : undefined}
                  rel={data.book.amazon_url ? "noopener noreferrer" : undefined}
                >
                  Get the Book on Amazon <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          {/* Optional calendar */}
          {data.author.calendar_url && (
            <div className="pt-2">
              <a
                href={data.author.calendar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline underline-offset-4"
              >
                <Calendar className="h-4 w-4" /> Book a call with {penName}
              </a>
            </div>
          )}

          <div className="pt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Mail className="h-3.5 w-3.5" />
            <span>Tip: check your spam folder if you don't see the email in 5 minutes.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-6 text-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} {penName} · Powered by{" "}
          <a href="https://authorsbureau.com" className="underline">Authors Bureau</a>
        </p>
      </footer>
    </div>
  );
}
