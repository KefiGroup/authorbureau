import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Headphones, BookOpen, Package, Star } from "lucide-react";
import type { BookWithProducts, ThemeVars, BookFormatNode } from "./types";
import { fadeUp, getLowestPrice } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "./AuthorLeadMagnetsSection";
import AuthorBookFormatsList from "./AuthorBookFormatsList";
import AuthorBookCollectorsStrip from "./AuthorBookCollectorsStrip";

/** Maps node_id prefixes to format badge info */
const FORMAT_BADGES: Record<string, { label: string; icon: typeof BookOpen }> = {
  "BP-08": { label: "Special Edition", icon: Star },
  "BA-11": { label: "Audiobook", icon: Headphones },
  "BP-06": { label: "Workbook", icon: BookOpen },
  "BA-17": { label: "Bundle", icon: Package },
};

interface Props {
  authorSlug: string;
  displayName: string;
  booksWithProducts: BookWithProducts[];
  liveNodes?: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
  /** Author profile id — required for ProductCTA in the formats list. */
  authorId: string;
  /** Whether Stripe is connected (Authors Bureau platform default: true). */
  stripeReady?: boolean;
  /** Whether the viewer is the owning author. */
  isOwnerViewing?: boolean;
}

export default function AuthorBooksSection({ authorSlug, displayName, booksWithProducts, liveNodes = [], theme, v, authorId, stripeReady = true, isOwnerViewing = false }: Props) {
  if (booksWithProducts.length === 0) return null;
  const totalBooks = booksWithProducts.length;

  // Derive per-book format badges from live nodes
  const bookFormatBadges = new Map<string, { label: string; icon: typeof BookOpen }[]>();
  liveNodes.forEach(node => {
    const prefix = node.node_id.substring(0, 5);
    const badge = FORMAT_BADGES[prefix];
    if (!badge) return;
    // Try to match node to a book via content_json.book_id or content_json.book_slug
    const bookId = node.content_json?.book_id as string | undefined;
    const bookSlug = node.content_json?.book_slug as string | undefined;
    booksWithProducts.forEach(book => {
      if ((bookId && book.id === bookId) || (bookSlug && book.slug === bookSlug)) {
        const existing = bookFormatBadges.get(book.id) || [];
        if (!existing.find(b => b.label === badge.label)) {
          existing.push(badge);
          bookFormatBadges.set(book.id, existing);
        }
      }
    });
    // If no book match, apply to all books (author-level node)
    if (!bookId && !bookSlug) {
      booksWithProducts.forEach(book => {
        const existing = bookFormatBadges.get(book.id) || [];
        if (!existing.find(b => b.label === badge.label)) {
          existing.push(badge);
          bookFormatBadges.set(book.id, existing);
        }
      });
    }
  });

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
                  className="overflow-hidden transition-all"
                  style={{ borderRadius: "12px", border: `1px solid ${v.cardBorder}`, background: v.cardBg, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" }}
                >
                  <div
                    className="flex flex-col md:flex-row group"
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
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
                    {/* Format badges from live nodes + existing badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {(bookFormatBadges.get(book.id) || []).map(fb => {
                        const FIcon = fb.icon;
                        return (
                          <span key={fb.label} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                            style={{ background: `${v.primary}20`, color: v.primary, border: `1px solid ${v.primary}40` }}>
                            <FIcon className="h-2.5 w-2.5" /> {fb.label}
                          </span>
                        );
                      })}
                      {book.badges && book.badges.map((badge) => (
                        <span key={badge} className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                          style={{ background: v.accent, color: v.accentText }}>⭐ {badge}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 p-6 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:border-l" style={{ borderColor: v.cardBorder }}>
                    {lowestPrice && <span className="text-lg font-bold" style={{ color: v.accent, fontFamily: theme.headingFont }}>{lowestPrice}</span>}
                    <div className="flex flex-col gap-2 items-stretch w-full md:w-auto">
                      <Link to={`/${authorSlug}/${book.slug}`}>
                        <button className="w-full inline-flex items-center justify-center gap-1.5 font-bold text-sm rounded-lg transition-all px-5 py-2.5"
                          style={{ background: v.primary, color: v.primaryText }}>
                          View Book <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      {(bookFormatBadges.get(book.id) || []).some(fb => fb.label === "Audiobook") && (
                        <Link to={`/${authorSlug}/audiobook`}>
                          <button className="w-full inline-flex items-center justify-center gap-1.5 font-semibold text-xs rounded-lg transition-all px-4 py-2 border"
                            style={{ borderColor: v.primary, color: v.primary, background: "transparent" }}>
                            <Headphones className="h-3.5 w-3.5" /> Listen to Audiobook
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                  </div>
                  {/* Formats stacked under the card */}
                  <AuthorBookFormatsList
                    book={book}
                    authorSlug={authorSlug}
                    liveNodes={liveNodes as unknown as BookFormatNode[]}
                    theme={theme}
                    v={v}
                  />
                  {/* Collector's editions for this book */}
                  <AuthorBookCollectorsStrip
                    book={book}
                    authorSlug={authorSlug}
                    liveNodes={liveNodes as unknown as BookFormatNode[]}
                    theme={theme}
                    v={v}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
