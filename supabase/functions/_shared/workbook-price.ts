/** BP-06 has one author-selected price, shared by the public page and checkout. */
export function workbookPrice(content: Record<string, unknown>): number | null {
  if (content.pricing_recommendation === "free") return 0;
  if (content.pricing_recommendation !== "paid") return null;
  const raw = content.suggested_price_usd;
  if (typeof raw !== "number" && (typeof raw !== "string" || !raw.trim())) return null;
  const price = Number(raw);
  return Number.isFinite(price) && price > 0 && price < 1000000 && Math.round(price * 100) === price * 100
    ? price
    : null;
}