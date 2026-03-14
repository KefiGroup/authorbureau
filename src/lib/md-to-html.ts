/**
 * Converts basic markdown to HTML for rendering in prose containers.
 * Handles headings, bold, italic, lists, and paragraphs.
 */
export function mdToHtml(md: string): string {
  if (!md) return "";

  // If it already looks like HTML, return as-is
  if (md.trim().startsWith("<") && /<\/(p|div|h[1-6]|ul|ol|li)>/.test(md)) {
    return md;
  }

  let html = md
    // Headings
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered lists
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr/>")
    // Line breaks: double newline → paragraph break
    .replace(/\n{2,}/g, "</p><p>")
    // Single newlines → <br>
    .replace(/\n/g, "<br/>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>(?:<br\/>)?)+)/g, (match) => {
    const cleaned = match.replace(/<br\/>/g, "");
    return `<ul>${cleaned}</ul>`;
  });

  // Wrap in paragraph if not starting with a block element
  if (!/^<(h[1-6]|ul|ol|div|p|hr)/.test(html.trim())) {
    html = `<p>${html}</p>`;
  }

  return html;
}
