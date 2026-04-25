import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Clock, BookOpen, GraduationCap, Users,
  Headphones, Mic, Loader2, Star, Mail, CheckCircle2, Check,
  Briefcase, Brain, Target, Mountain, Award, Presentation,
  KeyRound, Video, Sparkles, Ticket, ChevronDown, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { autoEnrollSubscriber } from "@/lib/email-sequence-hook";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { getThemeById, type AuthorTheme } from "@/lib/author-themes";
import {
  getProductCTAText, getProductTagline, getWhatsIncludedHeading,
  getAutoPersonas, getProductCardCTAText, getTrustSignal,
  getTrustBarItems, getQuickStats, getProductTypeLabel,
} from "@/lib/product-copy";
import AuthorPageLayout from "@/components/public/AuthorPageLayout";
import AuthorBrandedNav from "@/components/public/AuthorBrandedNav";
import AuthorContactModal from "@/components/public/AuthorContactModal";
import BookProductNav, { getProductTabMeta } from "@/components/public/BookProductNav";
import NotFound from "./NotFound";
import SharedSalesCopyPreview from "@/components/dashboard/builders/shared/SharedSalesCopyPreview";
import type { SalesCopyData } from "@/components/dashboard/builders/shared/salesCopyTypes";
import LeadCaptureForm from "@/components/LeadCaptureForm";

/* ---------- Types & Config ---------- */
type ProductType =
  | "homestudy" | "onlinecourse" | "workbook" | "coaching" | "audiobook" | "podcast" | "book"
  | "group_coaching" | "consulting" | "mastermind" | "speaking" | "keynote" | "training"
  | "webinar" | "membership" | "retreat" | "bootcamp" | "certification" | "convention"
  | "special_edition" | "big_ticket" | "coaching_membership" | "workshop";

const PRODUCT_CONFIG: Record<string, { table: string; label: string; icon: any; statusField: string; statusValue: string; typeFilter?: string }> = {
  homestudy: { table: "home_study_courses", label: "Home Study Course", icon: BookOpen, statusField: "status", statusValue: "published" },
  onlinecourse: { table: "courses", label: "Online Course", icon: GraduationCap, statusField: "status", statusValue: "published" },
  workbook: { table: "home_study_courses", label: "Workbook", icon: BookOpen, statusField: "status", statusValue: "published" },
  coaching: { table: "coaching_packages", label: "1-on-1 Coaching", icon: Target, statusField: "status", statusValue: "active", typeFilter: "one_on_one" },
  group_coaching: { table: "coaching_packages", label: "Group Coaching", icon: Users, statusField: "status", statusValue: "active", typeFilter: "group" },
  consulting: { table: "coaching_packages", label: "Consulting", icon: Briefcase, statusField: "status", statusValue: "active", typeFilter: "consulting" },
  mastermind: { table: "coaching_packages", label: "Mastermind", icon: Brain, statusField: "status", statusValue: "active", typeFilter: "mastermind" },
  big_ticket: { table: "coaching_packages", label: "Big Ticket", icon: Sparkles, statusField: "status", statusValue: "active", typeFilter: "big_ticket" },
  coaching_membership: { table: "coaching_packages", label: "Coaching Membership", icon: KeyRound, statusField: "status", statusValue: "active", typeFilter: "coaching_membership" },
  speaking: { table: "speaking_topics", label: "Speaking", icon: Presentation, statusField: "status", statusValue: "active" },
  keynote: { table: "speaking_topics", label: "Keynote", icon: Presentation, statusField: "status", statusValue: "active" },
  training: { table: "speaking_topics", label: "Corporate Training", icon: Presentation, statusField: "status", statusValue: "active" },
  audiobook: { table: "audiobooks", label: "Audiobook", icon: Headphones, statusField: "status", statusValue: "published" },
  podcast: { table: "podcasts", label: "Podcast", icon: Mic, statusField: "status", statusValue: "published" },
  webinar: { table: "coaching_packages", label: "Webinar", icon: Video, statusField: "status", statusValue: "active", typeFilter: "webinar" },
  workshop: { table: "coaching_packages", label: "Workshop", icon: Video, statusField: "status", statusValue: "active", typeFilter: "workshop" },
  membership: { table: "coaching_packages", label: "Membership", icon: KeyRound, statusField: "status", statusValue: "active", typeFilter: "membership" },
  retreat: { table: "coaching_packages", label: "Retreat", icon: Mountain, statusField: "status", statusValue: "active", typeFilter: "retreat" },
  bootcamp: { table: "coaching_packages", label: "Bootcamp", icon: Mountain, statusField: "status", statusValue: "active", typeFilter: "bootcamp" },
  certification: { table: "coaching_packages", label: "Certification", icon: Award, statusField: "status", statusValue: "active", typeFilter: "certification" },
  convention: { table: "coaching_packages", label: "Convention", icon: Ticket, statusField: "status", statusValue: "active", typeFilter: "convention" },
  special_edition: { table: "books", label: "Special Edition", icon: Sparkles, statusField: "published_at", statusValue: "not_null" },
  book: { table: "books", label: "Book", icon: BookOpen, statusField: "published_at", statusValue: "not_null" },
};

const PRODUCT_ROUTE_MAP: Record<string, string> = { home_study_courses: "homestudy", courses: "onlinecourse", audiobooks: "audiobook", podcasts: "podcast" };
const COACHING_TYPE_TO_ROUTE: Record<string, string> = { one_on_one: "coaching", group: "group_coaching", consulting: "consulting", mastermind: "mastermind", big_ticket: "big_ticket", coaching_membership: "coaching_membership", webinar: "webinar", workshop: "workshop", membership: "membership", retreat: "retreat", bootcamp: "bootcamp", certification: "certification", convention: "convention" };

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }) };

/* ===== Markdown Renderer ===== */
function stripStars(text: string): string {
  return text.replace(/^\*{2,}/, "").replace(/\*{2,}$/, "").trim();
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function ProductMarkdown({ content, vars }: { content: string; vars: any }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (/^\[.+\]$/.test(trimmed)) return null;
        if (trimmed.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-4" style={{ color: vars.headingText }}>{renderInline(stripStars(trimmed.slice(4)))}</h3>;
        if (trimmed.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-5" style={{ color: vars.headingText }}>{renderInline(stripStars(trimmed.slice(3)))}</h2>;
        if (trimmed.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6" style={{ color: vars.headingText }}>{renderInline(stripStars(trimmed.slice(2)))}</h1>;
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return <li key={i} className="ml-4 list-disc text-[1.05rem] leading-relaxed" style={{ color: vars.bodyText }}>{renderInline(stripStars(trimmed.slice(2)))}</li>;
        if (/^\d+\.\s/.test(trimmed)) return <li key={i} className="ml-4 list-decimal text-[1.05rem] leading-relaxed" style={{ color: vars.bodyText }}>{renderInline(stripStars(trimmed.replace(/^\d+\.\s/, "")))}</li>;
        if (trimmed.startsWith("> ")) return <blockquote key={i} className="border-l-4 pl-5 italic text-[1.05rem]" style={{ borderColor: vars.accent, color: vars.bodyText, opacity: 0.9 }}>{renderInline(stripStars(trimmed.slice(2)))}</blockquote>;
        if (trimmed.startsWith("---") || trimmed.startsWith("***")) return <hr key={i} className="my-4" style={{ borderColor: vars.cardBorder }} />;
        return <p key={i} className="text-[1.05rem] leading-[1.8]" style={{ color: vars.bodyText }}>{renderInline(stripStars(trimmed))}</p>;
      })}
    </div>
  );
}

function parseChecklistItems(description: string | null | undefined): string[] {
  if (!description) return [];
  return description.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 200).slice(0, 8);
}

/* ===== FAQ Accordion ===== */
function FAQAccordion({ faqs, vars, headingFont }: { faqs: { q: string; a: string }[]; vars: any; headingFont: string }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="divide-y" style={{ borderColor: vars.cardBorder }}>
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            className="w-full flex items-center justify-between py-5 text-left transition-colors"
          >
            <span className="font-semibold text-[1.125rem] pr-4" style={{ color: vars.headingText, fontFamily: headingFont }}>{faq.q}</span>
            <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${openIdx === i ? "rotate-180" : ""}`} style={{ color: vars.mutedText }} />
          </button>
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: openIdx === i ? "500px" : "0", opacity: openIdx === i ? 1 : 0 }}
          >
            <p className="pb-5 text-[1rem] leading-[1.7]" style={{ color: vars.bodyText }}>{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================ */
export default function AuthorProductPage() {
  const { authorSlug, bookSlug, productType } = useParams<{ authorSlug: string; bookSlug: string; productType: string }>();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [allAuthorBooks, setAllAuthorBooks] = useState<any[]>([]);
  const [allBookProducts, setAllBookProducts] = useState<{ label: string; icon: string; route: string }[]>([]);
  const [coachingServices, setCoachingServices] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [theme, setTheme] = useState<AuthorTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subMessage, setSubMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [salesPageContent, setSalesPageContent] = useState<string | null>(null);
  const [salesCopyData, setSalesCopyData] = useState<SalesCopyData | null>(null);
  const [buying, setBuying] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);

  const pType = productType as ProductType;
  const config = PRODUCT_CONFIG[pType];
  const displayName = author?.pen_name || "Author";
  const authorFirstName = displayName.split(" ")[0];
  const bookTitle = book?.title || "Book";

  // SEO
  const productDescFirstSentence = product?.description ? (product.description.split(/[.!?]\s/)[0] + ".") : "";
  const seoDesc = product
    ? `${product.title} by ${displayName}. ${productDescFirstSentence} ${config?.label || "Product"} based on the book ${bookTitle}.`
    : "";

  useDocumentMeta({
    title: product?.title ? `${product.title} - ${config?.label || "Product"} by ${displayName} | Authors Bureau` : "Product | Authors Bureau",
    description: seoDesc,
    ogTitle: product?.title ? `${product.title} - ${config?.label || "Product"} by ${displayName} | Authors Bureau` : undefined,
    ogDescription: seoDesc,
    ogImage: product?.cover_image_url || book?.cover_image_url || author?.photo_url || undefined,
    ogUrl: `https://authorsbureau.com/${authorSlug}/${bookSlug}/${productType}`,
    ogType: "product",
    ogSiteName: "Authors Bureau",
    canonical: `https://authorsbureau.com/${authorSlug}/${bookSlug}/${productType}`,
    twitterCard: "summary_large_image",
    jsonLd: product ? {
      "@context": "https://schema.org",
      "@type": ["onlinecourse", "homestudy", "training", "certification"].includes(pType) ? "Course"
        : ["coaching", "consulting", "speaking", "keynote"].includes(pType) ? "Service" : "Product",
      name: product.title,
      description: (product.description || "").slice(0, 160),
      provider: { "@type": "Person", name: displayName },
      offers: product.price != null && product.price > 0
        ? { "@type": "Offer", price: String(product.price), priceCurrency: product.currency || "USD", availability: "https://schema.org/InStock" }
        : undefined,
      image: product.cover_image_url || book?.cover_image_url || undefined,
    } : undefined,
  });

  // Intersection observer for sticky mobile CTA
  useEffect(() => {
    const heroEl = document.getElementById("product-hero");
    if (!heroEl) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [product]);

  const handleBuyNow = useCallback(async () => {
    if (!product || !author || buying) return;
    setBuying(true);
    try {
      const { data: sessionData } = await sharedSupabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { navigate(`/auth?redirect=/${authorSlug}/${bookSlug}/${productType}`); return; }
      const { data, error } = await supabase.functions.invoke("create-product-checkout", {
        body: { productId: product.id, productType: pType, productTitle: product.title, authorId: author.user_id, price: product.price, currency: product.currency || "USD", bookSlug, authorSlug },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error || !data?.url) { toast({ title: "Error", description: "Could not start checkout.", variant: "destructive" }); return; }
      window.location.href = data.url;
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally { setBuying(false); }
  }, [product, author, buying, authorSlug, bookSlug, productType, navigate, pType]);

  useEffect(() => {
    if (!authorSlug || !bookSlug || !config) { setNotFound(true); setLoading(false); return; }
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorSlug, bookSlug, productType, config]);

  async function loadProduct() {
    setLoading(true);

    let profile: any = null;
    let isOwner = false;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data } = await supabase.from("author_profiles").select("*").eq("author_slug", authorSlug).eq("user_id", currentUser.id).maybeSingle();
      profile = data;
      if (data) isOwner = true;
    }
    if (!profile) {
      const { data } = await supabase.from("author_profiles_public" as any).select("*").eq("author_slug", authorSlug).in("directory_status", ["listed", "verified", "featured"]).maybeSingle();
      profile = data;
    }
    if (!profile) { setNotFound(true); setLoading(false); return; }
    setAuthor(profile);
    setTheme(getThemeById(profile.site_theme || "classic-elegant"));

    let primaryBookQuery = supabase
      .from("books")
      .select("id, title, slug, cover_image_url, author_name, description, genre, author_id, published_at")
      .eq("author_id", profile.user_id)
      .eq("slug", bookSlug);
    if (!isOwner) {
      primaryBookQuery = primaryBookQuery.not("published_at", "is", null);
    }
    const { data: primaryBook } = await primaryBookQuery.maybeSingle();

    let resolvedBook = primaryBook;
    if (!resolvedBook && profile.pen_name) {
      let fallbackBookQuery = supabase
        .from("books")
        .select("id, title, slug, cover_image_url, author_name, description, genre, author_id, published_at")
        .eq("author_name", profile.pen_name)
        .eq("slug", bookSlug);
      if (!isOwner) {
        fallbackBookQuery = fallbackBookQuery.not("published_at", "is", null);
      }
      const { data: fallbackBook } = await fallbackBookQuery.maybeSingle();
      resolvedBook = fallbackBook;
    }

    if (!resolvedBook) { setNotFound(true); setLoading(false); return; }

    const authorIds = [...new Set([profile.user_id, resolvedBook.author_id].filter(Boolean))];

    const [allBooksRes, coachRes] = await Promise.all([
      supabase.from("books").select("slug, title, cover_image_url, genre").in("author_id", authorIds).not("published_at", "is", null).order("created_at", { ascending: false }),
      supabase.from("coaching_packages").select("id, title").in("author_id", authorIds).eq("status", "active"),
    ]);

    setBook(resolvedBook);
    setAllAuthorBooks(allBooksRes.data || []);
    setCoachingServices(coachRes.data || []);
    const bookId = resolvedBook.id;

    // Load product
    let query = supabase.from(config.table as any).select("*").in("author_id", authorIds);
    if (!["coaching_packages", "speaking_topics"].includes(config.table)) query = query.eq("book_id", bookId);
    if (config.statusField === "published_at") query = query.not("published_at", "is", null);
    else query = query.eq(config.statusField, config.statusValue);
    if ((config as any).typeFilter && config.table === "coaching_packages") query = query.eq("type", (config as any).typeFilter);
    const { data: productData } = await query.limit(1).maybeSingle() as { data: any };
    if (!productData) { setNotFound(true); setLoading(false); return; }
    setProduct(productData);

    // Load sales page content, testimonials, and sibling products in parallel
    const salesAssetType = ({ homestudy: "builder_sales_page_home-study-course", onlinecourse: "builder_sales_page_online-course", workbook: "builder_sales_page_workbook" } as Record<string, string>)[pType];

    const [salesRes, testimonialsRes, ...siblingResults] = await Promise.all([
      salesAssetType
        ? supabase.from("generated_assets").select("content").eq("book_id", bookId).in("author_id", authorIds).eq("asset_type", salesAssetType).order("updated_at", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("testimonials" as any).select("*").in("author_id", authorIds).order("created_at", { ascending: false }).limit(10) as any,
      ...[
        { table: "home_study_courses", status: "published", fields: "id, title, price, currency, description, cover_image_url", byBook: true },
        { table: "courses", status: "published", fields: "id, title, price, currency, description, cover_image_url", byBook: true },
        { table: "audiobooks", status: "published", fields: "id, title, price, currency, description", byBook: true },
        { table: "podcasts", status: "published", fields: "id, title, description", byBook: true },
        { table: "coaching_packages", status: "active", fields: "id, title, price, currency, description, type", byBook: false },
        { table: "speaking_topics", status: "active", fields: "id, title, fee, fee_currency, description", byBook: false },
      ].map(t => {
        let q = supabase.from(t.table as any).select(t.fields).in("author_id", authorIds).eq("status", t.status);
        if (t.byBook) q = q.eq("book_id", bookId);
        return q;
      }),
    ]);

    // Try sales page asset first, then fall back to product.description
    const rawSalesContent = salesRes?.data?.content || productData?.description || "";
    if (rawSalesContent) {
      try {
        const parsed = JSON.parse(rawSalesContent);
        if (parsed && typeof parsed === "object" && (parsed.hero || parsed.problem || parsed.pricing)) {
          setSalesCopyData(parsed as SalesCopyData);
        } else {
          setSalesPageContent(rawSalesContent);
        }
      } catch (error) {
        setSalesPageContent(rawSalesContent);
      }
    }

    // Filter testimonials for this product or book
    const allTestimonials = (testimonialsRes.data || []) as any[];
    const productTestimonials = allTestimonials.filter((t: any) => t.product_id === productData.id);
    const bookTestimonials = allTestimonials.filter((t: any) => t.book_id === bookId);
    setTestimonials(productTestimonials.length > 0 ? productTestimonials : bookTestimonials);

    // Build sibling product tabs + related products
    const tables = ["home_study_courses", "courses", "audiobooks", "podcasts", "coaching_packages", "speaking_topics"];
    const relProds: any[] = [];
    const navTabs: { label: string; icon: string; route: string }[] = [];
    siblingResults.forEach((res, i) => {
      (res.data || []).forEach((p: any) => {
        let route = tables[i] === "coaching_packages" ? (COACHING_TYPE_TO_ROUTE[p.type] || "coaching")
          : tables[i] === "speaking_topics" ? "speaking"
          : (PRODUCT_ROUTE_MAP[tables[i]] || "");
        const meta = getProductTabMeta(route);
        navTabs.push({ label: meta.label, icon: meta.icon, route });
        if (route !== pType) relProds.push({ ...p, route, type: route, price: p.price || p.fee });
      });
    });
    setAllBookProducts(navTabs);
    setRelatedProducts(relProds.slice(0, 6));
    setLoading(false);
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !author) return;
    setSubscribing(true);
    await supabase.functions.invoke("crm-auto-capture", {
      body: { email: email.trim(), name: name.trim(), source: "subscribe_form", source_detail: `product_page: ${authorSlug}/${bookSlug}/${productType}`, author_id: author.user_id, message: subMessage.trim() || undefined },
    });
    const enroll = await autoEnrollSubscriber({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      userId: author.user_id,
      source: "product_page",
      sourceDetail: `${authorSlug}/${bookSlug}/${productType}`,
    });
    const error = enroll?.error ? new Error(enroll.error) : null;
    setSubscribing(false);
    if (error) toast({ title: "Error", description: "Could not subscribe.", variant: "destructive" });
    else { setSubscribed(true); toast({ title: "Subscribed!" }); setEmail(""); setName(""); setSubMessage(""); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (notFound || !product || !author || !config || !theme) return <NotFound />;

  const v = theme.vars;
  const Icon = config.icon;
  const tagline = getProductTagline(pType, bookTitle, authorFirstName);
  const whatsIncludedHeading = getWhatsIncludedHeading(pType);
  const personas = getAutoPersonas(book?.genre || null, pType, bookTitle);
  const ctaText = getProductCTAText(pType, authorFirstName);
  const trustSignal = getTrustSignal(pType);
  const trustBarItems = getTrustBarItems(pType);
  const quickStats = getQuickStats(pType, product);
  const checklistItems = parseChecklistItems(product.description);
  const bookDescShort = book?.description ? book.description.split(/[.!?]\s/).slice(0, 2).join(". ") + "." : "";
  const authorBio = author.bio_short || "";
  const isPurchasable = product.price != null && product.price > 0 && ["homestudy", "onlinecourse", "workbook", "audiobook"].includes(pType);

  // Parse FAQs from salesPageContent
  const faqs: { q: string; a: string }[] = [];
  if (salesPageContent) {
    const faqMatch = salesPageContent.match(/(?:^|\n)##?\s*(?:FAQ|Frequently Asked Questions)[^\n]*\n([\s\S]*?)(?=\n##?\s|$)/i);
    if (faqMatch) {
      const faqBlock = faqMatch[1];
      const qaPairs = faqBlock.split(/\n(?:\*\*Q:|###?\s)/i).filter(Boolean);
      qaPairs.forEach(pair => {
        const lines = pair.trim().split("\n").filter(l => l.trim());
        if (lines.length >= 2) {
          const q = lines[0].replace(/^\*\*|\*\*$/g, "").replace(/^Q:\s*/i, "").trim();
          const a = lines.slice(1).join(" ").replace(/^\*\*A:\*\*\s*/i, "").replace(/^\*\*|\*\*$/g, "").trim();
          if (q && a) faqs.push({ q, a });
        }
      });
    }
  }

  const handleCTA = () => {
    if (isPurchasable) handleBuyNow();
    else {
      const el = document.getElementById("product-cta-bottom");
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else setContactOpen(true);
    }
  };

  return (
    <AuthorPageLayout theme={theme} breadcrumbs={[
      { label: "Home", to: "/" },
      { label: displayName, to: `/${authorSlug}` },
      { label: bookTitle, to: `/${authorSlug}/${bookSlug}` },
      { label: product.title },
    ]}>
      {/* 1. Author Nav */}
      <AuthorBrandedNav authorSlug={authorSlug!} authorName={displayName} authorPhotoUrl={author.photo_url}
        books={allAuthorBooks} hasServices={coachingServices.length > 0} vars={v}
        headingFont={theme.headingFont} bodyFont={theme.bodyFont} onContactClick={() => setContactOpen(true)} />

      <AuthorContactModal open={contactOpen} onClose={() => setContactOpen(false)} authorName={displayName}
        authorId={author.user_id} vars={{ ...v, bodyText: v.bodyText || "#4A4A4A" }}
        headingFont={theme.headingFont} bodyFont={theme.bodyFont} />

      {/* 2. Book Product Nav */}
      {allBookProducts.length > 0 && (
        <BookProductNav authorSlug={authorSlug!} bookSlug={bookSlug!} products={allBookProducts} vars={v} bodyFont={theme.bodyFont} />
      )}

      {/* 4. HERO — Content LEFT (60%), Visual RIGHT (40%) */}
      <section
        id="product-hero"
        className="relative overflow-hidden"
        style={{ background: v.primary, backgroundImage: `radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)` }}
      >
        <div className="relative container max-w-5xl py-12 md:py-20 px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* LEFT: Content (60%) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 text-center md:text-left order-2 md:order-1">
              {/* Badge */}
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wide mb-4"
                style={{ background: v.accent, color: v.accentText }}>
                <Icon className="h-3.5 w-3.5" />{config.label}
              </span>

              {/* H1 */}
              <h1 className="text-[2.75rem] leading-[1.15] font-bold mb-4" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>
                {product.title}
              </h1>

              {/* Tagline */}
              <p className="text-[1.25rem] mb-5 max-w-xl" style={{ color: `${v.primaryText}E6` }}>{tagline}</p>

              {/* Quick stats pills */}
              {quickStats.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5 justify-center md:justify-start">
                  {quickStats.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                      style={{ border: `1px solid ${v.primaryText}66`, color: `${v.primaryText}CC` }}>
                      {s.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              {product.price != null && product.price > 0 ? (
                <p className="text-[2rem] font-bold mb-5" style={{ color: v.accent, fontFamily: theme.headingFont }}>
                  {(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}
                </p>
              ) : product.price === 0 || product.price === null ? null : null}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                <button onClick={handleCTA} disabled={buying}
                  className="font-semibold text-[1.125rem] px-10 py-4 rounded-lg transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: v.accent, color: v.accentText, boxShadow: `0 4px 12px ${v.accent}4D` }}>
                  {buying ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : ctaText}
                </button>
                <button onClick={() => document.getElementById("product-details")?.scrollIntoView({ behavior: "smooth" })}
                  className="font-medium text-base px-8 py-3.5 rounded-lg transition-all"
                  style={{ background: "transparent", border: `2px solid ${v.primaryText}`, color: v.primaryText }}>
                  Learn More
                </button>
              </div>

              {/* Trust signal */}
              <p className="mt-4 text-[0.875rem]" style={{ color: `${v.primaryText}99` }}>{trustSignal}</p>
            </motion.div>

            {/* RIGHT: Visual (40%) */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-full md:w-[40%] shrink-0 flex justify-center order-1 md:order-2">
              {product.cover_image_url || book?.cover_image_url ? (
                <img src={product.cover_image_url || book?.cover_image_url} alt={product.title}
                  className="w-56 md:w-full max-w-xs rounded-2xl"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} />
              ) : (
                <div className="w-56 md:w-full max-w-xs aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-4"
                  style={{ background: v.cardBg, transform: "perspective(1000px) rotateY(-5deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  <Icon className="h-16 w-16" style={{ color: v.accent }} />
                  <span className="text-lg font-bold text-center px-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{product.title}</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. TRUST / SOCIAL PROOF BAR */}
      <section className="py-4" style={{ background: v.secondaryBg }}>
        <div className="container max-w-3xl flex items-center justify-center gap-6 flex-wrap">
          {testimonials.length > 0 ? (
            <>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4" style={{ color: v.accent, fill: v.accent }} />)}
              </div>
              <span className="text-[0.875rem]" style={{ color: v.mutedText }}>{testimonials.length} Verified Review{testimonials.length > 1 ? "s" : ""}</span>
            </>
          ) : (
            trustBarItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[0.875rem]" style={{ color: v.mutedText }}>
                <Shield className="h-3.5 w-3.5" style={{ color: v.accent }} />
                {item}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. IS THIS FOR YOU? – hidden when full sales copy is available */}
      {!salesCopyData && (
        <section id="product-details" className="py-16 md:py-20" style={{ background: "white" }}>
          <div className="container max-w-3xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Is This For You?</h2>
              <p className="text-[0.9rem] mb-8" style={{ color: v.mutedText }}>This {config.label.toLowerCase()} is perfect for you if...</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {personas.map((persona, i) => (
                  <div key={i} className="p-5 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
                    <Check className="h-5 w-5 mb-3" style={{ color: v.accent }} />
                    <p className="text-[0.9rem]" style={{ color: v.bodyText }}>{persona}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* 7. WHAT'S INSIDE – hidden when full sales copy is available */}
      {!salesCopyData && checklistItems.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-3xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-[2rem] font-bold mb-8" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{whatsIncludedHeading}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg" style={{ background: v.cardBg }}>
                    <div className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: v.accent }}>
                      <Check className="h-3.5 w-3.5" style={{ color: v.accentText }} />
                    </div>
                    <p className="text-[0.9rem] leading-relaxed" style={{ color: v.bodyText }}>{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* 8. BODY COPY (structured sales copy, markdown, or description) */}
      {salesCopyData && (
        <section className="py-16 md:py-20" style={{ background: "white" }}>
          <div className="container max-w-3xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <SharedSalesCopyPreview data={salesCopyData} onCtaClick={handleCTA} />
            </motion.div>
          </div>
        </section>
      )}

      {!salesCopyData && salesPageContent && (
        <section className="py-16 md:py-20" style={{ background: "white" }}>
          <div className="container max-w-3xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <ProductMarkdown content={salesPageContent} vars={v} />
            </motion.div>
          </div>
        </section>
      )}

      {!salesCopyData && !salesPageContent && product.description && (
        <section className="py-16 md:py-20" style={{ background: "white" }}>
          <div className="container max-w-3xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="text-xl font-bold mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>About This {config.label}</h2>
              <p className="text-[1.125rem] leading-[1.8]" style={{ color: v.bodyText }}>{product.description}</p>
            </motion.div>
          </div>
        </section>
      )}

      {/* 10. FAQ ACCORDION */}
      {faqs.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-3xl px-4">
            <h2 className="text-[2rem] font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Frequently Asked Questions</h2>
            <FAQAccordion faqs={faqs} vars={v} headingFont={theme.headingFont} />
          </div>
        </section>
      )}

      {/* 11. TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: "white" }}>
          <div className="container max-w-3xl px-4">
            <h2 className="text-[2rem] font-bold mb-8" style={{ color: v.headingText, fontFamily: theme.headingFont }}>What Others Are Saying</h2>
            <div className="space-y-6">
              {testimonials.map((t: any) => (
                <div key={t.id} className="p-6 rounded-xl" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}>
                  {t.rating && (
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4" style={{ color: v.accent, fill: v.accent }} />
                      ))}
                    </div>
                  )}
                  <p className="italic text-[1.05rem] leading-relaxed mb-3" style={{ color: v.bodyText }}>"{t.review_text}"</p>
                  <div>
                    <span className="font-bold text-sm" style={{ color: v.headingText }}>{t.reviewer_name}</span>
                    {t.reviewer_title && <span className="text-sm ml-2" style={{ color: v.mutedText }}>{t.reviewer_title}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 12. BASED ON THE BOOK */}
      {book && (
        <section className="py-16 md:py-20" style={{ background: v.primary }}>
          <div className="container max-w-3xl px-4">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt={book.title} className="w-[120px] h-auto rounded-lg shadow-lg shrink-0" />
              ) : (
                <div className="w-[120px] h-40 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${v.primaryText}1A` }}>
                  <BookOpen className="h-8 w-8" style={{ color: `${v.primaryText}66` }} />
                </div>
              )}
              <div>
                <p className="text-[1.125rem] leading-relaxed mb-3" style={{ color: `${v.primaryText}CC` }}>
                  This {config.label.toLowerCase()} is based on <strong style={{ color: v.primaryText }}>{book.title}</strong>
                </p>
                {bookDescShort && <p className="text-sm mb-4" style={{ color: `${v.primaryText}CC` }}>{bookDescShort}</p>}
                <p className="text-sm mb-4" style={{ color: `${v.primaryText}CC` }}>
                  {authorFirstName} created this {config.label.toLowerCase()} to help you apply the book's principles in a practical way.
                </p>
                <Link to={`/${authorSlug}/${bookSlug}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: v.accent }}>
                  Read more about the book <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 13. ABOUT THE AUTHOR */}
      <section className="py-16 md:py-20" style={{ background: "white" }}>
        <div className="container max-w-3xl px-4">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {author.photo_url ? (
              <img src={author.photo_url} alt={displayName} className="w-20 h-20 rounded-full object-cover shrink-0" style={{ border: `3px solid ${v.accent}` }} />
            ) : (
              <div className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center" style={{ background: v.accent }}>
                <span className="text-2xl font-bold" style={{ color: v.accentText }}>{displayName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{displayName}</h3>
              {author.tagline && <p className="text-sm mb-3" style={{ color: v.mutedText }}>{author.tagline}</p>}
              {authorBio && <p className="text-sm leading-relaxed mb-4" style={{ color: v.bodyText }}>{authorBio.length > 200 ? authorBio.slice(0, 200) + "..." : authorBio}</p>}
              <Link to={`/${authorSlug}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: v.accent }}>
                View Full Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 14. MORE FROM THIS BOOK */}
      {relatedProducts.length > 0 && (
        <section className="py-16 md:py-20" style={{ background: v.secondaryBg }}>
          <div className="container max-w-4xl px-4">
            <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>More from {bookTitle}</h2>
            <p className="text-sm mb-6" style={{ color: v.mutedText }}>Explore other resources {authorFirstName} has created from this book.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rp, i) => {
                const RpIcon = PRODUCT_CONFIG[rp.route]?.icon || BookOpen;
                const rpLabel = PRODUCT_CONFIG[rp.route]?.label || rp.route;
                const rpCTA = getProductCardCTAText(rp.route);
                return (
                  <motion.div key={rp.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}>
                    <Link to={`/${authorSlug}/${bookSlug}/${rp.route}`}
                      className="group block overflow-hidden rounded-xl transition-all hover:shadow-lg"
                      style={{ border: `1px solid ${v.cardBorder}`, background: v.cardBg }}>
                      <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent}33)` }}>
                        <RpIcon className="h-10 w-10" style={{ color: `${v.primaryText}66` }} />
                      </div>
                      <div className="p-4">
                        <span className="inline-block text-[0.7rem] font-semibold uppercase px-2 py-0.5 rounded-full mb-2" style={{ background: v.accent, color: v.accentText }}>{rpLabel}</span>
                        <h4 className="font-bold text-sm mb-1 line-clamp-2 group-hover:underline" style={{ color: v.headingText }}>{rp.title}</h4>
                        {rp.price != null && rp.price > 0 && <span className="font-bold text-sm" style={{ color: v.accent }}>${rp.price}</span>}
                        <div className="mt-3"><span className="text-xs font-bold" style={{ color: v.accent }}>{rpCTA}</span></div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 15. FINAL CTA + LEAD CAPTURE */}
      <section id="product-cta-bottom" className="py-16 md:py-20" style={{ background: v.primary }}>
        <div className="container max-w-4xl px-4">
          {subscribed ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: v.accent }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>You're subscribed!</h3>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-12">
              {/* CTA Repeat */}
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold mb-3" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>Ready to Get Started?</h2>
                <p className="text-lg font-bold mb-2" style={{ color: v.primaryText }}>{product.title}</p>
                {product.price != null && product.price > 0 && (
                  <p className="text-2xl font-bold mb-4" style={{ color: v.accent }}>{(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}</p>
                )}
                <button onClick={handleCTA} disabled={buying}
                  className="font-bold text-base px-8 py-3.5 rounded-lg transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: v.accent, color: v.accentText }}>
                  {buying ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : ctaText}
                </button>
                <p className="mt-3 text-xs" style={{ color: `${v.primaryText}99` }}>{trustSignal}</p>
              </div>

              {/* Lead Capture (shared) */}
              <div>
                <LeadCaptureForm
                  authorUserId={author.user_id}
                  displayName={authorFirstName}
                  source="author_product"
                  sourceDetail={`${authorSlug}/${bookSlug}/${productType}`}
                  showMessage={false}
                  accent={v.accent}
                  accentText={v.accentText}
                  primaryText={v.primaryText}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* STICKY MOBILE BUY BAR */}
      {product.price != null && product.price > 0 && !heroVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden py-3 px-4 flex items-center justify-between"
          style={{ background: v.primary, borderTop: `1px solid ${v.accent}`, boxShadow: "0 -4px 20px rgba(0,0,0,0.3)", height: "64px" }}>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: `${v.primaryText}CC` }}>{product.title}</p>
            <p className="text-lg font-bold" style={{ color: v.accent }}>{(product.currency || "USD") === "USD" ? "$" : product.currency}{product.price}</p>
          </div>
          <button onClick={handleCTA} disabled={buying}
            className="rounded-lg font-bold px-5 py-2.5 text-sm shrink-0 disabled:opacity-60"
            style={{ background: v.accent, color: v.accentText }}>
            {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaText}
          </button>
        </div>
      )}
      {product.price != null && product.price > 0 && <div className="h-16 md:hidden" />}
    </AuthorPageLayout>
  );
}

/* ===== Sub-components ===== */
function CourseModules({ courseId, theme }: { courseId: string; theme: AuthorTheme }) {
  const [modules, setModules] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("course_modules").select("*, course_lessons(*)").eq("course_id", courseId).order("position").then(({ data }) => setModules(data || []));
  }, [courseId]);
  if (modules.length === 0) return null;
  const v = theme.vars;
  return (
    <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
      <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Course Curriculum</h3>
      <div className="space-y-4">
        {modules.map((mod, i) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: v.accent, color: v.accentText }}>{i + 1}</span>
              <h4 className="font-semibold text-sm" style={{ color: v.headingText }}>{mod.title}</h4>
            </div>
            {mod.description && <p className="text-xs ml-9 mb-1" style={{ color: v.mutedText }}>{mod.description}</p>}
            {mod.course_lessons?.length > 0 && (
              <ul className="ml-9 space-y-1">
                {mod.course_lessons.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                  <li key={lesson.id} className="text-xs flex items-center gap-1.5" style={{ color: v.mutedText }}>
                    <Star className="h-2.5 w-2.5" style={{ color: v.accent }} />{lesson.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PodcastEpisodes({ podcastId, theme }: { podcastId: string; theme: AuthorTheme }) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("podcast_episodes").select("id, title, description, episode_number, duration_minutes, audio_url").eq("podcast_id", podcastId).order("episode_number").then(({ data }) => setEpisodes(data || []));
  }, [podcastId]);
  if (episodes.length === 0) return null;
  const v = theme.vars;
  return (
    <div className="p-6 rounded-lg" style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, borderRadius: theme.borderRadius }}>
      <h3 className="font-bold text-lg mb-4" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Episodes</h3>
      <div className="space-y-4">
        {episodes.map((ep) => (
          <div key={ep.id} className="flex gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${v.accent}1A`, color: v.accent }}>{ep.episode_number}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold" style={{ color: v.headingText }}>{ep.title}</h4>
              {ep.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: v.mutedText }}>{ep.description}</p>}
              {ep.duration_minutes && <p className="text-xs mt-1" style={{ color: v.mutedText }}>{ep.duration_minutes} min</p>}
              {ep.audio_url && <audio controls className="w-full mt-2 h-8"><source src={ep.audio_url} /></audio>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
