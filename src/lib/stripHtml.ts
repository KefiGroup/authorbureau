/** Strip HTML tags from a string, preserving text content */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    // Normalize stray whitespace before sentence punctuation (e.g. "Specialist ,who" → "Specialist, who")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .trim();
}
