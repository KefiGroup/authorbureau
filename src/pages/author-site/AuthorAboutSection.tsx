import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { AuthorData, ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import { stripHtml } from "@/lib/stripHtml";

interface Props {
  author: AuthorData;
  displayName: string;
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorAboutSection({ author, displayName, theme, v }: Props) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioText = stripHtml(author.bio_long || author.bio_short || "");
  if (!bioText) return null;

  const bioParagraphs = bioText.split(/\n\n+/).filter(Boolean);
  const displayBioParagraphs = bioParagraphs.length > 2 && !bioExpanded ? bioParagraphs.slice(0, 2) : bioParagraphs;
  const genres = author.genres || [];

  return (
    <section id="about" className="py-14 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-4xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-6" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
            About {displayName}
          </h2>
          <div className="text-base space-y-4" style={{ color: v.bodyText, lineHeight: 1.7 }}>
            {!bioExpanded && author.bio_short ? (
              <p>{stripHtml(author.bio_short)}</p>
            ) : (
              displayBioParagraphs.map((p, i) => <p key={i}>{p}</p>)
            )}
          </div>
          {author.bio_long && author.bio_short && (
            <button onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-colors" style={{ color: v.accent }}>
              {bioExpanded ? "Show Less" : "Read More"}
              <ChevronDown className={`h-4 w-4 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
            </button>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {genres.map((g, i) => (
                <span key={i} className="px-3 py-1.5 text-xs font-medium rounded-full"
                  style={{ background: v.secondaryBg, color: v.bodyText, border: `1px solid ${v.accent}` }}>{g}</span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
