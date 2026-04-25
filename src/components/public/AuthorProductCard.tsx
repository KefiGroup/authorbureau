import { ArrowRight, ExternalLink, Headphones, Mic, Newspaper, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCTA from "@/components/commerce/ProductCTA";
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
  if (code === "USD") return `$${formatted} USD`;
  return `${code} ${formatted}`;
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

  const contactHref = authorContactEmail
    ? `mailto:${authorContactEmail}?subject=${encodeURIComponent(`Enquiry: ${title}`)}`
    : `/${authorSlug}#contact`;

  // For high-touch service nodes (coaching, retreats, etc.) where there's a contact email
  // and no price set, prefer "Contact" over "Notify me". Everything else routes through
  // ProductCTA's 4-state matrix (live / coming-soon / owner-no-price / owner-no-stripe).
  const isHighTouchInquiry =
    !hasPrice && !!authorContactEmail && /^(YR-|BA-13|BA-12)/.test(node.node_id);

  // INFORMATIONAL nodes — non-transactional revenue surfaces (Podcast,
  // Media Kit, Affiliate Programme, JV/Revenue Share). They are LIVE products,
  // just not paid via Stripe. They must NEVER show "Coming Soon" — instead
  // route readers straight to the relevant microsite via delivery_url.
  const INFORMATIONAL_CTAS: Record<string, { label: string; Icon: typeof ArrowRight; replacePriceLabel?: string }> = {
    "BA-14": { label: "Listen Now",        Icon: Headphones,  replacePriceLabel: "Free to listen" },
    "BA-15": { label: "View Media Kit",    Icon: Newspaper,   replacePriceLabel: "Press resources" },
    "BA-16": { label: "Join Programme",    Icon: Handshake,   replacePriceLabel: "Apply to join" },
    "BA-18": { label: "Partner With Us",   Icon: Handshake,   replacePriceLabel: "By application" },
  };
  const informational =
    !hasPrice && (node.delivery_url || node.payment_link || node.third_party_url)
      ? INFORMATIONAL_CTAS[node.node_id.substring(0, 5)]
      : undefined;
  const informationalHref =
    node.delivery_url || node.payment_link || node.third_party_url || `/${authorSlug}`;

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
            {informational?.replacePriceLabel || "Pricing on request"}
          </span>
        )}
      </div>

      {/* CTA — informational nodes (Podcast, Media Kit, Affiliate, JV) get a
          direct link; high-touch services get Contact; everything else routes
          through ProductCTA's 4-state matrix. */}
      <div className="mt-auto">
        {informational && !isOwnerViewing ? (
          <Button
            asChild
            className="w-full"
            style={{ background: v.accent, color: v.accentText }}
          >
            <a
              href={informationalHref}
              target={informationalHref.startsWith("http") ? "_blank" : undefined}
              rel={informationalHref.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <informational.Icon className="mr-2 h-4 w-4" />
              {informational.label}
              {informationalHref.startsWith("http") ? (
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              )}
            </a>
          </Button>
        ) : isHighTouchInquiry && !isOwnerViewing ? (
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
        ) : (
          <ProductCTA
            authorNodeId={node.id}
            authorId={authorId}
            effectivePrice={effectivePrice}
            stripeReady={stripeReady}
            isOwnerViewing={isOwnerViewing}
            label="Enroll Now"
            productTitle={title}
            fallbackUrl={node.delivery_url || node.payment_link || node.third_party_url || null}
            className="w-full"
            style={{ background: v.accent, color: v.accentText }}
            theme={{
              cardBg: v.cardBg,
              cardBorder: v.cardBorder,
              mutedText: v.mutedText,
              accent: v.accent,
              bodyText: v.bodyText,
              secondaryBg: v.secondaryBg,
            }}
          />
        )}
      </div>
    </article>
  );
}
