import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

export interface LiveNode {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  content_json: Record<string, unknown> | null;
  microsite_url: string | null;
  payment_link: string | null;
  third_party_url: string | null;
}

interface Props {
  authorSlug: string;
  leadMagnets: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorLeadMagnetsSection({ authorSlug, leadMagnets, theme, v }: Props) {
  if (leadMagnets.length === 0) return null;

  return (
    <section id="quiz-section" className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="container max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2">
          {leadMagnets.map((lm, idx) => {
            const title = lm.personalised_name || lm.node_name || "Free Assessment";
            const description = lm.content_json?.quiz_topic
              ? `Discover your strengths with this quick assessment on ${lm.content_json.quiz_topic}.`
              : "Take this free assessment and get personalised insights.";
            
            // Build the link: use microsite_url slug or fallback
            const slug = lm.microsite_url
              ? lm.microsite_url.replace(/^\//, "").split("/").pop()
              : null;
            const linkTo = slug ? `/${authorSlug}/${slug}` : "#";

            return (
              <motion.div key={lm.node_id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx}>
                <div
                  className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-all hover:shadow-xl hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(135deg, ${v.primary}, ${v.accent}CC)`,
                    border: `1px solid ${v.accent}44`,
                    boxShadow: `0 8px 32px ${v.accent}1A`,
                  }}
                >
                  {/* Decorative sparkle */}
                  <div className="absolute top-4 right-4 opacity-20">
                    <Sparkles className="h-16 w-16" style={{ color: v.primaryText }} />
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-4"
                    style={{ background: "rgba(255,255,255,0.15)", color: v.primaryText }}
                  >
                    <Sparkles className="h-3 w-3" /> Free Assessment
                  </span>

                  <h3
                    className="text-xl md:text-2xl font-bold mb-3"
                    style={{ color: v.primaryText, fontFamily: theme.headingFont }}
                  >
                    {title}
                  </h3>

                  <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: `${v.primaryText}CC` }}>
                    {description}
                  </p>

                  <Link
                    to={linkTo}
                    className="inline-flex items-center gap-2 font-bold text-sm rounded-lg px-6 py-3 transition-all hover:scale-105 hover:brightness-110"
                    style={{
                      background: v.accentText === "#FFFFFF" ? "rgba(255,255,255,0.95)" : v.accent,
                      color: v.accentText === "#FFFFFF" ? v.primary : v.accentText,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    Take the Quiz <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
