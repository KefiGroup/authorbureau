import { Link } from "react-router-dom";
import logoText from "@/assets/logo-with-text.webp";

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
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/directory" className="hover:text-secondary transition-colors">Author Directory</Link></li>
              <li><Link to="/how-it-works" className="hover:text-secondary transition-colors">How It Works</Link></li>
              <li><Link to="/methodology" className="hover:text-secondary transition-colors">Our Methodology</Link></li>
              
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Writing & Publishing
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="https://publishnow.io" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">PublishNow.io</a></li>
              <li><a href="https://publishnow.io/ai-writing-studio" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">AI Writing Studio</a></li>
              <li><a href="https://publishnow.io/ai-publishing-studio" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">AI Publishing Studio</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Connect
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/contact" className="hover:text-secondary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-secondary transition-colors">Help Center</Link></li>
              <li><Link to="/readers-bureau" className="hover:text-secondary transition-colors">Readers Bureau</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/10 pt-8 text-center text-xs text-primary-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          <div className="flex items-center justify-center gap-4 mb-3">
            <Link to="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
          </div>
          © {new Date().getFullYear()} Authors Bureau. Authors Bureau and PublishNow.io are sister platforms.
        </div>
      </div>
    </footer>
  );
}
