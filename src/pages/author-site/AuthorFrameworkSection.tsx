import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { AuthorTheme } from "@/lib/author-themes";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";

export interface FrameworkStage {
  letter?: string;
  name: string;
  description?: string;
}

interface Props {
  /** Optional acronym/title (e.g. "SUCKCESS") */
  frameworkName?: string | null;
  /** Stages to render. Section hides unless ≥6 stages provided. */
  stages: FrameworkStage[];
  /** Optional CTA target (e.g. quiz lead magnet). When set, renders bottom CTA. */
  ctaHref?: string | null;
  ctaLabel?: string;
  theme: AuthorTheme;
  v: ThemeVars;
}

/**
 * Renders an author's signature framework as a 4×2 letter-card grid.
 * Source data: `author_context.key_frameworks` (already populated by ABBY).
 * Hidden unless at least 6 stages are present so the grid reads clean.
 */
export default function AuthorFrameworkSection({
  frameworkName,
  stages,
  ctaHref,
  ctaLabel = "Take the Free Quiz",
  theme,
  v,
}: Props) {
  if (!stages || stages.length < 6) return null;

  // Cap at 8 to keep the 4×2 grid clean
  const visible = stages.slice(0, 8);

  return (
    <section id="framework" className="py-14 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-10"
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: v.accent }}
          >
            The Framework
          </p>
          <h2
            className="text-2xl md:text-[2rem] font-bold"
            style={{ color: v.headingText, fontFamily: theme.headingFont }}
          >
            {frameworkName ? `The ${frameworkName} Method` : "A Proven Step-by-Step Method"}
          </h2>
          <p className="text-base mt-2" style={{ color: v.mutedText }}>
            {visible.length} stages that turn the idea into a result.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((stage, idx) => (
            <motion.div
              key={`${stage.name}-${idx}`}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={idx + 1}
              className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={{
                background: v.secondaryBg,
                border: `1px solid ${v.cardBorder}`,
              }}
            >
              <div
                className="text-3xl font-bold mb-2 leading-none"
                style={{ color: v.accent, fontFamily: theme.headingFont }}
              >
                {stage.letter ?? String(idx + 1).padStart(2, "0")}
              </div>
              <div
                className="text-base font-semibold mb-1"
                style={{ color: v.headingText, fontFamily: theme.headingFont }}
              >
                {stage.name}
              </div>
              {stage.description && (
                <p className="text-sm leading-snug" style={{ color: v.mutedText }}>
                  {stage.description}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {ctaHref && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={visible.length + 1}
            className="text-center mt-10"
          >
            <Link
              to={ctaHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:brightness-110"
              style={{ background: v.accent, color: v.accentText }}
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
