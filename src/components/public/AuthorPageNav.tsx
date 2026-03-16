import { Link } from "react-router-dom";
import { BookOpen, Menu, X, Search, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";
import logoIcon from "@/assets/logo-icon.png";

const NAV_LINKS = [
  { label: "Authors Directory", to: "/directory" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Methodology", to: "/methodology" },
];

const PUBLISHNOW_AUTH_URL = getPublishNowAuthUrl("/dashboard");

/**
 * Global navigation bar for all public author pages.
 * Uses fixed Authors Bureau brand colors — NOT theme-driven.
 */
export default function AuthorPageNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [avatarOpen]);

  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  return (
    <nav
      className="sticky top-0 z-[100]"
      style={{
        background: "#0B1D3A",
        color: "#FFFFFF",
        borderBottom: "1px solid rgba(197, 165, 90, 0.2)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        height: "64px",
      }}
    >
      <div className="container max-w-7xl flex items-center justify-between h-16 px-4">
        {/* Left — Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <img src={logoIcon} alt="Authors Bureau" className="h-7 w-7" />
          <span className="font-semibold text-[1.1rem] text-white">
            Authors <span style={{ color: "#C5A55A" }}>Bureau</span>
          </span>
        </Link>

        {/* Center — Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[0.95rem] font-medium transition-colors hover:underline hover:underline-offset-4"
              style={{ color: "#E8E0D0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A55A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#E8E0D0")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right — Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Search icon */}
          <button
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: "#E8E0D0" }}
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {user ? (
            /* Logged-in avatar */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                style={{
                  border: "2px solid #C5A55A",
                  background: "rgba(197, 165, 90, 0.15)",
                  color: "#C5A55A",
                }}
              >
                {user.email?.charAt(0) || "U"}
              </button>

              {avatarOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl py-1 z-50"
                  style={{ background: "#0B1D3A", border: "1px solid rgba(197,165,90,0.25)" }}
                >
                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
                    style={{ color: "#E8E0D0" }}
                    onClick={() => setAvatarOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" /> My Dashboard
                  </Link>
                  <Link
                    to="/dashboard/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
                    style={{ color: "#E8E0D0" }}
                    onClick={() => setAvatarOpen(false)}
                  >
                    <User className="h-4 w-4" /> My Profile
                  </Link>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 transition-colors w-full text-left"
                    style={{ color: "#E8E0D0" }}
                    onClick={async () => {
                      setAvatarOpen(false);
                      const { supabase } = await import("@/integrations/supabase/client");
                      await supabase.auth.signOut();
                      window.location.href = "/";
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Logged-out auth links */
            <>
              <Link
                to={PUBLISHNOW_AUTH_URL}
                className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: "#E8E0D0" }}
              >
                Log In
              </Link>
              <Link
                to={PUBLISHNOW_AUTH_URL}
                className="px-5 py-1.5 text-sm font-semibold rounded-[20px] transition-all hover:scale-105 hover:brightness-110"
                style={{ background: "#C5A55A", color: "#0B1D3A" }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-1.5 rounded"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "#E8E0D0" }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-[99] flex flex-col px-6 pt-8 pb-6"
          style={{ background: "#0B1D3A" }}
        >
          <div className="flex flex-col gap-4 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-lg font-medium py-2 transition-colors"
                style={{ color: "#E8E0D0" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  to={isAdmin ? "/admin" : "/dashboard"}
                  className="text-lg font-medium py-2 transition-colors"
                  style={{ color: "#E8E0D0" }}
                  onClick={() => setMobileOpen(false)}
                >
                  My Dashboard
                </Link>
                <button
                  className="text-lg font-medium py-2 text-left transition-colors"
                  style={{ color: "#E8E0D0" }}
                  onClick={async () => {
                    setMobileOpen(false);
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                >
                  Log Out
                </button>
              </>
            )}
          </div>

          {/* Bottom auth CTA */}
          {!user && (
            <div className="flex flex-col gap-3 mt-auto pt-6 border-t" style={{ borderColor: "rgba(197,165,90,0.2)" }}>
              <Link
                to={PUBLISHNOW_AUTH_URL}
                className="text-center text-sm font-medium py-2"
                style={{ color: "#E8E0D0" }}
                onClick={() => setMobileOpen(false)}
              >
                Log In
              </Link>
              <Link
                to={PUBLISHNOW_AUTH_URL}
                className="text-center text-sm font-semibold py-3 rounded-[20px] transition-all"
                style={{ background: "#C5A55A", color: "#0B1D3A" }}
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
