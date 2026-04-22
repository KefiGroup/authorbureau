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
function toPlainString(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        if (typeof item === "object") {
          const o = item as Record<string, unknown>;
          const label = o.week ?? o.title ?? o.name ?? o.day;
          const body = o.focus ?? o.description ?? o.content ?? o.body ?? o.summary;
          if (label || body) {
            return `${label ? `${label}: ` : ""}${body ? toPlainString(body) : ""}`.trim();
          }
          try { return JSON.stringify(item); } catch { return String(item); }
        }
        return String(item);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${toPlainString(v)}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  try { return JSON.stringify(value); } catch { return String(value); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCalendarString(value: any, raw: any): string {
  const text = toPlainString(value).trim();
  return text || buildDefaultCalendar(raw);
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
  const newsletterText = toPlainString(raw.monthly_newsletter_template).trim();
  return {
    ...normalised,
    content_calendar: toCalendarString(raw.content_calendar, normalised),
    monthly_newsletter_template: newsletterText || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLegacyMembership(raw: any): boolean {
  if (!raw) return true;
  if (!Array.isArray(raw.tiers) || raw.tiers.length === 0) return true;
  if (typeof raw.content_calendar !== "string" || !raw.content_calendar.trim()) return true;
  if (raw.monthly_newsletter_template != null && typeof raw.monthly_newsletter_template !== "string") return true;
  return false;
}
