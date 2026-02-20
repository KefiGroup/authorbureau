import { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import logoIcon from "@/assets/logo-icon.png";

const navLinks = [
  { label: "Home", to: "/", hash: "" },
  { label: "Meet the Founder", to: "/", hash: "#meet-the-founder" },
  { label: "Meet our Authors", to: "/", hash: "#featured-authors" },
  { label: "How It Works", to: "/", hash: "#how-it-works" },
  { label: "Authors", to: "/directory", hash: "" },
  { label: "PublishNow.io", to: "https://publishnow.io", hash: "", external: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const handleNavClick = useCallback(
    (link: (typeof navLinks)[0]) => {
      setOpen(false);
      if (link.hash) {
        if (location.pathname === link.to) {
          document.querySelector(link.hash)?.scrollIntoView({ behavior: "smooth" });
        } else {
          window.location.href = link.to + link.hash;
        }
      } else {
        navigate(link.to);
      }
    },
    [location.pathname, navigate]
  );

  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoIcon} alt="Authors Bureau" className="h-8 w-8" />
          <span className="font-heading text-xl font-bold text-foreground">
            Authors <span className="text-gradient-gold">Bureau</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
              >
                {link.label}
              </a>
            ) : (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`text-sm font-medium transition-colors hover:text-secondary ${
                  location.pathname === link.to && !link.hash
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </button>
            )
          )}
          {user ? (
            <Button asChild variant="default" size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none rounded-full">
              <Link to={dashboardPath}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-semibold text-secondary transition-colors hover:text-secondary/80"
              >
                Sign In
              </Link>
              <Button asChild variant="default" size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none rounded-full">
                <Link to="/auth">Get Featured</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="container flex flex-col gap-4 py-4">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    {link.label} →
                  </a>
                ) : (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link)}
                    className={`text-left text-sm font-medium ${
                      location.pathname === link.to && !link.hash ? "text-secondary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </button>
                )
              )}
              {user ? (
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="inline-flex w-fit items-center rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-secondary"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="inline-flex w-fit items-center rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                  >
                    Get Featured
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
