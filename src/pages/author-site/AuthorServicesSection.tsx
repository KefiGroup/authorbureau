import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Users, Headphones, Mic, ArrowRight } from "lucide-react";
import { getProductCardCTAText } from "@/lib/product-copy";
import type { ProductLink, CoachingService, ThemeVars } from "./types";
import { PRODUCT_LABELS, PRODUCT_ROUTES, fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  home_study: BookOpen,
  course: GraduationCap,
  coaching: Users,
  audiobook: Headphones,
  podcast: Mic,
};

interface Props {
  authorSlug: string;
  displayName: string;
  coachingServices: CoachingService[];
  allProducts: (ProductLink & { bookSlug?: string; bookTitle?: string })[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorServicesSection({ authorSlug, displayName, coachingServices, allProducts, theme, v }: Props) {
  if (coachingServices.length === 0 && allProducts.length === 0) return null;

  const workWithHeading = coachingServices.length > 0 ? `Work with ${displayName}` : `Resources by ${displayName}`;
  const workWithSubheading = coachingServices.length > 0 && allProducts.length > 0
    ? `Beyond the books - coaching, courses, and resources to accelerate your growth.`
    : coachingServices.length > 0
      ? `Personalized guidance from the author - speaking, coaching, and consulting.`
      : `Hands-on tools and programs built from ${displayName}'s books.`;

  return (
    <section id="services" className="py-16 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{workWithHeading}</h2>
          <p className="text-base mb-10" style={{ color: v.mutedText }}>{workWithSubheading}</p>
        </motion.div>

        {/* Coaching */}
        {coachingServices.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Services & Expertise</h3>
            <div className="space-y-4">
              {coachingServices.map((svc, idx) => (
                <motion.div key={svc.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl transition-all hover:shadow-md"
                    style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${v.accent}26` }}>
                      <Users className="h-5 w-5" style={{ color: v.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{svc.title}</h3>
                      {svc.description && <p className="text-sm leading-relaxed line-clamp-2" style={{ color: v.bodyText }}>{svc.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: v.mutedText }}>
                        {svc.duration_minutes && <span>{svc.duration_minutes} min</span>}
                        {svc.sessions_count && svc.sessions_count > 1 && <span>· {svc.sessions_count} sessions</span>}
                        {svc.price != null && svc.price > 0 && <span className="font-bold" style={{ color: v.accent }}>${svc.price}</span>}
                      </div>
                    </div>
                    <Link to={`/${authorSlug}#subscribe-section`}
                      className="shrink-0 inline-flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-110"
                      style={{ background: v.accent, color: v.accentText }}>
                      Inquire <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {allProducts.length > 0 && (
          <div id="products">
            {coachingServices.length > 0 && (
              <h3 className="text-lg font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>Courses, Workbooks & More</h3>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {allProducts.slice(0, 6).map((product, idx) => {
                const PIcon = PRODUCT_ICONS[product.type] || BookOpen;
                const label = PRODUCT_LABELS[product.type] || product.type;
                const ctaText = getProductCardCTAText(PRODUCT_ROUTES[product.type] || product.type);
                return (
                  <motion.div key={product.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                    <Link to={`/${authorSlug}/${product.bookSlug}/${PRODUCT_ROUTES[product.type]}`}
                      className="group flex flex-col h-full p-5 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                      style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                      <span className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide mb-3"
                        style={{ background: v.accent, color: v.accentText }}>
                        <PIcon className="h-3 w-3" />{label}
                      </span>
                      <h4 className="font-bold text-base mb-1.5 group-hover:underline" style={{ color: v.headingText, fontFamily: theme.headingFont }}>{product.title}</h4>
                      {product.description && <p className="text-xs leading-relaxed line-clamp-2 mb-4 flex-1" style={{ color: v.bodyText }}>{product.description}</p>}
                      {!product.description && <div className="flex-1" />}
                      <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                        {product.price != null && product.price > 0
                          ? <span className="font-bold text-sm" style={{ color: v.accent }}>${product.price}</span>
                          : <span className="font-bold text-sm" style={{ color: v.accent }}>Free</span>}
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                          style={{ background: v.primary, color: v.primaryText }}>{ctaText}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {allProducts.length > 6 && (
              <div className="text-center mt-8">
                <span className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: v.accent }}>
                  View All Resources ({allProducts.length}) →
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
