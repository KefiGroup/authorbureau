import { Link } from "react-router-dom";
import logoText from "@/assets/logo-with-text.png";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <img src={logoText} alt="Authors Bureau" className="h-20 w-auto" />
            <p className="text-sm text-primary-foreground/70">
              The #1 AI-powered platform that turns your book into 28 revenue streams.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              For Authors
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/how-it-works" className="hover:text-secondary transition-colors">How It Works</Link></li>
              <li><a href="/#pricing" className="hover:text-secondary transition-colors">Pricing & Plans</a></li>
              <li><Link to="/dashboard" className="hover:text-secondary transition-colors">Authors Portal</Link></li>
              <li><Link to="/get-featured" className="hover:text-secondary transition-colors">Get Featured</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              For Readers
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/directory" className="hover:text-secondary transition-colors">Browse Authors</Link></li>
              <li><Link to="/reading-club" className="hover:text-secondary transition-colors">Reading Club</Link></li>
              <li><Link to="/portal" className="hover:text-secondary transition-colors">Readers Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Connect
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/contact" className="hover:text-secondary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-secondary transition-colors">Help Center</Link></li>
              <li><a href="https://publishnow.io" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">PublishNow.io</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/10 pt-8 text-center text-xs text-primary-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          © {new Date().getFullYear()} Authors Bureau. Authors Bureau and PublishNow.io are sister platforms.
        </div>
      </div>
    </footer>
  );
}
