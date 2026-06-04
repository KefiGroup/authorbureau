/**
 * Sanitize an author/AI-generated display name before showing it publicly.
 *
 * Generators sometimes persist database artifacts into `personalised_name`
 * such as the page-title pattern "Author | Book" or an inquiry-CTA suffix like
 * "… — Contact Pauline". Those must never surface as a public product/page name.
 *
 * Rules:
 *  - Strip a trailing " — Contact <Name>" / " - Contact <Name>" CTA artifact.
 *  - If what remains still contains a pipe ("Author | Book"), it is a page-title
 *    artifact, not a real product name → use the canonical fallback.
 *  - Empty/whitespace → fallback.
 */
export function formatPublicLabel(
  raw: string | null | undefined,
  fallback: string,
): string {
  let s = (raw || "").trim();
  if (!s) return fallback;

  // Drop trailing "— Contact <Name>" / "- Contact <Name>" inquiry-CTA artifact.
  s = s.replace(/\s*[—–-]\s*contact\b.*$/i, "").trim();

  // "Author | Book" page-title artifact is not a product name.
  if (s.includes("|")) return fallback;

  return s || fallback;
}
