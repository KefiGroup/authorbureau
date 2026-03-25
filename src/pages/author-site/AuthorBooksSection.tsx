import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { BookWithProducts, ThemeVars } from "./types";
import { fadeUp, getLowestPrice } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  authorSlug: string;
  displayName: string;
  booksWithProducts: BookWithProducts[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorBooksSection({ authorSlug, displayName, booksWithProducts, theme, v }: Props) {
  if (booksWithProducts.length === 0) return null;
  const totalBooks = booksWithProducts.length;

  return (
    <section id="books-section" className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-10" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
            {totalBooks >= 3 ? "Published Works by" : "Books by"} {displayName}
          </h2>
        </motion.div>
        <div className="space-y-6">
          {booksWithProducts.map((book, idx) => {
            const lowestPrice = getLowestPrice(book);
            const desc = book.description || "";
            const shortDesc = desc.split(/\.\s+/).slice(0, 2).join(". ") + (desc.includes(".") ? "." : "");
            return (
              <motion.div key={book.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                <div
                  className="flex flex-col md:flex-row overflow-hidden transition-all group"
                  style={{ borderRadius: "12px", border: `1px solid ${v.cardBorder}`, background: v.cardBg, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <Link to={`/${authorSlug}/${book.slug}`} className="shrink-0 md:w-44">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} loading="lazy"
                        className="w-full h-48 md:h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-48 md:h-full flex flex-col items-center justify-center p-4"
                        style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent})` }}>
                        <span className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Book</span>
                        <span className="text-center font-semibold text-sm leading-snug" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>{book.title}</span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 p-6 flex flex-col justify-center min-w-0">
                    <Link to={`/${authorSlug}/${book.slug}`}>
                      <h3 className="font-bold text-xl mb-1 group-hover:underline" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{book.title}</h3>
                    </Link>
                    {book.subtitle && <p className="text-sm italic mb-2" style={{ color: v.bodyText }}>{book.subtitle}</p>}
                    {shortDesc && <p className="text-sm leading-relaxed line-clamp-3 mb-3" style={{ color: v.bodyText }}>{shortDesc}</p>}
                    {book.badges && book.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {book.badges.map((badge) => (
                          <span key={badge} className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                            style={{ background: v.accent, color: v.accentText }}>⭐ {badge}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 p-6 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:border-l" style={{ borderColor: v.cardBorder }}>
                    {lowestPrice && <span className="text-lg font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{lowestPrice}</span>}
                    <Link to={`/${authorSlug}/${book.slug}`}>
                      <button className="inline-flex items-center gap-1.5 font-bold text-sm rounded-lg transition-all px-5 py-2.5"
                        style={{ background: v.primary, color: v.primaryText }}>
                        View Book <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
