import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { RelatedAuthor, ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  relatedAuthors: RelatedAuthor[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorRelatedSection({ relatedAuthors, theme, v }: Props) {
  if (relatedAuthors.length < 2) return null;

  return (
    <section className="py-14 md:py-20" style={{ background: v.primary }}>
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: v.primaryText, fontFamily: theme.headingFont }}>Related Authors</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 overflow-x-auto pb-2">
          {relatedAuthors.map((ra, idx) => (
            <motion.div key={ra.author_slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
              <Link to={`/${ra.author_slug}`}
                className="flex flex-col items-center text-center p-6 rounded-xl group transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${v.accent}33`, borderRadius: "12px" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = v.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${v.accent}33`; }}>
                {ra.photo_url ? (
                  <img src={ra.photo_url} alt={ra.pen_name} loading="lazy"
                    className="w-16 h-16 rounded-full object-cover mb-3" style={{ border: `2px solid ${v.accent}` }} />
                ) : (
                  <div className="w-16 h-16 rounded-full mb-3 flex items-center justify-center"
                    style={{ background: v.primary, border: `2px solid ${v.accent}` }}>
                    <span className="text-xl font-bold" style={{ color: v.accent }}>{ra.pen_name?.charAt(0) || "?"}</span>
                  </div>
                )}
                <p className="text-sm font-semibold truncate w-full group-hover:underline" style={{ color: v.primaryText }}>{ra.pen_name}</p>
                {ra.genres && ra.genres[0] && <span className="text-xs mt-1" style={{ color: v.accent }}>{ra.genres[0]}</span>}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
