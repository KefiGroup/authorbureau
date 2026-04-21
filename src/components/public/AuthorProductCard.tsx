import { Link } from "react-router-dom";
import { ArrowRight, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuyNowButton from "@/components/commerce/BuyNowButton";
import type { ThemeVars } from "@/pages/author-site/types";

export interface StorefrontNode {
  id: string;
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content_json: Record<string, any> | null;
  microsite_url: string | null;
  payment_link: string | null;
  third_party_url: string | null;
  delivery_url: string | null;
  price_usd: number | null;
  currency: string | null;
}

interface Props {
  node: StorefrontNode;
  authorId: string;
  authorSlug: string;
  authorContactEmail?: string | null;
  stripeReady: boolean;
  isOwnerViewing: boolean;
  v: ThemeVars;
  headingFont?: string;
}

// Map node_id prefix → human-readable category badge
const CATEGORY_LABELS: Record<string, string> = {
  "BA-10": "Online Course",
  "BA-11": "Audiobook",
  "BA-12": "Membership",
  "BA-13": "Group Coaching",
  "BA-14": "Podcast",
  "BA-15": "Media Kit",
  "BA-16": "Affiliate Programme",
  "BA-17": "Upsell",
  "BA-18": "Revenue Share",
  "BP-05": "Webinar",
  "BP-06": "Workbook",
  "BP-07": "Home Study",
  "BP-08": "Special Edition",
  "YR-19": "1-on-1 Coaching",
  "YR-20": "VIP Day",
  "YR-21": "Speaking",
  "YR-22": "Corporate Training",
  "YR-23": "Mastermind",
  "YR-24": "Retreat",
  "YR-25": "Certification",
  "YR-26": "Convention",
  "YR-27": "Exhibitor",
  "YR-28": "In-House Speaker",
};

function getCategoryLabel(nodeId: string): string {
  const prefix = nodeId.substring(0, 5);
  return CATEGORY_LABELS[prefix] || "Programme";
}

function getTitle(node: StorefrontNode): string {
  return (
    (node.content_json?.title as string) ||
    (node.content_json?.programme_title as string) ||
    (node.content_json?.course_title as string) ||
    node.personalised_name ||
    node.node_name
  );
}

function getTagline(node: StorefrontNode): string | null {
  return (
    (node.content_json?.subtitle as string) ||
    (node.content_json?.tagline as string) ||
    (node.content_json?.description as string) ||
    (node.content_json?.overview as string) ||
    null
  );
}

function formatPrice(price: number | null | undefined, currency?: string | null): string | null {
  if (price == null || price <= 0) return null;
  const code = (currency || "USD").toUpperCase();
  const formatted = Number.isInteger(price) ? `${price}` : price.toFixed(2);
  return `$${formatted} ${code}`;
}

/**
 * Resolve effective price — falls back through Abby-generated fields in
 * `content_json` so cards never show "Pricing on request" when a price
 * exists somewhere in the payload.
 */
function getEffectivePrice(node: StorefrontNode): number | null {
  if (node.price_usd != null && node.price_usd > 0) return node.price_usd;
  const c = node.content_json || {};
  const candidates: unknown[] = [
    c.suggested_price_usd,
    c.monthly_price_usd,
    c.programme_price_usd,
    c.package_price_usd,
    c.price_usd,
    (c.pricing as Record<string, unknown> | undefined)?.price_usd,
  ];
  for (const v of candidates) {
    const n = typeof v === "string" ? Number(v) : (v as number | null | undefined);
    if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function AuthorProductCard({
  node,
  authorId,
  authorSlug,
  authorContactEmail,
  stripeReady,
  isOwnerViewing,
  v,
  headingFont,
}: Props) {
  const title = getTitle(node);
  const tagline = getTagline(node);
  const category = getCategoryLabel(node.node_id);
  const effectivePrice = getEffectivePrice(node);
  const priceDisplay = formatPrice(effectivePrice, node.currency);
  const hasPrice = effectivePrice != null && effectivePrice > 0;

  // Determine which CTA branch to render
  // 1. Stripe connected AND price set → BuyNowButton
  // 2. Stripe NOT connected → owner sees disabled "Payments not set up", reader sees Contact
  // 3. Stripe connected but no price → owner sees "Set price", reader sees Contact
  const canSell = stripeReady && hasPrice;

  const contactHref = authorContactEmail
    ? `mailto:${authorContactEmail}?subject=${encodeURIComponent(`Enquiry: ${title}`)}`
    : `/${authorSlug}#contact`;

  return (
    <article
      className="group flex flex-col h-full p-5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: v.cardBg,
        border: `1px solid ${v.cardBorder}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Category badge */}
      <span
        className="inline-flex self-start items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide mb-3"
        style={{ background: v.accent, color: v.accentText }}
      >
        {category}
      </span>

      {/* Title */}
      <h3
        className="font-bold text-lg mb-1.5"
        style={{ color: v.headingText, fontFamily: headingFont }}
      >
        {title}
      </h3>

      {/* Tagline */}
      {tagline && (
        <p
          className="text-sm leading-relaxed line-clamp-3 mb-4"
          style={{ color: v.bodyText }}
        >
          {tagline}
        </p>
      )}
      {!tagline && <div className="mb-4" />}

      {/* Prominent price (always shown) */}
      <div
        className="flex items-baseline gap-2 mb-4 pb-4"
        style={{ borderBottom: `1px solid ${v.cardBorder}` }}
      >
        {priceDisplay ? (
          <>
            <span
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: v.accent }}
            >
              {priceDisplay}
            </span>
          </>
        ) : (
          <span
            className="text-base font-semibold"
            style={{ color: v.mutedText }}
          >
            Pricing on request
          </span>
        )}
      </div>

      {/* CTA — branch on stripeReady + hasPrice + viewer */}
      <div className="mt-auto">
        {canSell ? (
          <BuyNowButton
            authorNodeId={node.id}
            authorId={authorId}
            label="Enroll Now"
            fallbackUrl={node.payment_link || node.third_party_url || null}
            className="w-full"
            style={{ background: v.accent, color: v.accentText }}
          />
        ) : isOwnerViewing ? (
          <div className="space-y-2">
            <div
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold cursor-not-allowed"
              style={{
                background: v.secondaryBg || v.cardBg,
                color: v.mutedText,
                border: `1px dashed ${v.cardBorder}`,
              }}
              role="status"
              aria-label={hasPrice ? "Payments not set up" : "Price not set"}
            >
              {hasPrice ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> Payments not set up
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> Price not set
                </>
              )}
            </div>
            <Link
              to={
                hasPrice
                  ? "/account-settings?tab=connections"
                  : "/build-authority"
              }
              className="block text-xs text-center underline hover:no-underline"
              style={{ color: v.accent }}
            >
              {hasPrice ? "Set up payments →" : "Set a price →"}
            </Link>
          </div>
        ) : (
          // Reader view, payments not available — never show a dead Enroll button
          <Button
            asChild
            variant="outline"
            className="w-full"
            style={{ borderColor: v.cardBorder, color: v.bodyText }}
          >
            <a href={contactHref}>
              Contact <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
