import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Star } from "lucide-react";
import { getBookBySlug } from "@/data/authors";
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

export default function BookMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const result = getBookBySlug(slug || "");

  if (!result) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-24 text-center">
          <h1 className="font-heading text-3xl font-bold">Book not found</h1>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/directory">Browse Authors</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const { book, author } = result;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground">
        <div className="container relative z-10">
          <Link to={`/authors/${author.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" /> {author.name}
          </Link>

          <div className="flex flex-col items-center gap-12 lg:flex-row">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <img
                src={coverMap[book.slug]}
                alt={book.title}
                className="h-80 rounded-xl object-contain shadow-2xl lg:h-96"
              />
            </motion.div>

            <motion.div initial="hidden" animate="visible" className="text-center lg:text-left">
              <motion.div variants={fadeUp} custom={0} className="mb-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                {book.badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-sm font-semibold text-secondary">
                    <Star className="h-3 w-3" /> {b}
                  </span>
                ))}
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="font-heading text-4xl font-bold md:text-5xl">
                {book.title}
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="mt-2 text-xl italic text-primary-foreground/70">
                {book.subtitle}
              </motion.p>
              <motion.p variants={fadeUp} custom={3} className="mt-2 text-primary-foreground/60">
                by{" "}
                <Link to={`/authors/${author.slug}`} className="text-secondary hover:underline">
                  {author.name}
                </Link>
              </motion.p>
              <motion.div variants={fadeUp} custom={4} className="mt-6 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-semibold shadow-none"
                >
                  <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
                    Order on Amazon <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="mb-6 font-heading text-2xl font-bold">
              About the Book
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg leading-relaxed text-muted-foreground">
              {book.description}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Author Bio */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container max-w-3xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <img
              src={photoMap[author.slug]}
              alt={author.name}
              className="h-24 w-24 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-heading text-xl font-bold">{author.name}</h3>
              <p className="text-sm text-muted-foreground">{author.title}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{author.shortBio}</p>
              <Link
                to={`/authors/${author.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline"
              >
                View Full Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container text-center">
          <h2 className="mb-4 font-heading text-2xl font-bold">Get Your Copy</h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            Available on Amazon in Kindle and paperback formats.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold shadow-none"
          >
            <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
              Buy on Amazon <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
