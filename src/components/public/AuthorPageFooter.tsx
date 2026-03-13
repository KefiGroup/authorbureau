import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

/**
 * Global footer for all public author pages.
 * Uses fixed Authors Bureau brand colors — NOT theme-driven.
 */
export default function AuthorPageFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="py-10"
      style={{
        background: "#0B1D3A",
        color: "rgba(255,255,255,0.5)",
      }}
    >
      <div className="container max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-white font-bold mb-3">
              <BookOpen className="h-5 w-5" style={{ color: "#C5A55A" }} />
              Authors Bureau
            </Link>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              The all-in-one platform that transforms your book into a thriving business. 
              AI-powered products, hosted pages, and revenue tools — built for authors.
            </p>
          </div>
          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/directory" className="hover:text-white/80 transition-colors">Authors Directory</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white/80 transition-colors">How It Works</Link></li>
              <li><Link to="/faq" className="hover:text-white/80 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          {/* Get started */}
          <div>
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Get Started</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/join" className="hover:text-white/80 transition-colors">Apply as an Author</Link></li>
              <li><Link to="/auth" className="hover:text-white/80 transition-colors">Sign In</Link></li>
              <li><Link to="/contact" className="hover:text-white/80 transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]" style={{ borderColor: "rgba(197,165,90,0.15)" }}>
          <span>© {year} Authors Bureau. All rights reserved.</span>
          <span style={{ color: "rgba(197,165,90,0.6)" }}>Empowering authors to build businesses from their books.</span>
        </div>
      </div>
    </footer>
  );
}
