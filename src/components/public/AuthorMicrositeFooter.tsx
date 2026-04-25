import { Link } from "react-router-dom";
import { Globe, Linkedin, Twitter, Instagram, Youtube, Facebook, BookOpen } from "lucide-react";
import type { AuthorData } from "@/pages/author-site/types";

interface Props {
  author: AuthorData | null;
  displayName: string;
}

const SOCIAL_LINKS = [
  { key: "website_url", icon: Globe, label: "Website" },
  { key: "linkedin_url", icon: Linkedin, label: "LinkedIn" },
  { key: "twitter_url", icon: Twitter, label: "Twitter / X" },
  { key: "instagram_url", icon: Instagram, label: "Instagram" },
  { key: "facebook_url", icon: Facebook, label: "Facebook" },
  { key: "youtube_url", icon: Youtube, label: "YouTube" },
  { key: "amazon_author_profile_url", icon: BookOpen, label: "Amazon" },
] as const;

/**
 * Footer rendered on every public author microsite. Provides:
 *  - Author social follow icons (only renders for fields the author filled in)
 *  - Legal links: Privacy Policy, Terms of Service, Terms of Sale
 *  - Powered by Authors Bureau attribution
 *
 * Theme-aware: pulls colors from CSS variables set by AuthorPageLayout so the
 * footer adapts to whichever theme the author chose.
 */
export default function AuthorMicrositeFooter({ author, displayName }: Props) {
  const socials = author
    ? SOCIAL_LINKS.filter(
        (s) => !!(author as unknown as Record<string, string | null | undefined>)[s.key]
      )
    : [];

  return (
    <footer
      className="py-10 px-4"
      style={{
        background: "var(--theme-primary)",
        color: "var(--theme-primary-text)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="container max-w-5xl">
        {/* Social follow icons */}
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <span
              className="text-xs uppercase tracking-wider mr-2 opacity-70"
              style={{ color: "var(--theme-primary-text)" }}
            >
              Follow {displayName}
            </span>
            {socials.map((s) => {
              const Icon = s.icon;
              const url = (author as unknown as Record<string, string>)[s.key];
              return (
                <a
                  key={s.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "var(--theme-accent)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}

        {/* Legal + attribution */}
        <div
          className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5 text-xs"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <Link to="/privacy" className="hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span className="hidden md:inline opacity-50">·</span>
          <Link to="/terms" className="hover:underline transition-colors">
            Terms of Service
          </Link>
          <span className="hidden md:inline opacity-50">·</span>
          <Link to="/terms-of-sale" className="hover:underline transition-colors">
            Terms of Sale
          </Link>
          <span className="hidden md:inline opacity-50">·</span>
          <Link to="/" className="hover:underline transition-colors">
            Powered by Authors Bureau
          </Link>
        </div>

        <div
          className="text-center text-[11px] mt-4"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          © {new Date().getFullYear()} {displayName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
