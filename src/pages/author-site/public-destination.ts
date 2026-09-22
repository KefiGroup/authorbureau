/**
 * Single source of truth for "where does this offer send the visitor?".
 *
 * Every public card, button and chip on an author page must resolve its
 * destination through here so a visitor can always either buy it, open it,
 * or ask about it. No dead `#` links, no silent fallbacks to the newsletter
 * box, no cards that do nothing when clicked.
 */

export type PublicNodeLike = {
  node_id: string;
  node_name?: string | null;
  personalised_name?: string | null;
  third_party_url?: string | null;
  payment_link?: string | null;
  checkout_url?: string | null;
  microsite_url?: string | null;
  content_json?: Record<string, unknown> | null;
};

export type PublicDestination =
  | { kind: "external"; href: string; label: string }
  | { kind: "internal"; href: string; label: string }
  | { kind: "enquire"; subject: string; label: string };

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim() !== "#" ? v.trim() : null;

/**
 * Stored microsite URLs can carry a stale host (localhost, a preview domain, or
 * an older production host). Any URL that points at one of our own hosts is
 * reduced to a same-site path so visitors never land on a dead link.
 */
export function normaliseMicrositeUrl(url: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url.startsWith("/") ? url : `/${url}`;
  try {
    const u = new URL(url);
    const ownHost =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      /(^|\.)authorsbureau\.com$/i.test(u.hostname) ||
      /\.lovable\.app$/i.test(u.hostname) ||
      (typeof window !== "undefined" && u.hostname === window.location.hostname);
    return ownHost ? `${u.pathname}${u.search}${u.hash}` : url;
  } catch {
    return url;
  }
}

export function nodeTitle(node: PublicNodeLike): string {
  return node.personalised_name || node.node_name || "This offer";
}

/**
 * Opens the on-page enquiry form, pre-filled with the offer name.
 * Listened for by AuthorSite / AuthorBookPage.
 */
export function openEnquiry(subject: string) {
  window.dispatchEvent(
    new CustomEvent("author-site:enquire", { detail: { subject } }),
  );
}

export function resolvePublicDestination(
  node: PublicNodeLike,
  opts?: { label?: string; enquireLabel?: string; allowMicrosite?: boolean },
): PublicDestination {
  const content = (node.content_json || {}) as Record<string, unknown>;
  const label = opts?.label ?? "Learn More";

  const external =
    str(node.third_party_url) ||
    str(node.checkout_url) ||
    str(node.payment_link) ||
    str(content.link) ||
    str(content.url) ||
    str(content.rss_url) ||
    str(content.sales_page_url) ||
    str(content.amazon_url);
  if (external) return { kind: "external", href: external, label };

  if (opts?.allowMicrosite !== false) {
    const micro = normaliseMicrositeUrl(str(node.microsite_url));
    if (micro) {
      return micro.startsWith("http")
        ? { kind: "external", href: micro, label }
        : { kind: "internal", href: micro, label };
    }
  }

  return {
    kind: "enquire",
    subject: nodeTitle(node),
    label: opts?.enquireLabel ?? "Enquire",
  };
}
