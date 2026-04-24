import { Link } from "react-router-dom";
import { Sparkles, Gift, Award } from "lucide-react";
import type { ThemeVars, BookFormatNode, OccasionTemplate } from "./types";
import { OCCASION_TEMPLATES, getOccasionUrgency } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  node: BookFormatNode;
  authorSlug: string;
  theme: AuthorTheme;
  v: ThemeVars;
}

function pickTemplate(node: BookFormatNode): OccasionTemplate | null {
  const cj = node.content_json || {};
  const key = (cj.occasion_key as string | undefined) || (cj.occasion as string | undefined);
  if (key && OCCASION_TEMPLATES[key]) return OCCASION_TEMPLATES[key];
  return null;
}

export default function CollectorsEditionCard({ node, authorSlug, theme, v }: Props) {
  const template = pickTemplate(node);
  const cj = node.content_json || {};
  const numbered = !!cj.numbered;
  const signed = !!cj.signed;
  const giftWrapped = !!cj.gift_wrapped;
  const printRun = cj.print_run_size as number | undefined;
  const title = node.personalised_name || node.node_name || "Collector's Edition";
  const price = node.price_usd != null ? `$${node.price_usd.toFixed(2)}` : null;
  const href = node.microsite_url || `/${authorSlug}`;
  const urgency = template ? getOccasionUrgency(template) : null;

  const accentColor = template ? `hsl(${template.accent})` : v.accent;
  const accentBg = template ? `hsl(${template.accent} / 0.10)` : `${v.accent}1A`;
  const accentBorder = template ? `hsl(${template.accent} / 0.35)` : `${v.accent}55`;

  return (
    <Link to={href} className="block group h-full">
      <div
        className="relative h-full overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${v.cardBg} 0%, ${accentBg} 100%)`,
          border: `1.5px solid ${accentBorder}`,
          boxShadow: `0 4px 20px ${accentBg}`,
        }}
      >
        {/* Decorative shimmer */}
        <Sparkles
          className="absolute top-3 right-3 h-5 w-5 opacity-40 group-hover:opacity-80 transition-opacity"
          style={{ color: accentColor }}
        />

        {/* Occasion badge */}
        {template && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
            style={{ background: accentColor, color: "white" }}
          >
            <span>{template.emoji}</span>
            <span>{template.label}</span>
          </div>
        )}
        {!template && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
            style={{ background: accentColor, color: "white" }}
          >
            <Award className="h-3 w-3" /> Collector's Edition
          </div>
        )}

        <h4
          className="text-lg font-bold mb-1.5 leading-snug"
          style={{ color: v.headingText, fontFamily: theme.headingFont }}
        >
          {title}
        </h4>

        {template && (
          <p className="text-xs italic mb-3 leading-relaxed" style={{ color: v.bodyText }}>
            {template.blurb}
          </p>
        )}

        {/* Feature pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {signed && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: v.secondaryBg, color: v.headingText, border: `1px solid ${v.cardBorder}` }}>
              ✍️ Signed
            </span>
          )}
          {numbered && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: v.secondaryBg, color: v.headingText, border: `1px solid ${v.cardBorder}` }}>
              # Numbered
            </span>
          )}
          {giftWrapped && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: v.secondaryBg, color: v.headingText, border: `1px solid ${v.cardBorder}` }}>
              <Gift className="inline h-2.5 w-2.5 mr-0.5" /> Gift-wrapped
            </span>
          )}
          {printRun && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: v.secondaryBg, color: v.headingText, border: `1px solid ${v.cardBorder}` }}>
              Limited to {printRun}
            </span>
          )}
        </div>

        {/* Urgency */}
        {urgency && (
          <p className="text-[11px] font-bold mb-3" style={{ color: accentColor }}>
            ⏰ {urgency}
          </p>
        )}

        <div className="flex items-end justify-between mt-4">
          {price && (
            <span className="text-xl font-bold" style={{ color: accentColor, fontFamily: theme.headingFont }}>
              {price}
            </span>
          )}
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg group-hover:gap-2 transition-all"
            style={{ background: accentColor, color: "white" }}
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
