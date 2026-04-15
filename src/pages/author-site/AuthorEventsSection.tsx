import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, Heart, Handshake, ArrowRight } from "lucide-react";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "./AuthorLeadMagnetsSection";

const EVENT_META: Record<string, { icon: typeof MapPin; label: string; order: number }> = {
  "YR-24": { icon: MapPin, label: "Retreat", order: 1 },
  "YR-26": { icon: Calendar, label: "Conference", order: 2 },
  "YR-27": { icon: Heart, label: "Fundraising", order: 3 },
  "YR-28": { icon: Handshake, label: "Sponsorship", order: 4 },
};

interface Props {
  authorSlug: string;
  displayName: string;
  eventNodes: LiveNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

export default function AuthorEventsSection({ authorSlug, displayName, eventNodes, theme, v }: Props) {
  if (eventNodes.length === 0) return null;

  const sorted = [...eventNodes].sort((a, b) => {
    const prefA = a.node_id.substring(0, 5);
    const prefB = b.node_id.substring(0, 5);
    return (EVENT_META[prefA]?.order ?? 99) - (EVENT_META[prefB]?.order ?? 99);
  });

  return (
    <section id="events-section" className="py-14 md:py-20" style={{ background: v.secondaryBg }}>
      <div className="container max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl md:text-[2rem] font-bold mb-2" style={{ color: v.headingText, fontFamily: theme.headingFont }}>
            Events & Experiences
          </h2>
          <p className="text-base mb-10" style={{ color: v.mutedText }}>
            Connect with {displayName} in person at upcoming events.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2">
          {sorted.map((node, idx) => {
            const prefix = node.node_id.substring(0, 5);
            const meta = EVENT_META[prefix] || { icon: Calendar, label: "Event", order: 99 };
            const Icon = meta.icon;
            const title = node.personalised_name || node.node_name;
            const desc = node.content_json?.description as string | undefined;
            const price = node.content_json?.price as number | undefined;
            const date = node.content_json?.date as string | undefined;
            const location = node.content_json?.location as string | undefined;
            const linkTo = node.third_party_url || node.payment_link || `/${authorSlug}#subscribe-section`;

            return (
              <motion.div key={node.node_id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                <a
                  href={linkTo}
                  target={node.third_party_url ? "_blank" : undefined}
                  rel={node.third_party_url ? "noopener noreferrer" : undefined}
                  className="group flex flex-col h-full p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: v.cardBg, border: `1px solid ${v.cardBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
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

                  {(date || location) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs mb-3" style={{ color: v.mutedText }}>
                      {date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
                      {location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>}
                    </div>
                  )}

                  {desc && <p className="text-xs leading-relaxed line-clamp-3 mb-4 flex-1" style={{ color: v.bodyText }}>{desc}</p>}
                  {!desc && <div className="flex-1" />}

                  <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: `1px solid ${v.cardBorder}` }}>
                    {price != null && price > 0
                      ? <span className="font-bold text-sm" style={{ color: v.accent }}>${price}</span>
                      : <span className="font-bold text-sm" style={{ color: v.accent }}>Inquire</span>}
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                      style={{ background: v.primary, color: v.primaryText }}
                    >
                      Learn More <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
