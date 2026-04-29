import { Link } from "react-router-dom";

interface Props {
  /** Optional author display name for the copyright line. */
  displayName?: string | null;
}

/**
 * Minimal "Powered by Authors Bureau" footer for auxiliary public microsite
 * pages (course sales, membership sales, webinar, home-study bundle, etc.)
 * that don't render through `AuthorPageLayout` and therefore can't use the
 * theme-aware `AuthorMicrositeFooter`.
 *
 * Required by the Public Microsites rule (see Core memory).
 */
export default function MicrositePoweredByFooter({ displayName }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card mt-12 py-6 px-4">
      <div className="max-w-5xl mx-auto text-center text-[11px] text-muted-foreground space-y-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <span className="opacity-40">·</span>
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <span className="opacity-40">·</span>
          <Link to="/terms-of-sale" className="hover:underline">Terms of Sale</Link>
          <span className="opacity-40">·</span>
          <Link to="/" className="hover:underline">Powered by Authors Bureau</Link>
        </div>
        {displayName && (
          <div className="opacity-70">
            © {year} {displayName}. All rights reserved.
          </div>
        )}
      </div>
    </footer>
  );
}
