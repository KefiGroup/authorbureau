/**
 * Resolve a display price label for a live author_node.
 *
 * Different builders persist prices under different keys in `content_json`:
 *   - BP-07 Home Study, BA-11 Audiobook → `price`
 *   - BA-10 Online Course               → `suggested_price_usd`
 *   - BA-12 Membership                  → `monthly_price_usd` (recurring)
 *   - BA-12 / YR-23                     → `tiers[].price` or `tiers[].price_monthly`
 *   - YR-19 1:1 Coaching                → `packages[].price`
 *   - YR-25 Certification               → `certification_levels[].price`
 *
 * Returns a formatted USD string ("$297", "$27/mo", "From $1,500"),
 * or null when no price exists. Callers decide whether to render
 * "Free" (only safe for known-free node types) or hide the badge.
 */

const KNOWN_FREE_PREFIXES = ["BP-01", "BP-02", "BP-05"];

const fmt = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)}`;

function pickMin(arr: unknown, keys: string[]): number | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const values: number[] = [];
  for (const item of arr) {
    if (item && typeof item === "object") {
      for (const k of keys) {
        const v = (item as Record<string, unknown>)[k];
        if (typeof v === "number" && v > 0) values.push(v);
        else if (typeof v === "string") {
          const parsed = parseFloat(v.replace(/[^0-9.]/g, ""));
          if (!Number.isNaN(parsed) && parsed > 0) values.push(parsed);
        }
      }
    }
  }
  return values.length > 0 ? Math.min(...values) : null;
}

export interface NodePriceResult {
  /** Pre-formatted label, or null if no price found */
  label: string | null;
  /** True when this node type is known to be free when no price is set */
  isKnownFree: boolean;
}

export function getNodePriceLabel(node: {
  node_id: string;
  content_json?: Record<string, unknown> | null;
}): NodePriceResult {
  const isKnownFree = KNOWN_FREE_PREFIXES.some((p) => node.node_id.startsWith(p));
  const c = node.content_json || {};

  // 1) Direct price keys (one-time)
  const direct = c.price ?? c.price_usd ?? c.suggested_price_usd;
  if (typeof direct === "number" && direct > 0) {
    return { label: fmt(direct), isKnownFree };
  }
  if (typeof direct === "string") {
    const parsed = parseFloat(String(direct).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed) && parsed > 0) {
      return { label: fmt(parsed), isKnownFree };
    }
  }

  // 2) Monthly recurring
  const monthly = c.monthly_price_usd ?? c.price_monthly;
  if (typeof monthly === "number" && monthly > 0) {
    return { label: `${fmt(monthly)}/mo`, isKnownFree };
  }

  // 3) Min-of-tiers / packages / certification levels
  const tiersMin = pickMin(c.tiers, ["price", "price_usd", "price_monthly"]);
  if (tiersMin != null) {
    const isMonthly = Array.isArray(c.tiers) && (c.tiers as unknown[]).some(
      (t) => t && typeof t === "object" && "price_monthly" in (t as Record<string, unknown>)
    );
    return { label: isMonthly ? `From ${fmt(tiersMin)}/mo` : `From ${fmt(tiersMin)}`, isKnownFree };
  }

  const packagesMin = pickMin(c.packages, ["price", "price_usd", "investment"]);
  if (packagesMin != null) {
    return { label: `From ${fmt(packagesMin)}`, isKnownFree };
  }

  const certMin = pickMin(c.certification_levels, ["price", "price_usd", "investment"]);
  if (certMin != null) {
    return { label: `From ${fmt(certMin)}`, isKnownFree };
  }

  return { label: null, isKnownFree };
}
