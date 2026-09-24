import { Link } from "react-router-dom";
import { Headphones, BookOpen, Package, ShoppingBag, ExternalLink, ArrowRight } from "lucide-react";
import type { BookWithProducts, ThemeVars, BookFormatNode } from "./types";
import { getFormatsForBook } from "./types";
import type { AuthorTheme } from "@/lib/author-themes";
import { NODE_SLUG_MAP } from "@/lib/node-slug-map";

interface SimpleFormatRow {
  kind: "link";
  key: string;
  label: string;
  Icon: typeof BookOpen;
  price: string | null;
  href: string;
  external?: boolean;
}

interface Props {
  book: BookWithProducts;
  authorSlug: string;
  liveNodes: BookFormatNode[];
  theme: AuthorTheme;
  v: ThemeVars;
}

/** Same single price format as the rest of the public site: "$14.99".
 *  A zero price is not a price, so it is hidden rather than shown as $0.00. */
function formatPrice(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (value == null || isNaN(value) || value <= 0) return null;
  const code = (currency || "USD").toUpperCase();
  if (code === "USD") return `$${value.toFixed(2)}`;
  return `${code} ${value.toFixed(2)}`;
}

export default function AuthorBookFormatsList({
  book,
  authorSlug,
  liveNodes,
  theme,
  v,
}: Props) {
  const rows: SimpleFormatRow[] = [];

  // Built-in formats from the books table — Amazon links only, no Stripe.
  if (book.kindle_price) {
    rows.push({
      kind: "link",
      key: "kindle",
      label: "Kindle",
      Icon: BookOpen,
      price: Number.parseFloat(book.kindle_price.replace(/[^\d.]/g, "")) >= 100 ? null : book.kindle_price.startsWith("$") ? book.kindle_price : `$${book.kindle_price}`,
      href: book.amazon_url || `/${authorSlug}/${book.slug}`,
      external: !!book.amazon_url,
    });
  }
  if (book.paperback_price) {
    rows.push({
      kind: "link",
      key: "paperback",
      label: "Paperback",
      Icon: BookOpen,
      price: Number.parseFloat(book.paperback_price.replace(/[^\d.]/g, "")) >= 100 ? null : book.paperback_price.startsWith("$") ? book.paperback_price : `$${book.paperback_price}`,
      href: book.amazon_url || `/${authorSlug}/${book.slug}`,
      external: !!book.amazon_url,
    });
  }

  // Format nodes (BA-11 audiobook, BP-06 workbook, BA-17 bundle)
  const formatNodes = getFormatsForBook(liveNodes, book);
  for (const n of formatNodes) {
    if (n.node_id.startsWith("BA-11")) {
      // Audiobook keeps its dedicated landing page (player + chapters).
      rows.push({
        kind: "link",
        key: n.id,
        label: "Audiobook",
        Icon: Headphones,
        price: n.price_usd != null && n.price_usd >= 100 ? null : formatPrice(n.price_usd, n.currency),
        href: `/${authorSlug}/${book.slug}/${NODE_SLUG_MAP["BA-11"]}`,
      });
    } else if (n.node_id.startsWith("BP-06")) {
      // Public book lists lead to this book's own offer page. That page owns
      // pricing and checkout; author-only price prompts never belong here.
      rows.push({
        kind: "link",
        key: n.id,
        label: "Workbook",
        Icon: BookOpen,
        price: null,
        href: `/${authorSlug}/${book.slug}/${NODE_SLUG_MAP["BP-06"]}`,
      });
    } else if (n.node_id.startsWith("BA-17")) {
      rows.push({
        kind: "link",
        key: n.id,
        label: n.personalised_name || "Bundle",
        Icon: Package,
        price: null,
        href: `/${authorSlug}/${book.slug}/${NODE_SLUG_MAP["BA-17"]}`,
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div
      className="px-6 pb-5 pt-1"
      style={{ borderTop: `1px dashed ${v.cardBorder}` }}
    >
      <div className="flex items-center gap-2 mb-3 mt-3">
        <ShoppingBag className="h-3.5 w-3.5" style={{ color: v.mutedText }} />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: v.mutedText, fontFamily: theme.headingFont }}
        >
          Available formats
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map(row => {
          const labelBlock = (
            <div className="flex items-center gap-2.5 min-w-0">
              <row.Icon className="h-4 w-4 shrink-0" style={{ color: v.primary }} />
              <span className="text-sm font-medium truncate" style={{ color: v.headingText }}>
                {row.label}
              </span>
            </div>
          );

          const inner = (
            <div
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors group/row"
              style={{ background: v.secondaryBg, border: `1px solid ${v.cardBorder}` }}
            >
              {labelBlock}
              <div className="flex items-center gap-2 shrink-0">
                {row.price && (
                  <span className="text-sm font-bold" style={{ color: v.accent }}>
                    {row.price}
                  </span>
                )}
                {row.external && <ExternalLink className="h-3 w-3" style={{ color: v.mutedText }} />}
                {!row.external && !row.price && <ArrowRight className="h-3 w-3" style={{ color: v.mutedText }} />}
              </div>
            </div>
          );
          return (
            <li key={row.key}>
              {row.external ? (
                <a href={row.href} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <Link to={row.href}>{inner}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
