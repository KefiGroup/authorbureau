import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import type { ThemeVars } from "./types";
import { fadeUp } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import type { LiveNode } from "./AuthorLeadMagnetsSection";

/** Reader-facing events only. Fundraising (YR-27) and sponsorship (YR-28) are
 *  partner-facing and never appear on the public page. */
const EVENT_META: Record<string, { icon: typeof MapPin; label: string; order: number }> = {
  "YR-24": { icon: MapPin, label: "Retreat", order: 1 },
  "YR-26": { icon: Calendar, label: "Conference", order: 2 },
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
            // No booking link on the event? Send the visitor to the enquiry
            // form instead of the newsletter box, which was a dead end.
            const dest = resolvePublicDestination(node, { label: "Learn More", enquireLabel: "Enquire" });
            const cardClass = "group flex flex-col h-full w-full text-left p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg";
            const cardStyle = { background: v.cardBg, border: `1px solid ${v.cardBorder}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" };
            const Card = ({ children }: { children: React.ReactNode }) =>
              dest.kind === "enquire" ? (
                <button type="button" onClick={() => openEnquiry(dest.subject)} className={cardClass} style={cardStyle}>
                  {children}
                </button>
              ) : (
                <a
                  href={dest.href}
                  target={dest.kind === "external" ? "_blank" : undefined}
                  rel={dest.kind === "external" ? "noopener noreferrer" : undefined}
                  className={cardClass}
                  style={cardStyle}
                >
                  {children}
                </a>
              );

            return (
              <motion.div key={node.node_id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx + 1}>
                <Card>
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
                    {price != null && price > 0 && price < PERSONAL_SELLING_THRESHOLD
                      ? <span className="font-bold text-sm" style={{ color: v.accent }}>${price}</span>
                      : <span className="font-bold text-sm" style={{ color: v.accent }}>By application</span>}
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all group-hover:brightness-110"
                      style={{ background: v.primary, color: v.primaryText }}
                    >
                      {dest.label} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
