import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Mail, Linkedin, BookOpen, ArrowLeft } from "lucide-react";
import { getAuthorBySlug } from "@/data/authors";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import paulinePhoto from "@/assets/pauline-teo.jpeg";
import bobPhoto from "@/assets/bob-battista.jpg";
import besuckcessfulCover from "@/assets/besuckcessful-cover.jpg";
import hiCover from "@/assets/hemispheric-intelligence-cover.png";
import viCover from "@/assets/value-investing-women-cover.png";
import ilbCover from "@/assets/invest-like-buffett-cover.jpg";

const photoMap: Record<string, string> = {
  "pauline-teo": paulinePhoto,
  "robert-battista": bobPhoto,
};
const coverMap: Record<string, string> = {
  "be-suckcessful": besuckcessfulCover,
  "hemispheric-intelligence": hiCover,
  "value-investing-for-women": viCover,
  "invest-like-buffett": ilbCover,
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
          <h1 className="font-heading text-3xl font-bold">Author not found</h1>
          <Button asChild className="mt-4" variant="outline">
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

      {/* Hero */}
      <section className="border-b border-border bg-primary py-16 text-primary-foreground">
        <div className="container">
          <Link to="/directory" className="mb-6 inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={photoMap[author.slug]}
              alt={author.name}
              className="h-40 w-40 rounded-2xl object-cover shadow-lg"
            />
            <div className="text-center sm:text-left">
              <div className="mb-2 inline-flex items-center rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                ✦ PublishNow Verified
              </div>
              <h1 className="font-heading text-3xl font-bold md:text-4xl">{author.name}</h1>
              <p className="mt-1 text-lg text-primary-foreground/70">{author.title}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {author.credentials.map((c) => (
                  <span key={c} className="rounded-full border border-primary-foreground/20 px-3 py-1 text-xs text-primary-foreground/70">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                {author.websiteUrl && (
                  <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-secondary transition-colors">
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
                {author.linkedinUrl && (
                  <a href={author.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-secondary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {author.amazonAuthorUrl && (
                  <a href={author.amazonAuthorUrl} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-secondary transition-colors">
                    <BookOpen className="h-5 w-5" />
                  </a>
                )}
                {author.email && (
                  <a href={`mailto:${author.email}`} className="text-primary-foreground/60 hover:text-secondary transition-colors">
                    <Mail className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" animate="visible">
            <motion.h2 variants={fadeUp} custom={0} className="mb-4 font-heading text-2xl font-bold">
              About {author.name}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed">
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {author.books.map((book, i) => (
              <motion.div
                key={book.slug}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/books/${book.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex items-center justify-center bg-muted/50 p-8">
                    <img
                      src={coverMap[book.slug]}
                      alt={book.title}
                      className="h-48 rounded-lg object-contain shadow-md transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex flex-wrap gap-1">
                      {book.badges.map((b) => (
                        <span key={b} className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                          {b}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-heading text-lg font-bold group-hover:text-secondary transition-colors">{book.title}</h3>
                    <p className="text-sm italic text-muted-foreground">{book.subtitle}</p>
                    {book.price && <p className="mt-2 text-sm font-semibold text-foreground">{book.price}</p>}
                  </div>
                </Link>
              </motion.div>
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
              {author.services.map((s) => (
                <div key={s} className="rounded-xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
                  <h3 className="font-heading text-lg font-bold">{s}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Contact {author.name.split(" ")[0]} for {s.toLowerCase()} inquiries.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
