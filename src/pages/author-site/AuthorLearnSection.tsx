import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Video, Users, Award, ArrowRight } from "lucide-react";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "./AuthorLeadMagnetsSection";
import { getNodePriceLabel } from "./node-price";

const NODE_META: Record<string, { icon: typeof BookOpen; label: string; order: number }> = {
  "BP-05": { icon: Video, label: "Webinar", order: 1 },
  "BP-07": { icon: BookOpen, label: "Home Study", order: 2 },
  "BA-10": { icon: GraduationCap, label: "Online Course", order: 3 },
  "BA-12": { icon: Users, label: "Membership", order: 4 },
  "YR-25": { icon: Award, label: "Certification", order: 5 },
};

interface Props {
  authorSlug: string;
  displayName: string;
  learnNodes: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorLearnSection({ authorSlug, displayName, learnNodes, theme, v }: Props) {
  if (learnNodes.length === 0) return null;

  // Sort by commitment level
  const sorted = [...learnNodes].sort((a, b) => {
    const prefix = (id: string) => id.replace(/[-_]\d+$/, "").substring(0, 5);
    const orderA = NODE_META[prefix(a.node_id)]?.order ?? 99;
    const orderB = NODE_META[prefix(b.node_id)]?.order ?? 99;
    return orderA - orderB;
  });

  return (
    <section id="learn-section" className="py-14 md:py-20" style={{ background: v.cardBg }}>
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
            Learn from {displayName}
          </h2>
          <p className="text-base mb-10" style={{ color: v.mutedText }}>
            Courses, workshops, and programs to deepen your knowledge.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((node, idx) => {
            const prefix = node.node_id.replace(/[-_]\d+$/, "").substring(0, 5);
            const meta = NODE_META[prefix] || { icon: BookOpen, label: "Program", order: 99 };
            const Icon = meta.icon;
            const title = node.personalised_name || node.node_name;
            const desc = node.content_json?.description as string | undefined;
            const price = node.content_json?.price as number | undefined;
            const slug = node.microsite_url?.replace(/^\//, "").split("/").pop();
            const linkTo = slug ? `/${authorSlug}/${slug}` : (node.third_party_url || "#");

            return (
              <motion.div key={node.node_id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                <Link
                  to={linkTo}
                  className="group flex flex-col h-full p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: v.secondaryBg, border: `1px solid ${v.cardBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide mb-4"
                    style={{ background: v.accent, color: v.accentText }}
                  >
                    <Icon className="h-3 w-3" /> {meta.label}
                  </span>

                  <h4 className="font-bold text-base mb-2 group-hover:underline" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
                    {title}
                  </h4>

                  {desc && (
                    <p className="text-xs leading-relaxed line-clamp-3 mb-4 flex-1" style={{ color: v.bodyText }}>
                      {desc}
                    </p>
                  )}
                  {!desc && <div className="flex-1" />}

                  <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                    {price != null && price > 0
                      ? <span className="font-bold text-sm" style={{ color: v.accent }}>${price}</span>
                      : <span className="font-bold text-sm" style={{ color: v.accent }}>Free</span>}
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                      style={{ background: v.primary, color: v.primaryText }}
                    >
                      Learn More <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
