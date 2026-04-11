import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Mail, CheckCircle2, ExternalLink, Clock, BookOpen, Users, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getThemeById } from "@/lib/author-themes";
import { SLUG_TO_NODE, NODE_NAMES } from "@/lib/node-slug-map";
import { toast } from "@/hooks/use-toast";

interface MicrositeData {
  author: any;
  node: any;
  context: any;
  book: any;
}

export default function MicrositePage() {
  const { authorSlug, bookSlug: nodeSlug } = useParams<{ authorSlug: string; bookSlug: string }>();
  const [data, setData] = useState<MicrositeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-microsite-page?author=${authorSlug}&node=${nodeId}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.error === "Node not live") {
            // Check if author exists but node isn't published yet
            setComingSoon(true);
          } else if (body.error === "Author not found") {
            setNotFound(true);
          } else {
            setNotFound(true);
          }
          setLoading(false);
          return;
        }

        setData(await res.json());
      } catch (err) {
        console.error("Microsite fetch error:", err);
        setNotFound(true);
      }
      setLoading(false);
    }

    fetchPage();
  }, [authorSlug, nodeId]);

  const nodeName = nodeId ? NODE_NAMES[nodeId] || "" : "";
  const authorName = data?.author?.pen_name || authorSlug || "";
  const bookTitle = data?.book?.title || "";
  const pageTitle = data?.node?.personalised_name || nodeName;

  useDocumentMeta({
    title: data ? `${pageTitle} by ${authorName} | Authors Bureau` : comingSoon ? "Coming Soon | Authors Bureau" : "Loading...",
    description: data ? `${pageTitle} by ${authorName}. ${data.context?.core_thesis || bookTitle}` : "",
    ogTitle: data ? `${pageTitle} by ${authorName}` : undefined,
    ogImage: data?.book?.cover_image_url || data?.author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
    canonical: `https://authorsbureau.com/${authorSlug}/${nodeSlug}`,
  });

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Author not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Author not found</h1>
          <p className="text-gray-500 mb-6">The author page you're looking for doesn't exist or has been removed.</p>
          <Button asChild variant="outline">
            <a href="https://authorsbureau.com">Visit Authors Bureau</a>
          </Button>
        </div>
      </div>
    );
  }

  // Coming soon (node not published yet)
  if (comingSoon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">This page is coming soon</h1>
          <p className="text-gray-500 mb-6">
            The author is preparing something great. Check back soon!
          </p>
          <Button asChild variant="outline">
            <Link to={`/${authorSlug}`}>Visit Author's Page</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const theme = getThemeById(data.author.theme || "classic-elegant");
  const v = theme.vars;
  const hFont = theme.headingFont;
  const bgColor = theme.colors.heroBackground;
  const content = data.node.content_json || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);

    try {
      const res = await supabase.functions.invoke("microsite-action", {
        body: {
          author_id: data.author.id,
          node_id: nodeId,
          action_type: getActionType(nodeId!),
          email,
          first_name: firstName,
          last_name: lastName,
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

  // Render node-specific template
  return (
    <div className="min-h-screen" style={{ background: bgColor, color: v.bodyText }}>
      {/* Clean nav - author name only */}
      <nav className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: v.cardBorder }}>
        <Link to={`/${authorSlug}`} className="font-bold text-lg" style={{ color: v.headingText, fontFamily: hFont }}>
          {authorName}
        </Link>
        {data.book && (
          <Link to={`/${authorSlug}/${data.book.slug}`} className="text-sm hover:underline" style={{ color: v.accent }}>
            {data.book.title}
          </Link>
        )}
      </nav>

      {/* Node-specific content */}
      {nodeId === "BP-02" && <LeadMagnetPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {nodeId === "BP-04" && <AuthorWebsitePage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {nodeId === "BP-05" && <WebinarPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} submitting={submitting} submitted={submitted} />}
      {nodeId === "BP-06" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="workbook" />}
      {nodeId === "BP-07" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="home-study" />}
      {nodeId === "BP-08" && <SalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} type="special-edition" />}
      {nodeId === "BP-09" && <BookSalesPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} />}
      {/* Generic fallback for other nodes */}
      {!["BP-02", "BP-04", "BP-05", "BP-06", "BP-07", "BP-08", "BP-09"].includes(nodeId!) && (
        <GenericPage data={data} content={content} v={v} hFont={hFont} bgColor={bgColor} nodeId={nodeId!} onSubmit={handleSubmit} email={email} setEmail={setEmail} firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} message={message} setMessage={setMessage} submitting={submitting} submitted={submitted} />
      )}

      {/* Powered by footer */}
      <footer className="border-t px-4 py-6 text-center" style={{ borderColor: v.cardBorder }}>
        <p className="text-xs" style={{ color: v.mutedText }}>
          © {new Date().getFullYear()} {authorName} · Powered by{" "}
          <a href="https://authorsbureau.com" className="underline">Authors Bureau</a>
        </p>
      </footer>
    </div>
  );
}

/* ═══ SHARED PROPS ═══ */
interface PageProps {
  data: MicrositeData;
  content: any;
  v: any;
  hFont: string;
  bgColor: string;
}
interface FormPageProps extends PageProps {
  onSubmit: (e: React.FormEvent) => void;
  email: string; setEmail: (v: string) => void;
  firstName: string; setFirstName: (v: string) => void;
  submitting: boolean; submitted: boolean;
}

/* ═══ BP-02 — LEAD MAGNET ═══ */
function LeadMagnetPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>
            {content.landing_page_headline || content.headline || "Get Your Free Resource"}
          </h1>
          <p className="text-lg mb-6" style={{ color: v.mutedText }}>
            {content.landing_page_subheadline || content.subheadline || "Download your free guide today."}
          </p>
          {content.bullets && Array.isArray(content.bullets) && (
            <ul className="space-y-2 mb-6">
              {content.bullets.map((b: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-sm" style={{ color: v.bodyText }}>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {data.author.photo_url && (
            <div className="flex items-center gap-3 mt-6">
              <img src={data.author.photo_url} alt={data.author.pen_name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="text-sm font-medium" style={{ color: v.headingText }}>{data.author.pen_name}</p>
                {data.author.credentials && Array.isArray(data.author.credentials) && (
                  <p className="text-xs" style={{ color: v.mutedText }}>{(data.author.credentials as string[]).slice(0, 2).join(" · ")}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          {!submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>
                {content.form_heading || "Get Your Free Copy"}
              </h3>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Sending..." : content.cta_text || `Send Me My Free ${content.lead_magnet_name || "Gift"}`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
              <p className="text-[11px] mt-3 text-center" style={{ color: v.mutedText }}>No spam. Unsubscribe anytime.</p>
            </Card>
          ) : (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>You're in!</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>{content.thank_you_message || "Check your email for your free resource."}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ BP-04 — AUTHOR WEBSITE ═══ */
function AuthorWebsitePage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4" style={{ background: v.primary }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4" style={{ color: v.primaryText, fontFamily: hFont }}>
              {content.headline || data.author.pen_name}
            </h1>
            <p className="text-lg mb-6" style={{ color: v.primaryText, opacity: 0.85 }}>
              {data.author.tagline || content.subheadline || data.context?.core_thesis || ""}
            </p>
            {data.book && (
              <Button className="rounded-full px-6" style={{ background: v.accent, color: v.accentText }}>
                <a href={`/${data.author.slug}/${data.book.slug}`}>
                  Discover {data.book.title} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <div className="flex justify-center">
            {data.author.photo_url && (
              <img src={data.author.photo_url} alt={data.author.pen_name} className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl object-cover shadow-xl" />
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>About {data.author.pen_name}</h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: v.bodyText }}>
            {(data.author.bio_long || data.author.bio || "").replace(/<[^>]+>/g, "")}
          </p>
          {data.author.credentials && Array.isArray(data.author.credentials) && data.author.credentials.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(data.author.credentials as string[]).map((c: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: v.secondaryBg, color: v.secondaryText }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Book */}
      {data.book && (
        <section className="py-12 sm:py-16 px-4" style={{ background: v.secondaryBg }}>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {data.book.cover_image_url && (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[280px] mx-auto rounded-xl shadow-lg" />
            )}
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>{data.book.title}</h2>
              {data.book.subtitle && <p className="text-base mb-4" style={{ color: v.mutedText }}>{data.book.subtitle}</p>}
              <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText }}>{data.book.description}</p>
              <div className="flex gap-3">
                {data.book.amazon_url && (
                  <Button asChild style={{ background: v.accent, color: v.accentText }}>
                    <a href={data.book.amazon_url} target="_blank" rel="noopener noreferrer">Buy on Amazon</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lead capture */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>Stay Connected</h2>
          <p className="text-sm mb-6" style={{ color: v.mutedText }}>Get updates on new books, resources, and events.</p>
          {!submitted ? (
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="flex-1" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="flex-1" />
              <Button type="submit" style={{ background: v.accent, color: v.accentText }} disabled={submitting}>
                {submitting ? "..." : "Subscribe"}
              </Button>
            </form>
          ) : (
            <p className="text-sm font-medium" style={{ color: v.accent }}>✓ You're subscribed!</p>
          )}
        </div>
      </section>

      {/* Contact */}
      {data.author.social && (
        <section className="py-8 px-4 border-t" style={{ borderColor: v.cardBorder }}>
          <div className="max-w-lg mx-auto flex justify-center gap-4">
            {data.author.social.website && <SocialLink label="Website" url={data.author.social.website} color={v.accent} />}
            {data.author.social.linkedin && <SocialLink label="LinkedIn" url={data.author.social.linkedin} color={v.accent} />}
            {data.author.social.twitter && <SocialLink label="Twitter" url={data.author.social.twitter} color={v.accent} />}
            {data.author.social.instagram && <SocialLink label="Instagram" url={data.author.social.instagram} color={v.accent} />}
            {data.author.social.youtube && <SocialLink label="YouTube" url={data.author.social.youtube} color={v.accent} />}
          </div>
        </section>
      )}
    </div>
  );
}

function SocialLink({ label, url, color }: { label: string; url: string; color: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline" style={{ color }}>
      {label}
    </a>
  );
}

/* ═══ BP-05 — WEBINAR ═══ */
function WebinarPage({ data, content, v, hFont, bgColor, onSubmit, email, setEmail, firstName, setFirstName, submitting, submitted }: FormPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-medium" style={{ background: v.accent + "20", color: v.accent }}>
          <Calendar className="h-4 w-4" /> Free Live Webinar
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
          {content.webinar_title || content.headline || "Free Webinar"}
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: v.mutedText }}>
          {content.subheadline || content.description || ""}
        </p>
        {content.webinar_date ? (
          <p className="mt-4 text-sm font-medium" style={{ color: v.headingText }}>📅 {content.webinar_date}</p>
        ) : (
          <p className="mt-4 text-sm" style={{ color: v.mutedText }}>Date to be announced</p>
        )}
      </div>

      <div className="max-w-md mx-auto">
        {!submitted ? (
          <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: v.headingText, fontFamily: hFont }}>
              Reserve Your Seat
            </h3>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                {submitting ? "Registering..." : "Reserve My Seat"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>You're registered!</h3>
            <p className="text-sm" style={{ color: v.mutedText }}>Check your email for the webinar details and link.</p>
          </Card>
        )}
      </div>

      {/* Speaker info */}
      {data.author.photo_url && (
        <div className="flex items-center gap-4 max-w-md mx-auto mt-10">
          <img src={data.author.photo_url} alt={data.author.pen_name} className="w-14 h-14 rounded-full object-cover" />
          <div>
            <p className="font-semibold" style={{ color: v.headingText }}>Hosted by {data.author.pen_name}</p>
            <p className="text-sm" style={{ color: v.mutedText }}>{data.author.bio || ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ BP-06, BP-07, BP-08 — SALES PAGES ═══ */
function SalesPage({ data, content, v, hFont, bgColor, type }: PageProps & { type: "workbook" | "home-study" | "special-edition" }) {
  const labels = {
    "workbook": { title: "Workbook", cta: "Buy Now", icon: BookOpen },
    "home-study": { title: "Home Study Course", cta: "Enrol Now", icon: Users },
    "special-edition": { title: "Special Edition", cta: "Claim My Copy", icon: Star },
  };
  const cfg = labels[type];
  const hasStripeUrl = !!content.stripe_checkout_url || !!data.node.payment_link;
  const buyUrl = content.stripe_checkout_url || data.node.payment_link;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: v.headingText, fontFamily: hFont }}>
            {content.title || content.headline || cfg.title}
          </h1>
          {content.subtitle && <p className="text-lg mb-4" style={{ color: v.mutedText }}>{content.subtitle}</p>}
          <p className="text-base leading-relaxed mb-6" style={{ color: v.bodyText }}>
            {content.description || ""}
          </p>

          {/* Bullet points or modules list */}
          {(content.exercises || content.modules || content.bullets || content.bundle_contents) && (
            <ul className="space-y-2 mb-6">
              {(content.exercises || content.modules || content.bullets || content.bundle_contents || []).map((item: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-sm" style={{ color: v.bodyText }}>
                    {typeof item === "string" ? item : item.title || item.name || JSON.stringify(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
            {data.book?.cover_image_url && (
              <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[200px] mx-auto rounded-lg mb-4" />
            )}
            <div className="text-center">
              {content.original_price && (
                <p className="text-sm line-through" style={{ color: v.mutedText }}>${content.original_price}</p>
              )}
              <p className="text-3xl font-bold mb-1" style={{ color: v.headingText }}>
                ${content.price || "TBA"}
              </p>
              {content.price && content.original_price && (
                <p className="text-sm font-medium mb-4" style={{ color: v.accent }}>
                  Save ${(Number(content.original_price) - Number(content.price)).toFixed(0)}
                </p>
              )}
              {hasStripeUrl ? (
                <Button className="w-full rounded-full text-base py-3" style={{ background: v.accent, color: v.accentText }} asChild>
                  <a href={buyUrl} target="_blank" rel="noopener noreferrer">
                    {cfg.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button className="w-full rounded-full" disabled>
                  Coming Soon
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══ BP-09 — BOOK SALES PAGE ═══ */
function BookSalesPage({ data, content, v, hFont, bgColor }: PageProps) {
  const hasAmazon = !!content.amazon_url || !!data.book?.amazon_url;
  const hasStripe = !!content.stripe_checkout_url || !!data.node.payment_link;
  const amazonUrl = content.amazon_url || data.book?.amazon_url;
  const stripeUrl = content.stripe_checkout_url || data.node.payment_link;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
          {(data.book?.cover_image_url || content.cover_image_url) && (
            <img
              src={data.book?.cover_image_url || content.cover_image_url}
              alt={data.book?.title || content.title}
              className="w-full max-w-[300px] rounded-xl shadow-xl"
            />
          )}
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: v.headingText, fontFamily: hFont }}>
            {data.book?.title || content.title || "Book"}
          </h1>
          {(data.book?.subtitle || content.subtitle) && (
            <p className="text-lg mb-4" style={{ color: v.mutedText }}>{data.book?.subtitle || content.subtitle}</p>
          )}
          <p className="text-base leading-relaxed mb-6" style={{ color: v.bodyText }}>
            {content.book_description || data.book?.description || ""}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasAmazon && (
              <Button className="flex-1 rounded-full" style={{ background: v.accent, color: v.accentText }} asChild>
                <a href={amazonUrl} target="_blank" rel="noopener noreferrer">
                  Buy on Amazon <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {hasStripe && (
              <Button className="flex-1 rounded-full" variant="outline" asChild>
                <a href={stripeUrl} target="_blank" rel="noopener noreferrer">
                  Buy Direct <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {!hasAmazon && !hasStripe && (
              <Button className="flex-1 rounded-full" disabled>Available Soon</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ GENERIC PAGE (BA-10 through YR-28) ═══ */
function GenericPage({ data, content, v, hFont, bgColor, nodeId, onSubmit, email, setEmail, firstName, setFirstName, lastName, setLastName, message, setMessage, submitting, submitted }: FormPageProps & { nodeId: string; lastName: string; setLastName: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  const actionType = getActionType(nodeId);
  const hasPaymentLink = !!data.node.payment_link || !!content.stripe_checkout_url;
  const paymentUrl = data.node.payment_link || content.stripe_checkout_url;
  const pageTitle = data.node.personalised_name || NODE_NAMES[nodeId] || "Details";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: v.headingText, fontFamily: hFont }}>
            {content.headline || pageTitle}
          </h1>
          {content.subheadline && <p className="text-lg" style={{ color: v.mutedText }}>{content.subheadline}</p>}
          {content.description && <p className="text-base leading-relaxed" style={{ color: v.bodyText }}>{content.description}</p>}

          {content.bullets && Array.isArray(content.bullets) && (
            <ul className="space-y-2">
              {content.bullets.map((b: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: v.accent }} />
                  <span className="text-sm" style={{ color: v.bodyText }}>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {content.price && (
            <p className="text-2xl font-bold" style={{ color: v.headingText }}>${content.price}</p>
          )}

          {actionType === "purchase" && hasPaymentLink && (
            <Button className="rounded-full px-8 py-3" style={{ background: v.accent, color: v.accentText }} asChild>
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                {content.cta_text || "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          {actionType === "purchase" && !hasPaymentLink && (
            <Button className="rounded-full" disabled>Coming Soon</Button>
          )}
        </div>

        <div>
          {(actionType === "optin" || actionType === "enquiry" || actionType === "application") && !submitted ? (
            <Card className="p-6" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: v.headingText, fontFamily: hFont }}>
                {actionType === "optin" ? content.form_heading || "Get Access" : actionType === "enquiry" ? "Get in Touch" : "Apply Now"}
              </h3>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                {(actionType === "enquiry" || actionType === "application") && (
                  <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                )}
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                {actionType === "enquiry" && (
                  <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" placeholder="Tell us about your needs..." value={message} onChange={e => setMessage(e.target.value)} style={{ borderColor: v.cardBorder }} />
                )}
                <Button type="submit" className="w-full rounded-full" style={{ background: v.accent, color: bgColor }} disabled={submitting}>
                  {submitting ? "Submitting..." : content.cta_text || "Submit"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : submitted ? (
            <Card className="p-6 text-center" style={{ background: v.cardBg, borderColor: v.cardBorder }}>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: v.accent }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: v.headingText }}>Thank you!</h3>
              <p className="text-sm" style={{ color: v.mutedText }}>We'll be in touch soon.</p>
            </Card>
          ) : data.book?.cover_image_url ? (
            <img src={data.book.cover_image_url} alt={data.book.title} className="w-full max-w-[300px] mx-auto rounded-xl shadow-lg" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ═══ HELPERS ═══ */
function getActionType(nodeId: string): "optin" | "purchase" | "enquiry" | "application" {
  const optinNodes = ["BP-02", "BP-05", "BA-16"];
  const enquiryNodes = ["YR-21", "YR-22", "YR-28"];
  const applicationNodes = ["YR-20", "YR-23", "BA-13"];
  if (optinNodes.includes(nodeId)) return "optin";
  if (enquiryNodes.includes(nodeId)) return "enquiry";
  if (applicationNodes.includes(nodeId)) return "application";
  return "purchase";
}
