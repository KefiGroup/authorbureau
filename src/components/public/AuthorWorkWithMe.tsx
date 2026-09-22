import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import AuthorProductCard, { type StorefrontNode } from "./AuthorProductCard";
import { fadeUp } from "@/pages/author-site/types";
import type { ThemeVars } from "@/pages/author-site/types";
import type { AuthorTheme } from "@/lib/author-themes";

/** Back-office and partner-facing nodes that no book buyer should ever see
 *  on the public storefront (author website, affiliate, product ladder,
 *  media/PR, JV partnerships, fundraising, sponsorship). */
export const NON_CUSTOMER_NODE_IDS = ["BP-04", "BA-15", "BA-16", "BA-17", "BA-18", "YR-27", "YR-28"];

/** Normalised title key used to guarantee an offer is listed exactly once
 *  across the whole page. */
export function offerTitleKey(node: { personalised_name?: string | null; node_name?: string | null }): string {
  return (node.personalised_name || node.node_name || "").trim().toLowerCase();
}

/** The single source of truth for which offers the page sells, in which order.
 *  Every other section filters against the result so nothing is sold twice. */
export function selectCustomerNodes<T extends { node_id: string; personalised_name?: string | null; node_name?: string | null }>(
  nodes: T[]
): T[] {
  const seen = new Set<string>();
  return nodes
    .filter((n) => !NON_CUSTOMER_NODE_IDS.some((p) => n.node_id.startsWith(p)))
    .filter((n) => {
      const key = offerTitleKey(n);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** How many cards stay visible per tier before the rest collapse. */
const VISIBLE_PER_TIER = 3;

interface Props {
  authorId: string;
  authorSlug: string;
  authorName: string;
  authorContactEmail?: string | null;
  isOwnerViewing: boolean;
  stripeReady: boolean;
  liveNodes: StorefrontNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

type Tier = "start" | "deeper" | "enterprise";

/** Map a node_id prefix to a tier in the value ladder. */
function nodeTier(nodeId: string): Tier {
  // Tier 1 — Start Here: low-cost / free entry points
  if (
    nodeId.startsWith("BP-02") || // Free assessment / lead magnet
    nodeId.startsWith("BA-12") || // Membership
    nodeId.startsWith("BP-05") || // Webinar
    nodeId.startsWith("BP-07") || // Home study
    nodeId.startsWith("BA-10")    // Online course
  ) return "start";

  // Tier 3 — Enterprise: high-touch, inquiry-led
  if (
    nodeId.startsWith("YR-20") || // Big-ticket consulting
    nodeId.startsWith("YR-21") || // Speaking
    nodeId.startsWith("YR-22") || // Corporate training
    nodeId.startsWith("YR-23") || // Mastermind
    nodeId.startsWith("YR-24") || // Retreat
    nodeId.startsWith("YR-26") || // Conference
    nodeId.startsWith("YR-27") || // Fundraising
    nodeId.startsWith("YR-28") || // Sponsors
    nodeId.startsWith("BA-15") || // Press / Media
    nodeId.startsWith("BA-18")    // JV partnerships
  ) return "enterprise";

  // Tier 2 — Go Deeper: 1:1 / group / certification (and any unmapped fall here)
  return "deeper";
}

const TIER_META: Record<Tier, { label: string; sub: string; eyebrowColorKey: keyof ThemeVars; bordered?: boolean }> = {
  start: {
    label: "Start Here",
    sub: "Low-risk first steps to get the win.",
    eyebrowColorKey: "accent",
    bordered: true,
  },
  deeper: {
    label: "Go Deeper",
    sub: "1-on-1, group, and certification programmes.",
    eyebrowColorKey: "accent",
  },
  enterprise: {
    label: "Enterprise",
    sub: "Speaking, consulting, and bespoke engagements.",
    eyebrowColorKey: "accent",
  },
};

const TIER_ORDER: Tier[] = ["start", "deeper", "enterprise"];

export default function AuthorWorkWithMe({
  authorId,
  authorSlug,
  authorName,
  authorContactEmail,
  isOwnerViewing,
  stripeReady,
  liveNodes,
  theme,
  v,
}: Props) {
  const [expanded, setExpanded] = useState<Record<Tier, boolean>>({ start: false, deeper: false, enterprise: false });

  if (!liveNodes || liveNodes.length === 0) return null;

  // Drop back-office nodes, then collapse duplicate offers that share a title
  // (e.g. two "Collective" entries) so visitors never see the same thing twice.
  const customerNodes = selectCustomerNodes(liveNodes);

  if (customerNodes.length === 0) return null;

  const grouped: Record<Tier, StorefrontNode[]> = { start: [], deeper: [], enterprise: [] };
  for (const node of customerNodes) {
    grouped[nodeTier(node.node_id)].push(node);
  }
  // Stable internal sort by node_id
  for (const t of TIER_ORDER) grouped[t].sort((a, b) => a.node_id.localeCompare(b.node_id));

  return (
    <section
      id="work-with-me"
      className="py-14 md:py-20"
      style={{ background: v.secondaryBg }}
    >
      <div className="container max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mb-10"
        >
          <h2
            className="text-2xl md:text-[2rem] font-bold mb-2"
            style={{ color: v.headingText, fontFamily: theme.headingFont }}
          >
            Work With Me
          </h2>
          <p className="text-base" style={{ color: v.mutedText }}>
            Everything {authorName} offers, in one place. Start at Tier 1 and move up when you are ready.
          </p>
        </motion.div>

        {TIER_ORDER.map((tier, tIdx) => {
          const nodes = grouped[tier];
          if (nodes.length === 0) return null;
          const meta = TIER_META[tier];
          const isExpanded = expanded[tier];
          const visibleNodes = isExpanded ? nodes : nodes.slice(0, VISIBLE_PER_TIER);
          const hiddenCount = nodes.length - visibleNodes.length;

          return (
            <div key={tier} className={tIdx > 0 ? "mt-12" : ""}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0}
                className="mb-5 flex items-baseline gap-3 flex-wrap"
              >
                <span
                  className="text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{ color: v[meta.eyebrowColorKey] }}
                >
                  Tier {tIdx + 1}
                </span>
                <h3
                  className="text-xl md:text-2xl font-bold"
                  style={{ color: v.headingText, fontFamily: theme.headingFont }}
                >
                  {meta.label}
                </h3>
                <span className="text-sm" style={{ color: v.mutedText }}>
                  {meta.sub}
                </span>
              </motion.div>

              <div
                className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${meta.bordered ? "rounded-2xl p-4 md:p-5" : ""}`}
                style={
                  meta.bordered
                    ? { border: `1px solid ${v.accent}40`, background: `${v.accent}08` }
                    : undefined
                }
              >
                {visibleNodes.map((node, idx) => (
                  <motion.div
                    key={node.id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={idx + 1}
                  >
                    <AuthorProductCard
                      node={node}
                      authorId={authorId}
                      authorSlug={authorSlug}
                      authorContactEmail={authorContactEmail}
                      stripeReady={stripeReady}
                      isOwnerViewing={isOwnerViewing}
                      v={v}
                      headingFont={theme.headingFont}
                    />
                  </motion.div>
                ))}
              </div>

              {(hiddenCount > 0 || isExpanded) && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [tier]: !prev[tier] }))}
                  aria-expanded={isExpanded}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 min-h-[44px] transition-all hover:brightness-110"
                  style={{ border: `1px solid ${v.accent}66`, color: v.accent }}
                >
                  {isExpanded
                    ? "Show fewer options"
                    : `More ways to work with ${authorName} (${hiddenCount})`}
                  <ChevronDown
                    className="h-4 w-4 transition-transform"
                    style={{ transform: isExpanded ? "rotate(180deg)" : undefined }}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
