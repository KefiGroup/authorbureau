/**
 * Normalises BA-12 (Memberships) content to the new shape.
 * Idempotent — re-running on already-new content is a no-op.
 *
 * Legacy shape: { membership_name, monthly_price_usd, benefits[], transformation_promise }
 * New shape:    { membership_title, tiers: [{ name, price, description, benefits[] }] }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseMembership(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    membership_title: raw.membership_title || raw.membership_name || "",
    tiers:
      Array.isArray(raw.tiers) && raw.tiers.length
        ? raw.tiers
        : [
            {
              name: "Member",
              price: Number(raw.monthly_price_usd ?? 27),
              description: raw.transformation_promise || "",
              benefits: Array.isArray(raw.benefits) ? raw.benefits : [],
            },
          ],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyMembership(raw: any): boolean {
  return !raw || !Array.isArray(raw.tiers) || raw.tiers.length === 0;
}
