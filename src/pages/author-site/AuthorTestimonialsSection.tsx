import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  avatar_url: string | null;
}

interface Props {
  testimonials: Testimonial[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorTestimonialsSection({ testimonials, theme, v }: Props) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="container max-w-6xl">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-2xl md:text-[2rem] font-bold mb-8 text-center"
          style={{ color: v.headingText, fontFamily: theme.headingFont }}
        >
          What readers are saying
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.slice(0, 6).map((t, i) => (
            <motion.div
              key={t.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 1}
              className="rounded-2xl p-6 flex flex-col"
              style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}` }}
            >
              <Quote className="h-6 w-6 mb-3" style={{ color: v.accent }} />
              <p
                className="text-base mb-5 flex-1"
                style={{ color: v.bodyText, lineHeight: 1.6, fontFamily: theme.bodyFont }}
              >
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: v.accent, color: v.accentText }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold" style={{ color: v.headingText }}>
                    {t.name}
                  </p>
                  {t.role && (
                    <p className="text-xs" style={{ color: v.mutedText }}>
                      {t.role}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
