import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";

interface BookItem {
  slug: string;
  title: string;
  cover_image_url?: string | null;
  genre?: string | null;
}

interface AuthorBrandedNavProps {
  authorSlug: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  books: BookItem[];
  hasServices: boolean;
  hasLearnSection?: boolean;
  hasQuizSection?: boolean;
  hasEvents?: boolean;
  hasWorkWithMe?: boolean;
  vars: {
    primary: string;
    primaryText: string;
    accent: string;
    accentText: string;
    cardBg: string;
    cardBorder: string;
    headingText: string;
    mutedText: string;
    secondaryBg: string;
  };
  headingFont: string;
  bodyFont: string;
  activeSection?: string;
  onContactClick?: () => void;
  /** Sticky gold CTA pinned to the right of the nav. Hidden when null. */
  buyCta?: { label: string; to: string } | null;
}

export default function AuthorBrandedNav({
  authorSlug,
  authorName,
  authorPhotoUrl,
  books,
  hasServices,
  hasLearnSection,
  hasQuizSection,
  hasEvents,
  hasWorkWithMe,
  vars: v,
  headingFont,
  bodyFont,
  activeSection,
  onContactClick,
  buyCta,
}: AuthorBrandedNavProps) {
  const [booksOpen, setBooksOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!booksOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBooksOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [booksOpen]);

  // Sprint 66: Context-aware anchors. On a book/microsite route, link to in-page
  // sections (#work-with-me, #quiz-section). On the author page, link to the
  // author profile sections (/{slug}#services, /{slug}#quiz-section).
  const onAuthorPage = location.pathname === `/${authorSlug}` || location.pathname === `/${authorSlug}/`;
  const workWithHref = onAuthorPage ? `/${authorSlug}#services` : "#work-with-me";
  const quizHref = onAuthorPage ? `/${authorSlug}#quiz-section` : "#quiz-section";

  const navLinks = [
    ...(books.length === 1
      ? [{ label: "Books", to: `/${authorSlug}/${books[0].slug}`, type: "link" as const }]
      : books.length > 1
        ? [{ label: "Books", to: "#", type: "dropdown" as const }]
        : []),
    ...(hasQuizSection ? [{ label: "Free Quiz", to: quizHref, type: "link" as const }] : []),
    ...(hasWorkWithMe || hasServices ? [{ label: "Work With Me", to: workWithHref, type: "link" as const }] : []),
    { label: "Contact", to: "#", type: "action" as const },
  ];
  // Note: Learn + Events are intentionally pruned from the primary nav (Sprint 4).
  // They remain reachable via in-page scroll from other CTAs.
  void hasLearnSection; void hasEvents;

  return (
    <nav
      className="sticky top-0 z-[100]"
      style={{
        background: v.primary,
        height: "56px",
        borderBottom: `1px solid ${v.accent}33`,
        fontFamily: bodyFont,
      }}
    >
      <div className="container max-w-7xl flex items-center justify-between h-14 px-4">
        {/* Left — Author Identity */}
        <Link
          to={`/${authorSlug}`}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
        >
          {authorPhotoUrl ? (
            <img
              src={authorPhotoUrl}
              alt={authorName}
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: `2px solid ${v.accent}` }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: v.accent, color: v.accentText }}
            >
              {authorName.charAt(0)}
            </div>
          )}
          <span
            className="font-semibold text-[1rem]"
            style={{ color: v.primaryText, fontFamily: headingFont }}
          >
            {authorName}
          </span>
        </Link>

        {/* Right — Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            if (link.type === "dropdown") {
              return (
                <div key={link.label} className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setBooksOpen(!booksOpen)}
                    className="flex items-center gap-1 text-[0.9rem] font-medium transition-colors"
                    style={{ color: `${v.primaryText}D9` }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = v.accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = `${v.primaryText}D9`)}
                  >
                    {link.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${booksOpen ? "rotate-180" : ""}`} />
                  </button>

                  {booksOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl py-1 z-50"
                      style={{
                        background: v.cardBg,
                        border: `1px solid ${v.cardBorder}`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                    >
                      {books.map((book) => (
                        <Link
                          key={book.slug}
                          to={`/${authorSlug}/${book.slug}`}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                          style={{ color: v.headingText }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = v.secondaryBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          onClick={() => setBooksOpen(false)}
                        >
                          {book.cover_image_url ? (
                            <img src={book.cover_image_url} alt={book.title} className="w-10 h-14 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-14 rounded shrink-0 flex items-center justify-center" style={{ background: v.secondaryBg }}>
                              <span className="text-[10px] font-bold" style={{ color: v.mutedText }}>📖</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ fontFamily: headingFont }}>{book.title}</p>
                            {book.genre && <p className="text-xs" style={{ color: v.mutedText }}>{book.genre}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (link.type === "action") {
              return (
                <button
                  key={link.label}
                  onClick={onContactClick}
                  className="relative text-[0.9rem] font-medium transition-colors"
                  style={{ color: `${v.primaryText}D9` }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = v.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = `${v.primaryText}D9`)}
                >
                  {link.label}
                </button>
              );
            }

            const isActive = activeSection === link.label.toLowerCase();
            return (
              <Link
                key={link.label}
                to={link.to}
                className="relative text-[0.9rem] font-medium transition-colors"
                style={{ color: isActive ? v.accent : `${v.primaryText}D9` }}
                onMouseEnter={(e) => (e.currentTarget.style.color = v.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? v.accent : `${v.primaryText}D9`)}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-[2px]" style={{ background: v.accent }} />
                )}
              </Link>
            );
          })}

          {buyCta && (
            <Link
              to={buyCta.to}
              className="inline-flex items-center gap-1.5 font-bold text-[0.85rem] rounded-full px-4 py-2 transition-all hover:scale-[1.03] shrink-0"
              style={{ background: v.accent, color: v.accentText, boxShadow: `0 4px 12px ${v.accent}55` }}
            >
              {buyCta.label}
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          {buyCta && (
            <Link
              to={buyCta.to}
              className="inline-flex items-center font-bold text-[0.78rem] rounded-full px-3 py-1.5"
              style={{ background: v.accent, color: v.accentText }}
            >
              {buyCta.label}
            </Link>
          )}
          <button
            className="p-1.5"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: v.primaryText }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden absolute left-0 right-0 top-14 z-[99] px-6 py-6 flex flex-col gap-4"
          style={{ background: v.primary, borderBottom: `1px solid ${v.accent}33` }}
        >
          {books.map((book) => (
            <Link
              key={book.slug}
              to={`/${authorSlug}/${book.slug}`}
              className="text-sm font-medium py-1.5"
              style={{ color: `${v.primaryText}D9` }}
              onClick={() => setMobileOpen(false)}
            >
              📖 {book.title}
            </Link>
          ))}
          {hasServices && (
            <Link
              to={workWithHref}
              className="text-sm font-medium py-1.5"
              style={{ color: `${v.primaryText}D9` }}
              onClick={() => setMobileOpen(false)}
            >
              Work With Me
            </Link>
          )}
          <button
            className="text-sm font-medium py-1.5 text-left"
            style={{ color: `${v.primaryText}D9` }}
            onClick={() => {
              setMobileOpen(false);
              onContactClick?.();
            }}
          >
            Contact
          </button>
        </div>
      )}
    </nav>
  );
}
