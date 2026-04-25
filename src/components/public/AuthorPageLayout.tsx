import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import AuthorBreadcrumbs from "./AuthorBreadcrumbs";
import { getThemeFontsUrl, getThemeCSSVars, type AuthorTheme } from "@/lib/author-themes";

/**
 * Shared layout wrapper for all public author pages.
 * - Injects theme CSS variables into a wrapper div
 * - Loads only the required Google Fonts
 * - Renders breadcrumbs and "Powered by" footer badge
 * - NO global platform nav — author pages use AuthorBrandedNav instead
 */
export default function AuthorPageLayout({
  theme,
  breadcrumbs,
  children,
  footerSlot,
}: {
  theme: AuthorTheme;
  breadcrumbs?: { label: string; to?: string }[];
  children: ReactNode;
  /** Optional richer footer (socials + legal). When provided, replaces the
   *  default "Powered by" badge. */
  footerSlot?: ReactNode;
}) {
  const cssVars = getThemeCSSVars(theme);

  return (
    <>
      <link rel="stylesheet" href={getThemeFontsUrl(theme)} />
      <style>{`
        .author-theme-root {
          ${cssVars}
        }
        .author-theme-root {
          font-family: var(--theme-body-font);
          color: var(--theme-body-text);
        }
        .author-theme-root .theme-heading {
          font-family: var(--theme-heading-font);
          color: var(--theme-heading-text);
        }
      `}</style>

      <div className="author-theme-root min-h-screen flex flex-col" style={{ background: "var(--theme-secondary-bg)" }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <AuthorBreadcrumbs items={breadcrumbs} />
        )}
        <div className="flex-1">
          {children}
        </div>

        {footerSlot ? (
          footerSlot
        ) : (
          <footer
            className="py-6 text-center"
            style={{ background: "var(--theme-primary)" }}
          >
            <Link
              to="/"
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: "#888888" }}
            >
              Powered by Authors Bureau
            </Link>
          </footer>
        )}
      </div>
    </>
  );
}
