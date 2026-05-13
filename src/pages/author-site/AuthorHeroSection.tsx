import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, Globe, Linkedin, Twitter, Instagram, Youtube, Facebook } from "lucide-react";
import type { AuthorData, BookWithProducts, ThemeVars } from "./types";
import { getLowestPrice } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import { stripHtml } from "@/lib/stripHtml";

const SOCIAL_LINKS = [
  { key: "website_url", icon: Globe, label: "Website" },
  { key: "linkedin_url", icon: Linkedin, label: "LinkedIn" },
  { key: "amazon_author_profile_url", icon: BookOpen, label: "Amazon" },
  { key: "twitter_url", icon: Twitter, label: "Twitter/X" },
  { key: "instagram_url", icon: Instagram, label: "Instagram" },
  { key: "facebook_url", icon: Facebook, label: "Facebook" },
  { key: "youtube_url", icon: Youtube, label: "YouTube" },
] as const;

interface Props {
  author: AuthorData;
  displayName: string;
  booksWithProducts: BookWithProducts[];
  allProducts: { type: string }[];
  testimonialsCount?: number;
  liveProductsCount?: number;
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorHeroSection({ author, displayName, booksWithProducts, allProducts, testimonialsCount = 0, liveProductsCount = 0, theme, v }: Props) {
  const totalBooks = booksWithProducts.length;
  const totalProducts = Math.max(allProducts.length, liveProductsCount);

  const socialLinks = SOCIAL_LINKS.filter(
    (s) => (author as unknown as Record<string, unknown>)[s.key]
  );

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: v.primary,
        backgroundImage: `radial-gradient(ellipse at 30% 50%, ${v.accent}0D 0%, transparent 70%)`,
      }}
    >
      <div className="relative container max-w-5xl py-16 md:py-24">
        <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-12">
          {/* Author Photo */}
          {author.photo_url ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <img
                src={author.photo_url}
                alt={displayName}
                className="w-40 h-48 md:w-52 md:h-64 object-cover"
                style={{ border: `3px solid ${v.accent}`, borderRadius: "16px", boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)" }}
              />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div
                className="w-40 h-48 md:w-52 md:h-64 flex items-center justify-center"
                style={{ background: v.accent, borderRadius: "16px", boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)" }}
              >
                <span className="text-[3rem] font-bold" style={{ color: v.accentText }}>{displayName.charAt(0)}</span>
              </div>
            </motion.div>
          )}

          {/* Text Content */}
          <div className="text-center md:text-left flex-1">
            {booksWithProducts.some(b => b.badges && b.badges.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-[0.12em]"
                style={{ background: v.accent, color: v.accentText }}
              >
                Bestselling Author
              </motion.div>
            )}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold mb-3"
              style={{ color: v.primaryText, fontFamily: theme.headingFont }}
            >
              {displayName}
            </motion.h1>

            {/* Dynamic one-liner — prefer the curated short bio; fall back to a
                book/genre summary only when no bio is set. Genres are sanitized
                so Amazon category breadcrumbs (e.g. "Kindle Store › ...") never
                leak into the hero. */}
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-lg md:text-xl mb-5" style={{ color: `${v.primaryText}D9` }}
            >
              {(() => {
                const bio = stripHtml(author.bio_short || "");
                if (bio) return bio;
                const hasBestseller = booksWithProducts.some(b => b.badges && b.badges.length > 0);
                const cleanGenres = [
                  ...new Set(
                    booksWithProducts
                      .map(b => b.genre)
                      .filter(Boolean)
                      .filter((g): g is string =>
                        typeof g === "string" &&
                        g.length <= 60 &&
                        !/›|kindle|amazon/i.test(g)
                      )
                  ),
                ];
                const gStr = cleanGenres.length > 0 ? ` in ${cleanGenres.join(", ")}` : "";
                const prefix = hasBestseller ? "a bestselling author" : "an author";
                return totalBooks > 0
                  ? `${displayName} is ${prefix} of ${totalBooks} book${totalBooks !== 1 ? "s" : ""}${gStr}.`
                  : (author.tagline || "");
              })()}
            </motion.p>

            {author.tagline && totalBooks > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-base mb-4" style={{ color: `${v.primaryText}D9` }}
              >{author.tagline}</motion.p>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex gap-3 mb-6 justify-center md:justify-start"
              >
                {socialLinks.map((s) => {
                  const Icon = s.icon;
                  const url = (author as unknown as Record<string, unknown>)[s.key] as string;
                  return (
                    <a key={s.key} href={url} target="_blank" rel="noopener noreferrer" title={s.label}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: "rgba(255,255,255,0.08)", color: v.accent }}>
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center md:justify-start">
              {(() => {
                const heroBook = booksWithProducts[0];
                const lowest = heroBook ? getLowestPrice(heroBook) : null;
                if (heroBook && lowest) {
                  return (
                    <Link
                      to={`/${(author.author_slug || "")}/${heroBook.slug}`}
                      className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:scale-105"
                      style={{ background: v.accent, color: v.accentText, padding: "14px 32px", borderRadius: "8px", boxShadow: `0 4px 16px ${v.accent}66` }}>
                      <BookOpen className="h-4 w-4" /> Get the Book — {lowest}
                    </Link>
                  );
                }
                if (heroBook) {
                  return (
                    <Link
                      to={`/${(author.author_slug || "")}/${heroBook.slug}`}
                      className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:scale-105"
                      style={{ background: v.accent, color: v.accentText, padding: "14px 32px", borderRadius: "8px", boxShadow: `0 4px 16px ${v.accent}66` }}>
                      <BookOpen className="h-4 w-4" /> Read the Book
                    </Link>
                  );
                }
                return null;
              })()}
              <button
                onClick={() => document.getElementById("subscribe-section")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 font-bold rounded-lg transition-all hover:brightness-110 min-h-[48px]"
                style={{ background: "transparent", border: `2px solid ${v.accent}`, color: v.accent, padding: "12px 32px", borderRadius: "8px" }}>
                <Sparkles className="h-4 w-4" /> Get the Free Starter Kit
              </button>
            </motion.div>
          </div>
        </div>

        {/* Stats Strip */}
        {(totalBooks > 0 || totalProducts > 0 || testimonialsCount > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-12 flex flex-wrap justify-center md:justify-start gap-6 md:gap-10 pt-8"
            style={{ borderTop: `1px solid rgba(255,255,255,0.1)` }}>
            {totalBooks > 0 && (
              <div className="text-center md:text-left">
                <span className="text-2xl md:text-3xl font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{totalBooks}</span>
                <span className="block text-xs mt-1" style={{ color: `${v.primaryText}D9` }}>Books Published</span>
              </div>
            )}
            {totalProducts > 0 && (
              <div className="text-center md:text-left">
                <span className="text-2xl md:text-3xl font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{totalProducts}</span>
                <span className="block text-xs mt-1" style={{ color: `${v.primaryText}D9` }}>Products & Services</span>
              </div>
            )}
            {testimonialsCount > 0 && (
              <div className="hidden sm:block text-center md:text-left">
                <span className="text-2xl md:text-3xl font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{testimonialsCount}</span>
                <span className="block text-xs mt-1" style={{ color: `${v.primaryText}D9` }}>Reader Testimonials</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
