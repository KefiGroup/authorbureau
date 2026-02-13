import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Mail, Linkedin, BookOpen, ArrowLeft, Mic, GraduationCap, Globe, Award, MapPin, Building2 } from "lucide-react";
import { getAuthorBySlug } from "@/data/authors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BadgeDisplay from "@/components/BadgeDisplay";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";
import feliciaPhoto from "@/assets/felicia-tan.png";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
  "felicia-tan": feliciaPhoto,
};

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
  const author = getAuthorBySlug(slug || "");

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
              <div className="relative">
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={photoMap[author.slug]}
                  alt={author.name}
                  className="w-full max-w-sm mx-auto rounded-2xl object-cover shadow-lg"
                  style={{ maxHeight: '420px' }}
                />
                <div className="absolute top-4 right-4">
                  <BadgeDisplay level={author.badge} size="sm" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-3">
              <h1 className="font-heading text-3xl font-bold md:text-4xl">{author.name}</h1>
              <p className="mt-2 text-lg text-primary-foreground/70">{author.title}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {author.credentials.map((c) => (
                  <span key={c} className="rounded-full border border-primary-foreground/20 px-3 py-1 text-xs text-primary-foreground/70">
                    {c}
                  </span>
                ))}
              </div>

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
                {author.email && (
                  <a href={`mailto:${author.email}`}
                    className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
                    <Mail className="h-4 w-4" /> Email
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
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed text-base">
              {author.bio}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Books */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container">
          <h2 className="mb-8 font-heading text-2xl font-bold">
            Books by {author.name}
          </h2>
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {author.books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        </div>
      </section>

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
                  <Card key={s} className="border-0 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all rounded-2xl">
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

      <Footer />
    </div>
  );
}
