import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, BookOpen, DollarSign, Rocket, Bot, Library, BookHeart, GraduationCap, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import logoIcon from "@/assets/logo-icon.png";
import { getPublishNowAuthUrl } from "@/lib/publishnow-auth";

const SIGNUP_URL = getPublishNowAuthUrl("/dashboard");

interface DropdownItem {
  label: string;
  icon: React.ElementType;
  description: string;
  to: string;
}

const forAuthorsItems: DropdownItem[] = [
  { label: "How It Works", icon: BookOpen, description: "See how Authors Bureau helps you monetize your book", to: "/how-it-works" },
  { label: "Pricing & Plans", icon: DollarSign, description: "Free to start. Upgrade as you grow.", to: "/#pricing" },
  { label: "Authors Portal", icon: Rocket, description: "Dashboard: Build and grow your author empire", to: "/dashboard" },
  { label: "ABBY AI Consultant", icon: Bot, description: "Your AI business advisor for book monetization", to: "/dashboard" },
];

const forReadersItems: DropdownItem[] = [
  { label: "Browse Books", icon: Library, description: "Discover books from authors worldwide", to: "/directory" },
  { label: "Reading Club", icon: BookHeart, description: "Join the 100-Day Reading Challenge", to: "/reading-club" },
  { label: "Readers Portal", icon: GraduationCap, description: "My Library, courses, coaching & memberships", to: "/portal" },
  { label: "Find an Author", icon: Search, description: "Search by name, genre, or topic", to: "/directory" },
];

function NavDropdown({ label, items, open, onToggle, onClose }: {
  label: string;
  items: DropdownItem[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[280px] rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden"
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  onClose();
                  if (item.to.startsWith("/#")) {
                    navigate("/");
                    setTimeout(() => {
                      document.querySelector(item.to.replace("/", ""))?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  } else {
                    navigate(item.to);
                  }
                }}
                className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-secondary/5 transition-colors"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                  <item.icon className="h-4 w-4 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Close dropdowns on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

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

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-secondary ${location.pathname === "/" ? "text-secondary" : "text-muted-foreground"}`}
          >
            Home
          </Link>

          <NavDropdown
            label="For Authors"
            items={forAuthorsItems}
            open={openDropdown === "authors"}
            onToggle={() => setOpenDropdown(openDropdown === "authors" ? null : "authors")}
            onClose={() => setOpenDropdown(null)}
          />

          <NavDropdown
            label="For Readers"
            items={forReadersItems}
            open={openDropdown === "readers"}
            onToggle={() => setOpenDropdown(openDropdown === "readers" ? null : "readers")}
            onClose={() => setOpenDropdown(null)}
          />

          <Link
            to="/directory"
            className={`text-sm font-medium transition-colors hover:text-secondary ${location.pathname === "/directory" ? "text-secondary" : "text-muted-foreground"}`}
          >
            Authors Directory
          </Link>

          <Link
            to="/faq"
            className={`text-sm font-medium transition-colors hover:text-secondary ${location.pathname === "/faq" ? "text-secondary" : "text-muted-foreground"}`}
          >
            Help
          </Link>

          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/20 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-secondary" />
                </div>
                My Dashboard
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[200px] rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden py-1"
                  >
                    <Link to={dashboardPath} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <Rocket className="h-4 w-4 text-secondary" /> Authors Portal
                    </Link>
                    <Link to="/portal" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <GraduationCap className="h-4 w-4 text-secondary" /> Readers Portal
                    </Link>
                    <Link to="/account-settings" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <User className="h-4 w-4 text-muted-foreground" /> My Profile
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut(); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-semibold text-secondary transition-colors hover:text-secondary/80"
              >
                Sign In
              </Link>
              <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none rounded-full">
                <Link to="/get-started">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              <Link to="/" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm font-medium text-foreground">Home</Link>

              {/* For Authors Accordion */}
              <button
                onClick={() => setMobileAccordion(mobileAccordion === "authors" ? null : "authors")}
                className="flex items-center justify-between py-2.5 text-sm font-medium text-foreground"
              >
                For Authors
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === "authors" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {mobileAccordion === "authors" && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden pl-4 space-y-1">
                    {forAuthorsItems.map((item) => (
                      <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 text-secondary" /> {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* For Readers Accordion */}
              <button
                onClick={() => setMobileAccordion(mobileAccordion === "readers" ? null : "readers")}
                className="flex items-center justify-between py-2.5 text-sm font-medium text-foreground"
              >
                For Readers
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion === "readers" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {mobileAccordion === "readers" && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden pl-4 space-y-1">
                    {forReadersItems.map((item) => (
                      <Link key={item.label} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                        <item.icon className="h-4 w-4 text-secondary" /> {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <Link to="/directory" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm font-medium text-foreground">Authors Directory</Link>
              <Link to="/faq" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm font-medium text-foreground">Help</Link>

              <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setMobileOpen(false)} className="inline-flex w-fit items-center rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
                      My Dashboard
                    </Link>
                    <Link to="/portal" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-muted-foreground">
                      Readers Portal
                    </Link>
                    <button onClick={() => { setMobileOpen(false); signOut(); }} className="text-sm font-medium text-destructive text-left">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-secondary">Sign In</Link>
                    <Link to="/auth" onClick={() => setMobileOpen(false)} className="inline-flex w-fit items-center rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
