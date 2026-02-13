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
              Where published authors are discovered and where their expertise becomes a business.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/directory" className="hover:text-secondary transition-colors">Author Directory</Link></li>
              <li><Link to="/join" className="hover:text-secondary transition-colors">Get Featured</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="https://publishnow.io" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">PublishNow.io</a></li>
              <li><a href="https://publishnow.io/ai-writing-studio" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">AI Writing Studio</a></li>
              <li><a href="https://publishnow.io/ai-publishing-studio" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">AI Publishing Studio</a></li>
              <li><a href="https://publishnow.io/ai-marketing-studio" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">AI Marketing Studio</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">
              Connect
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/contact" className="hover:text-secondary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/10 pt-8 text-center text-xs text-primary-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          © {new Date().getFullYear()} Authors Bureau. Part of the PublishNow ecosystem.
        </div>
      </div>
    </footer>
  );
}
