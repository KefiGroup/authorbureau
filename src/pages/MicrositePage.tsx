import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Mail, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getThemeById } from "@/lib/author-themes";
import { SLUG_TO_NODE, NODE_NAMES } from "@/lib/node-slug-map";
import { toast } from "@/hooks/use-toast";
import NotFound from "./NotFound";

interface MicrositeData {
  author: any;
  node: any;
  context: any;
  book: any;
}

/**
 * Public microsite page renderer for node-based pages.
 * Route: /:authorSlug/:nodeSlug (e.g. /jane-doe/free-gift)
 *
 * Fetches data via the get-microsite-page edge function and renders
 * the appropriate template based on node type.
 */
export default function MicrositePage() {
  const { authorSlug, nodeSlug } = useParams<{ authorSlug: string; nodeSlug: string }>();
  const [data, setData] = useState<MicrositeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state for opt-in / enquiry pages
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nodeId = nodeSlug ? SLUG_TO_NODE[nodeSlug] : null;

  useEffect(() => {
    if (!authorSlug || !nodeId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchPage() {
      try {
        const { data: result, error } = await supabase.functions.invoke("get-microsite-page", {
          body: null,
          headers: {},
          method: "GET",
        });

        // Use fetch directly since we need GET with query params
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-microsite-page?author=${authorSlug}&node=${nodeId}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const pageData = await res.json();
        setData(pageData);
      } catch (err) {
        console.error("Microsite fetch error:", err);
        setNotFound(true);
      }
      setLoading(false);
    }

    fetchPage();
  }, [authorSlug, nodeId]);

  // SEO
  const nodeName = nodeId ? NODE_NAMES[nodeId] || "" : "";
  const authorName = data?.author?.pen_name || authorSlug || "";
  const bookTitle = data?.book?.title || "";
  const pageTitle = data?.node?.personalised_name || nodeName;

  useDocumentMeta({
    title: data ? `${pageTitle} by ${authorName} | Authors Bureau` : "Loading...",
    description: data
      ? `${pageTitle} by ${authorName}. ${data.context?.core_thesis || bookTitle}`
      : "",
    ogTitle: data ? `${pageTitle} by ${authorName}` : undefined,
    ogImage: data?.book?.cover_image_url || data?.author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
    canonical: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) return <NotFound />;

  const theme = getThemeById(data.author.theme || "classic-elegant");
  const v = theme.vars;
  const hFont = theme.headingFont;
  const bgColor = theme.colors.heroBackground;
  const content = data.node.content_json || {};

  // Determine page type
  const actionType = getActionType(nodeId!);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);

    try {
      const res = await supabase.functions.invoke("microsite-action", {
        body: {
          author_id: data.author.id,
          node_id: nodeId,
          action_type: actionType,
          email,
          first_name: firstName,
          last_name: lastName,
          company: company || undefined,
          message: message || undefined,
        },
      });

      if (res.error) throw res.error;
      setSubmitted(true);
      toast({ title: "Success!", description: res.data?.message || "Thank you!" });
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen" style={{ background: v.background, color: v.bodyText }}>
      {/* Simple nav */}
      <nav className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: v.cardBorder }}>
        <Link to={`/${authorSlug}`} className="font-bold text-lg" style={{ color: v.headingText, fontFamily: v.headingFont }}>
          {authorName}
        </Link>
        {data.book && (
          <Link to={`/${authorSlug}/${data.book.slug}`} className="text-sm hover:underline" style={{ color: v.accent }}>
            {data.book.title}
          </Link>
        )}
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-10">
          {data.author.photo_url && (
            <img
              src={data.author.photo_url}
              alt={authorName}
              className="w-16 h-16 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <h1
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ color: v.headingText, fontFamily: v.headingFont }}
          >
            {content.headline || pageTitle}
          </h1>
          {content.subheadline && (
            <p className="text-lg sm:text-xl max-w-2xl mx-auto" style={{ color: v.mutedText }}>
              {content.subheadline}
            </p>
          )}
        </div>

        {/* Content body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left: content details */}
          <div className="space-y-6">
            {content.description && (
              <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>
                {content.description}
              </p>
            )}

            {/* Bullet points */}
            {content.bullets && Array.isArray(content.bullets) && content.bullets.length > 0 && (
              <ul className="space-y-2">
                {content.bullets.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                    <span className="text-sm" style={{ color: v.bodyText }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Price display for sales pages */}
            {content.price && (
              <div className="pt-2">
                <span className="text-2xl font-bold" style={{ color: v.headingText }}>
                  ${content.price}
                </span>
                {content.currency && content.currency !== "USD" && (
                  <span className="text-sm ml-1" style={{ color: v.mutedText }}>{content.currency}</span>
                )}
              </div>
            )}

            {/* Payment link for sales pages */}
            {data.node.payment_link && actionType === "purchase" && (
              <Button
                className="w-full sm:w-auto text-base px-8 py-3 rounded-full"
                style={{ background: v.accent, color: v.background }}
                asChild
              >
                <a href={data.node.payment_link} target="_blank" rel="noopener noreferrer">
                  {content.cta_text || "Buy Now"} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}

            {/* Amazon link for book sales */}
            {content.amazon_url && (
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <a href={content.amazon_url} target="_blank" rel="noopener noreferrer">
                  Buy on Amazon <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          {/* Right: form (for opt-in/enquiry) or book cover */}
          <div>
            {(actionType === "optin" || actionType === "enquiry" || actionType === "application") && !submitted ? (
              <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: v.headingFont }}>
                  {actionType === "optin"
                    ? content.form_heading || "Get Your Free Copy"
                    : actionType === "enquiry"
                      ? "Get in Touch"
                      : "Apply Now"}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  {(actionType === "enquiry" || actionType === "application") && (
                    <Input
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  )}
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {actionType === "enquiry" && (
                    <>
                      <Input
                        placeholder="Company (optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                      <textarea
                        className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                        placeholder="Tell us about your needs..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{ borderColor: v.cardBorder }}
                      />
                    </>
                  )}
                  <Button
                    type="submit"
                    className="w-full rounded-full"
                    style={{ background: v.accent, color: v.background }}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : content.cta_text || "Submit"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Card>
            ) : submitted ? (
              <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>
                  {actionType === "optin" ? "You're in!" : "Thank you!"}
                </h3>
                <p className="text-sm" style={{ color: v.mutedText }}>
                  {actionType === "optin"
                    ? "Check your email for your free resource."
                    : "We'll be in touch soon."}
                </p>
              </Card>
            ) : data.book?.cover_image_url ? (
              <img
                src={data.book.cover_image_url}
                alt={data.book.title}
                className="w-full max-w-[300px] mx-auto rounded-xl shadow-lg"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center" style={{ borderColor: v.cardBorder }}>
        <p className="text-xs" style={{ color: v.mutedText }}>
          © {new Date().getFullYear()} {authorName} · Powered by{" "}
          <a href="https://authorsbureau.com" className="underline">Authors Bureau</a>
        </p>
      </footer>
    </div>
  );
}

/** Determine the primary action type for a node */
function getActionType(nodeId: string): "optin" | "purchase" | "enquiry" | "application" {
  const optinNodes = ["BP-02", "BP-05", "BA-16"];
  const enquiryNodes = ["YR-21", "YR-22", "YR-28"];
  const applicationNodes = ["YR-20", "YR-23", "BA-13"];

  if (optinNodes.includes(nodeId)) return "optin";
  if (enquiryNodes.includes(nodeId)) return "enquiry";
  if (applicationNodes.includes(nodeId)) return "application";
  return "purchase";
}
