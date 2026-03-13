import { type ReactNode } from "react";
import AuthorPageNav from "./AuthorPageNav";
import AuthorPageFooter from "./AuthorPageFooter";
import { getThemeFontsUrl, getThemeCSSVars, type AuthorTheme } from "@/lib/author-themes";

/**
 * Shared layout wrapper for all public author pages.
 * - Injects theme CSS variables into a wrapper div
 * - Loads only the required Google Fonts
 * - Renders the global nav bar and footer with fixed brand colors
 * - Everything between nav and footer is theme-driven
 */
export default function AuthorPageLayout({
  theme,
  authorName,
  authorSlug,
  bookTitle,
  bookSlug,
  productTitle,
  children,
}: {
  theme: AuthorTheme;
  authorName?: string;
  authorSlug?: string;
  bookTitle?: string;
  bookSlug?: string;
  productTitle?: string;
  children: ReactNode;
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

      <div className="min-h-screen flex flex-col">
        <AuthorPageNav
          authorName={authorName}
          authorSlug={authorSlug}
          bookTitle={bookTitle}
          bookSlug={bookSlug}
          productTitle={productTitle}
        />

        <div className="author-theme-root flex-1" style={{ background: "var(--theme-secondary-bg)" }}>
          {children}
        </div>

        <AuthorPageFooter />
      </div>
    </>
  );
}
