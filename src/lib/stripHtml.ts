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
    // Normalize stray whitespace before sentence punctuation (e.g. "Specialist ,who" → "Specialist,who")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    // Ensure a single space AFTER sentence punctuation when the next char is a letter
    // (e.g. "Specialist,who" → "Specialist, who"). Skips decimals and abbreviations
    // because the lookahead requires a letter, not a digit.
    .replace(/([,.;:!?])([A-Za-z])/g, "$1 $2")
    .trim();
}
