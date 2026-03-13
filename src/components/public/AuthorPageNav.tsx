import { Link } from "react-router-dom";
import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";

/**
 * Global navigation bar for all public author pages.
 * Uses fixed Authors Bureau brand colors — NOT theme-driven.
 */
export default function AuthorPageNav({
  authorName,
  authorSlug,
  bookTitle,
  bookSlug,
  productTitle,
}: {
  authorName?: string;
  authorSlug?: string;
  bookTitle?: string;
  bookSlug?: string;
  productTitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "#0B1D3A",
        color: "#FFFFFF",
        borderBottom: "1px solid rgba(197, 165, 90, 0.2)",
      }}
    >
      <div className="container max-w-6xl flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-sm tracking-wide hover:opacity-90 transition-opacity">
          <BookOpen className="h-5 w-5" style={{ color: "#C5A55A" }} />
          <span>Authors Bureau</span>
        </Link>

        {/* Breadcrumbs — desktop */}
        <div className="hidden md:flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Link to="/directory" className="hover:text-white/80 transition-colors">Authors</Link>
          {authorName && authorSlug && (
            <>
              <span>/</span>
              <Link to={`/${authorSlug}`} className="hover:text-white/80 transition-colors">{authorName}</Link>
            </>
          )}
          {bookTitle && bookSlug && authorSlug && (
            <>
              <span>/</span>
              <Link to={`/${authorSlug}/${bookSlug}`} className="hover:text-white/80 transition-colors truncate max-w-[160px]">{bookTitle}</Link>
            </>
          )}
          {productTitle && (
            <>
              <span>/</span>
              <span className="text-white/80 font-medium truncate max-w-[140px]">{productTitle}</span>
            </>
          )}
        </div>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className="hidden sm:inline-flex px-4 py-1.5 text-xs font-semibold rounded-full transition-all hover:scale-105"
            style={{ background: "#C5A55A", color: "#0B1D3A" }}
          >
            Start Your Journey
          </Link>
          <button
            className="md:hidden p-1.5 rounded"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#C5A55A" }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-2 text-sm" style={{ borderColor: "rgba(197,165,90,0.15)", background: "#0B1D3A" }}>
          <Link to="/directory" className="block py-1 opacity-70 hover:opacity-100" onClick={() => setMobileOpen(false)}>Authors Directory</Link>
          {authorName && authorSlug && (
            <Link to={`/${authorSlug}`} className="block py-1 opacity-70 hover:opacity-100" onClick={() => setMobileOpen(false)}>{authorName}</Link>
          )}
          {bookTitle && bookSlug && authorSlug && (
            <Link to={`/${authorSlug}/${bookSlug}`} className="block py-1 opacity-70 hover:opacity-100" onClick={() => setMobileOpen(false)}>{bookTitle}</Link>
          )}
          <Link to="/join" className="block py-1 font-semibold" style={{ color: "#C5A55A" }} onClick={() => setMobileOpen(false)}>Start Your Journey →</Link>
        </div>
      )}
    </nav>
  );
}
