import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Mail, Linkedin, BookOpen, ArrowLeft, Mic, GraduationCap, Globe, Award, Loader2 } from "lucide-react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getAuthorBySlug } from "@/data/authors";
import type { Book as StaticBook } from "@/data/authors";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceInquiryForm from "@/components/ServiceInquiryForm";

import feliciaPhoto from "@/assets/felicia-tan-headshot.png";

const staticPhotoMap: Record<string, string> = {
  "felicia-tan": feliciaPhoto,
};

interface DynamicAuthor {
  slug: string;
  name: string;
  photo: string;
  title: string;
  bio: string;
  shortBio: string;
  credentials: any[];
  genres: string[];
  badge: "listed" | "verified" | "featured" | "ab-verified";
  services: string[];
  books: StaticBook[];
  websiteUrl?: string;
  linkedinUrl?: string;
  amazonAuthorUrl?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 } as const,
  }),
};

export default function AuthorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const staticAuthor = getAuthorBySlug(slug || "");
  const [dynamicAuthor, setDynamicAuthor] = useState<DynamicAuthor | null>(null);
  const [dbBooks, setDbBooks] = useState<StaticBook[] | null>(null);
  const [isLoading, setIsLoading] = useState(!staticAuthor);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");

  // Fetch dynamic author if not found in static data
  useEffect(() => {
    if (staticAuthor || !slug) {
      setIsLoading(false);
      return;
    }

    const fetchDynamic = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-author-profile`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.author) {
            setDynamicAuthor(data.author);
          }
        }
      } catch (err) {
        console.error("Failed to fetch author:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDynamic();
  }, [slug, staticAuthor]);

  // For static authors, also fetch their books from DB to get latest edits
  useEffect(() => {
    if (!staticAuthor) return;
    const slugs = staticAuthor.books.map((b) => b.slug);
    if (slugs.length === 0) return;

    supabase
      .from("books")
      .select(BOOK_PUBLIC_COLUMNS)
      .in("slug", slugs)
      .not("published_at", "is", null)
      .then(({ data }) => {
        const rows = (data || []) as unknown as Record<string, any>[];
        if (rows.length === 0) return;
        const merged: StaticBook[] = staticAuthor.books.map((sb) => {
          const db = rows.find((d) => d.slug === sb.slug);
          if (!db) return sb;
          return {
            ...sb,
            title: db.title || sb.title,
            subtitle: db.subtitle || sb.subtitle,
            description: db.description || sb.description,
            kindlePrice: db.kindle_price || sb.kindlePrice,
            paperbackPrice: db.paperback_price || sb.paperbackPrice,
            price: db.price || sb.price,
            pages: db.pages || sb.pages,
            rating: db.rating ? Number(db.rating) : sb.rating,
            badges: db.badges && db.badges.length > 0 ? db.badges : sb.badges,
            genre: db.genre || sb.genre,
            amazonUrl: db.amazon_url || sb.amazonUrl,
          };
        });
        setDbBooks(merged);
      });
  }, [staticAuthor]);

  // Resolve which author to render
  const author = staticAuthor
    ? {
        slug: staticAuthor.slug,
        name: staticAuthor.name,
        photo: staticPhotoMap[staticAuthor.slug] || staticAuthor.photo,
        title: staticAuthor.title,
        bio: staticAuthor.bio,
        shortBio: staticAuthor.shortBio,
        credentials: staticAuthor.credentials,
        genres: staticAuthor.genres,
        badge: staticAuthor.badge,
        services: staticAuthor.services,
        books: dbBooks || staticAuthor.books,
        websiteUrl: staticAuthor.websiteUrl,
        linkedinUrl: staticAuthor.linkedinUrl,
        amazonAuthorUrl: staticAuthor.amazonAuthorUrl,
      }
    : dynamicAuthor;

  const authorPageUrl = `${window.location.origin}/authors/${author?.slug || slug}`;
  const metaDesc = author
    ? (author.shortBio || author.bio?.slice(0, 155) || `${author.name} — ${author.title}`)
    : "Author Profile | Authors Bureau";

  useDocumentMeta({
    title: author ? `${author.name} — ${author.title} | Authors Bureau` : "Author Profile | Authors Bureau",
    description: metaDesc,
    ogTitle: author?.name,
    ogDescription: metaDesc,
    ogImage: author?.photo || undefined,
    ogUrl: authorPageUrl,
    twitterCard: "summary_large_image",
    jsonLd: author ? {
      "@context": "https://schema.org",
      "@type": "Person",
      name: author.name,
      description: author.bio,
      image: author.photo,
      url: authorPageUrl,
      jobTitle: author.title,
      ...(author.websiteUrl && { sameAs: [author.websiteUrl, author.linkedinUrl, author.amazonAuthorUrl].filter(Boolean) }),
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Author not found</h1>
          <p className="text-muted-foreground mt-2">The author you're looking for doesn't exist or has been removed.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/directory">Back to Directory</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const credentialsList = Array.isArray(author.credentials)
    ? author.credentials.map((c: any) => (typeof c === "string" ? c : c.label || c.title || String(c)))
    : [];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero - Author Header */}
      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container">
          <Link to="/directory" className="mb-6 inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
            {/* Photo */}
            <div className="lg:col-span-2">
              {author.photo ? (
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={author.photo}
                  alt={author.name}
                  className="w-full max-w-sm mx-auto rounded-2xl object-cover object-top shadow-lg"
                  style={{ maxHeight: '480px' }}
                />
              ) : (
                <div className="w-full max-w-sm mx-auto rounded-2xl bg-primary-foreground/10 flex items-center justify-center" style={{ height: '360px' }}>
                  <BookOpen className="h-16 w-16 text-primary-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-3">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading text-3xl font-bold md:text-4xl">{author.name}</h1>
                <BadgeDisplay level={author.badge} size="sm" />
              </div>
              <p className="mt-2 text-lg text-primary-foreground/70">{author.title}</p>

              {credentialsList.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {credentialsList.map((c: string) => (
                    <span key={c} className="rounded-full border border-primary-foreground/20 px-3 py-1 text-xs text-primary-foreground/70">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick stats */}
              <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-primary-foreground/10">
                <div className="flex items-center gap-1.5 text-sm text-primary-foreground/60">
                  <BookOpen className="h-4 w-4 text-secondary/70" />
                  <span className="font-semibold text-primary-foreground">{author.books.length}</span> Books
                </div>
                {author.services.includes("Speaking") && (
                  <div className="flex items-center gap-1.5 text-sm text-primary-foreground/60">
                    <Mic className="h-4 w-4 text-secondary/70" />
                    Speaker
                  </div>
                )}
                {author.services.includes("Coaching") && (
                  <div className="flex items-center gap-1.5 text-sm text-primary-foreground/60">
                    <GraduationCap className="h-4 w-4 text-secondary/70" />
                    Coach
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="mt-5 flex flex-wrap gap-3">
                {author.websiteUrl && (
                  <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {author.linkedinUrl && (
                  <a href={author.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
                {author.amazonAuthorUrl && (
                  <a href={author.amazonAuthorUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
                    <BookOpen className="h-4 w-4" /> Amazon
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" animate="visible">
            <motion.h2 variants={fadeUp} custom={0} className="mb-4 font-heading text-2xl font-bold">
              About {author.name}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
              {author.bio}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Books */}
      {author.books.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container">
            <h2 className="mb-8 font-heading text-2xl font-bold">
              Books by {author.name}
            </h2>
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {author.books.map((book) => (
                <BookCard key={book.slug} book={book} authorSlug={author.slug} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {author.services.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="mb-8 font-heading text-2xl font-bold">Services</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {author.services.map((s) => {
                const iconMap: Record<string, typeof Mic> = {
                  Speaking: Mic,
                  Coaching: GraduationCap,
                  Consulting: Award,
                  Courses: BookOpen,
                };
                const Icon = iconMap[s] || Award;
                return (
                  <Card
                    key={s}
                    className="border-0 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all rounded-2xl cursor-pointer"
                    onClick={() => { setSelectedService(s); setInquiryOpen(true); }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                        <Icon className="h-6 w-6 text-secondary" />
                      </div>
                      <h3 className="font-heading text-lg font-bold">{s}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Contact {author.name.split(" ")[0]} for {s.toLowerCase()} inquiries.
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Visit Full Author Website CTA */}
      {author.websiteUrl && (
        <section className="border-t border-border py-10">
          <div className="container max-w-4xl">
            <Card className="border-secondary/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Globe className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-heading text-lg font-bold">Visit {author.name.split(" ")[0]}'s Full Website</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Explore their complete author headquarters — products, courses, coaching, and more.
                  </p>
                </div>
                <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
                  <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer">
                    Visit Website <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}


      {author.services.length > 0 && (
        <ServiceInquiryForm
          open={inquiryOpen}
          onOpenChange={setInquiryOpen}
          authorName={author.name}
          authorSlug={author.slug}
          serviceType={selectedService}
        />
      )}

      <Footer />
    </div>
  );
}
