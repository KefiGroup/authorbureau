/**
 * Only allow redirects to internal paths.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com") and backslash tricks.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(path)) return fallback;
  return path;
}
