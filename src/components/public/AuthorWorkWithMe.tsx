import { motion } from "framer-motion";
import AuthorProductCard, { type StorefrontNode } from "./AuthorProductCard";
import { fadeUp } from "@/pages/author-site/types";
import type { ThemeVars } from "@/pages/author-site/types";
import type { AuthorTheme } from "@/lib/author-themes";

interface Props {
  authorId: string;
  authorSlug: string;
  authorName: string;
  authorContactEmail?: string | null;
  /** True if the logged-in user owns this author profile */
  isOwnerViewing: boolean;
  /** True if author has Stripe Connect onboarded */
  stripeReady: boolean;
  /** Live BA/YR/BP nodes that have been published */
  liveNodes: StorefrontNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

// Order categories so brand → build → yield reads naturally
function categoryOrder(nodeId: string): number {
  if (nodeId.startsWith("BA-")) return 1;
  if (nodeId.startsWith("YR-")) return 2;
  if (nodeId.startsWith("BP-")) return 3;
  return 9;
}

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
  // Hide entirely for guests when there are no live products
  if (!liveNodes || liveNodes.length === 0) return null;

  const sorted = [...liveNodes].sort((a, b) => {
    const co = categoryOrder(a.node_id) - categoryOrder(b.node_id);
    if (co !== 0) return co;
    return a.node_id.localeCompare(b.node_id);
  });

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
        >
          <h2
            className="text-2xl md:text-[2rem] font-bold mb-2"
            style={{ color: v.headingText, fontFamily: theme.headingFont }}
          >
            Work With Me
          </h2>
          <p className="text-base mb-10" style={{ color: v.mutedText }}>
            Programmes and resources from {authorName}.
          </p>
        </motion.div>

        {/* Owner-only banner if Stripe isn't connected — keeps readers' view clean */}
        {isOwnerViewing && !stripeReady && (
          <div
            className="mb-8 p-4 rounded-lg text-sm flex items-start gap-3"
            style={{
              background: v.cardBg,
              border: `1px dashed ${v.cardBorder}`,
              color: v.bodyText,
            }}
          >
            <div className="flex-1">
              <strong style={{ color: v.headingText }}>
                Payments are not set up yet.
              </strong>{" "}
              Visitors won't be able to enroll until you connect Stripe. Set it
              up to start collecting revenue.
            </div>
            <a
              href="/account-settings?tab=connections"
              className="shrink-0 underline font-semibold whitespace-nowrap"
              style={{ color: v.accent }}
            >
              Set up payments →
            </a>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((node, idx) => (
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
      </div>
    </section>
  );
}
