/**
 * Normalises BA-12 (Memberships) content to the new shape.
 * Idempotent — re-running on already-new content is a no-op.
 *
 * Legacy shape: { membership_name, monthly_price_usd, benefits[], transformation_promise }
 * New shape:    { membership_title, tiers: [{ name, price, description, benefits[] }], content_calendar }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDefaultCalendar(raw: any): string {
  const name =
    raw?.membership_title || raw?.membership_name || "your membership";
  const newsletterCue =
    typeof raw?.monthly_newsletter_template === "string" &&
    raw.monthly_newsletter_template.trim()
      ? " Tie each week's drop to the month's newsletter theme."
      : "";
  return [
    `A simple monthly rhythm for ${name}:`,
    `• Week 1 — Welcome + monthly theme kickoff (live Q&A or AMA).`,
    `• Week 2 — Deep-dive workshop, training drop, or exclusive resource.`,
    `• Week 3 — Community discussion prompt + member spotlight.`,
    `• Week 4 — Office hours / accountability call + preview next month's theme.${newsletterCue}`,
  ].join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseMembership(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const normalised = {
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
  const hasCalendar =
    typeof raw.content_calendar === "string" && raw.content_calendar.trim();
  return {
    ...normalised,
    content_calendar: hasCalendar
      ? raw.content_calendar
      : buildDefaultCalendar(normalised),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyMembership(raw: any): boolean {
  return (
    !raw ||
    !Array.isArray(raw.tiers) ||
    raw.tiers.length === 0 ||
    typeof raw.content_calendar !== "string" ||
    !raw.content_calendar.trim()
  );
}
