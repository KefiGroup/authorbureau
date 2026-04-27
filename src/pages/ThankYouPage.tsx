import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BookOpen, ArrowRight, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ProductCTA from "@/components/commerce/ProductCTA";

interface UpsellNode {
  id: string;
  node_id: string;
  personalised_name: string | null;
  price_usd: number | null;
  currency: string | null;
  delivery_url: string | null;
  payment_link: string | null;
  third_party_url: string | null;
}

interface ThankYouData {
  author: {
    id: string;
    pen_name: string | null;
    author_slug: string | null;
    photo_url: string | null;
    calendar_url?: string | null;
  } | null;
  book: { title: string; amazon_url: string | null; cover_image_url: string | null; slug: string } | null;
  upsell: UpsellNode | null;
}

export default function ThankYouPage() {
  const { authorSlug } = useParams<{ authorSlug: string }>();
  const [data, setData] = useState<ThankYouData>({ author: null, book: null, upsell: null });
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

        // Pick the cheapest live entry product (Workbook, Home Study, Bundle)
        // to show as the next-step upsell. This turns the thank-you page into
        // an actual conversion surface instead of a dead end.
        let upsell: UpsellNode | null = null;
        try {
          const { data: nodes } = await supabase
            .from("author_nodes")
            .select("id, node_id, personalised_name, price_usd, currency, delivery_url, payment_link, third_party_url")
            .eq("author_id", author.id)
            .eq("status", "live")
            .in("node_id", ["BP-06", "BP-07", "BA-17"]);
          const priced = (nodes || [])
            .filter((n: any) => typeof n.price_usd === "number" && n.price_usd > 0)
            .sort((a: any, b: any) => (a.price_usd ?? 0) - (b.price_usd ?? 0));
          upsell = (priced[0] as UpsellNode) || null;
        } catch { /* ignore — no upsell shown */ }

        setData({ author: { ...author, calendar_url }, book: book || null, upsell });
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

  // Inline skeleton — matches final layout so first paint is never blank.
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/40">
        <nav className="border-b border-gray-100 px-4 py-3">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </nav>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-xl w-full text-center space-y-8">
            <div className="w-20 h-20 rounded-full mx-auto bg-amber-100 animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 w-3/4 mx-auto bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 mx-auto bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 mx-auto bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-56 mx-auto bg-amber-200/60 rounded-full animate-pulse" />
          </div>
        </main>
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

  const upsell = data.upsell;
  const upsellTitle = upsell?.personalised_name
    || (upsell?.node_id?.startsWith("BP-06") ? "Workbook"
      : upsell?.node_id?.startsWith("BP-07") ? "Home Study Course"
      : upsell?.node_id?.startsWith("BA-17") ? "Bundle"
      : "Next step");

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
              Your free resource is on its way. While you wait, want to go deeper?
            </p>
          </div>

          {/* Primary upsell — Workbook / Home Study / Bundle (live + priced) */}
          {upsell && (
            <div className="pt-2">
              <div className="max-w-sm mx-auto rounded-xl border border-amber-200 bg-white shadow-sm p-5 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                    Recommended next step
                  </span>
                  {typeof upsell.price_usd === "number" && upsell.price_usd > 0 && (
                    <span className="text-base font-extrabold text-amber-700">
                      ${upsell.price_usd.toFixed(2)} {(upsell.currency || "USD").toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-gray-900 text-lg leading-snug">
                  {upsellTitle}
                </h2>
                <ProductCTA
                  authorNodeId={upsell.id}
                  authorId={data.author.id}
                  effectivePrice={upsell.price_usd ?? null}
                  stripeReady={true}
                  isOwnerViewing={false}
                  label="Get it now"
                  productTitle={upsellTitle}
                  fallbackUrl={upsell.delivery_url || upsell.payment_link || upsell.third_party_url || null}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Book CTA — secondary if we have an upsell, primary if not */}
          {data.book && (
            <div className="pt-2 space-y-4">
              {!upsell && data.book.cover_image_url && (
                <img
                  src={data.book.cover_image_url}
                  alt={data.book.title}
                  className="h-44 mx-auto rounded shadow-lg"
                />
              )}
              {data.book.amazon_url ? (
                <Button
                  asChild
                  size={upsell ? "default" : "lg"}
                  variant={upsell ? "outline" : "default"}
                  className={upsell ? "rounded-full" : "rounded-full bg-amber-500 hover:bg-amber-600 text-white px-8 h-12 text-base font-semibold"}
                >
                  <a
                    href={data.book.amazon_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Or grab the book on Amazon <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild size={upsell ? "default" : "lg"} variant={upsell ? "outline" : "default"} className="rounded-full">
                  <Link to={`/${authorSlug}/${data.book.slug}`}>
                    See the book <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
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
