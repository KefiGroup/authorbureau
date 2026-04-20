import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { ThemeVars, BookWithProducts } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  highlights: string[];
  primaryBook?: BookWithProducts;
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorWhatsInsideSection({ highlights, primaryBook, theme, v }: Props) {
  const items = (highlights || []).filter(Boolean).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section id="whats-inside" className="py-14 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-5xl">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-2xl md:text-[2rem] font-bold mb-3 text-center"
          style={{ color: v.headingText, fontFamily: theme.headingFont }}
        >
          What's inside the book
        </motion.h2>
        {primaryBook?.title && (
          <p
            className="text-center mb-10 text-sm"
            style={{ color: v.mutedText, fontFamily: theme.bodyFont }}
          >
            From <em>{primaryBook.title}</em>
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: v.secondaryBg, border: `1px solid ${v.cardBorder}` }}
            >
              <CheckCircle2
                className="h-5 w-5 mt-0.5 shrink-0"
                style={{ color: v.accent }}
              />
              <p
                className="text-sm"
                style={{ color: v.bodyText, lineHeight: 1.6, fontFamily: theme.bodyFont }}
              >
                {item}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
