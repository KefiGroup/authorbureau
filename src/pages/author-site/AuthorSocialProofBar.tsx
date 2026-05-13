import { motion } from "framer-motion";
import { Star, BookOpen, Users } from "lucide-react";
import type { BookWithProducts, ThemeVars } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  booksWithProducts: BookWithProducts[];
  testimonialsCount: number;
  theme: AuthorTheme;
  v: ThemeVars;
}

/**
 * Sprint 4 — 80px cream proof strip rendered under the hero.
 * Derives stats from existing book data; renders nothing when no
 * meaningful proof points are available (cleanly hidden, no skeletons).
 */
export default function AuthorSocialProofBar({ booksWithProducts, testimonialsCount, theme, v }: Props) {
  const totalReviews = booksWithProducts.reduce((sum, b) => sum + (b.rating ? 1 : 0), 0);
  const ratings = booksWithProducts.map(b => b.rating).filter((r): r is number => typeof r === "number" && r > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const items = [
    booksWithProducts.length > 0
      ? { icon: BookOpen, label: `${booksWithProducts.length} ${booksWithProducts.length === 1 ? "Book" : "Books"} Published` }
      : null,
    avgRating ? { icon: Star, label: `${avgRating.toFixed(1)} Avg Reader Rating` } : null,
    testimonialsCount >= 3 ? { icon: Users, label: `${testimonialsCount}+ Reader Reviews` } : null,
  ].filter(Boolean) as { icon: typeof Star; label: string }[];

  if (items.length < 2) return null;
  void totalReviews;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ background: v.secondaryBg, borderBottom: `1px solid ${v.cardBorder}` }}
    >
      <div className="container max-w-5xl py-5">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: v.accent }} />
                <span
                  className="text-xs md:text-sm font-semibold uppercase tracking-wider"
                  style={{ color: v.headingText, fontFamily: theme.bodyFont }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
