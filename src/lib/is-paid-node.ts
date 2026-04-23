/**
 * Detects whether a node's content represents a paid product.
 * Used by both UI and server-side gates to decide if Stripe Connect is required.
 */
export function isPaidNode(content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;

  const price = Number(
    (c.suggested_price_usd as number | undefined) ??
      (c.price_usd as number | undefined) ??
      0,
  );
  if (price > 0) return true;

  if (c.pricing_recommendation === "paid") return true;

  const tiers = c.sales_tiers as Array<{ price_usd?: number }> | undefined;
  if (Array.isArray(tiers) && tiers.some((t) => Number(t?.price_usd ?? 0) > 0)) {
    return true;
  }

  return false;
}
